# COS360 System Architecture

How the backend, web and mobile apps fit together: tenancy, request lifecycle, auth, client contract, storage, background jobs, and cross-cutting gotchas.

_Last verified against code: 2026-09-29_

Decisions and system flows: [platform graph view](graph/views/platform.md) (source: docs/graph/graph.jsonl).

Related: `docs/permissions.md` (permission system end to end), `docs/modules/*.md` (per-module facts).

## 1. Multi-tenancy (schema-per-tenant)

**Decision:** one PostgreSQL database with one schema per school instead of `tenant_id` columns. Why: hard data isolation, no tenant filter in every query, per-tenant backup/restore.

| Schema | Holds | Base class |
|---|---|---|
| `public` | `tenants`, `plans`, `plan_resource_access`, `plan_menu_access`, `menus` (catalog), `menu_actions`, `role_templates`, `permission_templates`, `super_admin_users`, `super_admin_audit`, `token_blacklist`, `organizations` | `BasePublic` (`MetaData(schema="public")`) |
| `cos360_master` | Structure-only template that new tenants are cloned from. Never put business data here. | — |
| `<tenant>` (e.g. `test_tenant_schema`) | All business tables plus `users`, `roles`, `resource_permissions`, `menus`, `role_menu_permissions`, `alembic_version` | `BaseOrg` (no schema; resolved via `search_path`) |

- Models: `backend/app/db/base.py`. `Base = BaseOrg`. Tenant models must NOT set a schema; public models must.
- `public.tenants` maps `client_name` (what clients send) to `schema_name`, plus `plan_id` and `is_active`.

### How a request finds its schema
1. `TenantMiddleware` (`backend/app/middleware/tenant_middleware.py`) sets `request.state.client_name`.
2. `get_tenant_db` (`backend/app/db/tenant_session.py`) looks up `client_name` in `public.tenants` (in-process cache), opens a session and runs `SET search_path TO "<schema>"`.
3. If lookup fails and `client_name == "default"`, it falls back to `cos360_master`; otherwise 404 `Tenant '<x>' not found or inactive`.

**CURRENT BEHAVIOUR (important):** when a `cschema` header is present, `extract_client_name` returns `settings.TENANT_DEFAULT_NAME`, **not the header value**. The header only has to exist. Every tenant request therefore hits the single tenant named by `TENANT_DEFAULT_NAME`. In prod, `docker-compose.prod.yml` and `backend/.env` set this to the production school's `client_name`. The code default is `"default"`, which falls back to `cos360_master`. Real multi-tenancy is switched off until that line returns the (sanitised) header value again. Code that reads `request.headers["cschema"]` directly still sees the raw header value (see gotchas).

Other middleware modes: bypass for `/health`, `/docs`, `/redoc`, `/openapi.json`. Paths under `/api/v1/super_admin/` never get a tenant (see §3). If there is no header and `TENANT_STRICT_MODE=false`, the tenant comes from the subdomain (`a.b.c` gives `a`). If `TENANT_ALLOW_DEFAULT_FALLBACK=true`, it then falls back to the default tenant.

### Tenant onboarding at the data level
- **Practice used for real tenants:** a script clones the template. See `backend/scripts/create_little_bunny_tenant.py`:
  1. Insert the `public.tenants` row.
  2. `CREATE SCHEMA`, then `CREATE TABLE <new>.<t> (LIKE cos360_master.<t> INCLUDING ALL)` for each table.
  3. Copy `alembic_version` from master.
  4. Seed the 5 default roles.
- After cloning:
  1. Run `backend/scripts/fix_tenant_enum_types.py <schema>`. `LIKE` copies enum type OIDs, so otherwise the columns point at another schema's enum types and inserts fail with "type does not exist".
  2. Note that `LIKE ... INCLUDING ALL` does **not** copy foreign keys.
  3. Seed the permissions and menus (`docs/permissions.md`) and create the admin user.
- **API path** `POST /api/v1/super_admin/system/tenants/?client_name=&schema_name=&plan_id=` (`system_endpoints.py`):
  - Creates only the tenant row, the schema, a minimal `roles` table with `Admin`, and (if a plan is given) flat `menus` copied from the plan. The menu copy drops `parent_id`.
  - It does not create the business tables, so on its own it is not a complete onboarding.
  - `PUT /super_admin/system/tenants/{id}/plan` **deletes and recreates** the tenant's `menus` and Admin's `role_menu_permissions`. This destroys menu hierarchy, custom menus and IDs.
