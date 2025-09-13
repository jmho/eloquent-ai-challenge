from fastapi import Depends

from app.services.rag_service import get_rag_service, RAGService


def get_rag_service_dependency() -> RAGService:
    """Dependency to get RAG service instance"""
    return get_rag_service()