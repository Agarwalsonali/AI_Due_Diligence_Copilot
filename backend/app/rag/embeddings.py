"""Legacy embedding service wrapper - use app.services.embeddings instead."""

from app.services.embeddings import get_embedding_provider
from app.core.logging import get_logger
from typing import List

logger = get_logger("embeddings")


# Legacy class for backward compatibility
class EmbeddingService:
    """Legacy wrapper for the new embedding provider system."""

    def __init__(self):
        self.provider = get_embedding_provider()

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        return await self.provider.embed_texts(texts)

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query string."""
        return await self.provider.embed_query(query)


def get_embedding_service() -> EmbeddingService:
    """Get embedding service (legacy wrapper for backward compatibility)."""
    logger.info("using_legacy_embedding_wrapper")
    return EmbeddingService()
