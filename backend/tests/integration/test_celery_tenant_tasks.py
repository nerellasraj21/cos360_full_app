import uuid

import pytest
import pytest_asyncio
from sqlalchemy import select, text

from app.db.base import metadata
from app.db.tenant_session import PublicAsyncSessionLocal, TenantService, open_tenant_session
from app.models.communication.communication_model import NotificationLog, NotificationQueue
from app.models.load_all import load_all_models
from app.service.tenant.catalog_service import CatalogService
from app.service.tenant.provisioning_service import TenantProvisioningService
from app.tasks.communication import send_tasks

pytestmark = [pytest.mark.integration, pytest.mark.asyncio]

load_all_models()


@pytest_asyncio.fixture
async def plan_id():
    async with PublicAsyncSessionLocal() as session:
        plan = await CatalogService.ensure_full_plan(session, name="Full")
        await session.commit()
        return plan.id


@pytest_asyncio.fixture
async def tenants(plan_id):
    created = []
    for label in ("a", "b"):
        result = await TenantProvisioningService.provision(f"task_{label}_{uuid.uuid4().hex[:8]}", plan_id)
        created.append(result["tenant_id"])
    yield created
    tables = [
        t.name
        for t in reversed(metadata.sorted_tables)
        if "tenant_id" in t.c and t.name not in ("report_audit", "super_admin_audit")
    ]
    for tenant_id in created:
        async with open_tenant_session(tenant_id) as session:
            for table in tables:
                await session.execute(text(f'DELETE FROM public."{table}"'))
            await session.commit()
        async with PublicAsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM public.tenants WHERE id = CAST(:i AS uuid)"), {"i": tenant_id})
            await session.commit()
    await TenantService.clear_cache()


async def _queue_message(tenant_id: str) -> str:
    async with open_tenant_session(tenant_id) as session:
        row = NotificationQueue(
            channel="sms",
            rendered_message="hello",
            recipient_phone="9000000000",
            triggered_by=uuid.uuid4(),
            target_type="test",
        )
        session.add(row)
        await session.flush()
        queue_id = str(row.id)
        await session.commit()
    return queue_id


async def _status(tenant_id: str, queue_id: str):
    async with open_tenant_session(tenant_id) as session:
        return (
            await session.execute(
                text("SELECT status::text FROM notification_queue WHERE id = CAST(:i AS uuid)"), {"i": queue_id}
            )
        ).scalar_one_or_none()


async def test_batch_runs_only_in_the_given_tenant(tenants, monkeypatch):
    a, b = tenants
    monkeypatch.setattr(send_tasks, "_call_provider", lambda channel, row_data: "provider-1")
    queue_a = await _queue_message(a)
    queue_b = await _queue_message(b)

    await send_tasks._process_batch([queue_a], "sms", a)

    assert await _status(a, queue_a) == "done"
    assert await _status(b, queue_b) == "queued"

    async with open_tenant_session(a) as session:
        logs = (await session.execute(select(NotificationLog))).scalars().all()
        assert len(logs) == 1 and str(logs[0].tenant_id) == a
    async with open_tenant_session(b) as session:
        assert (await session.execute(select(NotificationLog))).scalars().all() == []


async def test_batch_cannot_reach_another_tenants_queue_rows(tenants, monkeypatch):
    a, b = tenants
    calls = []
    monkeypatch.setattr(send_tasks, "_call_provider", lambda channel, row_data: calls.append(row_data) or "x")
    queue_b = await _queue_message(b)

    await send_tasks._process_batch([queue_b], "sms", a)

    assert calls == []
    assert await _status(b, queue_b) == "queued"
    async with open_tenant_session(b) as session:
        assert (await session.execute(select(NotificationLog))).scalars().all() == []


async def test_failed_send_is_logged_in_the_same_tenant_and_retried(tenants, monkeypatch):
    a, _ = tenants

    def boom(channel, row_data):
        raise RuntimeError("provider down")

    monkeypatch.setattr(send_tasks, "_call_provider", boom)
    queue_a = await _queue_message(a)

    with pytest.raises(RuntimeError):
        await send_tasks._process_batch([queue_a], "sms", a)
