# Backend build & deploy

How the FastAPI backend is packaged, configured and deployed today, the gaps in that setup, and the AWS plan.

_Last verified against code: 2026-09-29_

## The image (`backend/Dockerfile`, `backend/start.sh`)

- Base `python:3.11-slim`. Installs `gcc libpq-dev netcat-openbsd curl`, then `pip install -r requirements.txt`
  (dev tools are not installed). It copies only `alembic.ini`, `migrations/`, `app/` and `start.sh`.
- `backend/.dockerignore` excludes `.env*`, `scripts/`, `tests/`, `docs/`, `context/`. All configuration must come
  from real environment variables. `Settings` in `app/config.py` also reads `.env`, but none exists in the image.
- `ENTRYPOINT /start.sh` → `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`. It does **not** run
  migrations; schema changes are applied separately (`database-migrations.md`).
- `start.sh` echoes the first 50 characters of `DATABASE_URL`, which includes the DB user and part of the
  password. Remove that line before logs go anywhere shared.
- Health: `GET /health` (outside `/api/v1`, no tenant header needed) returns `{"status": "healthy"}`. It does not
  touch the DB.
- Uploads are written to `media/` inside the container (`/app/media`) and served publicly at `/media`. There is no
  S3 code path yet: `S3_*` settings exist but are unused. Without a mounted volume, uploads are lost on every
  redeploy.

## Connection budget

Each uvicorn worker creates two engines: `app/db/tenant_session.py` (pool 25 + overflow 40) and
`app/db/session.py` (pool 20 + overflow 30). With `--workers 4` that is up to ~460 connections per container.
Size workers against the Neon compute's connection limit. The AWS plan recommends 2 workers, because one async
worker already handles high concurrency.

## Environments that exist today

| What | Where | Notes |
|---|---|---|
| Local stack | `backend/docker-compose.yml` | `postgres:15` + `web` built from `backend/`, `env_file: .env`. The `DB_HOST`/`DB_PORT` it sets are unused; the app reads only `DATABASE_URL`. |
| Production host | `backend/docker-compose.prod.yml` | Runs `${CI_REGISTRY_IMAGE}:${IMAGE_TAG}`, `network_mode: host`, port 8000, healthcheck `curl /health`. `DATABASE_URL` must be exported on the host. It sets `TENANT_DEFAULT_NAME: "little bunny"`. |
| Deploy pipeline | `backend/.gitlab-ci.yml` + `backend/scripts/deploy.sh` | From the pre-monorepo GitLab repo. On `main`: build and push the image tagged with the ref slug, SSH to the VPS, then in the checkout run `scripts/deploy.sh`, which does `docker login` → `pull` → `compose -f docker-compose.prod.yml down/up` → polls `/health` for 60 s. |
| GitHub Actions | `.github/workflows/backend-ci.yml`, `backend-cd.yml` | CI (manual `workflow_dispatch` only): ruff, black, `pytest tests/unit/`, docker build without push. CD (push to `main` touching `backend/**`): `pytest tests/ -m integration` against `TEST_DATABASE_URL`, then docker build without push. **Neither deploys.** |

Known gaps (verify and fix before relying on them):
- **Nothing deploys from this repo.** The remote is GitHub, and `.gitlab-ci.yml` lives in `backend/`, not the repo
  root, so GitLab won't run it. Production is updated manually on the VPS or from the old GitLab repo.
- **The GitHub test jobs fail on a clean checkout**: `backend/tests/` is gitignored (local-only), so `pytest`
  finds no tests. This also blocks the CD docker job. See `testing.md`.
- **`docker-compose.prod.yml` passes only `DATABASE_URL`.** `SECRET_KEY` and `JWT_SECRET_KEY` are required (no
  defaults), so the container fails at import unless they reach it some other way. Add them (and the other
  variables below) as `${VAR}` substitutions.
- **No Celery worker** is defined in any compose file. Endpoints that call `.delay()` need a worker and Redis:
  exam hall tickets/results/dates, admissions, attendance, staff, fee collection, announcements, communication
  dispatch, reports. A daily 02:00 UTC beat job (`cleanup_stale_files`) also needs `celery beat`. Command:
  `celery -A app.celery_app worker --loglevel=info`. The broker is
  `redis://REDIS_HOST:REDIS_PORT/REDIS_DB`, so set those three variables.
- Without Redis, the rate limiter falls back to in-memory storage (logged at startup), so limits apply per worker
  process.

## Environment variables (names only)

Required: `DATABASE_URL` (async form `postgresql+asyncpg://…`; for Neon add `?ssl=require`), `SECRET_KEY`,
`JWT_SECRET_KEY`.

