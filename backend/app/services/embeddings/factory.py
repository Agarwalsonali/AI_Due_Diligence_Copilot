"""Embedding provider factory."""

from app.core.config import get_settings
from app.core.logging import get_logger
from .base import BaseEmbeddingProvider
from .local import LocalEmbeddingProvider
from .openai import OpenAIEmbeddingProvider

logger = get_logger("embedding_factory")


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Get embedding provider based on configuration.

    Returns:
        BaseEmbeddingProvider: Configured embedding provider instance

    Raises:
        ValueError: If provider configuration is invalid
    """
    settings = get_settings()
    provider = getattr(settings, "EMBEDDING_PROVIDER", "local").lower()

    if provider == "local":
        model = getattr(settings, "EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        logger.info("using_local_embedding_provider", model=model)
        return LocalEmbeddingProvider(model_name=model)

    elif provider == "openai":
        # Validate OpenAI configuration
        if not hasattr(settings, "LLM_API_KEY") or not settings.LLM_API_KEY:
            raise ValueError(
                "LLM_API_KEY is required when EMBEDDING_PROVIDER=openai. "
                "Please set LLM_API_KEY in your environment variables."
            )

        base_url = getattr(settings, "LLM_BASE_URL", "https://api.openai.com/v1")
        model = getattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")
        dimensions = getattr(settings, "EMBEDDING_DIMENSIONS", 1536)

        logger.info("using_openai_embedding_provider", model=model, dimensions=dimensions)
        return OpenAIEmbeddingProvider(
            api_key=settings.LLM_API_KEY,
            base_url=base_url,
            model=model,
            dimensions=dimensions
        )

    else:
        raise ValueError(
            f"Unsupported embedding provider: {provider}. "
            "Supported providers: local, openai"
        )
