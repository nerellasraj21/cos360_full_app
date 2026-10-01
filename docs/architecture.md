# COS360 System Architecture

How the backend, web and mobile apps fit together: tenancy, request lifecycle, auth, client contract, storage, background jobs, and cross-cutting gotchas.

_Last verified against code: 2026-10-01_

Decisions and system flows: [platform graph view](graph/views/platform.md) (source: docs/graph/graph.jsonl).

Related: `docs/permissions.md` (permission system end to end), `docs/modules/*.md` (per-module facts).

## 1. Multi-tenancy (shared schema + row-level security)

**Decision:** one PostgreSQL database and one schema (`public`). Every tenant table has a `tenant_id UUID NOT NULL` column, and row-level security limits each transaction to one tenant. Why: one migration path and one `alembic_version`, no per-school drift, a new permission reaches every tenant in one migration, and a forgotten tenant filter returns nothing instead of leaking another school's rows. A customer that needs physical isolation can get its own database later.

| Group | Tables | Base class |
|---|---|---|
| Platform (no `tenant_id`, no RLS) | `tenants`, `plans`, `plan_resource_access`, `plan_menu_access`, `menus` (shared catalog), `menu_actions`, `role_templates`, `permission_templates`, `super_admin_users`, `super_admin_audit`, `report_audit`, `token_blacklist`, `organizations`, `states`, `districts`, `mandals` | `BasePublic` |
| Tenant (`tenant_id`, forced RLS) | All business tables plus `users`, `roles`, `resource_permissions`, `role_menu_permissions` | `BaseOrg` |

- Models: `backend/app/db/base.py`. One `MetaData` with no schema, so every table lands in `public`, and one registry shared by both bases. `BaseOrg` adds `tenant_id` (FK to `tenants.id`) through the `TenantScoped` mixin; never declare it on a model.
- **Uniqueness is per tenant.** `scope_uniques_to_tenant()` (run by `load_all_models()`) adds `tenant_id` to every unique constraint and unique index on a tenant table, except single-column primary-key uniques. A foreign key to a natural key must be composite with `tenant_id`, as `fee_student_mappings` to `student_admissions.admission_number` is.
- **RLS:** policy `tenant_isolation` compares `tenant_id` with `NULLIF(current_setting('app.tenant_id', true), '')::uuid` for reads and writes, with `ENABLE` and `FORCE ROW LEVEL SECURITY`. `app/db/rls.py` has `enable_tenant_rls`, which every migration that adds a tenant table must call. `test_every_tenant_table_has_forced_rls` fails if one is missed. An unset tenant matches no rows, and an insert without a tenant fails with a NOT NULL error.
- **Two database roles.** The owner role runs migrations (`MIGRATION_DATABASE_URL`). The app role (`DATABASE_URL`) is not the owner, not a superuser and has no `BYPASSRLS`, so it cannot run DDL: never create tables lazily at runtime (`token_blacklist` used to; it is now a migrated model).
- `public.tenants` holds `client_name` (the login hint), `plan_id` and `is_active`. `schema_name` is legacy, nullable, and null for new tenants.

### How a request finds its tenant
1. `TenantMiddleware` (`backend/app/middleware/tenant_middleware.py`) sets `request.state.client_name` from the sanitised `cschema` header, or `None` when there is a bearer token and no header.
2. `resolve_request_tenant_id` (`backend/app/db/tenant_session.py`) decides the tenant:
   - A valid access token with a `tenant_id` claim wins. A `cschema` header, if sent, must resolve to the same tenant or the request gets **403**. The tenant must be active, else **401**.
   - A valid token with no `tenant_id` claim gets **401** ("log in again"), except `user_type: super_admin`, which uses the header.
   - With no valid token (login, `/auth/academic-years`, refresh, set-password) the header is looked up in `public.tenants` through `TenantService.get_tenant_id`. An unknown or inactive name gets **404**.
