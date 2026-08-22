from openai import AsyncOpenAI
from app.core.config import get_settings
from typing import List

class EmbeddingService:
    def __init__(self, api_key: str, base_url: str, model: str, dimensions: int):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.dimensions = dimensions

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            response = await self.client.embeddings.create(
                input=batch,
                model=self.model
            )
            embeddings.extend([d.embedding for d in response.data])
        return embeddings

    async def embed_query(self, query: str) -> List[float]:
        response = await self.client.embeddings.create(
            input=query,
            model=self.model
        )
        return response.data[0].embedding

def get_embedding_service() -> EmbeddingService:
    settings = get_settings()
    return EmbeddingService(
        api_key=settings.LLM_API_KEY,
        base_url=settings.LLM_BASE_URL,
        model=settings.EMBEDDING_MODEL,
        dimensions=settings.EMBEDDING_DIMENSIONS
    )
