"""LLM generator for RAG question answering.

Uses provider abstraction for LLM generation. Enforces evidence-based answering
with strict source citation requirements.
"""
from app.services.llm import get_llm_provider, BaseLLMProvider
from app.core.logging import get_logger
from typing import List, Dict, Any

logger = get_logger("generator")


QA_SYSTEM_PROMPT = """You are an AI Due Diligence Copilot — a financial research assistant.

CRITICAL RULES:
1. Answer ONLY using the provided source context. Never use outside knowledge.
2. Never invent financial numbers, statistics, or data points.
3. Never fabricate citations or source references.
4. Never invent page numbers.
5. For every material factual claim, include the source reference as [source_N].
6. If the context does not contain enough information to answer, say:
   "The available documents do not provide sufficient evidence to answer this question."
7. Clearly distinguish between:
   - Facts directly stated in the documents
   - Your analysis or interpretation of those facts
8. Format your response in clear markdown.
9. Be concise but thorough.
10. When listing items (risks, opportunities, metrics), cite the source for each."""


class LLMGenerator:
    """Generates answers using an LLM with source context."""

    def __init__(self, provider: BaseLLMProvider):
        """Initialize with an LLM provider instance.

        Args:
            provider: BaseLLMProvider instance (Gemini, OpenAI, etc.)
        """
        self.provider = provider

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Generate a response with citations.

        Returns:
            {"answer": str, "sources": list}
        """
        return await self.provider.generate(
            system_prompt=system_prompt,
            user_message=user_message,
            context_chunks=context_chunks,
            temperature=temperature,
        )

    async def generate_stream(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ):
        """Generate a streaming response."""
        async for chunk in self.provider.generate_stream(
            system_prompt=system_prompt,
            user_message=user_message,
            context_chunks=context_chunks,
            temperature=temperature,
        ):
            yield chunk


def get_llm_generator() -> LLMGenerator:
    """Get LLM generator with configured provider."""
    provider = get_llm_provider()
    return LLMGenerator(provider=provider)
