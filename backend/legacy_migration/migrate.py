from datetime import UTC, datetime
import json
import logging
from pathlib import Path
from typing import Any
import uuid

from sqlalchemy import Table, delete, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import SQLAlchemyError

from .catalog import (
    MENU_REFERENCES,
    SCHEMA_NAME_COLUMNS,
    SKIP_PLATFORM_TABLES,
    SPECIAL_PLATFORM_TABLES,
    STRING_TENANT_COLUMNS,
    classify,
    foreign_key_columns,
    loose_references,
)
from .db import database_name, identity, make_engine, quote_ident
from .mapping import coerce, column_plan
from .menus import CatalogResult, build_catalog
from .options import Options
from .source import Source

logger = logging.getLogger("legacy_migration")

MENU_COLUMNS = ["id", "name", "url", "level", "parent_id", "display_order"]


class MigrationError(Exception):
    pass


class Quarantine:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.handle = open(path, "a", encoding="utf-8")
        self.count = 0

    def write(self, kind: str, scope: str, table: str, reason: str, row: dict[str, Any] | None) -> None:
        record = {"kind": kind, "scope": scope, "table": table, "reason": reason[:400], "row": row}
        self.handle.write(json.dumps(record, default=str) + "\n")
        self.count += 1

    def close(self) -> None:
        self.handle.close()


class Scope:
    def __init__(self, name: str, tenant_uuid: uuid.UUID | None = None, schema: str | None = None):
        self.name = name
        self.tenant_uuid = tenant_uuid
        self.schema = schema
        self.remap: dict[str, dict[str, uuid.UUID]] = {}
        self.ids: dict[str, set[str]] = {}
        self.menu_map: dict[str, uuid.UUID] = {}


