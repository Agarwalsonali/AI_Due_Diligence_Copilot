from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.database.models import User, Company, Analysis
from app.core.security import get_current_user
from app.database.schemas import CompanyCreate, CompanyResponse, AnalysisRequest
from app.services.company_service import create_company, get_companies, get_company, delete_company
from app.core.logging import get_logger

logger = get_logger("companies_api")

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


@router.get("/{id}/analysis")
async def get_company_analysis(
    id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get consolidated analysis for a company."""
    company = await db.get(Company, id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    if company.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Fetch all completed analyses
    stmt = (
        select(Analysis)
        .where(Analysis.company_id == id, Analysis.status == "completed")
        .order_by(Analysis.created_at.desc())
    )
    result = await db.execute(stmt)
    analyses = result.scalars().all()

    # Deduplicate by type (keep most recent)
    seen_types = set()
    consolidated = {
        "company_id": id,
        "financials": None,
        "financial_health": None,
        "risks": None,
        "opportunities": None,
        "summary": None,
    }

    type_mapping = {
        "financials": "financials",
        "health": "financial_health",
        "risks": "risks",
        "opportunities": "opportunities",
        "summary": "summary",
    }

    for a in analyses:
        target_key = type_mapping.get(a.analysis_type)
        if target_key and target_key not in seen_types:
            consolidated[target_key] = a.content
            seen_types.add(target_key)

    return consolidated
