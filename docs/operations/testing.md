# Testing

What automated checks each app has today, where the tests live, and the manual regression pass to run before a
release.

_Last verified against code: 2026-09-29_

## Backend (`backend/`)

- **Tests are local-only.** `backend/.gitignore` ignores `tests/` and `test_scripts/`. A fresh clone has no test
  suite, and the GitHub jobs that run `pytest tests/unit/` (`backend-ci.yml`, manual) and
  `pytest tests/ -m integration` (`backend-cd.yml`, on push to `main`) fail with "file or directory not found".
  Either track `tests/` (after removing hardcoded credentials and tenant data) or change the workflows.
- Layout on the dev machine: `tests/unit/{expense,fee,masters,student}/` use mocked `AsyncSession`s and need no
  DB. `tests/integration/` and several top-level `tests/test_*.py` files hit a live database (Neon) and are marked
  `integration`. `tests/conftest.py` provides `mock_request` (with a `cschema` header) and `mock_db_session`.
- Run: `pytest tests/unit/`. CI skips these unit files because of stale mocks: `student/test_student_transport.py`,
  `student/test_student_document.py`, `student/test_student_certificate.py`, `fee/test_fee_receipt.py`,
  `masters/test_class.py`.
- Unit tests still import `app.config.Settings`, so export dummy `DATABASE_URL` (asyncpg form), `SECRET_KEY` and
  `JWT_SECRET_KEY`. `REDIS_HOST/PORT/DB` are optional.
- Integration tests use `TEST_DATABASE_URL` (in CI) and send `cschema: test_tenant`. Never point them at
  production; they create and delete rows.
- `cschema: test_tenant` alone does not isolate a test run: the middleware ignores the header value and uses
  `TENANT_DEFAULT_NAME` (see `docs/architecture.md` §1). Set it to the test tenant's `client_name` before any write test.
- Config gotchas: `pytest.ini` takes precedence over `[tool.pytest.ini_options]` in `pyproject.toml`, so the
  markers, `testpaths` and `addopts` declared there are ignored. Asyncio is `strict` mode with session-scoped
  loops, so mark async tests with `@pytest.mark.asyncio`. For sequential async HTTP tests use
  `httpx.AsyncClient`, not `TestClient`.
- Lint/format are the only checks that work on a clean clone: `ruff check .` and `black --check .` with the
  versions pinned in `requirements-dev.txt`.
- `backend/scripts/test_*.py` are ad-hoc scripts that talk to a live tenant, not pytest tests.

## Web (`web/`)

- Gate: `npm run build:check` (`tsc -b` + `vite build`) and `npm run lint`. No web workflow exists in
  `.github/workflows/`.
- `vitest` and `@testing-library/react` are installed, and component tests exist under
  `src/components/dropdown-system/**/__tests__/`. There is no `test` script and no vitest config (no jsdom
  environment), so they are not part of any gate and their status is unknown.

## Mobile (`mobile/`)

- Gate: `npx tsc --noEmit`, `npm run lint` (`expo lint`) and `npm test` (Jest, `jest-expo` preset, configured in
  `package.json`). No mobile workflow exists.
- Tests: `components/__tests__/FormDirtyGuard.test.tsx`, plus `components/__tests__/test-utils`
  (`renderWithProviders`).
- `mobile/__mocks__/@react-navigation/native.js` is a manual mock that Jest applies to **every** test file. It
  replaces `useNavigation`/`usePreventRemove` with controllable fakes (`__triggerBeforeRemove`,
  `__navigationDispatchMock`, `__resetFormDirtyGuardNavMock`) and passes everything else through. A new test that
  needs the real navigation hooks must `jest.unmock` it.
- `mobile/scripts/test-*-api.mjs` are manual API smoke scripts, not Jest tests.

## Local smoke test (backend + web)

- Start both servers from `.claude/launch.json` (`backend`, `web`), against the local database from `docs/operations/database-migrations.md`. The tenant is the signed `tenant_id` in the login token, and the `cschema` header only picks the tenant at login. Create a test tenant with `POST /super_admin/system/tenants/` (or the integration test helpers) rather than reusing a live school.
- Confirm `DATABASE_URL` points at the local database before writing anything. The backend integration tests under `backend/tests/integration/test_tenant_*.py`, `test_celery_tenant_tasks.py` and `test_super_admin_tenant_data.py` need it and clean up the tenants they create.
- Log in with the test-tenant admin from `.claude/commands/test-api.md` and keep the current academic year selected; admin login activates the chosen year for the whole tenant.
- The backend logs errors to `backend/cos360_errors.log`, not the console. Read that file for tracebacks of 500s.
- Backend changes need a server restart (the launch config has no `--reload`); web changes hot-reload.
- Verify writes you must make inside a DB transaction that is rolled back, or delete what you created, so `test_tenant` data stays stable.

## Manual regression (before any web or mobile release)

Seed a test tenant with at least one active academic year, and one user per role: Admin, Staff, Teacher, Student
and Parent (Parent with two children). Run each seeded menu script once. After changing menus or permissions,
log out and back in, because the sidebar and permissions are loaded at login.

1. First login redirects to set-password for every role. Normal login then works for all five roles.
2. Visible tabs and cards match each role's permissions. Locked actions are hidden or disabled.
3. Permission boundaries hold:
   - a Student sees only their own attendance, marks and fees;
   - a Parent cannot create admissions;
   - a Teacher has no admin area;
   - Staff see approvals only if granted.
4. Switching child as a Parent reloads fees, marks and attendance for that child.
5. Attendance: staff mark it, and the student sees it.
6. Fee collection: admin collects and a receipt is generated; the student or parent sees the summary.
7. Exam end to end: create exam → teacher enters marks → publish → student and parent see results.
8. Transport and fee hubs: every section loads (routes, stops, vehicles, trips, pricing, student transport; fee
   setup through reports).
9. Switching academic year reloads data. The theme preference persists across restarts.
10. On mobile, test on a physical device against the target API. Emulators hide network/HTTPS issues.

Features that need external setup and can't be verified without it: SMS/WhatsApp/email sending (provider
credentials), Celery-backed features (worker + Redis). Push notifications are not implemented.
