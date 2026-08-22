import json
import re
from typing import List, Dict, Any
from app.rag.generator import LLMGenerator
from app.rag.prompts import RISK_ANALYSIS_PROMPT


async def analyze_risks(
    company_id: int,
    chunks: List[Dict[str, Any]],
    generator: LLMGenerator,
) -> List[Dict[str, Any]]:
    """Analyze and classify risks from document chunks."""

    result = await generator.generate(
        RISK_ANALYSIS_PROMPT,
        "Analyze all available risks for this company",
        chunks,
    )
    answer = result.get("answer", "")

    # Try to parse JSON from the response
    risks = _parse_risks_from_response(answer)

    # If no structured risks found, create from raw text
    if not risks:
        risks = _fallback_risk_extraction(answer)

    return risks


def _parse_risks_from_response(text: str) -> List[Dict[str, Any]]:
    """Attempt to parse structured risk data from LLM response."""
    # Try to find JSON array in the response
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if isinstance(data, list):
                return [
                    {
                        "category": item.get("category", "Unknown"),
                        "title": item.get("title", "Untitled Risk"),
                        "severity": _normalize_severity(item.get("severity", "MEDIUM")),
                        "description": item.get("description", ""),
                        "evidence": item.get("evidence", ""),
                        "sources": item.get("sources", []),
                    }
                    for item in data
                ]
        except json.JSONDecodeError:
            pass
    return []


def _fallback_risk_extraction(text: str) -> List[Dict[str, Any]]:
    """Extract risks from unstructured text as a fallback."""
    risks = []
    categories = ["Financial", "Operational", "Market", "Regulatory", "Geopolitical"]

    # Split by common risk section markers
    sections = re.split(r'(?:Risk Factor|Risk|Threat|Challenge)[s]?:', text, flags=re.IGNORECASE)

    for i, section in enumerate(sections[1:], 1):
        category = categories[i % len(categories)] if i <= len(categories) else "Operational"
        # Take the first meaningful sentence as description
        sentences = [s.strip() for s in re.split(r'[.!?\n]', section) if len(s.strip()) > 20]
        if sentences:
            description = sentences[0][:500]
            risks.append({
                "category": category,
                "title": f"{category} Risk {i}",
                "severity": "MEDIUM",
                "description": description,
                "evidence": description,
                "sources": [],
            })

    return risks[:10]  # Limit


def _normalize_severity(severity: str) -> str:
    """Normalize severity to standard levels."""
    severity = severity.upper().strip()
    valid = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    return severity if severity in valid else "MEDIUM"
