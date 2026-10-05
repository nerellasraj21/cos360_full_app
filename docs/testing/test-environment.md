# Test environment

How to build the isolated environment that the API tests (phase 2) and UI automation (phase 3) run against. Unit tests (phase 1) need none of this.

_Last verified against code: 2026-10-02_

## What it consists of

| Piece | Value | Notes |
|---|---|---|
| Database | `cos360_unischema` on local PostgreSQL (`localhost:5432`) | The existing local database. Connection URLs come from `backend/.env` (`DATABASE_URL` for the app role, `MIGRATION_DATABASE_URL` for the owner). Never the shared Neon database. |
| App role | `cos360_app` | Not the owner, not a superuser, no `BYPASSRLS`, so row-level security is enforced exactly as in production. |
| Config file | `backend/.env.test` (gitignored) | Secrets and QA logins only: JWT and app secrets, `QA_TENANT`, `TENANT_DEFAULT_NAME`, and one login per role. It never holds database URLs. |
| Test API | `http://127.0.0.1:8100/api/v1` | Started by `python scripts/qa/run_test_api.py` (or the `qa-api` launch config). |
| QA tenant | `qa_school` | Provisioned by `scripts/qa/setup_qa_tenant.py`: plan Full, academic year, plus Admin, Staff, Teacher, Student and Parent logins. The only tenant the tests may touch. |
| Web under test | `http://localhost:5174` | Vite dev server with `VITE_API_BASE_URL` pointed at the test API and `VITE_DEFAULT_TENANT=qa_school`. |
| Mobile under test | `http://localhost:8082` | Expo web with `EXPO_PUBLIC_API_URL` pointed at the test API. |

The same database also holds the `demo_school` tenant. The tests never touch it.

## Setup

1. Make sure `backend/.env` points `DATABASE_URL` and `MIGRATION_DATABASE_URL` at the local `cos360_unischema` database and the migrations are applied (`alembic upgrade head` from `backend/`).
2. Provision and seed the QA tenant (from `backend/`):
   ```bash
   python scripts/qa/setup_qa_tenant.py
   ```
   It is idempotent. `--reset` drops the QA tenant's rows and rebuilds it.
3. Start the test API (leave it running):
   ```bash
   python scripts/qa/run_test_api.py
   ```

## Daily use

- Reset to a clean baseline before a full run: `python scripts/qa/setup_qa_tenant.py --reset`.
- API tests create their own data with unique names and remove it, so they can be re-run without a reset. UI tests assume the baseline data.

## Safety rules

- Every QA script and the test API call `scripts/qa/_target.py` first. It refuses to run unless `DATABASE_URL` and `MIGRATION_DATABASE_URL` point at `localhost` or `127.0.0.1`, `QA_TENANT` starts with `qa_`, and `TENANT_DEFAULT_NAME` equals `QA_TENANT`. It prints the target (user, host, port, database) before doing anything.
- Nothing in `backend/.env.test` is committed. `.env.*` is gitignored; only `.env.example` files are tracked.
- Do not point the test API at a tenant that holds real data. `--reset` only deletes rows of the `qa_` tenant.
