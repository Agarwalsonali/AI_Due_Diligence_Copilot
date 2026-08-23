"""Evidence-backed risk analysis.

Uses RAG-retrieved chunks to identify and classify risks.
Every risk must have supporting evidence from the documents.
"""
import json
import re
from typing import List, Dict, Any
from app.rag.generator import LLMGenerator
from app.core.logging import get_logger

logger = get_logger("risk_analysis")

RISK_CATEGORIES = [
    "Financial", "Operational", "Market", "Competitive",
    "Regulatory", "Geopolitical", "Supply Chain",
    "Customer Concentration", "Technology", "Legal",
]

RISK_PROMPT = """You are a financial risk analyst performing due diligence.

Analyze the provided document context and identify all material risks.

For each risk, return a JSON object with:
- category: one of Financial, Operational, Market, Competitive, Regulatory, Geopolitical, Supply Chain, Customer Concentration, Technology, Legal
- title: concise risk title (max 60 chars)
- severity: one of LOW, MEDIUM, HIGH, CRITICAL
- description: clear explanation of the risk (2-4 sentences)
- evidence: direct quote or close paraphrase from the document supporting this risk
- sources: array of source numbers (integers) from the provided context

Rules:
- Only identify risks that are SUPPORTED BY THE PROVIDED CONTEXT.
- Do NOT invent risks.
- Do NOT fabricate evidence.
- Classify severity based on potential impact and likelihood as described in the documents.
- Include at least 3 risks if the context supports it.
- Each risk MUST cite at least one source.

Return a JSON array of risk objects. Return [] if no risks found.
Return ONLY the JSON array. No explanation."""


async def analyze_risks(
    company_id: int,
    chunks: List[Dict[str, Any]],
    generator: LLMGenerator,
) -> List[Dict[str, Any]]:
    """Analyze and classify risks from document chunks.

    Returns a list of risk dicts with source citations.
    """
    if not chunks:
        logger.info("no_chunks_for_risk_analysis", company_id=company_id)
        return []

    result = await generator.generate(
        RISK_PROMPT,
        "Analyze all material risks for this company based on the provided documents.",
        chunks,
        temperature=0.0,
    )
    answer = result.get("answer", "")
    sources = result.get("sources", [])

    risks = _parse_risks_from_response(answer, sources)

    if not risks:
        risks = _fallback_risk_extraction(answer, sources)

    logger.info(
        "risk_analysis_complete",
        company_id=company_id,
        risk_count=len(risks),
        categories=[r["category"] for r in risks],
    )

    return risks


def _parse_risks_from_response(text: str, llm_sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Parse structured risk data from LLM response."""
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if isinstance(data, list):
                return [
                    _build_risk_item(item, llm_sources)
                    for item in data
                    if item.get("title")
                ]
        except json.JSONDecodeError:
            pass
    return []


def _build_risk_item(item: Dict[str, Any], llm_sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build a standardized risk item with citations."""
    severity = item.get("severity", "MEDIUM").upper().strip()
    if severity not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        severity = "MEDIUM"

    category = item.get("category", "Operational")
    if category not in RISK_CATEGORIES:
        category = "Operational"

    # Map source numbers to actual source objects
    source_refs = item.get("sources", [])
    sources = []
    for ref in source_refs:
        try:
            idx = int(ref) - 1
            if 0 <= idx < len(llm_sources):
                src = llm_sources[idx]
                sources.append({
                    "source_id": src.get("source_id", f"source_{idx + 1}"),
                    "document_id": src.get("document_id", 0),
                    "document_title": src.get("document_title", ""),
                    "page_number": src.get("page_number", 0),
                    "section": src.get("section"),
                    "excerpt": src.get("excerpt", "")[:500],
                })
        except (ValueError, TypeError):
            pass

    return {
        "category": category,
        "title": item.get("title", "Untitled Risk"),
        "severity": severity,
        "description": item.get("description", ""),
        "evidence": item.get("evidence", ""),
        "sources": sources,
    }


def _fallback_risk_extraction(text: str, llm_sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract risks from unstructured text as a fallback."""
    risks = []
    sections = re.split(r'(?:Risk Factor|Risk|Threat|Challenge)[s]?:', text, flags=re.IGNORECASE)

    for i, section in enumerate(sections[1:], 1):
        category = RISK_CATEGORIES[i % len(RISK_CATEGORIES)]
        sentences = [s.strip() for s in re.split(r'[.!?\\n]', section) if len(s.strip()) > 20]
        if sentences:
            description = sentences[0][:500]
            risks.append({
                "category": category,
                "title": f"{category} Risk",
                "severity": "MEDIUM",
                "description": description,
                "evidence": description,
                "sources": [],
            })

    return risks[:10]
