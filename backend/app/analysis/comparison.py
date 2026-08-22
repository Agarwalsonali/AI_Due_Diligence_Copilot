from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Company, FinancialMetric
from app.rag.generator import LLMGenerator
from app.rag.prompts import COMPARISON_PROMPT


async def compare_companies(
    company_ids: List[int],
    chunks_by_company: Dict[int, List[Dict[str, Any]]],
    generator: LLMGenerator,
) -> Dict[str, Any]:
    """Compare multiple companies based on their document chunks."""

    # Build context with company labels
    context_parts = []
    company_names = {}
    for cid, chunks in chunks_by_company.items():
        company_name = chunks[0].get("payload", {}).get("company_name", f"Company {cid}") if chunks else f"Company {cid}"
        company_names[cid] = company_name
        context_parts.append(f"\n=== {company_name} (ID: {cid}) ===")
        for chunk in chunks[:10]:  # Limit chunks per company
            payload = chunk.get("payload", {})
            context_parts.append(
                f"[Source] Title: {payload.get('document_title', 'Unknown')} | "
                f"Page: {payload.get('page_number', 'N/A')}\n"
                f"{payload.get('text', '')}"
            )

    combined_context = "\n".join(context_parts)

    result = await generator.generate(
        COMPARISON_PROMPT,
        f"Compare these companies: {', '.join(company_names.values())}",
        [{"payload": {"text": combined_context, "document_title": "Combined Context"}}],
    )

    return {
        "company_ids": company_ids,
        "company_names": company_names,
        "comparison": result.get("answer", ""),
        "sources": result.get("sources", []),
    }
