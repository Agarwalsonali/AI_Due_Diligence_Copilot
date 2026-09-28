"""Due diligence report generation.

Builds a company report from real analysis pipeline output:
- Executive summary via RAG + LLM
- Financial metrics + ratios + trends from stored/extracted data
- Risk analysis with per-risk citations
- Growth opportunities with per-item citations
- Source list from retrieved evidence

Renders sections into a paginated fpdf2 PDF. Each LLM section degrades
gracefully: if the AI provider is unavailable/quota-blocked the section
says so explicitly instead of showing empty placeholder text.
"""
import os
import re
import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.models import Report, Company, Document
from app.rag.hybrid_retriever import HybridRetriever
from app.rag.vector_store import get_vector_store
from app.rag.embeddings import get_embedding_service
from app.rag.reranker import get_reranker
from app.rag.generator import get_llm_generator
from app.rag.context import build_source_list
from app.financial.extraction import extract_financial_metrics, get_stored_metrics
from app.financial.ratios import calculate_all_ratios, build_metrics_by_year
from app.financial.trends import analyze_trends
from app.analysis.summary import generate_executive_summary
from app.analysis.risk import analyze_risks
from app.analysis.opportunities import analyze_opportunities
from app.core.logging import get_logger

logger = get_logger("report_service")

# Markers the LLM providers emit when unavailable (quota / auth / outage).
_LLM_UNAVAILABLE_MARKERS = (
    "usage limit reached",
    "configuration error",
    "temporarily unavailable",
    "error occurred while generating",
)


def _llm_unavailable(answer: str) -> bool:
    """Detect the graceful-fallback answers emitted by LLM providers."""
    lowered = (answer or "").lower()
    return any(marker in lowered for marker in _LLM_UNAVAILABLE_MARKERS)


# ─── PDF helpers ──────────────────────────────────────────────────────────────

class PDFReport:
    """fpdf2 wrapper with section headings, body text, bullets and tables.

    All incoming text passes through _clean() so fpdf2's latin-1 core
    fonts never hit unencodable characters.
    """

    def __init__(self, title: str, subtitle: str = ""):
        from fpdf import FPDF

        class _PDF(FPDF):
            def header(self):
                if self.page_no() == 1:
                    return
                self.set_font("Arial", "B", 9)
                self.set_text_color(120, 120, 120)
                self.cell(0, 8, title, 0, 1, "C")
                self.ln(2)

            def footer(self):
                self.set_y(-15)
                self.set_font("Arial", "I", 8)
                self.set_text_color(120, 120, 120)
                self.cell(0, 10, f"Page {self.page_no()}", 0, 0, "C")

        self.pdf = _PDF()
        self.pdf.set_margins(20, 20, 20)
        self.pdf.set_auto_page_break(auto=True, margin=25)
        self.pdf.add_page()
        self.pdf.set_text_color(30, 30, 30)

        self.pdf.set_font("Arial", "B", 20)
        self.pdf.cell(0, 12, title, 0, 1, "C")
        if subtitle:
            self.pdf.set_font("Arial", "", 12)
            self.pdf.set_text_color(90, 90, 90)
            self.pdf.cell(0, 8, subtitle, 0, 1, "C")
            self.pdf.set_text_color(30, 30, 30)
        self.pdf.ln(4)

    def section(self, name: str):
        """Start a new numbered-style section with a rule underneath."""
        name = _clean(name)
        self.pdf.ln(2)
        # Start a fresh page if less than ~45mm remains (headings + a few lines)
        if self.pdf.get_y() > self.pdf.page_break_trigger - 45:
            self.pdf.add_page()
        self.pdf.set_font("Arial", "B", 14)
        self.pdf.set_draw_color(60, 60, 60)
        self.pdf.cell(0, 9, name, 0, 1)
        self.pdf.line(20, self.pdf.get_y(), 190, self.pdf.get_y())
        self.pdf.ln(3)

    def subheading(self, text: str):
        self.pdf.set_font("Arial", "B", 11)
        self.pdf.set_text_color(60, 60, 60)
        self.pdf.multi_cell(0, 6, _clean(text))
        self.pdf.set_text_color(30, 30, 30)
        self.pdf.ln(1)

    def body(self, text: str):
        self.pdf.set_font("Arial", "", 10)
        self.pdf.multi_cell(0, 5, _clean(text))
        self.pdf.ln(2)

    def bullets(self, items: List[str], limit: int = 10):
        self.pdf.set_font("Arial", "", 10)
        for item in items[:limit]:
            self.pdf.set_x(24)
            self.pdf.multi_cell(162, 5, _clean(f"•  {item}"))
            self.pdf.ln(1)
        self.pdf.ln(1)

    def kv_table(self, rows: List[Dict[str, Any]], limit: int = 12):
        """Render metric rows: Metric | Year | Value | Status."""
        self.pdf.set_font("Arial", "", 9)
        self.pdf.set_fill_color(240, 240, 240)
        self.pdf.cell(70, 7, "Metric", 1, 0, "L", fill=True)
        self.pdf.cell(22, 7, "Year", 1, 0, "C", fill=True)
        self.pdf.cell(58, 7, "Value", 1, 0, "R", fill=True)
        self.pdf.cell(40, 7, "Status", 1, 1, "L", fill=True)
        for row in rows[:limit]:
            self.pdf.cell(70, 7, _clean(_trunc(str(row.get("metric", "")), 40)), 1, 0, "L")
            self.pdf.cell(22, 7, _clean(str(row.get("year", "-"))), 1, 0, "C")
            self.pdf.cell(58, 7, _clean(str(row.get("value", "-"))), 1, 0, "R")
            self.pdf.cell(40, 7, _clean(str(row.get("status", "-"))), 1, 1, "L")
        self.pdf.ln(2)

    def citations(self, sources: List[Dict[str, Any]], limit: int = 15):
        """Render numbered source citations."""
        self.pdf.set_font("Arial", "", 9)
        if not sources:
            self.pdf.multi_cell(0, 5, "No citations were attached to this analysis.")
            return
        for i, src in enumerate(sources, 1):
            title = src.get("document_title") or "Unknown document"
            page = src.get("page_number")
            page_part = f", p. {page}" if page else ""
            excerpt = (src.get("excerpt") or "").strip().replace("\n", " ")
            self.pdf.multi_cell(
                0, 5,
                _clean(f"[{i}] {title}{page_part} — {_trunc(excerpt, 220)}"),
            )
            self.pdf.ln(1)

    def note(self, text: str):
        """Italic note line."""
        self.pdf.set_font("Arial", "I", 9)
        self.pdf.set_text_color(110, 110, 110)
        self.pdf.multi_cell(0, 5, _clean(text))
        self.pdf.set_text_color(30, 30, 30)
        self.pdf.ln(2)

    def save(self, directory: str = "data/reports") -> str:
        os.makedirs(directory, exist_ok=True)
        file_path = os.path.join(directory, f"report_{int(datetime.now().timestamp())}.pdf")
        self.pdf.output(file_path)
        return file_path