3. `open_tenant_session` stores the id in `session.info["tenant_id"]`, and an `after_begin` listener runs `set_config('app.tenant_id', <id>, true)` at the start of **every** transaction. The scope is re-applied after each commit and cannot leak between pooled connections.
4. Celery tasks and scripts use `open_tenant_session(tenant_id)`. A session with no tenant sees no rows and cannot insert.
- The tenant lookup cache lives in process memory with a 60 s TTL. Deactivating a tenant takes effect within that time in other workers, and at once in the process that handled the change (`TenantService.clear_cache()`).

### Creating and changing a tenant
- `POST /api/v1/super_admin/system/tenants/?client_name=&plan_id=` plus an optional JSON body `{username, email, password}` calls `TenantProvisioningService.provision` (`backend/app/service/tenant/provisioning_service.py`). One transaction inserts the `tenants` row, the five system roles, their permissions, the role menu links and the optional first Admin. Any failure rolls everything back.
- `RoleSeedService` (`role_seed_service.py`) grants each role the catalog in `permission_catalog.py` limited to the plan's `plan_resource_access` actions. Admin gets every plan action plus `role_management`. Student and Parent get only the student-facing menu URLs. A plan with no resources fails with 409.
- `PUT /super_admin/system/tenants/{id}/plan` calls `change_plan`. It adds what the new plan grants and **removes** permissions and menu links it no longer allows, in one transaction. Users, custom roles and other data are untouched.
- `POST /auth/seed/all-role-permissions` (Admin only) re-runs `seed_defaults` for the caller's tenant. It keeps existing rows, so a permission an admin revoked is not granted again.
- Not seeded by provisioning: the academic year (nobody can log in without one), certificate templates, and the shared menu catalog with its plan access, which must exist first (`CatalogService` can import menus and build a full plan).

### Migrations
- Alembic uses one schema and one `alembic_version`. `backend/migrations/versions/` starts at a baseline (`0001`). The old per-schema revisions are kept in `migrations/legacy_versions/` for reference and cannot be applied.
- `migrations/env.py` requires `MIGRATION_DATABASE_URL` (the owner role) and sets no `search_path`. On a clean database `alembic upgrade head` creates everything and autogenerate reports no drift.

### Known gaps (shared-schema migration)
Converted: models and base, session layer, middleware, login, refresh and set-password, provisioning, role seeding, token blacklist, Celery tasks and their call sites, report endpoints and cache keys, certificates and media paths, expense, super-admin tenant data, and the permission services. Not converted:
- `POST /super_admin/setup/initialize` and `GET /super_admin/setup/status` (`setup_endpoints.py`) are unauthenticated. Initialize creates a super admin with a hardcoded password and returns it, and its `CREATE TABLE IF NOT EXISTS` cannot run as the app role.
- `/auth/seed/*` except `all-role-permissions` is unauthenticated.
- `app/db/session.py` is the older helper that builds an engine per call. Plan, super-admin auth, seed and setup code still import its `get_public_db`.
- Web and mobile are converted: the tenant comes from the token and the header is sent only on tokenless auth calls. The legacy organizations screens on web no longer show a schema.
- `scripts/` still assume per-tenant schemas.
- `permission_endpoints.py` still has the `/test/` and `/debug-roles/` leftovers.
## 2. Request lifecycle and layering

Middleware order is outermost to innermost, because Starlette runs the last-added middleware first: `CORSMiddleware` → `TenantMiddleware` → `SuperAdminMiddleware` → `RequestContextMiddleware` → `GlobalErrorMiddleware` → router. All of them are registered in `backend/app/main.py`.

Layering: `app/api/v1/<module>/*_endpoints.py` → `app/service/<module>/` → `app/models/` + `app/schemas/`. All routers are mounted in `backend/app/api/v1/main_router.py` under `/api/v1`.

