import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import _target

_target.assert_safe_target()

import bcrypt
from sqlalchemy import select, text

from app.db.base import metadata
from app.db.tenant_session import PublicAsyncSessionLocal, open_tenant_session
from app.models.auth.role_model import Role
from app.models.auth.user_model import User
from app.models.load_all import load_all_models
from app.models.public.tenant_model import Tenant
from app.service.tenant.catalog_service import CatalogService
from app.service.tenant.provisioning_service import TenantProvisioningService
from app.tools.password_util import hash_password

load_all_models()

from scripts.seed_demo_catalog import build_menus

ROLE_USERS = [
    ("QA_STAFF_USER", "QA_STAFF_PASSWORD", "Staff"),
    ("QA_TEACHER_USER", "QA_TEACHER_PASSWORD", "Teacher"),
    ("QA_STUDENT_USER", "QA_STUDENT_PASSWORD", "Student"),
    ("QA_PARENT_USER", "QA_PARENT_PASSWORD", "Parent"),
]


def env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing {name} in backend/.env.test")
    return value


async def ensure_catalog_and_plan():
    async with PublicAsyncSessionLocal() as session:
        await CatalogService.import_menus(session, build_menus())
        plan = await CatalogService.ensure_full_plan(session, name="Full")
        await session.commit()
        return plan.id


async def ensure_super_admin():
    username = env("QA_SUPERADMIN_USER")
    hashed = bcrypt.hashpw(env("QA_SUPERADMIN_PASSWORD").encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    async with PublicAsyncSessionLocal() as session:
        await session.execute(
            text(
                "INSERT INTO public.super_admin_users (id, username, email, hashed_password, full_name, is_active, "
                "failed_login_attempts, requires_password_change) "
                "VALUES (gen_random_uuid(), :u, :e, :h, 'QA Super Admin', true, 0, false) "
                "ON CONFLICT (username) DO UPDATE SET hashed_password = EXCLUDED.hashed_password, "
                "is_active = true, failed_login_attempts = 0, account_locked_until = NULL"
            ),
            {"u": username, "e": f"{username}@example.com", "h": hashed},
        )
        await session.commit()


async def find_tenant(client_name: str):
    async with PublicAsyncSessionLocal() as session:
        return (await session.execute(select(Tenant).where(Tenant.client_name == client_name))).scalar_one_or_none()


async def drop_tenant(tenant):
    tables = [
        t.name
        for t in reversed(metadata.sorted_tables)
        if "tenant_id" in t.c and t.name not in ("report_audit", "super_admin_audit")
    ]
    async with open_tenant_session(tenant.id) as session:
        for table in tables:
            await session.execute(text(f'DELETE FROM public."{table}"'))
        await session.commit()
    async with PublicAsyncSessionLocal() as session:
        await session.execute(text("DELETE FROM public.tenants WHERE id = :id"), {"id": tenant.id})
        await session.commit()


async def ensure_role_users(tenant_id):
    created = []
    async with open_tenant_session(tenant_id) as session:
        roles = {r.name: r.id for r in (await session.execute(select(Role))).scalars()}
        for user_key, pass_key, role_name in ROLE_USERS:
            username = env(user_key)
            exists = (await session.execute(select(User.id).where(User.username == username))).scalar_one_or_none()
            if exists is not None:
                continue
            session.add(
                User(
                    username=username,
                    email=f"{username}@example.com",
                    password_hash=hash_password(env(pass_key)),
                    is_active=True,
                    is_first_login=False,
                    role_id=roles[role_name],
                )
            )
            created.append(role_name)
        await session.commit()
    return created


async def main(reset: bool):
    client_name = env("QA_TENANT")
    plan_id = await ensure_catalog_and_plan()
    await ensure_super_admin()

    tenant = await find_tenant(client_name)
    if tenant is not None and reset:
        await drop_tenant(tenant)
        tenant = None
        print(f"dropped tenant {client_name}")

    if tenant is None:
        result = await TenantProvisioningService.provision(
            client_name,
            plan_id,
            admin_username=env("QA_ADMIN_USER"),
            admin_email=f"{env('QA_ADMIN_USER')}@example.com",
            admin_password=env("QA_ADMIN_PASSWORD"),
        )
        tenant_id = result["tenant"]["tenant_id"] if "tenant" in result else result["tenant_id"]
        print(f"provisioned tenant {client_name}")
    else:
        tenant_id = tenant.id
        print(f"tenant {client_name} already exists")

    created = await ensure_role_users(tenant_id)
    print("created role users:", ", ".join(created) if created else "none (already present)")
    print("QA environment ready")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="drop and rebuild the QA tenant")
    args = parser.parse_args()
    asyncio.run(main(args.reset))
