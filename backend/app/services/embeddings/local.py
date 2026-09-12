"""Local embedding provider using sentence-transformers."""

import asyncio
from typing import List
from sentence_transformers import SentenceTransformer
from app.core.logging import get_logger
from .base import BaseEmbeddingProvider

logger = get_logger("local_embeddings")


class LocalEmbeddingProvider(BaseEmbeddingProvider):
    """Local embedding provider using sentence-transformers.

    This provider runs entirely locally without requiring external API calls.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """Initialize the local embedding model.

        Args:
            model_name: Name of the sentence-transformers model to use
        """
        logger.info("loading_local_model", model=model_name)
        self.model = SentenceTransformer(model_name)
        self.dimension = self.model.get_sentence_embedding_dimension()
        logger.info("model_loaded", model=model_name, dimension=self.dimension)

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors
        """
        if not texts:
            return []

        # Run the CPU-intensive model inference in a thread pool
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None, self.model.encode, texts
        )

        # Convert numpy arrays to lists
        embedding_list = [emb.tolist() for emb in embeddings]

        logger.info("texts_embedded", count=len(texts), dimension=self.dimension)
        return embedding_list

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query string.

        Args:
            query: Query string to embed

        Returns:
            Embedding vector
        """
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None, self.model.encode, [query]
        )

        logger.info("query_embedded", dimension=self.dimension)
        return embedding[0].tolist()

    def get_dimension(self) -> int:
        """Get the dimension of the embedding vectors.

        Returns:
            Integer dimension of the embedding vectors
        """
        return self.dimension
