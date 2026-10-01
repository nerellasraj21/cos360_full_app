import json
import os
from pathlib import Path
import uuid

from dotenv import load_dotenv
import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.db.tenant_session import PublicAsyncSessionLocal, TenantService, open_tenant_session
from legacy_migration.catalog import classify
from legacy_migration.db import database_name, make_engine
from legacy_migration.migrate import MigrationError, run
from legacy_migration.options import Options
from legacy_migration.source import Source

from app.service.tenant.catalog_service import CatalogService
from app.service.tenant.provisioning_service import TenantProvisioningService

load_dotenv()
OWNER_URL = os.getenv("MIGRATION_DATABASE_URL")

pytestmark = [
    pytest.mark.integration,
    pytest.mark.asyncio,
    pytest.mark.skipif(not OWNER_URL, reason="MIGRATION_DATABASE_URL is not set"),
]

MENUS = [
    {"name": "Dashboard", "url": "/dashboard", "level": "L0", "display_order": 1},
    {"name": "Fee", "url": "/fee", "level": "L0", "display_order": 2},
]
SIM_SCHEMAS = ("legacy_public", "legacy_a", "legacy_b")


def _sql(engine, statement: str, params: dict | None = None):
    with engine.begin() as conn:
        result = conn.execute(text(statement), params or {})
        return result.all() if result.returns_rows else []


def _drop_custom_menu(engine) -> None:
    _sql(
        engine,
        "DELETE FROM public.plan_menu_access WHERE menu_id IN (SELECT id FROM public.menus WHERE url = '/custom')",
    )
    _sql(engine, "DELETE FROM public.menus WHERE url = '/custom'")


def _tenant_tables():
    return classify().tenant


def _clear_tenant(engine, tenant_id: str) -> None:
    with engine.begin() as conn:
        conn.execute(text("SELECT set_config('app.tenant_id', :t, true)"), {"t": tenant_id})
        for table in reversed(_tenant_tables()):
            conn.execute(text(f'DELETE FROM public."{table.name}"'))


def _export_to_legacy(engine, tenant_id: str, schema: str) -> None:
    with engine.begin() as conn:
        conn.execute(text("SELECT set_config('app.tenant_id', :t, true)"), {"t": tenant_id})
        for table in _tenant_tables():
            columns = [c.name for c in table.c if c.name != "tenant_id"]
            listed = ", ".join(f'"{c}"' for c in columns)
            conn.execute(
                text(f'INSERT INTO {schema}."{table.name}" ({listed}) SELECT {listed} FROM public."{table.name}"')
            )


