import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.service.student import file_manager as file_manager_module
from app.tools.cache_utils import create_tenant_cache_key


@pytest.mark.asyncio
async def test_cache_keys_differ_per_tenant_session():
    first, second = AsyncSession(), AsyncSession()
    first.info["tenant_id"] = str(uuid.uuid4())
    second.info["tenant_id"] = str(uuid.uuid4())
    key_a = await create_tenant_cache_key("dropdown_fee_types", first, 1, page=2)
    key_b = await create_tenant_cache_key("dropdown_fee_types", second, 1, page=2)
    assert key_a != key_b
    assert first.info["tenant_id"] in key_a
    assert second.info["tenant_id"] in key_b


@pytest.mark.asyncio
async def test_uploaded_file_keys_do_not_collide_across_tenants(tmp_path, monkeypatch):
    monkeypatch.setattr(file_manager_module, "MEDIA_ROOT", str(tmp_path))
    manager = file_manager_module.FileManager()
    student_id = str(uuid.uuid4())
    tenant_a, tenant_b = str(uuid.uuid4()), str(uuid.uuid4())
    key_a = await manager.upload_bytes(tenant_a, "certificates", student_id, b"%PDF-a", ".pdf", "application/pdf")
    key_b = await manager.upload_bytes(tenant_b, "certificates", student_id, b"%PDF-b", ".pdf", "application/pdf")
    assert key_a.startswith(f"{tenant_a}/") and key_b.startswith(f"{tenant_b}/")
    assert (tmp_path / key_a).read_bytes() == b"%PDF-a"
    assert (tmp_path / key_b).read_bytes() == b"%PDF-b"
