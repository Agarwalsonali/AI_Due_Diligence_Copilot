"""Context builder for LLM generation.

Assembles retrieved chunks into a structured context block that
the LLM can use for evidence-based answering.

Each source block includes:
- Source ID
- Document title
- Page number
- Section
- Excerpt text
"""
from typing import List, Dict, Any, Optional
from app.core.logging import get_logger

logger = get_logger("context")


def build_context(
    chunks: List[Dict[str, Any]],
    max_excerpt_chars: int = 2000,
    max_sources: int = 10,
) -> str:
    """Build a context string from retrieved chunks for LLM consumption.

    Args:
        chunks: Retrieved chunks with payload containing text, document_title, page_number, section.
        max_excerpt_chars: Maximum characters per source excerpt.
        max_sources: Maximum number of sources to include.

    Returns:
        Formatted context string.
    """
    if not chunks:
        return "No relevant context found in the available documents."

    context_parts = []
    seen_signatures = set()  # Deduplicate similar chunks
    source_count = 0

    for chunk in chunks:
        if source_count >= max_sources:
            break

        payload = chunk.get("payload", {})
        text = payload.get("text", "").strip()
        if not text:
            continue

        # Dedup: skip chunks with very similar text from same page
        doc_id = payload.get("document_id", "")
        page = payload.get("page_number", "")
        sig = f"{doc_id}:{page}:{text[:80]}"
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)

        source_count += 1
        source_id = f"source_{source_count}"

        document_title = payload.get("document_title", "Unknown Document")
        page_number = payload.get("page_number", "N/A")
        section = payload.get("section", "N/A")
        chunk_index = payload.get("chunk_index", "?")

        # Truncate text if too long
        if len(text) > max_excerpt_chars:
            text = text[:max_excerpt_chars] + "..."

        block = (
            f"[{source_id}]\n"
            f"Document: {document_title}\n"
            f"Page: {page_number}\n"
            f"Section: {section}\n"
            f"Chunk: {chunk_index}\n"
            f"\n"
            f"{text}\n"
        )
        context_parts.append(block)

    if not context_parts:
        return "No relevant context found in the available documents."

    header = f"Retrieved {len(context_parts)} relevant source(s) from the document collection:\n\n"
    return header + "\n---\n\n".join(context_parts)


def build_source_list(chunks: List[Dict[str, Any]], max_sources: int = 10) -> List[Dict[str, Any]]:
    """Build a structured source list for the API response.

    Returns a list of source citation objects with deduplication.
    """
    sources = []
    seen_signatures = set()
    source_count = 0

    for chunk in chunks:
        if source_count >= max_sources:
            break

        payload = chunk.get("payload", {})
        text = payload.get("text", "").strip()
        if not text:
            continue

        # Dedup
        doc_id = payload.get("document_id", "")
        page = payload.get("page_number", "")
        sig = f"{doc_id}:{page}:{text[:80]}"
        if sig in seen_signatures:
            continue
        seen_signatures.add(sig)

        source_count += 1

        # Truncate excerpt for API response
        excerpt = text[:500] + "..." if len(text) > 500 else text

        sources.append({
            "source_id": f"source_{source_count}",
            "document_id": doc_id,
            "document_title": payload.get("document_title", "Unknown"),
            "page_number": page,
            "section": payload.get("section"),
            "excerpt": excerpt,
            "score": round(chunk.get("score", 0), 4),
        })

    return sources


def estimate_confidence(chunks: List[Dict[str, Any]], answer_length: int) -> float:
    """Estimate confidence based on retrieval quality and answer characteristics.

    This is NOT statistically calibrated. It's a heuristic estimate.
    """
    if not chunks:
        return 0.0

    # Factor 1: Top retrieval score
    top_score = max(c.get("score", 0) for c in chunks)

    # Factor 2: Number of supporting chunks
    chunk_factor = min(len(chunks) / 5, 1.0)  # 5+ chunks = full factor

    # Factor 3: Score distribution (if top chunk is much better, more confident)
    scores = sorted([c.get("score", 0) for c in chunks], reverse=True)
    if len(scores) >= 2 and scores[0] > 0:
        score_gap = scores[0] - scores[1]
        gap_factor = min(score_gap * 2, 1.0)
    else:
        gap_factor = 0.5

    # Factor 4: Answer length (too short might mean insufficient evidence)
    if answer_length < 50:
        length_factor = 0.3
    elif answer_length < 200:
        length_factor = 0.7
    else:
        length_factor = 1.0

    confidence = (
        0.40 * top_score +
        0.25 * chunk_factor +
        0.15 * gap_factor +
        0.20 * length_factor
    )

    return round(min(max(confidence, 0.0), 1.0), 2)
