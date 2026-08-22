from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db, async_session_maker
from app.database.models import User
from app.core.security import get_current_user
from app.services.document_service import upload_document, get_documents, get_document, delete_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload")
async def upload_document_endpoint(
    file: UploadFile = File(...),
    company_id: int = Form(...),
    document_type: str = Form(...),
    filing_date: str = Form(...),
    title: str = Form(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    return await upload_document(
        file=file, 
        company_id=company_id, 
        document_type=document_type, 
        filing_date=filing_date, 
        user_id=user.id, 
        title=title, 
        db=db, 
        db_session_factory=async_session_maker
    )

@router.get("/")
async def list_documents(
    company_id: int, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    return await get_documents(company_id, user.id, db)

@router.get("/{id}")
async def get_document_endpoint(
    id: int, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    return await get_document(id, db)

@router.delete("/{id}")
async def delete_document_endpoint(
    id: int, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    await delete_document(id, db)
    return {"message": "Deleted"}
