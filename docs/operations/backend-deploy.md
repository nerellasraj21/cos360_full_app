# Backend build & deploy

How the FastAPI backend is packaged, configured and deployed today, the gaps in that setup, and the AWS plan.

_Last verified against code: 2026-10-07_

## The image (`backend/Dockerfile`, `backend/start.sh`)

- Base `python:3.11-slim`. Installs `gcc libpq-dev netcat-openbsd curl`, then `pip install -r requirements.txt`
  (dev tools are not installed). It copies only `alembic.ini`, `migrations/`, `app/` and `start.sh`.
- `backend/.dockerignore` excludes `.env*`, `scripts/`, `tests/`, `test_scripts/`, `docs/`, `archive/`, `context/`.
  `legacy_migration/` is not copied either. All configuration must come from real environment variables.
  `Settings` in `app/config.py` also reads `.env`, but none exists in the image.
- `ENTRYPOINT /start.sh` runs `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`. It does **not** run
  migrations; schema changes are applied separately as the owner role (`database-migrations.md`).
- `start.sh` echoes the first 50 characters of `DATABASE_URL`, which includes the DB user and part of the
  password. Remove that line before logs go anywhere shared.
- Health: `GET /health` (outside `/api/v1`, no tenant header needed) returns `{"status": "healthy"}`. It does not
  touch the DB.
- Uploads are written to `media/` inside the container (`/app/media`) and served publicly at `/media`. There is no
  S3 code path yet: `S3_*` settings exist but are unused. Without a mounted volume, uploads are lost on every
  redeploy.
- Errors are logged to `cos360_errors.log` in the working directory, not only to the console.

## Connection budget

Each uvicorn worker creates two engines: `app/db/tenant_session.py` (pool 25 + overflow 40) and
`app/db/session.py` (pool 20 + overflow 30). With `--workers 4` that is up to ~460 connections per container.
Size workers against the Neon compute's connection limit. The AWS plan uses 2 workers (why: graph
`decision:platform/two-uvicorn-workers`).

## Environments that exist today

| What | Where | Notes |
|---|---|---|
| Local stack | `backend/docker-compose.yml` | `postgres:15` + `web` built from `backend/`, `env_file: .env`. The `DB_HOST`/`DB_PORT` it sets are unused; the app reads only `DATABASE_URL`. The compose database has only its superuser, so it does not give you the owner and app roles: create them as in `database-migrations.md#local-setup`, or the API would bypass row-level security. |
| Production host | `backend/docker-compose.prod.yml` | Runs `${CI_REGISTRY_IMAGE}:${IMAGE_TAG}`, `network_mode: host`, port 8000, healthcheck `curl /health`. `DATABASE_URL` must be exported on the host. Its `TENANT_DEFAULT_NAME` has no effect unless `TENANT_ALLOW_DEFAULT_FALLBACK` is on. |
| Deploy pipeline | `backend/.gitlab-ci.yml` + `backend/scripts/deploy.sh` | From the pre-monorepo GitLab repo. On `main`: build and push the image tagged with the ref slug, SSH to the VPS, then in the checkout run `scripts/deploy.sh`, which does `docker login`, `pull`, `compose -f docker-compose.prod.yml down/up`, then polls `/health` for 60 s. |
| GitHub Actions | `.github/workflows/backend-ci.yml`, `backend-cd.yml` | CI (manual `workflow_dispatch` only): ruff, black, `pytest tests/unit/`, docker build without push. CD (push to `main` touching `backend/**`): `pytest tests/ -m integration` with `DATABASE_URL` from the `TEST_DATABASE_URL` secret, then docker build without push. **Neither deploys.** |

Known gaps (verify and fix before relying on them):
- **Nothing deploys from this repo.** The remote is GitHub, and `.gitlab-ci.yml` lives in `backend/`, not the repo
  root, so GitLab won't run it. Production is updated manually on the VPS or from the old GitLab repo.
- **The CI unit job fails on a clean checkout**: `backend/tests/unit/` is gitignored, so `pytest` finds nothing.
  The CD job does collect the tracked integration tests, but they need `TEST_DATABASE_URL` to point at a migrated
  database reached as the app role. See `testing.md`.
- **`docker-compose.prod.yml` passes only `DATABASE_URL`.** `SECRET_KEY` and `JWT_SECRET_KEY` are required (no
  defaults), so the container fails at import unless they reach it some other way. Add them (and the other
  variables below) as `${VAR}` substitutions.
- **No Celery worker** is defined in any compose file. Endpoints that call `.delay()` need a worker and Redis:
  exam hall tickets/results/dates, admissions, attendance, staff, fee collection, announcements, communication
  dispatch, reports. A daily 02:00 UTC beat job (`cleanup_stale_files`) also needs `celery beat`. Command:
  `celery -A app.celery_app worker --loglevel=info` (or `python scripts/start_celery_worker.py`, which is not in
  the image). The broker is `redis://REDIS_HOST:REDIS_PORT/REDIS_DB`, so set those three variables.
- Without Redis, the rate limiter falls back to in-memory storage (logged at startup), so limits apply per worker
  process.

## Environment variables (names only)

Required by the API: `DATABASE_URL` (the app role, async form `postgresql+asyncpg://...`; for Neon add
`?ssl=require`), `SECRET_KEY`, `JWT_SECRET_KEY`. The app role must not be the owner or a superuser.

Optional (defaults in `app/config.py`):

