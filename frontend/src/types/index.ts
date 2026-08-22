// User types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// Company types
export interface Company {
  id: number;
  name: string;
  ticker: string | null;
  industry: string | null;
  sector: string | null;
  description: string | null;
  website: string | null;
  document_count: number;
  created_at: string;
}

export interface CompanyCreate {
  name: string;
  ticker?: string;
  industry?: string;
  sector?: string;
  description?: string;
  website?: string;
}

// Document types
export interface Document {
  id: number;
  company_id: number;
  title: string;
  file_name: string;
  document_type: string;
  filing_date: string | null;
  page_count: number;
  processing_status: 'uploaded' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

// Chat types
export interface SourceCitation {
  document_id: number;
  document_title: string;
  page_number: number;
  section: string | null;
  text_excerpt: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceCitation[] | null;
  created_at: string;
}

export interface ChatSession {
  id: number;
  title: string;
  company_id: number | null;
  company_name?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatRequest {
  message: string;
  company_id?: number;
  session_id?: number;
}

// Analysis types
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
  confidence: number;
  sources: SourceCitation[];
}

export interface FinancialMetric {
  id: number;
  metric_name: string;
  metric_value: number;
  unit: string | null;
  period: string | null;
  fiscal_year: number | null;
  source: 'reported' | 'calculated' | 'estimated';
}

export interface ExecutiveSummary {
  overview: { text: string; sources: SourceCitation[] };
  financial_health: { text: string; sources: SourceCitation[] };
  key_strengths: { text: string; sources: SourceCitation[] };
  key_risks: { text: string; sources: SourceCitation[] };
  growth_opportunities: { text: string; sources: SourceCitation[] };
  management_outlook: { text: string; sources: SourceCitation[] };
  overall_assessment: { text: string; sources: SourceCitation[] };
}

export interface ComparisonResult {
  companies: Company[];
  metrics_comparison: Record<string, Record<number, number | string>>;
  narrative: string;
  sources: SourceCitation[];
}

export interface Report {
  id: number;
  title: string;
  report_type: string;
  status: 'generating' | 'completed' | 'failed';
  file_path: string | null;
  created_at: string;
}

// Financial chart types
export interface ChartDataPoint {
  year: string;
  value: number;
  label?: string;
}

export interface FinancialTrends {
  revenue: ChartDataPoint[];
  net_income: ChartDataPoint[];
  profit_margin: ChartDataPoint[];
  cash: ChartDataPoint[];
  debt: ChartDataPoint[];
}

export interface FinancialRatios {
  revenue_growth: number | null;
  profit_margin: number | null;
  operating_margin: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  cash_flow_growth: number | null;
}
