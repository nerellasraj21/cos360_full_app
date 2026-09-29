# COS360 Monorepo

COS360 is a multi-tenant school management system (students, staff, fees, exams, expenses, transport, communication). This repo holds all three apps; each keeps its own toolchain and dependencies.

```
backend/   FastAPI + SQLAlchemy 2 (async) + PostgreSQL (Neon) + Alembic   — see backend/CLAUDE.md
web/       React 19 + Vite + TanStack Router/Query + Zustand + shadcn/ui   — see web/CLAUDE.md
mobile/    Expo 54 + React Native 0.81 + expo-router + TanStack Query      — see mobile/CLAUDE.md
docs/      Project knowledge base (architecture, permissions, modules, operations)
.claude/   Shared Claude Code agents and slash commands
.github/   CI workflows (path-filtered per app)
```

History from the original repos (`cos360_backend`, `cos360_frontend`, `cos360_mobile_app`) is preserved under each folder — `git log -- backend/app/main.py` works as expected.

## Verify before writing (all apps — set by the user)

Before writing new code: read every similar existing implementation in full, read the exact types/schemas for every field, verify every import path exists, check real function/hook signatures, and copy the structure of working code rather than inventing patterns. Each app's CLAUDE.md has the specific version.

## Working style (set by the user)

- Never use emoji or special Unicode symbols in output. Use plain text only.
- Keep responses concise unless detail is requested.
- Do not add code comments unless explicitly asked.

## The cross-app contract

Web and mobile are both clients of the same backend. When a feature touches the API, keep all three in sync in the same change. Depth: `docs/architecture.md`, `docs/permissions.md`.

- **Base URL**: everything is under `/api/v1` (`backend/app/main.py`). Web reads `VITE_API_BASE_URL`; mobile reads `EXPO_PUBLIC_API_URL` (both include `/api/v1`).
- **Tenant**: every request carries a `cschema` header (schema-per-tenant PostgreSQL). Middleware: `backend/app/middleware/tenant_middleware.py`. Warning: it currently resolves every request to `TENANT_DEFAULT_NAME`, not the header value — read `docs/architecture.md` before touching tenancy.
- **Auth**: JWT bearer tokens; refresh via `POST /auth/refresh`. (The web client still posts to `/auth/login/refresh` — a known bug, see `docs/modules/auth.md`.)
- **Permissions**: a permission is a `(resource, action)` pair on the user's role. The plan layer is intended to cap it but is **not enforced at runtime**. The backend is the source of truth; clients only hide UI. See `docs/permissions.md`.
- **Types**: backend Pydantic schemas in `backend/app/schemas/` are the source of truth. Mirror them in `web/src/types/` and `mobile/src/types/`.

### Typical feature flow
1. Backend: model (`app/models/`) → Alembic migration → schema (`app/schemas/`) → service (`app/service/`) → endpoint (`app/api/v1/`) + permission.
2. Web: types → API function → React Query hook → page/component.
3. Mobile: types → API function → hook → screen under `mobile/app/` (expo-router).
4. Check the module doc's web/mobile parity section, and update the module doc (see below).

## Commands

Run each app's commands from inside its folder — there is no root package manager.

| | Install | Dev | Checks |
|---|---|---|---|
| backend | `python -m venv .venv` then `pip install -r requirements.txt -r requirements-dev.txt` | `uvicorn app.main:app --reload` | `ruff check .`, `black --check .`, `pytest tests/unit/` |
| web | `npm install` | `npm run dev` | `npm run build:check`, `npm run lint` |
| mobile | `npm install` | `npm start` | `npx tsc --noEmit`, `npm run lint`, `npm test` |

Builds and deploys: `docs/operations/`.

## Rules

- **Never commit secrets.** `.env` files are gitignored everywhere; only `.env.example` is tracked. Use env vars, never hardcoded DB URLs, passwords, or keys — including in docs and scripts.
- **Backend DB pattern**: `flush() → select() → commit()`, never `commit() → refresh()` (breaks tenant schema context). See `backend/CLAUDE.md`.
- Don't introduce npm/yarn workspaces or hoisting — Expo is sensitive to it.
- Local-only (gitignored) folders: `backend/tests/`, `backend/test_scripts/`, `backend/docs/`, `backend/archive/`, `web/docs/`.

## Knowledge base - how project memory works

Project memory is hybrid, and every fact has exactly one home, all in git:

| What | Where |
|---|---|
| Conventions for writing code in an app | `backend/CLAUDE.md`, `web/CLAUDE.md`, `mobile/CLAUDE.md` |
| System design and rules (tenancy, auth, request flow) | `docs/architecture.md` |
| Access control rules end to end | `docs/permissions.md` |
| A module's rules, gotchas, code map, parity, known gaps | `docs/modules/<module>.md` |
| Deploy, migrations, builds, testing procedures | `docs/operations/` |
| **Why** decisions were made, **flows** (ordered steps and what each step touches), **feature implementation maps**, domain **concepts** | Knowledge graph: `docs/graph/graph.jsonl`, via the `knowledge-graph` MCP server |

Rules you must follow live in files; knowledge you look up lives in the graph. Index: `docs/README.md`. Graph contract: `docs/graph/SCHEMA.md`.

Before working on a feature:
- Read the module doc, then query the graph: `search_nodes` for the module or feature (e.g. `feature:fee`), then `open_nodes` on the relevant `flow:` and `decision:` nodes. Human-readable copies: `docs/graph/views/<module>.md`.

After changing behaviour, in the same change as the code:
- Update the module doc if a rule, contract, gotcha, parity, or known gap changed. Fix or remove anything the change makes untrue.
- Update the graph if a decision was made or reversed, a flow's steps changed, or a feature's implementation moved (see "When to write" in `docs/graph/SCHEMA.md`). Search before creating; reuse existing nodes.
- Run `python scripts/graph/kg_lint.py --format` and `python scripts/graph/kg_render.py`, and commit `graph.jsonl` with the regenerated views.

Never:
- Create status, progress, completion, summary, or handover files. The commit message and PR are the record.
- Duplicate a fact across a doc and the graph, or record what the code already shows (file lists, schemas) or history.
- Put project facts in Claude's personal auto-memory; only the user's preferences go there.
