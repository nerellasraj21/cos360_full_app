# Backend (FastAPI) — rules for AI assistants

Read the root `CLAUDE.md` first. Depth lives elsewhere — don't duplicate it here:
`docs/architecture.md` (tenancy, middleware, request flow) · `docs/permissions.md` (plan + role layers, seeding)
· `docs/operations/database-migrations.md` · `docs/operations/backend-deploy.md` · `docs/operations/testing.md`.

## Layout
- `app/main.py` — app, middleware, `/health`, HTTP-basic-protected `/docs` `/redoc`, `/media` static mount.
- `app/api/v1/<module>/*_endpoints.py` (a few `*_routes.py`) — routers, registered in `app/api/v1/main_router.py` (mounted at `/api/v1`).
- `app/service/<module>/*_service.py` — business logic and all DB access.
- `app/models/<module>/*_model.py` (SQLAlchemy 2, async) · `app/schemas/<module>/*_schema.py` (Pydantic v2).
- `app/db/base.py` (`BaseOrg` tenant tables, `BasePublic` = `public` schema) · `app/db/tenant_session.py` (sessions).
- `app/tools/simple_permissions.py` (auth + permission checks) · `app/tools/error_handler.py` · `app/middleware/`.
- `app/celery_app.py` + `app/tasks/` — Celery (broker from `REDIS_HOST/PORT/DB`, not `REDIS_URL`).
- `migrations/` — Alembic. `scripts/` — ops/seed scripts (see bottom). `tests/` is local-only (gitignored).

## Layering
- **Endpoint**: auth + permission check, call one service function, return. No business logic, no SQL.
- **Service**: queries, rules, and the transaction (flush/select/commit, rollback on error). Services raise
  `HTTPException` directly — follow that, it is the house style.
- Exactly one layer commits. Some services commit internally (e.g. exam `grading_service`,
  `board_pattern_service`, `remark_grade_service`); others only flush and the endpoint commits. Read the service
  before adding a commit — a second commit/refresh causes `MissingGreenlet`.
- Pydantic schemas are the API contract; web and mobile mirror them (`web/src/types`, `mobile/src/types`).

## Tenant sessions
- Every tenant endpoint takes `db: AsyncSession = Depends(get_tenant_db)` from `app/db/tenant_session.py`.
  It maps the `cschema` header → `public.tenants.client_name` → `schema_name` (cached) and runs
  `SET search_path TO "<schema>"` on the connection.
- Tenant models inherit `BaseOrg` (no schema; resolved through `search_path`). Public models inherit `BasePublic`.
- Public-schema work: the `get_public_db` *dependency* in `tenant_session.py`. The context manager of the same name in
  `app/db/session.py` builds a new engine per call — don't use it on request paths.
- Super-admin access to a named schema: `get_tenant_db_by_schema`. Never hardcode a schema name in `app/`.

## flush → select → commit (mandatory)
`search_path` lives on the pooled connection. After `commit()` the session releases that connection; the next
statement may run on a different connection whose `search_path` was left by another tenant's request. So
`commit()` then `refresh()` (or any query after commit) can read the wrong schema.
```python
db.add(obj)
await db.flush()                       # INSERT on the tenant connection
row = (await db.execute(select(Model).options(selectinload(Model.rel)).where(Model.id == obj.id))).scalar_one()
await db.commit()                      # last DB action of the request
return row                             # expire_on_commit=False keeps it readable
```
- One commit per request, and nothing touches the DB after it (no refresh, audit insert, or lazy attribute).
- Async sessions cannot lazy-load: `selectinload` every relationship the response schema reads.
- ~90 legacy `db.refresh` calls remain. Don't copy them; convert when you touch that code.

## Adding an endpoint
1. `router = APIRouter(prefix="/<module>/<resource>", tags=["Module/Resource"])`, then import it and
   `include_router` it in `main_router.py`. An unregistered router 404s silently
   (e.g. `super_admin/enhanced_tenant_endpoints.py` is not registered).