def _trunc(s: str, n: int) -> str:
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def _strip_markdown(text: str) -> str:
    """Convert common markdown to PDF-friendly plain text."""
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)      # headings
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.DOTALL)    # bold
    text = re.sub(r"\*(.+?)\*", r"\1", text, flags=re.DOTALL)        # italic
    text = re.sub(r"`(.+?)`", r"\1", text, flags=re.DOTALL)          # code
    text = re.sub(r"^\s*[-*•]\s+", "• ", text, flags=re.MULTILINE)   # bullets
    text = re.sub(r"^\s*---+\s*$", "", text, flags=re.MULTILINE)     # rules
    return text


def _dedupe_key_findings(text: str) -> str:
    """Remove 'Key Findings' blocks from summary text when rendered separately."""
    lines = text.split("\n")
    out = []
    i = 0
    while i < len(lines):
        stripped = lines[i].strip()
        if stripped.lower().rstrip(":").startswith("key findings"):
            # Skip the heading and its bullet/blank lines
            j = i + 1
            while j < len(lines) and (
                not lines[j].strip()
                or lines[j].strip().startswith(("•", "-", "*"))
            ):
                j += 1
            i = j
            continue
        out.append(lines[i])
        i += 1
    return "\n".join(out).strip()


def _clean(text: Any) -> str:
    """Sanitize text for fpdf2 latin-1 core fonts."""
    if text is None:
        return ""
    text = str(text)
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\u2026", "...").replace("\u00a0", " ")
    text = text.replace("•", "-")
    return text.encode("latin-1", "replace").decode("latin-1")


