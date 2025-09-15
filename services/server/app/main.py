from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(".env")

from app.core.config import settings
from app.routers import chat, health

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
)

# Set up CORS middleware for internal communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(chat.router, prefix="/api/v1")