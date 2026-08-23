"""Analysis API — financial intelligence and due diligence endpoints.

Endpoints:
- POST /api/analysis/financials — Extract financial metrics + ratios + trends
- POST /api/analysis/health — Financial health assessment
- POST /api/analysis/risks — Risk analysis
- POST /api/analysis/opportunities — Growth opportunity analysis
- POST /api/analysis/summary — Executive summary
- POST /api/analysis/compare — Multi-company comparison
- POST /api/analysis/{company_id}/regenerate — Regenerate all analysis
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database.database import get_db
from app.database.models import User, Company, Analysis, FinancialMetric
from app.core.security import get_current_user
from app.database.schemas import (
    AnalysisRequest, ComparisonRequest,
    FinancialAnalysisResponse, FinancialHealthResponse,
    RiskAnalysisResponse, OpportunityAnalysisResponse,
    SummaryResponse, AnalysisRegenerateResponse,
    FinancialMetricResponse,
)
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.vector_store import get_vector_store
from app.rag.embeddings import get_embedding_service
from app.rag.reranker import get_reranker
from app.rag.generator import get_llm_generator
from app.rag.context import build_source_list

from app.financial.extraction import extract_financial_metrics, get_stored_metrics
from app.financial.ratios import calculate_all_ratios, build_metrics_by_year
from app.financial.trends import analyze_trends
from app.analysis.financial_health import assess_financial_health
from app.analysis.summary import generate_executive_summary
from app.analysis.risk import analyze_risks
from app.analysis.opportunities import analyze_opportunities
from app.analysis.comparison import compare_companies as compare_engine

from app.core.logging import get_logger

logger = get_logger("analysis_api")

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_context(company_id: int, query: str, db: AsyncSession, document_id: int = None):
    """Retrieve and rerank relevant chunks for a query. Returns [] on any error."""
    try:
        retriever = HybridRetriever(get_vector_store(), get_embedding_service())
        chunks = await retriever.retrieve(query=query, db=db, company_id=company_id, document_id=document_id)
        reranker = get_reranker()
        return reranker.rerank(query, chunks)
    except Exception as e:
        logger.error("retrieval_error", company_id=company_id, error=str(e))
        return []


async def _verify_company_access(company_id: int, user: User, db: AsyncSession):
    """Verify company exists and user has access."""
    company = await db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    if company.created_by != user.id:
        raise HTTPException(status_code=403, detail="Access denied.")
    return company


# ─── Financial Metrics ────────────────────────────────────────────────────────

@router.post("/financials")
async def generate_financials(
    req: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Extract financial metrics, calculate ratios, and analyze trends."""
    await _verify_company_access(req.company_id, user, db)

    # Check for existing analysis
    existing = await _get_existing_analysis(db, req.company_id, "financials")
    if existing:
        return existing

    # Retrieve financial evidence
    chunks = await _get_context(
        req.company_id,
        "Financial statements, revenue, net income, profit margin, assets, liabilities, debt, cash flow, earnings per share, operating income",
        db,
    )

    if not chunks:
        return {
            "company_id": req.company_id,
            "metrics": [],
            "ratios": [],
            "trends": {},
            "insights": ["No financial data found in the available documents."],
            "status": "no_data",
        }

    # Extract metrics via LLM
    metrics = await extract_financial_metrics(chunks, req.company_id, db)

    # Get all stored metrics
    stored = await get_stored_metrics(req.company_id, db)

    # Calculate ratios
    by_year = build_metrics_by_year(stored)
    ratio_results = calculate_all_ratios(by_year)

    # Analyze trends
    trends = analyze_trends(stored)

    # Generate insights
    insights = _generate_financial_insights(metrics, ratio_results, trends)

    result = {
        "company_id": req.company_id,
        "metrics": metrics,
        "ratios": ratio_results.get("ratios", []),
        "revenue_growth": ratio_results.get("revenue_growth", []),
        "cagr": ratio_results.get("cagr", {}),
        "trends": trends,
        "insights": insights,
        "status": "completed",
    }

    # Cache the analysis
    await _save_analysis(db, req.company_id, user.id, "financials", result)

    return result


def _generate_financial_insights(metrics, ratios, trends):
    """Generate human-readable financial insights from calculated data."""
    insights = []

    # Revenue growth
    rev_growth = ratios.get("revenue_growth", [])
    if rev_growth:
        latest = rev_growth[-1]
        pct = round(latest.get("value", 0) * 100, 1)
        if pct > 0:
            insights.append(f"Revenue grew {pct}% year-over-year in {latest.get('fiscal_year')}.")
        elif pct < 0:
            insights.append(f"Revenue declined {abs(pct)}% year-over-year in {latest.get('fiscal_year')}.")

    # Margins
    for r in ratios.get("ratios", []):
        if r.get("fiscal_year") == max((rr.get("fiscal_year") for rr in ratios.get("ratios", [])), default=None):
            if r["name"] == "net_margin" and r.get("value") is not None:
                insights.append(f"Net profit margin: {round(r['value'] * 100, 1)}%.")
            elif r["name"] == "current_ratio" and r.get("value") is not None:
                insights.append(f"Current ratio: {round(r['value'], 2)}.")

    # CAGR
    cagr = ratios.get("cagr", {})
    if "revenue" in cagr:
        cagr_pct = round(cagr["revenue"]["value"] * 100, 1)
        insights.append(f"Revenue CAGR: {cagr_pct}% from {cagr['revenue']['start_year']} to {cagr['revenue']['end_year']}.")

    return insights[:10]


# ─── Financial Health ─────────────────────────────────────────────────────────

