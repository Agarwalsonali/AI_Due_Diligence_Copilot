from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import get_db
from app.database.models import User
from app.core.security import get_current_user
from app.database.schemas import CompanyCreate, CompanyResponse
from app.services.company_service import create_company, get_companies, get_company, delete_company

router = APIRouter(prefix="/api/companies", tags=["companies"])

@router.post("/", response_model=CompanyResponse)
async def create_company_endpoint(
    data: CompanyCreate, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    return await create_company(data, user.id, db)

@router.get("/")
async def list_companies(
    search: str = None, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    return await get_companies(search, user.id, db)

@router.get("/{id}")
async def get_company_endpoint(
    id: int, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    return await get_company(id, db)

@router.delete("/{id}")
async def delete_company_endpoint(
    id: int, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user)
):
    await delete_company(id, db)
    return {"message": "Deleted"}