A standard tenant endpoint:
```python
async def create_x(body: XCreate, request: Request, db: AsyncSession = Depends(get_tenant_db),
                   current_user: dict = Depends(get_current_user)):
    await check_role_plan_permission_with_error(db, request, current_user["role"], "xs", "create")
    return await x_service.create_x(db, body)
```
- Always use `get_tenant_db` (tenant) or `get_public_db` (public). Both exist in `app/db/tenant_session.py`. There is also an older context-manager version in `app/db/session.py` that builds a new engine on every call, so avoid it in hot paths. There is no `get_db`.
- **DB write pattern:** `flush()` → `select()` (with `selectinload`) → `commit()`, one commit per request and nothing touching the DB after it. Never `commit()` → `refresh()`. **Why:** async sessions cannot lazy-load, so a refresh or an unloaded relationship after commit raises `MissingGreenlet`. Tenant scope no longer depends on this, because `app.tenant_id` is set per transaction. About 90 `db.refresh` calls remain in legacy code, so don't copy them.
- Sessions use `expire_on_commit=False`. Don't mutate ORM objects just to shape a response: autoflush will write the change. Build the Pydantic model instead.

## 3. Auth at the architecture level

- Tokens are HS256 JWTs signed with `JWT_SECRET_KEY` (`backend/app/tools/jwt_utils.py`). Access tokens last **24 h** and refresh tokens **7 d**. Both lifetimes are hard-coded; `ACCESS_TOKEN_EXPIRE_MINUTES` in config is unused. The claim `token_type` is `access` / `refresh` / `change_password`.
- **Tenant user token claims:** `sub` (user UUID), `username`, `role` (role **name**), `tenant_id`, `client_name`, `academic_year_id`, `academic_year_title`, `exp`, `token_type`. The token does NOT contain permissions or `user_type`. `tenant_id` is what selects the tenant after login.
- **Super admin token:** `user_type: "super_admin"` plus `sub`, `username` and `permissions` (a list of strings). Issued by `POST /super_admin/auth/login` from `public.super_admin_users`, which locks the account for 30 min after 5 failures.
- **Login:** `POST /auth/login` `{username, password, academic_year_id (required), client_name?}`.
  - `username` may be a username, an email, or a staff phone number, tried in that order.
  - The response has `user`, `role{id,name,description}`, `menu` (tree), `permissions` (`{resource: [actions]}`), `entity_id`, academic year, `access_token`, `refresh_token`, `expires_in`, `tenant_id` and `client_name`. The set-password response has the same fields. The refresh response has no `tenant_id` or `client_name`.
  - The body `client_name` is optional. If sent, it must name the same tenant as the `cschema` header or login returns 400.
  - `GET /auth/academic-years` is public and is called before login.
- **First login:** for roles `Staff`/`Teacher`/`Student`/`Parent` with `users.is_first_login = TRUE`, login returns `{requires_password_change, change_password_token (15 min), academic_year_*}`. The client then calls `POST /auth/staff/set-password` (used for every role), which returns a full login response. `is_first_login` is read and written with raw SQL only; it is not in the ORM model.
- **Refresh:** `POST /api/v1/auth/refresh` `{refresh_token}` returns a new access and refresh token pair. It checks the blacklist, that the refresh token's `tenant_id` matches the request tenant (403 otherwise), and that the user is still active. Tokens without `tenant_id` get 401.
- **Logout:** `POST /auth/logout` blacklists the access token, and the refresh token if one is sent, in `public.token_blacklist` (SHA-256 hashes; a migrated table, not created at runtime). `get_current_user_token` checks the blacklist on **every** request, which costs one extra DB query per request. A database error in that check fails open.
- The tenant comes from the token's `tenant_id`, and a `cschema` header that disagrees is rejected with 403, so a token cannot be replayed against another tenant. Tokens issued before this claim existed are rejected with 401.
- Super-admin routes (`/api/v1/super_admin/...`) use `Depends(get_current_super_admin)`, which requires `user_type == "super_admin"`. `SuperAdminMiddleware` only sets flags on `request.state`. Tenant data is reached through a tenant id in the path (`/super_admin/tenant-data/{tenant_id}/...`), which is validated against `public.tenants` before a tenant session is opened for it.

