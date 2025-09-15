from typing import List

import dspy
from app.services.retriever import PineconeRetriever, SearchResult
from pydantic import BaseModel


class RAGPrediction(BaseModel):
    response: str
    reasoning: str
    contexts: List[SearchResult]

class RAG(dspy.Module):
    def __init__(self, retriever: PineconeRetriever):
        super().__init__()
        self._retriever = retriever
        self.respond = dspy.ChainOfThought("context, question -> response")

    def forward(self, question: str) -> RAGPrediction:
        retrieval_result = self._retriever(question)
        context_passages: List[SearchResult] = retrieval_result.results if hasattr(retrieval_result, 'results') else [] # type: ignore We know this should return results
        context = "\n\n".join([passage.text for passage in context_passages])
        response = self.respond(context=context, question=question)

        return RAGPrediction(response=response.response, reasoning=response.reasoning, contexts=context_passages)