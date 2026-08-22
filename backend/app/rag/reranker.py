from typing import List, Dict, Any

class BaseReranker:
    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
        raise NotImplementedError

class CrossEncoderReranker(BaseReranker):
    def __init__(self, model_name: str = 'cross-encoder/ms-marco-MiniLM-L-6-v2'):
        try:
            from sentence_transformers import CrossEncoder
            self.model = CrossEncoder(model_name)
        except ImportError:
            self.model = None

    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
        if not self.model or not chunks:
            return chunks[:top_k]
            
        pairs = [[query, chunk['payload'].get('text', '')] for chunk in chunks]
        scores = self.model.predict(pairs)
        
        for chunk, score in zip(chunks, scores):
            chunk['score'] = float(score)
            
        chunks.sort(key=lambda x: x['score'], reverse=True)
        return chunks[:top_k]

class SimpleReranker(BaseReranker):
    """Fallback reranker that uses existing scores"""
    def rerank(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 8) -> List[Dict[str, Any]]:
        chunks.sort(key=lambda x: x.get('score', 0), reverse=True)
        return chunks[:top_k]

def get_reranker() -> BaseReranker:
    try:
        import sentence_transformers
        return CrossEncoderReranker()
    except ImportError:
        return SimpleReranker()
