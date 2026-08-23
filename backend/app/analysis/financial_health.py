"""Financial health assessment engine.

Analyzes financial health across 5 dimensions using deterministic Python calculations:
- Growth (revenue growth, CAGR)
- Profitability (margins, ROA, ROE)
- Liquidity (current ratio, cash position)
- Leverage (debt-to-equity)
- Cash flow (FCF, FCF margin)

All scoring is based on documented financial thresholds.
"""
from typing import Optional, Dict, Any, List
from app.core.logging import get_logger

logger = get_logger("financial_health")


# ─── Thresholds (documented, not arbitrary) ───────────────────────────────────
# Based on general financial analysis conventions.
# These are heuristic benchmarks, not absolute rules.

THRESHOLDS = {
    "revenue_growth": {
        "strong": 0.10,    # >10% YoY growth = strong
        "moderate": 0.03,  # 3-10% = moderate
        # <3% = weak
    },
    "cagr": {
        "strong": 0.08,
        "moderate": 0.03,
    },
    "gross_margin": {
        "strong": 0.40,    # >40% = strong
        "moderate": 0.25,  # 25-40% = moderate
    },
    "operating_margin": {
        "strong": 0.15,    # >15% = strong
        "moderate": 0.05,  # 5-15% = moderate
    },
    "net_margin": {
        "strong": 0.10,    # >10% = strong
        "moderate": 0.03,  # 3-10% = moderate
    },
    "current_ratio": {
        "strong": 1.5,     # >1.5 = strong liquidity
        "moderate": 1.0,   # 1.0-1.5 = adequate
    },
    "debt_to_equity": {
        "strong": 0.5,     # <0.5 = low leverage (good)
        "moderate": 1.0,   # 0.5-1.0 = moderate
        # >1.0 = high leverage (caution)
    },
    "roa": {
        "strong": 0.08,
        "moderate": 0.03,
    },
    "roe": {
        "strong": 0.15,
        "moderate": 0.08,
    },
}


def _rate(value: Optional[float], metric: str) -> str:
    """Rate a metric against documented thresholds."""
    if value is None:
        return "unknown"
    t = THRESHOLDS.get(metric, {})
    if metric in ("debt_to_equity",):
        # Lower is better for debt-to-equity
        if value <= t.get("strong", 0.5):
            return "strong"
        elif value <= t.get("moderate", 1.0):
            return "moderate"
        else:
            return "weak"
    else:
        # Higher is better for most metrics
        if value >= t.get("strong", 0):
            return "strong"
        elif value >= t.get("moderate", 0):
            return "moderate"
        else:
            return "weak"


