from app.rag.vector_store import VectorStore, get_vector_store
from app.rag.embeddings import EmbeddingService, get_embedding_service
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import DocumentChunk

class HybridRetriever:
    def __init__(self, vector_store: VectorStore, embedding_service: EmbeddingService):
        self.vector_store = vector_store
        self.embedding_service = embedding_service
        self.bm25_cache = {}

    async def retrieve(
        self, 
        query: str, 
        company_id: int, 
        db: AsyncSession,
        document_id: Optional[int] = None, 
        top_k: int = 20
    ) -> List[Dict[str, Any]]:
        
        query_vector = await self.embedding_service.embed_query(query)
        vector_results = self.vector_store.search(query_vector, company_id, document_id, top_k)
        
        stmt = select(DocumentChunk).where(DocumentChunk.company_id == company_id)
        if document_id:
            stmt = stmt.where(DocumentChunk.document_id == document_id)
            
        result = await db.execute(stmt)
        chunks = result.scalars().all()
        
        if not chunks:
            return vector_results
            
        from rank_bm25 import BM25Okapi
        tokenized_corpus = [chunk.text.split() for chunk in chunks]
        bm25 = BM25Okapi(tokenized_corpus)
        bm25_scores = bm25.get_scores(query.split())
        
        bm25_results = []
        for chunk, score in zip(chunks, bm25_scores):
            if score > 0:
                bm25_results.append({
                    'payload': {
                        'text': chunk.text,
                        'company_id': chunk.company_id,
                        'document_id': chunk.document_id,
                        'page_number': chunk.page_number,
                        'section': chunk.section
                    },
                    'score': score
                })
        
        bm25_results.sort(key=lambda x: x['score'], reverse=True)
        bm25_results = bm25_results[:top_k]
        
        fused_scores = {}
        k = 60
        
        for rank, res in enumerate(vector_results):
            doc_id = res['payload'].get('text', '')[:50]
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + 1 / (k + rank)
            
        for rank, res in enumerate(bm25_results):
            doc_id = res['payload'].get('text', '')[:50]
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + 1 / (k + rank)
            
        merged_results = []
        seen = set()
        for res in vector_results + bm25_results:
            doc_id = res['payload'].get('text', '')[:50]
            if doc_id not in seen:
                seen.add(doc_id)
                res['score'] = fused_scores[doc_id]
                merged_results.append(res)
                
        merged_results.sort(key=lambda x: x['score'], reverse=True)
        return merged_results[:top_k]
