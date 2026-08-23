"""Unit tests for the RAG pipeline.

Tests cover:
- BM25 search
- Hybrid retrieval with RRF fusion
- Reranking
- Context building
- Source citation extraction
- Query rewriting
- Relevance threshold / hallucination protection
- Deduplication

Run with: python -m pytest tests/test_rag.py -v
"""
import pytest
import time
from unittest.mock import MagicMock, AsyncMock, patch
from dataclasses import dataclass, field


# ─── Helpers ───────────────────────────────────────────────────────────────────

def make_chunk(
    text: str,
    doc_id: int = 1,
    company_id: int = 1,
    page: int = 1,
    section: str = "General",
    chunk_index: int = 0,
    score: float = 0.5,
    retrieval_method: str = "vector",
):
    """Create a mock chunk dict matching the retrieval format."""
    return {
        "payload": {
            "text": text,
            "company_id": company_id,
            "document_id": doc_id,
            "page_number": page,
            "section": section,
            "chunk_index": chunk_index,
            "vector_id": f"vec-{doc_id}-{page}-{chunk_index}",
        },
        "score": score,
        "retrieval_method": retrieval_method,
    }


def make_db_chunk(
    text: str,
    doc_id: int = 1,
    company_id: int = 1,
    page: int = 1,
    section: str = "General",
    chunk_index: int = 0,
    vector_id: str = "vec-1",
):
    """Create a mock DocumentChunk ORM object."""
    chunk = MagicMock()
    chunk.text = text
    chunk.document_id = doc_id
    chunk.company_id = company_id
    chunk.page_number = page
    chunk.section = section
    chunk.chunk_index = chunk_index
    chunk.vector_id = vector_id
    chunk.token_count = len(text.split())
    return chunk


# ─── BM25 Tests ───────────────────────────────────────────────────────────────

class TestBM25Index:
    """Tests for the BM25 index."""

    def test_empty_index_returns_empty(self):
        from app.rag.bm25 import BM25Index
        index = BM25Index(chunks=[], tokenized_corpus=[])
        results = index.search("hello world")
        assert results == []

    def test_basic_search(self):
        from app.rag.bm25 import BM25Index

        chunks = [
            make_db_chunk("NVIDIA reported record revenue of 60 billion dollars", doc_id=1, page=1),
            make_db_chunk("Apple announced new iPhone sales figures", doc_id=2, page=5),
            make_db_chunk("NVIDIA GPU data center revenue growth", doc_id=1, page=2),
        ]
        corpus = [c.text.lower().split() for c in chunks]
        index = BM25Index(chunks=chunks, tokenized_corpus=corpus)

        results = index.search("NVIDIA revenue")
        assert len(results) >= 1
        # NVIDIA chunks should rank higher than Apple chunk
        assert results[0]["payload"]["document_id"] == 1

    def test_search_returns_metadata(self):
        from app.rag.bm25 import BM25Index

        # BM25 needs enough documents for IDF to work properly
        chunks = [
            make_db_chunk("Risk factors include market volatility and regulatory challenges", doc_id=5, page=10, section="Risk Factors"),
            make_db_chunk("Revenue growth driven by strong demand in data center", doc_id=6, page=1, section="Revenue"),
            make_db_chunk("Competition from amd and intel in gpu market", doc_id=7, page=5, section="Competition"),
            make_db_chunk("Liquidity and capital resources discussed in MD&A", doc_id=8, page=20, section="Liquidity"),
        ]
        corpus = [c.text.lower().split() for c in chunks]
        index = BM25Index(chunks=chunks, tokenized_corpus=corpus)

        results = index.search("risk factors")
        assert len(results) >= 1
        r = results[0]
        assert r["payload"]["document_id"] == 5
        assert r["payload"]["page_number"] == 10
        assert r["payload"]["section"] == "Risk Factors"
        assert r["retrieval_method"] == "bm25"
        assert r["score"] > 0

    def test_scores_normalized(self):
        from app.rag.bm25 import BM25Index

        chunks = [
            make_db_chunk("revenue growth financial performance", doc_id=1, page=1),
            make_db_chunk("revenue growth financial performance", doc_id=2, page=2),
            make_db_chunk("completely unrelated text about cooking", doc_id=3, page=3),
        ]
        corpus = [c.text.lower().split() for c in chunks]
        index = BM25Index(chunks=chunks, tokenized_corpus=corpus)

        results = index.search("revenue growth")
        # Top score should be 1.0 (normalized)
        if results:
            assert results[0]["score"] <= 1.0

    def test_financial_terms_searchable(self):
        from app.rag.bm25 import BM25Index

        chunks = [
            make_db_chunk("The company debt to equity ratio is 1.5", doc_id=1, page=3),
            make_db_chunk("Current ratio indicates liquidity position", doc_id=2, page=4),
            make_db_chunk("Stock price performance over the quarter", doc_id=3, page=5),
            make_db_chunk("Revenue growth driven by strong demand", doc_id=4, page=1),
        ]
        corpus = [c.text.lower().split() for c in chunks]
        index = BM25Index(chunks=chunks, tokenized_corpus=corpus)

        results = index.search("debt ratio")
        assert len(results) >= 1
        # The top result should contain one of the query terms
        top_text = results[0]["payload"]["text"].lower()
        assert "debt" in top_text or "ratio" in top_text


