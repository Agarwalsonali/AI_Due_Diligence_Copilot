from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

# Auth
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    
    model_config = ConfigDict(from_attributes=True)

# Company
class CompanyCreate(BaseModel):
    name: str
    ticker: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    ticker: Optional[str] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None

class CompanyResponse(BaseModel):
    id: int
    name: str
    ticker: Optional[str]
    industry: Optional[str]
    sector: Optional[str]
    description: Optional[str]
    website: Optional[str]
    created_by: int
    created_at: datetime
    document_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)

# Document
class DocumentUploadResponse(BaseModel):
    id: int
    file_name: str
    status: str
    message: str
    
    model_config = ConfigDict(from_attributes=True)

class DocumentResponse(BaseModel):
    id: int
    company_id: int
    user_id: int
    title: str
    file_name: str
    file_path: str
    document_type: str
    filing_date: Optional[date]
    page_count: int
    processing_status: str
    error_message: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
    
    model_config = ConfigDict(from_attributes=True)

# Chat
class SourceCitation(BaseModel):
    source_id: Optional[str] = None
    document_id: int
    document_title: str
    page_number: int
    section: Optional[str] = None
    excerpt: str
    score: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str
    company_id: Optional[int] = None
    document_id: Optional[int] = None
    session_id: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    session_id: int
    confidence: float = 0.0
    sources: Optional[List[SourceCitation]] = None
    sufficient_evidence: bool = True
    
    model_config = ConfigDict(from_attributes=True)

class ChatSessionResponse(BaseModel):
    id: int
    user_id: int
    company_id: Optional[int]
    title: str
    message_count: Optional[int] = 0
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: Optional[Any] = None  # JSON field — list of source dicts or None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Analysis
class AnalysisRequest(BaseModel):
    company_id: int

class ComparisonRequest(BaseModel):
    company_ids: List[int]

class RiskItem(BaseModel):
    category: str
    title: str
    severity: str
    description: str
    evidence: str
    sources: Optional[List[SourceCitation]] = None
    
    model_config = ConfigDict(from_attributes=True)

class OpportunityItem(BaseModel):
    category: str
    title: str
    description: str
    evidence: str
    confidence: Optional[str] = None
    sources: Optional[List[SourceCitation]] = None
    
    model_config = ConfigDict(from_attributes=True)

class FinancialMetricResponse(BaseModel):
    id: int
    company_id: int
    document_id: Optional[int] = None
    metric_name: str
    metric_value: Optional[float] = None
    currency: Optional[str] = None
    unit: Optional[str] = None
    fiscal_year: Optional[int] = None
    status: str = "extracted"
    source_page: Optional[int] = None
    source_section: Optional[str] = None
    source_excerpt: Optional[str] = None
    source: str = ""
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class SummaryResponse(BaseModel):
    company_id: int
    executive_summary: str
    key_findings: List[str]
    
    model_config = ConfigDict(from_attributes=True)

class RiskAnalysisResponse(BaseModel):
    company_id: int
    risks: List[RiskItem]
    
    model_config = ConfigDict(from_attributes=True)

class OpportunityAnalysisResponse(BaseModel):
    company_id: int
    opportunities: List[OpportunityItem]
    
    model_config = ConfigDict(from_attributes=True)

class FinancialAnalysisResponse(BaseModel):
    company_id: int
    metrics: List[FinancialMetricResponse]
    ratios: Optional[List[Dict[str, Any]]] = None
    trends: Optional[Dict[str, List[Dict[str, Any]]]] = None
    insights: Optional[List[str]] = None
    status: str = "completed"
    
    model_config = ConfigDict(from_attributes=True)

class FinancialHealthResponse(BaseModel):
    company_id: int
    overall: str
    growth: Optional[str] = None
    profitability: Optional[str] = None
    liquidity: Optional[str] = None
    leverage: Optional[str] = None
    cash_flow: Optional[str] = None
    explanation: str
    scores: Optional[Dict[str, float]] = None
    sources: Optional[List[SourceCitation]] = None
    
    model_config = ConfigDict(from_attributes=True)

class AnalysisRegenerateResponse(BaseModel):
    message: str
    company_id: int
    analysis_types: List[str]


class ConsolidatedAnalysisResponse(BaseModel):
    company_id: int
    financials: Optional[FinancialAnalysisResponse] = None
    financial_health: Optional[FinancialHealthResponse] = None
    risks: Optional[RiskAnalysisResponse] = None
    opportunities: Optional[OpportunityAnalysisResponse] = None
    summary: Optional[SummaryResponse] = None

class ComparisonResponse(BaseModel):
    companies: List[CompanyResponse]
    comparison_points: List[Dict[str, Any]]
    
    model_config = ConfigDict(from_attributes=True)

# Report
class ReportGenerateRequest(BaseModel):
    company_id: int
    sections: Optional[List[str]] = None

class ReportResponse(BaseModel):
    id: int
    title: str
    status: str
    file_path: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
