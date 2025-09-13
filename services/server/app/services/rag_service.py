import dspy
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional, Tuple
import logging
from functools import lru_cache

from app.core.config import settings
from app.services.retriever import PineconeRetriever

logger = logging.getLogger(__name__)

class RAG(dspy.Module):
    def __init__(self, retriever):
        super().__init__()
        self.retriever = retriever
        self.respond = dspy.ChainOfThought("context, question -> response")

    def forward(self, question: str):
        retrieval_result = self.retriever(question, k=self.retriever.k)
        context_passages = retrieval_result.passages
        context = "\n\n".join(context_passages)
        response = self.respond(context=context, question=question)
        
        # Include context metadata in the response
        response.contexts = getattr(retrieval_result, 'contexts', [])
        return response


class RAGService:

    def __init__(self):
        # Initialize Pinecone
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index = self.pc.Index(settings.pinecone_index_name)

        # Initialize embedding model
        self.encoder = SentenceTransformer(settings.embedding_model)

        # Configure DSPy with OpenAI
        dspy.configure(
            lm=dspy.LM(
                model=f"openai/{settings.openai_model}", api_key=settings.openai_api_key
            )
        )

        # Initialize retriever and RAG module
        self.retriever = PineconeRetriever(
            index=self.index,
            encoder=self.encoder,
            k=settings.top_k_results,
            threshold=settings.similarity_threshold
        )
        self.rag = RAG(self.retriever)


    async def generate_response(
        self, message: str, conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, List[Dict[str, Any]], float]:
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
            response = self.rag(enhanced_question)
            
            contexts = getattr(response, 'contexts', [])
            
            if not contexts:
                return (
                    "I apologize, but I don't have specific information about that topic. "
                    "Please contact our customer support team for assistance.",
                    [],
                    0.0,
                )

            # Calculate average confidence from context scores
            avg_confidence = (
                sum(ctx["score"] for ctx in contexts) / len(contexts)
                if contexts
                else 0.0
            )

            return response.answer, contexts, avg_confidence

        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return (
                "I apologize, but I'm having trouble processing your request right now. "
                "Please try again later or contact customer support.",
                [],
                0.0,
            )


@lru_cache()
def get_rag_service() -> RAGService:
    """Get singleton instance of RAG service"""
    return RAGService()
