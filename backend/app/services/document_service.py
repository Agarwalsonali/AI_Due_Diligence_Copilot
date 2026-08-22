import os
import uuid
import asyncio
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Document
from app.core.config import settings
from app.rag.loader import process_document

async def upload_document(
    file: UploadFile,
    company_id: int,
    document_type: str,
    filing_date: str,
    user_id: int,
    title: str,
    db: AsyncSession,
    db_session_factory
) -> Document:

    ext = file.filename.split('.')[-1]
    safe_filename = f"{uuid.uuid4()}.{ext}"
    
    dir_path = os.path.join(settings.UPLOAD_DIR, str(company_id))
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, safe_filename)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    doc = Document(
        company_id=company_id,
        user_id=user_id,
        title=title,
        file_name=safe_filename,
        file_path=file_path,
        document_type=document_type,
        filing_date=filing_date,
        processing_status='uploaded'
    )
    
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    
    asyncio.create_task(process_document(doc.id, db_session_factory))
    
    return doc

async def get_documents(company_id: int, user_id: int, db: AsyncSession) -> list[Document]:
    stmt = select(Document).where(Document.company_id == company_id, Document.user_id == user_id)
    result = await db.execute(stmt)
    return result.scalars().all()

async def get_document(document_id: int, db: AsyncSession) -> Document:
    return await db.get(Document, document_id)

async def delete_document(document_id: int, db: AsyncSession):
    doc = await db.get(Document, document_id)
    if doc:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
            
        from app.rag.vector_store import get_vector_store
        get_vector_store().delete_by_document(document_id)
        
        await db.delete(doc)
        await db.commit()
