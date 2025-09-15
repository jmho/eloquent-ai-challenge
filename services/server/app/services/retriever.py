import logging
from typing import List, Optional

import dspy
from app.core.config import settings
from pinecone import Pinecone, SearchQuery, SearchRerank
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class SearchResult(BaseModel):
    id: str
    score: float
    text: str
    category: str

class PineconeRetriever(dspy.Retrieve):
    """
    Queries a Pinecone index and returns passages for DSPy.
    Uses SentenceTransformers for embedding generation.
    """

    def __init__(self, k=5, threshold=0.7):
        super().__init__(k=k)
        self.threshold = threshold
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index = self.pc.Index(settings.pinecone_index_name)

    def forward(self, query: str, k: Optional[int] = None, **kwargs) -> dspy.Prediction:
        """Retrieve relevant passages from Pinecone"""
        try:
            reranked_results = self.index.search(
                namespace="__default__",
                query=SearchQuery(
                    inputs={
                        'text': query
                    },
                    top_k=k or self.k,
                ),
                rerank=SearchRerank(
                    model="bge-reranker-v2-m3",
                    rank_fields=["text"],
                ) 
            )

            # Extract hits from the search response
            response_dict = reranked_results.to_dict()
            hits = response_dict.get("result", {}).get("hits", [])
            
            # Serialize hits into SearchResult objects
            matches: List[SearchResult] = []
            for hit in hits:
                match = SearchResult(
                    id=hit.get("_id"),
                    score=hit.get("_score", 0.0),
                    text=hit.get("fields", {}).get("text", ""),
                    category=hit.get("fields", {}).get("category", "")
                )
                matches.append(match)

            # Filter results based on similarity threshold
            filtered_results = [res for res in matches if res.score >= self.threshold]

            return dspy.Prediction(results=filtered_results)

        except Exception as e:
            logger.error(f"Error in PineconeRetriever: {e}")
            return dspy.Prediction(results=[])
