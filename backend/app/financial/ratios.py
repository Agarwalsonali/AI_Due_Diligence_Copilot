"""Deterministic financial ratio calculations in Python.

All calculations are performed in Python — never by the LLM.
Handles division by zero, missing values, and negative values gracefully.
"""
from typing import Optional, Dict, Any, List, Tuple
from app.core.logging import get_logger

logger = get_logger("financial_ratios")


# ─── Individual Ratio Calculators ─────────────────────────────────────────────

def calculate_revenue_growth(current: Optional[float], previous: Optional[float]) -> Optional[float]:
    """Revenue growth rate = (current - previous) / previous."""
    if current is None or previous is None or previous == 0:
        return None
    return round((current - previous) / abs(previous), 6)


def calculate_gross_margin(gross_profit: Optional[float], revenue: Optional[float]) -> Optional[float]:
    """Gross margin = gross_profit / revenue."""
    if gross_profit is None or revenue is None or revenue == 0:
        return None
    return round(gross_profit / revenue, 6)


def calculate_operating_margin(operating_income: Optional[float], revenue: Optional[float]) -> Optional[float]:
    """Operating margin = operating_income / revenue."""
    if operating_income is None or revenue is None or revenue == 0:
        return None
    return round(operating_income / revenue, 6)


def calculate_net_margin(net_income: Optional[float], revenue: Optional[float]) -> Optional[float]:
    """Net profit margin = net_income / revenue."""
    if net_income is None or revenue is None or revenue == 0:
        return None
    return round(net_income / revenue, 6)


def calculate_debt_to_equity(debt: Optional[float], equity: Optional[float]) -> Optional[float]:
    """Debt-to-equity ratio = total_debt / equity."""
    if debt is None or equity is None or equity == 0:
        return None
    return round(debt / equity, 4)


def calculate_current_ratio(current_assets: Optional[float], current_liabilities: Optional[float]) -> Optional[float]:
    """Current ratio = current_assets / current_liabilities."""
    if current_assets is None or current_liabilities is None or current_liabilities == 0:
        return None
    return round(current_assets / current_liabilities, 4)


def calculate_free_cash_flow(operating_cash_flow: Optional[float], capital_expenditure: Optional[float]) -> Optional[float]:
    """Free cash flow = operating_cash_flow - capital_expenditure."""
    if operating_cash_flow is None or capital_expenditure is None:
        return None
    return round(operating_cash_flow - capital_expenditure, 2)


def calculate_fcf_margin(free_cash_flow: Optional[float], revenue: Optional[float]) -> Optional[float]:
    """Free cash flow margin = free_cash_flow / revenue."""
    if free_cash_flow is None or revenue is None or revenue == 0:
        return None
    return round(free_cash_flow / revenue, 6)


def calculate_roa(net_income: Optional[float], total_assets: Optional[float]) -> Optional[float]:
    """Return on assets = net_income / total_assets."""
    if net_income is None or total_assets is None or total_assets == 0:
        return None
    return round(net_income / total_assets, 6)


def calculate_roe(net_income: Optional[float], equity: Optional[float]) -> Optional[float]:
    """Return on equity = net_income / equity."""
    if net_income is None or equity is None or equity == 0:
        return None
    return round(net_income / equity, 6)


def calculate_cagr(start_value: Optional[float], end_value: Optional[float], years: int) -> Optional[float]:
    """Compound Annual Growth Rate = (end/start)^(1/years) - 1."""
    if start_value is None or end_value is None or years <= 0:
        return None
    if start_value <= 0 or end_value <= 0:
        return None
    try:
        return round((end_value / start_value) ** (1 / years) - 1, 6)
    except (ZeroDivisionError, ValueError):
        return None


# ─── Batch Calculator ─────────────────────────────────────────────────────────

