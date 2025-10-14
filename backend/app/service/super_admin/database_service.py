from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import AsyncGenerator, Optional, Dict, Any
from contextlib import asynccontextmanager
import logging

from app.db.session import get_public_db
from app.db.tenant_session import AsyncSessionLocal
from app.middleware.tenant_middleware import get_client_name_from_request

logger = logging.getLogger("super_admin_database")


class SuperAdminDatabaseService:
    """
    Service to handle database context switching for SuperAdmin operations.
    
    SuperAdmin can access:
    - Public schema (system-wide data)
    - Any tenant schema (using X-SuperAdmin-Target-Tenant header)
    """
    
    @staticmethod
    async def get_database_context(request: Request) -> AsyncGenerator[AsyncSession, None]:
        """
        Get appropriate database context for SuperAdmin based on request state.
        
        Args:
            request: FastAPI request object with SuperAdmin context
            
        Yields:
            AsyncSession: Database session configured for target schema
        """
        target_schema = getattr(request.state, 'target_schema', 'public')
        
        if target_schema == "public":
            # SuperAdmin accessing public schema
            async for db in get_public_db():
                yield db
        else:
            # SuperAdmin accessing specific tenant schema
            async with AsyncSessionLocal() as session:
                try:
                    # Set search path for target tenant schema
                    await session.execute(text(f'SET search_path TO "{target_schema}"'))
                    
                    logger.debug(f"SuperAdmin database session created for schema: {target_schema}")
                    yield session
                    
                except Exception as e:
                    await session.rollback()
                    logger.error(f"Error in SuperAdmin database session for schema '{target_schema}': {str(e)}")
                    raise
                finally:
                    await session.close()
    
    @staticmethod
    async def execute_tenant_query(request: Request, query, params: Optional[Dict[str, Any]] = None) -> Any:
        """
        Execute query in target tenant schema for SuperAdmin.
        
        Args:
            request: FastAPI request object with SuperAdmin context
            query: SQLAlchemy query object
            params: Optional query parameters
            
        Returns:
            Query result
        """
        async with SuperAdminDatabaseService.get_database_context(request) as db:
            return await db.execute(query, params or {})
    
    @staticmethod
    async def get_tenant_schemas() -> list[str]:
        """
        Get list of all available tenant schemas for SuperAdmin selection.
        
        Returns:
            List of tenant schema names
        """
        async with get_public_db() as db:
            # Query to get all tenant schemas
            result = await db.execute(text("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
                AND schema_name LIKE '%_schema'
                ORDER BY schema_name
            """))
            
            schemas = [row[0] for row in result.fetchall()]
            logger.debug(f"Found {len(schemas)} tenant schemas for SuperAdmin")
            return schemas
    
    @staticmethod
    async def get_tenant_info(schema_name: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific tenant schema.
        
        Args:
            schema_name: Name of the tenant schema
            
        Returns:
            Dictionary with tenant information or None if not found
        """
        async with get_public_db() as db:
            # Query tenant information from public schema
            result = await db.execute(text("""
                SELECT t.id, t.client_name, t.schema_name, t.is_active, t.created_at
                FROM tenants t
                WHERE t.schema_name = :schema_name
            """), {"schema_name": schema_name})
            
            row = result.fetchone()
            if row:
                return {
                    "id": str(row[0]),
                    "client_name": row[1],
                    "schema_name": row[2],
                    "is_active": row[3],
                    "created_at": row[4]
                }
            return None
    
    @staticmethod
    async def validate_tenant_schema(schema_name: str) -> bool:
        """
        Validate that a tenant schema exists and is accessible.

        Args:
            schema_name: Name of the tenant schema to validate

        Returns:
            True if schema exists and is accessible, False otherwise
        """
        try:
            async with AsyncSessionLocal() as session:
                # Try to set search path to the schema
                await session.execute(text(f'SET search_path TO "{schema_name}"'))

                # Test query to verify schema is accessible
                await session.execute(text("SELECT 1"))

                logger.debug(f"Tenant schema '{schema_name}' validated successfully")
                return True

        except Exception as e:
            logger.warning(f"Tenant schema '{schema_name}' validation failed: {str(e)}")
            return False
        finally:
            await session.close()

    @staticmethod
    @asynccontextmanager
    async def get_dynamic_tenant_db(schema_name: str) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session for a specific tenant schema with proper context management.

        This method sets the search_path to the target schema and ensures proper
        cleanup even during exceptions.

        Args:
            schema_name: Name of the tenant schema to connect to

        Yields:
            AsyncSession: Database session configured for the target schema

        Example:
            async with SuperAdminDatabaseService.get_dynamic_tenant_db("tenant_schema") as db:
                result = await db.execute(text("SELECT * FROM roles"))
        """
        async with AsyncSessionLocal() as session:
            try:
                # Set search path to target tenant schema
                await session.execute(text(f'SET search_path TO "{schema_name}"'))
                logger.debug(f"Dynamic tenant session created for schema: {schema_name}")
                yield session
            except Exception as e:
                await session.rollback()
                logger.error(f"Error in dynamic tenant session for '{schema_name}': {str(e)}")
                raise
            finally:
                await session.close()
