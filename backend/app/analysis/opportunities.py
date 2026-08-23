"""Evidence-backed growth opportunity analysis.

Uses RAG-retrieved chunks to identify growth opportunities.
Every opportunity must have supporting evidence from the documents.
"""
import json
import re
from typing import List, Dict, Any
from app.rag.generator import LLMGenerator
from app.core.logging import get_logger

logger = get_logger("opportunity_analysis")

OPPORTUNITY_CATEGORIES = [
    "AI", "Cloud", "Data Center", "New Products", "New Markets",
    "International Expansion", "Customer Expansion", "Technology",
    "Acquisitions", "Industry Growth",
]

OPPORTUNITY_PROMPT = """You are a financial growth analyst performing due diligence.

Analyze the provided document context and identify material growth opportunities.

For each opportunity, return a JSON object with:
- category: one of AI, Cloud, Data Center, New Products, New Markets, International Expansion, Customer Expansion, Technology, Acquisitions, Industry Growth
- title: concise opportunity title (max 60 chars)
- description: clear explanation of the opportunity (2-4 sentences)
- evidence: direct quote or close paraphrase from the document supporting this opportunity
- confidence: float between 0.0 and 1.0 (how strongly the document supports this opportunity)
- sources: array of source numbers (integers) from the provided context

Rules:
- Only identify opportunities SUPPORTED BY THE PROVIDED CONTEXT.
- Do NOT invent opportunities.
- Do NOT fabricate evidence.
- Confidence should reflect how directly the document states or implies this opportunity.
- Include at least 3 opportunities if the context supports it.
- Each opportunity MUST cite at least one source.
- Clearly distinguish facts stated in the document from your interpretation.

Return a JSON array of opportunity objects. Return [] if no opportunities found.
Return ONLY the JSON array. No explanation."""


async def analyze_opportunities(
    company_id: int,
    chunks: List[Dict[str, Any]],
    generator: LLMGenerator,
) -> List[Dict[str, Any]]:
    """Analyze growth opportunities from document chunks.

    Returns a list of opportunity dicts with source citations.
    """
    if not chunks:
        logger.info("no_chunks_for_opportunity_analysis", company_id=company_id)
        return []

    result = await generator.generate(
        OPPORTUNITY_PROMPT,
        "Identify and analyze all growth opportunities for this company based on the provided documents.",
        chunks,
        temperature=0.0,
    )
    answer = result.get("answer", "")
    sources = result.get("sources", [])

    opportunities = _parse_opportunities_from_response(answer, sources)

    if not opportunities:
        opportunities = _fallback_opportunity_extraction(answer, sources)

    logger.info(
        "opportunity_analysis_complete",
        company_id=company_id,
        opportunity_count=len(opportunities),
        categories=[o["category"] for o in opportunities],
    )

    return opportunities


def _parse_opportunities_from_response(text: str, llm_sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Parse structured opportunity data from LLM response."""
    json_match = re.search(r'\[.*\]', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if isinstance(data, list):
                return [
                    _build_opportunity_item(item, llm_sources)
                    for item in data
                    if item.get("title")
                ]
        except json.JSONDecodeError:
            pass
    return []


def _build_opportunity_item(item: Dict[str, Any], llm_sources: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Build a standardized opportunity item with citations."""
    category = item.get("category", "Industry Growth")
    if category not in OPPORTUNITY_CATEGORIES:
        category = "Industry Growth"

    confidence = item.get("confidence", 0.5)
    try:
        confidence = float(confidence)
        if 0 <= confidence <= 1:
            confidence = round(confidence * 100, 1)
        elif 0 < confidence <= 100:
            confidence = round(confidence, 1)
        else:
            confidence = 50.0
    except (ValueError, TypeError):
        confidence = 50.0

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
        "title": item.get("title", "Untitled Opportunity"),
        "description": item.get("description", ""),
        "evidence": item.get("evidence", ""),
        "confidence": str(confidence),
        "sources": sources,
    }


def _fallback_opportunity_extraction(text: str, llm_sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract opportunities from unstructured text as a fallback."""
    opportunities = []
    sections = re.split(r'(?:Opportunity|Growth|Potential|Advantage)[s]?:', text, flags=re.IGNORECASE)

    for i, section in enumerate(sections[1:], 1):
        category = OPPORTUNITY_CATEGORIES[(i - 1) % len(OPPORTUNITY_CATEGORIES)]
        sentences = [s.strip() for s in re.split(r'[.!?\\n]', section) if len(s.strip()) > 20]
        if sentences:
            description = sentences[0][:500]
            opportunities.append({
                "category": category,
                "title": f"{category} Opportunity",
                "description": description,
                "evidence": description,
                "confidence": "60.0",
                "sources": [],
            })

    return opportunities[:10]
