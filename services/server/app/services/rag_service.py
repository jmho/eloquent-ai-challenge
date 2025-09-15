import logging
from functools import lru_cache
from pathlib import Path
from typing import List, Literal, Optional

import dspy
from app.core.config import settings
from app.services.rag import RAG
from app.services.retriever import PineconeRetriever, SearchResult
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class RagServiceResponse(BaseModel):
    response: str
    reasoning: str
    confidence: float
    contexts: List[SearchResult]
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

        # Check for optimized model in services directory
        optimized_model_path = Path("services/optimized_rag.json")
        if optimized_model_path.exists():
            try:
                logger.info(f"Loading optimized RAG model from {optimized_model_path}")
                self.rag = RAG(self.retriever)
                self.rag.load(str(optimized_model_path))
                logger.info("Successfully loaded optimized RAG model")
            except Exception as e:
                logger.error(f"Failed to load optimized model: {e}. Using default RAG.")
                self.rag = RAG(self.retriever)
        else:
            logger.info("No optimized model found. Using default RAG initialization.")
            self.rag = RAG(self.retriever)


    async def generate_response(
        self, message: str, conversation_history: Optional[List[ChatMessage]] = None
    ) -> RagServiceResponse:
        """Generate response using DSPy RAG module"""
        try:
            # Prepare the question with conversation history if available
            history_str = ""
            if conversation_history:
                history_text = "\n".join(
                    [
                        f"{msg.role}: {msg.content}"
                        for msg in conversation_history
                    ]
                )
                history_str = f"Conversation History:\n{history_text}\n\n"

            # Use DSPy RAG module to generate response
            result = self.rag.forward(message, history_str)

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
                contexts=result.contexts,
                status="success"
            )

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return RagServiceResponse(
                response="I apologize, but I'm having trouble processing your request right now. ",
                reasoning="",
                confidence=0.0,
                contexts=[],
                status="error"
            )
            


@lru_cache()
def get_rag_service() -> RAGService:
    """Get singleton instance of RAG service"""
    return RAGService()