# Map: metric_name → (required_inputs, calculator_function, ratio_name)
RATIO_DEFINITIONS = [
    {
        "name": "gross_margin",
        "inputs": ["gross_profit", "revenue"],
        "calc": calculate_gross_margin,
        "description": "Gross profit as a percentage of revenue",
    },
    {
        "name": "operating_margin",
        "inputs": ["operating_income", "revenue"],
        "calc": calculate_operating_margin,
        "description": "Operating income as a percentage of revenue",
    },
    {
        "name": "net_margin",
        "inputs": ["net_income", "revenue"],
        "calc": calculate_net_margin,
        "description": "Net income as a percentage of revenue",
    },
    {
        "name": "debt_to_equity",
        "inputs": ["debt", "equity"],
        "calc": calculate_debt_to_equity,
        "description": "Total debt relative to shareholders' equity",
    },
    {
        "name": "current_ratio",
        "inputs": ["current_assets", "current_liabilities"],
        "calc": calculate_current_ratio,
        "description": "Ability to pay short-term obligations",
    },
    {
        "name": "free_cash_flow",
        "inputs": ["operating_cash_flow", "capital_expenditure"],
        "calc": calculate_free_cash_flow,
        "description": "Cash generated after capital expenditures",
    },
    {
        "name": "fcf_margin",
        "inputs": ["free_cash_flow", "revenue"],
        "calc": calculate_fcf_margin,
        "description": "Free cash flow as a percentage of revenue",
    },
    {
        "name": "return_on_assets",
        "inputs": ["net_income", "total_assets"],
        "calc": calculate_roa,
        "description": "Net income relative to total assets",
    },
    {
        "name": "return_on_equity",
        "inputs": ["net_income", "equity"],
        "calc": calculate_roe,
        "description": "Net income relative to shareholders' equity",
    },
]


def calculate_all_ratios(metrics_by_year: Dict[int, Dict[str, Optional[float]]]) -> Dict[str, Any]:
    """Calculate all financial ratios for each fiscal year.

    Args:
        metrics_by_year: {2025: {"revenue": 130e9, "net_income": 30e9, ...}, ...}

    Returns:
        {"ratios": [{name, value, fiscal_year, inputs_used, description}, ...],
         "revenue_growth": [{fiscal_year, value, previous_year}, ...],
         "cagr": {metric_name: {start_year, end_year, cagr_value}, ...}}
    """
    results = {
        "ratios": [],
        "revenue_growth": [],
        "cagr": {},
    }

    years_sorted = sorted(metrics_by_year.keys())

    # Calculate ratios for each year
    for year in years_sorted:
        year_metrics = metrics_by_year[year]

        for defn in RATIO_DEFINITIONS:
            inputs = {k: year_metrics.get(k) for k in defn["inputs"]}
            value = defn["calc"](**inputs)

            # Track which inputs were available
            available = [k for k in defn["inputs"] if year_metrics.get(k) is not None]

            results["ratios"].append({
                "name": defn["name"],
                "fiscal_year": year,
                "value": value,
                "description": defn["description"],
                "inputs_used": available,
                "complete": len(available) == len(defn["inputs"]),
            })

    # Year-over-year revenue growth
    for i in range(1, len(years_sorted)):
        prev_year = years_sorted[i - 1]
        curr_year = years_sorted[i]
        prev_rev = metrics_by_year[prev_year].get("revenue")
        curr_rev = metrics_by_year[curr_year].get("revenue")
        growth = calculate_revenue_growth(curr_rev, prev_rev)
        if growth is not None:
            results["revenue_growth"].append({
                "fiscal_year": curr_year,
                "previous_year": prev_year,
                "value": growth,
            })

    # CAGR for key metrics (if enough years)
    if len(years_sorted) >= 2:
        start_year = years_sorted[0]
        end_year = years_sorted[-1]
        years_span = end_year - start_year
        if years_span > 0:
            for metric_name in ["revenue", "net_income", "total_assets"]:
                start_val = metrics_by_year[start_year].get(metric_name)
                end_val = metrics_by_year[end_year].get(metric_name)
                cagr = calculate_cagr(start_val, end_val, years_span)
                if cagr is not None:
                    results["cagr"][metric_name] = {
                        "start_year": start_year,
                        "end_year": end_year,
                        "value": cagr,
                        "start_value": start_val,
                        "end_value": end_val,
                    }

    return results


def build_metrics_by_year(stored_metrics: List[Dict[str, Any]]) -> Dict[int, Dict[str, Optional[float]]]:
    """Group stored metrics by fiscal year.

    Args:
        stored_metrics: List of metric dicts from the database.

    Returns:
        {2025: {"revenue": 130e9, "net_income": 30e9, ...}, 2024: {...}}
    """
    by_year: Dict[int, Dict[str, Optional[float]]] = {}

    for m in stored_metrics:
        year = m.get("fiscal_year")
        name = m.get("metric_name")
        value = m.get("metric_value")
        status = m.get("status", "extracted")

        if year is None or name is None:
            continue
        if status == "not_found" or status == "suspicious":
            continue

        if year not in by_year:
            by_year[year] = {}
        # Keep the most recent extraction if duplicates exist
        by_year[year][name] = value

    return by_year
