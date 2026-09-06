"""
Seed the database with dummy data for testing the overall flow.

Usage (from backend/ directory):
    python seed_data.py

Requires the DATABASE_URL env var to be set (reads .env automatically).
"""

import asyncio
import os
import sys

# Load .env from the project root (one level up from backend/)
from dotenv import load_dotenv
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_project_root, ".env"))

# When running locally (not in Docker), override hostnames to localhost
_db_url = os.environ.get("DATABASE_URL", "")
if "@postgres:" in _db_url:
    os.environ["DATABASE_URL"] = _db_url.replace("@postgres:", "@localhost:")
_qdrant_url = os.environ.get("QDRANT_URL", "")
if "//qdrant" in _qdrant_url:
    os.environ["QDRANT_URL"] = _qdrant_url.replace("//qdrant", "//localhost")

# Ensure backend/app is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date, datetime, timedelta
from sqlalchemy import text

from app.database.database import engine, async_session_maker
from app.database.database import Base
from app.database.models import (
    User, Company, Document, DocumentChunk,
    ChatSession, ChatMessage, Analysis, FinancialMetric, Report,
)
from app.core.security import hash_password


# ─── Dummy Data ──────────────────────────────────────────────────────────────

USER_EMAIL = "test@freebuff.com"
USER_PASSWORD = "testpassword123"
USER_NAME = "Test User"

COMPANIES = [
    {
        "name": "Acme Corp",
        "ticker": "ACME",
        "industry": "Technology",
        "sector": "Software",
        "description": "Enterprise SaaS company providing cloud-based project management tools.",
        "website": "https://acme.example.com",
    },
    {
        "name": "Global Pharma Inc",
        "ticker": "GPHR",
        "industry": "Healthcare",
        "sector": "Pharmaceuticals",
        "description": "Large-cap pharmaceutical company with a diversified drug pipeline.",
        "website": "https://globalpharma.example.com",
    },
    {
        "name": "GreenEnergy Ltd",
        "ticker": "GRNE",
        "industry": "Energy",
        "sector": "Renewable Energy",
        "description": "Solar and wind energy company expanding into battery storage.",
        "website": "https://greenenergy.example.com",
    },
]

DOCUMENTS = [
    # Acme Corp docs
    {
        "company_idx": 0,
        "title": "FY2025 Annual Report",
        "file_name": "acme_fy2025_annual_report.pdf",
        "document_type": "annual_report",
        "filing_date": date(2025, 3, 15),
        "page_count": 64,
        "processing_status": "completed",
    },
    {
        "company_idx": 0,
        "title": "Q1 2025 Earnings Call Transcript",
        "file_name": "acme_q1_2025_earnings.pdf",
        "document_type": "earnings_transcript",
        "filing_date": date(2025, 5, 2),
        "page_count": 28,
        "processing_status": "completed",
    },
    # Global Pharma docs
    {
        "company_idx": 1,
        "title": "FY2025 10-K Filing",
        "file_name": "gphr_10k_2025.pdf",
        "document_type": "10_k",
        "filing_date": date(2025, 2, 28),
        "page_count": 120,
        "processing_status": "completed",
    },
    {
        "company_idx": 1,
        "title": "Drug Pipeline Update - March 2025",
        "file_name": "gphr_pipeline_update.pdf",
        "document_type": "investor_presentation",
        "filing_date": date(2025, 3, 20),
        "page_count": 32,
        "processing_status": "completed",
    },
    # GreenEnergy docs
    {
        "company_idx": 2,
        "title": "FY2025 Annual Report",
        "file_name": "grne_fy2025_annual_report.pdf",
        "document_type": "annual_report",
        "filing_date": date(2025, 4, 10),
        "page_count": 48,
        "processing_status": "completed",
    },
]

