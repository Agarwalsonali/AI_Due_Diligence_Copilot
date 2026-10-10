"""Unit tests for report generation helpers.

Tests cover:
- Markdown stripping for PDF output
- Latin-1 sanitization for fpdf2 core fonts
- Money formatting
- LLM-unavailable detection (quota / outage fallbacks)
- PDF rendering smoke tests (real fpdf2 output)
- Full report generation with mocked retrieval + LLM

Run with: python -m pytest tests/test_report.py -v
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ─── Text helpers ─────────────────────────────────────────────────────────────

class TestStripMarkdown:
    def test_strips_headings(self):
        from app.services.report_service import _strip_markdown
        assert _strip_markdown("## Company Overview") == "Company Overview"
        assert _strip_markdown("# Title") == "Title"
        assert _strip_markdown("### Deep") == "Deep"

    def test_strips_bold_and_italic(self):
        from app.services.report_service import _strip_markdown
        assert _strip_markdown("**important** point") == "important point"
        assert _strip_markdown("*soft* guidance") == "soft guidance"

    def test_strips_inline_code(self):
        from app.services.report_service import _strip_markdown
        assert _strip_markdown("run `npm start` now") == "run npm start now"

    def test_normalizes_bullets(self):
        from app.services.report_service import _strip_markdown
        assert _strip_markdown("- item one") == "• item one"
        assert _strip_markdown("* item two") == "• item two"

    def test_plain_text_unchanged(self):
        from app.services.report_service import _strip_markdown
        assert _strip_markdown("Revenue grew 6% in fiscal 2025.") == "Revenue grew 6% in fiscal 2025."


class TestClean:
    def test_curly_quotes(self):
        from app.services.report_service import _clean
        assert _clean("it\u2019s") == "it's"
        assert _clean("\u201cquoted\u201d") == '"quoted"'

    def test_dashes_and_ellipsis(self):
        from app.services.report_service import _clean
        assert _clean("a\u2014b\u2013c\u2026") == "a-b-c..."

    def test_non_latin1_replaced_not_raising(self):
        from app.services.report_service import _clean
        # Chinese char has no latin-1 mapping — must not raise
        assert _clean("苹果 Apple") == "?? Apple"

    def test_bullet_replaced(self):
        from app.services.report_service import _clean
        assert _clean("• point") == "- point"

    def test_none_safe(self):
        from app.services.report_service import _clean
        assert _clean(None) == ""


class TestFmtMoney:
    def test_billions(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(416_161_000_000) == "USD 416.2B"

    def test_millions(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(93_400_000) == "USD 93.4M"

    def test_thousands(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(12_345) == "USD 12.3K"

    def test_small_value(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(1.25) == "USD 1.25"

    def test_negative(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(-1_500_000_000) == "-USD 1.5B"

    def test_none(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(None) == "-"

    def test_custom_currency(self):
        from app.services.report_service import _fmt_money
        assert _fmt_money(2_000_000, "EUR") == "EUR 2.0M"


class TestLLMUnavailable:
    def test_quota_message_detected(self):
        from app.services.report_service import _llm_unavailable
        assert _llm_unavailable("AI usage limit reached temporarily. Please wait and try again later.")

    def test_auth_message_detected(self):
        from app.services.report_service import _llm_unavailable
        assert _llm_unavailable("AI service configuration error. Please check the configured Gemini API key.")

    def test_outage_message_detected(self):
        from app.services.report_service import _llm_unavailable
        assert _llm_unavailable("AI service temporarily unavailable. Please try again later.")

    def test_real_answer_not_flagged(self):
        from app.services.report_service import _llm_unavailable
        assert not _llm_unavailable("Apple reported revenue of USD 416.2B [source_1].")

    def test_empty_not_flagged(self):
        from app.services.report_service import _llm_unavailable
        assert not _llm_unavailable("")
        assert not _llm_unavailable(None)


class TestDedupeKeyFindings:
    def test_removes_findings_block(self):
        from app.services.report_service import _dedupe_key_findings
        text = "Key Findings\n- finding one\n- finding two\n\n## Company Overview\nApple makes phones."
        result = _dedupe_key_findings(text)
        assert "finding one" not in result
        assert "Apple makes phones." in result

    def test_keeps_body_without_block(self):
        from app.services.report_service import _dedupe_key_findings
        text = "Summary body only, no findings heading."
        assert _dedupe_key_findings(text) == text


class TestExtractBulletLines:
    def test_extract_bullets(self):
        from app.services.report_service import _extract_bullet_lines
        text = "Intro line\n- finding one\n* finding two\n• finding three\n## Section"
        assert _extract_bullet_lines(text) == ["finding one", "finding two", "finding three"]

    def test_no_bullets(self):
        from app.services.report_service import _extract_bullet_lines
        assert _extract_bullet_lines("plain text only") == []


# ─── PDF rendering smoke tests ────────────────────────────────────────────────

class TestPDFReport:
    def _build(self):
        from app.services.report_service import PDFReport
        return PDFReport("Due Diligence Report - Test Co", subtitle="Generated for testing")

    def test_renders_body_text(self):
        pdf = self._build()
        pdf.section("Executive Summary")
        pdf.body("Apple reported revenue of USD 416.2B in fiscal 2025.")
        data = pdf.to_bytes()
        assert data[:5] == b"%PDF-"
        assert len(data) > 1000

    def test_renders_table_and_bullets(self):
        pdf = self._build()
        pdf.section("Financial Performance")
        pdf.kv_table([
            {"metric": "Revenue", "year": "2025", "value": "USD 416.2B", "status": "extracted"},
            {"metric": "Net Income", "year": "2025", "value": "USD 100.4B", "status": "extracted"},
        ])
        pdf.bullets(["Strong margins", "Services growth"])
        data = pdf.to_bytes()
        assert data[:5] == b"%PDF-"

    def test_renders_citations(self):
        pdf = self._build()
        pdf.section("Sources and Citations")
        pdf.citations([
            {"document_title": "Apple 2025 Annual Report", "page_number": 37, "excerpt": "Total net sales of $416,161 million."},
            {"document_title": "Apple 2025 Annual Report", "page_number": 24, "excerpt": "Risk factors include supply chain dependency."},
        ])
        assert pdf.to_bytes()[:5] == b"%PDF-"

    def test_renders_empty_citations_note(self):
        pdf = self._build()
        pdf.section("Sources and Citations")
        pdf.citations([])
        assert pdf.to_bytes()[:5] == b"%PDF-"

    def test_special_characters_do_not_crash(self):
        pdf = self._build()
        pdf.section("Key Risks")
        pdf.body("Supply chain exposure to \u201cAsia-Pacific\u201d — 苹果 — caf\u00e9 naïve")
        assert pdf.to_bytes()[:5] == b"%PDF-"

    def test_long_content_paginates(self):
        pdf = self._build()
        pdf.section("Financial Performance")
        for i in range(60):
            pdf.body(f"Paragraph {i}: " + "financial performance detail. " * 20)
        assert pdf.to_bytes()[:5] == b"%PDF-"

    def test_long_title_wraps_not_clips(self):
        # Regression: long titles rendered with cell() were clipped mid-word
        # at both page edges ("...parative Due Diligence Report - ... Corpora...").
        import re
        import zlib
        from app.services.report_service import PDFReport
        long_title = "Comparative Due Diligence Report - Apple Inc. vs Microsoft Corporation"
        pdf = PDFReport(long_title, subtitle="Generated 2026 test | AI Due Diligence Copilot")
        data = pdf.to_bytes()
        assert data[:5] == b"%PDF-"
        assert len(data) > 1000
        # Title text must be fully present in the PDF content (no clipping).
        # fpdf2 compresses content streams, so decompress them first.
        raw = b""
        for m in re.finditer(rb"stream\r?\n(.*?)endstream", data, re.DOTALL):
            try:
                raw += zlib.decompress(m.group(1))
            except Exception:
                raw += m.group(1)
        texts = "".join(m.decode("latin-1") for m in re.findall(rb"\(([^)]*)\)", raw))
        for fragment in ("Comparative", "Diligence", "Corporation"):
            assert fragment in texts, fragment


# ─── Full report generation (mocked pipeline) ─────────────────────────────────

def _make_chunk(text, doc_id=44, page=1, section="General", score=0.8):
    return {
        "payload": {
            "text": text,
            "company_id": 9,
            "document_id": doc_id,
            "document_title": "Apple 2025 Annual Report",
            "page_number": page,
            "section": section,
            "chunk_index": 0,
            "vector_id": f"vec-{doc_id}-{page}",
        },
        "score": score,
        "retrieval_method": "vector",
    }


class TestGenerateReport:
    """Full pipeline test with retrieval and LLM mocked out."""

    @pytest.fixture
    def mock_analysis_stack(self):
        chunks = [_make_chunk("Apple total net sales were $416,161 million in fiscal 2025.", page=37)]
        summary = {
            "executive_summary": "Apple reported **strong performance** in fiscal 2025 [source_1].",
            "key_findings": ["Revenue of USD 416.2B", "Services segment growing"],
            "sections": {"Company Overview": "Apple designs consumer hardware."},
            "sources": [],
        }
        risks = [{
            "category": "Supply Chain",
            "title": "Concentration risk",
            "severity": "HIGH",
            "description": "Heavy supplier concentration.",
            "evidence": "The company depends on a limited number of suppliers.",
            "sources": [],
        }]
        opportunities = [{
            "category": "AI",
            "title": "AI features",
            "description": "Expansion of on-device AI capabilities.",
            "evidence": "Apple Intelligence rollout.",
            "confidence": "75.0",
            "sources": [],
        }]
        stored_metrics = [{
            "id": 1, "company_id": 9, "document_id": 44,
            "metric_name": "revenue", "metric_value": 416_161_000_000.0,
            "currency": "USD", "unit": None, "fiscal_year": 2025,
            "status": "extracted", "source_page": 37, "source_section": None,
            "source_excerpt": "Total net sales $416,161 million.", "source": "Page 37",
        }]
        return chunks, summary, risks, opportunities, stored_metrics

    async def _run(self, mock_analysis_stack, extra=None):
        from app.services import report_service
        chunks, summary, risks, opportunities, stored = mock_analysis_stack
        summary = dict(summary)
        if extra:
            summary["executive_summary"] = extra

        company = MagicMock()
        company.name = "Apple Inc."
        db = AsyncMock()
        db.get = AsyncMock(side_effect=lambda model, pk: company if model.__name__ == "Company" else None)
        db.add = MagicMock()
        db.commit = AsyncMock()
        captured = {}

        async def refresh(obj):
            obj.id = 77
        db.refresh = refresh

        def capture_add(report_obj):
            captured["report"] = report_obj
        db.add = capture_add

        with patch.object(report_service, "_get_context", new=AsyncMock(return_value=chunks)), \
             patch.object(report_service, "generate_executive_summary", new=AsyncMock(return_value=summary)), \
             patch.object(report_service, "analyze_risks", new=AsyncMock(return_value=risks)), \
             patch.object(report_service, "analyze_opportunities", new=AsyncMock(return_value=opportunities)), \
             patch.object(report_service, "get_stored_metrics", new=AsyncMock(return_value=stored)), \
             patch.object(report_service, "extract_financial_metrics", new=AsyncMock(return_value=[])) as mock_extract, \
             patch.object(report_service, "get_llm_generator", new=MagicMock(return_value=MagicMock())):

            report = await report_service.generate_report(9, 1, db)
        return report, captured, mock_extract

    @pytest.mark.asyncio
    async def test_generates_real_pdf(self, mock_analysis_stack):
        report, captured, _ = await self._run(mock_analysis_stack)
        assert report.status == "completed"
        # PDF is stored as bytes in the DB, not written to disk
        assert report.file_data[:5] == b"%PDF-"  # valid PDF
        assert len(report.file_data) > 1000
        assert captured["report"].content["risk_count"] == 1
        assert captured["report"].content["opportunity_count"] == 1
        assert captured["report"].content["metric_count"] == 1
        assert captured["report"].content["llm_available"] is True

    @pytest.mark.asyncio
    async def test_quota_blocked_report_still_generated(self, mock_analysis_stack):
        # LLM unavailable → report still renders with degradation notes
        report, captured, _ = await self._run(
            mock_analysis_stack,
            extra="AI usage limit reached temporarily. Please wait and try again later.",
        )
        assert report.status == "completed"
        assert report.file_data[:5] == b"%PDF-"
        assert captured["report"].content["llm_available"] is False

    @pytest.mark.asyncio
    async def test_metrics_not_reextracted_when_already_stored(self, mock_analysis_stack):
        _, _, mock_extract = await self._run(mock_analysis_stack)
        mock_extract.assert_not_called()


# ─── Comparison report generation (mocked pipeline) ──────────────────

class TestGenerateComparisonReport:
    """Comparison PDF for 2-4 companies, retrieval and LLM mocked out."""

    @staticmethod
    def _companies():
        specs = [(1, "Apple Inc.", "AAPL"), (2, "Microsoft Corporation", "MSFT")]
        out = {}
        for cid, name, ticker in specs:
            c = MagicMock()
            c.id, c.name, c.ticker, c.industry, c.sector = cid, name, ticker, "Technology", None
            out[cid] = c
        return out

    @staticmethod
    def _metrics():
        return {
            1: [{"metric_name": "revenue", "metric_value": 416_161_000_000.0, "currency": "USD",
                 "fiscal_year": 2025, "status": "extracted"}],
            2: [{"metric_name": "revenue", "metric_value": 245_122_000_000.0, "currency": "USD",
                 "fiscal_year": 2025, "status": "extracted"}],
        }

    async def _run(self, comparison_answer: str):
        from app.services import report_service
        companies = self._companies()
        metrics = self._metrics()
        captured = {}

        db = AsyncMock()
        db.get = AsyncMock(side_effect=lambda model, pk: companies.get(pk) if model.__name__ == "Company" else None)
        db.add = lambda obj: captured.setdefault("report", obj)

        async def refresh(obj):
            obj.id = 88
        db.refresh = refresh

        with patch.object(report_service, "_get_context", new=AsyncMock(return_value=[])), \
             patch.object(report_service, "compare_engine", new=AsyncMock(return_value={"comparison": comparison_answer})), \
             patch.object(report_service, "get_stored_metrics", new=AsyncMock(side_effect=lambda cid, db_: metrics[cid])), \
             patch.object(report_service, "get_llm_generator", new=MagicMock(return_value=MagicMock())):
            report = await report_service.generate_comparison_report([1, 2], 1, db)
        return report, captured

    @pytest.mark.asyncio
    async def test_generates_comparison_pdf(self):
        report, captured = await self._run("Apple leads on margins. Microsoft leads on cloud growth.")
        assert report.status == "completed"
        assert report.report_type == "comparison"
        assert report.company_id is None
        assert report.file_data[:5] == b"%PDF-"  # valid PDF
        assert len(report.file_data) > 1000
        assert "Apple Inc." in report.title and "Microsoft Corporation" in report.title
        assert captured["report"].content["metric_rows"] == 1
        assert captured["report"].content["llm_available"] is True

    @pytest.mark.asyncio
    async def test_quota_blocked_comparison_still_generated(self):
        report, captured = await self._run(
            "AI usage limit reached temporarily. Please wait and try again later."
        )
        assert report.status == "completed"
        assert report.file_data[:5] == b"%PDF-"
        assert captured["report"].content["llm_available"] is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
