from typing import List, Optional

from app.core.config import settings
from app.dependencies import get_rag_service_dependency
from app.services.rag_service import ChatMessage, RAGService
from app.services.retriever import SearchResult
from fastapi import APIRouter, Depends, HTTPException
from openai import OpenAI
from pydantic import BaseModel

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    response: str
    reasoning: str
    confidence: float
    contexts: List[SearchResult]


@router.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat_completion(
    request: ChatRequest,
    rag_service: RAGService = Depends(get_rag_service_dependency)
):
    """Generate AI response using RAG (Retrieval-Augmented Generation)"""
    try:
        response = await rag_service.generate_response(
            message=request.message,
            conversation_history=request.conversation_history
        )

        if response.status == "error":
            raise HTTPException(status_code=500, detail=response.response)
        
        return ChatResponse(
            response=response.response,
            reasoning=response.reasoning,
            confidence=response.confidence,
            contexts=response.contexts
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


class TitleGenerationRequest(BaseModel):
    text: str

class TitleGenerationResponse(BaseModel):
    title: str

@router.post("/generate-title", response_model=TitleGenerationResponse, tags=["chat"])
async def generate_chat_title(request: TitleGenerationRequest):
    """Generate a concise title for chat content"""
    try:

        client = OpenAI()
        
        # Create a simple prompt for title generation
        prompt = f"""Generate a concise, descriptive title (max 100 characters) for the following text. The title should capture the main topic or question:

Text: {request.text}

Title:"""
        
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates concise titles."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_completion_tokens=100,
        )

        title = response.choices[0].message.content or ''
        
        return TitleGenerationResponse(title=title)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating title: {str(e)}")