# Database migrations (multi-tenant)

How schema changes reach `public`, the `cos360_master` template and every tenant schema; how to create a tenant
schema; how to detect and repair drift; and how to back up.

_Last verified against code: 2026-09-29_

## The schemas

| Schema | Role |
|---|---|
| `public` | System tables (`BasePublic`): `tenants`, `plans`, `plan_resource_access`, super-admin tables, public menus. |
| `cos360_master` | **Structure-only template and source of truth** for tenant structure. New tenants are cloned from it, and its `alembic_version` is the reference revision. It holds no business data, and its `resource_permissions` table is empty. |
| tenant schemas | One per row in `public.tenants` (`client_name` = the `cschema` header value, `schema_name` = the schema). In code: `test_tenant_schema` (client `test_tenant`, dev/test) and `little_bunny` (client `little bunny`, the prod host default). |
| legacy names | `cos360_masters` (the `env.py` default; has no `alembic_version`) and `cos360_main` (used by some scripts and slash commands). Check they still exist before targeting them. |

List the live targets with `SELECT client_name, schema_name, is_active FROM public.tenants;`.

## How Alembic is wired (`backend/migrations/env.py`)

- One schema per run. `env.py` executes `SET search_path TO <SCHEMA_NAME>, public`, so each schema keeps its own
  `alembic_version` table. **Always set `SCHEMA_NAME`**, because the default is the legacy `cos360_masters`.
  Revisions themselves default to `cos360_master` when the variable is missing. The mismatch is a trap.
- `DATABASE_URL` from `.env` is rewritten for psycopg2 (`+asyncpg` dropped, `ssl=` → `sslmode=`) and to Neon's
  direct (non-`-pooler`) host.
- Autogenerate metadata = all `BaseOrg` + `BasePublic` tables (importing `app.models` registers everything).
- `app/service/schema/migration_service.py` shells out to `alembic upgrade head` with `SCHEMA_NAME` set. The
  multi-head problem below breaks it.

**History cannot be replayed from base.** The revision chain contains conflicting and partially hand-applied
revisions: an upgrade from an empty schema fails with `DuplicateTable`. Every schema that exists today was cloned
from the template and stamped. Never run `alembic upgrade head` on a schema without an `alembic_version` row; it
starts from base.

