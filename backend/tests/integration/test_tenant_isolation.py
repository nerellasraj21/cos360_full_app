import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select, text, update
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.db.base import metadata
from app.db.tenant_session import PublicAsyncSessionLocal, open_tenant_session
from app.models.auth.role_model import Role
from app.models.load_all import load_all_models

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

load_all_models()


async def _make_tenant(label: str) -> str:
    tenant_id = uuid.uuid4()
    async with PublicAsyncSessionLocal() as session:
        await session.execute(
            text("INSERT INTO public.tenants (id, client_name, schema_name, is_active) VALUES (:i, :c, :s, true)"),
            {"i": tenant_id, "c": f"iso_{label}_{tenant_id.hex[:8]}", "s": f"iso_{label}_{tenant_id.hex[:8]}"},
        )
        await session.commit()
    return str(tenant_id)


async def _cleanup(*tenant_ids: str) -> None:
    for tenant_id in tenant_ids:
        async with open_tenant_session(tenant_id) as session:
            await session.execute(text("DELETE FROM public.roles"))
            await session.commit()
        async with PublicAsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM public.tenants WHERE id = :i"), {"i": uuid.UUID(tenant_id)})
            await session.commit()


@pytest_asyncio.fixture
async def two_tenants():
    a = await _make_tenant("a")
    b = await _make_tenant("b")
    yield a, b
    await _cleanup(a, b)


async def test_app_role_cannot_bypass_rls():
    async with PublicAsyncSessionLocal() as session:
        row = (
            await session.execute(
                text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user")
            )
        ).one()
    assert row.rolsuper is False
    assert row.rolbypassrls is False


async def test_every_tenant_table_has_forced_rls():
    tenant_tables = sorted(
        t.name for t in metadata.tables.values() if "tenant_id" in t.c and t.name not in ("report_audit", "super_admin_audit")
    )
    async with PublicAsyncSessionLocal() as session:
        rows = (
            await session.execute(
                text(
                    "SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c "
                    "JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'"
                )
            )
        ).all()
    state = {r.relname: (r.relrowsecurity, r.relforcerowsecurity) for r in rows}
    missing = [t for t in tenant_tables if state.get(t) != (True, True)]
    assert missing == []


async def test_same_natural_key_allowed_in_two_tenants(two_tenants):
    a, b = two_tenants
    for tenant_id in (a, b):
        async with open_tenant_session(tenant_id) as session:
            session.add(Role(name="Admin"))
            await session.commit()


async def test_duplicate_natural_key_rejected_within_a_tenant(two_tenants):
    a, _ = two_tenants
    async with open_tenant_session(a) as session:
        session.add(Role(name="Admin"))
        await session.commit()
    async with open_tenant_session(a) as session:
        session.add(Role(name="Admin"))
        with pytest.raises(IntegrityError):
            await session.commit()


async def test_each_tenant_sees_only_its_own_rows(two_tenants):
    a, b = two_tenants
    async with open_tenant_session(a) as session:
        session.add(Role(name="only_a"))
        await session.commit()
    async with open_tenant_session(b) as session:
        session.add(Role(name="only_b"))
        await session.commit()

    async with open_tenant_session(a) as session:
        names = (await session.execute(select(Role.name))).scalars().all()
    assert names == ["only_a"]
    async with open_tenant_session(b) as session:
        names = (await session.execute(select(Role.name))).scalars().all()
    assert names == ["only_b"]


async def test_tenant_scope_survives_commit_in_same_session(two_tenants):
    a, b = two_tenants
    async with open_tenant_session(b) as session:
        session.add(Role(name="other_tenant_row"))
        await session.commit()

    async with open_tenant_session(a) as session:
        session.add(Role(name="mine"))
        await session.flush()
        await session.commit()
        names = (await session.execute(select(Role.name))).scalars().all()
        assert names == ["mine"]
        await session.commit()
        count = (await session.execute(text("SELECT count(*) FROM public.roles"))).scalar_one()
        assert count == 1


async def test_session_without_tenant_sees_nothing_and_cannot_write(two_tenants):
    a, _ = two_tenants
    async with open_tenant_session(a) as session:
        session.add(Role(name="mine"))
        await session.commit()

    async with PublicAsyncSessionLocal() as session:
        count = (await session.execute(text("SELECT count(*) FROM public.roles"))).scalar_one()
        assert count == 0
        session.add(Role(name="orphan"))
        with pytest.raises((IntegrityError, DBAPIError)):
            await session.commit()


async def test_cannot_write_a_row_for_another_tenant(two_tenants):
    a, b = two_tenants
    async with open_tenant_session(a) as session:
        session.add(Role(name="smuggled", tenant_id=uuid.UUID(b)))
        with pytest.raises(DBAPIError):
            await session.commit()


async def test_cannot_update_or_delete_another_tenants_rows(two_tenants):
    a, b = two_tenants
    async with open_tenant_session(b) as session:
        session.add(Role(name="victim"))
        await session.commit()

    async with open_tenant_session(a) as session:
        updated = await session.execute(update(Role).where(Role.name == "victim").values(name="hacked"))
        deleted = await session.execute(text("DELETE FROM public.roles WHERE name = 'victim'"))
        await session.commit()
        assert updated.rowcount == 0
        assert deleted.rowcount == 0

    async with open_tenant_session(b) as session:
        names = (await session.execute(select(Role.name))).scalars().all()
    assert names == ["victim"]
