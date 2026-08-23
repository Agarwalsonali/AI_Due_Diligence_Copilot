import os
import uuid
import asyncio
from datetime import date as date_type
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Document
from app.core.config import settings
from app.core.logging import get_logger
from app.rag.loader import process_document

logger = get_logger("document_service")

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/msword",
}


async def upload_document(
    file: UploadFile,
    company_id: int,
    document_type: str,
    filing_date: str,
    user_id: int,
    title: str,
    db: AsyncSession,
    db_session_factory,
) -> Document:
    # --- Validate file extension ---
    if not file.filename or "." not in file.filename:
        raise HTTPException(status_code=400, detail="File must have a valid extension (pdf, docx, txt).")
    ext = file.filename.rsplit(".", 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # --- Validate MIME type (when available) ---
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        # Some clients send generic MIME types; log but don't reject if extension is valid
        logger.warning("unexpected_mime_type", got=file.content_type, filename=file.filename)

    # --- Read and validate file size ---
    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB.",
        )

    # --- Store file safely ---
    safe_filename = f"{uuid.uuid4()}.{ext}"
    dir_path = os.path.join(settings.UPLOAD_DIR, str(company_id))
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    logger.info("file_stored", file_path=file_path, size_bytes=len(content))

    # --- Parse filing_date ---
    parsed_filing_date = None
    if filing_date:
        try:
            parsed_filing_date = date_type.fromisoformat(filing_date)
        except ValueError:
            pass  # Leave as None if invalid

    # --- Create DB record ---
    doc = Document(
        company_id=company_id,
        user_id=user_id,
        title=title,
        file_name=file.filename,
        file_path=file_path,
        document_type=document_type,
        filing_date=parsed_filing_date,
        processing_status="uploaded",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    logger.info("document_created", document_id=doc.id, company_id=company_id, file_name=file.filename)

    # --- Start background processing ---
    try:
        asyncio.create_task(process_document(doc.id, db_session_factory))
    except Exception as e:
        logger.error("failed_to_start_background_processing", document_id=doc.id, error=str(e))
        doc.processing_status = "failed"
        doc.error_message = f"Failed to start background processing: {e}"
        await db.commit()

    return doc


async def get_documents(company_id: int, user_id: int, db: AsyncSession) -> list[Document]:
    stmt = (
        select(Document)
        .where(Document.company_id == company_id, Document.user_id == user_id)
        .order_by(Document.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_document(document_id: int, db: AsyncSession) -> Document:
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


async def delete_document(document_id: int, db: AsyncSession):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 1. Remove vectors from Qdrant
    try:
        from app.rag.vector_store import get_vector_store
        vector_store = get_vector_store()
        vector_store.delete_by_document(document_id)
        logger.info("qdrant_vectors_deleted", document_id=document_id)
    except Exception as e:
        logger.error("qdrant_delete_failed", document_id=document_id, error=str(e))

    # 2. Remove stored file
    try:
        if doc.file_path and os.path.exists(doc.file_path):
            os.remove(doc.file_path)
            logger.info("file_removed", file_path=doc.file_path)
    except Exception as e:
        logger.error("file_remove_failed", file_path=doc.file_path, error=str(e))

    # 3. Remove DB record (cascades to DocumentChunk via relationship)
    await db.delete(doc)
    await db.commit()
    logger.info("document_deleted", document_id=document_id)
