# Testing

What automated checks each app has today, where the tests live, what CI runs, and the manual regression pass to
run before a release. The test phases and test case IDs are in `docs/testing/strategy.md`; the QA database, tenant
and test API are set up as in `docs/testing/test-environment.md`.

_Last verified against code: 2026-10-07_

## Backend (`backend/`)

- **Most tests are local-only.** `backend/.gitignore` ignores `tests/` except an allowlist of integration tests:
  `tests/integration/test_tenant_isolation.py`, `test_tenant_provisioning_and_auth.py`,
  `test_super_admin_tenant_data.py`, `test_celery_tenant_tasks.py`, `test_tenant_media_and_cache.py` and
  `test_legacy_migration.py`. `tests/unit/`, `tests/api/`, `tests/conftest.py` and the other files exist only on the
  dev machine. `test_scripts/` is ignored too.
- Layout on the dev machine:
  - `tests/unit/<module>/`: phase 1, mocked `AsyncSession`s, no DB. `tests/conftest.py` provides `mock_request`
    and `mock_db_session`.
  - `tests/api/<module>/`: phase 2, HTTP tests against the test API (`http://127.0.0.1:8100/api/v1`) and the
    `qa_` tenants. `tests/api/support.py` refuses a non-local API URL or a tenant that does not start with `qa_`.
  - `tests/integration/`: marked `integration`, use the local database directly and create and delete their own
    tenants. `test_legacy_migration.py` also needs `MIGRATION_DATABASE_URL` and is skipped without it.
  - A few legacy top-level `tests/test_*.py` files.
- Run (from `backend/`):
  - Unit: `pytest tests/unit/`. `-m unit` selects only marked files, and a few unit files have no marker.
  - API: set up the QA tenant and start `python scripts/qa/run_test_api.py` first, then `pytest tests/api -m api`.
  - Integration: `pytest tests/integration -m integration` with `DATABASE_URL` and `MIGRATION_DATABASE_URL` pointing
    at the local database. Never point them at a database that holds real schools.
- Unit tests still import `app.config.Settings`, so export dummy `DATABASE_URL` (asyncpg form), `SECRET_KEY` and
  `JWT_SECRET_KEY`. `REDIS_HOST/PORT/DB` are optional.
- Config: `pytest.ini` takes precedence over `[tool.pytest.ini_options]` in `pyproject.toml`, so only
  `pytest.ini` counts. It registers the markers `unit`, `api`, `integration` and `tc(id)`, disables the cache
  plugin, and runs asyncio in `strict` mode with session-scoped loops, so mark async tests with
  `@pytest.mark.asyncio`. For sequential async HTTP tests use `httpx.AsyncClient`, not `TestClient`.
- Lint/format work on a clean clone: `ruff check .` and `black --check .` with the versions pinned in
  `requirements-dev.txt`.

### What GitHub runs

- `backend-ci.yml` (manual only): ruff, black, `pytest tests/unit/` with dummy env vars, docker build. The unit job
  fails on a clean checkout because `tests/unit/` is not tracked. Its `--ignore` list names unit files that no longer
  exist.
- `backend-cd.yml` (push to `main` touching `backend/**`): `pytest tests/ -m integration` with `DATABASE_URL` from
  the `TEST_DATABASE_URL` secret, then docker build. It collects the tracked integration tests, except
  `test_tenant_media_and_cache.py` (no `integration` marker); `test_legacy_migration.py` skips because
  `MIGRATION_DATABASE_URL` is not set. They pass only if the secret points at a database at the Alembic head,
  reached as the app role (not the owner).
- `knowledge-graph.yml`: lints `docs/graph/graph.jsonl` and checks the rendered views.
- There is no web or mobile workflow.

## Web (`web/`)

- Gate: `npm run build:check` (`tsc -b` + `vite build`), `npm run lint` and `npm test` (`vitest run`).
- `vitest.config.ts` runs `src/**/*.test.ts` in the `node` environment (no jsdom), with the `@` alias. Tests live in
  `src/__tests__/<module>/`, with shared helpers in `src/__tests__/auth/helpers/`.
- The component tests under `src/components/dropdown-system/**/__tests__/` are excluded by the config, and `.tsx`
  test files are not matched, so they never run.

## Mobile (`mobile/`)

- Gate: `npx tsc --noEmit`, `npm run lint` (`expo lint`) and `npm test` (Jest, `jest-expo` preset, configured in
  `package.json`).
- Tests: `__tests__/<module>/`, plus `components/__tests__/`, `services/__tests__/` and `src/api/__tests__/`.
  `components/__tests__/test-utils.tsx` (`renderWithProviders`) is excluded from test discovery.
- `jest.setup.js` installs the AsyncStorage mock for every test.
- `mobile/__mocks__/@react-navigation/native.js` is a manual mock that Jest applies to **every** test file. It
  replaces `useNavigation`/`usePreventRemove` with controllable fakes (`__triggerBeforeRemove`,
  `__navigationDispatchMock`, `__resetFormDirtyGuardNavMock`) and passes everything else through. A new test that
  needs the real navigation hooks must `jest.unmock` it.
- `mobile/scripts/test-*-api.mjs` are manual API smoke scripts, not Jest tests.

## Local smoke test (backend + web + mobile)

- Launch configs in `.claude/launch.json`: `backend` (port 8000, no `--reload`, so restart after backend changes),
  `web` (port 5173, `VITE_DEFAULT_TENANT` set to the demo tenant), `mobile` (Expo web on 8081 against port 8000),
  `qa-api` (the test API on 8100), and `web-qa` (5174) and `mobile-qa` (8082), the apps under test against the test
  API. Web changes hot-reload.
- Confirm `DATABASE_URL` points at the local database before writing anything.
- Use the demo tenant `demo_school` for clicking through the apps: `python scripts/seed_demo_catalog.py demo_school`
  loads the menu catalog, the Full plan and the role permissions, then `python scripts/seed_demo_data.py` loads
  sample data through the API (the tenant must already have an admin login and an academic year; the password comes
  from `DEMO_ADMIN_PASSWORD`). Use the `qa_` tenants only for automated tests.
- The tenant is the signed `tenant_id` in the login token; the `cschema` header only picks the tenant at login.
  Admin login activates the chosen academic year for the whole tenant.
- The backend logs errors to `backend/cos360_errors.log`, not the console. Read that file for tracebacks of 500s.

## Manual regression (before any web or mobile release)

Run the smoke set (every P1 UI case) and the journeys J01 to J14 on the manual-test tenant `qa_manual`, on web and on
a physical phone. The procedure, the logins and the exit criteria are in `docs/testing/manual-testing-guide.md`; the
journeys are in `docs/testing/e2e-journeys.md`. After changing menus or permissions, log out and back in, because
the sidebar and permissions are loaded at login.

Features that need external setup and can't be verified without it: SMS/WhatsApp/email sending (provider
credentials), Celery-backed features (worker + Redis). Push notifications are not implemented.
