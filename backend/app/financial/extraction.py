import re
from app.database.models import FinancialMetric

async def extract_financial_metrics(chunks: list[dict], company_id: int, db) -> list[FinancialMetric]:
    metrics = []
    
    patterns = {
        'revenue': r'revenue (?:of|was) \$([\d\.]+)\s*(million|billion)',
        'net_income': r'net income (?:of|was) \$([\d\.]+)\s*(million|billion)',
        'gross_profit': r'gross profit (?:of|was) \$([\d\.]+)\s*(million|billion)'
    }
    
    for chunk in chunks:
        text = chunk['payload'].get('text', '').lower()
        
        for metric_name, pattern in patterns.items():
            matches = re.finditer(pattern, text)
            for match in matches:
                val = float(match.group(1))
                unit = match.group(2)
                
                if unit == 'billion':
                    val *= 1000
                    unit = 'million'
                    
                metric = FinancialMetric(
                    company_id=company_id,
                    document_id=chunk['payload'].get('document_id'),
                    metric_name=metric_name,
                    metric_value=val,
                    unit=unit,
                    period="annual",
                    fiscal_year=2023, 
                    source=f"Extracted from page {chunk['payload'].get('page_number')}"
                )
                metrics.append(metric)
                db.add(metric)
                
    await db.commit()
    return metrics
