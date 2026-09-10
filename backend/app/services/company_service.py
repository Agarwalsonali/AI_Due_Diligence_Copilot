from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.models import Company, Document
from app.database.schemas import CompanyCreate

async def create_company(data: CompanyCreate, user_id: int, db: AsyncSession) -> Company:
    company = Company(
        **data.model_dump(),
        created_by=user_id
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company

async def get_companies(search: str | None, user_id: int, db: AsyncSession) -> list[Company]:
    stmt = select(Company).where(Company.created_by == user_id)
    if search:
        stmt = stmt.where(Company.name.ilike(f"%{search}%"))
    result = await db.execute(stmt)
    companies = result.scalars().all()

    # Populate document_count for each company
    for company in companies:
        count_stmt = select(func.count(Document.id)).where(Document.company_id == company.id)
        count_result = await db.execute(count_stmt)
        company.document_count = count_result.scalar() or 0

    return companies

async def get_company(company_id: int, db: AsyncSession) -> Company:
    company = await db.get(Company, company_id)
    if company:
        count_stmt = select(func.count(Document.id)).where(Document.company_id == company.id)
        count_result = await db.execute(count_stmt)
        company.document_count = count_result.scalar() or 0
    return company

async def delete_company(company_id: int, db: AsyncSession):
    company = await db.get(Company, company_id)
    if company:
        await db.delete(company)
        await db.commit()
