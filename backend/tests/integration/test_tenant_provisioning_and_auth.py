from datetime import date
import uuid

import httpx
from jose import jwt
import pytest
import pytest_asyncio
from sqlalchemy import select, text

from app.config import settings
from app.db.base import metadata
from app.db.tenant_session import PublicAsyncSessionLocal, TenantService, open_tenant_session
from app.main import app
from app.models.auth.role_model import Role
from app.models.load_all import load_all_models
from app.models.masters.academic_year_model import AcademicYear
from app.models.public.plan_model import Plan
from app.service.tenant.catalog_service import CatalogService
from app.service.tenant.provisioning_service import TenantProvisioningService
from app.tools.jwt_utils import create_access_token

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

load_all_models()

MENUS = [
    {"name": "Dashboard", "url": "/dashboard", "level": "L0", "display_order": 1},
    {"name": "Fee", "url": "/fee", "level": "L0", "display_order": 2},
    {"name": "Billing Admin", "url": "/billing-admin", "level": "L0", "display_order": 3},
]
PASSWORD = "Prov-Test-9z!"


def _name(label: str) -> str:
    return f"prov_{label}_{uuid.uuid4().hex[:8]}"


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


async def _provision(created, plan_id, label="t", admin=True) -> dict:
    name = _name(label)
    result = await TenantProvisioningService.provision(
        name,
        plan_id,
        admin_username=f"admin_{name}" if admin else None,
        admin_email=f"{name}@example.com" if admin else None,
        admin_password=PASSWORD if admin else None,
    )
    created.append(result["tenant_id"])
    result["admin_username"] = f"admin_{name}"
    return result


async def _add_academic_year(tenant_id: str) -> str:
    async with open_tenant_session(tenant_id) as session:
        year = AcademicYear(title="2026-27", start_date=date(2026, 6, 1), end_date=date(2027, 3, 31))
        session.add(year)
        await session.flush()
        year_id = str(year.id)
        await session.commit()
    return year_id


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def _login(client, tenant: dict, year_id: str, header: str | None = None):
    headers = {"cschema": header or tenant["client_name"]}
    return await client.post(
        "/api/v1/auth/login",
        json={"username": tenant["admin_username"], "password": PASSWORD, "academic_year_id": year_id},
        headers=headers,
    )


async def test_provisioning_seeds_roles_permissions_and_menus(created, plan_id):
    tenant = await _provision(created, plan_id)
    assert tenant["roles"] == 5
    assert tenant["permissions"] > 0
    assert tenant["role_menu_links"] > 0

    async with open_tenant_session(tenant["tenant_id"]) as session:
        roles = {r.name: r.id for r in (await session.execute(select(Role))).scalars()}
        assert set(roles) == {"Admin", "Teacher", "Student", "Parent", "Staff"}

        async def perms(role):
            rows = await session.execute(
                text("SELECT resource, action FROM resource_permissions WHERE role_id = :r"), {"r": roles[role]}
            )
            return {(r.resource, r.action) for r in rows}

        admin, student = await perms("Admin"), await perms("Student")
        assert ("role_management", "create") in admin
        assert ("student_admissions", "create") in admin
        assert student and not any(action in ("create", "update", "delete") for _, action in student)

        async def menus(role):
            rows = await session.execute(
                text(
                    "SELECT m.url FROM role_menu_permissions p JOIN menus m ON m.id = p.menu_id WHERE p.role_id = :r"
                ),
                {"r": roles[role]},
            )
            return {r.url for r in rows}

        assert {"/dashboard", "/fee", "/billing-admin"} <= await menus("Admin")
        student_menus = await menus("Student")
        assert "/billing-admin" not in student_menus and "/dashboard" in student_menus


async def test_seeding_is_idempotent_and_keeps_revocations(created, plan_id):
    from app.service.tenant.role_seed_service import RoleSeedService

    tenant = await _provision(created, plan_id)
    async with open_tenant_session(tenant["tenant_id"]) as session:
        await session.execute(
            text("UPDATE resource_permissions SET is_granted = false WHERE resource = 'student_admissions' AND action = 'create'")
        )
        await session.commit()
    async with open_tenant_session(tenant["tenant_id"]) as session:
        await RoleSeedService.seed_defaults(session)
        await session.commit()
    async with open_tenant_session(tenant["tenant_id"]) as session:
        granted = (
            await session.execute(
                text("SELECT bool_or(is_granted) FROM resource_permissions WHERE resource = 'student_admissions' AND action = 'create'")
            )
        ).scalar_one()
        total = (await session.execute(text("SELECT count(*) FROM roles"))).scalar_one()
    assert granted is False
    assert total == 5


async def test_duplicate_client_name_is_rejected(created, plan_id):
    from fastapi import HTTPException

    tenant = await _provision(created, plan_id, admin=False)
    with pytest.raises(HTTPException) as err:
        await TenantProvisioningService.provision(tenant["client_name"], plan_id)
    assert err.value.status_code == 409


