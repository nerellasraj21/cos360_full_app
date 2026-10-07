# Database Migration Workflow Command

## Purpose
Create and apply an Alembic migration to the shared COS360 database. The full procedure, and why each step exists, is in `docs/operations/database-migrations.md`; read it before running anything. Run all commands from `backend/`.

## Usage
`/migration [action]`

## Ground rules
- One database, one schema (`public`), one `alembic_version`. There are no per-tenant schemas and no `SCHEMA_NAME`.
- Alembic connects with `MIGRATION_DATABASE_URL` (the owner role). The app role in `DATABASE_URL` cannot run DDL.
- Work against the local database first. Applying to the shared Neon database needs the user's explicit approval and a backup.

## Workflow

### 1. Check state
```powershell
alembic heads      # must print exactly one head
alembic current
```

### 2. Write the revision
```powershell
alembic revision --autogenerate --rev-id <next number> -m "descriptive_name"
```
- Revision ids are sequential (`0008` after `0007`).
- Read the autogenerate output line by line.
- A new tenant table inherits `BaseOrg` and calls `enable_tenant_rls(op, "<table>")` from `app.db.rls` in the same revision.
- A foreign key to a natural key on a tenant table must be composite with `tenant_id`.
- Prefer `VARCHAR` plus validation over new Postgres enum types. Implement `downgrade()`.

### 3. Preview
```powershell
alembic upgrade <current_rev>:<new_rev> --sql
```

### 4. Back up
Follow the Backups section of `docs/operations/database-migrations.md` (a Neon branch, or a `pg_dump` against the direct host). Never paste credentials into commands or docs.

### 5. Apply
```powershell
alembic upgrade head
alembic current
```
Apply before deploying code that uses the change.

### 6. Verify
- `alembic revision --autogenerate -m check` must produce no operations; delete that file.
- `pytest tests/integration/test_tenant_isolation.py -m integration` against the local database (forced RLS on every tenant table, isolation between tenants).
- Smoke test with the `.claude/launch.json` backend config (`docs/operations/testing.md`).

### Rollback
```powershell
alembic downgrade <previous_rev>
```
Restore from the backup if the downgrade cannot undo the change.

## Output Format
Report: version before and after, statements applied, verification results, and anything skipped with the reason.
