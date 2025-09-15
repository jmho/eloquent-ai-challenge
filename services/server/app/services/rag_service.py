import logging
from functools import lru_cache
from typing import Dict, List, Literal, Optional

import dspy
from app.core.config import settings
from app.services.rag import RAG
from app.services.retriever import PineconeRetriever
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class RagServiceResponse(BaseModel):
    response: str
    reasoning: str
    confidence: float
    status: Literal["success", "error", "no_context"]

class RAGService:
    def __init__(self):
        dspy.configure(
            lm=dspy.LM(
                model=f"openai/{settings.openai_model}"
            )
        )

        self.retriever = PineconeRetriever(
            k=settings.top_k_results,
            threshold=settings.similarity_threshold
        )

        self.rag = RAG(self.retriever)


    async def generate_response(
        self, message: str, conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> RagServiceResponse:
        """Generate response using DSPy RAG module"""
        try:
            # Prepare the question with conversation history if available
            enhanced_question = message
            if conversation_history:
                history_text = "\n".join(
                    [
                        f"{msg['role']}: {msg['content']}"
                        for msg in conversation_history[-3:]  # Last 3 messages for context
                    ]
                )
                enhanced_question = f"Conversation History:\n{history_text}\n\nCurrent Question: {message}"

            # Use DSPy RAG module to generate response
            result = self.rag.forward(enhanced_question)
            
            if not result.contexts:
                return RagServiceResponse(
                    response="I apologize, but I don't have specific information about that topic. "
                    "Please contact our customer support team for assistance.",
                    reasoning="No relevant context found.",
                    confidence=0.0,
                    status="no_context"
                )

            # Calculate average confidence from context scores
            avg_confidence = (
                sum(ctx.score for ctx in result.contexts) / len(result.contexts)
                if result.contexts
                else 0.0
            )

            return RagServiceResponse(
                response=result.response,
                reasoning=result.reasoning,
                confidence=avg_confidence,
                status="success"
            )

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return RagServiceResponse(
                response="I apologize, but I'm having trouble processing your request right now. ",
                reasoning="",
                confidence=0.0,
                status="error"
            )
            


@lru_cache()
def get_rag_service() -> RAGService:
    """Get singleton instance of RAG service"""
    return RAGService()
