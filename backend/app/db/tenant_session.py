from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
import logging
import time

from fastapi import HTTPException, Request, status
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session

from app.config import settings
from app.db.base import TENANT_GUC
from app.tools.jwt_utils import verify_access_token

logger = logging.getLogger("tenant_session")

DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=25,
    max_overflow=40,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
PublicAsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

TENANT_CACHE_TTL_SECONDS = 60
_tenant_cache: dict[str, tuple[str, float]] = {}


@event.listens_for(Session, "after_begin")
def _apply_tenant_to_transaction(session, transaction, connection):
    tenant_id = session.info.get("tenant_id")
    if tenant_id:
        connection.execute(text("SELECT set_config(:key, :value, true)"), {"key": TENANT_GUC, "value": tenant_id})


class TenantService:
    @staticmethod
    async def get_tenant_id(client_name: str) -> str | None:
        cached = _tenant_cache.get(client_name)
        if cached and cached[1] > time.monotonic():
            return cached[0]

        tenant_id = await TenantService._fetch_tenant_id(client_name)
        if tenant_id:
            _tenant_cache[client_name] = (tenant_id, time.monotonic() + TENANT_CACHE_TTL_SECONDS)
        else:
            _tenant_cache.pop(client_name, None)
        return tenant_id

    @staticmethod
    async def _fetch_tenant_id(client_name: str) -> str | None:
        try:
            async with PublicAsyncSessionLocal() as session:
                result = await session.execute(
                    text("SELECT id, is_active FROM public.tenants WHERE client_name = :client_name"),
                    {"client_name": client_name},
                )
                row = result.fetchone()
                if row and row[1]:
                    return str(row[0])
                return None
        except Exception as e:
            logger.error(f"Error fetching tenant for client '{client_name}': {str(e)}")
            return None

    @staticmethod
    async def is_active(tenant_id: str) -> bool:
        cached = _tenant_cache.get(f"id:{tenant_id}")
        if cached and cached[1] > time.monotonic():
            return True
        try:
            async with PublicAsyncSessionLocal() as session:
                row = (
                    await session.execute(
                        text("SELECT is_active FROM public.tenants WHERE id = CAST(:tenant_id AS uuid)"),
                        {"tenant_id": tenant_id},
                    )
                ).fetchone()
        except Exception as e:
            logger.error(f"Error checking tenant '{tenant_id}': {str(e)}")
            return False
        if row and row[0]:
            _tenant_cache[f"id:{tenant_id}"] = (tenant_id, time.monotonic() + TENANT_CACHE_TTL_SECONDS)
            return True
        _tenant_cache.pop(f"id:{tenant_id}", None)
        return False

    @staticmethod
    async def clear_cache():
        _tenant_cache.clear()

    @staticmethod
    async def invalidate_tenant_cache(client_name: str):
        _tenant_cache.pop(client_name, None)


@asynccontextmanager
async def open_tenant_session(tenant_id: str) -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        session.info["tenant_id"] = str(tenant_id)
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Error in tenant database session for tenant '{tenant_id}': {str(e)}")
            raise
        finally:
            await session.close()


async def _resolve_tenant_id(client_name: str) -> str:
    tenant_id = await TenantService.get_tenant_id(client_name)
    if not tenant_id:
        logger.warning(f"Tenant not found or inactive: {client_name}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant '{client_name}' not found or inactive"
        )
    return tenant_id


async def get_public_db() -> AsyncGenerator[AsyncSession, None]:
    async with PublicAsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Error in public database session: {str(e)}")
            raise
        finally:
            await session.close()


def _verified_claims(request: Request) -> dict | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    try:
        return verify_access_token(header.split(" ", 1)[1])
    except HTTPException:
        return None


async def resolve_request_tenant_id(request: Request) -> str:
    """Tenant for a request: the signed token claim when authenticated, else the cschema header (login only)."""
    header_client = getattr(request.state, "client_name", None)
    header_tenant = await TenantService.get_tenant_id(header_client) if header_client else None
    claims = _verified_claims(request)

    if claims is None:
        if not header_client:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant must be specified")
        tenant_id = await _resolve_tenant_id(header_client)
    elif claims.get("tenant_id"):
        tenant_id = str(claims["tenant_id"])
        if header_client and header_tenant != tenant_id:
            logger.warning(f"Tenant header does not match token for user '{claims.get('username')}'")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant does not match your session")
        if not await TenantService.is_active(tenant_id):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid connection")
    elif claims.get("user_type") == "super_admin":
        tenant_id = await _resolve_tenant_id(header_client or "")
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is out of date. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    request.state.tenant_id = tenant_id
    return tenant_id


def get_tenant_id_from_request(request: Request) -> str:
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant could not be determined")
    return tenant_id


async def get_tenant_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    tenant_id = await resolve_request_tenant_id(request)
    async with open_tenant_session(tenant_id) as session:
        yield session


async def get_tenant_db_by_client_name(client_name: str) -> AsyncGenerator[AsyncSession, None]:
    tenant_id = await _resolve_tenant_id(client_name)
    async with open_tenant_session(tenant_id) as session:
        yield session