2. First lines of the handler:
   ```python
   current_user = await get_current_user_token(request)          # app.tools.simple_permissions
   await check_role_plan_permission_with_error(db, request, current_user.get("role"), "<resource>", "<action>")
   ```
   Actions: `create read list update delete` (+ module-specific like `read_own`). `read` ≠ `list`.
   Reuse resource names already seeded (grep `_ROLE_PERMISSIONS` in `app/api/v1/auth/seed_endpoints.py`).
   A new resource needs rows in both permission layers or everyone gets 403 — see `docs/permissions.md`.
   Super-admin routes use `Depends(get_current_super_admin)` instead.
3. Path params are `uuid.UUID`, never `str` (asyncpg binding). Declare static paths (`/dropdown`) before `/{id}`.
4. Always set `response_model`. Lists → `PaginatedResponse[T]` (`items`, `total_count`, `has_next`) with
   `skip`/`limit`; dropdowns → `GET .../dropdown` returning `{id, name}`.
5. Rate limits: `rate_limit_create(...)`, `rate_limit_dropdown(...)`, `rate_limit_api()` from
   `app.middleware.rate_limit_middleware` — always called with parentheses, and the handler must take `request: Request`.
6. JWT claims: user id is `sub`, role is `role`. Real tokens have no `id` claim.
7. New endpoint = update web + mobile API functions/types in the same change (root `CLAUDE.md`).

## Schemas (Pydantic v2)
- `<Entity>Base / Create / Update / Read / Dropdown`; `Update` fields all optional.
- `model_config = {"from_attributes": True}` (or `ConfigDict`); don't add new `class Config`.
- Prefer `X | None = None` in new code.
- Any field the client sends must be on the Create/Update schema — unknown fields are dropped silently and the
  column stays NULL.
- A Read field the ORM object may lack must be `... | None = None`, or serialization 500s.
- Read/Out schemas must not inherit input validators (`field_validator`, `Literal`, `EmailStr`) from Base/Create. One stored row that fails them turns the whole list response into a 422 (this broke `GET /parents/`). Validate on Create/Update only.
- `Numeric` columns serialize as strings (`"4.50"`); clients must convert.

## Models
- PK `Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)`; declare `created_at`/`updated_at` explicitly.
- Most timestamps are `TIMESTAMP WITHOUT TIME ZONE`: write naive UTC (`datetime.utcnow()`); tz-aware values fail.
  Exceptions declared `timezone=True`: route/trip types, trips, transport pricing, location masters, exam results/streams.
- Register new models in `app/models/<module>/__init__.py`. Order matters for string relationship targets
  (e.g. `Caste` before `Student`).
- Never add a model column before its migration is applied to every schema. Querying the model then fails with
  `UndefinedColumn` → 500 for every tenant that lacks it.
- Keep `Column` types equal to the real DB type. A script that changed a DB type without the model (e.g.
  `fee_receipts.reprint_count` VARCHAR → INTEGER) makes inserts fail with `DatatypeMismatchError`.
- New enumerations: plain `VARCHAR` plus validation (Pydantic `Literal`/CHECK). Postgres enum types are per-schema
  and have caused cross-schema breakage — see the migrations doc.
- Tenant schemas created by cloning have **no FK constraints**. Check references in the service before deleting.
  Don't rely on cascades.

## Error handling
```python
try:
    ...
except HTTPException:
    raise                                  # otherwise a 404 becomes a 500
except IntegrityError:
    await db.rollback(); raise HTTPException(409, "…conflict…")
except Exception as e:
    await db.rollback(); log.error("…: %s", e); raise HTTPException(500, "Could not …")
```
- Don't put `str(e)` in `detail` — it leaks SQL. Use `app/tools/error_handler.py` (`create_not_found_error`, etc.)
  or `app/tools/database_error_mapper.map_database_error` where available.
- `scalar_one_or_none()` raises on >1 row. Where duplicates are possible (a student can have several admissions),
  use `.limit(1)` + `scalars().first()`.
