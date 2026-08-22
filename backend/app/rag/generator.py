from openai import AsyncOpenAI
from app.core.config import get_settings
from typing import List, Dict, Any, AsyncGenerator
import json
import re
from app.database.schemas import SourceCitation

class LLMGenerator:
    def __init__(self, api_key: str, base_url: str, model: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model

    def _build_context(self, chunks: List[Dict[str, Any]]) -> str:
        context = ""
        for i, chunk in enumerate(chunks):
            payload = chunk.get('payload', {})
            context += f"[Source {i+1}] Title: {payload.get('document_title', 'Unknown')} | Page: {payload.get('page_number', 'N/A')} | Section: {payload.get('section', 'N/A')}\n{payload.get('text', '')}\n\n"
        return context

    def _extract_citations(self, text: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        sources = []
        matches = set(re.findall(r'\[(\d+)\]', text))
        for m in matches:
            try:
                idx = int(m) - 1
                if 0 <= idx < len(chunks):
                    payload = chunks[idx].get('payload', {})
                    sources.append({
                        "document_id": payload.get('document_id', 0),
                        "document_title": payload.get('document_title', ''),
                        "page_number": payload.get('page_number'),
                        "snippet": payload.get('text', '')[:200]
                    })
            except ValueError:
                pass
        return sources

    async def generate(self, system_prompt: str, user_message: str, context_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        context_str = self._build_context(context_chunks)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {user_message}"}
        ]
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        answer = response.choices[0].message.content
        sources = self._extract_citations(answer, context_chunks)
        return {"answer": answer, "sources": sources}

    async def generate_stream(self, system_prompt: str, user_message: str, context_chunks: List[Dict[str, Any]]) -> AsyncGenerator:
        context_str = self._build_context(context_chunks)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {user_message}"}
        ]
        
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

def get_llm_generator() -> LLMGenerator:
    settings = get_settings()
    return LLMGenerator(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        model=settings.LLM_MODEL
    )
