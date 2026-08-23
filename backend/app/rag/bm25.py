"""BM25 keyword search over document chunks.

Operates on chunks stored in PostgreSQL. Supports:
- Lazy index building with caching
- Filtering by company_id and document_id
- Rebuild when index is stale
"""
import time
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import DocumentChunk
from app.core.logging import get_logger

logger = get_logger("bm25")

# Simple in-process cache
_index_cache: Dict[int, Any] = {}
_index_timestamps: Dict[int, float] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


class BM25Index:
    """A BM25 search index over document chunks."""

    def __init__(self, chunks: List[DocumentChunk], tokenized_corpus: List[List[str]]):
        self.chunks = chunks
        self.tokenized_corpus = tokenized_corpus
        self._bm25 = None

    def _get_bm25(self):
        if self._bm25 is None:
            from rank_bm25 import BM25Okapi
            self._bm25 = BM25Okapi(self.tokenized_corpus)
        return self._bm25

    def search(self, query: str, top_k: int = 20) -> List[Dict[str, Any]]:
        """Search the index and return ranked results."""
        if not self.chunks:
            return []

        bm25 = self._get_bm25()
        query_tokens = query.lower().split()
        scores = bm25.get_scores(query_tokens)

        # Pair chunks with scores and filter zero-score
        scored = [
            (chunk, float(score))
            for chunk, score in zip(self.chunks, scores)
            if score > 0
        ]
        scored.sort(key=lambda x: x[1], reverse=True)
        scored = scored[:top_k]

        # Normalize scores to 0-1 range
        if scored:
            max_score = scored[0][1]
            if max_score > 0:
                scored = [(c, s / max_score) for c, s in scored]

        return [
            {
                "payload": {
                    "text": chunk.text,
                    "company_id": chunk.company_id,
                    "document_id": chunk.document_id,
                    "page_number": chunk.page_number,
                    "section": chunk.section,
                    "chunk_index": chunk.chunk_index,
                    "vector_id": chunk.vector_id,
                },
                "score": score,
                "retrieval_method": "bm25",
            }
            for chunk, score in scored
        ]


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + lowercase tokenizer."""
    return text.lower().split()


async def build_bm25_index(
    db: AsyncSession,
    company_id: Optional[int] = None,
    document_id: Optional[int] = None,
) -> BM25Index:
    """Build a BM25 index from document chunks in the database."""
    cache_key = hash((company_id, document_id))
    now = time.time()

    # Check cache
    if cache_key in _index_cache and (now - _index_timestamps.get(cache_key, 0)) < _CACHE_TTL_SECONDS:
        logger.info("bm25_cache_hit", cache_key=cache_key)
        return _index_cache[cache_key]

    # Query chunks
    stmt = select(DocumentChunk)
    if company_id is not None:
        stmt = stmt.where(DocumentChunk.company_id == company_id)
    if document_id is not None:
        stmt = stmt.where(DocumentChunk.document_id == document_id)

    result = await db.execute(stmt)
    chunks = list(result.scalars().all())

    if not chunks:
        empty = BM25Index(chunks=[], tokenized_corpus=[])
        return empty

    tokenized_corpus = [_tokenize(chunk.text) for chunk in chunks]
    index = BM25Index(chunks=chunks, tokenized_corpus=tokenized_corpus)

    # Cache it
    _index_cache[cache_key] = index
    _index_timestamps[cache_key] = now

    logger.info(
        "bm25_index_built",
        chunk_count=len(chunks),
        company_id=company_id,
        document_id=document_id,
    )
    return index


def invalidate_bm25_cache(company_id: Optional[int] = None, document_id: Optional[int] = None):
    """Invalidate cached BM25 indices. Called after document add/delete."""
    if company_id is None and document_id is None:
        _index_cache.clear()
        _index_timestamps.clear()
        logger.info("bm25_cache_cleared_all")
        return

    # Clear all keys that match (simple: clear all since we can't partial-match easily)
    _index_cache.clear()
    _index_timestamps.clear()
    logger.info("bm25_cache_cleared")
