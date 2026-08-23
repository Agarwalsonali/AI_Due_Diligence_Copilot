"""Financial metric extraction using LLM + RAG evidence.

For each metric type:
1. RAG retrieves relevant financial chunks
2. LLM extracts structured values from evidence
3. Values are normalized (billions → raw numbers)
4. Values are validated (negative revenue = suspicious)
5. Results are stored with full source metadata
"""
import json
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import FinancialMetric, Document
from app.core.logging import get_logger

logger = get_logger("financial_extraction")

# Standard metric names
METRIC_NAMES = [
    "revenue", "gross_profit", "operating_income", "net_income", "eps",
    "total_assets", "total_liabilities", "current_assets", "current_liabilities",
    "cash", "debt", "equity", "operating_cash_flow", "capital_expenditure", "free_cash_flow",
]

# Metrics that should generally not be negative
NON_NEGATIVE_METRICS = {
    "revenue", "gross_profit", "total_assets", "total_liabilities",
    "current_assets", "current_liabilities", "cash", "debt", "equity",
}

EXTRACTION_PROMPT = """You are a financial data extraction assistant. Extract financial metrics from the provided document context.

Extract ONLY the metrics listed below. For each metric found, return a JSON object with:
- metric: standardized metric name (one of: revenue, gross_profit, operating_income, net_income, eps, total_assets, total_liabilities, current_assets, current_liabilities, cash, debt, equity, operating_cash_flow, capital_expenditure, free_cash_flow)
- fiscal_year: the fiscal year (integer, e.g. 2025)
- value: the numeric value (raw number, e.g. 130500000000 for $130.5 billion)
- currency: currency code (e.g. USD)
- source_page: page number where found (integer)
- source_excerpt: the exact text excerpt that contains this value (string, max 200 chars)

Rules:
- Extract the MOST RECENT fiscal year values when multiple years are present.
- If a value is stated as "$X billion", convert to raw number (X * 1,000,000,000).
- If a value is stated as "$X million", convert to raw number (X * 1,000,000).
- If a value is stated as "$X thousand", convert to raw number (X * 1,000).
- If a value has commas like "130,500", treat as the raw number.
- If a metric is not found in the context, do NOT include it.
- Do NOT fabricate values. Only extract values explicitly stated in the text.
- Return a JSON array of objects. Return [] if no metrics found.

Return ONLY the JSON array. No explanation."""


def _normalize_value(raw_value: float, unit_hint: str = "") -> float:
    """Normalize financial values to raw numbers."""
    unit_lower = unit_hint.lower()
    if "billion" in unit_lower or unit_lower == "b":
        return raw_value * 1_000_000_000
    elif "million" in unit_lower or unit_lower == "m":
        return raw_value * 1_000_000
    elif "thousand" in unit_lower or unit_lower == "k":
        return raw_value * 1_000
    return raw_value


def _validate_metric(metric_name: str, value: float) -> str:
    """Validate an extracted metric. Returns status string."""
    if value is None:
        return "not_found"
    if metric_name in NON_NEGATIVE_METRICS and value < 0:
        return "suspicious"
    if "margin" in metric_name or "ratio" in metric_name:
        if value < -1 or value > 10:
            return "suspicious"
    return "extracted"


def _parse_llm_response(text: str) -> List[Dict[str, Any]]:
    """Parse the LLM's JSON response, handling common formatting issues."""
    # Try to find JSON array in the response
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass

    # Try to find individual JSON objects
    objects = re.findall(r'\{[^{}]+\}', text)
    results = []
    for obj_str in objects:
        try:
            obj = json.loads(obj_str)
            if "metric" in obj and "value" in obj:
                results.append(obj)
        except json.JSONDecodeError:
            pass
    return results


