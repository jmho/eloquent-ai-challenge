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
        retrieval_result = self.retriever(question)
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

    def encode_query(self, query: str) -> List[float]:
        """Encode user query into vector representation"""
        return self.encoder.encode(query).tolist()

    def retrieve_context(self, query: str, top_k: int = None) -> List[Dict[str, Any]]:
        """Retrieve relevant context from Pinecone vector database"""
        if top_k is None:
            top_k = settings.top_k_results

        try:
            query_vector = self.encode_query(query)

            results = self.index.query(
                vector=query_vector, top_k=top_k, include_metadata=True
            )

            contexts = []
            for match in results["matches"]:
                if match["score"] > settings.similarity_threshold:
                    contexts.append(
                        {
                            "text": match["metadata"].get("text", ""),
                            "category": match["metadata"].get("category", ""),
                            "question": match["metadata"].get("question", ""),
                            "score": match["score"],
                        }
                    )

            return contexts

        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return []

    async def generate_response(
        self, message: str, conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Tuple[str, List[Dict[str, Any]], float]:
        """Generate response using DSPy with retrieved context"""
        try:
            # Retrieve relevant context
            contexts = self.retrieve_context(message)

            if not contexts:
                return (
                    "I apologize, but I don't have specific information about that topic. "
                    "Please contact our customer support team for assistance.",
                    [],
                    0.0,
                )

            # Prepare context for DSPy
            context_text = "\n\n".join(
                [
                    f"Category: {ctx['category']}\nQ: {ctx['question']}\nA: {ctx['text']}"
                    for ctx in contexts
                ]
            )

            # Add conversation history if available
            if conversation_history:
                history_text = "\n".join(
                    [
                        f"{msg['role']}: {msg['content']}"
                        for msg in conversation_history[
                            -3:
                        ]  # Last 3 messages for context
                    ]
                )
                context_text = f"Conversation History:\n{history_text}\n\nKnowledge Base:\n{context_text}"

            # Use DSPy to generate response
            rag_module = dspy.Predict(self.rag_signature)
            response = rag_module(context=context_text, question=message)

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
