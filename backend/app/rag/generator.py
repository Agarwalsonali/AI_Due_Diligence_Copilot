"""LLM generator for RAG question answering.

Uses the existing OpenAI client. Enforces evidence-based answering
with strict source citation requirements.
"""
from openai import AsyncOpenAI
from app.core.config import get_settings
from typing import List, Dict, Any, Optional
import re
from app.core.logging import get_logger

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

    def __init__(self, api_key: str, base_url: str, model: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

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
                "llm_generation_complete",
                model=self.model,
                answer_length=len(answer),
                source_count=len(sources),
                tokens_used=getattr(response.usage, 'total_tokens', None),
            )

            return {"answer": answer, "sources": sources}

        except Exception as e:
            logger.error("llm_generation_failed", error=str(e))
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
    ):
        """Generate a streaming response."""
        from app.rag.context import build_context
        context_str = build_context(context_chunks)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {user_message}"}
        ]

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
            temperature=temperature,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _extract_citations(self, text: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract source citations referenced in the answer text."""
        sources = []
        seen = set()

        # Find all [source_N] references
        matches = re.findall(r'\[source_(\d+)\]', text, re.IGNORECASE)
        # Also match [1], [2], etc. as fallback
        if not matches:
            matches = re.findall(r'\[(\d+)\]', text)

        for m in matches:
            try:
                idx = int(m) - 1
                if 0 <= idx < len(chunks) and idx not in seen:
                    seen.add(idx)
                    payload = chunks[idx].get("payload", {})
                    sources.append({
                        "source_id": f"source_{idx + 1}",
                        "document_id": payload.get("document_id", 0),
                        "document_title": payload.get("document_title", ""),
                        "page_number": payload.get("page_number"),
                        "section": payload.get("section"),
                        "excerpt": payload.get("text", "")[:500],
                    })
            except (ValueError, IndexError):
                pass

        return sources


def get_llm_generator() -> LLMGenerator:
    settings = get_settings()
    return LLMGenerator(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        model=settings.LLM_MODEL,
    )
