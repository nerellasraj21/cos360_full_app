from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.config import settings

DATABASE_URL = settings.DATABASE_URL

# Optimized connection pool configuration for high concurrency
engine = create_async_engine(
    DATABASE_URL, 
    echo=False,  # Disable SQL echo for performance
    pool_size=20,              # Number of connections to keep open in pool
    max_overflow=30,           # Additional connections allowed beyond pool_size
    pool_timeout=30,           # Timeout for getting connection from pool
    pool_recycle=3600,         # Recycle connections every hour
    pool_pre_ping=True,        # Verify connections before use
)
# engine = create_engine(DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# AsyncSessionLocal = sessionmaker(
#     bind=engine, class_=AsyncSession, expire_on_commit=False
# )
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# NOTE: get_db() function removed - all endpoints should use get_tenant_db() 
# or get_public_db() for proper multi-tenant support

from contextlib import asynccontextmanager

@asynccontextmanager
async def get_public_db():
    """
    Get database session for public schema operations
    """
    # Create a separate session for public schema operations
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
    
    # Use the same database URL but without the schema search_path constraint
    public_engine = create_async_engine(
        DATABASE_URL, 
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=3600,
        pool_pre_ping=True,
    )
    
    PublicSessionLocal = async_sessionmaker(bind=public_engine, expire_on_commit=False)
    
    async with PublicSessionLocal() as session:
        # Explicitly set search_path to public schema
        await session.execute("SET search_path TO public")
        try:
            yield session
        finally:
            await public_engine.dispose()