class Migrator:
    def __init__(self, options: Options, source: Source, target: Engine | None, started: datetime | None = None):
        self.opts = options
        self.source = source
        self.target = target
        self.tables = classify()
        self.fk = foreign_key_columns()
        self.loose = loose_references()
        self.referenced = {ref for refs in self.fk.values() for _, ref in refs} | {
            ref for refs in self.loose.values() for _, ref in refs
        }
        self.used_ids: dict[str, set[str]] = {}
        self.started = started or datetime.now(UTC)
        stamp = self.started.strftime("%Y%m%d_%H%M%S")
        self.report_dir = Path(options.out_dir) / stamp
        self.quarantine = Quarantine(self.report_dir / "quarantine.jsonl")
        self.report: dict[str, Any] = {
            "mode": "migrate" if options.execute else "plan",
            "started_at": self.started.isoformat(),
            "platform_schema": options.platform_schema,
            "target_database": database_name(options.target_url) if options.target_url else None,
            "platform": {"tables": {}},
            "tenants": {},
            "blockers": [],
        }
        self.schema_to_tenant: dict[str, str] = {}
        self.catalog: CatalogResult | None = None
        self.catalog_ids: set[str] = set()

    def run(self) -> dict[str, Any]:
        try:
            selected = self._select_tenants()
            self._preflight(selected)
            self._build_catalog(selected)
            if self.opts.execute:
                self._guard_target(selected)
            self._copy_platform(selected)
            for tenant in selected:
                self._copy_tenant(tenant)
            if self.opts.execute:
                self._verify(selected)
        finally:
            self.quarantine.close()
        self._finish()
        return self.report

    def _select_tenants(self) -> list[dict[str, Any]]:
        everything = self.source.tenants(self.opts.platform_schema)
        wanted = {t.lower() for t in self.opts.tenants}
        selected = [t for t in everything if not wanted or str(t["client_name"]).lower() in wanted]
        missing = wanted - {str(t["client_name"]).lower() for t in selected}
        if missing:
            raise MigrationError(f"Tenants not found in the source registry: {sorted(missing)}")
        usable = []
        for tenant in selected:
            schema = tenant.get("schema_name")
            try:
                quote_ident(schema)
            except ValueError:
                self.report["blockers"].append(f"{tenant['client_name']}: unsafe or missing schema name {schema!r}")
                continue
            if not self.source.schema_exists(schema):
                self.report["blockers"].append(f"{tenant['client_name']}: schema {schema} does not exist in the source")
                continue
            usable.append(tenant)
            self.schema_to_tenant[schema] = str(tenant["id"])
        return usable

    def _preflight(self, selected: list[dict[str, Any]]) -> None:
        for tenant in selected:
            for table in self.tables.tenant:
                columns = self.source.columns(tenant["schema_name"], table.name)
                plan = column_plan(table, columns)
                if plan["missing_required"] and self.source.count(tenant["schema_name"], table.name) > 0:
                    self.report["blockers"].append(
                        f"{tenant['client_name']}.{table.name}: source lacks required columns {plan['missing_required']}"
                    )
        if self.report["blockers"] and self.opts.execute:
            raise MigrationError(
                "Blockers found; run `plan` and resolve them first:\n" + "\n".join(self.report["blockers"])
            )

    def _build_catalog(self, selected: list[dict[str, Any]]) -> None:
        platform_rows = self._read_all(self.opts.platform_schema, "menus", MENU_COLUMNS)
        tenant_rows = {t["client_name"]: self._read_all(t["schema_name"], "menus", MENU_COLUMNS) for t in selected}
        self.catalog = build_catalog(platform_rows, tenant_rows)
        self.catalog_ids = {str(r["id"]) for r in self.catalog.rows}
        self.report["platform"]["menus"] = self.catalog.stats
        self.report["platform"]["menu_name_variants"] = self.catalog.name_variants

    def _read_all(self, schema: str, table: str, wanted: list[str]) -> list[dict[str, Any]]:
        columns = self.source.columns(schema, table)
        if columns is None:
            return []
        usable = [c for c in wanted if c in columns]
        rows: list[dict[str, Any]] = []
        for batch in self.source.rows(schema, table, usable, self.opts.batch_size):
            rows.extend(batch)
        return rows

    def _guard_target(self, selected: list[dict[str, Any]]) -> None:
        if self.target is None or not self.opts.target_url:
            raise MigrationError("A target database URL is required to execute")
        if not self.opts.allow_same_database and identity(self.opts.source_url) == identity(self.opts.target_url):
            raise MigrationError("Source and target are the same database")
        if self.opts.confirm_target != database_name(self.opts.target_url):
            raise MigrationError(
                f"--confirm-target must equal the target database name ({database_name(self.opts.target_url)!r})"
            )
        with self.target.connect() as conn:
            existing = conn.execute(text("SELECT id::text, client_name FROM tenants")).all()
            clashes = [
                row.client_name
                for row in existing
                if row.id in {str(t["id"]) for t in selected} or row.client_name in {t["client_name"] for t in selected}
            ]
            if clashes and not self.opts.replace:
                raise MigrationError(f"Tenants already exist in the target: {clashes}. Use --replace to redo them.")
            if not self.opts.allow_nonempty_platform and not self.opts.replace:
                for name in ("plans", "menus"):
                    if conn.execute(text(f"SELECT count(*) FROM {name}")).scalar_one():
                        raise MigrationError(
                            f"Target table {name} is not empty. Use --allow-nonempty-platform to merge into it."
                        )

    def _copy_platform(self, selected: list[dict[str, Any]]) -> None:
        if self.opts.execute:
            with self.target.begin() as conn:
                self._copy_platform_tables(conn, selected)
        else:
            self._copy_platform_tables(None, selected)

    def _copy_platform_tables(self, conn: Connection | None, selected: list[dict[str, Any]]) -> None:
        scope = Scope("platform", None, self.opts.platform_schema)
        selected_names = {t["client_name"] for t in selected}
        for table in self.tables.platform:
            name = table.name
            if name in SKIP_PLATFORM_TABLES:
                continue
            if name in SPECIAL_PLATFORM_TABLES:
                self.report["platform"]["tables"][name] = self._insert_menu_catalog(conn, table)
                continue
            row_filter = (lambda raw: raw.get("client_name") in selected_names) if name == "tenants" else None
            self.report["platform"]["tables"][name] = self._copy_table(conn, table, scope, row_filter)

    def _insert_menu_catalog(self, conn: Connection | None, table: Table) -> dict[str, Any]:
        assert self.catalog is not None
        pending = list(self.catalog.rows)
        placed: set[str] = set()
        ordered: list[dict[str, Any]] = []
        while pending:
            progress = False
            rest = []
            for row in pending:
                parent = row["parent_id"]
                if parent is None or str(parent) in placed or str(parent) not in self.catalog_ids:
                    ordered.append(row if parent is None or str(parent) in placed else {**row, "parent_id": None})
                    placed.add(str(row["id"]))
                    progress = True
                else:
                    rest.append(row)
            if not progress:
                ordered.extend({**r, "parent_id": None} for r in rest)
                break
            pending = rest
        inserted = 0
        if conn is not None and ordered:
            statement = pg_insert(table).on_conflict_do_nothing() if self._lenient() else table.insert()
            for row in ordered:
                conn.execute(statement, [row])
                inserted += 1
        else:
            inserted = len(ordered)
        return {"status": "ok", "source_rows": len(ordered), "inserted": inserted, "quarantined": 0}

    def _lenient(self) -> bool:
        return self.opts.allow_nonempty_platform or self.opts.replace

    def _copy_tenant(self, tenant: dict[str, Any]) -> None:
        client = tenant["client_name"]
        tenant_uuid = tenant["id"] if isinstance(tenant["id"], uuid.UUID) else uuid.UUID(str(tenant["id"]))
        scope = Scope(client, tenant_uuid, tenant["schema_name"])
        assert self.catalog is not None
        scope.menu_map = self.catalog.mapping.get(client, {})
        entry: dict[str, Any] = {
            "tenant_id": str(tenant_uuid),
            "schema": tenant["schema_name"],
            "tables": {},
            "status": "ok",
        }
        known = {t.name for t in self.tables.tenant} | {"menus", "alembic_version"}
        entry["source_only_tables"] = sorted(self.source.tables(tenant["schema_name"]) - known)
        self.report["tenants"][client] = entry
        try:
            if self.opts.execute:
                with self.target.begin() as conn:
                    conn.execute(text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant_uuid)})
                    if self.opts.replace:
                        for table in reversed(self.tables.tenant):
                            conn.execute(delete(table))
                    elif conn.execute(text("SELECT count(*) FROM roles")).scalar_one():
                        raise MigrationError(f"{client} already has data in the target. Use --replace to redo it.")
                    for table in self.tables.tenant:
                        entry["tables"][table.name] = self._copy_table(conn, table, scope, None)
            else:
                for table in self.tables.tenant:
                    entry["tables"][table.name] = self._copy_table(None, table, scope, None)
        except Exception as exc:
            entry["status"] = "failed"
            entry["error"] = f"{type(exc).__name__}: {exc}"[:500]
            logger.error("Tenant %s failed: %s", client, exc)
        entry["remapped_ids"] = {t: len(m) for t, m in scope.remap.items() if m}

    def _copy_table(self, conn: Connection | None, table: Table, scope: Scope, row_filter: Any) -> dict[str, Any]:
        schema = scope.schema or self.opts.platform_schema
        source_columns = self.source.columns(schema, table.name)
        plan = column_plan(table, source_columns)
        source_rows = self.source.count(schema, table.name) if source_columns is not None else 0
        stats: dict[str, Any] = {
            "status": plan["status"],
            "source_rows": source_rows,
            "inserted": 0,
            "quarantined": 0,
            "nulled_foreign_keys": 0,
            "filtered_out": 0,
            "dropped_columns": plan["dropped"],
            "missing_required_columns": plan["missing_required"],
        }
        scope.ids.setdefault(table.name, set())
        if source_columns is None or plan["missing_required"]:
            return stats

        tenant_scoped = scope.tenant_uuid is not None
        strict_fks = list(self.fk.get(table.name, []))
        loose = list(self.loose.get(table.name, []))
        track_ids = table.name in self.referenced
        remap_this = scope.remap.setdefault(table.name, {})
        lenient = (not tenant_scoped) and self._lenient()

        for batch in self.source.rows(schema, table.name, plan["common"], self.opts.batch_size):
            prepared: list[dict[str, Any]] = []
            for raw in batch:
                if row_filter is not None and not row_filter(raw):
                    stats["filtered_out"] += 1
                    continue
                row = self._transform(table, raw, plan["common"], scope, stats, strict_fks, loose, remap_this)
                if row is not None:
                    prepared.append(row)
            written = self._insert(conn, table, prepared, scope, stats, lenient)
            stats["inserted"] += len(written)
            if track_ids and "id" in table.c:
                scope.ids[table.name].update(str(r["id"]) for r in written if r.get("id") is not None)
        if not tenant_scoped:
            scope.ids.clear()
        return stats

    def _transform(
        self,
        table: Table,
        raw: dict[str, Any],
        common: list[str],
        scope: Scope,
        stats: dict[str, Any],
        strict_fks: list[tuple[str, str]],
        loose: list[tuple[str, str]],
        remap_this: dict[str, uuid.UUID],
    ) -> dict[str, Any] | None:
        name = table.name
        tenant_scoped = scope.tenant_uuid is not None
        try:
            row = {column: coerce(table.c[column], raw[column]) for column in common}
        except Exception as exc:
            self._quarantine("transform_error", scope, name, str(exc), raw, stats)
            return None
        if tenant_scoped:
            row["tenant_id"] = scope.tenant_uuid

        if tenant_scoped and row.get("id") is not None:
            key = str(row["id"])
            used = self.used_ids.setdefault(name, set())
            if key in used:
                fresh = uuid.uuid4()
                remap_this[key] = fresh
                row["id"] = fresh
                key = str(fresh)
            used.add(key)

        if tenant_scoped:
            strict = {(c, r) for c, r in strict_fks}
            for column, ref in strict_fks + loose:
                value = row.get(column)
                if value is None:
                    continue
                mapped = scope.remap.get(ref, {}).get(str(value))
                if mapped is not None:
                    row[column] = mapped
                    value = mapped
                if (column, ref) in strict and ref in scope.ids and not self._ref_exists(scope, ref, value):
                    if not self._resolve_orphan(table, row, column, ref, scope, stats):
                        self._quarantine("orphan", scope, name, f"{column} -> {ref} {value}", raw, stats)
                        return None
            menu_column = MENU_REFERENCES.get(name)
            if menu_column and row.get(menu_column) is not None:
                old = str(row[menu_column])
                new = scope.menu_map.get(old)
                if new is not None:
                    row[menu_column] = new
                elif str(row[menu_column]) not in self.catalog_ids:
                    if not self._resolve_orphan(table, row, menu_column, "menus", scope, stats):
                        self._quarantine("orphan", scope, name, f"{menu_column} -> menus {old}", raw, stats)
                        return None
            info_column = SCHEMA_NAME_COLUMNS.get(name)
            if info_column and info_column in row:
                row[info_column] = str(scope.tenant_uuid)

        string_column = STRING_TENANT_COLUMNS.get(name)
        if string_column and row.get(string_column) is not None:
            row[string_column] = self.schema_to_tenant.get(str(row[string_column]), row[string_column])
        return row

    def _ref_exists(self, scope: Scope, ref: str, value: Any) -> bool:
        return str(value) in scope.ids.get(ref, set())

    def _resolve_orphan(
        self, table: Table, row: dict[str, Any], column: str, ref: str, scope: Scope, stats: dict[str, Any]
    ) -> bool:
        if self.opts.orphan_policy == "null" and table.c[column].nullable:
            self.quarantine.write(
                "nulled_foreign_key", scope.name, table.name, f"{column} -> {ref} {row[column]}", None
            )
            row[column] = None
            stats["nulled_foreign_keys"] += 1
            return True
        return False

    def _quarantine(
        self, kind: str, scope: Scope, table: str, reason: str, row: dict[str, Any], stats: dict[str, Any]
    ) -> None:
        self.quarantine.write(kind, scope.name, table, reason, row)
        stats["quarantined"] += 1

    def _insert(
        self,
        conn: Connection | None,
        table: Table,
        rows: list[dict[str, Any]],
        scope: Scope,
        stats: dict[str, Any],
        lenient: bool,
    ) -> list[dict[str, Any]]:
        if not rows:
            return []
        if conn is None:
            return rows
        statement = pg_insert(table).on_conflict_do_nothing() if lenient else table.insert()
        try:
            with conn.begin_nested():
                conn.execute(statement, rows)
            return rows
        except SQLAlchemyError:
            written = []
            for row in rows:
                try:
                    with conn.begin_nested():
                        conn.execute(statement, [row])
                    written.append(row)
                except SQLAlchemyError as exc:
                    reason = str(exc.orig if hasattr(exc, "orig") else exc)
                    if scope.tenant_uuid is not None and "_pkey" in reason and row.get("id") is not None:
                        old = str(row["id"])
                        row = {**row, "id": uuid.uuid4()}
                        try:
                            with conn.begin_nested():
                                conn.execute(statement, [row])
                            scope.remap.setdefault(table.name, {})[old] = row["id"]
                            written.append(row)
                            continue
                        except SQLAlchemyError as retry:
                            reason = str(retry.orig if hasattr(retry, "orig") else retry)
                    self._quarantine("insert_error", scope, table.name, type(exc).__name__ + ": " + reason, row, stats)
            return written

    def _verify(self, selected: list[dict[str, Any]]) -> None:
        for tenant in selected:
            entry = self.report["tenants"].get(tenant["client_name"])
            if not entry or entry["status"] != "ok":
                continue
            mismatches = []
            with self.target.begin() as conn:
                conn.execute(text("SELECT set_config('app.tenant_id', :t, true)"), {"t": str(tenant["id"])})
                for table in self.tables.tenant:
                    expected = entry["tables"][table.name]["inserted"]
                    actual = conn.execute(text(f"SELECT count(*) FROM {quote_ident(table.name)}")).scalar_one()
                    if actual != expected:
                        mismatches.append({"table": table.name, "expected": expected, "actual": actual})
            entry["verification"] = {"ok": not mismatches, "mismatches": mismatches}
            if mismatches:
                entry["status"] = "failed"
                entry["error"] = "Row counts in the target do not match what was inserted"

    def _finish(self) -> None:
        totals = {"source_rows": 0, "inserted": 0, "quarantined": 0, "nulled_foreign_keys": 0}
        for entry in self.report["tenants"].values():
            for stats in entry["tables"].values():
                for key in totals:
                    totals[key] += stats.get(key, 0)
        failed = [name for name, e in self.report["tenants"].items() if e["status"] != "ok"]
        self.report["totals"] = totals
        self.report["failed_tenants"] = failed
        self.report["ok"] = not failed and not self.report["blockers"]
        self.report["quarantine_file"] = str(self.quarantine.path)
        self.report["finished_at"] = datetime.now(UTC).isoformat()
        (self.report_dir / "report.json").write_text(json.dumps(self.report, indent=2, default=str), encoding="utf-8")


def run(options: Options) -> dict[str, Any]:
    source = Source(options.source_url)
    target = make_engine(options.target_url) if (options.execute and options.target_url) else None
    try:
        return Migrator(options, source, target).run()
    finally:
        source.close()
        if target is not None:
            target.dispose()
