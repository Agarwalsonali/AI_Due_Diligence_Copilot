from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
    FilterSelector,
)
from app.core.config import get_settings
from app.core.logging import get_logger
from typing import List, Dict, Any, Optional

logger = get_logger("vector_store")


class VectorStore:
    def __init__(self, url: str, collection_name: str, vector_size: int):
        self.client = QdrantClient(url=url)
        self.collection_name = collection_name
        self.vector_size = vector_size
        self.ensure_collection()

    def ensure_collection(self):
        """Create the collection and payload indexes if they don't exist, or recreate if dimension changed."""
        try:
            collections = self.client.get_collections().collections
            existing_collection = next((c for c in collections if c.name == self.collection_name), None)

            if existing_collection is None:
                # Create new collection
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                )
                self.client.create_payload_index(self.collection_name, "company_id", "integer")
                self.client.create_payload_index(self.collection_name, "document_id", "integer")
                logger.info("collection_created", collection=self.collection_name, vector_size=self.vector_size)
            else:
                # Check if dimension matches
                collection_info = self.client.get_collection(self.collection_name)
                current_size = collection_info.config.params.vectors.size
                
                if current_size != self.vector_size:
                    logger.warning(
                        "dimension_mismatch",
                        collection=self.collection_name,
                        current_size=current_size,
                        new_size=self.vector_size,
                        action="recreating_collection"
                    )
                    # Recreate collection with new dimension
                    self.client.delete_collection(self.collection_name)
                    self.client.create_collection(
                        collection_name=self.collection_name,
                        vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE),
                    )
                    self.client.create_payload_index(self.collection_name, "company_id", "integer")
                    self.client.create_payload_index(self.collection_name, "document_id", "integer")
                    logger.info("collection_recreated", collection=self.collection_name, vector_size=self.vector_size)
                else:
                    logger.info("collection_exists", collection=self.collection_name, vector_size=current_size)
        except Exception as e:
            logger.error("qdrant_collection_init_failed", error=str(e))
            raise

    def upsert_chunks(self, chunks: List[Dict[str, Any]]):
        """Upsert a batch of vectors with metadata into Qdrant."""
        points = []
        for chunk in chunks:
            points.append(PointStruct(
                id=chunk["id"],
                vector=chunk["vector"],
                payload=chunk["metadata"],
            ))
        if points:
            self.client.upsert(collection_name=self.collection_name, points=points)
            logger.info("qdrant_upsert", collection=self.collection_name, point_count=len(points))

    def search(
        self,
        query_vector: List[float],
        company_id: Optional[int] = None,
        document_id: Optional[int] = None,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """Search Qdrant with optional metadata filters."""
        conditions = []
        if company_id is not None:
            conditions.append(FieldCondition(key="company_id", match=MatchValue(value=company_id)))
        if document_id is not None:
            conditions.append(FieldCondition(key="document_id", match=MatchValue(value=document_id)))

        query_filter = Filter(must=conditions) if conditions else None

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=query_filter,
            limit=limit,
        )
        return [{"payload": res.payload, "score": res.score} for res in results]

    def delete_by_document(self, document_id: int):
        """Delete all vectors belonging to a document."""
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=FilterSelector(
                    filter=Filter(
                        must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
                    )
                ),
            )
            logger.info("qdrant_delete_by_document", document_id=document_id)
        except Exception as e:
            logger.error("qdrant_delete_failed", document_id=document_id, error=str(e))
            raise

    def get_collection_info(self) -> Dict[str, Any]:
        return self.client.get_collection(self.collection_name).model_dump()


def get_vector_store() -> VectorStore:
    from app.services.embeddings import get_embedding_provider
    settings = get_settings()
    
    # Get actual dimension from embedding provider
    embedding_provider = get_embedding_provider()
    vector_size = embedding_provider.get_dimension()
    
    return VectorStore(
        url=settings.QDRANT_URL,
        collection_name=settings.QDRANT_COLLECTION,
        vector_size=vector_size,
    )
