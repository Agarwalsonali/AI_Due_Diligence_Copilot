"""Unit tests for the financial analysis modules.

Tests cover:
- Individual ratio calculations
- Edge cases (division by zero, missing values, negative values)
- Multi-year trend analysis
- CAGR calculation
- Financial health assessment
- Metric normalization and validation
- Insights generation

Run with: python -m pytest tests/test_financial.py -v
"""
import pytest
from app.financial.ratios import (
    calculate_revenue_growth, calculate_gross_margin, calculate_operating_margin,
    calculate_net_margin, calculate_debt_to_equity, calculate_current_ratio,
    calculate_free_cash_flow, calculate_fcf_margin, calculate_roa, calculate_roe,
    calculate_cagr, calculate_all_ratios, build_metrics_by_year,
)
from app.financial.trends import analyze_trends
from app.analysis.financial_health import assess_financial_health, _rate, _format_number
from app.financial.extraction import _normalize_value, _validate_metric, _parse_llm_response


# ─── Revenue Growth Tests ─────────────────────────────────────────────────────

class TestRevenueGrowth:
    def test_basic_growth(self):
        assert calculate_revenue_growth(150, 100) == 0.5

    def test_no_growth(self):
        assert calculate_revenue_growth(100, 100) == 0.0

    def test_decline(self):
        assert calculate_revenue_growth(80, 100) == -0.2

    def test_zero_previous(self):
        assert calculate_revenue_growth(100, 0) is None

    def test_both_none(self):
        assert calculate_revenue_growth(None, 100) is None
        assert calculate_revenue_growth(100, None) is None

    def test_negative_previous(self):
        # Handles negative denominator gracefully
        result = calculate_revenue_growth(100, -50)
        assert result is not None

    def test_large_numbers(self):
        result = calculate_revenue_growth(130_500_000_000, 60_000_000_000)
        assert abs(result - 1.175) < 0.01


# ─── Margin Tests ─────────────────────────────────────────────────────────────

class TestMargins:
    def test_gross_margin(self):
        assert calculate_gross_margin(60, 100) == 0.6

    def test_operating_margin(self):
        assert calculate_operating_margin(20, 100) == 0.2

    def test_net_margin(self):
        assert calculate_net_margin(15, 100) == 0.15

    def test_zero_revenue(self):
        assert calculate_gross_margin(60, 0) is None
        assert calculate_operating_margin(20, 0) is None
        assert calculate_net_margin(15, 0) is None

    def test_none_values(self):
        assert calculate_gross_margin(None, 100) is None
        assert calculate_gross_margin(60, None) is None

    def test_negative_net_income(self):
        # Negative net income with positive revenue should still calculate
        result = calculate_net_margin(-5, 100)
        assert result == -0.05


# ─── Debt-to-Equity Tests ────────────────────────────────────────────────────

class TestDebtToEquity:
    def test_basic(self):
        assert calculate_debt_to_equity(50, 100) == 0.5

    def test_zero_equity(self):
        assert calculate_debt_to_equity(50, 0) is None

    def test_none_values(self):
        assert calculate_debt_to_equity(None, 100) is None

    def test_negative_equity(self):
        # Can still calculate (indicates financial distress)
        result = calculate_debt_to_equity(50, -20)
        assert result is not None


# ─── Current Ratio Tests ─────────────────────────────────────────────────────

class TestCurrentRatio:
    def test_basic(self):
        assert calculate_current_ratio(200, 100) == 2.0

    def test_zero_liabilities(self):
        assert calculate_current_ratio(200, 0) is None

    def test_insufficient_liquidity(self):
        result = calculate_current_ratio(50, 100)
        assert result == 0.5


# ─── Free Cash Flow Tests ────────────────────────────────────────────────────

