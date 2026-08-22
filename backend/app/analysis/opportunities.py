import json
import re
from typing import List, Dict, Any
from app.rag.generator import LLMGenerator
from app.rag.prompts import OPPORTUNITY_PROMPT


async def analyze_opportunities(
    company_id: int,
    chunks: List[Dict[str, Any]],
    generator: LLMGenerator,
) -> List[Dict[str, Any]]:
    """Analyze growth opportunities from document chunks."""

    result = await generator.generate(
        OPPORTUNITY_PROMPT,
        "Identify and analyze all growth opportunities for this company",
        chunks,
    )
    answer = result.get("answer", "")

    opportunities = _parse_opportunities_from_response(answer)

    if not opportunities:
        opportunities = _fallback_opportunity_extraction(answer)

    return opportunities


def _parse_opportunities_from_response(text: str) -> List[Dict[str, Any]]:
    """Attempt to parse structured opportunity data from LLM response."""
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if isinstance(data, list):
                return [
                    {
                        "category": item.get("category", "General"),
                        "title": item.get("title", "Untitled Opportunity"),
                        "description": item.get("description", ""),
                        "evidence": item.get("evidence", ""),
                        "confidence": _normalize_confidence(item.get("confidence", 0.5)),
                        "sources": item.get("sources", []),
                    }
                    for item in data
                ]
        except json.JSONDecodeError:
            pass
    return []


def _fallback_opportunity_extraction(text: str) -> List[Dict[str, Any]]:
    """Extract opportunities from unstructured text as a fallback."""
    opportunities = []
    categories = [
        "Market Expansion", "Product Innovation", "Strategic Partnerships",
        "Cost Optimization", "Technology Adoption", "International Growth",
    ]

    sections = re.split(r'(?:Opportunity|Growth|Potential|Advantage)[s]?:', text, flags=re.IGNORECASE)

    for i, section in enumerate(sections[1:], 1):
        category = categories[(i - 1) % len(categories)]
        sentences = [s.strip() for s in re.split(r'[.!?\n]', section) if len(s.strip()) > 20]
        if sentences:
            description = sentences[0][:500]
            opportunities.append({
                "category": category,
                "title": f"{category} Opportunity",
                "description": description,
                "evidence": description,
                "confidence": 0.6,
                "sources": [],
            })

    return opportunities[:10]


def _normalize_confidence(confidence) -> float:
    """Normalize confidence to 0-100 scale."""
    try:
        val = float(confidence)
        # If it's already on 0-1 scale, convert to percentage
        if 0 <= val <= 1:
            return round(val * 100, 1)
        elif 0 < val <= 100:
            return round(val, 1)
    except (ValueError, TypeError):
        pass
    return 50.0
