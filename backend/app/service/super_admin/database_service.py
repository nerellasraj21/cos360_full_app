from contextlib import AbstractAsyncContextManager
import logging
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tenant_session import PublicAsyncSessionLocal, open_tenant_session
from app.models.public.tenant_model import Tenant

logger = logging.getLogger("super_admin_database")


class SuperAdminDatabaseService:
    """
    Gives a super admin access to one tenant's data.

    A tenant session sets app.tenant_id for every transaction, so row-level security limits each
    session to the tenant named in the request path.
    """

    @staticmethod
    async def get_tenant_info(tenant_id: UUID) -> dict[str, Any] | None:
        async with PublicAsyncSessionLocal() as db:
            tenant = (await db.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
            if not tenant:
                return None
            return {
                "id": str(tenant.id),
                "client_name": tenant.client_name,
                "is_active": tenant.is_active,
                "created_at": tenant.created_at,
            }

    @staticmethod
    async def list_tenants() -> list[dict[str, Any]]:
        async with PublicAsyncSessionLocal() as db:
            tenants = (await db.execute(select(Tenant).order_by(Tenant.client_name))).scalars().all()
            return [
                {
                    "id": str(tenant.id),
                    "client_name": tenant.client_name,
                    "is_active": tenant.is_active,
                    "created_at": tenant.created_at,
                }
                for tenant in tenants
            ]

    @staticmethod
    async def validate_tenant(tenant_id: UUID) -> None:
        if await SuperAdminDatabaseService.get_tenant_info(tenant_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Tenant '{tenant_id}' not found")

    @staticmethod
    def open_tenant_db(tenant_id: UUID) -> AbstractAsyncContextManager[AsyncSession]:
        return open_tenant_session(str(tenant_id))
