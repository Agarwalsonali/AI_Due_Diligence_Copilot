"""Lightweight reranker for retrieved chunks.

Uses lexical overlap, query term matching, section relevance, and
existing retrieval scores. No PyTorch or transformer dependencies.

Modular interface — swap in a cross-encoder reranker later if desired.
"""
from typing import List, Dict, Any, Optional
import math
import re
from app.core.logging import get_logger

logger = get_logger("reranker")


class BaseReranker:
    """Base class for rerankers."""
    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
        raise NotImplementedError


class LexicalReranker(BaseReranker):
    """Reranks using lexical overlap, term frequency, and retrieval scores.

    Scoring factors:
    1. Original retrieval score (from vector/BM25/hybrid)
    2. Query term coverage — what fraction of query terms appear in the chunk
    3. Exact phrase match — bonus for matching the full query as a substring
    4. Section relevance — bonus if section heading contains query terms
    """

    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
        if not chunks:
            return []

        query_lower = query.lower()
        query_terms = set(re.findall(r'\w+', query_lower))
        # Remove very short terms
        query_terms = {t for t in query_terms if len(t) > 2}

        scored_chunks = []
        for chunk in chunks:
            payload = chunk.get("payload", {})
            text = payload.get("text", "").lower()
            section = (payload.get("section") or "").lower()
            retrieval_score = chunk.get("score", 0.0)

            # Factor 1: Original retrieval score (normalized 0-1)
            f1 = min(max(retrieval_score, 0.0), 1.0)

            # Factor 2: Query term coverage
            if query_terms:
                terms_found = sum(1 for t in query_terms if t in text)
                f2 = terms_found / len(query_terms)
            else:
                f2 = 0.0

            # Factor 3: Exact phrase match bonus
            f3 = 1.0 if query_lower in text else 0.0

            # Factor 4: Section relevance
            if query_terms and section:
                section_terms = sum(1 for t in query_terms if t in section)
                f4 = min(section_terms / len(query_terms), 1.0)
            else:
                f4 = 0.0

            # Weighted combination
            final_score = (
                0.40 * f1 +  # retrieval score
                0.30 * f2 +  # term coverage
                0.15 * f3 +  # exact match
                0.15 * f4    # section relevance
            )

            scored_chunks.append({**chunk, "rerank_score": final_score})

        # Sort by rerank score
        scored_chunks.sort(key=lambda x: x["rerank_score"], reverse=True)

        # Update the score field with reranked score
        result = scored_chunks[:top_k]
        for i, chunk in enumerate(result):
            chunk["score"] = chunk["rerank_score"]
            chunk["rerank_position"] = i

        logger.info(
            "reranking_complete",
            input_count=len(chunks),
            output_count=len(result),
            top_score=round(result[0]["rerank_score"], 4) if result else 0,
        )

        return result


class SimpleReranker(BaseReranker):
    """Minimal reranker that just sorts by existing score."""
    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
        chunks.sort(key=lambda x: x.get("score", 0), reverse=True)
        return chunks[:top_k]


def get_reranker() -> BaseReranker:
    """Get the default reranker. Uses lexical scoring."""
    return LexicalReranker()