class TestFreeCashFlow:
    def test_basic(self):
        assert calculate_free_cash_flow(50, 20) == 30.0

    def test_negative_capex(self):
        result = calculate_free_cash_flow(50, -10)
        assert result == 60.0

    def test_none_values(self):
        assert calculate_free_cash_flow(None, 20) is None
        assert calculate_free_cash_flow(50, None) is None

    def test_fcf_margin(self):
        assert calculate_fcf_margin(30, 100) == 0.3

    def test_fcf_margin_zero_revenue(self):
        assert calculate_fcf_margin(30, 0) is None


# ─── ROA / ROE Tests ─────────────────────────────────────────────────────────

class TestReturnMetrics:
    def test_roa(self):
        assert calculate_roa(10, 100) == 0.1

    def test_roe(self):
        assert calculate_roe(10, 50) == 0.2

    def test_zero_denominator(self):
        assert calculate_roa(10, 0) is None
        assert calculate_roe(10, 0) is None

    def test_none_values(self):
        assert calculate_roa(None, 100) is None
        assert calculate_roe(10, None) is None


# ─── CAGR Tests ───────────────────────────────────────────────────────────────

class TestCAGR:
    def test_basic_cagr(self):
        result = calculate_cagr(100, 200, 5)
        # (200/100)^(1/5) - 1 = 2^0.2 - 1 ≈ 0.1487
        assert abs(result - 0.1487) < 0.01

    def test_zero_years(self):
        assert calculate_cagr(100, 200, 0) is None

    def test_zero_start(self):
        assert calculate_cagr(0, 200, 5) is None

    def test_negative_start(self):
        assert calculate_cagr(-100, 200, 5) is None

    def test_one_year(self):
        result = calculate_cagr(100, 110, 1)
        assert abs(result - 0.1) < 0.001

    def test_no_growth(self):
        result = calculate_cagr(100, 100, 5)
        assert result == 0.0


# ─── Build Metrics By Year Tests ──────────────────────────────────────────────

class TestBuildMetricsByYear:
    def test_groups_by_year(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2024, "metric_value": 100e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2025, "metric_value": 130e9, "status": "extracted"},
            {"metric_name": "net_income", "fiscal_year": 2025, "metric_value": 30e9, "status": "extracted"},
        ]
        result = build_metrics_by_year(metrics)
        assert 2024 in result
        assert 2025 in result
        assert result[2024]["revenue"] == 100e9
        assert result[2025]["revenue"] == 130e9
        assert result[2025]["net_income"] == 30e9

    def test_excludes_not_found(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2025, "metric_value": 100e9, "status": "extracted"},
            {"metric_name": "eps", "fiscal_year": 2025, "metric_value": None, "status": "not_found"},
        ]
        result = build_metrics_by_year(metrics)
        assert "revenue" in result[2025]
        assert "eps" not in result[2025]

    def test_excludes_suspicious(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2025, "metric_value": -100e9, "status": "suspicious"},
        ]
        result = build_metrics_by_year(metrics)
        assert 2025 not in result or "revenue" not in result.get(2025, {})


# ─── Calculate All Ratios Tests ───────────────────────────────────────────────

class TestCalculateAllRatios:
    def test_single_year(self):
        data = {2025: {"revenue": 100e9, "net_income": 20e9, "gross_profit": 60e9}}
        result = calculate_all_ratios(data)
        assert "ratios" in result
        assert len(result["ratios"]) > 0

        # Check net_margin
        nm = [r for r in result["ratios"] if r["name"] == "net_margin" and r["fiscal_year"] == 2025]
        assert len(nm) == 1
        assert abs(nm[0]["value"] - 0.2) < 0.001

    def test_multi_year(self):
        data = {
            2024: {"revenue": 100e9, "net_income": 15e9},
            2025: {"revenue": 130e9, "net_income": 25e9},
        }
        result = calculate_all_ratios(data)
        # Should have revenue_growth
        assert len(result["revenue_growth"]) > 0
        growth = result["revenue_growth"][0]
        assert abs(growth["value"] - 0.3) < 0.01

    def test_cagr_calculation(self):
        data = {
            2022: {"revenue": 25e9},
            2025: {"revenue": 130e9},
        }
        result = calculate_all_ratios(data)
        assert "revenue" in result["cagr"]
        cagr = result["cagr"]["revenue"]["value"]
        # (130/25)^(1/3) - 1 ≈ 0.729
        assert cagr > 0.5


