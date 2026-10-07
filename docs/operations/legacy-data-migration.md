# Legacy data migration

How to move the data of the old schema-per-tenant database into the shared-schema database with `backend/legacy_migration`.

_Last verified against code: 2026-10-07_

## Guarantees

- **The source is only read.** The tool opens it in a read-only transaction and never writes to it. For extra safety, give it a read-only database role (below).
- **`plan` writes nothing to any database.** It needs no target. It writes a report folder.
- **`migrate` writes nothing without `--execute`**, and `--execute` also needs `--confirm-target <target database name>`. It refuses when source and target are the same database.
- **Each tenant is copied in its own transaction**, with row-level security scoped to that tenant. A tenant that fails is rolled back and reported; the others are kept.
- **Rows that cannot be inserted are quarantined, not lost silently.** They go to `quarantine.jsonl` with the reason.
- Reports and the quarantine file contain personal data. `backend/migration_reports/` is gitignored; keep the files out of git and delete them when you are done.

## Before you start

1. The target is a new database at the current Alembic head (`docs/operations/database-migrations.md`). Its platform tables (`plans`, `menus`) should be empty. Pass `--allow-nonempty-platform` only to merge into existing rows.
2. Use the source's **direct (non-pooled) host**.
3. Create a read-only role on the source and use it, so a mistake cannot write:
   ```sql
   CREATE ROLE cos360_migration_ro LOGIN PASSWORD '<password>';
   GRANT CONNECT ON DATABASE <source_db> TO cos360_migration_ro;
   GRANT USAGE ON SCHEMA public, <each tenant schema> TO cos360_migration_ro;
   GRANT SELECT ON ALL TABLES IN SCHEMA public, <each tenant schema> TO cos360_migration_ro;
   ```
4. Put the URLs in your shell, not in a tracked file:
   ```bash
   export SOURCE_DATABASE_URL='postgresql://cos360_migration_ro:...@<direct host>/<source_db>?sslmode=require'
   export MIGRATION_DATABASE_URL='postgresql://cos360_owner:...@localhost/cos360_unischema'
   ```

## Procedure

Run from `backend/` (the tool also loads `backend/.env`, so check which URLs it will pick up). `legacy_migration/` is not in the Docker image; run it from a checkout.

1. **Plan.** Read-only, one tenant at a time if you prefer:
   ```bash
   python -m legacy_migration plan --tenant <client_name>
   ```
   Read `migration_reports/<timestamp>/report.json`. Resolve every blocker first.
2. **Dry run of the real thing** (reads the source, writes nothing):
   ```bash
   python -m legacy_migration migrate --tenant <client_name>
   ```
3. **Execute** into the new database:
   ```bash
   python -m legacy_migration migrate --tenant <client_name> --execute --confirm-target cos360_unischema
   ```
4. **Check.** The tool re-counts every table through row-level security and marks a tenant failed if the counts differ from what it inserted. Then check the quarantine file, log in as an admin of the migrated school, and spot-check records.
5. To redo a tenant, add `--replace`. It deletes that tenant's rows in the target first.

Options: `--tenant <client_name>` (repeatable; default all tenants), `--source-url-env` / `--target-url-env` (names of the env vars holding the URLs; defaults `SOURCE_DATABASE_URL` / `MIGRATION_DATABASE_URL`), `--platform-schema` (default `public`), `--orphan-policy null|quarantine`, `--clear-media-references`, `--batch-size` (default 1000), `--out-dir` (default `migration_reports`). `python -m legacy_migration --help` lists them.

## What it does

- **Tenants.** The selected `public.tenants` rows are copied with their ids, so every tenant row keeps its `tenant_id`.
- **Platform tables.** Plans, plan resources and menu access, role and permission templates, organizations, super admins and their audit, locations, and report audit are copied. `token_blacklist` is skipped, so everyone logs in again. The two audit tables stored a schema name as the tenant; it is rewritten to the tenant id.
- **Menus.** The old design had a menu copy in every tenant schema, with different ids. They are merged into one shared catalog. A tenant menu matches a catalog menu by url (or by name, level and parent for group menus), and `role_menu_permissions` is re-pointed to the catalog id. A menu that matches nothing, such as a custom one, is added to the catalog, and only that tenant's roles can see it. A menu that was renamed in some tenants keeps one name; the variants are listed in the report.
- **Tenant tables.** Each row gets `tenant_id`. Columns are matched by name: source columns the new schema does not have are dropped and listed, and a required new column that the source lacks is a **blocker** if the table has rows.
- **Id collisions.** Primary keys are global now. If two schemas hold the same id (for example seeded copies), the later tenant's row gets a new id and every foreign key in that tenant that pointed at it is rewritten, including the known columns that reference another table without a foreign key.
- **Orphans.** The old schemas had no foreign keys, so rows pointing at missing parents are likely. A nullable column is set to NULL (`--orphan-policy null`, the default) and logged; a required column quarantines the row. Rows that depend on a quarantined row are quarantined too.
- **Media references (`--clear-media-references`).** Because the files are not migrated, this option removes what would dangle:
  - `students.photo`, `staff.photo`, `school_settings.image_url` and `principal_signature_url`, `fee_receipts.pdf_file_path` and `file_audit_log.s3_key` are set to NULL.
  - Rows that exist only for a file are **skipped**: `student_documents`, `student_certificates` and `expense_attachments` rows with a file path, and `stale_file_registry` rows. A certificate record with no file is kept.
  - Every skipped row is written to `quarantine.jsonl` as `media_record_skipped`, and the report counts `media_references_cleared` and `media_records_skipped` per table. Those skipped rows are not in the new database.
- **Informational columns.** `stale_file_registry.tenant_schema` and `file_audit_log.tenant_schema` now hold the tenant id.

## Not covered

- **Media files are deliberately left behind.** The uploads in the old deployment were test files, so nothing is moved. Without `--clear-media-references`, the columns that point at files are copied unchanged and refer to files that do not exist, so photos and logos show as missing and document, certificate and attachment downloads fail. If real files are added to the old deployment before cutover, this needs a proper plan: the school logo file name is the same for every school, so a file on disk cannot be matched to its school.
- **Tables that exist only in the source** are listed per tenant as `source_only_tables` and are not migrated.
- **Per-schema `alembic_version`** is ignored.
- **Running tenants in separate runs** works, but a primary key that collides with a row from an earlier run is remapped only after the insert fails. Migrating all tenants in one run is cleaner.
- Values that fail to convert (for example a text value in a column the new schema types as a number) are quarantined with the reason.

## Tests

`backend/tests/integration/test_legacy_migration.py` builds a simulated legacy database inside the local database (per-tenant schemas without foreign keys, per-tenant menu copies, an extra column, orphans, an id collision) and runs the tool against it. It needs `MIGRATION_DATABASE_URL`. It cannot reveal drift that only exists in the real old databases, which is why `plan` comes first.
