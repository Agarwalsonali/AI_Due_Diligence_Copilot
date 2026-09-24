"""Embedding provider factory."""

from app.core.config import get_settings
from app.core.logging import get_logger
from .base import BaseEmbeddingProvider

logger = get_logger("embedding_factory")

# Cached singleton — loading a sentence-transformers model is expensive (~seconds)
# and must not happen on every request.
_embedding_provider: BaseEmbeddingProvider | None = None


def get_embedding_provider() -> BaseEmbeddingProvider:
    """Get (and cache) the embedding provider based on configuration.

    Returns:
        BaseEmbeddingProvider: Configured embedding provider instance

    Raises:
        ValueError: If provider configuration is invalid
    """
    global _embedding_provider
    if _embedding_provider is not None:
        return _embedding_provider

    settings = get_settings()
    provider = getattr(settings, "EMBEDDING_PROVIDER", "local").lower()

    if provider == "local":
        from .local import LocalEmbeddingProvider
        model = getattr(settings, "EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        logger.info("using_local_embedding_provider", model=model)
        _embedding_provider = LocalEmbeddingProvider(model_name=model)

    elif provider == "openai":
        from .openai import OpenAIEmbeddingProvider
        # Validate OpenAI configuration
        if not getattr(settings, "LLM_API_KEY", None):
            raise ValueError(
                "LLM_API_KEY is required when EMBEDDING_PROVIDER=openai. "
                "Provide it via LLM_API_KEY in your environment variables."
            )

        base_url = getattr(settings, "LLM_BASE_URL", "https://api.openai.com/v1")
        model = getattr(settings, "EMBEDDING_MODEL", "text-embedding-3-small")
        dimensions = getattr(settings, "EMBEDDING_DIMENSIONS", 1536)
        if model in ("all-MiniLM-L6-v2", "sentence-transformers/all-MiniLM-L6-v2"):
            raise ValueError(
                f"EMBEDDING_MODEL '{model}' is a local sentence-transformers model and "
                "cannot be used with EMBEDDING_PROVIDER=openai. Set EMBEDDING_MODEL to an "
                "OpenAI embedding model such as 'text-embedding-3-small'."
            )

        logger.info("using_openai_embedding_provider", model=model, dimensions=dimensions)
        _embedding_provider = OpenAIEmbeddingProvider(
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

    return _embedding_provider
