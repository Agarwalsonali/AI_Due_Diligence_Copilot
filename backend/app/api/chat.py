from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.database.models import User, ChatSession, ChatMessage
from app.core.security import get_current_user
from app.database.schemas import ChatRequest
from app.rag.retriever import HybridRetriever
from app.rag.vector_store import get_vector_store
from app.rag.embeddings import get_embedding_service
from app.rag.reranker import get_reranker
from app.rag.generator import get_llm_generator
from app.rag.prompts import QA_SYSTEM_PROMPT
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("/")
async def chat_endpoint(
    request: ChatRequest, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    if not request.session_id:
        session = ChatSession(
            user_id=user.id, 
            company_id=request.company_id, 
            title=request.message[:50]
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id
    else:
        session_id = request.session_id

    user_msg = ChatMessage(session_id=session_id, role='user', content=request.message)
    db.add(user_msg)
    await db.commit()

    retriever = HybridRetriever(get_vector_store(), get_embedding_service())
    chunks = await retriever.retrieve(request.message, request.company_id, db)
    
    reranker = get_reranker()
    ranked_chunks = reranker.rerank(request.message, chunks)
    
    generator = get_llm_generator()

    async def event_generator():
        stream = generator.generate_stream(QA_SYSTEM_PROMPT, request.message, ranked_chunks)
        full_text = ""
        async for chunk in stream:
            full_text += chunk
            yield f"data: {json.dumps({'text': chunk})}\n\n"
            
        ai_msg = ChatMessage(
            session_id=session_id, 
            role='assistant', 
            content=full_text, 
            sources=[]
        )
        db.add(ai_msg)
        await db.commit()
        
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/sessions")
async def list_sessions(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(ChatSession).where(ChatSession.user_id == user.id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/sessions/{id}")
async def get_session(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    session = await db.get(ChatSession, id)
    stmt = select(ChatMessage).where(ChatMessage.session_id == id)
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return {"session": session, "messages": messages}

@router.delete("/sessions/{id}")
async def delete_session(id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    session = await db.get(ChatSession, id)
    if session:
        await db.delete(session)
        await db.commit()
    return {"message": "Deleted"}
