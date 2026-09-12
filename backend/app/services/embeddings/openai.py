"""OpenAI embedding provider (for backward compatibility)."""

from openai import AsyncOpenAI
from typing import List
from app.core.logging import get_logger
from .base import BaseEmbeddingProvider

logger = get_logger("openai_embeddings")


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """OpenAI embedding provider for backward compatibility."""

    def __init__(self, api_key: str, base_url: str, model: str, dimensions: int):
        """Initialize OpenAI embedding client.

        Args:
            api_key: OpenAI API key
            base_url: OpenAI base URL
            model: OpenAI embedding model name
            dimensions: Embedding dimension
        """
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.dimensions = dimensions
        logger.info("openai_embeddings_initialized", model=model, dimensions=dimensions)

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        embeddings = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            response = await self.client.embeddings.create(
                input=batch,
                model=self.model,
                dimensions=self.dimensions
            )
            batch_embeddings = [d.embedding for d in response.data]

            # Validate dimensions on first batch
            if i == 0 and batch_embeddings:
                actual_dim = len(batch_embeddings[0])
                if actual_dim != self.dimensions:
                    raise ValueError(
                        f"Embedding dimension mismatch: expected {self.dimensions}, "
                        f"got {actual_dim}. Check EMBEDDING_DIMENSIONS env var."
                    )

            embeddings.extend(batch_embeddings)
            logger.info("embedded_batch", batch_index=i // batch_size, batch_size=len(batch))

        logger.info("embeddings_complete", total_texts=len(texts), dimensions=self.dimensions)
        return embeddings

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query string.

        Args:
            query: Query string to embed

        Returns:
            Embedding vector
        """
        response = await self.client.embeddings.create(
            input=query,
            model=self.model,
            dimensions=self.dimensions
        )
        return response.data[0].embedding

    def get_dimension(self) -> int:
        """Get the dimension of the embedding vectors.

        Returns:
            Integer dimension of the embedding vectors
        """
        return self.dimensions
