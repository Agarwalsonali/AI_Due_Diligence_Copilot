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
    document_id: int
    document_title: str
    page_number: int
    section: Optional[str] = None
    text_excerpt: str
    
    model_config = ConfigDict(from_attributes=True)

class ChatRequest(BaseModel):
    message: str
    company_id: Optional[int] = None
    session_id: Optional[int] = None

class ChatResponse(BaseModel):
    message: str
    sources: Optional[List[SourceCitation]] = None
    session_id: int
    
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
    sources: Optional[List[SourceCitation]] = None
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
    sources: List[SourceCitation]
    
    model_config = ConfigDict(from_attributes=True)

class OpportunityItem(BaseModel):
    category: str
    title: str
    description: str
    evidence: str
    confidence: str
    sources: List[SourceCitation]
    
    model_config = ConfigDict(from_attributes=True)

class FinancialMetricResponse(BaseModel):
    id: int
    company_id: int
    document_id: Optional[int]
    metric_name: str
    metric_value: float
    unit: Optional[str]
    period: Optional[str]
    fiscal_year: Optional[int]
    source: str
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
    insights: List[str]
    
    model_config = ConfigDict(from_attributes=True)

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
