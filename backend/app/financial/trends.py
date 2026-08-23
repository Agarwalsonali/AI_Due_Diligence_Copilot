"""Financial trend analysis — multi-year comparisons and growth detection.

Analyzes metric trends across fiscal years:
- Year-over-year changes
- Direction detection (increasing, decreasing, stable)
- CAGR (Compound Annual Growth Rate)
- Chart-friendly output for frontend Recharts
"""
from typing import Optional, Dict, Any, List
from app.core.logging import get_logger

logger = get_logger("financial_trends")


def analyze_trends(stored_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze trends across all stored financial metrics.

    Returns:
        {
            "revenue": {
                "data": [{"year": 2022, "value": 25e9}, {"year": 2023, "value": 40e9}],
                "direction": "increasing",
                "yoy_growth": [{"year": 2023, "value": 0.6}],
                "cagr": 0.52,
                "total_change_pct": 420.0,
            },
            ...
        }
    """
    # Group by metric name, then by year
    metrics_by_name: Dict[str, Dict[int, float]] = {}
    for m in stored_metrics:
        name = m.get("metric_name")
        year = m.get("fiscal_year")
        value = m.get("metric_value")
        status = m.get("status", "extracted")

        if name and year and value is not None and status not in ("not_found", "suspicious"):
            if name not in metrics_by_name:
                metrics_by_name[name] = {}
            metrics_by_name[name][year] = value

    trends = {}
    for metric_name, year_values in metrics_by_name.items():
        years_sorted = sorted(year_values.keys())
        if len(year_values) < 1:
            continue

        # Data points for charting
        data = [{"year": y, "value": year_values[y]} for y in years_sorted]

        trend_info = {
            "data": data,
            "direction": "unknown",
            "yoy_growth": [],
            "cagr": None,
            "total_change_pct": None,
        }

        if len(years_sorted) >= 2:
            first_val = year_values[years_sorted[0]]
            last_val = year_values[years_sorted[-1]]

            # Direction
            if last_val > first_val * 1.05:
                trend_info["direction"] = "increasing"
            elif last_val < first_val * 0.95:
                trend_info["direction"] = "decreasing"
            else:
                trend_info["direction"] = "stable"

            # Total change
            if first_val != 0:
                trend_info["total_change_pct"] = round(
                    (last_val - first_val) / abs(first_val) * 100, 2
                )

            # Year-over-year growth
            for i in range(1, len(years_sorted)):
                prev_y = years_sorted[i - 1]
                curr_y = years_sorted[i]
                prev_val = year_values[prev_y]
                curr_val = year_values[curr_y]
                if prev_val != 0:
                    yoy = round((curr_val - prev_val) / abs(prev_val), 6)
                    trend_info["yoy_growth"].append({
                        "year": curr_y,
                        "previous_year": prev_y,
                        "value": yoy,
                    })

            # CAGR
            years_span = years_sorted[-1] - years_sorted[0]
            if years_span > 0 and first_val > 0 and last_val > 0:
                try:
                    cagr = (last_val / first_val) ** (1 / years_span) - 1
                    trend_info["cagr"] = round(cagr, 6)
                except (ZeroDivisionError, ValueError):
                    pass

        trends[metric_name] = trend_info

    logger.info(
        "trends_analyzed",
        metric_count=len(trends),
        with_direction=sum(1 for t in trends.values() if t["direction"] != "unknown"),
    )

    return trends
