import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Document, DocumentChunk
from app.rag.parser import parse_document
from app.rag.chunker import chunk_document
from app.rag.embeddings import get_embedding_service
from app.rag.vector_store import get_vector_store

async def process_document(document_id: int, db_session_factory):
    async with db_session_factory() as db:
        try:
            doc = await db.get(Document, document_id)
            if not doc:
                return
                
            doc.processing_status = 'processing'
            await db.commit()
            
            parsed_doc = parse_document(doc.file_path)
            doc.page_count = parsed_doc.total_pages
            
            chunks = chunk_document(
                parsed_doc=parsed_doc,
                company_id=doc.company_id,
                company_name="", 
                document_id=doc.id,
                document_title=doc.title,
                document_type=doc.document_type
            )
            
            embedding_service = get_embedding_service()
            texts = [c.text for c in chunks]
            vectors = await embedding_service.embed_texts(texts)
            
            vector_store = get_vector_store()
            
            qdrant_chunks = []
            db_chunks = []
            
            for i, chunk in enumerate(chunks):
                vid = str(uuid.uuid4())
                
                qdrant_chunks.append({
                    'id': vid,
                    'vector': vectors[i],
                    'metadata': chunk.metadata
                })
                
                db_chunks.append(DocumentChunk(
                    document_id=doc.id,
                    company_id=doc.company_id,
                    chunk_index=chunk.chunk_index,
                    text=chunk.text,
                    page_number=chunk.page_number,
                    section=chunk.section,
                    token_count=chunk.token_count,
                    vector_id=vid
                ))
                
            vector_store.upsert_chunks(qdrant_chunks)
            db.add_all(db_chunks)
            
            doc.processing_status = 'completed'
            await db.commit()
            
        except Exception as e:
            doc.processing_status = 'failed'
            doc.error_message = str(e)
            await db.commit()
