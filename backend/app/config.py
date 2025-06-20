from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

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

    # Pagination defaults
    PAGE_SIZE: int = 20

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"

settings = Settings()