def assess_financial_health(
    ratios: List[Dict[str, Any]],
    trends: Dict[str, Dict[str, Any]],
    cagr_data: Dict[str, Any],
    sources: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Produce a structured financial health assessment.

    Args:
        ratios: List of ratio results from calculate_all_ratios.
        trends: Trends dict from analyze_trends.
        cagr_data: CAGR data from calculate_all_ratios.
        sources: Source citations to include.

    Returns:
        Financial health assessment dict.
    """
    # Build lookup: (metric_name, year) → value
    ratio_map = {}
    for r in ratios:
        if r.get("value") is not None:
            ratio_map[(r["name"], r["fiscal_year"])] = r["value"]

    # Get most recent year's ratios
    years = sorted(set(r.get("fiscal_year") for r in ratios if r.get("fiscal_year")))
    latest_year = years[-1] if years else None

    # ─── Growth Assessment ────────────────────────────────────────────────
    rev_growth = None
    for rg in trends.get("revenue", {}).get("yoy_growth", []):
        if rg.get("year") == latest_year:
            rev_growth = rg.get("value")

    growth_rating = _rate(rev_growth, "revenue_growth")
    cagr_val = cagr_data.get("revenue", {}).get("value")
    cagr_rating = _rate(cagr_val, "cagr") if cagr_val else "unknown"

    growth_text = "Insufficient data to assess growth."
    if rev_growth is not None:
        pct = round(rev_growth * 100, 1)
        growth_text = f"Revenue growth of {pct}% year-over-year."
        if cagr_val is not None:
            cagr_pct = round(cagr_val * 100, 1)
            growth_text += f" CAGR of {cagr_pct}% over the available period."
        growth_text += f" Growth assessment: {growth_rating.upper()}."

    # ─── Profitability Assessment ─────────────────────────────────────────
    gm = ratio_map.get(("gross_margin", latest_year))
    om = ratio_map.get(("operating_margin", latest_year))
    nm = ratio_map.get(("net_margin", latest_year))

    prof_scores = [_rate(gm, "gross_margin"), _rate(om, "operating_margin"), _rate(nm, "net_margin")]
    prof_valid = [s for s in prof_scores if s != "unknown"]
    if not prof_valid:
        prof_rating = "unknown"
    elif prof_valid.count("strong") >= 2:
        prof_rating = "strong"
    elif prof_valid.count("weak") >= 2:
        prof_rating = "weak"
    else:
        prof_rating = "moderate"

    parts = []
    if gm is not None:
        parts.append(f"gross margin {round(gm * 100, 1)}%")
    if om is not None:
        parts.append(f"operating margin {round(om * 100, 1)}%")
    if nm is not None:
        parts.append(f"net margin {round(nm * 100, 1)}%")
    prof_text = f"Profitability: {', '.join(parts) if parts else 'Insufficient data'}. Assessment: {prof_rating.upper()}." if parts else "Insufficient profitability data."

    # ─── Liquidity Assessment ─────────────────────────────────────────────
    cr = ratio_map.get(("current_ratio", latest_year))
    cash = None
    # Try to find cash from trends
    for point in trends.get("cash", {}).get("data", []):
        if point.get("year") == latest_year:
            cash = point.get("value")

    liq_rating = _rate(cr, "current_ratio")
    liq_text = f"Current ratio of {round(cr, 2)}." if cr is not None else "Insufficient liquidity data."
    liq_text += f" Assessment: {liq_rating.upper()}."

    # ─── Leverage Assessment ──────────────────────────────────────────────
    dte = ratio_map.get(("debt_to_equity", latest_year))
    lev_rating = _rate(dte, "debt_to_equity")
    lev_text = f"Debt-to-equity ratio of {round(dte, 2)}." if dte is not None else "Insufficient leverage data."
    lev_text += f" Assessment: {lev_rating.upper()}."

    # ─── Cash Flow Assessment ─────────────────────────────────────────────
    fcf = ratio_map.get(("free_cash_flow", latest_year))
    fcf_m = ratio_map.get(("fcf_margin", latest_year))

    if fcf is not None and fcf > 0:
        cf_rating = "strong"
    elif fcf is not None and fcf < 0:
        cf_rating = "weak"
    else:
        cf_rating = "unknown"

    cf_text = f"Free cash flow of ${_format_number(fcf)}." if fcf is not None else "Insufficient cash flow data."
    if fcf_m is not None:
        cf_text += f" FCF margin {round(fcf_m * 100, 1)}%."
    cf_text += f" Assessment: {cf_rating.upper()}."

    # ─── Overall Assessment ───────────────────────────────────────────────
    ratings = [growth_rating, prof_rating, liq_rating, lev_rating, cf_rating]
    valid_ratings = [r for r in ratings if r != "unknown"]

    if len(valid_ratings) < 2:
        overall = "INSUFFICIENT DATA"
    elif valid_ratings.count("strong") >= 3:
        overall = "STRONG"
    elif valid_ratings.count("weak") >= 3:
        overall = "WEAK"
    elif valid_ratings.count("strong") >= valid_ratings.count("weak"):
        overall = "MODERATELY STRONG"
    else:
        overall = "MODERATELY WEAK"

    explanation_parts = [growth_text, prof_text, liq_text, lev_text, cf_text]

    return {
        "overall": overall,
        "growth": growth_text,
        "profitability": prof_text,
        "liquidity": liq_text,
        "leverage": lev_text,
        "cash_flow": cf_text,
        "explanation": " ".join(explanation_parts),
        "scores": {
            "growth": growth_rating,
            "profitability": prof_rating,
            "liquidity": liq_rating,
            "leverage": lev_rating,
            "cash_flow": cf_rating,
        },
        "sources": sources or [],
    }


def _format_number(value: Optional[float]) -> str:
    """Format a number for display."""
    if value is None:
        return "N/A"
    abs_val = abs(value)
    sign = "-" if value < 0 else ""
    if abs_val >= 1e12:
        return f"{sign}${abs_val / 1e12:.2f}T"
    elif abs_val >= 1e9:
        return f"{sign}${abs_val / 1e9:.2f}B"
    elif abs_val >= 1e6:
        return f"{sign}${abs_val / 1e6:.2f}M"
    elif abs_val >= 1e3:
        return f"{sign}${abs_val / 1e3:.1f}K"
    else:
        return f"{sign}${abs_val:.2f}"
