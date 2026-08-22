from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import FinancialMetric

async def get_financial_trends(company_id: int, db: AsyncSession) -> dict:
    stmt = select(FinancialMetric).where(FinancialMetric.company_id == company_id).order_by(FinancialMetric.fiscal_year)
    result = await db.execute(stmt)
    metrics = result.scalars().all()
    
    trends = {}
    for metric in metrics:
        if metric.metric_name not in trends:
            trends[metric.metric_name] = []
        trends[metric.metric_name].append({
            "year": metric.fiscal_year,
            "value": metric.metric_value,
            "unit": metric.unit
        })
        
    return trends