# ─── Trend Analysis Tests ────────────────────────────────────────────────────

class TestTrendAnalysis:
    def test_increasing_trend(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2022, "metric_value": 50e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2023, "metric_value": 70e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2024, "metric_value": 100e9, "status": "extracted"},
        ]
        result = analyze_trends(metrics)
        assert "revenue" in result
        assert result["revenue"]["direction"] == "increasing"
        assert len(result["revenue"]["data"]) == 3
        assert result["revenue"]["cagr"] is not None

    def test_decreasing_trend(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2022, "metric_value": 100e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2024, "metric_value": 80e9, "status": "extracted"},
        ]
        result = analyze_trends(metrics)
        assert result["revenue"]["direction"] == "decreasing"
        assert result["revenue"]["total_change_pct"] < 0

    def test_stable_trend(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2022, "metric_value": 100e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2024, "metric_value": 102e9, "status": "extracted"},
        ]
        result = analyze_trends(metrics)
        assert result["revenue"]["direction"] == "stable"

    def test_yoy_growth(self):
        metrics = [
            {"metric_name": "revenue", "fiscal_year": 2023, "metric_value": 100e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2024, "metric_value": 120e9, "status": "extracted"},
            {"metric_name": "revenue", "fiscal_year": 2025, "metric_value": 150e9, "status": "extracted"},
        ]
        result = analyze_trends(metrics)
        yoy = result["revenue"]["yoy_growth"]
        assert len(yoy) == 2
        assert abs(yoy[0]["value"] - 0.2) < 0.01
        assert abs(yoy[1]["value"] - 0.25) < 0.01

    def test_empty_metrics(self):
        result = analyze_trends([])
        assert result == {}


# ─── Financial Health Tests ───────────────────────────────────────────────────

class TestFinancialHealth:
    def test_strong_health(self):
        ratios = [
            {"name": "gross_margin", "fiscal_year": 2025, "value": 0.55},
            {"name": "operating_margin", "fiscal_year": 2025, "value": 0.25},
            {"name": "net_margin", "fiscal_year": 2025, "value": 0.20},
            {"name": "current_ratio", "fiscal_year": 2025, "value": 2.5},
            {"name": "debt_to_equity", "fiscal_year": 2025, "value": 0.3},
            {"name": "free_cash_flow", "fiscal_year": 2025, "value": 20e9},
            {"name": "fcf_margin", "fiscal_year": 2025, "value": 0.15},
        ]
        trends = {
            "revenue": {
                "yoy_growth": [{"year": 2025, "value": 0.25}],
                "data": [{"year": 2024, "value": 100e9}, {"year": 2025, "value": 125e9}],
            }
        }
        cagr = {"revenue": {"value": 0.15}}
        health = assess_financial_health(ratios, trends, cagr)
        assert health["overall"] == "STRONG"
        assert health["scores"]["profitability"] == "strong"
        assert health["scores"]["liquidity"] == "strong"

    def test_weak_health(self):
        ratios = [
            {"name": "gross_margin", "fiscal_year": 2025, "value": 0.10},
            {"name": "operating_margin", "fiscal_year": 2025, "value": 0.01},
            {"name": "net_margin", "fiscal_year": 2025, "value": -0.02},
            {"name": "current_ratio", "fiscal_year": 2025, "value": 0.5},
            {"name": "debt_to_equity", "fiscal_year": 2025, "value": 3.0},
            {"name": "free_cash_flow", "fiscal_year": 2025, "value": -5e9},
        ]
        trends = {"revenue": {"yoy_growth": [{"year": 2025, "value": -0.10}]}}
        cagr = {"revenue": {"value": -0.05}}
        health = assess_financial_health(ratios, trends, cagr)
        assert "WEAK" in health["overall"] or "INSUFFICIENT" in health["overall"]

    def test_insufficient_data(self):
        health = assess_financial_health([], {}, {})
        assert "INSUFFICIENT" in health["overall"]

    def test_sources_included(self):
        sources = [{"source_id": "source_1", "document_id": 1}]
        health = assess_financial_health([], {}, {}, sources=sources)
        assert health["sources"] == sources


