"""Executive summary generation with source citations.

Generates a comprehensive due diligence summary covering:
- Company Overview
- Business Model
- Financial Performance
- Key Strengths
- Key Risks
- Growth Opportunities
- Management Outlook
- Financial Health
- Overall Assessment

Every material factual claim must have a source citation.
"""
import json
import re
from typing import List, Dict, Any
from app.rag.generator import LLMGenerator
from app.core.logging import get_logger

logger = get_logger("executive_summary")

SUMMARY_PROMPT = """You are a senior financial analyst producing an executive due diligence summary.

Using the provided document context, generate a comprehensive executive summary covering these sections:

1. **Company Overview** — What the company does, its market position, and core business.
2. **Business Model** — How the company generates revenue, key segments, and competitive advantages.
3. **Financial Performance** — Revenue, profitability, growth trends. Cite specific numbers.
4. **Key Strengths** — What the company does well, competitive moats, market advantages.
5. **Key Risks** — Material risks facing the company. Reference specific risks from the documents.
6. **Growth Opportunities** — Potential areas for growth and expansion.
7. **Management Outlook** — Forward-looking statements from management (if available).
8. **Financial Health** — Liquidity, leverage, cash flow assessment.
9. **Overall Assessment** — Balanced summary of the investment thesis.

Rules:
- Every material factual claim MUST cite a source as [source_N].
- Use specific numbers and data when available in the documents.
- Use neutral, professional language: "the documents indicate...", "evidence suggests...".
- Do NOT make buy/sell recommendations.
- Do NOT use language like "guaranteed", "certain", or "will definitely".
- If a section cannot be covered from the available evidence, say so.
- Format in clear Markdown with section headings.
- Include key findings as a bullet list at the top.

Return the summary as a JSON object with:
- executive_summary: the full markdown summary text
- key_findings: array of 3-7 key bullet-point findings
- sections: object with section_name → text for each section

Return ONLY the JSON object. No extra explanation."""


async def generate_executive_summary(
    company_id: int,
    chunks: List[Dict[str, Any]],
    generator: LLMGenerator,
) -> Dict[str, Any]:
    """Generate an executive summary from document chunks.

    Every material claim in the output is expected to have a source citation.
    """
    if not chunks:
        logger.info("no_chunks_for_summary", company_id=company_id)
        return {
            "company_id": company_id,
            "executive_summary": "No document evidence available for summary generation.",
            "key_findings": [],
            "sections": {},
            "sources": [],
        }

    result = await generator.generate(
        SUMMARY_PROMPT,
        "Generate a comprehensive executive due diligence summary.",
        chunks,
        temperature=0.0,
    )

    answer = result.get("answer", "")
    sources = result.get("sources", [])

    # Try to parse structured JSON response
    parsed = _parse_summary_response(answer)

    if parsed:
        summary_text = parsed.get("executive_summary", answer)
        key_findings = parsed.get("key_findings", [])
        sections = parsed.get("sections", {})
    else:
        summary_text = answer
        key_findings = _extract_key_findings(answer)
        sections = _extract_sections(answer)

    summary = {
        "company_id": company_id,
        "executive_summary": summary_text,
        "key_findings": key_findings,
        "sections": sections,
        "sources": sources,
    }

    logger.info(
        "summary_complete",
        company_id=company_id,
        summary_length=len(summary_text),
        key_findings_count=len(key_findings),
        sections_count=len(sections),
    )

    return summary


def _parse_summary_response(text: str) -> Dict[str, Any]:
    """Try to parse a JSON response from the LLM."""
    # Find the outermost JSON object
    json_match = re.search(r'\{.*\}', text, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group())
            if isinstance(data, dict) and "executive_summary" in data:
                return data
        except json.JSONDecodeError:
            pass
    return {}


def _extract_key_findings(text: str) -> List[str]:
    """Extract key findings from the summary text."""
    findings = []
    lines = text.split("\n")
    capture = False

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        if any(kw in lower for kw in ["key finding", "key takeaway", "highlights", "summary"]):
            capture = True
            continue

        if capture:
            if stripped.startswith("- ") or stripped.startswith("* ") or stripped.startswith("• "):
                findings.append(stripped.lstrip("-*• ").strip())
            elif stripped and not stripped.startswith("#"):
                if stripped.endswith(":") or stripped.startswith("**"):
                    capture = False
                elif len(findings) < 10:
                    findings.append(stripped)

    # Fallback: extract all bullet points
    if not findings:
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("- ") or stripped.startswith("* ") or stripped.startswith("• "):
                findings.append(stripped.lstrip("-*• ").strip())

    return findings[:10]


def _extract_sections(text: str) -> Dict[str, str]:
    """Extract sections from markdown-formatted summary."""
    sections = {}
    current_section = None
    current_content = []

    for line in text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("## "):
            if current_section and current_content:
                sections[current_section] = "\n".join(current_content).strip()
            current_section = stripped.lstrip("# ").strip()
            current_content = []
        elif stripped.startswith("# ") and not stripped.startswith("## "):
            # Top-level heading — skip
            continue
        else:
            if current_section:
                current_content.append(line)

    if current_section and current_content:
        sections[current_section] = "\n".join(current_content).strip()

    return sections