def _fmt_money(value: Optional[float], currency: str = "USD") -> str:
    if value is None:
        return "-"
    sign = "-" if value < 0 else ""
    v = abs(value)
    for threshold, suffix in ((1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")):
        if v >= threshold:
            return f"{sign}{currency} {v / threshold:,.1f}{suffix}"
    return f"{sign}{currency} {v:,.2f}"


def _extract_bullet_lines(markdown_text: str) -> List[str]:
    lines = []
    for line in (markdown_text or "").split("\n"):
        s = line.strip()
        if s.startswith(("- ", "* ", "• ")):
            lines.append(_strip_markdown(s.lstrip("-*• ").strip()))
    return lines


# ─── Evidence retrieval ───────────────────────────────────────────────────────

async def _get_context(company_id: int, query: str, db: AsyncSession) -> List[Dict[str, Any]]:
    """Retrieve + rerank chunks for a query; returns [] on any error."""
    try:
        retriever = HybridRetriever(get_vector_store(), get_embedding_service())
        chunks = await retriever.retrieve(query=query, db=db, company_id=company_id)
        return get_reranker().rerank(query, chunks)
    except Exception as e:
        logger.error("report_retrieval_error", company_id=company_id, error=str(e))
        return []


# ─── Report generation ────────────────────────────────────────────────────────

async def generate_report(company_id: int, user_id: int, db: AsyncSession) -> Report:
    from fpdf import FPDF  # noqa: F401  (import check kept from original service)

    company = await db.get(Company, company_id)
    company_name = company.name if company else "Unknown Company"

    generator = get_llm_generator()

    # ── 1. Retrieve evidence once and reuse it across sections ──
    summary_chunks = await _get_context(
        company_id,
        "Company overview, business model, financial performance, strengths, risks, opportunities, management outlook, market position",
        db,
    )
    risk_chunks = await _get_context(
        company_id,
        "Company risks, financial risks, operational risks, market risks, regulatory risks, competitive risks, supply chain risks, technology risks, legal risks",
        db,
    )
    opportunity_chunks = await _get_context(
        company_id,
        "Growth opportunities, market expansion, new products, strategic partnerships, AI, cloud, data center, international expansion, acquisitions",
        db,
    )
    financial_chunks = await _get_context(
        company_id,
        "Financial statements, revenue, net income, profit margin, assets, liabilities, debt, cash flow, earnings per share, operating income",
        db,
    )

    # ── 2. Run the real analyses (LLM sections degrade gracefully) ──
    summary_task = generate_executive_summary(company_id, summary_chunks, generator)
    risk_task = analyze_risks(company_id, risk_chunks, generator)
    opp_task = analyze_opportunities(company_id, opportunity_chunks, generator)
    summary, risks, opportunities = await asyncio.gather(summary_task, risk_task, opp_task)

    stored = await get_stored_metrics(company_id, db)
    if not stored and financial_chunks:
        metrics_extracted = await extract_financial_metrics(financial_chunks, company_id, db)
        logger.info(
            "report_metrics_extracted",
            company_id=company_id,
            metric_count=len(metrics_extracted),
        )
        stored = await get_stored_metrics(company_id, db)

    by_year = build_metrics_by_year(stored)
    ratio_results = calculate_all_ratios(by_year)
    trends = analyze_trends(stored)

    sources = build_source_list(summary_chunks, max_sources=12)
    if not sources:
        sources = build_source_list(risk_chunks, max_sources=12)
    if not sources:
        sources = build_source_list(opportunity_chunks, max_sources=12)

    summary_text = _strip_markdown(summary.get("executive_summary", "") or "")
    key_findings = summary.get("key_findings", []) or []
    if key_findings:
        summary_text = _dedupe_key_findings(summary_text)
    llm_ok = not _llm_unavailable(summary.get("executive_summary", "") or "")

    # ── 3. Render the PDF ──
    pdf = PDFReport(
        title=f"Due Diligence Report - {company_name}",
        subtitle=f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M UTC')} | AI Due Diligence Copilot",
    )

    # Executive Summary
    pdf.section("Executive Summary")
    if summary_text and not _llm_unavailable(summary_text):
        if key_findings:
            pdf.subheading("Key Findings")
            pdf.bullets(key_findings)
        pdf.body(summary_text)
    else:
        pdf.note(
            "AI summary could not be generated (usage limit reached or service unavailable). "
            "Regenerate this report later, or use the Analysis tab for individual results."
        )

    # Financial Performance
    pdf.section("Financial Performance")
    if stored:
        rows = []
        for m in stored:
            if m.get("status") in ("extracted", "calculated") and m.get("metric_value") is not None:
                rows.append({
                    "metric": m.get("metric_name", "").replace("_", " ").title(),
                    "year": m.get("fiscal_year") or "-",
                    "value": _fmt_money(m.get("metric_value"), m.get("currency") or "USD"),
                    "status": m.get("status", ""),
                })
        rows.sort(key=lambda r: (str(r["year"]), str(r["metric"])))
        pdf.kv_table(rows)

        for metric_name, t in trends.items():
            if metric_name == "revenue" and t.get("direction") and t["direction"] != "unknown":
                cagr = t.get("cagr")
                cagr_part = f", CAGR {cagr * 100:.1f}%" if cagr else ""
                pdf.body(f"Revenue trend: {t['direction']}{cagr_part}.")
                break

        if ratio_results.get("revenue_growth"):
            latest = ratio_results["revenue_growth"][-1]
            pct = round(latest.get("value", 0) * 100, 1)
            direction = "grew" if pct >= 0 else "declined"
            pdf.body(f"Revenue {direction} {abs(pct)}% year-over-year in {latest.get('fiscal_year')}.")

        for ratio in ratio_results.get("ratios", []):
            if ratio.get("value") is None:
                continue
            label = ratio.get("name", "").replace("_", " ").title()
            year = ratio.get("fiscal_year", "")
            value = ratio["value"]
            if "margin" in ratio.get("name", "") or "growth" in ratio.get("name", ""):
                pdf.body(f"{label} ({year}): {value * 100:.1f}%")
            else:
                pdf.body(f"{label} ({year}): {value:.2f}")
    else:
        pdf.note(
            "No financial metrics could be extracted from the available documents."
            + ("" if summary_chunks else " No document evidence was retrievable for this company.")
        )

    # Key Risks
    pdf.section("Key Risks")
    if risks:
        for i, risk in enumerate(risks, 1):
            pdf.subheading(f"{i}. {_clean(risk.get('title', 'Risk'))} [{_clean(risk.get('category', ''))} / {_clean(risk.get('severity', ''))}]")
            pdf.body(_clean(risk.get("description", "")))
            if risk.get("evidence"):
                pdf.note(f"Evidence: {_clean(risk.get('evidence', ''))}")
            refs = risk.get("sources") or []
            if refs:
                ref_str = ", ".join(
                    f"{s.get('document_title', 'Unknown')} p.{s.get('page_number', '?')}" for s in refs
                )
                pdf.note(f"Sources: {_clean(ref_str)}")
    else:
        reason = "No risks were identified in the available documents."
        if not llm_ok:
            reason = "AI risk analysis could not run (usage limit reached or service unavailable)."
        elif not risk_chunks:
            reason = "No document evidence was retrievable for risk analysis."
        pdf.note(reason)

    # Growth Opportunities
    pdf.section("Growth Opportunities")
    if opportunities:
        for i, opp in enumerate(opportunities, 1):
            confidence = opp.get("confidence", "")
            conf_part = f" (confidence {confidence}%)" if confidence else ""
            pdf.subheading(f"{i}. {_clean(opp.get('title', 'Opportunity'))} [{_clean(opp.get('category', ''))}]{conf_part}")
            pdf.body(_clean(opp.get("description", "")))
            if opp.get("evidence"):
                pdf.note(f"Evidence: {_clean(opp.get('evidence', ''))}")
            refs = opp.get("sources") or []
            if refs:
                ref_str = ", ".join(
                    f"{s.get('document_title', 'Unknown')} p.{s.get('page_number', '?')}" for s in refs
                )
                pdf.note(f"Sources: {_clean(ref_str)}")
    else:
        reason = "No growth opportunities were identified in the available documents."
        if not llm_ok:
            reason = "AI opportunity analysis could not run (usage limit reached or service unavailable)."
        elif not opportunity_chunks:
            reason = "No document evidence was retrievable for opportunity analysis."
        pdf.note(reason)

    # Sources and Citations
    pdf.section("Sources and Citations")
    if sources:
        pdf.citations(sources)
    else:
        pdf.note("No source citations available for this report.")

    file_path = pdf.save()
    logger.info("report_saved", company_id=company_id, file_path=file_path)

    report = Report(
        company_id=company_id,
        user_id=user_id,
        title=f"Due Diligence Report - {company_name}",
        report_type="due_diligence",
        file_path=file_path,
        status="completed",
        content={
            "summary": "Report generated successfully.",
            "llm_available": llm_ok,
            "risk_count": len(risks),
            "opportunity_count": len(opportunities),
            "metric_count": len(stored),
            "source_count": len(sources),
        },
    )

    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report
