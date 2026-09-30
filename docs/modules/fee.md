# Fee
Fee structure (categories, types, terms, class/student mappings), collection, receipts, refunds, concessions, old fees and fee reports.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/fee.md) (source: docs/graph/graph.jsonl).

## What it does
- **Structure**, per academic year: a category contains fee types. Each fee type is bound to one fee term (a schedule with `number_of_terms` due dates).
  - A class mapping sets the fee for a class.
  - A student mapping is what the student actually owes. It has one term amount per due date.
  - Unique (DB constraint + 400 from the service): category name per year, type name per category, class mapping per (class, fee type, year), student mapping per (student, fee type, year).
- **Collection**: staff search for a student, see an as-of-date summary (assigned, after concession, paid, due), and take a payment by cash, UPI, bank transfer, cheque, DD or card. A receipt is created automatically, and an SMS to the parent is optional.
- **Concessions** reduce what a student owes for a single fee type. The approver field is only an audit label (owner, principal, management or correspondent). It is not an in-app approval step, because schools approve verbally or in a register.
- **Old fees** are dues from earlier years. They are either carried forward from COS360 data or entered by hand for schools that are new to COS360. They are shown on their own tab and are not mixed into this year's dues.
- **Receipts** get sequential numbers, a SHA-256 integrity hash, reprint tracking and a PDF generated on demand.
- **Refunds** go through an approval flow against completed transactions: pending → approved → processed, or pending → rejected.
- **Reports** are under `/reports/fees`: collection summary, pending fees and fee structure, each with stats and an export.
- **Who can do what**: permissions are checked per resource: `fee_categories`, `fee_types`, `fee_terms`, `fee_class_mappings`, `fee_class_mapping_term_amounts`, `fee_student_mappings`, `fee_transactions`, `fee_receipts`, `fee_refunds` (the extra actions `approve` and `process`), `fee_collection` (extra action `send_sms`), `fee_concessions`, `fee_old` and `fee_reports` (extra action `export`). See [permissions](../permissions.md).
  - Admin and staff collect fees.
  - Students and parents get read-only self-service through the scoped endpoints (`/my-*`, `/child-*`).

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/fee/` | — | — |
| Schemas / types | `backend/app/schemas/fee/` (enums in `enums.py`) | `web/src/types/fee/` | `mobile/src/types/fee/`, plus inline types in `mobile/src/api/fees.ts` |
| Services | `backend/app/service/fee/`, `backend/app/service/reports/fee_report_service.py` | — | — |
| Endpoints | `backend/app/api/v1/fee/`, `backend/app/api/v1/reports/fee_reports.py` | `web/src/api/fee/`, `web/src/constants/api/fee.ts` | `mobile/src/api/fees.ts` |
| Hooks | — | `web/src/hooks/fee/`, `web/src/api/hooks/fee/` | `mobile/hooks/use-fee-permissions.ts`, inline `useQuery` |
| UI | — | `web/src/pages/fee/` (`FeeCollection/` holds the tabs), routes `web/src/routes/_app/fee/` | `mobile/app/fees/` (`collection/[studentId].tsx`) |

Endpoint prefixes:
- `/fee/categories`, `/fee/types`, `/fee/terms`
- `/fee/class-mappings`, `/fee/class-mapping-term-amounts`, `/fee/student-mappings`
- `/fee/transactions`, `/fee/receipts`, `/fee/refunds`
- `/fee/collection`, `/fee/concessions`, `/fee/old-fees`
- `/reports/fees`

`fee_category_endpoints_protected.py` is not registered in `main_router.py`, so it is dead code.

## Rules & gotchas
1. **The summary and payment only read `fee_student_mappings` and `fee_student_map_term_amounts`.** A class mapping alone makes the student look like they owe nothing. That is why seed data has to cover the whole chain (`backend/scripts/seed_fee_test_data.py`).
2. **Student term amounts are always an equal split** (`create_term_amounts`: `total_fee / len(term_dates)`). They are not copied from class-mapping term amounts, which are only a display/template layer; the backend never reads them.
   - Totals that don't divide evenly round each share to 2 decimals, so the shares sum to less than `total_fee`. For example, 1000 over 3 terms gives 333.33 × 3.
   - Paying the full amount through `fee_items` then fails with "exceeds the scheduled term amounts by 0.01".
3. **Column names that caught people out:**
   - `fee_class_map_term_amounts.fee_class_mapping_id`, not `fee_class_map_id`.
   - `fee_class_mappings` has no `section_id`.
   - Term-amount rows need both `term_id` and `term_date_id`, both NOT NULL.
   - `FeeClassMappingTermAmountUpdate` needs `term_date_id`. Sending `term_id` returns 422.
   - `FeeClassMappingUpdate` types `class_id` and `academic_year_id` as `int`, so any UUID there returns 422. `PUT /fee/class-mappings/{id}` should send only `total_fee`/`all_by_default` (web does); mobile `app/fees/class-mappings.tsx` edit sends both UUIDs and fails.
4. **Update term dates in place.** `update_fee_term_with_dates` zips the existing rows with the new dates.
   - Why: `term_date_id` is an FK from both term-amount tables and from `fee_transaction_items`. Deleting and re-inserting would break those links or orphan payments.
   - Reducing the count still deletes rows, which fails if they are referenced.
   - Changing `number_of_terms` does not rebuild existing student term amounts.
5. **Money is `Numeric`.** Pydantic v2 sends Decimal as a **JSON string** (`"2000.00"`). Clients must convert with `Number(val)` before doing maths or formatting.
6. **Payment `fee_items`:**
   - They must sum exactly to `amount_to_pay`, contain no duplicate fee types, and must not be an empty list (leave the field out instead).
   - Each item must be no more than that fee type's outstanding.
   - Web and mobile always send them. Leaving them out switches to the older top-down auto-distribution, which orders mappings by `fee_type_id` (UUID order, not display order) and puts any remainder toward old fees.
   - With explicit items the remainder is always 0, so **old fees are never paid through `/pay` from the clients**. The Old Fees tab records them by editing `paid_amount` instead.
7. **Payment-method validation** (`FeePaymentRequest`):
   - UPI needs `upi_reference`, and bank transfer needs `bank_reference`.
   - Cheque/DD need `cheque_number`, `cheque_bank` and `cheque_date`, and the date can be at most 90 days in the future.
   - Any extra `receipt_number` the clients send is ignored. The number shown in the UI before submit is provisional.
8. **Receipt numbers** follow `REC-YYMM-NNNN` and restart each month, per tenant.
   - The number is worked out as the current maximum plus one, protected by a unique constraint rather than a sequence or lock. Two payments at the same moment can collide and return a 500.
   - `PATCH /fee/receipts/{id}/number` lets you renumber a receipt manually, but see rule 9.
9. **The integrity hash** is SHA-256 of the sorted-key JSON of the *rendered* `ReceiptContent`, which includes the receipt number, student name, class-section, year title, collector name and items. `GET /fee/receipts/{id}/verify` renders the content again from live data. As a result:
   - Renaming the student, promoting them to another class, or renumbering the receipt makes `is_valid=false` even though nothing was tampered with.
   - The verify response is flat: `{receipt_id, receipt_number, is_valid, stored_hash, current_hash, verification_date}`. The web type used to expect `is_integrity_valid`, `verified_at` and nested `verification_details`, and crashed.
10. **Receipts written by `/pay` store `class_section=""` and `academic_year=""`.** `_enrich_receipt_fields` fills them in at read time for get-by-id, get-by-number and search, by building a new `FeeReceiptRead`.
    - Never assign the looked-up values onto the ORM object. That marks it dirty, and autoflush would then write to the DB on the next query.
    - The receipt/admission lookup must not require `Admission.academic_year_id == transaction.academic_year_id`. That condition used to break receipt generation for students whose admission year differs.
11. **`payment_reference` on receipt content** depends on the payment method:
    - UPI shows the `upi_reference`.
    - Cheque shows `Cheque: {no}` and DD shows `DD: {no}` (DD reuses `cheque_number`).
    - Bank transfer shows the `bank_reference`, and cash shows nothing.
    - The PDF prints the placeholder "School Name"/"School Address". It does not read school settings yet.
12. **Refund Pydantic bodies make the user-id field required** (`requested_by_user_id`, `approved_by_user_id`, `processed_by_user_id`), even though the endpoint overwrites it from the token. A client that leaves it out gets a 422.
    - Refund reasons in the schema are `fee_adjustment | student_withdrawal | excess_payment | other`. `RefundReason` in `enums.py` has different values and is not used.
    - Pending refunds are not counted against the limit, and approval does not re-check it. Several pending refunds can therefore add up to more than the transaction.
13. **Concessions:**
    - The cumulative amount is capped at the mapping's `total_fee`, and the reason must be 5–500 characters.
    - A concession needs an existing student mapping (FK `fee_student_map_id` NOT NULL). Deleting a student mapping that has a concession fails.
14. **Deletes:**
    - Categories: blocked while fee types exist.
    - Types: blocked while class or student mappings exist.
    - Class and student mappings: hard-deleted with **no check for payments**. The transaction items survive because they key on `fee_type_id`, but they drop out of the summary.
15. **Endpoint styles:** `/my-summary`, `/child-summary`, `/my-receipts` and the PDF endpoint use `check_user_resource_access` (own/related scopes). Everything else uses `check_role_plan_permission_with_error` (exact action). A student with only `*_own` grants gets a 403 on the exact-action endpoints.
16. **The summary's `as_of_date`** filters payments by `transaction_date ≤ date`. Assigned amounts and concessions are never date-filtered.
    - Refunds are **not** subtracted from "paid" anywhere.
    - `old_fee_pending_amount` covers all unsettled old fees, in any year.
17. **There are two ways to take a payment:**
    - `POST /fee/transactions/`, used by the web Transactions page: explicit items per type and term, ignores concessions, allows cash/upi/cheque/bank_transfer.
    - `/fee/collection/pay`: aware of concessions and old fees.
    - New UI should use `/pay`.
18. **Web year default:** `web/src/api/fee/{categories,terms,classMappings,studentMappings,transactions}.ts` fill a missing `academic_year_id` from `academicYearStore.selectedAcademicYearId` (the header selector); creates throw "Academic year is required" when none is selected.
19. **Fee report numbers:** a pending-fees row is one unpaid instalment (`fee_student_map_term_amounts`), matched to `completed` payments by `term_date_id` and due on its `fee_term_dates` date. Collection stats count only `completed` transactions, and their total due counts each paid instalment's amount once. Each `/stats` endpoint aggregates the same filtered query as its table, so the two always agree. A plain `date_to` (`YYYY-MM-DD`) includes that whole day.

## Web / mobile parity
- **Both clients**: structure CRUD, the collection detail page with 5 tabs and `fee_items`, receipts (including verify and PDF), refunds, reports, and my-fees/my-receipts/my-transactions.
- **Web only**: the fee dashboard (`FeeDashboard.tsx`) and the legacy Transactions create page.
- **Mobile only**: separate `class-mappings`, `student-mappings` and `assign-student-fees` screens. Web handles these as tabs in `/fee/mappings`.
- **Mobile paths that are wrong** (all 404):
  - Old fees use `/fee/old/...`; the backend path is `/fee/old-fees/...`.
- **Mobile payloads that are wrong** (all 422):
  - Carry-forward sends `{previous_year_id, current_year_id, student_ids}`.
  - Refund approve leaves out `approved_by_user_id`.
  - Refund process sends `reference_number` and no `refund_method`.
  - `app/fees/collection.tsx` calls my-summary, child-summary and summary without `academic_year_id`, which is a required query parameter. The `X-Academic-Year-ID` header does not satisfy it.
- **Both clients call refund endpoints that don't exist**: `PUT`/`DELETE /fee/refunds/{id}` and `POST /{id}/cancel`. Web also calls `/by-transaction/{id}`.
- Report export: web offers xlsx and pdf. Mobile is CSV only: `app/fees/reports.tsx` downloads the backend CSV, and `app/reports/fee-reports.tsx` builds it from the rows on screen.
- `web/src/api/fee/mappings.ts` points at a `/fee/mappings/` API that doesn't exist. Use `classMappings.ts` or `studentMappings.ts`.

## Known gaps
- The pending-fees report ignores concessions, so a student with a concession still shows the full instalment as pending.
- Fee report export (`POST /reports/fees/export`) only includes the first 100 rows: the filter schemas default to `page_size=100` and the export does not override it.
- Web Fee Reports only loads the stats tables once a filter is set (`enabled` in `web/src/hooks/fee/useFeeReports.ts`).
- The payment SMS always ends up `failed` when a parent phone exists: `_dispatch_sms_receipt` reads `txn.created_by`, which is not a column on `FeeTransaction`.
- `DELETE /fee/concessions/{id}` and `DELETE /fee/old-fees/{id}` declare `response_model` Read schemas but return a dict. The change is committed, then response validation returns a 500.
- A concession can't be revoked and then re-added for the same student, type and year. The unique constraint still counts the inactive row, so the insert returns a 500.
- Carry-forward ignores concessions. It carries forward `total_fee − paid`.
- Cheque/DD payments mark old fees as paid straight away, even though the transaction is still `pending` and could bounce. This only applies to the auto-distribute path.
- Refund, receipt and concession services use `commit()` → `refresh()`, which breaks the repo rule of flush → select → commit.
- Old-fee `settle` is gated on the `fee_old:delete` permission.
- `PUT /fee/transactions/{id}` (`update_transaction_status`) writes any `status`/`cheque_status` with no transition check (e.g. `cancelled` → `completed`), so clients must restrict the choices.
- No online payment gateway: parents cannot pay in-app. Every payment is recorded by staff, with UPI/bank references typed in by hand.