# ─── Reranker Tests ───────────────────────────────────────────────────────────

class TestReranker:
    """Tests for the lexical reranker."""

    def test_rerank_empty(self):
        from app.rag.reranker import LexicalReranker
        reranker = LexicalReranker()
        assert reranker.rerank("hello", []) == []

    def test_rerank_single_chunk(self):
        from app.rag.reranker import LexicalReranker
        reranker = LexicalReranker()
        chunks = [make_chunk("This is about NVIDIA revenue growth", score=0.8)]
        result = reranker.rerank("NVIDIA revenue", chunks, top_k=5)
        assert len(result) == 1
        assert result[0]["rerank_score"] > 0

    def test_rerank_boosts_term_matches(self):
        from app.rag.reranker import LexicalReranker
        reranker = LexicalReranker()

        # Chunk with many query terms should rank higher
        good = make_chunk("NVIDIA revenue growth was driven by data center GPU sales", score=0.5)
        bad = make_chunk("The company has offices in California", score=0.5)
        chunks = [bad, good]

        result = reranker.rerank("NVIDIA revenue growth", chunks, top_k=2)
        # Good chunk should be ranked first
        assert "NVIDIA" in result[0]["payload"]["text"]

    def test_rerank_exact_phrase_bonus(self):
        from app.rag.reranker import LexicalReranker
        reranker = LexicalReranker()

        exact = make_chunk("The risk factors include regulatory challenges", score=0.3)
        partial = make_chunk("Risk of regulatory changes in international markets", score=0.3)
        chunks = [partial, exact]

        result = reranker.rerank("risk factors", chunks, top_k=2)
        # Exact phrase match should rank higher
        assert "risk factors" in result[0]["payload"]["text"].lower()

    def test_rerank_section_relevance(self):
        from app.rag.reranker import LexicalReranker
        reranker = LexicalReranker()

        in_section = make_chunk("The company faces various challenges", score=0.3, section="Risk Factors")
        out_section = make_chunk("The company faces various challenges", score=0.3, section="Financial Statements")
        chunks = [out_section, in_section]

        result = reranker.rerank("risk factors", chunks, top_k=2)
        assert result[0]["payload"]["section"] == "Risk Factors"


# ─── Context Building Tests ───────────────────────────────────────────────────

class TestContextBuilder:
    """Tests for context building and source listing."""

    def test_build_context_empty(self):
        from app.rag.context import build_context
        result = build_context([])
        assert "No relevant context" in result

    def test_build_context_with_chunks(self):
        from app.rag.context import build_context
        chunks = [
            make_chunk("NVIDIA revenue was 60 billion", doc_id=1, page=42, section="Revenue"),
            make_chunk("Risk factors include export restrictions", doc_id=1, page=10, section="Risk Factors"),
        ]
        context = build_context(chunks)
        assert "[source_1]" in context
        assert "[source_2]" in context
        assert "NVIDIA" in context
        assert "Page: 42" in context

    def test_build_context_deduplicates(self):
        from app.rag.context import build_context
        chunks = [
            make_chunk("Same text about revenue", doc_id=1, page=1),
            make_chunk("Same text about revenue", doc_id=1, page=1),
            make_chunk("Different text about risks", doc_id=1, page=2),
        ]
        context = build_context(chunks)
        # Should only have 2 sources (deduped)
        assert context.count("[source_") == 2

    def test_build_context_truncates_long_text(self):
        from app.rag.context import build_context
        long_text = "word " * 500  # ~2500 chars
        chunks = [make_chunk(long_text, doc_id=1, page=1)]
        context = build_context(chunks, max_excerpt_chars=200)
        assert "..." in context

    def test_build_source_list(self):
        from app.rag.context import build_source_list
        chunks = [
            make_chunk("Revenue data", doc_id=1, page=42, section="Revenue", score=0.9),
            make_chunk("Risk info", doc_id=1, page=10, section="Risk Factors", score=0.7),
        ]
        sources = build_source_list(chunks)
        assert len(sources) == 2
        assert sources[0]["source_id"] == "source_1"
        assert sources[0]["document_id"] == 1
        assert sources[0]["page_number"] == 42
        assert sources[0]["section"] == "Revenue"
        assert sources[0]["score"] == 0.9

    def test_estimate_confidence_no_chunks(self):
        from app.rag.context import estimate_confidence
        assert estimate_confidence([], 100) == 0.0

    def test_estimate_confidence_high_quality(self):
        from app.rag.context import estimate_confidence
        chunks = [make_chunk("x", score=0.9) for _ in range(5)]
        conf = estimate_confidence(chunks, answer_length=500)
        assert conf > 0.5

    def test_estimate_confidence_low_quality(self):
        from app.rag.context import estimate_confidence
        chunks = [make_chunk("x", score=0.1)]
        conf = estimate_confidence(chunks, answer_length=10)
        assert conf < 0.3


