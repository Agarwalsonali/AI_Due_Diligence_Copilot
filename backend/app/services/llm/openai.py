"""OpenAI LLM provider implementation (for backward compatibility)."""

from openai import AsyncOpenAI
from typing import List, Dict, Any, AsyncIterator
from app.core.logging import get_logger
from .base import BaseLLMProvider

logger = get_logger("openai_provider")


class OpenAIProvider(BaseLLMProvider):
    """OpenAI LLM provider for backward compatibility."""

    def __init__(self, api_key: str, base_url: str, model: str):
        """Initialize OpenAI client.

        Args:
            api_key: OpenAI API key
            base_url: OpenAI base URL
            model: OpenAI model name
        """
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        logger.info("openai_provider_initialized", model=model, base_url=base_url)

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Generate a response with citations using OpenAI."""
        from app.rag.context import build_context
        context_str = build_context(context_chunks)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {user_message}"}
        ]

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
            )
            answer = response.choices[0].message.content or ""
            sources = self._extract_citations(answer, context_chunks)

            logger.info(
                "openai_generation_complete",
                model=self.model,
                answer_length=len(answer),
                source_count=len(sources),
                tokens_used=getattr(response.usage, 'total_tokens', None),
            )

            return {"answer": answer, "sources": sources}

        except Exception as e:
            logger.error("openai_generation_failed", error=str(e))
            return {
                "answer": "An error occurred while generating the response. Please try again.",
                "sources": [],
            }

    async def generate_stream(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ) -> AsyncIterator[str]:
        """Generate a streaming response using OpenAI."""
        from app.rag.context import build_context
        context_str = build_context(context_chunks)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {user_message}"}
        ]

        try:
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
                temperature=temperature,
            )
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error("openai_stream_failed", error=str(e))
            yield "An error occurred while generating the response. Please try again."