Optional (defaults in `app/config.py`):

| Group | Variables |
|---|---|
| Auth | `JWT_ALGORITHM` (HS256), `ACCESS_TOKEN_EXPIRE_MINUTES` (30) |
| HTTP | `ALLOWED_ORIGINS` — a list, so pass it as JSON (`["https://a","https://b"]`); defaults to `["*"]` with credentials allowed. Set it explicitly in production. |
| Runtime | `DEBUG`, `ENVIRONMENT`, `LOG_LEVEL`, `PAGE_SIZE`, `RATE_LIMIT_ENABLED` (default true; set false only in automated test environments) |
| Tenancy | `TENANT_STRICT_MODE` (true = `cschema` header required), `TENANT_ALLOW_DEFAULT_FALLBACK`, `TENANT_DEVELOPMENT_MODE`, `TENANT_DEFAULT_NAME` |
| Redis | `REDIS_URL` (rate limiter), `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` (Celery) |
| Storage (declared, unused) | `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT_URL`, `STALE_FILE_TTL_DAYS`; also unused: `SYNC_DATABASE_URL`, `ASYNC_DATABASE_URL` |
| SMS (MSG91) | `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_ID` (fallback), `MSG91_TEMPLATE_ID_{ADMISSION,FEE_RECEIPT,FEE_REMINDER,EXAM_SCHEDULE,HALL_TICKET,RESULTS,ABSENTEE,STAFF_INTERVIEW,STAFF_ATTENDANCE,HOLIDAY,HOMEWORK}` — `FEE_REMINDER` is read by code but missing from `.env.example`; `MSG91_ROUTE` is in the example but unused |
| WhatsApp / email | `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `SENDGRID_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME` |
| Alembic / scripts only | `SCHEMA_NAME` (migration target schema), `DRY_RUN`, `CLEANUP_SCHEMA` |

`backend/.env.example` is the template. Never commit `.env` or `.env.production` (both gitignored).
`backend/alembic.ini` still contains a local-default `sqlalchemy.url` with a password. It is only a fallback,
because `env.py` prefers `DATABASE_URL`. Don't copy it anywhere.

## Neon notes

- One Neon Postgres database holds `public` plus one schema per tenant. RDS was evaluated and rejected (cost,
  and schema-per-tenant plus Neon branching and PITR already cover the needs). Treat that decision as final unless
  it is revisited explicitly.
- According to the comment in `migrations/env.py`, Neon's `-pooler` endpoint rejects `SET search_path`, so
  `env.py` rewrites the host to the direct endpoint for Alembic. The app sets `search_path` per session too
  (`app/db/tenant_session.py`), so point the runtime `DATABASE_URL` at the direct endpoint as well, or verify
  tenant isolation carefully if you use the pooler.
- asyncpg takes `ssl=require`; psycopg2 (Alembic) needs `sslmode=require`. `env.py` converts this automatically.
- Backups and restore: `database-migrations.md#backups`.

## Production hardening still open (from the AWS pre-flight list; still true in code)

- `/docs` and `/redoc` use HTTP-basic credentials hardcoded in `app/main.py`. Move them to settings/secrets.
- Unauthenticated routers are registered in `main_router.py`: `/auth/seed/*` (except `all-role-permissions`, which needs an Admin) and `/super_admin/setup/*`. Remove them or gate
  them behind `ENVIRONMENT != production` plus super-admin auth before any public deploy.
- Set `ALLOWED_ORIGINS` to explicit domains.

## AWS target (plan only — nothing below exists in the repo)

The plan lives in `backend/docs/aws-deployment-plan.md` (local-only). Decisions worth keeping:
- Region `ap-south-1` (Indian schools; DPDP data residency). Compute on ECS Fargate: 2 API tasks + 1 Celery
  worker task, behind an ALB with ACM TLS and a Route53 wildcard for tenant subdomains. S3 for files, CloudFront
  for the web build, Secrets Manager for `DATABASE_URL`/`JWT_SECRET_KEY`/`SECRET_KEY`/docs password/`REDIS_URL`,
  ECR for images, CloudWatch logs.
- Redis from Upstash (serverless `rediss://`), not ElastiCache. This needs `app/celery_app.py` changed to read
  `REDIS_URL`.
- Migrations run as a one-off ECS task before the service update, not in `start.sh`.
- Not yet written: Terraform, the ECS task definitions, a migrate-all-tenants script, `start-worker.sh`, the
  gunicorn switch, and a GitHub deploy workflow.
