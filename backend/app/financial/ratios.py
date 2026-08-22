from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import FinancialMetric

def calculate_revenue_growth(current: float, previous: float) -> float:
    if previous == 0: return 0.0
    return (current - previous) / previous

def calculate_profit_margin(net_income: float, revenue: float) -> float:
    if revenue == 0: return 0.0
    return net_income / revenue

def calculate_operating_margin(operating_income: float, revenue: float) -> float:
    if revenue == 0: return 0.0
    return operating_income / revenue

def calculate_debt_to_equity(total_debt: float, equity: float) -> float:
    if equity == 0: return 0.0
    return total_debt / equity

def calculate_current_ratio(current_assets: float, current_liabilities: float) -> float:
    if current_liabilities == 0: return 0.0
    return current_assets / current_liabilities

async def calculate_ratios(company_id: int, db: AsyncSession) -> dict:
    stmt = select(FinancialMetric).where(FinancialMetric.company_id == company_id)
    result = await db.execute(stmt)
    metrics = result.scalars().all()
    
    metrics_map = {m.metric_name: m.metric_value for m in metrics}
    
    ratios = {}
    if 'net_income' in metrics_map and 'revenue' in metrics_map:
        ratios['profit_margin'] = calculate_profit_margin(metrics_map['net_income'], metrics_map['revenue'])
        
    return ratios
