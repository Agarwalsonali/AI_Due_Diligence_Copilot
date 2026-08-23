from openai import AsyncOpenAI
from app.core.config import get_settings
from app.core.logging import get_logger
from typing import List

logger = get_logger("embeddings")

class EmbeddingService:
    def __init__(self, api_key: str, base_url: str, model: str, dimensions: int):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.model = model
        self.dimensions = dimensions

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts with batching and dimension validation."""
        if not texts:
            return []

        embeddings = []
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            response = await self.client.embeddings.create(
                input=batch,
                model=self.model,
                dimensions=self.dimensions
            )
            batch_embeddings = [d.embedding for d in response.data]
            
            # Validate dimensions on first batch
            if i == 0 and batch_embeddings:
                actual_dim = len(batch_embeddings[0])
                if actual_dim != self.dimensions:
                    raise ValueError(
                        f"Embedding dimension mismatch: expected {self.dimensions}, "
                        f"got {actual_dim}. Check EMBEDDING_DIMENSIONS env var."
                    )
            
            embeddings.extend(batch_embeddings)
            logger.info("embedded_batch", batch_index=i // batch_size, batch_size=len(batch), total=len(embeddings))

        logger.info("embeddings_complete", total_texts=len(texts), dimensions=self.dimensions)
        return embeddings

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single query string."""
        response = await self.client.embeddings.create(
            input=query,
            model=self.model,
            dimensions=self.dimensions
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
