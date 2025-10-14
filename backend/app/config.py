from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    SYNC_DATABASE_URL: Optional[str] = Field(None, alias="SYNC_DATABASE_URL")
    ASYNC_DATABASE_URL: Optional[str] = Field(None, alias="ASYNC_DATABASE_URL")

    # Secrets
    SECRET_KEY: str

    # JWT configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # default expiry

    # CORS settings
    ALLOWED_ORIGINS: List[AnyHttpUrl] = []

    # Debugging & environment
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # "development", "production", etc.

    # Redis configuration
    REDIS_URL: str = "redis://localhost:6379"  # Safe localhost default for development
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    # Pagination defaults
    PAGE_SIZE: int = 20

    # Logging
    LOG_LEVEL: str = "INFO"

    # Tenant middleware configuration
    TENANT_STRICT_MODE: bool = True  # Require cschema header
    TENANT_ALLOW_DEFAULT_FALLBACK: bool = False  # Allow default fallback
    TENANT_DEVELOPMENT_MODE: bool = False  # Relaxed validation for dev

    class Config:
        env_file = ".env"
        populate_by_name = True  # Enables Field(alias=...) to work


settings = Settings()
