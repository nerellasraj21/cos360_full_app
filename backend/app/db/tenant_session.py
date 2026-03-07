import asyncio
from collections.abc import AsyncGenerator
import logging

from fastapi import HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.middleware.tenant_middleware import get_client_name_from_request

logger = logging.getLogger("tenant_session")

# Database configuration
DATABASE_URL = settings.DATABASE_URL

# Optimized shared engine for all tenant connections
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Disable SQL echo for performance
    pool_size=25,  # Slightly larger pool for tenant operations
    max_overflow=40,  # Higher overflow for peak loads
    pool_timeout=30,  # Timeout for getting connection from pool
    pool_recycle=3600,  # Recycle connections every hour
    pool_pre_ping=True,  # Verify connections before use
)

# Session factory for tenant connections
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# Session factory for public schema connections (for tenant lookup)
PublicAsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

# In-memory cache for tenant schema mappings
_tenant_cache: dict[str, str | None] = {}
_cache_lock = asyncio.Lock()


class TenantService:
    """Service to manage tenant lookups and caching"""

    @staticmethod
    async def get_tenant_schema(client_name: str) -> str | None:
        """
        Get schema name for a client. Uses caching for performance.

        Args:
            client_name: The client identifier

        Returns:
            Schema name if tenant exists and is active, None otherwise
        """
        async with _cache_lock:
            # Check cache first
            if client_name in _tenant_cache:
                return _tenant_cache[client_name]

            # Query database
            schema_name = await TenantService._fetch_tenant_schema(client_name)

            # Cache the result (including None for non-existent tenants)
            _tenant_cache[client_name] = schema_name

            return schema_name

    @staticmethod
    async def _fetch_tenant_schema(client_name: str) -> str | None:
        """Fetch tenant schema from database"""
        try:
            async with PublicAsyncSessionLocal() as session:
                # Set search path to public schema
                await session.execute(text("SET search_path TO public"))

                # Query for tenant
                result = await session.execute(
                    text("""
                        SELECT schema_name, is_active 
                        FROM tenants 
                        WHERE client_name = :client_name
                    """),
                    {"client_name": client_name},
                )

                tenant_data = result.fetchone()

                if tenant_data and tenant_data[1]:  # is_active = True
                    return tenant_data[0]  # schema_name

                return None

        except Exception as e:
            logger.error(f"Error fetching tenant schema for client '{client_name}': {str(e)}")
            return None

    @staticmethod
    async def clear_cache():
        """Clear the tenant cache (useful for testing or cache refresh)"""
        async with _cache_lock:
            _tenant_cache.clear()

    @staticmethod
    async def invalidate_tenant_cache(client_name: str):
        """Invalidate cache for a specific tenant"""
        async with _cache_lock:
            _tenant_cache.pop(client_name, None)


async def get_public_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a database session connected to the public schema.
    Used for tenant management operations.
    """
    async with PublicAsyncSessionLocal() as session:
        try:
            # Set search path to public schema
            await session.execute(text("SET search_path TO public"))
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Error in public database session: {str(e)}")
            raise
        finally:
            await session.close()


async def get_tenant_db(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a database session connected to the tenant schema.
    Automatically detects tenant from request and sets appropriate search_path.

    Args:
        request: FastAPI request object containing tenant information

    Yields:
        AsyncSession: Database session configured for tenant schema

    Raises:
        HTTPException: If tenant is not found or inactive
    """
    client_name = get_client_name_from_request(request)

    # Get tenant schema
    schema_name = await TenantService.get_tenant_schema(client_name)

    if not schema_name:
        # Check if it's the default client for backward compatibility
        if client_name == "default":
            schema_name = "cos360_masters"
            logger.warning(f"Using default tenant fallback: {client_name} -> {schema_name}")
        else:
            logger.warning(f"Tenant not found or inactive: {client_name}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant '{client_name}' not found or inactive"
            )

    async with AsyncSessionLocal() as session:
        try:
            # Set search path for this session
            await session.execute(text(f'SET search_path TO "{schema_name}"'))

            logger.debug(f"Database session created for tenant '{client_name}' using schema '{schema_name}'")

            yield session

        except Exception as e:
            await session.rollback()
            logger.error(f"Error in tenant database session for '{client_name}': {str(e)}")
            raise
        finally:
            await session.close()


async def get_tenant_db_by_client_name(client_name: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to get a database session for a specific client name.
    Useful for background tasks or operations that don't have request context.

    Args:
        client_name: The client identifier

    Yields:
        AsyncSession: Database session configured for tenant schema

    Raises:
        HTTPException: If tenant is not found or inactive
    """
    # Get tenant schema
    schema_name = await TenantService.get_tenant_schema(client_name)

    if not schema_name:
        # Check if it's the default client for backward compatibility
        if client_name == "default":
            schema_name = "cos360_masters"
            logger.warning(f"Using default tenant fallback: {client_name} -> {schema_name}")
        else:
            logger.warning(f"Tenant not found or inactive: {client_name}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant '{client_name}' not found or inactive"
            )

    async with AsyncSessionLocal() as session:
        try:
            # Set search path for this session
            await session.execute(text(f'SET search_path TO "{schema_name}"'))

            logger.debug(f"Database session created for client '{client_name}' using schema '{schema_name}'")

            yield session

        except Exception as e:
            await session.rollback()
            logger.error(f"Error in tenant database session for '{client_name}': {str(e)}")
            raise
        finally:
            await session.close()


async def get_tenant_db_by_schema(schema_name: str) -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session for specific schema (SuperAdmin use).

    This function allows SuperAdmin to access any tenant schema directly
    without going through normal tenant validation.

    Args:
        schema_name: The target schema name

    Yields:
        AsyncSession: Database session configured for the specified schema

    Raises:
        HTTPException: If schema is not accessible
    """
    async with AsyncSessionLocal() as session:
        try:
            # Set search path for the specified schema
            await session.execute(text(f'SET search_path TO "{schema_name}"'))

            logger.debug(f"Database session created for schema '{schema_name}' (SuperAdmin access)")

            yield session

        except Exception as e:
            await session.rollback()
            logger.error(f"Error in database session for schema '{schema_name}': {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to access schema '{schema_name}': {str(e)}",
            )
        finally:
            await session.close()
