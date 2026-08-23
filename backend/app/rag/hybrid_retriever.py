"""Hybrid retrieval combining vector search and BM25 with Reciprocal Rank Fusion.

Uses both semantic (Qdrant) and keyword (BM25) search, fuses results,
removes duplicates, and returns a ranked candidate set.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.rag.vector_store import VectorStore
from app.rag.embeddings import EmbeddingService
from app.rag.bm25 import build_bm25_index
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("hybrid_retriever")

# Configurable fusion weights
VECTOR_WEIGHT = 0.7
BM25_WEIGHT = 0.3
RRF_K = 60  # Reciprocal Rank Fusion constant


def _normalize_scores(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize scores to 0-1 range."""
    if not results:
        return results
    max_score = max(r["score"] for r in results)
    if max_score > 0:
        for r in results:
            r["score"] = r["score"] / max_score
    return results


def _rrf_fusion(
    vector_results: List[Dict[str, Any]],
    bm25_results: List[Dict[str, Any]],
    vector_weight: float = VECTOR_WEIGHT,
    bm25_weight: float = BM25_WEIGHT,
) -> List[Dict[str, Any]]:
    """Combine results using Reciprocal Rank Fusion with weighted scores."""
    # Build a map from chunk signature to result
    fused: Dict[str, Dict[str, Any]] = {}

    # Score vector results by rank
    for rank, res in enumerate(vector_results):
        key = _chunk_key(res)
        rrf_score = vector_weight / (RRF_K + rank + 1)
        if key in fused:
            fused[key]["score"] += rrf_score
            fused[key]["_methods"].add(res.get("retrieval_method", "vector"))
        else:
            fused[key] = {**res, "score": rrf_score, "_methods": {res.get("retrieval_method", "vector")}}

    # Score BM25 results by rank
    for rank, res in enumerate(bm25_results):
        key = _chunk_key(res)
        rrf_score = bm25_weight / (RRF_K + rank + 1)
        if key in fused:
            fused[key]["score"] += rrf_score
            fused[key]["_methods"].add(res.get("retrieval_method", "bm25"))
        else:
            fused[key] = {**res, "score": rrf_score, "_methods": {res.get("retrieval_method", "bm25")}}

    # Sort by fused score
    results = sorted(fused.values(), key=lambda x: x["score"], reverse=True)

    # Add retrieval_method tag
    for r in results:
        methods = r.pop("_methods", set())
        if len(methods) > 1:
            r["retrieval_method"] = "hybrid"
        else:
            r["retrieval_method"] = methods.pop() if methods else "unknown"

    return results


def _chunk_key(result: Dict[str, Any]) -> str:
    """Generate a unique key for deduplication based on content."""
    payload = result.get("payload", {})
    text = payload.get("text", "")
    doc_id = payload.get("document_id", "")
    page = payload.get("page_number", "")
    # Use first 100 chars of text + doc_id + page as dedup key
    return f"{doc_id}:{page}:{text[:100]}"


class HybridRetriever:
    """Orchestrates vector + BM25 hybrid retrieval."""

    def __init__(self, vector_store: VectorStore, embedding_service: EmbeddingService):
        self.vector_store = vector_store
        self.embedding_service = embedding_service

    async def retrieve(
        self,
        query: str,
        db: AsyncSession,
        company_id: Optional[int] = None,
        document_id: Optional[int] = None,
        top_k: int = 20,
        vector_weight: float = VECTOR_WEIGHT,
        bm25_weight: float = BM25_WEIGHT,
    ) -> List[Dict[str, Any]]:
        """Run hybrid retrieval: vector + BM25 + RRF fusion."""

        # 1. Vector search via Qdrant
        query_vector = await self.embedding_service.embed_query(query)
        vector_results = self.vector_store.search(
            query_vector=query_vector,
            company_id=company_id,
            document_id=document_id,
            limit=top_k,
        )
        # Tag results
        for r in vector_results:
            r["retrieval_method"] = "vector"

        logger.info(
            "vector_search_complete",
            query_length=len(query),
            result_count=len(vector_results),
            company_id=company_id,
        )

        # 2. BM25 keyword search
        bm25_index = await build_bm25_index(db, company_id=company_id, document_id=document_id)
        bm25_results = bm25_index.search(query, top_k=top_k)

        logger.info(
            "bm25_search_complete",
            result_count=len(bm25_results),
        )

        # 3. Reciprocal Rank Fusion
        fused = _rrf_fusion(vector_results, bm25_results, vector_weight, bm25_weight)

        # 4. Trim to top_k
        final = fused[:top_k]

        logger.info(
            "hybrid_retrieval_complete",
            total_fused=len(fused),
            returned=len(final),
            methods_used=list({r.get("retrieval_method") for r in final}),
        )

        return final
