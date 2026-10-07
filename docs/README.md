# COS360 Knowledge Base

The single home for lasting project knowledge. Coding conventions live in each app's `CLAUDE.md`; everything else is here.

## System
| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | Tenancy, request lifecycle, auth, the client contract, storage, background jobs, cross-cutting gotchas |
| [permissions.md](permissions.md) | Plan layer, role layer, scopes, menus, user types, how to add a permission across all three apps |

## Modules
Each module doc covers backend, web, and mobile together: what it does, where the code lives, rules and gotchas, web/mobile parity, and known gaps. Its flows and decisions are in the graph view linked at the top of each doc.

| Module | What it covers |
|---|---|
| [auth](modules/auth.md) | Login for every role, JWT issue/refresh/logout, first-login password change, password reset, profiles |
| [tenants-and-admin](modules/tenants-and-admin.md) | Tenant registry and plans, super admin, onboarding, user and role management, menus, unauthenticated endpoints |
| [students](modules/students.md) | Admission, student and parent/guardian records, parent links, attendance, documents and photos |
| [staff](modules/staff.md) | Staff enrollment, designations, attendance, photos |
| [certificates](modules/certificates.md) | Received and issued certificate files, certificate types, template-based issuable certificates |
| [masters](modules/masters.md) | Academic years, classes/sections, subjects and categories, class-subject mappings, lookups, school settings, dropdowns |
| [timetable-calendar](modules/timetable-calendar.md) | Weekly section timetables, holiday/event calendar |
| [fee](modules/fee.md) | Fee structure, collection, receipts, refunds, concessions, old fees, fee reports |
| [transport](modules/transport.md) | Routes, stops, vehicles, trips, pricing, student assignments |
| [expense](modules/expense.md) | Expense categories/types, transactions and approval, attachments, summary and reports |
| [exam](modules/exam.md) | Grading and board patterns, exam setup, mark entry, results, hall tickets, audit trail |
| [communication](modules/communication.md) | SMS/WhatsApp/Email templates, targeting, Celery delivery, audit log, module "send SMS" triggers |
| [reports-dashboards](modules/reports-dashboards.md) | Cross-module reports and exports, home dashboard, module hub pages |

## Operations
| Doc | What it covers |
|---|---|
| [backend-deploy](operations/backend-deploy.md) | How the backend is packaged, configured, and deployed; environment variables; gaps; AWS plan |
| [database-migrations](operations/database-migrations.md) | The shared database and its two roles, local setup, how schema changes and tenant tables (RLS) are migrated, backups |
| [legacy-data-migration](operations/legacy-data-migration.md) | Moving the old schema-per-tenant data into the shared database: plan, execute, quarantine, what is not covered |
| [mobile-release](operations/mobile-release.md) | Expo/EAS configuration, Android and iOS builds, release steps |
| [testing](operations/testing.md) | Automated checks per app, what is tracked and what CI runs, the local smoke test, the manual regression pass |

## Testing and feature specs
| Doc | What it covers |
|---|---|
| [testing/strategy](testing/strategy.md) | The three test phases (unit, API, UI), test case IDs, what each phase must cover |
| [testing/test-environment](testing/test-environment.md) | The local QA database, `qa_` tenants (automated and manual) and test API the API and UI tests run against, and its safety rules |
| [testing/manual-testing-guide](testing/manual-testing-guide.md) | For manual testers: logins, order of testing, recording results, reporting defects, release exit criteria |
| [testing/e2e-journeys](testing/e2e-journeys.md) | Cross-module journeys (J01 to J14) that walk a school through a full cycle; the release smoke test |
| [features/](features/README.md) | Step-by-step feature documentation per module, with the test case table for each feature |

## Knowledge graph
Decisions (with the why), flows, feature implementation maps, and concepts live in the graph, not in these docs.

| Doc | What it covers |
|---|---|
| [graph/README.md](graph/README.md) | How the graph works, how Claude queries and updates it, Neo4j exploration |
| [graph/SCHEMA.md](graph/SCHEMA.md) | Node and relation types, naming, observation rules, when to write |
| [graph/views/](graph/views/README.md) | Generated per-module pages with diagrams (do not edit) |

## Specs (requirements not yet built)
| Doc | What it covers |
|---|---|
| [android-requirements](specs/android-requirements.md) | Original native-Android requirements. The stack is now Expo, but it still holds unbuilt requirements (offline attendance and marks, biometric unlock, Hindi/Telugu, role dashboards). When a requirement ships, move its rules into the module doc and delete it from the spec. |

## Keeping it accurate
- Update the relevant doc **in the same change** as the code. If a change makes a statement untrue, fix or delete it.
- One fact, one home. Add to the existing doc; link rather than duplicate.
- Record rules, gotchas, decisions (with the why), contracts, and verified open gaps. Don't record history, status, or what the code already shows.
- No status/progress/completion/handover files; commit messages and PRs are the record.
- Bump the `_Last verified against code_` date when you re-check a whole doc.
