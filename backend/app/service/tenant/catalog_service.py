from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.public.menu_model import Menu
from app.models.public.plan_menu_model import PlanMenuAccess
from app.models.public.plan_model import Plan
from app.models.public.plan_resource_model import PlanResourceAccess
from app.service.tenant.permission_catalog import ALL_ADMIN


class CatalogService:
    @staticmethod
    async def import_menus(db: AsyncSession, menus: list[dict]) -> int:
        """Upsert the shared menu catalog. Each item: name, url, level, parent_url (optional), display_order."""
        created = 0
        by_url: dict[str | None, Menu] = {}
        existing = (await db.execute(select(Menu))).scalars().all()
        for menu in existing:
            by_url[menu.url or f"group:{menu.name}"] = menu

        for item in sorted(menus, key=lambda m: m["level"]):
            key = item.get("url") or f"group:{item['name']}"
            parent = (
                by_url.get(item.get("parent_url") or f"group:{item.get('parent_name')}")
                if item.get("parent_url") or item.get("parent_name")
                else None
            )
            menu = by_url.get(key)
            if menu is None:
                menu = Menu(name=item["name"], url=item.get("url"), level=item["level"])
                db.add(menu)
                created += 1
            menu.name = item["name"]
            menu.level = item["level"]
            menu.display_order = item.get("display_order", 0)
            menu.parent_id = None
            await db.flush()
            if parent is not None:
                menu.parent_id = parent.id
            by_url[key] = menu
        await db.flush()
        return created

    @staticmethod
    async def ensure_full_plan(db: AsyncSession, name: str = "Full") -> Plan:
        """Create (or refresh) a plan covering every resource in the permission catalog and every menu."""
        plan = (await db.execute(select(Plan).where(Plan.name == name))).scalar_one_or_none()
        if plan is None:
            plan = Plan(name=name, description="All modules", is_active=True)
            db.add(plan)
            await db.flush()

        actions_by_resource: dict[str, set[str]] = defaultdict(set)
        for resource, action in ALL_ADMIN:
            actions_by_resource[resource].add(action)

        existing = {
            row.resource_name: row
            for row in (
                await db.execute(select(PlanResourceAccess).where(PlanResourceAccess.plan_id == plan.id))
            ).scalars()
        }
        for resource, actions in actions_by_resource.items():
            row = existing.get(resource)
            if row is None:
                db.add(PlanResourceAccess(plan_id=plan.id, resource_name=resource, actions=sorted(actions)))
            else:
                row.actions = sorted(set(row.actions) | actions)
                row.is_active = True

        linked = set(
            (await db.execute(select(PlanMenuAccess.menu_id).where(PlanMenuAccess.plan_id == plan.id))).scalars()
        )
        for menu_id in (await db.execute(select(Menu.id))).scalars():
            if menu_id not in linked:
                db.add(PlanMenuAccess(plan_id=plan.id, menu_id=menu_id, is_active=True))
        await db.flush()
        return plan
