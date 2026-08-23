from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.database.database import get_db, async_session_maker
from app.database.models import User
from app.core.security import get_current_user
from app.database.schemas import DocumentResponse, DocumentUploadResponse
from app.services.document_service import upload_document, get_documents, get_document, delete_document

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document_endpoint(
    file: UploadFile = File(...),
    company_id: int = Form(...),
    document_type: str = Form(...),
    filing_date: str = Form(""),
    title: str = Form(""),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a document for processing. Supported types: PDF, DOCX, TXT."""
    # Use filename as title if not provided
    if not title and file.filename:
        title = file.filename.rsplit(".", 1)[0]

    doc = await upload_document(
        file=file,
        company_id=company_id,
        document_type=document_type,
        filing_date=filing_date,
        user_id=user.id,
        title=title,
        db=db,
        db_session_factory=async_session_maker,
    )
    return DocumentUploadResponse(
        id=doc.id,
        file_name=doc.file_name,
        status=doc.processing_status,
        message="Document uploaded and processing started.",
    )


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    company_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List documents for a company, optionally filtered."""
    return await get_documents(company_id, user.id, db)


@router.get("/{id}", response_model=DocumentResponse)
async def get_document_endpoint(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get document details including processing status."""
    return await get_document(id, db)


@router.delete("/{id}")
async def delete_document_endpoint(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a document and its vectors from Qdrant."""
    await delete_document(id, db)
    return {"message": "Document deleted successfully."}
