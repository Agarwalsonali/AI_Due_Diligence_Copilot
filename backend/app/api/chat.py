"""Chat API — RAG question answering with source citations.

Endpoints:
- POST /api/chat — Ask a question, get answer with sources
- GET /api/chat/sessions — List chat sessions
- GET /api/chat/sessions/{id} — Get session with messages
- DELETE /api/chat/sessions/{id} — Delete session and messages
"""
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.database import get_db
from app.database.models import User, ChatSession, ChatMessage, Company
from app.database.schemas import (
    ChatRequest, ChatResponse, SourceCitation,
    ChatSessionResponse, ChatMessageResponse,
)
from app.core.security import get_current_user
from app.rag.retriever import retrieve_for_question, get_company_name
from app.rag.generator import get_llm_generator, QA_SYSTEM_PROMPT
from app.core.logging import get_logger

logger = get_logger("chat_api")

router = APIRouter(prefix="/api/chat", tags=["chat"])

MAX_QUESTION_LENGTH = 2000
INSUFFICIENT_EVIDENCE_MSG = (
    "The available documents do not provide sufficient evidence to answer this question. "
    "Please try rephrasing or asking about a different topic covered in the uploaded documents."
)


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Ask a question and get an answer with source citations."""
    # --- Validation ---
    question = (request.message or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    if len(question) > MAX_QUESTION_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Question too long. Maximum {MAX_QUESTION_LENGTH} characters.",
        )

    # --- Validate company/document access ---
    if request.company_id:
        company = await db.get(Company, request.company_id)
        if not company or company.created_by != user.id:
            raise HTTPException(status_code=403, detail="Access denied to this company.")

    # --- Session management ---
    if request.session_id:
        session = await db.get(ChatSession, request.session_id)
        if not session or session.user_id != user.id:
            raise HTTPException(status_code=404, detail="Session not found.")
        session_id = session.id
    else:
        # Create new session
        company_name = await get_company_name(db, request.company_id)
        title = question[:80]
        if company_name:
            title = f"{company_name}: {title}"
        session = ChatSession(
            user_id=user.id,
            company_id=request.company_id,
            title=title,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id

    # --- Store user message ---
    user_msg = ChatMessage(session_id=session_id, role="user", content=question)
    db.add(user_msg)
    await db.commit()

    # --- Build conversation history for query rewriting ---
    history_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .limit(10)
    )
    history_result = await db.execute(history_stmt)
    history_msgs = history_result.scalars().all()
    conversation_history = [{"role": m.role, "content": m.content} for m in history_msgs[:-1]]

    # --- Retrieve company name for query rewriting ---
    company_name = await get_company_name(db, request.company_id)

    # --- RAG retrieval ---
    try:
        retrieval = await retrieve_for_question(
            question=question,
            db=db,
            company_id=request.company_id,
            document_id=request.document_id,
            conversation_history=conversation_history,
            company_name=company_name,
        )
    except Exception as e:
        logger.error("retrieval_failed", error=str(e), session_id=session_id)
        # Store error response
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content="An error occurred while searching the documents. Please try again.",
            sources=None,
        )
        db.add(assistant_msg)
        await db.commit()
        return ChatResponse(
            answer="An error occurred while searching the documents. Please try again.",
            session_id=session_id,
            confidence=0.0,
            sources=[],
            sufficient_evidence=False,
        )

    # --- Handle insufficient evidence ---
    if not retrieval.sufficient:
        answer = INSUFFICIENT_EVIDENCE_MSG
        sources = []
        confidence = retrieval.confidence

        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            sources=[],
        )
        db.add(assistant_msg)
        await db.commit()

        return ChatResponse(
            answer=answer,
            session_id=session_id,
            confidence=confidence,
            sources=[],
            sufficient_evidence=False,
        )

    # --- Generate answer ---
    generator = get_llm_generator()
    result = await generator.generate(
        QA_SYSTEM_PROMPT,
        question,
        retrieval.chunks,
    )

    answer = result.get("answer", "")
    llm_sources = result.get("sources", [])

    # Merge sources: use LLM-extracted citations if available, otherwise use retrieval sources
    if llm_sources:
        # Convert LLM sources to SourceCitation format
        final_sources = []
        seen_ids = set()
        for src in llm_sources:
            sid = src.get("source_id", "")
            if sid in seen_ids:
                continue
            seen_ids.add(sid)
            final_sources.append(SourceCitation(
                source_id=sid,
                document_id=src.get("document_id", 0),
                document_title=src.get("document_title", ""),
                page_number=src.get("page_number", 0),
                section=src.get("section"),
                excerpt=src.get("excerpt", ""),
                score=None,
            ))
    else:
        final_sources = [
            SourceCitation(
                source_id=s.get("source_id"),
                document_id=s.get("document_id", 0),
                document_title=s.get("document_title", ""),
                page_number=s.get("page_number", 0),
                section=s.get("section"),
                excerpt=s.get("excerpt", ""),
                score=s.get("score"),
            )
            for s in retrieval.sources
        ]

    # Refine confidence with answer length
    from app.rag.context import estimate_confidence
    confidence = estimate_confidence(retrieval.chunks, answer_length=len(answer))

    # --- Store assistant message ---
    sources_json = [s.model_dump() for s in final_sources]
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=answer,
        sources=sources_json if sources_json else None,
    )
    db.add(assistant_msg)

    # Update session timestamp
    session.updated_at = session.updated_at  # Trigger onupdate
    await db.commit()

    logger.info(
        "chat_complete",
        session_id=session_id,
        answer_length=len(answer),
        source_count=len(final_sources),
        confidence=confidence,
    )

    return ChatResponse(
        answer=answer,
        session_id=session_id,
        confidence=confidence,
        sources=final_sources,
        sufficient_evidence=True,
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    stmt = (
        select(
            ChatSession,
            func.count(ChatMessage.id).label("message_count"),
        )
        .outerjoin(ChatMessage, ChatMessage.session_id == ChatSession.id)
        .where(ChatSession.user_id == user.id)
        .group_by(ChatSession.id)
        .order_by(ChatSession.updated_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [
        ChatSessionResponse(
            id=session.id,
            user_id=session.user_id,
            company_id=session.company_id,
            title=session.title,
            message_count=msg_count or 0,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
        for session, msg_count in rows
    ]


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get a session with all messages."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found.")

    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    return {
        "session": ChatSessionResponse(
            id=session.id,
            user_id=session.user_id,
            company_id=session.company_id,
            title=session.title,
            message_count=len(messages),
            created_at=session.created_at,
            updated_at=session.updated_at,
        ),
        "messages": [
            ChatMessageResponse(
                id=m.id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                sources=m.sources,
                created_at=m.created_at,
            )
            for m in messages
        ],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a session and all its messages."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found.")

    await db.delete(session)  # Cascades to messages
    await db.commit()

    logger.info("session_deleted", session_id=session_id, user_id=user.id)
    return {"message": "Session deleted successfully."}