CHUNKS = [
    # Acme Corp – Annual Report chunks
    {
        "doc_idx": 0,
        "company_idx": 0,
        "chunk_index": 0,
        "text": (
            "Acme Corp reported total revenue of $2.4 billion for fiscal year 2025, "
            "representing a 18% year-over-year increase from $2.03 billion in FY2024. "
            "Revenue growth was driven primarily by expansion in the enterprise segment, "
            "which grew 22%, and strong renewals in the SMB segment at 14% growth."
        ),
        "page_number": 5,
        "section": "Revenue Overview",
        "token_count": 72,
    },
    {
        "doc_idx": 0,
        "company_idx": 0,
        "chunk_index": 1,
        "text": (
            "Net income for FY2025 was $384 million, up from $290 million in FY2024, "
            "reflecting improved operating leverage and cost discipline. Operating margin "
            "expanded to 21.5% from 18.2% the prior year. Free cash flow generation was "
            "strong at $512 million, enabling continued investment in R&D and strategic acquisitions."
        ),
        "page_number": 12,
        "section": "Profitability",
        "token_count": 74,
    },
    {
        "doc_idx": 0,
        "company_idx": 0,
        "chunk_index": 2,
        "text": (
            "The company maintains a healthy balance sheet with $1.8 billion in cash and "
            "short-term investments and $600 million in long-term debt. The current ratio "
            "stands at 2.1x, providing ample liquidity for near-term obligations. Management "
            "has authorized a $300 million share repurchase program."
        ),
        "page_number": 18,
        "section": "Balance Sheet",
        "token_count": 68,
    },
    {
        "doc_idx": 0,
        "company_idx": 0,
        "chunk_index": 3,
        "text": (
            "Key risks include increased competition from new entrants in the cloud "
            "collaboration space, potential customer concentration in the technology sector, "
            "and ongoing cybersecurity threats. The company faces regulatory headwinds "
            "related to data privacy in European markets, with GDPR compliance costs "
            "increasing 15% year-over-year."
        ),
        "page_number": 35,
        "section": "Risk Factors",
        "token_count": 69,
    },
    {
        "doc_idx": 0,
        "company_idx": 0,
        "chunk_index": 4,
        "text": (
            "Acme Corp is investing heavily in AI-powered features for its project management "
            "platform. The company expects AI tools to drive 25% uplift in enterprise deals by "
            "FY2026. Additionally, the company is expanding into the APAC market with new "
            "data centers in Singapore and Tokyo planned for Q3 2025."
        ),
        "page_number": 42,
        "section": "Growth Strategy",
        "token_count": 66,
    },
    # Acme Corp – Earnings Call chunks
    {
        "doc_idx": 1,
        "company_idx": 0,
        "chunk_index": 0,
        "text": (
            "CEO Jane Smith noted: 'Q1 2025 was a record quarter with $640 million in revenue, "
            "representing 20% year-over-year growth. Our net revenue retention rate improved to "
            "125%, up from 118% last year, reflecting strong product-market fit and expanding "
            "usage within existing accounts.'"
        ),
        "page_number": 3,
        "section": "CEO Remarks",
        "token_count": 72,
    },
    {
        "doc_idx": 1,
        "company_idx": 0,
        "chunk_index": 1,
        "text": (
            "CFO Mark Johnson stated: 'We added 142 new enterprise customers in Q1, bringing our "
            "total enterprise customer count to 1,850. Average contract value for enterprise deals "
            "increased to $380K, up 15% from the prior quarter. We are raising our full-year "
            "revenue guidance to $2.65-$2.70 billion from the previous $2.55-$2.60 billion range.'"
        ),
        "page_number": 8,
        "section": "Financial Guidance",
        "token_count": 82,
    },
    # Global Pharma – 10-K chunks
    {
        "doc_idx": 2,
        "company_idx": 1,
        "chunk_index": 0,
        "text": (
            "Global Pharma Inc reported total revenues of $48.2 billion for fiscal year 2025, "
            "a 6% increase from $45.5 billion in FY2024. The growth was primarily driven by "
            "strong sales of oncology drugs (+12%) and immunology products (+9%), partially "
            "offset by generic competition for two legacy cardiovascular drugs."
        ),
        "page_number": 8,
        "section": "Revenue Summary",
        "token_count": 72,
    },
    {
        "doc_idx": 2,
        "company_idx": 1,
        "chunk_index": 1,
        "text": (
            "R&D expenses for FY2025 were $9.6 billion (20% of revenue), up from $8.9 billion "
            "in FY2024. The company has 47 molecules in its clinical pipeline, including 12 in "
            "Phase III trials. Patent expirations for two key drugs representing $3.2 billion in "
            "annual revenue are expected in 2027-2028."
        ),
        "page_number": 22,
        "section": "Research & Development",
        "token_count": 73,
    },
    {
        "doc_idx": 2,
        "company_idx": 1,
        "chunk_index": 2,
        "text": (
            "Key risks include patent cliff exposure for blockbuster drugs, increasing regulatory "
            "scrutiny from the FDA, and geopolitical risks related to manufacturing operations in "
            "China and India. The company also faces pricing pressure from government negotiations "
            "under the Inflation Reduction Act."
        ),
        "page_number": 45,
        "section": "Risk Factors",
        "token_count": 62,
    },
    # Global Pharma – Pipeline Update chunks
    {
        "doc_idx": 3,
        "company_idx": 1,
        "chunk_index": 0,
        "text": (
            "The company's Phase III oncology drug GP-4421 showed 34% improvement in "
            "progression-free survival vs. standard of care in lung cancer trials. "
            "FDA breakthrough therapy designation received in January 2025. Expected "
            "filing date is Q4 2025 with potential launch in H1 2026."
        ),
        "page_number": 5,
        "section": "Oncology Pipeline",
        "token_count": 58,
    },
    # GreenEnergy – Annual Report chunks
    {
        "doc_idx": 4,
        "company_idx": 2,
        "chunk_index": 0,
        "text": (
            "GreenEnergy Ltd achieved record revenue of $3.1 billion in FY2025, a 35% increase "
            "from $2.3 billion in FY2024. Solar installations grew 40% to 4.2 GW, while wind "
            "capacity additions totaled 1.8 GW. The battery storage segment contributed $340 "
            "million in revenue, up 120% year-over-year."
        ),
        "page_number": 4,
        "section": "Revenue Overview",
        "token_count": 73,
    },
    {
        "doc_idx": 4,
        "company_idx": 2,
        "chunk_index": 1,
        "text": (
            "Despite strong revenue growth, GreenEnergy reported a net loss of $85 million in "
            "FY2025 compared to net income of $45 million in FY2024. The loss was driven by "
            "heavy investment in battery storage R&D ($280 million), supply chain disruptions "
            "increasing component costs by 18%, and thin margins on utility-scale solar projects."
        ),
        "page_number": 11,
        "section": "Profitability",
        "token_count": 74,
    },
    {
        "doc_idx": 4,
        "company_idx": 2,
        "chunk_index": 2,
        "text": (
            "The company secured $1.2 billion in new government incentives under the Inflation "
            "Reduction Act, significantly improving the economics of domestic manufacturing. "
            "GreenEnergy plans to open two new battery gigafactories in Texas and Arizona by "
            "2027, creating 3,000 jobs and doubling production capacity."
        ),
        "page_number": 28,
        "section": "Government Incentives",
        "token_count": 68,
    },
]

