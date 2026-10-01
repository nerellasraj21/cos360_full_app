import uuid

import httpx
import pytest
import pytest_asyncio
from sqlalchemy import text

from app.db.base import metadata
from app.db.tenant_session import PublicAsyncSessionLocal, TenantService, open_tenant_session
from app.main import app
from app.models.load_all import load_all_models
from app.service.tenant.catalog_service import CatalogService
from app.service.tenant.provisioning_service import TenantProvisioningService
from app.tools.jwt_utils import create_access_token

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

load_all_models()

MENUS = [
    {"name": "Dashboard", "url": "/dashboard", "level": "L0", "display_order": 1},
    {"name": "Fee", "url": "/fee", "level": "L0", "display_order": 2},
]
PASSWORD = "Prov-Test-9z!"
BASE = "/api/v1/super_admin/tenant-data"


@pytest_asyncio.fixture
async def plan_id():
    async with PublicAsyncSessionLocal() as session:
        await CatalogService.import_menus(session, MENUS)
        plan = await CatalogService.ensure_full_plan(session, name="Full")
        await session.commit()
        return plan.id


@pytest_asyncio.fixture
async def created():
    tenants: list[str] = []
    yield tenants
    tables = [
        t.name
        for t in reversed(metadata.sorted_tables)
        if "tenant_id" in t.c and t.name not in ("report_audit", "super_admin_audit")
    ]
    for tenant_id in tenants:
        async with open_tenant_session(tenant_id) as session:
            for table in tables:
                await session.execute(text(f'DELETE FROM public."{table}"'))
            await session.commit()
        async with PublicAsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM public.tenants WHERE id = CAST(:i AS uuid)"), {"i": tenant_id})
            await session.commit()
        await TenantService.clear_cache()


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _provision(created, plan_id, label) -> dict:
    name = f"sadata_{label}_{uuid.uuid4().hex[:8]}"
    result = await TenantProvisioningService.provision(
        name,
        plan_id,
        admin_username=f"admin_{name}",
        admin_email=f"{name}@example.com",
        admin_password=PASSWORD,
    )
    created.append(result["tenant_id"])
    result["admin_username"] = f"admin_{name}"
    return result


def _super_admin_headers() -> dict:
    token = create_access_token({"sub": str(uuid.uuid4()), "user_type": "super_admin", "username": "x"})
    return {"Authorization": f"Bearer {token}"}


async def test_super_admin_reads_only_the_tenant_in_the_path(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    b = await _provision(created, plan_id, "b")
    headers = _super_admin_headers()

    users_a = await client.get(f"{BASE}/{a['tenant_id']}/users/", headers=headers)
    assert users_a.status_code == 200, users_a.text
    body = users_a.json()
    assert body["tenant_id"] == a["tenant_id"]
    names = {u["username"] for u in body["users"]}
    assert names == {a["admin_username"]}
    assert b["admin_username"] not in names
    assert body["total_count"] == 1

    roles_a = await client.get(f"{BASE}/{a['tenant_id']}/roles/", headers=headers)
    assert roles_a.status_code == 200, roles_a.text
    assert roles_a.json()["total_roles"] == 5

    async with open_tenant_session(b["tenant_id"]) as session:
        b_role_id = (await session.execute(text("SELECT id FROM roles LIMIT 1"))).scalar_one()
    crossing = await client.get(f"{BASE}/{a['tenant_id']}/roles/{b_role_id}/permissions/", headers=headers)
    assert crossing.status_code == 404

    unknown = await client.get(f"{BASE}/{uuid.uuid4()}/users/", headers=headers)
    assert unknown.status_code == 404

    async with open_tenant_session(a["tenant_id"]) as session:
        a_role_id = (await session.execute(text("SELECT id FROM roles LIMIT 1"))).scalar_one()
    added = await client.post(
        f"{BASE}/{a['tenant_id']}/roles/{a_role_id}/permissions/",
        params={"resource_name": "sa_probe", "actions": "read,list"},
        headers=headers,
    )
    assert added.status_code == 201, added.text
    assert added.json()["added_permissions"]["actions"] == ["read", "list"]
    repeated = await client.post(
        f"{BASE}/{a['tenant_id']}/roles/{a_role_id}/permissions/",
        params={"resource_name": "sa_probe", "actions": "read"},
        headers=headers,
    )
    assert repeated.status_code == 400


async def test_tenant_data_requires_a_super_admin_token(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    url = f"{BASE}/{a['tenant_id']}/users/"

    assert (await client.get(url)).status_code == 401

    tenant_user_token = create_access_token(
        {"sub": str(uuid.uuid4()), "username": "u", "role": "Admin", "tenant_id": a["tenant_id"]}
    )
    rejected = await client.get(url, headers={"Authorization": f"Bearer {tenant_user_token}"})
    assert rejected.status_code == 403