**`alembic_version` is not proof of structure.** DDL has been applied by per-schema scripts that
bumped (or didn't bump) the version row by hand. Before upgrading a schema, compare its structure with
`cos360_master` (see [Drift](#detecting-drift)) rather than trusting `alembic current`.

## Procedure: making a schema change

1. **Model + revision.** `alembic revision -m "<what>"` and write the ops by hand. Treat `--autogenerate` only as
   a draft: it reports drift noise (missing FKs, index names) as real changes. Revision ids must be unique; run
   `python scripts/check_duplicate_revisions.py` (hand-picked ids have collided before).
2. **Schema-aware and idempotent.** Schemas are not uniformly versioned, so a revision must succeed where the
   change already exists:
   ```python
   def upgrade() -> None:
       schema = os.environ["SCHEMA_NAME"]
       op.execute(f'ALTER TABLE "{schema}".vehicles ADD COLUMN IF NOT EXISTS is_ac BOOLEAN DEFAULT false')
       op.execute(f'CREATE INDEX IF NOT EXISTS ix_vehicles_is_ac ON "{schema}".vehicles (is_ac)')
   ```
   Pass `schema=schema` to `op.create_table` and similar calls. Put `CREATE INDEX` on a new column after the
   statement that adds the column (a `DO $$` block that adds it runs first). Implement `downgrade()`.
3. **One head.** `alembic heads` must print one revision. `f7a8b9c0d1e2` merged the old expense branch
   (`d3e4f5a6b7c8`) into the main chain. A schema whose `alembic_version` has duplicate or multiple rows fails the
   version update ("expected to match one row"); collapse it to the correct single row before upgrading.
4. **Back up** the target schemas ([Backups](#backups)).
5. **Template first:** `SCHEMA_NAME=cos360_master alembic upgrade <rev>`, then `alembic current`.
   PowerShell: `$env:SCHEMA_NAME='cos360_master'; alembic upgrade <rev>`.
6. **Every active tenant**, one at a time, with the same command. If a schema's `alembic_version` is off the chain
   or behind while its structure is already current, verify the DDL and then `alembic stamp <rev>`.
7. **Deploy code last.** A model column that isn't in every schema makes every query on that model fail with
   `UndefinedColumn` (500) for the tenants that lack it.
8. Re-run the drift check.

Rules learned from the schema-drift incident:
- No hand-run `ALTER`/`CREATE` against any schema without a committed revision, and no per-schema
  `apply_*_<schema>.py` scripts. That pattern produced tenants whose structure and version rows disagreed.
- Changes go to `cos360_master` first. A change that exists only in a tenant never reaches new tenants.

## Postgres enum types (per-schema gotcha)

Enum types such as `genderenum`, `channelenum` and `billingcycleenum` were originally created only in
`test_tenant_schema`. `CREATE TABLE … (LIKE … INCLUDING ALL)` copies a column's type **by OID**, so cloned
schemas pointed at another schema's type. With `search_path` set to one tenant, inserts failed with
`type … does not exist`. `scripts/fix_tenant_enum_types.py <schema>` creates schema-local types and rebinds
the columns. Run it after every clone. For new enumerations, prefer `VARCHAR` plus validation. If you must use a
Postgres enum, create it schema-qualified in the revision (`CREATE TYPE "{schema}".x AS ENUM …`, guarded by a
`pg_type`/`pg_namespace` existence check).

## Creating a tenant schema

The registered `POST /api/v1/super_admin/system/tenants/` creates only a skeleton (roles and menus tables) and
tells you to "run full migrations", which cannot work (see above). `EnhancedTenantSchemaService`
(clone-from-master) exists but its router is not registered. The working procedure is script-based
(reference: `scripts/create_little_bunny_tenant.py` and its companions):

1. Insert the `public.tenants` row (`client_name`, `schema_name`, `plan_id`, `is_active`).
2. `CREATE SCHEMA`, then for each base table in `cos360_master`:
   `CREATE TABLE "<new>"."<t>" (LIKE "cos360_master"."<t>" INCLUDING ALL)`.
   This copies columns, defaults, indexes and CHECKs but **not foreign keys**. Cloned schemas have no FK
   constraints, so services must check references themselves.
3. Insert `alembic_version` = `cos360_master`'s version.
4. `python scripts/fix_tenant_enum_types.py <schema>`.
5. Baseline data: menus, roles, `role_menu_permissions` and certificate templates copied from `cos360_master`
   (`seed_master_data_little_bunny.py` pattern). Role permissions come from a known-good tenant, translating
   `role_id` by role name (`seed_resource_permissions_little_bunny.py`), or from
   `POST /api/v1/auth/seed/all-role-permissions` with the new `cschema`. Plan layer: `docs/permissions.md`.
6. Academic year and first admin user (first-login flow). Never commit the password a seed script sets.
7. Smoke test with `cschema: <client_name>`.

Tenant lookups are cached per process (`TenantService` in `app/db/tenant_session.py`). New tenants resolve
immediately, because misses are never cached. Deactivating a tenant or changing its `schema_name` only takes
effect after the workers restart; nothing calls `invalidate_tenant_cache`.

## Detecting drift

Run a drift check before every migration and before every release.

- `python scripts/diagnose_schema_drift.py` — read-only; compares tables, columns and indexes of `cos360_master`
  vs `test_tenant_schema`. Index-name-only differences are expected noise. `_compare_schemas.py` gives a quick
  table/column diff. To check another tenant, change the schema constants.
- Ad-hoc column diff (swap the schemas to see the other direction):
  ```sql
  SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'cos360_master'
  EXCEPT
  SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = '<tenant>';
  ```
- Compare version rows: `SELECT version_num FROM "<schema>".alembic_version;` for each schema.

## Recovering from drift

1. Back up every affected schema.
2. Make `cos360_master` correct first: express each missing change as an idempotent revision and apply it there.
3. Bring each tenant forward with the same revisions. Where the structure already matches, `alembic stamp` it.
   If `stamp` fails, update `alembic_version` directly.
4. Re-run the drift check until only index-name noise remains.
5. Rebuilding the template by cloning a tenant is a last resort. The clone inherits the
   source's quirks (no FKs, foreign enum OIDs), so run `fix_tenant_enum_types.py cos360_master` afterwards and
   re-check. The current template was built this way (2026-04) with `scripts/recreate_cos360_master.py` (drops the
   schema immediately, no prompt or dry-run) then `scripts/clone_structure_to_master.py` (clones
   `test_tenant_schema`), then a manual `alembic_version` update.

## Backups

- Neon keeps automated backups with point-in-time restore. Before risky work, create a Neon branch or take a dump.
- Per-schema dump and restore (use the direct host, libpq URL form with `sslmode=require`):
  ```bash
  pg_dump "$PG_URL" --schema=<schema> --format=custom --no-acl --no-owner --file=backup_<schema>_$(date +%Y%m%d_%H%M%S).dump
  pg_restore --dbname="$PG_URL" --schema=<schema> --clean backup_<schema>_<ts>.dump
  ```
  Add `--schema-only` for a structure snapshot.
- Data-wipe tools write their own safety net: `clear_test_tenant_data.py` dumps rows to `backup_*.json`, and
  `cleanup_db.py` writes `cleanup_report_*.json`. Both patterns are gitignored. Keep the files out of the repo;
  they contain personal data.
- Data cleanup uses `DELETE` in FK-safe order inside one transaction, never `TRUNCATE` or `DROP`. Dry-run first
  (`DRY_RUN=true`, the default in `cleanup_db.py`).