@pytest_asyncio.fixture(scope="module")
async def sim(tmp_path_factory):
    engine = make_engine(OWNER_URL)
    _drop_custom_menu(engine)
    for schema in SIM_SCHEMAS:
        _sql(engine, f"DROP SCHEMA IF EXISTS {schema} CASCADE")
        _sql(engine, f"CREATE SCHEMA {schema}")

    async with PublicAsyncSessionLocal() as session:
        await CatalogService.import_menus(session, MENUS)
        plan = await CatalogService.ensure_full_plan(session, name="Full")
        await session.commit()
        plan_id = plan.id

    suffix = uuid.uuid4().hex[:6]
    names = {"a": f"mig_a_{suffix}", "b": f"mig_b_{suffix}"}
    ids = {}
    for key, name in names.items():
        result = await TenantProvisioningService.provision(
            name,
            plan_id,
            admin_username=f"admin_{name}",
            admin_email=f"{name}@example.com",
            admin_password="Mig-Test-1!",
        )
        ids[key] = result["tenant_id"]

    for key in ("a", "b"):
        schema = f"legacy_{key}"
        for table in _tenant_tables():
            _sql(engine, f'CREATE TABLE {schema}."{table.name}" (LIKE public."{table.name}" INCLUDING DEFAULTS)')
            _sql(engine, f'ALTER TABLE {schema}."{table.name}" DROP COLUMN tenant_id')
        _sql(engine, f"CREATE TABLE {schema}.menus (LIKE public.menus INCLUDING DEFAULTS)")
        _export_to_legacy(engine, ids[key], schema)

    for table_name in ("tenants", "plans", "plan_resource_access", "plan_menu_access", "menus"):
        _sql(engine, f'CREATE TABLE legacy_public."{table_name}" (LIKE public."{table_name}" INCLUDING DEFAULTS)')
    _sql(engine, "INSERT INTO legacy_public.plans SELECT * FROM public.plans")
    _sql(engine, "INSERT INTO legacy_public.plan_resource_access SELECT * FROM public.plan_resource_access")
    _sql(engine, "INSERT INTO legacy_public.plan_menu_access SELECT * FROM public.plan_menu_access")
    _sql(engine, "INSERT INTO legacy_public.menus SELECT * FROM public.menus")
    for key in ("a", "b"):
        _sql(
            engine,
            "INSERT INTO legacy_public.tenants (id, client_name, schema_name, plan_id, is_active) "
            "SELECT id, client_name, :schema, plan_id, is_active FROM public.tenants WHERE id = CAST(:i AS uuid)",
            {"schema": f"legacy_{key}", "i": ids[key]},
        )

    for key in ("a", "b"):
        schema = f"legacy_{key}"
        with engine.begin() as conn:
            conn.execute(
                text("CREATE TEMP TABLE menu_map AS SELECT id AS old_id, gen_random_uuid() AS new_id FROM public.menus")
            )
            conn.execute(
                text(
                    f"INSERT INTO {schema}.menus (id, name, url, level, parent_id, display_order) "
                    "SELECT m.new_id, p.name, p.url, p.level, NULL, p.display_order "
                    "FROM menu_map m JOIN public.menus p ON p.id = m.old_id"
                )
            )
            conn.execute(
                text(
                    f"UPDATE {schema}.role_menu_permissions r SET menu_id = m.new_id FROM menu_map m WHERE r.menu_id = m.old_id"
                )
            )
    _sql(engine, "UPDATE legacy_b.menus SET name = 'Fee Management' WHERE url = '/fee'")
    _sql(
        engine,
        "INSERT INTO legacy_a.menus (id, name, url, level, display_order) VALUES (gen_random_uuid(), 'Custom', '/custom', 'L0', 9)",
    )

    _sql(engine, "ALTER TABLE legacy_a.users ADD COLUMN legacy_note text")
    orphan_role = str(uuid.uuid4())
    _sql(
        engine,
        "INSERT INTO legacy_a.role_menu_permissions (id, role_id, menu_id) SELECT gen_random_uuid(), CAST(:r AS uuid), menu_id FROM legacy_a.role_menu_permissions LIMIT 1",
        {"r": orphan_role},
    )
    admin_a = _sql(engine, "SELECT id::text FROM legacy_a.roles WHERE name = 'Admin'")[0][0]
    admin_b_old = _sql(engine, "SELECT id::text FROM legacy_b.roles WHERE name = 'Admin'")[0][0]
    for table in ("users", "resource_permissions", "role_menu_permissions"):
        _sql(
            engine,
            f"UPDATE legacy_b.{table} SET role_id = CAST(:new AS uuid) WHERE role_id = CAST(:old AS uuid)",
            {"new": admin_a, "old": admin_b_old},
        )
    _sql(
        engine,
        "UPDATE legacy_b.roles SET id = CAST(:new AS uuid) WHERE id = CAST(:old AS uuid)",
        {"new": admin_a, "old": admin_b_old},
    )

    counts = {}
    for key in ("a", "b"):
        counts[key] = {
            t.name: _sql(engine, f'SELECT count(*) FROM legacy_{key}."{t.name}"')[0][0] for t in _tenant_tables()
        }

    for key in ("a", "b"):
        _clear_tenant(engine, ids[key])
    _sql(
        engine,
        "DELETE FROM public.tenants WHERE id IN (CAST(:a AS uuid), CAST(:b AS uuid))",
        {"a": ids["a"], "b": ids["b"]},
    )
    await TenantService.clear_cache()

    context = {
        "engine": engine,
        "names": names,
        "ids": ids,
        "counts": counts,
        "admin_a": admin_a,
        "out": tmp_path_factory.mktemp("migration_reports"),
        "orphan_role": orphan_role,
    }
    yield context

    for key in ("a", "b"):
        try:
            _clear_tenant(engine, ids[key])
        except Exception:
            pass
    _sql(
        engine,
        "DELETE FROM public.tenants WHERE id IN (CAST(:a AS uuid), CAST(:b AS uuid))",
        {"a": ids["a"], "b": ids["b"]},
    )
    _drop_custom_menu(engine)
    for schema in SIM_SCHEMAS:
        _sql(engine, f"DROP SCHEMA IF EXISTS {schema} CASCADE")
    engine.dispose()
    await TenantService.clear_cache()