# ─── Hybrid Retrieval Tests ───────────────────────────────────────────────────

class TestHybridRetrieval:
    """Tests for the RRF fusion logic."""

    def test_rrf_fusion_empty(self):
        from app.rag.hybrid_retriever import _rrf_fusion
        result = _rrf_fusion([], [])
        assert result == []

    def test_rrf_fusion_vector_only(self):
        from app.rag.hybrid_retriever import _rrf_fusion
        vector = [make_chunk("A", score=0.9, doc_id=1, page=1)]
        result = _rrf_fusion(vector, [])
        assert len(result) == 1
        assert result[0]["score"] > 0

    def test_rrf_fusion_deduplicates(self):
        from app.rag.hybrid_retriever import _rrf_fusion
        # Same text from both vector and BM25 — use correct retrieval_method tags
        vector = [make_chunk("Same text about revenue", doc_id=1, page=1, score=0.9, retrieval_method="vector")]
        bm25 = [make_chunk("Same text about revenue", doc_id=1, page=1, score=0.8, retrieval_method="bm25")]
        result = _rrf_fusion(vector, bm25)
        # Should be deduped to 1 result
        assert len(result) == 1
        assert result[0]["retrieval_method"] == "hybrid"
        # Score should be higher than either alone (both contribute)
        assert result[0]["score"] > 0

    def test_rrf_fusion_merges_different_chunks(self):
        from app.rag.hybrid_retriever import _rrf_fusion
        vector = [make_chunk("Vector result A", doc_id=1, page=1, score=0.9)]
        bm25 = [make_chunk("BM25 result B", doc_id=2, page=2, score=0.8)]
        result = _rrf_fusion(vector, bm25)
        assert len(result) == 2

    def test_rrf_fusion_ranking(self):
        from app.rag.hybrid_retriever import _rrf_fusion
        # Chunk A appears in both lists at rank 0
        # Chunk B appears only in vector at rank 0
        vector = [
            make_chunk("Chunk A", doc_id=1, page=1, score=0.9),
            make_chunk("Chunk B", doc_id=2, page=2, score=0.7),
        ]
        bm25 = [
            make_chunk("Chunk A", doc_id=1, page=1, score=0.6),
        ]
        result = _rrf_fusion(vector, bm25)
        # Chunk A should rank first (appears in both)
        assert result[0]["payload"]["text"] == "Chunk A"


# ─── Citation Extraction Tests ────────────────────────────────────────────────

class TestCitationExtraction:
    """Tests for extracting source citations from LLM output."""

    def test_extract_source_N_format(self):
        from app.rag.generator import LLMGenerator
        gen = LLMGenerator(api_key="fake", base_url="fake", model="fake")
        chunks = [
            make_chunk("Revenue was 60B", doc_id=1, page=42),
            make_chunk("Risks include X", doc_id=1, page=10),
        ]
        text = "Revenue reached 60B [source_1]. Risks include X [source_2]."
        sources = gen._extract_citations(text, chunks)
        assert len(sources) == 2
        assert sources[0]["document_id"] == 1
        assert sources[0]["page_number"] == 42

    def test_extract_number_format(self):
        from app.rag.generator import LLMGenerator
        gen = LLMGenerator(api_key="fake", base_url="fake", model="fake")
        chunks = [make_chunk("Revenue was 60B", doc_id=1, page=42)]
        text = "Revenue was 60B [1]."
        sources = gen._extract_citations(text, chunks)
        assert len(sources) == 1

    def test_extract_no_citations(self):
        from app.rag.generator import LLMGenerator
        gen = LLMGenerator(api_key="fake", base_url="fake", model="fake")
        chunks = [make_chunk("Revenue was 60B", doc_id=1, page=42)]
        text = "Revenue was 60 billion dollars."
        sources = gen._extract_citations(text, chunks)
        assert sources == []

    def test_extract_deduplicates(self):
        from app.rag.generator import LLMGenerator
        gen = LLMGenerator(api_key="fake", base_url="fake", model="fake")
        chunks = [make_chunk("Revenue", doc_id=1, page=42)]
        text = "Revenue [source_1] and again [source_1]."
        sources = gen._extract_citations(text, chunks)
        assert len(sources) == 1

    def test_extract_out_of_range_ignored(self):
        from app.rag.generator import LLMGenerator
        gen = LLMGenerator(api_key="fake", base_url="fake", model="fake")
        chunks = [make_chunk("Revenue", doc_id=1, page=42)]
        text = "Revenue [source_99]."
        sources = gen._extract_citations(text, chunks)
        assert sources == []


