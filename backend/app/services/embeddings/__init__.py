"""Embedding services package."""

from .factory import get_embedding_provider
from .base import BaseEmbeddingProvider

__all__ = ["get_embedding_provider", "BaseEmbeddingProvider"]
