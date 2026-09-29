// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// ─── Company ─────────────────────────────────────────────────────────────────
export interface Company {
  id: number;
  name: string;
  ticker: string | null;
  industry: string | null;
  sector: string | null;
  description: string | null;
  website: string | null;
  createdBy: number;
  createdAt: string;
  documentCount: number;
}

export interface CompanyCreate {
  name: string;
  ticker?: string;
  industry?: string;
  sector?: string;
  description?: string;
  website?: string;
}

// ─── Document ────────────────────────────────────────────────────────────────
export interface Document {
  id: number;
  companyId: number;
  userId: number;
  title: string;
  fileName: string;
  filePath: string;
  documentType: string;
  filingDate: string | null;
  pageCount: number;
  processingStatus: 'uploaded' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
  createdAt: string;
}

export interface DocumentUploadResponse {
  id: number;
  fileName: string;
  status: string;
  message: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export interface SourceCitation {
  sourceId?: string;
  documentId: number;
  documentTitle: string;
  pageNumber: number;
  section: string | null;
  excerpt: string;
  score?: number;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceCitation[] | null;
  createdAt: string;
}

export interface ChatSession {
  id: number;
  userId: number;
  companyId: number | null;
  companyName?: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  companyId?: number;
  documentId?: number;
  sessionId?: number;
}

export interface ChatResponse {
  answer: string;
  sessionId: number;
  confidence: number;
  sources: SourceCitation[];
  sufficientEvidence: boolean;
}

// ─── Financial ───────────────────────────────────────────────────────────────
export interface FinancialMetricResponse {
  id: number;
  companyId: number;
  documentId: number | null;
  metricName: string;
  metricValue: number | null;
  currency: string | null;
  unit: string | null;
  fiscalYear: number | null;
  status: string;
  sourcePage: number | null;
  sourceSection: string | null;
  sourceExcerpt: string | null;
  source: string;
  createdAt: string;
}

export interface FinancialRatio {
  name: string;
  value: number | null;
  fiscalYear: number | null;
  formula: string;
}

export interface TrendPoint {
  year: number;
  value: number | null;
}

export interface FinancialAnalysisResponse {
  companyId: number;
  metrics: FinancialMetricResponse[];
  ratios: FinancialRatio[];
  revenueGrowth: TrendPoint[];
  cagr: Record<string, { value: number; startYear: number; endYear: number }>;
  trends: Record<string, TrendPoint[]>;
  insights: string[];
  status: string;
}

export interface FinancialHealthResponse {
  companyId: number;
  overall: string;
  growth: string | null;
  profitability: string | null;
  liquidity: string | null;
  leverage: string | null;
  cashFlow: string | null;
  explanation: string;
  scores: Record<string, number> | null;
  sources: SourceCitation[];
}

// ─── Analysis ────────────────────────────────────────────────────────────────
export interface RiskItem {
  category: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: string;
  sources: SourceCitation[];
}

export interface OpportunityItem {
  category: string;
  title: string;
  description: string;
  evidence: string;
  confidence: string | number;
  sources: SourceCitation[];
}

export interface RiskAnalysisResponse {
  companyId: number;
  risks: RiskItem[];
}

export interface OpportunityAnalysisResponse {
  companyId: number;
  opportunities: OpportunityItem[];
}

export interface SummaryResponse {
  companyId: number;
  executiveSummary: string;
  keyFindings: string[];
}

export interface ComparisonRequest {
  companyIds: number[];
}

export interface ComparisonResponse {
  companyId: number;
  companies: Company[];
  comparisonPoints: Record<string, any>[];
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export interface Report {
  id: number;
  title: string;
  status: 'generating' | 'completed' | 'failed';
  filePath: string | null;
  createdAt: string;
}

// ─── Chart ───────────────────────────────────────────────────────────────────
export interface ChartDataPoint {
  year: string;
  value: number;
  label?: string;
}
