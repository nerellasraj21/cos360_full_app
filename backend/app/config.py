from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    SYNC_DATABASE_URL: str | None = Field(None, alias="SYNC_DATABASE_URL")
    ASYNC_DATABASE_URL: str | None = Field(None, alias="ASYNC_DATABASE_URL")

    # Secrets
    SECRET_KEY: str

    # JWT configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # default expiry

    # CORS settings - accepts both "*" or list of URLs
    ALLOWED_ORIGINS: list[str] = ["*"]

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
    TENANT_DEFAULT_NAME: str = "default"  # Default tenant name for fallback

    # S3 / File Storage configuration
    S3_BUCKET: str = ""  # e.g. "cos360-tenant-files-staging" for Railway, "cos360-tenant-files-prod" for AWS
    S3_REGION: str = "ap-south-1"
    S3_ENDPOINT_URL: str | None = None  # Optional: for Cloudflare R2 or custom endpoints
    STALE_FILE_TTL_DAYS: int = 10  # Days before stale files are permanently deleted

    class Config:
        env_file = ".env"
        populate_by_name = True  # Enables Field(alias=...) to work
        extra = "ignore"  # Ignore unknown env vars (e.g. SCHEMA_NAME used by alembic, AWS_ACCESS_KEY_ID)


settings = Settings()
