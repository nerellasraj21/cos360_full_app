from datetime import date
import logging
import re
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.tenant_session import AsyncSessionLocal
from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.models.masters.academic_year_model import AcademicYear
from app.models.public.plan_model import Plan
from app.models.public.tenant_model import Tenant
from app.service.tenant.role_seed_service import PlanNotConfiguredError, RoleSeedService
from app.tools.password_util import hash_password

logger = logging.getLogger("tenant_provisioning")

CLIENT_NAME_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]{1,62}$")


class TenantProvisioningService:
    @staticmethod
    async def provision(
        client_name: str,
        plan_id: UUID,
        admin_username: str | None = None,
        admin_email: str | None = None,
        admin_password: str | None = None,
    ) -> dict:
        """Create a tenant, its default roles and permissions, and optionally its first admin, in one transaction."""
        client_name = (client_name or "").strip().lower()
        if not CLIENT_NAME_PATTERN.match(client_name):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="client_name must be 2-63 characters of lowercase letters, digits, hyphen or underscore",
            )
        if bool(admin_username) != bool(admin_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="admin_username and admin_password go together"
            )

        tenant_id = uuid4()
        async with AsyncSessionLocal() as session:
            session.info["tenant_id"] = str(tenant_id)
            try:
                plan = (await session.execute(select(Plan).where(Plan.id == plan_id))).scalar_one_or_none()
                if plan is None or not plan.is_active:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found or inactive")

                existing = (
                    await session.execute(select(Tenant.id).where(Tenant.client_name == client_name))
                ).scalar_one_or_none()
                if existing is not None:
                    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant already exists")

                session.add(Tenant(id=tenant_id, client_name=client_name, plan_id=plan_id, is_active=True))
                await session.flush()

                seeded = await RoleSeedService.seed_defaults(session)

                has_year = (await session.execute(select(AcademicYear.id).limit(1))).scalars().first()
                if has_year is None:
                    today = date.today()
                    start_year = today.year if today.month >= 6 else today.year - 1
                    session.add(
                        AcademicYear(
                            title=f"{start_year}-{start_year + 1}",
                            start_date=date(start_year, 6, 1),
                            end_date=date(start_year + 1, 3, 31),
                            is_active=True,
                        )
                    )
                    await session.flush()

                admin_user_id = None
                if admin_username:
                    admin_role_id = (await session.execute(select(Role.id).where(Role.name == "Admin"))).scalar_one()
                    admin = User(
                        username=admin_username,
                        email=admin_email,
                        password_hash=hash_password(admin_password),
                        is_active=True,
                        role_id=admin_role_id,
                    )
                    session.add(admin)
                    await session.flush()
                    admin_user_id = admin.id

                await session.commit()
            except HTTPException:
                await session.rollback()
                raise
            except PlanNotConfiguredError as e:
                await session.rollback()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
            except IntegrityError:
                await session.rollback()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant could not be created")
            except Exception as e:
                await session.rollback()
                logger.error(f"Tenant provisioning failed for '{client_name}': {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Tenant provisioning failed"
                )

        logger.info(f"Provisioned tenant '{client_name}' ({tenant_id})")
        return {
            "tenant_id": str(tenant_id),
            "client_name": client_name,
            "plan_id": str(plan_id),
            "admin_user_id": str(admin_user_id) if admin_user_id else None,
            **seeded,
        }

    @staticmethod
    async def change_plan(tenant_id: UUID, plan_id: UUID) -> dict:
        async with AsyncSessionLocal() as session:
            session.info["tenant_id"] = str(tenant_id)
            try:
                tenant = (await session.execute(select(Tenant).where(Tenant.id == tenant_id))).scalar_one_or_none()
                if tenant is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
                plan = (await session.execute(select(Plan).where(Plan.id == plan_id))).scalar_one_or_none()
                if plan is None or not plan.is_active:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found or inactive")

                old_plan_id = tenant.plan_id
                tenant.plan_id = plan_id
                await session.flush()
                synced = await RoleSeedService.sync_to_plan(session)
                await session.commit()
            except HTTPException:
                await session.rollback()
                raise
            except PlanNotConfiguredError as e:
                await session.rollback()
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
            except Exception as e:
                await session.rollback()
                logger.error(f"Plan change failed for tenant '{tenant_id}': {e}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Plan change failed")

        return {
            "tenant_id": str(tenant_id),
            "old_plan_id": str(old_plan_id) if old_plan_id else None,
            "plan_id": str(plan_id),
            "plan_name": plan.name,
            **synced,
        }