## 4. Client ↔ API contract (web and mobile)

| | Web (`web/src/api/index.ts`, `web/src/lib/`) | Mobile (`mobile/src/api/client.ts`, `mobile/services/authUtils.ts`) |
|---|---|---|
| Base URL | `VITE_API_BASE_URL` (includes `/api/v1`) | `EXPO_PUBLIC_API_URL` (includes `/api/v1`) |
| `cschema` value | Subdomain of `window.location.hostname`, else `VITE_DEFAULT_TENANT` (`getTenantFromHostname`, `lib/config.ts`). Sent only on requests without an access token and on refresh | The organisation code the user typed on the login screen, checked against the server with `GET /auth/academic-years`, stored in AsyncStorage. Sent only on requests without an access token and on refresh. No default tenant |
| Token storage | Zustand `persist` → `localStorage['auth-storage']` (tokens, permissions, menu) | `expo-secure-store` for tokens; AsyncStorage for user/role/permissions/menu/schema |
| Refresh on 401 | Calls `/auth/refresh` with a shared in-flight refresh, retries once, logs out if the refresh fails | Calls `/auth/refresh` with a shared in-flight lock; assumes 1 h expiry because there is no `expires_in` |
| Error text | `detail` (string, array or object) copied into `error.message` | `services/errorHandler.ts` copies `detail` or `message` into `error.message` |

- Both clients send `Authorization: Bearer` and, for parents, `X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID`. They send `cschema` only on login, `/auth/academic-years`, set-password and refresh. **The backend ignores the `X-*` headers.** Child scoping comes from the `student_id` in the path or query plus `_related` permissions.
- **Error shapes:**
  - `HTTPException` raised in an endpoint or dependency gives FastAPI's `{"detail": ...}`.
  - Request validation errors give 422 `{"detail": [{loc,msg,type}]}`.
  - Uncaught exceptions are caught by `GlobalErrorMiddleware` and return `{error_code, message, details{correlation_id,...}, request_id}`. `IntegrityError`/`OperationalError` map to 400 and other errors to 500.
  - An `HTTPException` raised **inside a middleware** (for example `TenantMiddleware` in strict mode) is not handled by FastAPI and surfaces as a plain 500.
- Responses carry an `X-Correlation-ID` header.
- Ownership denials on `_own`/`_related` resources return **404, not 403**, on purpose. Clients should treat both as "not found / no access".
- `Numeric` columns serialise as **strings** (`"4.50"`). Cast with `Number()` before doing maths.
- Datetime columns are `TIMESTAMP WITHOUT TIME ZONE`. On the backend use naive UTC (`datetime.utcnow()`).
- Path IDs are UUIDs. Type FastAPI path params as `uuid.UUID`, not `str`, because asyncpg binding needs it.
- Types: backend `app/schemas/` is the source of truth; mirror them in `web/src/types/` and `mobile/src/types/`.

## 5. File storage

- Files are stored on local disk under `backend/media/` and served **publicly with no auth** by `app.mount("/media", StaticFiles(...))` in `main.py`. Anyone who has the URL can fetch the file.
- Clients build URLs as `baseURL.replace(/\/api\/v\d+$/, '') + photo_url`, because stored paths start with `/media/...`.
- Layouts:
  - Student and staff photos and school images go to `media/<tenant_id>/{student/photos,staff/photos,school/images,school/signatures}/...`. Files and stored URLs written before the shared-schema change keep their old unprefixed paths, and nothing is moved on disk.
  - Certificates and received documents go to `media/<tenant_id>/<module>/<student_id>/<uuid>.<ext>` via `app/service/student/file_manager.py`. Deleted files are moved under `media/stale/...`.