async def extract_financial_metrics(
    chunks: List[Dict[str, Any]],
    company_id: int,
    db: AsyncSession,
    document_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Extract financial metrics from RAG chunks using LLM.

    Steps:
    1. Build context from retrieved chunks
    2. Ask LLM to extract structured financial data
    3. Normalize values
    4. Validate
    5. Store in database
    6. Return structured results
    """
    from app.rag.generator import get_llm_generator

    if not chunks:
        logger.info("no_chunks_for_extraction", company_id=company_id)
        return []

    generator = get_llm_generator()

    # Build extraction query
    result = await generator.generate(
        EXTRACTION_PROMPT,
        "Extract all financial metrics from the provided document context.",
        chunks,
        temperature=0.0,
    )

    answer = result.get("answer", "")
    extracted = _parse_llm_response(answer)

    logger.info(
        "llm_extraction_complete",
        company_id=company_id,
        metrics_found=len(extracted),
    )

    # Process and store each metric
    metrics = []
    for item in extracted:
        metric_name = item.get("metric", "").lower().strip()
        if metric_name not in METRIC_NAMES:
            logger.warning("unknown_metric_name", name=metric_name)
            continue

        raw_value = item.get("value")
        if raw_value is None:
            continue

        try:
            value = float(raw_value)
        except (ValueError, TypeError):
            logger.warning("invalid_metric_value", name=metric_name, value=raw_value)
            continue

        fiscal_year = item.get("fiscal_year")
        if fiscal_year:
            try:
                fiscal_year = int(fiscal_year)
            except (ValueError, TypeError):
                fiscal_year = None

        currency = item.get("currency", "USD")
        source_page = item.get("source_page")
        source_excerpt = item.get("source_excerpt", "")[:500]

        # Validate
        status = _validate_metric(metric_name, value)

        # Build source description
        doc_title = ""
        if document_id:
            doc = await db.get(Document, document_id)
            if doc:
                doc_title = doc.title

        source_desc = f"Page {source_page}" if source_page else "Extracted from document"

        metric = FinancialMetric(
            company_id=company_id,
            document_id=document_id,
            metric_name=metric_name,
            metric_value=value,
            currency=currency,
            fiscal_year=fiscal_year,
            status=status,
            source_page=source_page,
            source_section=None,
            source_excerpt=source_excerpt,
            source=source_desc,
        )
        db.add(metric)

        metrics.append({
            "id": None,  # Will be set after commit
            "company_id": company_id,
            "document_id": document_id,
            "metric_name": metric_name,
            "metric_value": value,
            "currency": currency,
            "fiscal_year": fiscal_year,
            "status": status,
            "source_page": source_page,
            "source_excerpt": source_excerpt,
            "source": source_desc,
        })

    if metrics:
        await db.commit()
        # Refresh to get IDs
        for m in metrics:
            if m.get("id") is None:
                stmt = select(FinancialMetric).where(
                    FinancialMetric.company_id == company_id,
                    FinancialMetric.metric_name == m["metric_name"],
                ).order_by(FinancialMetric.id.desc()).limit(1)
                result = await db.execute(stmt)
                db_metric = result.scalar_one_or_none()
                if db_metric:
                    m["id"] = db_metric.id

    logger.info(
        "extraction_stored",
        company_id=company_id,
        metric_count=len(metrics),
        statuses={m["status"] for m in metrics},
    )

    return metrics


async def get_stored_metrics(
    company_id: int,
    db: AsyncSession,
    document_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Retrieve previously extracted metrics from the database."""
    stmt = select(FinancialMetric).where(FinancialMetric.company_id == company_id)
    if document_id:
        stmt = stmt.where(FinancialMetric.document_id == document_id)
    stmt = stmt.order_by(FinancialMetric.fiscal_year.desc(), FinancialMetric.metric_name)

    result = await db.execute(stmt)
    metrics = result.scalars().all()

    return [
        {
            "id": m.id,
            "company_id": m.company_id,
            "document_id": m.document_id,
            "metric_name": m.metric_name,
            "metric_value": m.metric_value,
            "currency": m.currency,
            "unit": m.unit,
            "fiscal_year": m.fiscal_year,
            "status": m.status,
            "source_page": m.source_page,
            "source_section": m.source_section,
            "source_excerpt": m.source_excerpt,
            "source": m.source,
        }
        for m in metrics
    ]
