from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # API Settings
    api_title: str = "AI Chatbot Service"
    api_version: str = "1.0.0"
    api_description: str = "AI-powered chatbot service with RAG capabilities using DSPy"
    
    # CORS Settings
    cors_origins_str: str = "http://localhost:3000,http://localhost:5173"
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins_str.split(',')]
    
    # OpenAI Settings
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    
    # Pinecone Settings
    pinecone_api_key: str
    pinecone_index_name: str = "fintech-faqs"
    pinecone_environment: str = "us-east-1"
    
    # Embedding Settings
    embedding_model: str = "all-MiniLM-L6-v2"
    
    # RAG Settings
    max_context_length: int = 4000
    similarity_threshold: float = 0.7
    top_k_results: int = 3
    
    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000
    reload: bool = True
    log_level: str = "info"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()