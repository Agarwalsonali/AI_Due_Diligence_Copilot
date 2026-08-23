from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.rag.parser import ParsedDocument

# Known financial-report heading patterns
FINANCIAL_HEADINGS = {
    "risk factors", "business", "financial statements", "financial data",
    "management discussion and analysis", "md&a", "revenue", "competition",
    "liquidity", "debt", "legal proceedings", "market risk",
    "notes to financial statements", "operating segments", "capital expenditure",
    "stock repurchase", "dividends", "shareholders' equity",
    "income statement", "balance sheet", "cash flow",
    "critical accounting estimates", "quantitative disclosures",
    "properties", "employees", "intellectual property",
    "forward-looking statements", "risk management",
    "segment information", "related party transactions",
    "subsequent events", "report of independent auditor",
}


class Chunk(BaseModel):
    chunk_index: int
    text: str
    page_number: int
    section: Optional[str]
    token_count: int
    metadata: Dict[str, Any]


def _detect_section(text_line: str) -> Optional[str]:
    """Detect if a text line is a section heading."""
    line = text_line.strip()
    if not line or len(line) < 3:
        return None
    lower = line.lower().rstrip(":")
    # All-caps short line (common heading style)
    if line.isupper() and 3 < len(line) < 100:
        return line.title()
    # Known financial heading
    for heading in FINANCIAL_HEADINGS:
        if heading in lower:
            return line.title()
    return None


def chunk_document(
    parsed_doc: ParsedDocument,
    company_id: int,
    company_name: str,
    document_id: int,
    document_title: str,
    document_type: str,
    target_tokens: int = 1000,
    overlap_tokens: int = 200,
) -> List[Chunk]:
    """Chunk a parsed document with metadata preservation.

    Each chunk carries full citation metadata: company, document, page, section.
    Chunks are word-boundary aware with configurable overlap.
    """
    chunks: List[Chunk] = []
    chunk_index = 0
    current_section: Optional[str] = None

    for page in parsed_doc.pages:
        # Update section from page headings
        if page.sections:
            detected = _detect_section(page.sections[0])
            if detected:
                current_section = detected

        words = page.text.split()
        if not words:
            continue

        i = 0
        while i < len(words):
            chunk_words = words[i : i + target_tokens]
            chunk_text = " ".join(chunk_words)

            # Skip very short trailing chunks (likely noise)
            if len(chunk_words) < 20 and chunks:
                break

            chunks.append(Chunk(
                chunk_index=chunk_index,
                text=chunk_text,
                page_number=page.page_number,
                section=current_section,
                token_count=len(chunk_words),
                metadata={
                    "company_id": company_id,
                    "company_name": company_name,
                    "document_id": document_id,
                    "document_title": document_title,
                    "document_type": document_type,
                    "page_number": page.page_number,
                    "section": current_section,
                    "chunk_index": chunk_index,
                },
            ))

            chunk_index += 1
            i += target_tokens - overlap_tokens

    return chunks
