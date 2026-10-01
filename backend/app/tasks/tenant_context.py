from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings


@asynccontextmanager
async def task_tenant_session(tenant_id: str) -> AsyncGenerator[AsyncSession, None]:
    """Session for a background task. Each task runs in its own event loop, so it owns its engine."""
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            session.info["tenant_id"] = str(tenant_id)
            yield session
    finally:
        await engine.dispose()


@asynccontextmanager
async def task_platform_session() -> AsyncGenerator[AsyncSession, None]:
    """Session for platform tables (no tenant), such as listing active tenants."""
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            yield session
    finally:
        await engine.dispose()
