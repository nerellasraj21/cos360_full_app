# Fee
Fee structure (categories, types, terms, class/student mappings), collection, receipts, refunds, concessions, old fees and fee reports.
_Last verified against code: 2026-10-07_
Flows, decisions, and feature map: [graph view](../graph/views/fee.md) (source: docs/graph/graph.jsonl).

## What it does
- **Structure**, per academic year: a category contains fee types. Each fee type is bound to one fee term (a schedule with `number_of_terms` due dates).
  - A class mapping sets the fee for a class. Its optional term amounts set how that fee is split across the due dates.
  - A student mapping is what the student actually owes. It has one term amount per due date.
  - Unique (DB constraint + 400 from the service): category name per year, type name per category, class mapping per (class, fee type, year), student mapping per (student, fee type, year). Receipt, transaction and refund numbers are unique per tenant.
- **Collection**: staff search for a student, see an as-of-date summary (assigned, after concession, paid, due), and take a payment by cash, UPI, bank transfer, cheque, DD or card. A receipt is created automatically, and an SMS to the parent is optional.
- **Concessions** reduce what a student owes for a single fee type. The approver field is only an audit label (owner, principal, management or correspondent). It is not an in-app approval step, because schools approve verbally or in a register.
- **Old fees** are dues from earlier years. They are either carried forward from COS360 data or entered by hand for schools that are new to COS360. They are shown on their own tab and are not mixed into this year's dues.
- **Receipts** get sequential numbers, a SHA-256 integrity hash, reprint tracking and a PDF generated on demand.
- **Refunds** go through an approval flow against completed transactions: pending -> approved -> processed, or pending -> rejected.
- **Reports** are under `/reports/fees`: collection summary, pending fees and fee structure, each with stats and an export.
- **Who can do what**: permissions are checked per resource: `fee_categories`, `fee_types`, `fee_terms`, `fee_class_mappings`, `fee_class_mapping_term_amounts`, `fee_student_mappings`, `fee_transactions`, `fee_receipts`, `fee_refunds` (the extra actions `approve` and `process`), `fee_collection` (extra action `send_sms`), `fee_concessions`, `fee_old` and `fee_reports` (extra action `export`). See [permissions](../permissions.md).
  - Admin and staff collect fees.
  - Students and parents get read-only self-service through the scoped endpoints (`/my-*`, `/child-*`, `/my-children-*`).

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/fee/` | - | - |
| Schemas / types | `backend/app/schemas/fee/` (enums in `enums.py`) | `web/src/types/fee/` | `mobile/src/types/fee/`, plus inline types in `mobile/src/api/fees.ts` |
| Services | `backend/app/service/fee/` (advisory locks in `fee_locks.py`), `backend/app/service/reports/fee_report_service.py` | - | - |
| Endpoints | `backend/app/api/v1/fee/`, `backend/app/api/v1/reports/fee_reports.py` | `web/src/api/fee/`, `web/src/constants/api/fee.ts` | `mobile/src/api/fees.ts` |
| Hooks | - | `web/src/hooks/fee/`, `web/src/api/hooks/fee/` | `mobile/hooks/use-fee-permissions.ts`, inline `useQuery` |
| UI | - | `web/src/pages/fee/` (`FeeCollection/` holds the tabs), routes `web/src/routes/_app/fee/` | `mobile/app/fees/` (`collection/[studentId].tsx`) |

Endpoint prefixes:
- `/fee/categories`, `/fee/types`, `/fee/terms`
- `/fee/class-mappings`, `/fee/class-mapping-term-amounts`, `/fee/student-mappings`
- `/fee/transactions`, `/fee/receipts`, `/fee/refunds`
- `/fee/collection`, `/fee/concessions`, `/fee/old-fees`
- `/reports/fees`

Seed data for the full fee chain: `backend/scripts/seed_demo_data.py`. `backend/scripts/seed_fee_test_data.py` still targets the pre-shared-tenancy `test_tenant_schema`.

## Rules & gotchas
1. **The summary and payment only read `fee_student_mappings` and `fee_student_map_term_amounts`.** A class mapping alone makes the student look like they owe nothing, so seed data has to cover the whole chain.
2. **Student term amounts** (`create_term_amounts`, used by single, bulk, mandatory and update paths):
   - They copy the class mapping's term amounts (same class, fee type and year) when those cover exactly the fee term's dates and sum to the student's `total_fee`.
   - Otherwise they are an equal split (`total_fee / len(term_dates)`), each share rounded to 2 decimals, so uneven totals sum short. For example, 1000 over 3 terms gives 333.33 x 3.
   - Paying that full amount through `fee_items` then fails with "exceeds the scheduled term amounts by 0.01". The auto-distribute path pays 999.99 and leaves 0.01 due that a further 0.01 payment cannot settle ("No outstanding fees to pay").
   - `PUT /fee/student-mappings/{id}` with a new `total_fee` rebuilds the term amounts.
3. **Column names that caught people out:**
   - `fee_class_map_term_amounts.fee_class_mapping_id`, not `fee_class_map_id`.
   - `fee_class_mappings` has no `section_id`.
   - Term-amount rows need both `term_id` and `term_date_id`, both NOT NULL.
   - `FeeClassMappingTermAmountUpdate` needs `term_date_id`. Sending `term_id` returns 422.
4. **Update term dates in place.** `update_fee_term_with_dates` zips the existing rows with the new dates.
   - `term_date_id` is an FK from both term-amount tables and from `fee_transaction_items`; deleting and re-inserting would break those links or orphan payments.
   - Reducing the count still deletes rows, which fails if they are referenced.
   - Changing `number_of_terms` does not rebuild existing student term amounts.
5. **Money is `Numeric`.** Pydantic v2 sends Decimal as a **JSON string** (`"2000.00"`). Clients must convert with `Number(val)` before doing maths or formatting.
6. **Payment `fee_items`:**
   - They must sum exactly to `amount_to_pay`, contain no duplicate fee types, and must not be an empty list (leave the field out instead).
   - Each item must be no more than that fee type's outstanding.
   - Web and mobile always send them. Leaving them out switches to the older top-down auto-distribution, which orders mappings by `fee_type_id` (UUID order, not display order) and puts any remainder toward old fees. On that path the receipt items list only current-year fees, so they sum to less than the receipt total when old fees were paid.
   - With explicit items the remainder is always 0, so **old fees are never paid through `/pay` from the clients**. The Old Fees tab records them by editing `paid_amount` instead.
7. **Payment-method validation** (`FeePaymentRequest`):
   - UPI needs `upi_reference`, and bank transfer needs `bank_reference`.
   - Cheque/DD need `cheque_number`, `cheque_bank` and `cheque_date`, and the date can be at most 90 days in the future.
   - Any extra `receipt_number` the clients send is ignored. The number shown in the UI before submit is provisional.
8. **Concurrency and duplicates** (`fee_locks.py`, Postgres transaction-scoped advisory locks keyed by tenant):
   - `/pay` and `POST /fee/transactions/` take a per-student lock, so parallel payments for one student run one at a time and cannot exceed the due.
   - Both accept an optional `idempotency_key` (1-64 chars). The transaction number is derived from (student, key) as `TXK...`, and a repeat with the same key returns the original transaction with `sms_status="skipped"`. Neither client sends a key, so a double submit creates two payments.
   - Refund creation locks the transaction row (`FOR UPDATE`).
9. **Receipt numbers** follow `REC-YYMM-NNNN` and restart each month, per tenant. `generate_receipt_number` runs under a per-tenant advisory lock, takes the highest numeric suffix for the month plus one (non-numeric suffixes are ignored) and skips any number already taken. `PATCH /fee/receipts/{id}/number` renumbers a receipt manually (400 if the number is in use), but see rule 10.
10. **The integrity hash** is SHA-256 of the sorted-key JSON of the *rendered* `ReceiptContent`, which includes the receipt number, student name, class-section, year title, collector name and items. `GET /fee/receipts/{id}/verify` renders the content again from live data. As a result:
    - Renaming the student, promoting them to another class, or renumbering the receipt makes `is_valid=false` even though nothing was tampered with.
    - The verify response is flat: `{receipt_id, receipt_number, is_valid, stored_hash, current_hash, verification_date}`.
11. **Receipts written by `/pay` store `class_section=""` and `academic_year=""`.** `_enrich_receipt_fields` fills them in at read time for get-by-id, get-by-number and search, by building a new `FeeReceiptRead`.
    - Never assign the looked-up values onto the ORM object. That marks it dirty, and autoflush would then write to the DB on the next query.
    - The receipt/admission lookup must not require `Admission.academic_year_id == transaction.academic_year_id`; that breaks receipts for students whose admission year differs.
12. **`payment_reference` on receipt content** depends on the payment method:
    - UPI shows the `upi_reference`.
    - Cheque shows `Cheque: {no}` and DD shows `DD: {no}` (DD reuses `cheque_number`).
    - Bank transfer shows the `bank_reference`, and cash shows nothing.
    - The PDF prints the placeholder "School Name"/"School Address". It does not read school settings yet.
13. **Refunds:**
    - The user-id fields (`requested_by_user_id`, `approved_by_user_id`, `processed_by_user_id`) are optional and always overwritten from the token.
    - `student_id`, `student_admission_num` and `academic_year_id` on create are optional and copied from the transaction; any that are sent and disagree return 400.
    - Reasons are `fee_adjustment | student_withdrawal | excess_payment | other` (`RefundReason` in `enums.py` matches); `detailed_reason` is optional even for `other`.
    - Pending, approved and processed refunds all count against the transaction's `total_amount`; a rejected refund frees its amount. Only completed transactions can be refunded.
    - Approve/reject only works while pending (reject is final); process only once approved and needs `refund_method` (`cash | bank_transfer | cheque`).
    - There is no update, delete, cancel or by-transaction route. Both clients cancel a pending refund by rejecting it through `POST /fee/refunds/approve` with the reason as `approval_remarks`.
14. **Concessions:**
    - The cumulative amount is capped at the mapping's `total_fee`, and the reason must be 5-500 characters.
    - A concession needs an existing student mapping (FK `fee_student_map_id` NOT NULL). Deleting a student mapping that has a concession fails.
    - `DELETE` revokes (sets `is_active=false`) and is repeatable. Applying a concession again for the same mapping reactivates the same row with the new amount.
    - Parents get 403 on `GET /fee/concessions/student/{id}`.
15. **Deletes:**
    - Categories: blocked while fee types exist.
    - Types: blocked while class or student mappings exist.
    - Class and student mappings: hard-deleted with **no check for payments**. The transaction items survive because they key on `fee_type_id`, but they drop out of the summary.
    - Old fees: only `manual_entry` rows can be deleted; carry-forward rows return 400.
16. **Old-fee settle** (`PATCH /fee/old-fees/{id}/settle`, needs `fee_old:update`) sets `is_settled` and leaves `paid_amount` unchanged, so the row still shows an outstanding amount while the summary's `old_fee_pending_amount` drops to 0. Both clients confirm before calling it.
17. **Endpoint styles:** the self-service routes (`/fee/collection/my-summary`, `child-summary`, `my-history`, `child-history`, `/fee/transactions/my-fees`, `my-children-fees`, `my-outstanding-fees`, `child-outstanding-fees`, `/fee/receipts/my-receipts`, `my-children-receipts`) and the receipt PDF use `check_user_resource_access` (own/related scopes). Everything else uses `check_role_plan_permission_with_error` (exact action).
    - A student with only `*_own` grants gets a 403 on the exact-action endpoints, and admin gets 403 on the `/my-*` lists.
    - `my-summary` and `my-history` need `fee_collection:read`, which the default Student role does not have (403). Web student self-service reads `/fee/transactions/my-fees` instead.
18. **The summary's `as_of_date`** filters payments by `transaction_date <= date`. Assigned amounts and concessions are never date-filtered.
    - Pending cheque/DD payments are not counted as paid.
    - Refunds are **not** subtracted from "paid" anywhere.
    - `old_fee_pending_amount` covers all unsettled old fees, in any year.
    - `GET /fee/collection/terms-due/{student_id}` ignores concessions.
19. **There are two ways to take a payment:**
    - `POST /fee/transactions/`, used by the web Transactions page: explicit items per type and term, ignores concessions, allows cash/upi/cheque/bank_transfer (bank transfer also needs `bank_name`). Several items for the same term date are checked against that term's outstanding together.
    - `/fee/collection/pay`: aware of concessions and old fees.
    - New UI should use `/pay`. `GET /fee/transactions/transaction-number/{number}` looks a transaction up by number.
20. **Web year default:** `web/src/api/fee/{categories,terms,classMappings,studentMappings,transactions}.ts` fill a missing `academic_year_id` from `academicYearStore.selectedAcademicYearId` (the header selector); creates throw "Academic year is required" when none is selected.
21. **Fee report numbers:** a pending-fees row is one unpaid instalment (`fee_student_map_term_amounts`), matched to `completed` payments by `term_date_id` and due on its `fee_term_dates` date. Collection stats count only `completed` transactions, and their total due counts each paid instalment's amount once. Each `/stats` endpoint aggregates the same filtered query as its table, so the two always agree.
    - A plain `date_to` (`YYYY-MM-DD`) includes that whole day; an unparseable `date_from`/`date_to` returns 422.
    - `page` >= 1, `page_size` 1-1000, `sort_order` `asc|desc`, otherwise 422.
    - Export returns every matching row and always streams the file directly (see [reports](reports-dashboards.md) export routing).
22. **Transaction status changes** (`PUT /fee/transactions/{id}`, `STATUS_TRANSITIONS` in `fee_transaction_service.py`): `pending` can become `completed`, `cancelled` or `bounced`; `completed` can only become `bounced`, and only for cheque/DD; `cancelled` and `bounced` are final. A completed payment is reversed through a refund, not a status change. `cheque_status` applies only to cheque/DD and moves `pending` to `cleared` or `bounced` (`cleared` can still bounce); a bounced cheque needs `status: bounced` in the same request. Anything else returns 400.
23. **Payment SMS** is queued after the commit with the tenant id from the token (`send_notification_batch`); the SMS result never affects the payment.

## Web / mobile parity
- **Both clients**: structure CRUD, the collection detail page with 5 tabs and `fee_items`, receipts (including verify and PDF), refunds (create, approve/reject, process, cancel-as-reject), reports, and my-fees/my-receipts/my-transactions.
- **Web only**: the fee dashboard (`FeeDashboard.tsx`) and the legacy Transactions create page.
- **Mobile only**: separate `class-mappings`, `student-mappings` and `assign-student-fees` screens. Web handles these as tabs in `/fee/mappings`.
- **Mobile old fees are broken** (`feeOldFeesApi` in `mobile/src/api/fees.ts`):
  - Every call uses `/fee/old/...`; the backend path is `/fee/old-fees/...` (404).
  - The bodies are also wrong (422 once the path is fixed): carry-forward sends `{previous_year_id, current_year_id, student_ids}` instead of `{student_id, source_academic_year_id, target_academic_year_id}`, and manual create sends `{current_year_id, amount, description}` instead of `{academic_year_label, fee_type_name, original_amount, ...}`.
- `mobile/app/fees/collection.tsx` calls my-summary and child-summary without `academic_year_id`, which is a required query parameter (422). The `X-Academic-Year-ID` header does not satisfy it.
- Report export: web offers CSV, xlsx and PDF. Mobile is CSV only: `app/fees/reports.tsx` fetches the backend CSV as text and shares it, and `app/reports/fee-reports.tsx` builds it from the rows on screen.
- `web/src/api/fee/mappings.ts`: its class-mapping term-amount and bulk calls are live, but the `feeMappingsApi` functions point at `/fee/mappings/` and `/fee/term-amounts/`, which don't exist. Use `classMappings.ts` or `studentMappings.ts`.

## Known gaps
- `GET` by id of an unknown or deleted fee category, fee type, class mapping or student mapping returns 500 instead of 404 (the services swallow their own 404), including cross-tenant ids.
- `PUT /fee/types/{id}` that changes `fee_term_id` returns the old term name and dates; a following GET is correct.
- Term-amount reads return `term_date: null`: student mapping term amounts always (POST and GET), class-mapping term amounts on by-mapping, list and single reads (only create/update fill it).
- `POST /fee/transactions/` for a completed method (cash, upi, bank_transfer) returns 500 `MissingGreenlet` after the transaction and receipt are already committed, so the web Transactions page reports a failure for a saved payment. Cheque (pending) works.
- The pending-fees report ignores concessions, so a student with a concession still shows the full instalment as pending.
- Carry-forward ignores concessions. It carries forward `total_fee - paid`.
- Cheque/DD payments mark old fees as paid straight away, even though the transaction is still `pending` and could bounce. This only applies to the auto-distribute path.
- Fee audit writes (`_write_audit_log` in the collection, concession and old-fee services) insert into `audit_logs`, which does not exist, so nothing is recorded. Each write runs in a savepoint before the commit, so the failure never affects the request.
- No online payment gateway: parents cannot pay in-app. Every payment is recorded by staff, with UPI/bank references typed in by hand.
