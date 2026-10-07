# Database migrations

How schema changes reach the shared database, how to set up a local database, and how to back up.

_Last verified against code: 2026-10-07_

## The database

One PostgreSQL database with one schema (`public`). Tenant tables carry `tenant_id` and row-level security; platform tables (tenants, plans, menu catalog, super-admin, token blacklist, locations) do not. See `docs/architecture.md` section 1.

Two roles:

| Role | Used by | Rights |
|---|---|---|
| owner | Alembic and ops (`MIGRATION_DATABASE_URL`) | Owns the database and schema; runs DDL |
| app | The API and workers (`DATABASE_URL`) | Not the owner, not a superuser, no `BYPASSRLS`; DML only |

The app role must never be the owner or a superuser, because both bypass row-level security and the isolation guarantee would silently disappear.

## Local setup

1. As a superuser, create the roles and database:
   ```sql
   CREATE ROLE cos360_owner LOGIN PASSWORD '<owner_password>';
   CREATE ROLE cos360_app LOGIN PASSWORD '<app_password>' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
   CREATE DATABASE cos360_unischema OWNER cos360_owner;
   GRANT CONNECT ON DATABASE cos360_unischema TO cos360_app;
   ```
2. Connected to that database as a superuser:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ALTER SCHEMA public OWNER TO cos360_owner;
   GRANT USAGE ON SCHEMA public TO cos360_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE cos360_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cos360_app;
   ALTER DEFAULT PRIVILEGES FOR ROLE cos360_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cos360_app;
   ```
3. In `backend/.env` (gitignored), URL-encode special characters in passwords (`@` is `%40`):
   ```
   DATABASE_URL=postgresql+asyncpg://cos360_app:<app_password>@localhost:5432/cos360_unischema
   MIGRATION_DATABASE_URL=postgresql+psycopg2://cos360_owner:<owner_password>@localhost:5432/cos360_unischema
   ```
4. `alembic upgrade head` from `backend/`.
5. Create tenants with `POST /super_admin/system/tenants/`, or for local work use the scripted tenants: the demo tenant (`backend/CLAUDE.md`, Scripts) and the QA tenant (`docs/testing/test-environment.md`). Both live in this same database.

## How Alembic is wired (`backend/migrations/env.py`)

- One schema, one `alembic_version`. `migrations/versions/` starts at a baseline (`0001`); `0002` enables RLS on every tenant table. Revision ids are sequential four-digit numbers (`0001`, `0002`, ...), not Alembic's random hex. The old per-schema history is in `migrations/legacy_versions/` for reference and cannot be applied; `SCHEMA_NAME` is read only there.
- `MIGRATION_DATABASE_URL` is required and `env.py` sets no `search_path`. `+asyncpg` and `+psycopg` prefixes are rewritten for psycopg2, and `ssl=` becomes `sslmode=`. `alembic.ini` has no URL of its own.
- `load_all_models()` imports every model file and applies the per-tenant uniqueness rule, so autogenerate sees the same metadata the app does. On a clean database autogenerate reports no changes; anything else is real drift.

## Procedure: making a schema change

1. Change the model, then `alembic revision --autogenerate --rev-id <next number> -m "<what>"` (check the current head with `alembic heads`). Read the output line by line.
2. **A new tenant table** needs `tenant_id` (inherit `BaseOrg`; it is added for you) and RLS in the same revision:
   ```python
   from app.db.rls import enable_tenant_rls

   def upgrade() -> None:
       op.create_table("vehicles_extra", ...)
       enable_tenant_rls(op, "vehicles_extra")
   ```
   `test_every_tenant_table_has_forced_rls` (`backend/tests/integration/test_tenant_isolation.py`, run against the local database) fails if a table is missed.
3. **A unique key on a tenant table** is made per tenant automatically. If another table references it by foreign key, make that foreign key composite with `tenant_id`.
4. A new platform table (no tenant data) inherits `BasePublic` and needs no RLS.
5. Never create tables at runtime: the app role has no DDL rights.
6. Keep a single head (`alembic heads`). Implement `downgrade()`.
7. Back up, run `alembic upgrade head` as the owner, then deploy the code. A model column the database lacks fails every query on that model.
8. Run `alembic revision --autogenerate` once more and confirm it produces no operations, then delete that file.

## Enum types

Prefer `VARCHAR` plus validation for new enumerations. Postgres enum types are database-wide now, so a type created by one revision exists for all tenants; dropping tables does not drop them, which matters when you reset a development database (`DROP TYPE ... CASCADE`).

## Resetting a development database

Only on a database you can lose. As the owner role, drop every table and enum type in `public`, then `alembic upgrade head`. Do not do this to a shared or production database.

## Backups

- Neon keeps automated backups with point-in-time restore. Before risky work, create a Neon branch or take a dump.
- Dump and restore (use the direct host, libpq URL form with `sslmode=require`):
  ```bash
  pg_dump "$PG_URL" --format=custom --no-acl --no-owner --file=backup_$(date +%Y%m%d_%H%M%S).dump
  pg_restore --dbname="$PG_URL" --clean backup_<ts>.dump
  ```
- One tenant's data is exported by filtering every tenant table on its `tenant_id`; there is no per-tenant dump.
- Data cleanup uses `DELETE` in foreign-key order inside one transaction, never `TRUNCATE` or `DROP`. Run it as a tenant session so row-level security limits what it touches. Dry-run first.
