from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/", response_model=HealthResponse, tags=["health"])
async def root():
    """Root endpoint for health check"""
    return HealthResponse(
        status="healthy",
        service="AI Chatbot Service",
        version="1.0.0"
    )


@router.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="AI Chatbot Service",
        version="1.0.0"
    )