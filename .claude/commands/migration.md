# Database Migration Workflow Command

## Purpose
Create and apply an Alembic migration across the COS360 schemas. The full procedure, and why each step exists, is in `docs/operations/database-migrations.md`; read it before running anything. Run all commands from `backend/`.

## Usage
`/migration [action] [schema_name]`

## Target schemas
List the live targets first:
```sql
SELECT client_name, schema_name, is_active FROM public.tenants;
```
- `cos360_master`: the structure template. Always migrate it first.
- `test_tenant_schema`: the dev/test tenant.
- `little_bunny`: the live school. Only migrate it when the user asks, after a backup.
- Skip `cos360_main` (client `default`): an empty legacy schema with no data and 55 of the template's tables. It is not migrated.
- Skip `test_basic_schema`: a skeleton with no `alembic_version` and no business tables.

## Workflow

### 1. Check state
```powershell
alembic heads                     # must print exactly one head
python scripts/check_duplicate_revisions.py
$env:SCHEMA_NAME='test_tenant_schema'; alembic current
```
Each schema's `alembic_version` must hold exactly one row. Duplicate rows make the upgrade fail with "expected to match one row"; collapse them to the correct single row first.

### 2. Write the revision
```powershell
alembic revision -m "descriptive_name"
```
- Write the ops by hand; treat `--autogenerate` output as a draft only.
- Read `os.getenv("SCHEMA_NAME")` and schema-qualify every statement.
- Make DDL idempotent (`IF NOT EXISTS`, guarded `DO $$` blocks) and implement `downgrade()`.
- Add a new model or column to the code only in the same change, and deploy it only after every live schema is migrated.

### 3. Preview
```powershell
$env:SCHEMA_NAME='cos360_master'; alembic upgrade <current_rev>:<new_rev> --sql
```

### 4. Back up the target schemas
Follow the Backups section of `docs/operations/database-migrations.md` (a Neon branch, or a per-schema `pg_dump` against the direct host). Never paste credentials into commands or docs.

### 5. Apply, template first, one schema at a time
```powershell
$env:SCHEMA_NAME='cos360_master'; alembic upgrade <new_rev>; alembic current
$env:SCHEMA_NAME='test_tenant_schema'; alembic upgrade <new_rev>; alembic current
$env:SCHEMA_NAME='little_bunny'; alembic upgrade <new_rev>; alembic current
```
If a schema's structure is already current but its version row is off the chain, verify the DDL and use `alembic stamp <rev>` instead of upgrading.

### 6. Verify
- Check the new table/columns/indexes in each schema (`information_schema.columns`, `pg_indexes`).
- Run `python scripts/diagnose_schema_drift.py`.
- Smoke test against `test_tenant` using the `.claude/launch.json` backend config (`docs/operations/testing.md`).

### Rollback
```powershell
$env:SCHEMA_NAME='<schema>'; alembic downgrade <previous_rev>
```
Restore from the backup if the downgrade cannot undo the change.

## Output Format
Report per schema: version before and after, statements applied, verification results, and anything skipped with the reason.
