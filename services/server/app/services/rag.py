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
        self.respond = dspy.ChainOfThought("rules, history, context, question -> response")

    def forward(self, question: str, history: str = "") -> RAGPrediction:
        retrieval_result = self._retriever.forward(question)
        context_passages: List[SearchResult] = retrieval_result.results if hasattr(retrieval_result, 'results') else [] # type: ignore We know this should return results
        context = "\n\n".join([passage.text for passage in context_passages])
        rules = "You are a AI assistant for a fintech company. Use the provided history and context to answer the question. If the question is unrelated to the fintech company, politely decline to answer."
        response = self.respond(rules=rules, history=history, context=context, question=question)

        return RAGPrediction(response=response.response, reasoning=response.reasoning, contexts=context_passages)