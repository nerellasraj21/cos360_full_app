# Knowledge Graph Schema

The contract for `docs/graph/graph.jsonl`. `scripts/graph/kg_lint.py` enforces everything marked "(lint)". If a fact doesn't fit this schema, it probably belongs in a doc, not the graph.

## What goes where

| Kind of knowledge | Home |
|---|---|
| Rules you must follow, conventions, gotchas, architecture, procedures | `CLAUDE.md` files and `docs/*.md` |
| Why a decision was made (and what it replaced) | Graph: `Decision` |
| The ordered steps of a feature and what each step touches | Graph: `Flow` |
| Where a feature is implemented across backend, web and mobile | Graph: `Feature` + component nodes |
| Domain terms and business concepts | Graph: `Concept` |

## Node types (lint)

| entityType | Name format | Example | Required observations |
|---|---|---|---|
| Module | `module:<slug>` | `module:fee` | `Summary: ...`, `Doc: docs/modules/<slug>.md` |
| Feature | `feature:<module>/<slug>` | `feature:fee/collect-payment` | `Summary: ...` |
| Flow | `flow:<module>/<slug>` | `flow:fee/collect-payment` | `Step 1: ...` and more, numbered with no gaps |
| Decision | `decision:<module>/<slug>` | `decision:fee/receipt-number-format` | `Decision: ...`, `Why: ...` |
| Concept | `concept:<module>/<slug>` | `concept:fee/old-fees` | `Definition: ...` |
| Endpoint | `endpoint:<METHOD> <path>` | `endpoint:POST /fee/collection/pay` | none |
| Service | `service:<path under backend/>` | `service:app/service/fee/collection_service.py` | none |
| Table | `table:<name>` or `table:public.<name>` | `table:fee_transactions` | none |
| WebPage | `web:<path under web/>` | `web:src/pages/fee/Collection.tsx` | none |
| MobileScreen | `mobile:<path under mobile/>` (screens, and client code in src/, components/, contexts/, hooks/, services/, utils/, constants/) | `mobile:app/fees/collection.tsx` | none |
| Job | `job:<path under backend/>` | `job:app/tasks/communication/send_tasks.py` | none |

- `<module>` is one of the module slugs in `docs/modules/`, or `platform` for cross-cutting things (tenancy, auth plumbing, permissions).
- `<slug>` is lowercase kebab-case.
- Endpoint paths are relative to `/api/v1`, use `{param}` placeholders, and have no trailing slash.
- File-based names (Service, WebPage, MobileScreen, Job) must point to files that exist (lint). Table names must exist as a `__tablename__` in `backend/app/models` (lint, warning).

## Optional observation prefixes

- Decision: `Alternatives: ...`, `Status: active|superseded|temporary|unintended`, `Since: YYYY-MM`, `Tradeoff: ...` (`temporary` = a known stopgap meant to be replaced; `unintended` = never a deliberate choice, a candidate for change)
- Flow: `Trigger: ...`, `Precondition: ...`, `Result: ...`, `Failure: ...`
- Feature: `Roles: ...`, `Parity: ...`
- Any node: `Note: ...`, `Purpose: ...`

## Relation types (lint)

Relations are directed and in active voice.

| relationType | From | To |
|---|---|---|
| part_of | Feature, Concept, Flow | Module |
| implements | Flow | Feature |
| implemented_by | Feature | Endpoint, Service, Table, WebPage, MobileScreen, Job |
| uses | Flow | Endpoint, Service, Table, WebPage, MobileScreen, Job |
| calls | WebPage, MobileScreen | Endpoint |
| handled_by | Endpoint | Service |
| reads | Service, Job | Table |
| writes | Service, Job | Table |
| enqueues | Endpoint, Service | Job |
| shapes | Decision | any node type except Decision |
| supersedes | Decision | Decision |
| depends_on | Feature, Flow | Feature, Flow |
| relates_to | Concept | any node type |

## Observation rules (lint)

- One atomic fact per observation, at most 400 characters, plain ASCII.
- Flow steps reference the components they touch by name in brackets, for example: `Step 2: Web posts the payment [endpoint:POST /fee/collection/pay]`. Every bracketed name must exist in the graph.
- No secrets, passwords, tokens, connection strings, or real personal data.
- No status or history noise: no "completed", "fixed in Apr", "as of", "TODO". Record the rule or the reason instead.

## Size discipline

- Every node except a Module must have at least one relation (lint). No orphans.
- Add a component node only when a Flow, Feature, or Decision needs it. The code is the API catalog; the graph is not.
- Search before you create. If a node exists, add observations to it instead of creating a near-duplicate.

## When to write

| Event | Graph change |
|---|---|
| A design decision is made or reversed | Add a `Decision` with `Why:`; if reversed, add the new one with `supersedes` and set the old one's `Status: superseded` |
| A multi-step feature is built or its steps change | Add or update the `Flow` steps and its `uses` relations |
| A feature ships or moves | Add or update the `Feature` and its component relations |
| Code is deleted or renamed | Delete or rename the affected nodes in the same change |

After any change: `python scripts/graph/kg_lint.py` then `python scripts/graph/kg_render.py`, and commit `graph.jsonl` together with the regenerated views.
