from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.rag.parser import ParsedDocument

class Chunk(BaseModel):
    chunk_index: int
    text: str
    page_number: int
    section: Optional[str]
    token_count: int
    metadata: Dict[str, Any]

def chunk_document(
    parsed_doc: ParsedDocument,
    company_id: int,
    company_name: str,
    document_id: int,
    document_title: str,
    document_type: str
) -> List[Chunk]:
    chunks = []
    chunk_index = 0
    current_section = None
    
    target_tokens = 1000
    overlap = 200
    
    for page in parsed_doc.pages:
        if page.sections:
            current_section = page.sections[0]
            
        words = page.text.split()
        
        i = 0
        while i < len(words):
            chunk_words = words[i:i+target_tokens]
            chunk_text = " ".join(chunk_words)
            
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
                    "chunk_index": chunk_index
                }
            ))
            
            chunk_index += 1
            i += (target_tokens - overlap)
            
    return chunks
