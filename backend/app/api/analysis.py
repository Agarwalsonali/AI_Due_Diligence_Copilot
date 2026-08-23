from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_db
from app.database.models import User, Analysis
from app.core.security import get_current_user
from app.database.schemas import AnalysisRequest, ComparisonRequest
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.vector_store import get_vector_store
from app.rag.embeddings import get_embedding_service
from app.rag.reranker import get_reranker
from app.rag.generator import get_llm_generator

from app.analysis.summary import generate_executive_summary
from app.analysis.risk import analyze_risks
from app.analysis.opportunities import analyze_opportunities
from app.financial.extraction import extract_financial_metrics
from app.analysis.comparison import compare_companies as compare_engine

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

async def _get_context(company_id: int, query: str, db: AsyncSession) -> list:
    retriever = HybridRetriever(get_vector_store(), get_embedding_service())
    chunks = await retriever.retrieve(query=query, db=db, company_id=company_id)
    reranker = get_reranker()
    return reranker.rerank(query, chunks)

@router.post("/summary")
async def generate_summary(req: AnalysisRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    chunks = await _get_context(req.company_id, "Company overview, financial health, strengths, risks, opportunities, management outlook", db)
    generator = get_llm_generator()
    result = await generate_executive_summary(req.company_id, chunks, generator)
    
    analysis = Analysis(company_id=req.company_id, user_id=user.id, analysis_type="summary", content=result)
    db.add(analysis)
    await db.commit()
    return result

@router.post("/risks")
async def generate_risks(req: AnalysisRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    chunks = await _get_context(req.company_id, "Company risks, financial risks, operational risks, market risks, regulatory risks, geopolitical risks", db)
    generator = get_llm_generator()
    result = await analyze_risks(req.company_id, chunks, generator)
    
    analysis = Analysis(company_id=req.company_id, user_id=user.id, analysis_type="risks", content={"risks": result})
    db.add(analysis)
    await db.commit()
    return {"risks": result}

@router.post("/opportunities")
async def generate_opportunities(req: AnalysisRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    chunks = await _get_context(req.company_id, "Growth opportunities, market expansion, new products, strategic partnerships", db)
    generator = get_llm_generator()
    result = await analyze_opportunities(req.company_id, chunks, generator)
    
    analysis = Analysis(company_id=req.company_id, user_id=user.id, analysis_type="opportunities", content={"opportunities": result})
    db.add(analysis)
    await db.commit()
    return {"opportunities": result}

@router.post("/financials")
async def generate_financials(req: AnalysisRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    chunks = await _get_context(req.company_id, "Financial statements, revenue, net income, profit margin, assets, liabilities, debt, cash flow", db)
    result = await extract_financial_metrics(chunks, req.company_id, db)
    return {"metrics": result}

@router.post("/compare")
async def compare_companies(req: ComparisonRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    generator = get_llm_generator()
    chunks_by_company = {}
    for cid in req.company_ids:
        chunks = await _get_context(cid, "Market position, financial health, risks, opportunities comparison", db)
        chunks_by_company[cid] = chunks
        
    result = await compare_engine(req.company_ids, chunks_by_company, generator)
    return result