def _options(sim, **overrides) -> Options:
    values = dict(
        source_url=OWNER_URL,
        target_url=OWNER_URL,
        platform_schema="legacy_public",
        tenants=list(sim["names"].values()),
        execute=True,
        confirm_target=database_name(OWNER_URL),
        allow_same_database=True,
        allow_nonempty_platform=True,
        out_dir=sim["out"],
    )
    values.update(overrides)
    return Options(**values)


def _target_tenant_rows(sim) -> int:
    return _sql(
        sim["engine"],
        "SELECT count(*) FROM public.tenants WHERE id IN (CAST(:a AS uuid), CAST(:b AS uuid))",
        {"a": sim["ids"]["a"], "b": sim["ids"]["b"]},
    )[0][0]


async def test_source_connection_cannot_write(sim):
    source = Source(OWNER_URL)
    try:
        with pytest.raises(DBAPIError):
            source.conn.execute(text("CREATE TABLE legacy_public.should_not_exist (x int)"))
    finally:
        source.close()


async def test_plan_reads_the_source_and_writes_nothing(sim):
    report = run(_options(sim, execute=False, target_url=None, confirm_target=None))
    assert report["mode"] == "plan"
    assert _target_tenant_rows(sim) == 0
    for key, client in sim["names"].items():
        entry = report["tenants"][client]
        assert entry["status"] == "ok"
        assert sum(t["source_rows"] for t in entry["tables"].values()) == sum(sim["counts"][key].values())
    assert report["tenants"][sim["names"]["a"]]["tables"]["users"]["dropped_columns"] == ["legacy_note"]
    assert report["tenants"][sim["names"]["a"]]["source_only_tables"] == []
    assert report["tenants"][sim["names"]["b"]]["remapped_ids"].get("roles") == 1
    assert report["platform"]["menus"]["tenant_menus_added_to_catalog"] == 1
    assert report["platform"]["menu_name_variants"]


async def test_guards_refuse_unsafe_runs(sim):
    with pytest.raises(MigrationError, match="same database"):
        run(_options(sim, allow_same_database=False))
    with pytest.raises(MigrationError, match="confirm-target"):
        run(_options(sim, confirm_target="some_other_db"))
    with pytest.raises(MigrationError, match="confirm-target"):
        run(_options(sim, confirm_target=None))
    with pytest.raises(MigrationError, match="not found"):
        run(_options(sim, tenants=["no_such_tenant"]))
    assert _target_tenant_rows(sim) == 0


