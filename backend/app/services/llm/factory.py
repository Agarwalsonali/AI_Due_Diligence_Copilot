"""LLM provider factory."""

from app.core.config import get_settings
from app.core.logging import get_logger
from .base import BaseLLMProvider
from .gemini import GeminiProvider
from .openai import OpenAIProvider

logger = get_logger("llm_factory")


def get_llm_provider() -> BaseLLMProvider:
    """Get LLM provider based on configuration.

    Returns:
        BaseLLMProvider: Configured LLM provider instance

    Raises:
        ValueError: If provider configuration is invalid
    """
    settings = get_settings()
    provider = getattr(settings, "LLM_PROVIDER", "gemini").lower()

    if provider == "gemini":
        # Validate Gemini configuration
        if not hasattr(settings, "GEMINI_API_KEY") or not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is required when LLM_PROVIDER=gemini. "
                "Please set GEMINI_API_KEY in your environment variables."
            )
        
        model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
        logger.info("using_gemini_provider", model=model)
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=model)

    elif provider == "openai":
        # Validate OpenAI configuration
        if not hasattr(settings, "LLM_API_KEY") or not settings.LLM_API_KEY:
            raise ValueError(
                "LLM_API_KEY is required when LLM_PROVIDER=openai. "
                "Please set LLM_API_KEY in your environment variables."
            )
        
        base_url = getattr(settings, "LLM_BASE_URL", "https://api.openai.com/v1")
        model = getattr(settings, "LLM_MODEL", "gpt-4o-mini")
        logger.info("using_openai_provider", model=model, base_url=base_url)
        return OpenAIProvider(api_key=settings.LLM_API_KEY, base_url=base_url, model=model)

    else:
        raise ValueError(
            f"Unsupported LLM provider: {provider}. "
            "Supported providers: gemini, openai"
        )
