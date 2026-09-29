# COS360 Monorepo

COS360 is a multi-tenant school management system (students, staff, fees, exams, expenses, transport, communication). This repo holds all three apps; each keeps its own toolchain and dependencies.

```
backend/   FastAPI + SQLAlchemy 2 (async) + PostgreSQL (Neon) + Alembic   — Python 3.11+
web/       React 19 + Vite + TanStack Router/Query + Zustand + shadcn/ui   — see web/CLAUDE.md
mobile/    Expo 54 + React Native 0.81 + expo-router + TanStack Query
.claude/   Shared Claude Code agents, slash commands, and backend memory notes
.github/   CI workflows (path-filtered per app)
```

History from the original repos (`cos360_backend`, `cos360_frontend`, `cos360_mobile_app`) is preserved under each folder — `git log -- backend/app/main.py` works as expected.

## The cross-app contract

Web and mobile are both clients of the same backend. When a feature touches the API, keep all three in sync in the same change.

- **Base URL**: backend mounts everything under `/api/v1` (`backend/app/main.py`). Web reads `VITE_API_BASE_URL`; mobile reads `EXPO_PUBLIC_API_URL` (both include `/api/v1`).
- **Tenant**: every request carries a `cschema` header naming the tenant schema (schema-per-tenant PostgreSQL). Web: `web/src/api/index.ts`; mobile: `mobile/src/api/client.ts`; backend: `backend/app/middleware/tenant_middleware.py`.
- **Auth**: JWT bearer tokens; refresh via `POST /auth/login/refresh`.
- **Permissions**: dual-layer — the tenant's plan must grant the resource AND the user's role must grant the action. The UI hides what the user can't do, but the backend is the source of truth.
- **Types**: backend Pydantic schemas in `backend/app/schemas/` are the source of truth. Mirror them in `web/src/types/` and `mobile/src/types/`; API call functions live in `web/src/api/` and `mobile/src/api/`.

### Typical feature flow
1. Backend: model (`app/models/`) → Alembic migration → schema (`app/schemas/`) → service (`app/service/`) → endpoint (`app/api/v1/`).
2. Web: types → API function → React Query hook (`src/api/hooks/`) → page/component.
3. Mobile: types → API function → hook → screen under `mobile/app/` (expo-router).
4. Check web/mobile parity for the module before finishing.

## Commands

Run each app's commands from inside its folder (`cd backend`, `cd web`, `cd mobile`) — there is no root package manager.

| | Install | Dev | Checks |
|---|---|---|---|
| backend | `python -m venv .venv` then `pip install -r requirements.txt -r requirements-dev.txt` | `uvicorn app.main:app --reload` | `ruff check .`, `black --check .`, `pytest tests/unit/` |
| web | `npm install` | `npm run dev` | `npm run build:check`, `npm run lint` |
| mobile | `npm install` | `npm start` | `npx tsc --noEmit`, `npm run lint`, `npm test` |

Mobile builds use EAS (`mobile/eas.json`) — run `eas build` from `mobile/`.

## Rules

- **Never commit secrets.** `.env` files are gitignored everywhere; only `.env.example` is tracked. Use env vars rather than hardcoding DB URLs or keys.
- **Backend DB pattern**: use `flush() → select() → commit()`, never `commit() → refresh()` (breaks tenant schema context). Details in `.claude/memory/api-patterns.md` and `.claude/memory/db-decisions.md`.
- **Backend security rules**: `.claude/memory/security-rules.md`.
- Don't introduce npm/yarn workspaces or hoisting — Expo is sensitive to it.
- Some backend folders are local-only (gitignored): `tests/`, `test_scripts/`, `docs/`, `archive/`. `web/docs/` is also local-only.

## More context
- `web/CLAUDE.md` — detailed frontend conventions.
- `backend/context/PROJECT_CONTEXT.md` and `backend/context/modules/` — backend architecture and per-module notes.
- `mobile/README.md` — mobile app notes.