async def test_migration_end_to_end(sim):
    report = run(_options(sim))
    assert report["ok"], json.dumps(report["failed_tenants"])
    a, b = sim["names"]["a"], sim["names"]["b"]

    for key, client in (("a", a), ("b", b)):
        entry = report["tenants"][client]
        assert entry["status"] == "ok" and entry["verification"]["ok"]
        for name, stats in entry["tables"].items():
            assert stats["inserted"] + stats["quarantined"] == stats["source_rows"], name
        assert entry["tables"]["roles"]["inserted"] == sim["counts"][key]["roles"]
        assert entry["tables"]["users"]["inserted"] == sim["counts"][key]["users"]

    assert report["tenants"][a]["tables"]["role_menu_permissions"]["quarantined"] == 1
    assert report["tenants"][b]["remapped_ids"]["roles"] == 1
    lines = [json.loads(line) for line in Path(report["quarantine_file"]).read_text(encoding="utf-8").splitlines()]
    assert any(r["kind"] == "orphan" and r["table"] == "role_menu_permissions" for r in lines)

    engine = sim["engine"]
    async with open_tenant_session(sim["ids"]["a"]) as session:
        roles_a = {r[0]: r[1] for r in (await session.execute(text("SELECT name, id::text FROM roles"))).all()}
        linked = (
            await session.execute(
                text(
                    "SELECT count(*) FROM role_menu_permissions p LEFT JOIN menus m ON m.id = p.menu_id WHERE m.id IS NULL"
                )
            )
        ).scalar_one()
        users_a = (await session.execute(text("SELECT count(*) FROM users"))).scalar_one()
    assert roles_a["Admin"] == sim["admin_a"]
    assert linked == 0
    assert users_a == sim["counts"]["a"]["users"]

    async with open_tenant_session(sim["ids"]["b"]) as session:
        roles_b = {r[0]: r[1] for r in (await session.execute(text("SELECT name, id::text FROM roles"))).all()}
        orphans = (
            await session.execute(
                text("SELECT count(*) FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE r.id IS NULL")
            )
        ).scalar_one()
        permission_roles = (
            await session.execute(text("SELECT DISTINCT role_id::text FROM resource_permissions"))
        ).all()
    assert roles_b["Admin"] != sim["admin_a"]
    assert orphans == 0
    assert roles_b["Admin"] in {row[0] for row in permission_roles}

    catalog = _sql(engine, "SELECT url, name FROM public.menus WHERE url IN ('/fee', '/custom')")
    assert {row[0] for row in catalog} == {"/fee", "/custom"}

    legacy_unchanged = _sql(engine, "SELECT count(*) FROM legacy_a.users")[0][0]
    assert legacy_unchanged == sim["counts"]["a"]["users"]


async def test_rerun_needs_replace_and_replace_redoes_it(sim):
    with pytest.raises(MigrationError, match="already exist"):
        run(_options(sim))
    report = run(_options(sim, replace=True))
    assert report["ok"], report["failed_tenants"]
    a = sim["names"]["a"]
    assert report["tenants"][a]["tables"]["users"]["inserted"] == sim["counts"]["a"]["users"]
    async with open_tenant_session(sim["ids"]["a"]) as session:
        assert (await session.execute(text("SELECT count(*) FROM users"))).scalar_one() == sim["counts"]["a"]["users"]


async def test_each_tenant_sees_only_its_own_migrated_rows(sim):
    async with open_tenant_session(sim["ids"]["a"]) as session:
        foreign = (
            await session.execute(
                text("SELECT count(*) FROM users WHERE username LIKE :p"), {"p": f"admin_{sim['names']['b']}"}
            )
        ).scalar_one()
    assert foreign == 0


def test_menu_merge_matches_by_url_and_flags_name_variants():
    from legacy_migration.menus import build_catalog

    platform_id, shared_id = uuid.uuid4(), uuid.uuid4()
    platform = [
        {"id": platform_id, "name": "Fee", "url": "/fee", "level": "L0", "parent_id": None, "display_order": None}
    ]
    first = [
        {
            "id": uuid.uuid4(),
            "name": "Fee Management",
            "url": "/fee/",
            "level": "L0",
            "parent_id": None,
            "display_order": 3,
        },
        {"id": shared_id, "name": "Custom", "url": "/custom", "level": "L0", "parent_id": None, "display_order": 1},
    ]
    second = [{"id": shared_id, "name": "Other", "url": "/other", "level": "L0", "parent_id": None, "display_order": 2}]

    result = build_catalog(platform, {"one": first, "two": second})

    ids = [str(row["id"]) for row in result.rows]
    assert len(ids) == len(set(ids)) == 3
    assert result.stats["tenant_menus_matched"] == 1 and result.stats["tenant_menus_added_to_catalog"] == 2
    assert result.name_variants == {"url|/fee": ["Fee", "Fee Management"]}
    fee = next(row for row in result.rows if row["url"] == "/fee")
    assert fee["id"] == platform_id and fee["display_order"] == 3
    assert result.mapping["two"][str(shared_id)] != result.mapping["one"][str(shared_id)]


