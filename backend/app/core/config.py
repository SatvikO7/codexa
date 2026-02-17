from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Codexa"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    
    # Database (MongoDB)
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "codexa"
    
    # Auth
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Gumroad
    GUMROAD_ACCESS_TOKEN: str = ""
    GUMROAD_BASIC_PRODUCT_ID: str = ""
    GUMROAD_PRO_PRODUCT_ID: str = ""
    GUMROAD_PRO_PLUS_PRODUCT_ID: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Cloudflare R2 Storage
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "codexa-uploads"
    R2_ENDPOINT_URL: str = ""  # Will be constructed from account ID
    
    @property
    def r2_endpoint(self) -> str:
        if self.R2_ENDPOINT_URL:
            return self.R2_ENDPOINT_URL
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    
    # File Storage
    MAX_FILE_SIZE: int = 200 * 1024 * 1024  # 200MB
    
    # Token Limits per tier (monthly)
    FREE_TIER_TOKENS: int = 25000
    BASIC_TIER_TOKENS: int = 150000
    PRO_TIER_TOKENS: int = 500000
    PRO_PLUS_TIER_TOKENS: int = 2000000
    
    # Project Limits per tier
    FREE_TIER_PROJECTS: int = 0  # files only
    BASIC_TIER_PROJECTS: int = 1
    PRO_TIER_PROJECTS: int = 5
    PRO_PLUS_TIER_PROJECTS: int = 15
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