| Group | Variables |
|---|---|
| Auth | `JWT_ALGORITHM` (HS256), `ACCESS_TOKEN_EXPIRE_MINUTES` (30) |
| HTTP | `ALLOWED_ORIGINS`: a list, so pass it as JSON (`["https://a","https://b"]`); defaults to `["*"]` with credentials allowed. Set it explicitly in production. |
| Runtime | `DEBUG`, `ENVIRONMENT`, `LOG_LEVEL`, `PAGE_SIZE`, `RATE_LIMIT_ENABLED` (default true; set false only in automated test environments) |
| Tenancy | `TENANT_STRICT_MODE` (default true: a request with neither a `cschema` header nor a bearer token gets 400), `TENANT_ALLOW_DEFAULT_FALLBACK` (default false), `TENANT_DEFAULT_NAME` (used only by that fallback), `TENANT_DEVELOPMENT_MODE` |
| Super admin | `SUPER_ADMIN_INITIAL_PASSWORD`: needed only by `POST /super_admin/setup/initialize` |
| Redis | `REDIS_URL` (rate limiter), `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` (Celery) |
| Storage (declared, unused) | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT_URL`, `STALE_FILE_TTL_DAYS`; also unused: `SYNC_DATABASE_URL`, `ASYNC_DATABASE_URL` |
| SMS (MSG91) | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID` (fallback), `MSG91_TEMPLATE_ID_{ADMISSION,FEE_RECEIPT,FEE_REMINDER,EXAM_SCHEDULE,HALL_TICKET,RESULTS,ABSENTEE,STAFF_INTERVIEW,STAFF_ATTENDANCE,HOLIDAY,HOMEWORK}`; `FEE_REMINDER` is read by code but missing from `.env.example`; `MSG91_ROUTE` is in the example but unused |
| WhatsApp / email | `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` |

Not read by the API, only by tools:

| Tool | Variables |
|---|---|
| Alembic (`migrations/env.py`) | `MIGRATION_DATABASE_URL` (the owner role; required) |
| `python -m legacy_migration` | `SOURCE_DATABASE_URL`, `MIGRATION_DATABASE_URL` (names can be changed with `--source-url-env`/`--target-url-env`) |
| `scripts/seed_demo_data.py` | `DEMO_API_URL`, `DEMO_TENANT`, `DEMO_ADMIN_USERNAME`, `DEMO_ADMIN_PASSWORD` |
| `scripts/qa/*`, `tests/api/` | `QA_*` values in `backend/.env.test` (`docs/testing/test-environment.md`) |
| `scripts/cleanup_db.py` (per-schema, legacy) | `DRY_RUN`, `CLEANUP_SCHEMA` |

`backend/.env.example` is the template. Never commit `.env` or any `.env.*` other than `.env.example` (all
gitignored by the root `.gitignore`). `backend/alembic.ini` has an empty `sqlalchemy.url`; `env.py` sets it from
`MIGRATION_DATABASE_URL`.

## Neon notes

- One Neon Postgres database with one schema (`public`); tenants are separated by `tenant_id` and row-level
  security (`docs/architecture.md`). Neon is kept and RDS is not used (why: graph `decision:platform/neon-over-rds`).
- Neither the app nor `env.py` sets `search_path`. The app sets the tenant per transaction with
  `set_config('app.tenant_id', ..., true)`. Whether the runtime `DATABASE_URL` can use Neon's `-pooler` endpoint has
  not been verified against row-level security; run the tenant isolation tests before switching to it.
- asyncpg takes `ssl=require`; psycopg2 (Alembic) needs `sslmode=require`. `env.py` converts `ssl=` to `sslmode=`
  and strips the `+asyncpg`/`+psycopg` driver prefix.
- Backups and restore: `database-migrations.md#backups`.

## Production hardening still open

- `/docs` and `/redoc` use HTTP-basic credentials hardcoded in `app/main.py`. Move them to settings/secrets.
- Unauthenticated routes are still registered in `main_router.py`: `POST /auth/seed/permission-data`,
  `GET /auth/seed/verify-permission-data`, `POST /auth/seed/location-data` and `GET /super_admin/setup/status`.
  `POST /super_admin/setup/initialize` is also open but refuses unless `SUPER_ADMIN_INITIAL_PASSWORD` is set and
  returns 409 once a super admin exists. `all-role-permissions` and `caste-data` need an Admin token. Remove the
  open ones or gate them behind `ENVIRONMENT != production` plus super-admin auth before any public deploy.
- Set `ALLOWED_ORIGINS` to explicit domains.

## AWS target (plan only; nothing below exists in the repo)

The plan lives in `backend/docs/aws-deployment-plan.md` (local-only). It predates the shared schema, so read its
per-schema migration steps as one `alembic upgrade head`. What it settles (reasons are in the graph):
- Region `ap-south-1`. Compute on ECS Fargate: 2 API tasks + 1 Celery worker task, behind an ALB with ACM TLS and a
  Route53 wildcard for tenant subdomains. S3 for files, CloudFront for the web build, Secrets Manager for
  `DATABASE_URL`/`MIGRATION_DATABASE_URL`/`JWT_SECRET_KEY`/`SECRET_KEY`/docs password/`REDIS_URL`, ECR for images,
  CloudWatch logs.
- Redis from Upstash (serverless `rediss://`), not ElastiCache (`decision:platform/upstash-redis-broker`). This
  needs `app/celery_app.py` changed to read `REDIS_URL`.
- Migrations run as a one-off task with the owner role before the service update, not in `start.sh`
  (`decision:platform/migrations-outside-container-start`).
- Not yet written: Terraform, the ECS task definitions, `start-worker.sh`, the gunicorn switch, and a GitHub deploy
  workflow.