- `super_admin/enhanced_tenant_endpoints.py` and `service/schema/*` are not mounted in `main_router.py` and are dead paths.
- Migrations: `backend/migrations/env.py` targets one schema per run via the `SCHEMA_NAME` env var (default `cos360_masters`, note the trailing "s"). It sets `search_path` to `<schema>, public`, rewrites `asyncpg` to `psycopg2` and `ssl=` to `sslmode=`, and strips `-pooler.` because Neon's pooler rejects `SET search_path`. Each schema has its own `alembic_version`, so every tenant must be migrated separately. Many one-off `scripts/apply_*_<schema>.py` exist because some schemas drifted from Alembic.

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
- **DB write pattern:** `flush()` → `select()` (with `selectinload`) → `commit()`. Never `commit()` → `refresh()`. **Why:** `SET search_path` is session state on the pooled connection. After `commit()` the ORM session releases the connection, and the next statement (a refresh or lazy load) may run on a different pooled connection. That connection has either no `search_path` ("relation does not exist") or **another tenant's** `search_path` (cross-tenant read). About 90 `db.refresh` calls remain in legacy code, so don't copy them.
- Sessions use `expire_on_commit=False`. Don't mutate ORM objects just to shape a response: autoflush will write the change. Build the Pydantic model instead.

## 3. Auth at the architecture level

- Tokens are HS256 JWTs signed with `JWT_SECRET_KEY` (`backend/app/tools/jwt_utils.py`). Access tokens last **24 h** and refresh tokens **7 d**. Both lifetimes are hard-coded; `ACCESS_TOKEN_EXPIRE_MINUTES` in config is unused. The claim `token_type` is `access` / `refresh` / `change_password`.
- **Tenant user token claims:** `sub` (user UUID), `username`, `role` (role **name**), `client_name`, `academic_year_id`, `academic_year_title`, `exp`, `token_type`. The token does NOT contain permissions, `schema_name` or `user_type`.
- **Super admin token:** `user_type: "super_admin"` plus `sub`, `username` and `permissions` (a list of strings). Issued by `POST /super_admin/auth/login` from `public.super_admin_users`, which locks the account for 30 min after 5 failures.
- **Login:** `POST /auth/login` `{username, password, academic_year_id (required), client_name?}`.
  - `username` may be a username, an email, or a staff phone number, tried in that order.
  - The response has `user`, `role{id,name,description}`, `menu` (tree), `permissions` (`{resource: [actions]}`), `entity_id`, academic year, `access_token` and `refresh_token`. There is no `expires_in` and no `client_name`.
  - The body `client_name` only affects validation and the token claim. The DB session still comes from the middleware.
  - `GET /auth/academic-years` is public and is called before login.
- **First login:** for roles `Staff`/`Teacher`/`Student`/`Parent` with `users.is_first_login = TRUE`, login returns `{requires_password_change, change_password_token (15 min), academic_year_*}`. The client then calls `POST /auth/staff/set-password` (used for every role), which returns a full login response. `is_first_login` is read and written with raw SQL only; it is not in the ORM model.
- **Refresh:** `POST /api/v1/auth/refresh` `{refresh_token}` returns a new access and refresh token pair. It checks the blacklist and that the tenant is still active.
- **Logout:** `POST /auth/logout` blacklists the access token, and the refresh token if one is sent, in `public.token_blacklist` (SHA-256 hashes; the table is auto-created). `get_current_user_token` checks the blacklist on **every** request, which costs one extra DB query per request.
- The backend never checks that the token's `client_name` matches the request's tenant. A token is accepted by any tenant whose `roles` table has a role with the same name.
- Super-admin routes (`/api/v1/super_admin/...`) use `Depends(get_current_super_admin)`, which requires `user_type == "super_admin"`. `SuperAdminMiddleware` only sets flags on `request.state`. Tenant data is reached through path params (`/super_admin/tenant-data/{tenant_schema}/...`), and the schema is validated first.

## 4. Client ↔ API contract (web and mobile)