ANALYSES = [
    # Acme Corp – financials
    {
        "company_idx": 0,
        "analysis_type": "financials",
        "content": {
            "company_id": 1,  # placeholder, updated at insert time
            "metrics": [
                {"metric_name": "revenue", "metric_value": 2400, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
                {"metric_name": "revenue", "metric_value": 2030, "fiscal_year": 2024, "currency": "USD", "unit": "millions"},
                {"metric_name": "net_income", "metric_value": 384, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
                {"metric_name": "net_income", "metric_value": 290, "fiscal_year": 2024, "currency": "USD", "unit": "millions"},
                {"metric_name": "operating_margin", "metric_value": 0.215, "fiscal_year": 2025, "currency": None, "unit": "ratio"},
                {"metric_name": "free_cash_flow", "metric_value": 512, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
            ],
            "ratios": [
                {"name": "net_margin", "value": 0.16, "fiscal_year": 2025, "formula": "net_income / revenue"},
                {"name": "current_ratio", "value": 2.1, "fiscal_year": 2025, "formula": "current_assets / current_liabilities"},
                {"name": "debt_to_equity", "value": 0.33, "fiscal_year": 2025, "formula": "total_debt / shareholders_equity"},
            ],
            "revenue_growth": [
                {"year": 2024, "value": 0.14},
                {"year": 2025, "value": 0.18},
            ],
            "cagr": {"revenue": {"value": 0.16, "start_year": 2024, "end_year": 2025}},
            "trends": {
                "revenue": [{"year": 2024, "value": 2030}, {"year": 2025, "value": 2400}],
                "net_income": [{"year": 2024, "value": 290}, {"year": 2025, "value": 384}],
            },
            "insights": [
                "Revenue grew 18.2% year-over-year in FY2025.",
                "Net profit margin: 16.0%.",
                "Current ratio: 2.10.",
                "Revenue CAGR: 16.0% from 2024 to 2025.",
            ],
            "status": "completed",
        },
    },
    # Acme Corp – health
    {
        "company_idx": 0,
        "analysis_type": "health",
        "content": {
            "company_id": 1,
            "overall": "Strong",
            "growth": "Strong — 18% YoY revenue growth with expanding enterprise segment.",
            "profitability": "Improving — operating margin expanded to 21.5%, net margin at 16%.",
            "liquidity": "Strong — current ratio of 2.1x with $1.8B cash on hand.",
            "leverage": "Conservative — debt-to-equity of 0.33x with manageable long-term obligations.",
            "cash_flow": "Excellent — $512M free cash flow supporting R&D and buybacks.",
            "explanation": "Acme Corp demonstrates strong financial health across all key dimensions. Revenue growth outpaces the industry average, profitability margins are expanding, and the balance sheet provides significant flexibility for strategic investments.",
            "scores": {"growth": 8.5, "profitability": 7.8, "liquidity": 8.2, "leverage": 8.0, "cash_flow": 8.5},
            "sources": [],
        },
    },
    # Acme Corp – risks
    {
        "company_idx": 0,
        "analysis_type": "risks",
        "content": {
            "company_id": 1,
            "risks": [
                {
                    "category": "Competition",
                    "title": "Increasing Competitive Pressure",
                    "severity": "MEDIUM",
                    "description": "New entrants in the cloud collaboration space are gaining market share with aggressive pricing strategies.",
                    "evidence": "Market share data shows three new competitors each capturing 2-3% share in the SMB segment over the past 12 months.",
                    "sources": [],
                },
                {
                    "category": "Regulatory",
                    "title": "GDPR Compliance Cost Escalation",
                    "severity": "MEDIUM",
                    "description": "European data privacy regulations are driving up compliance costs, which increased 15% year-over-year.",
                    "evidence": "Compliance costs rose from $18M to $20.7M in FY2025, with further increases expected as new EU AI regulations take effect.",
                    "sources": [],
                },
                {
                    "category": "Customer Concentration",
                    "title": "Technology Sector Customer Concentration",
                    "severity": "LOW",
                    "description": "65% of enterprise revenue is concentrated in the technology sector, creating cyclical exposure.",
                    "evidence": "Technology sector clients represent 1,202 of 1,850 enterprise accounts and 65% of ARR.",
                    "sources": [],
                },
            ],
        },
    },
    # Acme Corp – opportunities
    {
        "company_idx": 0,
        "analysis_type": "opportunities",
        "content": {
            "company_id": 1,
            "opportunities": [
                {
                    "category": "AI/ML",
                    "title": "AI-Powered Product Features",
                    "description": "Integration of AI tools into the platform could drive 25% uplift in enterprise deal sizes.",
                    "evidence": "Management guided for AI-driven features to contribute meaningfully to enterprise revenue growth in FY2026.",
                    "confidence": "High",
                    "sources": [],
                },
                {
                    "category": "Geographic Expansion",
                    "title": "APAC Market Entry",
                    "description": "New data centers in Singapore and Tokyo will enable direct sales expansion into the fast-growing APAC market.",
                    "evidence": "APAC represents a $12B addressable market growing at 28% CAGR, with limited established competition.",
                    "confidence": "Medium",
                    "sources": [],
                },
            ],
        },
    },
    # Acme Corp – summary
    {
        "company_idx": 0,
        "analysis_type": "summary",
        "content": {
            "company_id": 1,
            "executive_summary": (
                "Acme Corp is a rapidly growing enterprise SaaS company with strong financial fundamentals. "
                "FY2025 revenue of $2.4B grew 18% YoY, with operating margins expanding to 21.5%. "
                "The company maintains a fortress balance sheet with $1.8B in cash and generates "
                "substantial free cash flow. Key growth drivers include AI-powered product innovation "
                "and APAC market expansion. Primary risks center on competitive dynamics and regulatory "
                "compliance costs. Overall, Acme Corp presents a compelling investment profile with "
                "strong growth prospects and improving profitability."
            ),
            "key_findings": [
                "Revenue grew 18% YoY to $2.4B with accelerating enterprise segment growth.",
                "Operating margin expanded to 21.5%, demonstrating strong operating leverage.",
                "Net revenue retention rate of 125% indicates excellent customer stickiness.",
                "AI-powered features expected to drive 25% uplift in enterprise deal sizes.",
                "APAC expansion through new Singapore and Tokyo data centers.",
                "Robust balance sheet with $1.8B cash and $512M free cash flow.",
            ],
        },
    },
    # Global Pharma – financials
    {
        "company_idx": 1,
        "analysis_type": "financials",
        "content": {
            "company_id": 2,
            "metrics": [
                {"metric_name": "revenue", "metric_value": 48200, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
                {"metric_name": "revenue", "metric_value": 45500, "fiscal_year": 2024, "currency": "USD", "unit": "millions"},
                {"metric_name": "rd_expenses", "metric_value": 9600, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
                {"metric_name": "rd_expenses", "metric_value": 8900, "fiscal_year": 2024, "currency": "USD", "unit": "millions"},
            ],
            "ratios": [
                {"name": "rd_intensity", "value": 0.20, "fiscal_year": 2025, "formula": "rd_expenses / revenue"},
                {"name": "revenue_growth", "value": 0.06, "fiscal_year": 2025, "formula": "(revenue_current - revenue_prior) / revenue_prior"},
            ],
            "revenue_growth": [{"year": 2025, "value": 0.06}],
            "cagr": {"revenue": {"value": 0.06, "start_year": 2024, "end_year": 2025}},
            "trends": {"revenue": [{"year": 2024, "value": 45500}, {"year": 2025, "value": 48200}]},
            "insights": [
                "Revenue grew 6% YoY driven by oncology (+12%) and immunology (+9%) segments.",
                "R&D intensity at 20% of revenue supports robust pipeline of 47 molecules.",
                "Patent cliff exposure of $3.2B in annual revenue by 2027-2028.",
            ],
            "status": "completed",
        },
    },
    # GreenEnergy – financials
    {
        "company_idx": 2,
        "analysis_type": "financials",
        "content": {
            "company_id": 3,
            "metrics": [
                {"metric_name": "revenue", "metric_value": 3100, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
                {"metric_name": "revenue", "metric_value": 2300, "fiscal_year": 2024, "currency": "USD", "unit": "millions"},
                {"metric_name": "net_income", "metric_value": -85, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
                {"metric_name": "net_income", "metric_value": 45, "fiscal_year": 2024, "currency": "USD", "unit": "millions"},
                {"metric_name": "battery_revenue", "metric_value": 340, "fiscal_year": 2025, "currency": "USD", "unit": "millions"},
            ],
            "ratios": [
                {"name": "revenue_growth", "value": 0.35, "fiscal_year": 2025, "formula": "(revenue_current - revenue_prior) / revenue_prior"},
                {"name": "net_margin", "value": -0.027, "fiscal_year": 2025, "formula": "net_income / revenue"},
            ],
            "revenue_growth": [{"year": 2024, "value": 0.20}, {"year": 2025, "value": 0.35}],
            "cagr": {"revenue": {"value": 0.27, "start_year": 2024, "end_year": 2025}},
            "trends": {
                "revenue": [{"year": 2024, "value": 2300}, {"year": 2025, "value": 3100}],
                "net_income": [{"year": 2024, "value": 45}, {"year": 2025, "value": -85}],
            },
            "insights": [
                "Revenue surged 35% YoY to $3.1B, led by solar installations (+40%).",
                "Company swung to a net loss of $85M due to heavy R&D and supply chain cost increases.",
                "Battery storage segment grew 120% to $340M, emerging as a key growth driver.",
                "$1.2B in IRA incentives will significantly improve future economics.",
            ],
            "status": "completed",
        },
    },
]


FINANCIAL_METRICS = [
    # Acme Corp metrics
    {"company_idx": 0, "metric_name": "revenue", "metric_value": 2400, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 5, "source_section": "Revenue Overview", "source_excerpt": "Total revenue of $2.4 billion for fiscal year 2025.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "revenue", "metric_value": 2030, "currency": "USD", "unit": "millions", "fiscal_year": 2024, "status": "extracted", "source_page": 5, "source_section": "Revenue Overview", "source_excerpt": "$2.03 billion in FY2024.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "net_income", "metric_value": 384, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 12, "source_section": "Profitability", "source_excerpt": "Net income for FY2025 was $384 million.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "net_income", "metric_value": 290, "currency": "USD", "unit": "millions", "fiscal_year": 2024, "status": "extracted", "source_page": 12, "source_section": "Profitability", "source_excerpt": "$290 million in FY2024.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "operating_margin", "metric_value": 0.215, "currency": None, "unit": "ratio", "fiscal_year": 2025, "status": "calculated", "source_page": 12, "source_section": "Profitability", "source_excerpt": "Operating margin expanded to 21.5%.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "free_cash_flow", "metric_value": 512, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 12, "source_section": "Profitability", "source_excerpt": "Free cash flow generation was strong at $512 million.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "cash_and_investments", "metric_value": 1800, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 18, "source_section": "Balance Sheet", "source_excerpt": "$1.8 billion in cash and short-term investments.", "source": "acme_fy2025_annual_report.pdf"},
    {"company_idx": 0, "metric_name": "long_term_debt", "metric_value": 600, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 18, "source_section": "Balance Sheet", "source_excerpt": "$600 million in long-term debt.", "source": "acme_fy2025_annual_report.pdf"},
    # Global Pharma metrics
    {"company_idx": 1, "metric_name": "revenue", "metric_value": 48200, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 8, "source_section": "Revenue Summary", "source_excerpt": "Total revenues of $48.2 billion for fiscal year 2025.", "source": "gphr_10k_2025.pdf"},
    {"company_idx": 1, "metric_name": "revenue", "metric_value": 45500, "currency": "USD", "unit": "millions", "fiscal_year": 2024, "status": "extracted", "source_page": 8, "source_section": "Revenue Summary", "source_excerpt": "$45.5 billion in FY2024.", "source": "gphr_10k_2025.pdf"},
    {"company_idx": 1, "metric_name": "rd_expenses", "metric_value": 9600, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 22, "source_section": "Research & Development", "source_excerpt": "R&D expenses for FY2025 were $9.6 billion.", "source": "gphr_10k_2025.pdf"},
    {"company_idx": 1, "metric_name": "rd_expenses", "metric_value": 8900, "currency": "USD", "unit": "millions", "fiscal_year": 2024, "status": "extracted", "source_page": 22, "source_section": "Research & Development", "source_excerpt": "$8.9 billion in FY2024.", "source": "gphr_10k_2025.pdf"},
    # GreenEnergy metrics
    {"company_idx": 2, "metric_name": "revenue", "metric_value": 3100, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 4, "source_section": "Revenue Overview", "source_excerpt": "Record revenue of $3.1 billion in FY2025.", "source": "grne_fy2025_annual_report.pdf"},
    {"company_idx": 2, "metric_name": "revenue", "metric_value": 2300, "currency": "USD", "unit": "millions", "fiscal_year": 2024, "status": "extracted", "source_page": 4, "source_section": "Revenue Overview", "source_excerpt": "$2.3 billion in FY2024.", "source": "grne_fy2025_annual_report.pdf"},
    {"company_idx": 2, "metric_name": "net_income", "metric_value": -85, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 11, "source_section": "Profitability", "source_excerpt": "Net loss of $85 million in FY2025.", "source": "grne_fy2025_annual_report.pdf"},
    {"company_idx": 2, "metric_name": "net_income", "metric_value": 45, "currency": "USD", "unit": "millions", "fiscal_year": 2024, "status": "extracted", "source_page": 11, "source_section": "Profitability", "source_excerpt": "Net income of $45 million in FY2024.", "source": "grne_fy2025_annual_report.pdf"},
    {"company_idx": 2, "metric_name": "battery_revenue", "metric_value": 340, "currency": "USD", "unit": "millions", "fiscal_year": 2025, "status": "extracted", "source_page": 4, "source_section": "Revenue Overview", "source_excerpt": "Battery storage segment contributed $340 million in revenue.", "source": "grne_fy2025_annual_report.pdf"},
]

CHAT_SESSIONS = [
    {
        "company_idx": 0,
        "title": "Acme Corp: What is the revenue growth trend?",
        "created_offset_hours": -48,
    },
    {
        "company_idx": 1,
        "title": "Global Pharma: What are the key patent risks?",
        "created_offset_hours": -24,
    },
    {
        "company_idx": 2,
        "title": "GreenEnergy: How is the battery storage segment performing?",
        "created_offset_hours": -6,
    },
]

CHAT_MESSAGES = [
    # Session 0
    {"session_idx": 0, "role": "user", "content": "What is the revenue growth trend for Acme Corp over the last two years?", "created_offset_hours": -48},
    {
        "session_idx": 0,
        "role": "assistant",
        "content": (
            "Acme Corp's revenue has shown strong growth over the past two years. "
            "In FY2024, revenue was $2.03 billion, and it grew to $2.4 billion in FY2025, "
            "representing an 18% year-over-year increase. The growth was primarily driven by "
            "the enterprise segment, which grew 22%, and strong SMB renewals at 14% growth."
        ),
        "sources": [
            {"document_id": 1, "document_title": "FY2025 Annual Report", "page_number": 5, "section": "Revenue Overview", "excerpt": "Total revenue of $2.4 billion for fiscal year 2025, representing a 18% year-over-year increase."},
        ],
        "created_offset_hours": -48,
    },
    {"session_idx": 0, "role": "user", "content": "What about the profitability metrics?", "created_offset_hours": -47.5},
    {
        "session_idx": 0,
        "role": "assistant",
        "content": (
            "Acme Corp's profitability improved significantly in FY2025. Net income rose to "
            "$384 million from $290 million in FY2024 (32% increase). Operating margin expanded "
            "to 21.5% from 18.2%, and free cash flow was strong at $512 million."
        ),
        "sources": [
            {"document_id": 1, "document_title": "FY2025 Annual Report", "page_number": 12, "section": "Profitability", "excerpt": "Net income for FY2025 was $384 million, up from $290 million in FY2024."},
        ],
        "created_offset_hours": -47.5,
    },
    # Session 1
    {"session_idx": 1, "role": "user", "content": "What are the key patent risks facing Global Pharma?", "created_offset_hours": -24},
    {
        "session_idx": 1,
        "role": "assistant",
        "content": (
            "Global Pharma faces significant patent cliff exposure. Two key drugs representing "
            "$3.2 billion in annual revenue are expected to lose patent protection in 2027-2028. "
            "The company has 47 molecules in its pipeline with 12 in Phase III trials to address "
            "this, but the near-term revenue impact could be substantial."
        ),
        "sources": [
            {"document_id": 3, "document_title": "FY2025 10-K Filing", "page_number": 22, "section": "Research & Development", "excerpt": "Patent expirations for two key drugs representing $3.2 billion in annual revenue are expected in 2027-2028."},
        ],
        "created_offset_hours": -24,
    },
    # Session 2
    {"session_idx": 2, "role": "user", "content": "How is GreenEnergy's battery storage segment performing?", "created_offset_hours": -6},
    {
        "session_idx": 2,
        "role": "assistant",
        "content": (
            "GreenEnergy's battery storage segment is a standout growth driver. Revenue from "
            "battery storage reached $340 million in FY2025, up 120% year-over-year. The company "
            "is investing $280 million in battery storage R&D and plans to open two new gigafactories "
            "in Texas and Arizona by 2027, which will double production capacity."
        ),
        "sources": [
            {"document_id": 5, "document_title": "FY2025 Annual Report", "page_number": 4, "section": "Revenue Overview", "excerpt": "The battery storage segment contributed $340 million in revenue, up 120% year-over-year."},
        ],
        "created_offset_hours": -6,
    },
]

REPORTS = [
    {
        "company_idx": 0,
        "title": "Due Diligence Report - Acme Corp",
        "report_type": "due_diligence",
        "status": "completed",
        "content": {"summary": "Comprehensive due diligence report for Acme Corp covering financials, risks, and growth opportunities."},
    },
    {
        "company_idx": 1,
        "title": "Due Diligence Report - Global Pharma Inc",
        "report_type": "due_diligence",
        "status": "completed",
        "content": {"summary": "Comprehensive due diligence report for Global Pharma Inc covering financials, patent risks, and pipeline opportunities."},
    },
]


# ─── Seed Function ───────────────────────────────────────────────────────────

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_maker() as db:
        # ── 1. User ──────────────────────────────────────────────────────
        result = await db.execute(
            text("SELECT id FROM users WHERE email = :email"), {"email": USER_EMAIL}
        )
        existing = result.fetchone()
        if existing:
            user_id = existing[0]
            print(f"[OK] User already exists (id={user_id}), skipping creation.")
        else:
            user = User(
                name=USER_NAME,
                email=USER_EMAIL,
                password_hash=hash_password(USER_PASSWORD),
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            user_id = user.id
            print(f"[OK] Created user: {USER_EMAIL} (id={user_id})")

        # ── 2. Companies ─────────────────────────────────────────────────
        company_ids = []
        for comp_data in COMPANIES:
            result = await db.execute(
                text("SELECT id FROM companies WHERE name = :name"), {"name": comp_data["name"]}
            )
            existing = result.fetchone()
            if existing:
                cid = existing[0]
                print(f"  [OK] Company '{comp_data['name']}' exists (id={cid}), skipping.")
            else:
                company = Company(**comp_data, created_by=user_id)
                db.add(company)
                await db.commit()
                await db.refresh(company)
                cid = company.id
                print(f"  [OK] Created company: {comp_data['name']} (id={cid})")
            company_ids.append(cid)

        # ── 3. Documents ─────────────────────────────────────────────────
        doc_ids = []
        for doc_data in DOCUMENTS:
            result = await db.execute(
                text("SELECT id FROM documents WHERE file_name = :fn"), {"fn": doc_data["file_name"]}
            )
            existing = result.fetchone()
            if existing:
                did = existing[0]
                print(f"    [OK] Document '{doc_data['title']}' exists (id={did}), skipping.")
            else:
                company_id = company_ids[doc_data["company_idx"]]
                doc = Document(
                    company_id=company_id,
                    user_id=user_id,
                    title=doc_data["title"],
                    file_name=doc_data["file_name"],
                    file_path=f"data/uploads/{company_id}/{doc_data['file_name']}",
                    document_type=doc_data["document_type"],
                    filing_date=doc_data["filing_date"],
                    page_count=doc_data["page_count"],
                    processing_status=doc_data["processing_status"],
                )
                db.add(doc)
                await db.commit()
                await db.refresh(doc)
                did = doc.id
                print(f"    [OK] Created document: {doc_data['title']} (id={did})")
            doc_ids.append(did)

        # ── 4. Document Chunks ───────────────────────────────────────────
        existing_chunks = await db.execute(text("SELECT COUNT(*) FROM document_chunks"))
        chunk_count = existing_chunks.scalar()
        if chunk_count > 0:
            print(f"  [OK] Document chunks already exist ({chunk_count} chunks), skipping.")
        else:
            for chunk_data in CHUNKS:
                chunk = DocumentChunk(
                    document_id=doc_ids[chunk_data["doc_idx"]],
                    company_id=company_ids[chunk_data["company_idx"]],
                    chunk_index=chunk_data["chunk_index"],
                    text=chunk_data["text"],
                    page_number=chunk_data["page_number"],
                    section=chunk_data["section"],
                    token_count=chunk_data["token_count"],
                    vector_id=None,  # Would normally be set by vector store
                )
                db.add(chunk)
            await db.commit()
            print(f"  [OK] Created {len(CHUNKS)} document chunks.")

        # ── 5. Analyses ──────────────────────────────────────────────────
        # Check if we already have all expected analyses (7 total for 3 companies)
        result = await db.execute(text("SELECT COUNT(*) FROM analyses"))
        existing_count = result.scalar()
        if existing_count >= len(ANALYSES):
            print(f"  [OK] Analyses already exist ({existing_count} records), skipping.")
        else:
            # Clear stale/incomplete analyses and re-seed
            await db.execute(text("DELETE FROM analyses"))
            await db.commit()
            for analysis_data in ANALYSES:
                content = analysis_data["content"].copy()
                content["company_id"] = company_ids[analysis_data["company_idx"]]
                analysis = Analysis(
                    company_id=company_ids[analysis_data["company_idx"]],
                    user_id=user_id,
                    analysis_type=analysis_data["analysis_type"],
                    status="completed",
                    content=content,
                )
                db.add(analysis)
            await db.commit()
            print(f"  [OK] Created {len(ANALYSES)} analyses.")

        # ── 6. Financial Metrics ─────────────────────────────────────────
        existing_metrics = await db.execute(text("SELECT COUNT(*) FROM financial_metrics"))
        metric_count = existing_metrics.scalar()
        if metric_count > 0:
            print(f"  [OK] Financial metrics already exist ({metric_count} records), skipping.")
        else:
            for metric_data in FINANCIAL_METRICS:
                metric = FinancialMetric(
                    company_id=company_ids[metric_data["company_idx"]],
                    document_id=None,
                    metric_name=metric_data["metric_name"],
                    metric_value=metric_data["metric_value"],
                    currency=metric_data["currency"],
                    unit=metric_data["unit"],
                    fiscal_year=metric_data["fiscal_year"],
                    status=metric_data["status"],
                    source_page=metric_data["source_page"],
                    source_section=metric_data["source_section"],
                    source_excerpt=metric_data["source_excerpt"],
                    source=metric_data["source"],
                )
                db.add(metric)
            await db.commit()
            print(f"  [OK] Created {len(FINANCIAL_METRICS)} financial metrics.")

        # ── 7. Chat Sessions & Messages ──────────────────────────────────
        result = await db.execute(text("SELECT COUNT(*) FROM chat_sessions"))
        existing_session_count = result.scalar()
        if existing_session_count >= len(CHAT_SESSIONS):
            print(f"  [OK] Chat sessions already exist ({existing_session_count} records), skipping.")
        else:
            # Clear stale sessions (messages cascade-delete)
            await db.execute(text("DELETE FROM chat_messages"))
            await db.execute(text("DELETE FROM chat_sessions"))
            await db.commit()
            now = datetime.utcnow()
            session_ids = []
            for sess_data in CHAT_SESSIONS:
                session = ChatSession(
                    user_id=user_id,
                    company_id=company_ids[sess_data["company_idx"]],
                    title=sess_data["title"],
                    created_at=now + timedelta(hours=sess_data["created_offset_hours"]),
                    updated_at=now + timedelta(hours=sess_data["created_offset_hours"]),
                )
                db.add(session)
                await db.commit()
                await db.refresh(session)
                session_ids.append(session.id)
                print(f"    [OK] Created chat session: {sess_data['title'][:50]}... (id={session.id})")

            for msg_data in CHAT_MESSAGES:
                msg = ChatMessage(
                    session_id=session_ids[msg_data["session_idx"]],
                    role=msg_data["role"],
                    content=msg_data["content"],
                    sources=msg_data.get("sources"),
                    created_at=now + timedelta(hours=msg_data["created_offset_hours"]),
                )
                db.add(msg)
            await db.commit()
            print(f"  [OK] Created {len(CHAT_MESSAGES)} chat messages across {len(session_ids)} sessions.")

        # ── 8. Reports ───────────────────────────────────────────────────
        existing_reports = await db.execute(text("SELECT COUNT(*) FROM reports"))
        report_count = existing_reports.scalar()
        if report_count > 0:
            print(f"  [OK] Reports already exist ({report_count} records), skipping.")
        else:
            for report_data in REPORTS:
                report = Report(
                    company_id=company_ids[report_data["company_idx"]],
                    user_id=user_id,
                    title=report_data["title"],
                    report_type=report_data["report_type"],
                    status=report_data["status"],
                    content=report_data["content"],
                )
                db.add(report)
            await db.commit()
            print(f"  [OK] Created {len(REPORTS)} reports.")

        print("\n=== Seed complete! ===")
        print(f"   Login credentials: {USER_EMAIL} / {USER_PASSWORD}")
        print(f"   Companies: {', '.join(comp['name'] for comp in COMPANIES)}")


if __name__ == "__main__":
    asyncio.run(seed())
