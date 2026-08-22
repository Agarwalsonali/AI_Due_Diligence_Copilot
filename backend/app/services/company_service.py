from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Company
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
    return result.scalars().all()

async def get_company(company_id: int, db: AsyncSession) -> Company:
    return await db.get(Company, company_id)

async def delete_company(company_id: int, db: AsyncSession):
    company = await db.get(Company, company_id)
    if company:
        await db.delete(company)
        await db.commit()
