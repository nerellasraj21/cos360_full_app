import logging
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.public.menu_model import Menu
from app.models.public.plan_menu_model import PlanMenuAccess
from app.models.public.plan_resource_model import PlanResourceAccess
from app.models.public.tenant_model import Tenant
from app.service.tenant.permission_catalog import (
    DEFAULT_ROLES,
    ROLE_MANAGEMENT_ACTIONS,
    ROLE_PERMISSIONS,
    STUDENT_PARENT_MENU_URLS,
)

logger = logging.getLogger("role_seed_service")


class PlanNotConfiguredError(Exception):
    pass


class RoleSeedService:
    @staticmethod
    async def seed_defaults(db: AsyncSession) -> dict:
        """Create the default roles, role permissions and role menu access for the session's tenant.

        Idempotent: existing rows are kept, so permissions an admin revoked are not re-granted.
        The tenant is taken from the session (row-level security), and the plan from the tenant row.
        """
        tenant_id = db.info.get("tenant_id")
        tenant = (await db.execute(select(Tenant).where(Tenant.id == UUID(str(tenant_id))))).scalar_one_or_none()
        if tenant is None:
            raise PlanNotConfiguredError("Tenant not found")
        if tenant.plan_id is None:
            raise PlanNotConfiguredError("Tenant has no plan assigned")

        plan_resources = await RoleSeedService._plan_resources(db, tenant.plan_id)
        if not plan_resources:
            raise PlanNotConfiguredError("The tenant's plan has no resources configured")

        role_ids = await RoleSeedService._ensure_roles(db)
        permissions = await RoleSeedService._seed_resource_permissions(db, role_ids, plan_resources)
        menus = await RoleSeedService._seed_role_menus(db, role_ids, tenant.plan_id)
        return {"roles": len(role_ids), "permissions": permissions, "role_menu_links": menus}

    @staticmethod
    async def sync_to_plan(db: AsyncSession) -> dict:
        """Seed anything the tenant's plan adds and remove permissions and menu links the plan no longer allows."""
        summary = await RoleSeedService.seed_defaults(db)
        tenant = (await db.execute(select(Tenant).where(Tenant.id == UUID(str(db.info["tenant_id"]))))).scalar_one()
        plan_resources = await RoleSeedService._plan_resources(db, tenant.plan_id)

        stale = [
            row.id
            for row in await db.execute(text("SELECT id, resource, action FROM resource_permissions"))
            if row.resource != "role_management" and row.action not in plan_resources.get(row.resource, ())
        ]
        if stale:
            await db.execute(text("DELETE FROM resource_permissions WHERE id = ANY(:ids)"), {"ids": stale})

        plan_menu_ids = [
            row[0]
            for row in await db.execute(
                select(PlanMenuAccess.menu_id).where(PlanMenuAccess.plan_id == tenant.plan_id, PlanMenuAccess.is_active)
            )
        ]
        removed_links = await db.execute(
            text("DELETE FROM role_menu_permissions WHERE NOT (menu_id = ANY(:ids))"), {"ids": plan_menu_ids}
        )
        return {**summary, "permissions_removed": len(stale), "role_menu_links_removed": removed_links.rowcount}

    @staticmethod
    async def _plan_resources(db: AsyncSession, plan_id: UUID) -> dict[str, set[str]]:
        rows = await db.execute(
            select(PlanResourceAccess.resource_name, PlanResourceAccess.actions).where(
                PlanResourceAccess.plan_id == plan_id, PlanResourceAccess.is_active
            )
        )
        return {name: set(actions) for name, actions in rows.all()}

    @staticmethod
    async def _ensure_roles(db: AsyncSession) -> dict[str, UUID]:
        await db.execute(
            text(
                "INSERT INTO roles (id, name, description, is_system_role, is_custom_role) "
                "VALUES (gen_random_uuid(), :name, :description, true, false) "
                "ON CONFLICT (tenant_id, name) DO NOTHING"
            ),
            [{"name": name, "description": description} for name, description in DEFAULT_ROLES],
        )
        rows = await db.execute(
            text("SELECT id, name FROM roles WHERE name = ANY(:names)"), {"names": [n for n, _ in DEFAULT_ROLES]}
        )
        return {row.name: row.id for row in rows}

    @staticmethod
    async def _seed_resource_permissions(
        db: AsyncSession, role_ids: dict[str, UUID], plan_resources: dict[str, set[str]]
    ) -> int:
        params = []
        for role_name, role_id in role_ids.items():
            if role_name == "Admin":
                pairs = {(res, act) for res, actions in plan_resources.items() for act in actions}
                pairs |= {("role_management", act) for act in ROLE_MANAGEMENT_ACTIONS}
            else:
                pairs = {
                    (res, act) for res, act in ROLE_PERMISSIONS.get(role_name, []) if act in plan_resources.get(res, ())
                }
            params.extend({"role_id": role_id, "resource": res, "action": act} for res, act in sorted(pairs))

        if params:
            await db.execute(
                text(
                    "INSERT INTO resource_permissions (id, role_id, resource, action, is_granted) "
                    "VALUES (gen_random_uuid(), :role_id, :resource, :action, true) "
                    "ON CONFLICT (tenant_id, role_id, resource, action) DO NOTHING"
                ),
                params,
            )
        return len(params)

    @staticmethod
    async def _seed_role_menus(db: AsyncSession, role_ids: dict[str, UUID], plan_id: UUID) -> int:
        plan_menus = (
            await db.execute(
                select(Menu.id, Menu.url)
                .join(PlanMenuAccess, PlanMenuAccess.menu_id == Menu.id)
                .where(PlanMenuAccess.plan_id == plan_id, PlanMenuAccess.is_active)
            )
        ).all()
        params = []
        for role_name, role_id in role_ids.items():
            restricted = role_name in ("Student", "Parent")
            for menu_id, url in plan_menus:
                if restricted and url not in STUDENT_PARENT_MENU_URLS:
                    continue
                params.append({"role_id": role_id, "menu_id": menu_id, "can_edit": role_name == "Admin"})

        if params:
            await db.execute(
                text(
                    "INSERT INTO role_menu_permissions (id, role_id, menu_id, can_view, can_edit) "
                    "VALUES (gen_random_uuid(), :role_id, :menu_id, true, :can_edit) "
                    "ON CONFLICT (tenant_id, role_id, menu_id) DO NOTHING"
                ),
                params,
            )
        return len(params)