@pytest.mark.parametrize("bad", ["", "A", "has space", "-lead", "x" * 70, "semi;colon"])
async def test_invalid_client_names_are_rejected(plan_id, bad):
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as err:
        await TenantProvisioningService.provision(bad, plan_id)
    assert err.value.status_code == 400


async def test_plan_without_resources_leaves_no_tenant_behind():
    from fastapi import HTTPException

    async with PublicAsyncSessionLocal() as session:
        empty = Plan(name=f"empty_{uuid.uuid4().hex[:6]}", is_active=True)
        session.add(empty)
        await session.flush()
        empty_id = empty.id
        await session.commit()

    name = _name("empty")
    try:
        with pytest.raises(HTTPException) as err:
            await TenantProvisioningService.provision(name, empty_id)
        assert err.value.status_code == 409
        async with PublicAsyncSessionLocal() as session:
            count = (
                await session.execute(text("SELECT count(*) FROM public.tenants WHERE client_name = :n"), {"n": name})
            ).scalar_one()
        assert count == 0
    finally:
        async with PublicAsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM public.plans WHERE id = :i"), {"i": empty_id})
            await session.commit()


async def test_login_issues_tenant_claim_and_session_works(created, plan_id, client):
    tenant = await _provision(created, plan_id)
    year_id = await _add_academic_year(tenant["tenant_id"])

    response = await _login(client, tenant, year_id)
    assert response.status_code == 200, response.text
    body = response.json()
    claims = jwt.decode(body["access_token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert claims["tenant_id"] == tenant["tenant_id"]
    assert body["permissions"]
    assert body["tenant_id"] == tenant["tenant_id"]
    assert body["client_name"] == tenant["client_name"]

    auth = {"Authorization": f"Bearer {body['access_token']}"}
    with_header = await client.get(
        "/api/v1/masters/academic_years/", headers={**auth, "cschema": tenant["client_name"]}
    )
    assert with_header.status_code == 200, with_header.text
    without_header = await client.get("/api/v1/masters/academic_years/", headers=auth)
    assert without_header.status_code == 200, without_header.text


async def test_token_is_rejected_for_a_different_tenant(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    b = await _provision(created, plan_id, "b")
    year_a = await _add_academic_year(a["tenant_id"])
    await _add_academic_year(b["tenant_id"])

    token = (await _login(client, a, year_a)).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    crossing = await client.get("/api/v1/masters/academic_years/", headers={**auth, "cschema": b["client_name"]})
    assert crossing.status_code == 403
    unknown = await client.get("/api/v1/masters/academic_years/", headers={**auth, "cschema": "no_such_school"})
    assert unknown.status_code == 403


async def test_credentials_do_not_work_on_another_tenant(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    b = await _provision(created, plan_id, "b")
    year_a = await _add_academic_year(a["tenant_id"])
    await _add_academic_year(b["tenant_id"])

    response = await _login(client, a, year_a, header=b["client_name"])
    assert response.status_code in (400, 401)


async def test_login_body_cannot_redirect_to_another_tenant(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    b = await _provision(created, plan_id, "b")
    year_a = await _add_academic_year(a["tenant_id"])

    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": a["admin_username"],
            "password": PASSWORD,
            "academic_year_id": year_a,
            "client_name": b["client_name"],
        },
        headers={"cschema": a["client_name"]},
    )
    assert response.status_code in (400, 401)


async def test_legacy_token_without_tenant_claim_is_rejected(created, plan_id, client):
    tenant = await _provision(created, plan_id)
    legacy = create_access_token({"sub": str(uuid.uuid4()), "username": "x", "role": "Admin"})
    response = await client.get(
        "/api/v1/masters/academic_years/",
        headers={"Authorization": f"Bearer {legacy}", "cschema": tenant["client_name"]},
    )
    assert response.status_code == 401


async def test_unknown_tenant_header_is_404_without_a_token(client):
    response = await client.get("/api/v1/auth/academic-years", headers={"cschema": "no_such_school"})
    assert response.status_code == 404


async def test_refresh_is_bound_to_the_tenant(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    b = await _provision(created, plan_id, "b")
    year_a = await _add_academic_year(a["tenant_id"])

    refresh = (await _login(client, a, year_a)).json()["refresh_token"]

    ok = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh}, headers={"cschema": a["client_name"]})
    assert ok.status_code == 200, ok.text
    new_claims = jwt.decode(ok.json()["access_token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert new_claims["tenant_id"] == a["tenant_id"]

    crossing = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh}, headers={"cschema": b["client_name"]}
    )
    assert crossing.status_code == 403


async def test_changing_plan_prunes_and_restores_permissions(created, plan_id):
    from app.models.public.plan_resource_model import PlanResourceAccess

    async with PublicAsyncSessionLocal() as session:
        small = Plan(name=f"small_{uuid.uuid4().hex[:6]}", is_active=True)
        session.add(small)
        await session.flush()
        session.add(PlanResourceAccess(plan_id=small.id, resource_name="academic_years", actions=["read", "list"]))
        small_id = small.id
        await session.commit()

    tenant = await _provision(created, plan_id)
    try:
        result = await TenantProvisioningService.change_plan(uuid.UUID(tenant["tenant_id"]), small_id)
        assert result["permissions_removed"] > 0

        async with open_tenant_session(tenant["tenant_id"]) as session:
            rows = (await session.execute(text("SELECT DISTINCT resource, action FROM resource_permissions"))).all()
        granted = {(r.resource, r.action) for r in rows}
        assert ("academic_years", "read") in granted
        assert ("academic_years", "create") not in granted
        assert ("student_admissions", "create") not in granted
        assert ("role_management", "create") in granted

        await TenantProvisioningService.change_plan(uuid.UUID(tenant["tenant_id"]), plan_id)
        async with open_tenant_session(tenant["tenant_id"]) as session:
            restored = (
                await session.execute(
                    text("SELECT count(*) FROM resource_permissions WHERE resource = 'student_admissions' AND action = 'create'")
                )
            ).scalar_one()
        assert restored >= 1
    finally:
        async with open_tenant_session(tenant["tenant_id"]) as session:
            await session.execute(text("UPDATE tenants SET plan_id = NULL WHERE id = CAST(:i AS uuid)"), {"i": tenant["tenant_id"]})
            await session.commit()
        async with PublicAsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM public.plans WHERE id = :i"), {"i": small_id})
            await session.commit()


async def test_logout_revokes_the_token(created, plan_id, client):
    tenant = await _provision(created, plan_id)
    year_id = await _add_academic_year(tenant["tenant_id"])
    body = (await _login(client, tenant, year_id)).json()
    auth = {"Authorization": f"Bearer {body['access_token']}", "cschema": tenant["client_name"]}

    assert (await client.get("/api/v1/masters/academic_years/", headers=auth)).status_code == 200

    logout = await client.post("/api/v1/auth/logout", headers=auth)
    assert logout.status_code == 200, logout.text

    after = await client.get("/api/v1/masters/academic_years/", headers=auth)
    assert after.status_code == 401


async def test_first_login_flag_forces_a_password_change(created, plan_id, client):
    from app.models.auth.user_model import User
    from app.tools.password_util import hash_password

    tenant = await _provision(created, plan_id)
    year_id = await _add_academic_year(tenant["tenant_id"])
    async with open_tenant_session(tenant["tenant_id"]) as session:
        teacher_role = (await session.execute(select(Role.id).where(Role.name == "Teacher"))).scalar_one()
        user = User(username="new_teacher", password_hash=hash_password(PASSWORD), role_id=teacher_role)
        session.add(user)
        await session.flush()
        await session.execute(text("UPDATE users SET is_first_login = TRUE WHERE id = :i"), {"i": str(user.id)})
        await session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "new_teacher", "password": PASSWORD, "academic_year_id": year_id},
        headers={"cschema": tenant["client_name"]},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["requires_password_change"] is True
    claims = jwt.decode(body["change_password_token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert claims["tenant_id"] == tenant["tenant_id"]

    done = await client.post(
        "/api/v1/auth/staff/set-password",
        json={
            "change_password_token": body["change_password_token"],
            "new_password": "Another-Pass-1!",
            "confirm_password": "Another-Pass-1!",
        },
        headers={"cschema": tenant["client_name"]},
    )
    assert done.status_code == 200, done.text
    final = jwt.decode(done.json()["access_token"], settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert final["tenant_id"] == tenant["tenant_id"]
    assert done.json()["tenant_id"] == tenant["tenant_id"]
    assert done.json()["client_name"] == tenant["client_name"]


async def test_expense_create_uses_the_token_tenant_without_a_header(created, plan_id, client):
    a = await _provision(created, plan_id, "a")
    b = await _provision(created, plan_id, "b")
    year_a = await _add_academic_year(a["tenant_id"])
    token = (await _login(client, a, year_a)).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    category = await client.post("/api/v1/expense/categories/", json={"name": "Utilities"}, headers=auth)
    assert category.status_code == 201, category.text
    created_type = await client.post(
        "/api/v1/expense/types/", json={"name": "Electricity", "category_id": category.json()["id"]}, headers=auth
    )
    assert created_type.status_code == 201, created_type.text

    async with open_tenant_session(a["tenant_id"]) as session:
        rows = (await session.execute(text("SELECT org_id::text, tenant_id::text FROM expense_types"))).all()
    assert rows == [(a["tenant_id"], a["tenant_id"])]
    async with open_tenant_session(b["tenant_id"]) as session:
        assert (await session.execute(text("SELECT count(*) FROM expense_types"))).scalar_one() == 0
