from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from typing import Optional
import dspy
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class PineconeRetriever(dspy.Retrieve):
    """
    Queries a Pinecone index and returns passages for DSPy.
    Uses SentenceTransformers for embedding generation.
    """

    def __init__(self, index, encoder, k=5, namespace=None, filter=None, threshold=0.7):
        super().__init__(k=k)
        self.index = index
        self.encoder = encoder
        self.namespace = namespace
        self.filter = filter
        self.threshold = threshold

    def _embed(self, texts):
        """Generate embeddings using SentenceTransformers"""
        if isinstance(texts, str):
            texts = [texts]
        return [self.encoder.encode(text).tolist() for text in texts]

    def forward(self, query: str, k: Optional[int] = None, **kwargs) -> dspy.Prediction:
        """Retrieve relevant passages from Pinecone"""
        try:
            qvec = self._embed([query])[0]
            res = self.index.query(
                vector=qvec,
                top_k=k,
                include_metadata=True,
                namespace=self.namespace,
                filter=self.filter,
            )

            passages = []
            contexts = []

            for match in res.matches:
                if match.score > self.threshold:
                    md = match.metadata or {}
                    text = md.get("text") or md.get("answer") or ""
                    if text:
                        passages.append(text)
                        contexts.append(
                            {
                                "text": text,
                                "category": md.get("category", ""),
                                "question": md.get("question", ""),
                                "score": match.score,
                            }
                        )

            # Return DSPy prediction with passages and additional context metadata
            prediction = dspy.Prediction(passages=passages)
            prediction.contexts = contexts  # Add context metadata for detailed info
            return prediction

        except Exception as e:
            logger.error(f"Error in PineconeRetriever: {e}")
            return dspy.Prediction(passages=[], contexts=[])