async def test_orphan_policy_nulls_nullable_foreign_keys_or_quarantines(sim):
    engine = sim["engine"]
    a = sim["names"]["a"]
    _sql(
        engine,
        "INSERT INTO legacy_a.student_parent_links (id, parent_id, student_id) "
        "VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid())",
    )
    try:
        nulled = run(_options(sim, replace=True, tenants=[a], orphan_policy="null"))
        stats = nulled["tenants"][a]["tables"]["student_parent_links"]
        assert stats["inserted"] == 1 and stats["nulled_foreign_keys"] == 2 and stats["quarantined"] == 0
        async with open_tenant_session(sim["ids"]["a"]) as session:
            row = (await session.execute(text("SELECT parent_id, student_id FROM student_parent_links"))).one()
        assert row == (None, None)

        quarantined = run(_options(sim, replace=True, tenants=[a], orphan_policy="quarantine"))
        stats = quarantined["tenants"][a]["tables"]["student_parent_links"]
        assert stats["inserted"] == 0 and stats["quarantined"] == 1
    finally:
        _sql(engine, "DELETE FROM legacy_a.student_parent_links")


async def test_missing_required_column_is_a_blocker_and_stops_execution(sim):
    engine = sim["engine"]
    b = sim["names"]["b"]
    _sql(engine, "ALTER TABLE legacy_b.roles RENAME COLUMN name TO name_old")
    try:
        planned = run(_options(sim, execute=False, target_url=None, confirm_target=None, tenants=[b]))
        assert any("roles" in blocker and "name" in blocker for blocker in planned["blockers"])
        assert planned["ok"] is False
        with pytest.raises(MigrationError, match="Blockers"):
            run(_options(sim, replace=True, tenants=[b]))
    finally:
        _sql(engine, "ALTER TABLE legacy_b.roles RENAME COLUMN name_old TO name")


async def test_clear_media_references_nulls_references_and_skips_file_records(sim):
    engine = sim["engine"]
    a = sim["names"]["a"]
    _sql(
        engine,
        "INSERT INTO legacy_a.school_settings (id, image_url, principal_signature_url) "
        "VALUES (gen_random_uuid(), '/media/school/images/x.png', '/media/school/signatures/y.png')",
    )
    _sql(
        engine,
        "INSERT INTO legacy_a.stale_file_registry (id, s3_key, tenant_schema, expires_at, created_at) "
        "VALUES (gen_random_uuid(), 'legacy_a/documents/old.pdf', 'legacy_a', now(), now())",
    )
    try:
        kept = run(_options(sim, replace=True, tenants=[a]))
        assert kept["tenants"][a]["tables"]["school_settings"]["media_references_cleared"] == 0
        assert kept["tenants"][a]["tables"]["stale_file_registry"]["inserted"] == 1
        async with open_tenant_session(sim["ids"]["a"]) as session:
            image = (await session.execute(text("SELECT image_url FROM school_settings"))).scalar_one()
        assert image == "/media/school/images/x.png"

        cleared = run(_options(sim, replace=True, tenants=[a], clear_media_references=True))
        tables = cleared["tenants"][a]["tables"]
        assert tables["school_settings"]["inserted"] == 1
        assert tables["school_settings"]["media_references_cleared"] == 2
        assert tables["stale_file_registry"]["inserted"] == 0
        assert tables["stale_file_registry"]["media_records_skipped"] == 1
        for stats in tables.values():
            assert stats["inserted"] + stats["quarantined"] + stats["media_records_skipped"] == stats["source_rows"]
        async with open_tenant_session(sim["ids"]["a"]) as session:
            row = (await session.execute(text("SELECT image_url, principal_signature_url FROM school_settings"))).one()
            registry = (await session.execute(text("SELECT count(*) FROM stale_file_registry"))).scalar_one()
        assert row == (None, None) and registry == 0
        lines = [json.loads(line) for line in Path(cleared["quarantine_file"]).read_text(encoding="utf-8").splitlines()]
        assert any(r["kind"] == "media_record_skipped" and r["table"] == "stale_file_registry" for r in lines)
    finally:
        _sql(engine, "DELETE FROM legacy_a.school_settings")
        _sql(engine, "DELETE FROM legacy_a.stale_file_registry")
