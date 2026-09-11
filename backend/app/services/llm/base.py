"""Base LLM provider interface."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncIterator


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""

    @abstractmethod
    async def generate(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Generate a response with citations.

        Args:
            system_prompt: System prompt for the LLM
            user_message: User question/message
            context_chunks: Retrieved context chunks for RAG
            temperature: Sampling temperature

        Returns:
            Dict with keys:
                - answer: str (generated response)
                - sources: list (citation metadata)
        """
        pass

    @abstractmethod
    async def generate_stream(
        self,
        system_prompt: str,
        user_message: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.1,
    ) -> AsyncIterator[str]:
        """Generate a streaming response.

        Args:
            system_prompt: System prompt for the LLM
            user_message: User question/message
            context_chunks: Retrieved context chunks for RAG
            temperature: Sampling temperature

        Yields:
            str: Response chunks
        """
        pass

    def _extract_citations(self, text: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract source citations referenced in the answer text.

        This is a shared utility that can be used by any provider.
        """
        import re
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
