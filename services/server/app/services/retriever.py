 
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

    def __init__(self, k: int = 5, threshold: float = 0.7, namespace: str = "__default__"):
        super().__init__(k=k)
        self.threshold = threshold
        self.namespace = namespace

        # Save only lightweight config you need to rebuild the client later.
        self._config = {
            "index_name": settings.pinecone_index_name,
            "namespace": self.namespace,
            "k": self.k,
            "threshold": self.threshold,
        }

        self._pc = Pinecone(api_key=settings.pinecone_api_key)
        self._index = self._pc.Index(self._config["index_name"])

    def forward(self, query: str, k: Optional[int] = None, **kwargs) -> dspy.Prediction:
        try:
            rr = self._index.search(
                namespace=self.namespace,
                query=SearchQuery(inputs={'text': query}, top_k=k or self.k),
                rerank=SearchRerank(model="pinecone-rerank-v0", rank_fields=["text"])
            ).to_dict()

            hits = rr.get("result", {}).get("hits", [])
            matches: List[SearchResult] = []
            passages: List[str] = []

            for h in hits:
                fields = h.get("fields", {}) or {}
                sr = SearchResult(
                    id=h.get("_id"),
                    score=h.get("_score", 0.0),
                    text=fields.get("text", ""),
                    category=fields.get("category", "")
                )
                if sr.score >= self.threshold:
                    matches.append(sr)
                    passages.append(sr.text)

            return dspy.Prediction(passages=passages, results=matches)

        except Exception as e:
            logger.error(f"PineconeRetriever error: {e}")
            return dspy.Prediction(passages=[], results=[])

    # ----- Copy / serialization hooks -----
    def dump_state(self, json_mode: bool = False):
        """Return ONLY lightweight, JSON-serializable config."""
        return {"config": self._config}

    def load_state(self, state):
        """Rebuild clients from config after load."""
        cfg = (state or {}).get("config", None)
        if cfg:
            self._config.update(cfg)
            self.k = int(self._config.get("k", self.k))
            self.threshold = float(self._config.get("threshold", self.threshold))
            self.namespace = self._config.get("namespace", self.namespace)
            # Recreate clients:
            self._init_clients()
        return None

    def __deepcopy__(self, memo):
        """Avoid deepcopying network clients; return self (safe for DSPy)."""
        return self

    def __getstate__(self):
        return {"config": self._config}

    def __setstate__(self, state):
        self._config = state.get("config", {})
        self.k = int(self._config.get("k", 5))
        self.threshold = float(self._config.get("threshold", 0.7))
        self.namespace = self._config.get("namespace", "__default__")
        self._init_clients()

    # ----- Internals -----
    def _init_clients(self):
        self._pc = Pinecone(api_key=settings.pinecone_api_key)
        self._index = self._pc.Index(self._config["index_name"])