# ─── Rating Tests ─────────────────────────────────────────────────────────────

class TestRating:
    def test_rate_strong(self):
        assert _rate(0.50, "gross_margin") == "strong"
        assert _rate(2.0, "current_ratio") == "strong"

    def test_rate_moderate(self):
        assert _rate(0.30, "gross_margin") == "moderate"

    def test_rate_weak(self):
        assert _rate(0.10, "gross_margin") == "weak"

    def test_rate_unknown(self):
        assert _rate(None, "gross_margin") == "unknown"

    def test_rate_debt_lower_better(self):
        assert _rate(0.3, "debt_to_equity") == "strong"
        assert _rate(1.5, "debt_to_equity") == "weak"


# ─── Format Number Tests ──────────────────────────────────────────────────────

class TestFormatNumber:
    def test_billions(self):
        assert _format_number(130_500_000_000) == "$130.50B"

    def test_millions(self):
        assert _format_number(500_000_000) == "$500.00M"

    def test_trillions(self):
        assert _format_number(2_500_000_000_000) == "$2.50T"

    def test_thousands(self):
        assert _format_number(50_000) == "$50.0K"

    def test_small_number(self):
        assert _format_number(42.5) == "$42.50"

    def test_negative(self):
        assert _format_number(-5_000_000_000) == "-$5.00B"

    def test_none(self):
        assert _format_number(None) == "N/A"


# ─── Normalization Tests ─────────────────────────────────────────────────────

class TestNormalization:
    def test_billion(self):
        assert _normalize_value(130.5, "billion") == 130_500_000_000

    def test_million(self):
        assert _normalize_value(500, "million") == 500_000_000

    def test_thousand(self):
        assert _normalize_value(50, "thousand") == 50_000

    def test_raw(self):
        assert _normalize_value(130_500_000_000, "") == 130_500_000_000


# ─── Validation Tests ─────────────────────────────────────────────────────────

class TestValidation:
    def test_revenue_negative(self):
        assert _validate_metric("revenue", -100) == "suspicious"

    def test_revenue_positive(self):
        assert _validate_metric("revenue", 100e9) == "extracted"

    def test_eps_positive(self):
        assert _validate_metric("eps", 5.50) == "extracted"

    def test_margin_range(self):
        assert _validate_metric("net_margin", 0.15) == "extracted"

    def test_margin_out_of_range(self):
        assert _validate_metric("net_margin", 50) == "suspicious"

    def test_not_found(self):
        assert _validate_metric("revenue", None) == "not_found"


# ─── LLM Response Parsing Tests ──────────────────────────────────────────────

class TestLLMResponseParsing:
    def test_parse_json_array(self):
        text = '[{"metric": "revenue", "fiscal_year": 2025, "value": 130500000000}]'
        result = _parse_llm_response(text)
        assert len(result) == 1
        assert result[0]["metric"] == "revenue"

    def test_parse_with_extra_text(self):
        text = 'Here are the metrics:\n[{"metric": "revenue", "fiscal_year": 2025, "value": 130500000000}]\nDone.'
        result = _parse_llm_response(text)
        assert len(result) == 1

    def test_parse_empty_array(self):
        text = '[]'
        result = _parse_llm_response(text)
        assert result == []

    def test_parse_no_json(self):
        text = 'No financial data found in the provided context.'
        result = _parse_llm_response(text)
        assert result == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
