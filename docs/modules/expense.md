# Expense
Records school spending: expense categories and types, expense transactions with an approval step, attachments, settings, a hierarchical summary, and reports.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/expense.md) (source: docs/graph/graph.jsonl).

## What it does
- **Categories** (for example Infrastructure or Utilities) contain **types** (for example Electricity or Water).
  - Category names must be unique among active categories (a soft-deleted category's name can be reused).
  - Type names must be unique within their category, inactive types included; changing only a type's category re-checks the name in the target category.
  - A type can't be created in, or moved to, an inactive category.
  - Both are soft-deleted (`is_active = False`).
  - A type that has any transactions can't be deleted. A category can be deleted even when it has types, because that dependency check is commented out.
- **Transactions** record one expense each:
  - Fields: `expense_type_id`, `amount`, `transaction_date`, `description`, `payment_method`, `vendor_name`, `reference_number`, optional `department_id` and `academic_year_id`.
  - The client must generate a unique `idempotency_key`. A duplicate key is rejected.
  - Every new transaction starts as `pending`.
- **Approval** is a single step. `requires_approval` is set when the transaction is created and recalculated when a pending transaction's amount, payment method or override is edited (see rule 1).
  - `POST /expense/transactions/{id}/approval` takes `{action: "approve"|"reject", approval_comment}`. The comment is required, 1–500 characters.
  - Only transactions that are `pending` **and** have `requires_approval` can be approved or rejected.
  - Once approved, a transaction can't be edited.
- **Summary** (`GET /expense/summary/`) nests totals Category → Type → Entries, with a grand total. Filters: `academic_year_id`, `start_date`, `end_date`, `status_filter`. By default only `cancelled` is excluded.
- **Reports:** `/expense/reports/by-category`, `/by-type`, `/trend`, `/summary?period_days=`, and `POST /export`. Export is a stub; see Known gaps.
- **Settings:** key/value rows in `expense_settings`, with CRUD, `GET /key/{key}/value`, `GET /ui/common` and `POST /{id}/reset`. Nothing in the transaction flow reads them yet.
- **Permission resources:** `expense_categories`, `expense_types`, `expense_transactions` (with an extra `approve` action), `expense_reports` (with `export`), `expense_attachments`, `expense_audit_logs` and `expense_settings`. The summary endpoint checks `expense_transactions:list`. See [permissions](../permissions.md).

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/expense/` (8 tables incl. `expense_departments`, `expense_transaction_items`) | — | — |
| Schemas / types | `backend/app/schemas/expense/` | `web/src/types/expense/` | `mobile/src/types/expense.ts` |
| Services | `backend/app/service/expense/` (`BaseExpenseService` holds `create_audit_log`) | — | — |
| Endpoints / API | `backend/app/api/v1/expense/*_endpoints.py` (each registered directly in `main_router.py`; `expense_router.py` is unused) | `web/src/api/expense.ts` (flat `ExpenseService` → `expenseApi`), `web/src/constants/api/expense.ts` | `mobile/src/api/expense.ts` |
| Hooks / state | — | `web/src/hooks/expense/index.ts`, `web/src/lib/expense*.ts` (Zustand store, cache TTLs) | inline React Query |
| UI | — | `web/src/pages/expense/`, `web/src/components/expense/`, routes `web/src/routes/_app/expense/` | `mobile/app/expense/` (`transactions/create.tsx`, `[id].tsx`) |

Endpoint prefixes:
- `/expense/categories`, `/expense/types`, `/expense/transactions` (also `/pending/approval` and `/{id}/approval`)
- `/expense/summary`
- `/expense/reports`
- `/expense/settings`
- `/expense/attachments`: `POST /transactions/{id}/upload`, `GET /transactions/{id}/list`, `GET /{id}/download`
- `/expense/audit`: `/logs`, `/logs/{id}`, `/transactions/{id}/logs`, `/transactions/{id}/summary`

## Rules & gotchas
1. **The approval threshold is hard-coded** in `ExpenseTransactionService._compute_requires_approval`:
   ```python
   requires_approval = override if override is not None else (
       amount > Decimal("1000.00") or payment_method.lower() in ["check", "wire_transfer"])
   ```
   - `requires_approval_override=false` exempts the transaction; `true` forces approval; null applies the rules.
   - The clients send `cheque` and `bank_transfer`, so only the amount rule and the override ever trigger.
   - `ExpenseSettings` is ignored here.
   - `requires_approval` is recalculated on update of a pending transaction when the amount, payment method or override changes.
2. **Transactions that don't need approval stay `pending` forever.** Nothing auto-approves them, and they can't be approved.
   - No endpoint ever sets `paid` or `cancelled`. The mobile status tabs for those values are always empty.
   - The summary's default filter (everything except `cancelled`) **includes pending and rejected** expenses.
3. **Web API import:** `@/api/expense` resolves to the flat file `web/src/api/expense.ts`, not to the folder `web/src/api/expense/index.ts`, because Vite prefers the file.
   - Always call the flat methods, for example `expenseApi.createCategory()` and `expenseApi.approveTransaction(id, data)`. Nested calls like `expenseApi.categories.x()` fail at runtime.
   - `deleteAttachment(id)` and `downloadAttachment(id)` take a single argument.
4. **List endpoints return plain arrays**, not `{items, total}`.
   - Web expense list hooks set `refetchOnMount: true`, with `staleTime: 0` on dropdowns. This overrides the global `refetchOnMount: false`.
   - Why: the Zustand permission store rehydrates asynchronously. The permission-gated query first registers as disabled and otherwise never refetches.
5. **`usePermissionProtectedMutation` does nothing when the user lacks the permission.** There is no toast and no request, so a Save button that "does nothing" usually means one permission layer is missing, or the user needs to log in again.
6. **Every expense table has `org_id` NOT NULL** (a leftover from the single-schema design). The create endpoints fill it with the `public.tenants.id` looked up from the `cschema` client name. Tenant isolation itself comes from the schema; see [architecture](../architecture.md).
7. **Clients never send `academic_year_id` on create**, and the backend doesn't set a default. Filtering the summary by academic year therefore leaves out every transaction created from the UI.
   - The column was added later by a one-off script, with no FK constraint. The index has to be created after the `DO $$` block, because the column may not exist before that block runs.
8. **Seeds only cover** categories, types, transactions and reports. `expense_attachments`, `expense_audit_logs` and `expense_settings` have to be seeded separately, otherwise those endpoints return 403.
9. **Expense departments** are per-tenant rows in `expense_departments` (resource `expense_departments`), managed at `/expense/departments` (CRUD plus `/dropdown`).
   - Names are unique among active departments, case-insensitively. Delete only deactivates, and a deactivated department leaves the dropdown.
   - `department_id` on a transaction has no FK (cloned schemas have none), so create and update check in the service that the department exists (404) and is active (400).
   - List endpoints return plain arrays, like the rest of the module (rule 4).

## Web / mobile parity
- **Both clients:** categories, types, transactions (create, edit, view), approvals (stats, search, approve/reject with a comment), summary, reports, settings and audit screens.
- **Both clients offer "delete transaction"** through `DELETE /expense/transactions/{id}`. That route doesn't exist: `ExpenseTransactionService.delete_transaction`, which would set `status='deleted'`, is never routed. The call fails.
- **Mobile only:**
  - The transactions screen has 5 status tabs: all, pending, approved, paid, cancelled.
  - The mobile API layer also defines `PUT /{id}/status`, which doesn't exist.
  - It has a text-entry date filter and single-file upload.
- **Web only:** the attachment input accepts multiple files.
- **Mobile calls without a trailing slash:** `/expense/categories`, `/expense/transactions` and similar are called without the trailing slash, so FastAPI answers with a redirect. The export call is `POST /expense/reports` rather than `/expense/reports/export`.

## Known gaps
- **Attachments are metadata only.** Upload reads the file (max 10 MB) but stores `file_path="/temp/path"` and a generic MIME type. Download returns a mock text body, and delete doesn't remove any file. Virus scanning and encryption fields are placeholders.
- **The audit trail is empty.** Every `create_audit_log` call in the category, type and transaction services is commented out ("temporarily disabled"). There is also `DELETE /expense/audit/logs/{id}`, a hard delete, which conflicts with the idea of an immutable audit record.
- **Report export is mocked.** `POST /expense/reports/export` returns a fixed `export_id`, and `/export/{id}/status` always says `completed`. `_generate_report_summary` leaves `categories_count` and `departments_count` at 0.
- `/expense/audit/transactions/{id}/summary` is defined twice in `expense_audit_endpoints.py`. The second definition is never reached.
- There are no budgets, no multi-level approval, and no recurring expenses.
- The combined fee-plus-expense view lives in `/reports/financial` (`service/reports/financial_report_service.py`), not in this module.
