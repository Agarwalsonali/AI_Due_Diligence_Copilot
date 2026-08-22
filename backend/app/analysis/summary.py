import json
import re
from typing import List, Dict, Any
from app.rag.generator import LLMGenerator
from app.rag.prompts import SUMMARY_PROMPT


async def generate_executive_summary(
    company_id: int,
    chunks: List[Dict[str, Any]],
    generator: LLMGenerator,
) -> Dict[str, Any]:
    """Generate an executive summary from document chunks."""

    result = await generator.generate(SUMMARY_PROMPT, "Generate a comprehensive executive summary", chunks)
    answer = result.get("answer", "")
    sources = result.get("sources", [])

    # Parse the structured summary from the LLM response
    summary = {
        "company_id": company_id,
        "executive_summary": answer,
        "key_findings": _extract_key_findings(answer),
        "sources": sources,
    }
    return summary


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
                findings.append(stripped[2:].strip())
            elif stripped and not stripped.startswith("#") and len(findings) > 0:
                # Check if this is a new section heading
                if stripped.endswith(":") or stripped.startswith("**"):
                    capture = False
                elif len(findings) < 10:
                    findings.append(stripped)

    # Fallback: extract bullet points from the entire text
    if not findings:
        for line in lines:
            stripped = line.strip()
            if stripped.startswith("- ") or stripped.startswith("* ") or stripped.startswith("• "):
                findings.append(stripped[2:].strip())

    return findings[:10]  # Limit to 10 findings