- `S3_*` settings exist but the code does not use them. Method names such as `generate_presigned_url` / `delete_from_s3` are historical: they return `/media/...` paths and delete local files.
- There is no shared volume across hosts. With several app instances, `media/` must live on shared storage.

## 6. Background jobs (Celery)

- The app is defined in `backend/app/celery_app.py`. The broker and result backend are Redis, taken from `REDIS_HOST/PORT/DB`.
- Task modules:
  - reports export (`tasks/report_tasks.py`, not enqueued by any endpoint; see `docs/modules/reports-dashboards.md`)
  - exam (excel upload, PDF, aggregates, notifications)
  - certificate tasks
  - communication `send_notification_batch`
- Beat runs `cleanup_stale_files` daily at 02:00 UTC. It deletes stale media older than `STALE_FILE_TTL_DAYS`.
- Tasks have no request context. They receive the tenant id as an argument (call sites pass `get_tenant_id_from_request(request)`) and open `task_tenant_session(tenant_id)` from `app/tasks/tenant_context.py`, which owns its engine because each task runs in its own `asyncio.run` event loop. Cross-tenant jobs such as `cleanup_stale_files` list active tenants with `task_platform_session()` and open one tenant session each. The exam tasks (`aggregate_compute`, `excel_upload`, `pdf_generation`, `notification`) are placeholders that no endpoint enqueues.
- Blocking (sync) HTTP calls inside async code run via `await loop.run_in_executor(None, fn, ...)` so they don't stall the event loop (e.g. `_call_provider` in `tasks/communication/send_tasks.py` and the fee-receipt SMS in `fee_collection_service.py`).
- Neither docker-compose file has a worker or Redis. Start the worker separately with `backend/scripts/start_celery_worker.py`. Most `.delay()` call sites are not wrapped in try/except, so an unreachable broker fails the request **after** the DB commit. `service/communication/dispatch_service.py` is the exception: it catches and logs the error.

## 7. Other cross-cutting facts and gotchas

- **Swagger/ReDoc** at `/docs` and `/redoc` sit behind HTTP Basic, with credentials hard-coded in `main.py`.
- **CORS** comes from `ALLOWED_ORIGINS` (default `["*"]`) with `allow_credentials=True`.
- **Rate limiting:** slowapi `limiter` is registered, but without `SlowAPIMiddleware` the default `1000/hour` limit is never applied. Only endpoints decorated with `@rate_limit_api()` / `@rate_limit_dropdown()` / `@rate_limit_create()` are limited. Keep the parentheses; the endpoint must also take `request: Request`. `/auth/login` is not limited. Storage is Redis if it is reachable at import time, otherwise in-memory per process.
- **Processes:** prod runs `uvicorn --workers 4` (`backend/start.sh`). The tenant lookup cache (60 s TTL) and the in-memory rate limits are **per process**.
- **Model before migration:** a model column that doesn't exist in the database breaks every query on that model with a 500. Apply the migration **before** deploying the code that adds the column.
- **Unauthenticated routers still mounted in every environment:**
  - `/auth/seed/*`, except `POST /auth/seed/all-role-permissions`, which now needs an Admin
  - `/super_admin/setup/initialize` and `/super_admin/setup/status`

  The old `/auth/test-setup/*` and `/auth/fix-permissions/*` routers were removed.
  See the security notes in `docs/permissions.md`.
- **Logging:** `configure_logging` writes to `cos360_errors.log`, and many services log at INFO/"DEBUG n" on every request.
- **Web academic year side effect:** an Admin login on web calls `updateAcademicYear(id, { is_active: true })` (`web/src/api/auth.ts`), and the backend then deactivates every other year. Logging in with a non-current year changes the active year for the whole tenant. The `academic_year_id` inside the JWT is not used by the backend to scope queries.