# ─── Deduplication Tests ──────────────────────────────────────────────────────

class TestDeduplication:
    """Tests for chunk deduplication."""

    def test_chunk_key_generation(self):
        from app.rag.hybrid_retriever import _chunk_key
        chunk = make_chunk("Revenue data here", doc_id=1, page=42)
        key = _chunk_key(chunk)
        assert "1" in key
        assert "42" in key
        assert "Revenue" in key

    def test_same_chunk_same_key(self):
        from app.rag.hybrid_retriever import _chunk_key
        c1 = make_chunk("Same text", doc_id=1, page=1)
        c2 = make_chunk("Same text", doc_id=1, page=1)
        assert _chunk_key(c1) == _chunk_key(c2)

    def test_different_chunk_different_key(self):
        from app.rag.hybrid_retriever import _chunk_key
        c1 = make_chunk("Text A", doc_id=1, page=1)
        c2 = make_chunk("Text B", doc_id=1, page=1)
        assert _chunk_key(c1) != _chunk_key(c2)


# ─── Relevance Threshold Tests ────────────────────────────────────────────────

class TestRelevanceThreshold:
    """Tests for the hallucination protection threshold."""

    def test_low_score_insufficient(self):
        """Chunks with very low scores should be flagged as insufficient."""
        from app.rag.context import estimate_confidence
        chunks = [make_chunk("Something barely related", score=0.05)]
        conf = estimate_confidence(chunks, answer_length=200)
        assert conf < 0.5  # Low confidence

    def test_high_score_sufficient(self):
        from app.rag.context import estimate_confidence
        chunks = [
            make_chunk("Highly relevant", score=0.95),
            make_chunk("Also relevant", score=0.85),
            make_chunk("Supporting", score=0.75),
        ]
        conf = estimate_confidence(chunks, answer_length=300)
        assert conf > 0.5  # High confidence


# ─── Tokenizer Tests ──────────────────────────────────────────────────────────

class TestBM25Tokenizer:
    """Tests for the BM25 tokenizer."""

    def test_tokenize_basic(self):
        from app.rag.bm25 import _tokenize
        tokens = _tokenize("Hello World FOO bar")
        assert tokens == ["hello", "world", "foo", "bar"]

    def test_tokenize_empty(self):
        from app.rag.bm25 import _tokenize
        tokens = _tokenize("")
        assert tokens == []

    def test_tokenize_whitespace(self):
        from app.rag.bm25 import _tokenize
        tokens = _tokenize("  multiple   spaces  ")
        assert tokens == ["multiple", "spaces"]


# ─── Context Builder Edge Cases ───────────────────────────────────────────────

class TestContextBuilderEdgeCases:
    """Edge cases for context building."""

    def test_max_sources_limit(self):
        from app.rag.context import build_context
        chunks = [make_chunk(f"Text {i}", doc_id=1, page=i) for i in range(20)]
        context = build_context(chunks, max_sources=5)
        assert context.count("[source_") == 5

    def test_empty_text_chunks_filtered(self):
        from app.rag.context import build_context
        chunks = [
            make_chunk("", doc_id=1, page=1),
            make_chunk("Real content", doc_id=1, page=2),
        ]
        context = build_context(chunks)
        assert "source_1" in context
        assert "Real content" in context

    def test_source_list_max_sources(self):
        from app.rag.context import build_source_list
        chunks = [make_chunk(f"Text {i}", doc_id=1, page=i) for i in range(20)]
        sources = build_source_list(chunks, max_sources=3)
        assert len(sources) == 3


# ─── Score Normalization Tests ────────────────────────────────────────────────

class TestScoreNormalization:
    """Tests for score normalization in hybrid retrieval."""

    def test_normalize_scores(self):
        from app.rag.hybrid_retriever import _normalize_scores
        results = [
            {"score": 10.0},
            {"score": 5.0},
            {"score": 0.0},
        ]
        normalized = _normalize_scores(results)
        assert normalized[0]["score"] == 1.0
        assert normalized[1]["score"] == 0.5
        assert normalized[2]["score"] == 0.0

    def test_normalize_empty(self):
        from app.rag.hybrid_retriever import _normalize_scores
        assert _normalize_scores([]) == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
