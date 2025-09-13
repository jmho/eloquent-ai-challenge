from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.dependencies import get_rag_service_dependency
from app.services.rag_service import RAGService

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = []


class ChatResponse(BaseModel):
    response: str
    context_used: List[Dict[str, Any]]
    confidence: float


@router.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat_completion(
    request: ChatRequest,
    rag_service: RAGService = Depends(get_rag_service_dependency)
):
    """Generate AI response using RAG (Retrieval-Augmented Generation)"""
    try:
        response, context_used, confidence = await rag_service.generate_response(
            message=request.message,
            conversation_history=request.conversation_history
        )
        
        return ChatResponse(
            response=response,
            context_used=context_used,
            confidence=confidence
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")