| | Web (`web/src/api/index.ts`, `web/src/lib/`) | Mobile (`mobile/src/api/client.ts`, `mobile/services/authUtils.ts`) |
|---|---|---|
| Base URL | `VITE_API_BASE_URL` (includes `/api/v1`) | `EXPO_PUBLIC_API_URL` (includes `/api/v1`) |
| `cschema` value | Subdomain of `window.location.hostname`, else `VITE_DEFAULT_TENANT` (`getTenantFromHostname`, `lib/config.ts`) | Org code chosen on login screen (hardcoded list in `app/login.tsx`), stored in AsyncStorage, else `EXPO_PUBLIC_DEFAULT_TENANT`, else `test_tenant` |
| Token storage | Zustand `persist` → `localStorage['auth-storage']` (tokens, permissions, menu) | `expo-secure-store` for tokens; AsyncStorage for user/role/permissions/menu/schema |
| Refresh on 401 | Calls `/auth/refresh` with a shared in-flight refresh, retries once, logs out if the refresh fails | Calls `/auth/refresh` with a shared in-flight lock; assumes 1 h expiry because there is no `expires_in` |
| Error text | `detail` (string, array or object) copied into `error.message` | `services/errorHandler.ts` copies `detail` or `message` into `error.message` |

- Both clients send `Authorization: Bearer`, `cschema`, and for parents `X-Student-ID`, `X-Academic-Year-ID`, `X-Class-ID`. **The backend ignores the `X-*` headers.** Child scoping comes from the `student_id` in the path or query plus `_related` permissions.
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
  - Student and staff photos and school images go to `media/{student,staff,school}/...`. These paths are **not** tenant-scoped.
  - Certificates and received documents go to `media/<cschema header value>/<module>/<student_id>/<uuid>.<ext>` via `app/service/student/file_manager.py`. Deleted files are moved under `media/stale/...`.
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
- Tasks have no request context. They receive the tenant schema as an argument (endpoints pass `request.headers.get("cschema")`) and run `asyncio.run(...)` once per task with their own engine and `SET search_path`.
- Blocking (sync) HTTP calls inside async code run via `await loop.run_in_executor(None, fn, ...)` so they don't stall the event loop (e.g. `_call_provider` in `tasks/communication/send_tasks.py` and the fee-receipt SMS in `fee_collection_service.py`).
- Neither docker-compose file has a worker or Redis. Start the worker separately with `backend/scripts/start_celery_worker.py`. Most `.delay()` call sites are not wrapped in try/except, so an unreachable broker fails the request **after** the DB commit. `service/communication/dispatch_service.py` is the exception: it catches and logs the error.

## 7. Other cross-cutting facts and gotchas

- **Swagger/ReDoc** at `/docs` and `/redoc` sit behind HTTP Basic, with credentials hard-coded in `main.py`.
- **CORS** comes from `ALLOWED_ORIGINS` (default `["*"]`) with `allow_credentials=True`.
- **Rate limiting:** slowapi `limiter` is registered, but without `SlowAPIMiddleware` the default `1000/hour` limit is never applied. Only endpoints decorated with `@rate_limit_api()` / `@rate_limit_dropdown()` / `@rate_limit_create()` are limited. Keep the parentheses; the endpoint must also take `request: Request`. `/auth/login` is not limited. Storage is Redis if it is reachable at import time, otherwise in-memory per process.
- **Processes:** prod runs `uvicorn --workers 4` (`backend/start.sh`). The tenant lookup cache, in-memory rate limits and the blacklist-table init flag are **per process**. The tenant cache is never invalidated, so deactivating a tenant takes effect only after a restart. It only caches hits, so newly added tenants show up immediately.
- **Model before migration:** a model column that doesn't exist in a tenant's DB table breaks every query on that model with a 500. Apply the migration or script to every schema **before** adding the column to the model.
- **Unauthenticated dev routers are mounted in every environment:**
  - `/auth/test-setup/*`
  - `/auth/seed/*`
  - `/auth/fix-permissions/*`
  - `/super_admin/setup/initialize`

  See the security notes in `docs/permissions.md`.
- **Logging:** `configure_logging` writes to `cos360_errors.log`, and many services log at INFO/"DEBUG n" on every request.
- **Web academic year side effect:** an Admin login on web calls `updateAcademicYear(id, { is_active: true })` (`web/src/api/auth.ts`), and the backend then deactivates every other year. Logging in with a non-current year changes the active year for the whole tenant. The `academic_year_id` inside the JWT is not used by the backend to scope queries.
