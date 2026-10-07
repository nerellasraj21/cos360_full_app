# Test environment

How to build the isolated environment that the API tests (phase 2), the UI tests (phase 3, manual and automated) and the journeys run against. Unit tests (phase 1) need none of this.

_Last verified against code: 2026-10-07_

## What it consists of

| Piece | Value | Notes |
|---|---|---|
| Database | `cos360_unischema` on local PostgreSQL (`localhost:5432`) | The existing local database. Connection URLs come from `backend/.env` (`DATABASE_URL` for the app role, `MIGRATION_DATABASE_URL` for the owner). Never the shared Neon database. |
| App role | `cos360_app` | Not the owner, not a superuser, no `BYPASSRLS`, so row-level security is enforced exactly as in production. |
| Config file | `backend/.env.test` (gitignored) | Secrets and QA logins only: JWT and app secrets, `QA_TENANT`, `TENANT_DEFAULT_NAME`, the super admin and one login per role, and the second tenant's admin (`QA_B_ADMIN_*`). It never holds database URLs. The COS360_QA project keeps the same logins in its own `.env`. |
| Test API | `http://127.0.0.1:8100/api/v1` | Started by `python scripts/qa/run_test_api.py` (launch config `qa-api`). Rate limiting is off. |
| QA tenant | `qa_school` | For automated tests only. Provisioned by `scripts/qa/setup_qa_tenant.py`: plan Full, default academic year, the super admin, and Admin, Staff, Teacher, Student and Parent logins. It has no school data; the API tests create and delete their own rows. |
| Second QA tenant | `qa_school_b` | For tenant-isolation tests. The API suite creates it on first use (fixture `tenant_b`, through the super admin API) with the `QA_B_ADMIN_*` login. |
| Manual-test tenant | `qa_manual` | For manual testing, UI automation and the journeys. Provisioned like `qa_school` with the same QA logins, then filled with a realistic school by `scripts/seed_demo_data.py`: classes and sections, subjects, staff, students with parents, fee structure and payments, exams with marks and results, transport, expenses, certificates, message templates, timetables and documents. |
| Web under test | `http://localhost:5174` | Vite dev server with `VITE_API_BASE_URL` pointed at the test API (launch config `web-qa`). The web app takes its tenant from `VITE_DEFAULT_TENANT` on localhost: `qa_school` for automation, `qa_manual` for manual testing. |
| Mobile under test | `http://localhost:8082` | Expo web with `EXPO_PUBLIC_API_URL` pointed at the test API (launch config `mobile-qa`). The organisation is typed at sign-in. |

The same database also holds the `demo_school` and other demo tenants. The tests never touch them.

## Setup

1. Make sure `backend/.env` points `DATABASE_URL` and `MIGRATION_DATABASE_URL` at the local `cos360_unischema` database and the migrations are applied (`alembic upgrade head` from `backend/`).
2. Create `backend/.env.test` from the values your team keeps for the QA logins (never commit it).
3. Provision the QA tenant (from `backend/`):
   ```bash
   python scripts/qa/setup_qa_tenant.py
   ```
   It is idempotent. `--reset` drops the QA tenant's rows and rebuilds it.
4. Start the test API and leave it running:
   ```bash
   python scripts/qa/run_test_api.py
   ```
5. For manual and UI testing, provision and seed the manual-test tenant through the running test API (takes a few minutes):
   ```bash
   python scripts/qa/setup_manual_tenant.py
   ```
   `--reset` rebuilds it from scratch; `--no-seed` provisions it without data. Set `QA_MANUAL_TENANT` to use another `qa_` name.
6. Start the apps under test: launch configs `web-qa` and `mobile-qa`, or by hand:
   ```bash
   cd web && VITE_API_BASE_URL=http://127.0.0.1:8100/api/v1 VITE_DEFAULT_TENANT=qa_manual npm run dev -- --port 5174 --strictPort
   ```
   ```bash
   cd mobile && EXPO_PUBLIC_API_URL=http://127.0.0.1:8100/api/v1 npx expo start --web --port 8082
   ```
   The first mobile page load builds the bundle and can take a minute or two.

## Manual and UI testing

- Testers use `qa_manual`. Sign in with the QA logins, or with a seeded student (admission number) or parent (email, or `<admission number>.father` / `.mother`) and the temporary password, which forces a password change at first sign-in.
- Rebuild `qa_manual` before a release test cycle (`setup_manual_tenant.py --reset`) so every tester starts from the same data. Journeys create their own data on top of it.
- The tester's guide is `docs/testing/manual-testing-guide.md`; the journeys are in `docs/testing/e2e-journeys.md`.
- Playwright in COS360_QA reads `QA_TENANT` from its `.env` and runs against `qa_school` by default. Specs that need school data set the tenant to `qa_manual`.

## Daily use

- Reset to a clean baseline before a full API run: `python scripts/qa/setup_qa_tenant.py --reset`.
- API tests create their own data with unique names and remove it, so they can be re-run without a reset. Rows they cannot remove pile up in `qa_school`, which is one more reason manual testing uses `qa_manual`.

## Safety rules

- Every QA script and the test API call `scripts/qa/_target.py` first. It refuses to run unless `DATABASE_URL` and `MIGRATION_DATABASE_URL` point at `localhost` or `127.0.0.1`, `QA_TENANT` starts with `qa_`, and `TENANT_DEFAULT_NAME` equals `QA_TENANT`. It prints the target (user, host, port, database) before doing anything. `setup_manual_tenant.py` also refuses a manual tenant name that does not start with `qa_` or equals `QA_TENANT`.
- Nothing in `backend/.env.test` is committed. `.env.*` is gitignored; only `.env.example` files are tracked.
- Do not point the test API at a tenant that holds real data. `--reset` only deletes rows of the named `qa_` tenant.
- Message templates in `qa_manual` may hold real-looking text, but the seeded parents have fake contacts. Never send to a whole class or all parents from a test tenant unless the delivery worker is off.