- Grouping by a function with a string argument (`func.date_trunc("month", col)`) fails with `GroupingError`: the SELECT and GROUP BY get separate bind parameters. Build the expression once with `literal_column("'month'")` and reuse it in both.
- Update child rows in place. Delete + re-insert changes ids and orphans grandchild references (fee term dates).
- Raw SQL (`text()`): bind values as parameters, never f-strings. Schema names can't be bound — validate against
  `public.tenants` and double-quote them. Never log passwords, tokens, `DATABASE_URL` or request bodies.

## Migrations (summary — full procedure in `docs/operations/database-migrations.md`)
- Every DDL change is an Alembic revision in `migrations/versions/`, applied to `cos360_master` first, then to each
  tenant schema. No hand-run `ALTER`s without a revision; that is how schemas drifted before.
- Target schema = `SCHEMA_NAME` env var. **Always set it explicitly**: `env.py` defaults to the legacy
  `cos360_masters`. PowerShell: `$env:SCHEMA_NAME='cos360_master'; alembic upgrade <rev>`.
- In a revision, read `os.getenv("SCHEMA_NAME")` and pass `schema=` to ops. Write DDL to be idempotent
  (`IF NOT EXISTS`, guarded `DO $$` blocks) because schemas are not uniformly versioned.
- Keep a single head (`alembic heads`). There are currently **two heads** (`d3e4f5a6b7c8`, `e0f1a2b3c4d5`).
  Add a merge revision before the next migration.
- Review `--autogenerate` output line by line: it picks up drift noise (missing FKs, index names) as real changes.

## Run, lint, test (from `backend/`)
```
python -m venv .venv && pip install -r requirements.txt -r requirements-dev.txt
cp .env.example .env            # needs DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY at minimum
uvicorn app.main:app --reload   # requests need header  cschema: <client_name>, e.g. test_tenant
celery -A app.celery_app worker --loglevel=info   # only for .delay() features (PDFs, uploads, messaging)
ruff check . && black --check . && pytest tests/unit/
```
- Use the pinned `ruff==0.4.4` / `black==24.4.2` from `requirements-dev.txt`. Newer ruff reports different rules.
  Line length is 120. `migrations/`, `scripts/`, `test_scripts/` are excluded from ruff.
- `pytest.ini` shadows `[tool.pytest.ini_options]` in `pyproject.toml` (only asyncio settings apply). Register
  markers in `pytest.ini` if you rely on `-m`.
- Windows console: avoid non-ASCII in `print()` (cp1252 `UnicodeEncodeError`).

## Scripts (`backend/scripts/`)
Scripts load `.env` and connect to whatever `DATABASE_URL` points at, which may be production Neon. Read a
script before running it and prefer its dry-run mode. Most files there are one-off, already-applied patches
(`apply_*_<schema>.py`, `add_*`, `_check_*`, `_inspect_*`, `fix_*`, person-specific seeds). Don't reuse them as
templates for new schema changes — write an Alembic revision instead.

Reusable tools:
- Tenant onboarding (clone `cos360_master`), in order: `create_little_bunny_tenant.py` (reference, edit the
  constants) → `fix_tenant_enum_types.py <schema>` → `seed_master_data_little_bunny.py` (menus/roles/templates) →
  `seed_resource_permissions_little_bunny.py` (role permissions; `cos360_master`'s copy is empty). Procedure:
  `docs/operations/database-migrations.md#creating-a-tenant-schema`.
- Drift/migration hygiene: `diagnose_schema_drift.py`, `_compare_schemas.py` (both compare `cos360_master` vs
  `test_tenant_schema`), `check_duplicate_revisions.py`.
- Data: `seed_cert_templates_direct.py [schema…]`, `find_stale_pre_admission_attendance.py <schema>|--all [--apply]`,
  `cleanup_db.py` (`DRY_RUN`, `CLEANUP_SCHEMA`; keep-years hardcoded), `clear_test_tenant_data.py`,
  `seed_fee_test_data.py` (fee chain in `test_tenant_schema`), `reseed_student_parent_permissions.py`.
- Exports: `export_api_routes.py` writes `api_routes.json`, which is gitignored; `/openapi.json` has the same data live.
- Deploy: `deploy.sh` (used by the VPS deploy — see backend-deploy doc).
