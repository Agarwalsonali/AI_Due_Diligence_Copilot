"""Gemini LLM provider implementation."""

import google.genai
from google.genai import types
from typing import List, Dict, Any, AsyncIterator
from app.core.logging import get_logger
from .base import BaseLLMProvider

logger = get_logger("gemini_provider")


class GeminiProvider(BaseLLMProvider):
    """Google Gemini LLM provider."""

    def __init__(self, api_key: str, model: str):
        """Initialize Gemini client.

        Args:
            api_key: Google API key
            model: Gemini model name (e.g., "gemini-1.5-flash")
        """
        self.client = google.genai.Client(api_key=api_key)
        self.model = model
        logger.info("gemini_provider_initialized", model=model)

    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Generate a response with citations using Gemini."""
        from app.rag.context import build_context
        context_str = build_context(context_chunks)

        # Build the prompt with context
        full_prompt = f"{system_prompt}\n\nContext:\n{context_str}\n\nQuestion: {user_message}"

        try:
            # Generate response using Gemini
            response = self.client.models.generate_content(
                model=self.model,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                )
            )

            answer = response.text if response.text else ""
            sources = self._extract_citations(answer, context_chunks)

            logger.info(
                "gemini_generation_complete",
                model=self.model,
                answer_length=len(answer),
                source_count=len(sources),
            )

            return {"answer": answer, "sources": sources}

        except google.genai.errors.APIError as e:
            logger.error("gemini_api_error", error=str(e), error_type=type(e).__name__)
            
            # Handle specific error types
            error_msg = str(e)
            if "quota" in error_msg.lower() or "limit" in error_msg.lower():
                return {
                    "answer": "AI usage limit reached temporarily. Please wait and try again later.",
                    "sources": [],
                }
            elif "key" in error_msg.lower() or "authentication" in error_msg.lower():
                return {
                    "answer": "AI service configuration error. Please check the configured Gemini API key.",
                    "sources": [],
                }
            else:
                return {
                    "answer": "AI service temporarily unavailable. Please try again later.",
                    "sources": [],
                }
        except Exception as e:
            logger.error("gemini_generation_failed", error=str(e))
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
        """Generate a streaming response using Gemini."""
        from app.rag.context import build_context
        context_str = build_context(context_chunks)

        full_prompt = f"{system_prompt}\n\nContext:\n{context_str}\n\nQuestion: {user_message}"

        try:
            response = self.client.models.generate_content_stream(
                model=self.model,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                )
            )

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except google.genai.errors.APIError as e:
            logger.error("gemini_stream_error", error=str(e))
            yield "AI service temporarily unavailable. Please try again later."
        except Exception as e:
            logger.error("gemini_stream_failed", error=str(e))
            yield "An error occurred while generating the response. Please try again."
