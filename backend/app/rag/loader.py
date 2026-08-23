import uuid
import traceback
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Document, DocumentChunk, Company
from app.rag.parser import parse_document
from app.rag.chunker import chunk_document
from app.rag.embeddings import get_embedding_service
from app.rag.vector_store import get_vector_store
from app.core.logging import get_logger

logger = get_logger("loader")


async def process_document(document_id: int, db_session_factory):
    """Orchestrate full document ingestion: parse → chunk → embed → store."""
    async with db_session_factory() as db:
        doc = None
        try:
            doc = await db.get(Document, document_id)
            if not doc:
                logger.error("document_not_found", document_id=document_id)
                return

            logger.info("processing_started", document_id=document_id, file_name=doc.file_name)
            doc.processing_status = 'processing'
            await db.commit()

            # Fetch company name for citation metadata
            company = await db.get(Company, doc.company_id)
            company_name = company.name if company else "Unknown Company"

            # Step 1: Parse document
            logger.info("parsing_document", document_id=document_id, file_path=doc.file_path)
            parsed_doc = parse_document(doc.file_path)
            doc.page_count = parsed_doc.total_pages
            logger.info("parsing_complete", document_id=document_id, pages=parsed_doc.total_pages, pages_with_text=len(parsed_doc.pages))

            if not parsed_doc.pages:
                raise ValueError("Document contains no extractable text. The PDF may be image-based or empty.")

            # Step 2: Chunk the text
            chunks = chunk_document(
                parsed_doc=parsed_doc,
                company_id=doc.company_id,
                company_name=company_name,
                document_id=doc.id,
                document_title=doc.title,
                document_type=doc.document_type
            )
            logger.info("chunking_complete", document_id=document_id, chunk_count=len(chunks))

            if not chunks:
                raise ValueError("No chunks generated from document text.")

            # Step 3: Generate embeddings
            embedding_service = get_embedding_service()
            texts = [c.text for c in chunks]
            logger.info("generating_embeddings", document_id=document_id, text_count=len(texts))
            vectors = await embedding_service.embed_texts(texts)
            logger.info("embeddings_complete", document_id=document_id, vector_count=len(vectors))

            # Step 4: Store in Qdrant and DB
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
            logger.info(
                "processing_complete",
                document_id=document_id,
                page_count=parsed_doc.total_pages,
                chunk_count=len(chunks),
                vector_count=len(vectors),
            )

        except Exception as e:
            logger.error(
                "processing_failed",
                document_id=document_id,
                error=str(e),
                traceback=traceback.format_exc(),
            )
            if doc:
                try:
                    doc.processing_status = 'failed'
                    doc.error_message = str(e)[:2000]
                    await db.commit()
                except Exception as commit_err:
                    logger.error("failed_to_update_error_status", document_id=document_id, error=str(commit_err))
