"""RAG retrieval orchestrator.

Coordinates the full retrieval pipeline:
1. Query rewriting (for follow-up questions)
2. Hybrid retrieval (vector + BM25)
3. Reranking
4. Context building
5. Relevance threshold check

This is the main entry point for the RAG system.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.rag.vector_store import VectorStore, get_vector_store
from app.rag.embeddings import EmbeddingService, get_embedding_service
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.reranker import get_reranker
from app.rag.context import build_source_list, estimate_confidence
from app.rag.query import rewrite_query
from app.database.models import DocumentChunk, Company, Document
from app.core.logging import get_logger

logger = get_logger("retriever")

# Minimum relevance threshold — below this, we refuse to answer
RELEVANCE_THRESHOLD = 0.15


class RetrievalResult:
    """Structured result from the RAG retrieval pipeline."""
    def __init__(
        self,
        chunks: List[Dict[str, Any]],
        sources: List[Dict[str, Any]],
        confidence: float,
        sufficient: bool,
        rewritten_query: Optional[str] = None,
    ):
        self.chunks = chunks
        self.sources = sources
        self.confidence = confidence
        self.sufficient = sufficient
        self.rewritten_query = rewritten_query


async def retrieve_for_question(
    question: str,
    db: AsyncSession,
    company_id: Optional[int] = None,
    document_id: Optional[int] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    company_name: Optional[str] = None,
    top_k: int = 20,
    rerank_top_k: int = 8,
) -> RetrievalResult:
    """Run the full retrieval pipeline for a user question.

    Args:
        question: The user's question.
        db: Database session.
        company_id: Optional company filter.
        document_id: Optional document filter.
        conversation_history: Previous messages for query rewriting.
        company_name: Company name for query rewriting context.
        top_k: Number of candidates to retrieve.
        rerank_top_k: Number of candidates to keep after reranking.

    Returns:
        RetrievalResult with chunks, sources, confidence, and sufficiency flag.
    """
    # 1. Query rewriting for follow-up questions
    rewritten = await rewrite_query(
        current_question=question,
        conversation_history=conversation_history or [],
        company_name=company_name,
    )

    # 2. Hybrid retrieval (vector + BM25)
    vector_store = get_vector_store()
    embedding_service = get_embedding_service()
    hybrid = HybridRetriever(vector_store, embedding_service)

    candidates = await hybrid.retrieve(
        query=rewritten,
        db=db,
        company_id=company_id,
        document_id=document_id,
        top_k=top_k,
    )

    logger.info(
        "retrieval_candidates",
        query=question[:100],
        rewritten=rewritten[:100] if rewritten != question else "(unchanged)",
        candidate_count=len(candidates),
    )

    # 3. Reranking
    if not candidates:
        return RetrievalResult(
            chunks=[],
            sources=[],
            confidence=0.0,
            sufficient=False,
            rewritten_query=rewritten if rewritten != question else None,
        )

    reranker = get_reranker()
    ranked = reranker.rerank(rewritten, candidates, top_k=rerank_top_k)

    # 4. Relevance threshold check
    top_score = ranked[0].get("score", 0) if ranked else 0
    sufficient = top_score >= RELEVANCE_THRESHOLD

    if not sufficient:
        logger.info(
            "relevance_insufficient",
            top_score=round(top_score, 4),
            threshold=RELEVANCE_THRESHOLD,
        )
        return RetrievalResult(
            chunks=ranked,
            sources=[],
            confidence=round(top_score, 2),
            sufficient=False,
            rewritten_query=rewritten if rewritten != question else None,
        )

    # 5. Build sources and confidence
    sources = build_source_list(ranked)
    confidence = estimate_confidence(ranked, answer_length=0)  # Will be refined after generation

    logger.info(
        "retrieval_complete",
        sources_count=len(sources),
        confidence=confidence,
        top_score=round(top_score, 4),
    )

    return RetrievalResult(
        chunks=ranked,
        sources=sources,
        confidence=confidence,
        sufficient=True,
        rewritten_query=rewritten if rewritten != question else None,
    )


async def get_company_name(db: AsyncSession, company_id: Optional[int]) -> Optional[str]:
    """Fetch company name by ID."""
    if company_id is None:
        return None
    company = await db.get(Company, company_id)
    return company.name if company else None