@router.post("/health")
async def generate_health(
    req: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Assess financial health across growth, profitability, liquidity, leverage, cash flow."""
    await _verify_company_access(req.company_id, user, db)

    existing = await _get_existing_analysis(db, req.company_id, "health")
    if existing:
        return existing

    # Get stored metrics
    stored = await get_stored_metrics(req.company_id, db)
    by_year = build_metrics_by_year(stored)
    ratio_results = calculate_all_ratios(by_year)
    trends = analyze_trends(stored)

    # Build sources from metrics
    sources = build_source_list(
        [{"payload": {
            "text": m.get("source_excerpt", ""),
            "document_id": m.get("document_id", 0),
            "document_title": "",
            "page_number": m.get("source_page", 0),
            "section": m.get("source_section"),
            "chunk_index": 0,
        }} for m in stored if m.get("source_excerpt")],
        max_sources=10,
    )

    health = assess_financial_health(
        ratios=ratio_results.get("ratios", []),
        trends=trends,
        cagr_data=ratio_results.get("cagr", {}),
        sources=sources,
    )
    health["company_id"] = req.company_id

    await _save_analysis(db, req.company_id, user.id, "health", health)

    return health


# ─── Risk Analysis ────────────────────────────────────────────────────────────

@router.post("/risks")
async def generate_risks(
    req: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze risks from document evidence."""
    await _verify_company_access(req.company_id, user, db)

    existing = await _get_existing_analysis(db, req.company_id, "risks")
    if existing:
        return existing

    chunks = await _get_context(
        req.company_id,
        "Company risks, financial risks, operational risks, market risks, regulatory risks, competitive risks, supply chain risks, technology risks, legal risks",
        db,
    )
    generator = get_llm_generator()
    risks = await analyze_risks(req.company_id, chunks, generator)

    result = {"company_id": req.company_id, "risks": risks}
    await _save_analysis(db, req.company_id, user.id, "risks", result)

    return result


# ─── Growth Opportunities ─────────────────────────────────────────────────────

@router.post("/opportunities")
async def generate_opportunities(
    req: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Analyze growth opportunities from document evidence."""
    await _verify_company_access(req.company_id, user, db)

    existing = await _get_existing_analysis(db, req.company_id, "opportunities")
    if existing:
        return existing

    chunks = await _get_context(
        req.company_id,
        "Growth opportunities, market expansion, new products, strategic partnerships, AI, cloud, data center, international expansion, acquisitions",
        db,
    )
    generator = get_llm_generator()
    opportunities = await analyze_opportunities(req.company_id, chunks, generator)

    result = {"company_id": req.company_id, "opportunities": opportunities}
    await _save_analysis(db, req.company_id, user.id, "opportunities", result)

    return result


# ─── Executive Summary ────────────────────────────────────────────────────────

@router.post("/summary")
async def generate_summary(
    req: AnalysisRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate an executive due diligence summary."""
    await _verify_company_access(req.company_id, user, db)

    existing = await _get_existing_analysis(db, req.company_id, "summary")
    if existing:
        return existing

    chunks = await _get_context(
        req.company_id,
        "Company overview, business model, financial performance, strengths, risks, opportunities, management outlook, market position",
        db,
    )
    generator = get_llm_generator()
    result = await generate_executive_summary(req.company_id, chunks, generator)

    await _save_analysis(db, req.company_id, user.id, "summary", result)

    return result


# ─── Company Comparison ───────────────────────────────────────────────────────

@router.post("/compare")
async def compare_companies(
    req: ComparisonRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Compare multiple companies."""
    generator = get_llm_generator()
    chunks_by_company = {}
    for cid in req.company_ids:
        await _verify_company_access(cid, user, db)
        chunks = await _get_context(cid, "Market position, financial health, risks, opportunities comparison", db)
        chunks_by_company[cid] = chunks

    result = await compare_engine(req.company_ids, chunks_by_company, generator)
    return result


# ─── Regenerate Analysis ──────────────────────────────────────────────────────

@router.post("/{company_id}/regenerate", response_model=AnalysisRegenerateResponse)
async def regenerate_analysis(
    company_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Regenerate all analysis for a company by clearing cached results."""
    await _verify_company_access(company_id, user, db)

    # Delete existing analyses for this company
    stmt = delete(Analysis).where(
        Analysis.company_id == company_id,
        Analysis.user_id == user.id,
    )
    await db.execute(stmt)

    # Delete existing financial metrics for fresh extraction
    stmt = delete(FinancialMetric).where(FinancialMetric.company_id == company_id)
    await db.execute(stmt)

    await db.commit()

    logger.info("analysis_regenerated", company_id=company_id, user_id=user.id)

    return AnalysisRegenerateResponse(
        message="Analysis cache cleared. Re-request each analysis type to regenerate.",
        company_id=company_id,
        analysis_types=["financials", "health", "risks", "opportunities", "summary"],
    )


# ─── Analysis Cache Helpers ───────────────────────────────────────────────────

async def _get_existing_analysis(db: AsyncSession, company_id: int, analysis_type: str):
    """Check for existing completed analysis."""
    stmt = select(Analysis).where(
        Analysis.company_id == company_id,
        Analysis.analysis_type == analysis_type,
        Analysis.status == "completed",
    ).order_by(Analysis.created_at.desc()).limit(1)

    result = await db.execute(stmt)
    analysis = result.scalar_one_or_none()

    if analysis:
        content = analysis.content
        if company_id not in content:
            content["company_id"] = company_id
        return content
    return None


async def _save_analysis(db: AsyncSession, company_id: int, user_id: int, analysis_type: str, content: dict):
    """Save analysis result to database."""
    # Remove non-serializable fields
    safe_content = {k: v for k, v in content.items() if k != "id"}

    analysis = Analysis(
        company_id=company_id,
        user_id=user_id,
        analysis_type=analysis_type,
        status="completed",
        content=safe_content,
    )
    db.add(analysis)
    await db.commit()
