"""Base embedding provider interface."""

from abc import ABC, abstractmethod
from typing import List


class BaseEmbeddingProvider(ABC):
    """Base class for embedding providers."""

    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed

        Returns:
            List of embedding vectors (each is a list of floats)
        """
        pass

    @abstractmethod
    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query string.

        Args:
            query: Query string to embed

        Returns:
            Embedding vector (list of floats)
        """
        pass

    @abstractmethod
    def get_dimension(self) -> int:
        """Get the dimension of the embedding vectors.

        Returns:
            Integer dimension of the embedding vectors
        """
        pass
