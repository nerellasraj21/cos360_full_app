# Mobile App Parity Fix List — Web vs Mobile Deep Audit

**Date:** 2026-04-04 (updated 2026-04-04)
**Audited by:** Claude Code (Opus 4.6)
**Web app:** COS360 Frontend (React) — WORKING, reference implementation
**Mobile app:** COS360 Mobile (React Native / Expo) — NEEDS FIXES
**Backend:** FastAPI + Neon DB — source of truth

---

## Priority Legend

- **P0 — CRITICAL**: Data integrity risk, schema mismatch, or completely broken
- **P1 — HIGH**: Missing feature that exists in web, users will notice
- **P2 — MEDIUM**: UX gap, wrong defaults, or degraded experience
- **P3 — LOW**: Minor cosmetic or nice-to-have alignment

---

## STATUS KEY

- [ ] Not started
- [x] Fixed

---

## TRANSPORT MODULE

### Screen: Transport Routes

**Files:** `app/transport/routes.tsx`, `hooks/use-transport.ts`, `src/types/transport.ts`, `src/api/masters.ts`

- [x] **P0** — Route Type / Trip Type hardcoded to `'upward'|'downward'` and `'first trip'|'second trip'` — web uses dynamic values from `/masters/route-types` and `/masters/trip-types`
  - Fixed: Created `src/api/transportTypes.ts`, added hooks, updated types to `string`
- [x] **P0** — Dropdown menus not opening (toggle instead of picker)
  - Fixed: Replaced toggle with picker modal
- [x] **P2** — Cancel button white instead of blue
  - Fixed: Changed to `backgroundColor: colors.primary`
- [x] **P0** — Missing "Create Route Type" and "Create Trip Type" on-the-fly
  - Fixed: Added create type modals with duplicate checking
- [x] **P1** — Update/delete mutations succeeded but list never refreshed — React Query cache not invalidated
  - Fixed: Added `onSuccess: () => qc.invalidateQueries(['routes'])` to `useCreateRoute`, `useUpdateRoute`, `useDeleteRoute`
- [x] **P2** — Delete used `window.confirm()` (browser popup) instead of in-app modal
  - Fixed: Replaced with `useConfirmModal` + `<ConfirmModal>`

---

### Screen: Route Stops

**Files:** `app/transport/route-stops.tsx`, `hooks/use-transport.ts`

- [x] **P1** — Update/delete mutations succeeded but list never refreshed — React Query cache not invalidated
  - Fixed: Added `onSuccess: () => qc.invalidateQueries(['route-stops'])` to `useCreateRouteStop`, `useUpdateRouteStop`, `useDeleteRouteStop`
- [x] **P2** — Delete used `window.confirm()` (browser popup) instead of in-app modal
  - Fixed: Replaced with `useConfirmModal` + `<ConfirmModal>`
- [x] **P2** — Cancel button had hardcoded `backgroundColor: '#F3F4F6'` (light gray) — text invisible in dark mode
  - Fixed: Changed to `backgroundColor: colors.primary` with `color: 'white'`
- [ ] **P2** — Default `reaching_time` is `07:00:00`, web uses `08:30:00`
- [ ] **P2** — Default `fees` is `0`, web uses `25`
- [ ] **P3** — Mobile has search + route filter (web doesn't) — this is actually better, keep it

---

### Screen: Vehicles

**Files:** `app/transport/vehicles.tsx`, `hooks/use-transport.ts`

- [x] **P1** — Update/delete mutations succeeded but list never refreshed — React Query cache not invalidated
  - Fixed: Added `onSuccess: () => qc.invalidateQueries(['vehicles'])` to `useCreateVehicle`, `useUpdateVehicle`, `useDeleteVehicle`
- [x] **P2** — Delete used `window.confirm()` (browser popup) instead of in-app modal
  - Fixed: Replaced with `useConfirmModal` + `<ConfirmModal>`

---

### Screen: Trips

**Files:** `app/transport/trips.tsx`, `hooks/use-transport.ts`

- [x] **P1** — Update/delete mutations succeeded but list never refreshed — React Query cache not invalidated
  - Fixed: Added `onSuccess: () => qc.invalidateQueries(['trips'])` to `useCreateTrip`, `useUpdateTrip`, `useDeleteTrip`
- [x] **P2** — Delete used `window.confirm()` (browser popup) instead of in-app modal
  - Fixed: Replaced with `useConfirmModal` + `<ConfirmModal>`
- [x] **P2** — Cancel button had hardcoded `backgroundColor: '#F3F4F6'` — text invisible in dark mode
  - Fixed: Changed to `backgroundColor: colors.primary` with `color: 'white'`
- [x] **P2** — Edit form driver dropdown not pre-selecting driver — `trip.driver_id` could be `null` at runtime, causing dropdown to receive `null` value
  - Fixed: `driver_id: trip.driver_id ?? ''` in `handleEdit`
- [ ] **P2** — Driver name shows "Unknown Driver" in card when driver data is not yet loaded — consider loading skeleton or lazy fetch

---

### Screen: Transport Pricing

**Files:** `app/transport/pricing.tsx`, `src/types/transport.ts`

- [x] **P0 — SCHEMA MISMATCH** — Web and mobile used completely different schemas
  - Fixed: Added `TransportPricing`, `TransportPricingCreate`, `TransportPricingUpdate`, `BillingCycle` types to `src/types/transport.ts` matching web's billing_cycle model (`vehicle_id`, `route_id`, `billing_cycle`, `cycle_name`, `amount`, `start_date`, `end_date`, `is_active`)

---

### Screen: Student Transport

**Files:** `app/transport/student-transport.tsx`

- [ ] **P1** — Mobile missing `pricing_id` field (web has it as optional)
- [ ] **P3** — Mobile has role-based views (student/parent read-only) that web doesn't — keep this, it's better

---

## STUDENT MODULE

### Screen: Student Attendance

**Files:** `app/students/attendance.tsx`

- [ ] **P1** — Staff marking view has NO remarks field — web sends `remarks: ''` but at least has the field infrastructure
- [ ] **P2** — Parent child selection: mobile depends on header-level selector, web auto-selects first child in-page
- [ ] **P2** — No inline error display for failed reads (only toast) — web shows red error box
- [ ] **P2** — No "Modified" badge on changed rows — web highlights modified rows in blue
- [ ] **P2** — No visible "Unsaved Changes" indicator — web shows badge
- [ ] **P3** — Date filter locked to calendar months — web allows any date range

---

### Screen: Student Certificates

**Files:** `app/students/certificates.tsx`

- [ ] **P1** — Missing teacher role view — mobile falls through to admin view, web has dedicated `StudentCertificatesPage`
- [ ] **P2** — No search/filter on certificate list
- [ ] **P3** — Download uses `Linking.openURL()` for presigned URL — works but no progress indicator

---

## STAFF MODULE

### Screen: Staff Attendance

**Files:** `app/staff/attendance.tsx`

- [ ] **P1** — No search/filter by name, email, or department — web has search bar
- [ ] **P1** — No pagination — loads all staff, poor UX for large organizations
- [ ] **P2** — Remarks field only shown for 'late' status — should be available for 'absent' too
- [ ] **P2** — No column visibility toggle (web has it)
- [ ] **P3** — No "Unsaved Changes" badge

---

### Screen: Staff Enrollment

**Files:** `app/staff/enrollment.tsx`

- [ ] **P3** — Mobile actually has MORE fields than web (work experience, bank details, salary, qualifications) — keep these, web needs to catch up

---

### Screen: Staff Designations

**Files:** `app/staff/designations.tsx`

- [ ] **P2** — No pagination (fetches up to 100 records)
- [ ] **P3** — No inline editing (uses modal instead) — acceptable for mobile

---

## FEE MODULE

### Screen: Fee Collection

**Files:** `app/fees/collection.tsx`

- [ ] **P1** — No dedicated "Old Fees" tab/screen — web has a full Old Fees tab
- [ ] **P2** — No student photo display in search results
- [ ] **P2** — No parent/guardian info display in student card
- [ ] **P2** — No individual concession management UI (only bulk create)

---

### Screen: Fee Types

**Files:** `app/fees/types.tsx`

- [ ] **P2** — No academic year filtering — queries all types regardless of year

---

### Screen: Fee Terms

**Files:** `app/fees/terms.tsx`

- [ ] **P3** — No term description field
- [ ] **P3** — Simpler date UI (manual entry for each installment)

---

### Screen: Fee Mappings

**Files:** `app/fees/mappings.tsx`, `app/fees/class-mappings.tsx`, `app/fees/student-mappings.tsx`

- [ ] **P2** — Bulk create iterates individual API calls instead of true bulk endpoint
- [ ] **P2** — No preview of existing mappings before creation

---

### Screen: Fee Transactions

**Files:** `app/fees/transactions.tsx`

- [ ] **P2** — Receipt generation bundled with transactions — web separates these flows
- [ ] **P2** — Outstanding fees query tied to studentId — web includes in search results

---

### Screen: Fee Receipts

**Files:** `app/fees/receipts.tsx`

- [ ] **P1** — No receipt download/export (web can download/print)
- [ ] **P1** — No receipt search/filtering
- [ ] **P2** — No receipt cancellation workflow
- [ ] **P3** — Read-only with reprint only

---

### Screen: Fee Refunds

**Files:** `app/fees/refunds.tsx`

- [ ] **P1** — Uses "Delete" instead of "Cancel" for refund cancellation — web has proper cancel workflow
- [ ] **P2** — Simpler approval workflow (no refund method selection: cash/bank_transfer/cheque)
- [ ] **P2** — No refund statistics dashboard

---

### Screen: Fee Reports

**Files:** `app/fees/reports.tsx`

- [ ] **P1** — Class/Section filters require manual UUID entry — no dropdown pickers
- [ ] **P1** — No pagination — limited to ~20 rows per tab
- [ ] **P2** — Only CSV export — web supports CSV, Excel, PDF
- [ ] **P2** — Collection tab requires manual "Apply" before querying — web auto-queries

---

### Screen: Fee Categories

**Files:** `app/fees/categories.tsx`

- [ ] **P2** — No category hierarchy/tree structure — web uses `FeeCategoryTree` component
- [ ] **P3** — No category descriptions or icon/color coding

---

## EXAM MODULE

### Screen: Exam List

**Files:** `app/exam/list.tsx`

- [ ] **P2** — No nature filter (formative/summative/cumulative/custom) — web has it
- [ ] **P2** — No column sorting — web has clickable sortable headers
- [ ] **P3** — Shows `academic_year_id` instead of human-readable title

---

### Screen: Exam Create/Edit

**Files:** `app/exam/create.tsx`, `app/exam/[id].tsx`

- [ ] **P1** — Missing form fields vs web:
  - `term` (text field)
  - `publish_rank` (checkbox)
  - `attendance_from_date` (date)
  - `attendance_to_date` (date)
  - `hall_ticket_min_attendance` (number)
- [ ] **P2** — Academic Year requires UUID paste — should use dropdown

---

### Screen: Mark Entry

**Files:** `app/exam/marks.tsx`

- [ ] **P2** — Limited to 20 students per page — web uses 50
- [ ] **P2** — Component-by-component entry model less flexible than web's class/section/subject approach
- [ ] **P3** — No dirty count badge like web

---

### Screen: Exam Results

**Files:** `app/exam/results.tsx`

- [ ] **P3** — Mobile actually has explicit "Publish" button that web lacks — keep this

---

### Screen: Hall Tickets

**Files:** `app/exam/hall-tickets.tsx`

- [ ] **P3** — Mobile shows both eligible AND ineligible students with override capability — web only shows eligible. Mobile is better here, keep it.

---

### Screen: Grade Schemes

**Files:** `app/exam/grade-schemes.tsx`

- [ ] **P3** — No significant gaps — both are feature-complete with different UI paradigms

---

## EXPENSE MODULE

### Screen: Expense Transactions

**Files:** `app/expense/transactions.tsx`, `app/expense/transactions/create.tsx`, `app/expense/transactions/edit/[id].tsx`

- [x] **P0** — No line items support — web has full itemized expenses with:
  - Item Name, Description, Unit Price, Quantity
  - Tax Rate (%), Discount Rate (%)
  - Auto-calculated Final Amount per item
  - Total = sum of all items
  - Fixed: Added TransactionItem type + full line items UI to create screen with auto-calculation
- [ ] **P1** — Date filters use text input (`YYYY-MM-DD`) — should use date picker
- [ ] **P2** — Single file attachment upload — web supports multiple simultaneous
- [ ] **P2** — Mobile has `Department` field that web doesn't — decide whether to keep or remove

---

### Screen: Expense Approvals

**Files:** `app/expense/approvals.tsx`

- [ ] **P3** — Functionally equivalent — both require approval comment, both have Approve/Reject

---

### Screen: Expense Summary

**Files:** `app/expense/summary.tsx`

- [ ] **P3** — Good parity — both implement hierarchical category breakdown

---

### Screen: Expense Audit

**Files:** `app/expense/audit.tsx`

- [ ] **P0** — Mobile has NO audit page — web has full audit trail with:
  - Overview stats tab
  - Transaction-level audit logs
  - Search by description/reference
  - Department filter
  - Action badges (create, update, approve, reject, delete)
  - Detailed field-level change tracking

---

### Screen: Expense Categories & Types

**Files:** `app/expense/categories.tsx`, `app/expense/types.tsx`

- [x] **P2** — Delete confirmation used browser `window.confirm()` instead of in-app modal
  - Fixed: Created `components/ConfirmModal.tsx` (reusable component + `useConfirmModal` hook). Applied to `categories.tsx`, `types.tsx`, and `transactions.tsx`
- [ ] **P3** — Good parity — both support full CRUD

---

## COMMUNICATION MODULE

**File:** `app/(tabs)/communication.tsx` (single-file implementation, 3 in-page tabs)

### Screen: Compose

- [x] **P1** — Compose had no step wizard — web uses 4-step wizard with Back/Next navigation and progress bars
  - Fixed (v2.4.0): Implemented full step wizard matching web — Step 1 (Channel), Step 2 (Recipients + Class/Section), Step 3 (Template), Step 4 (Variables). Progress bar + "Step X of Y" label. Back/Next buttons between steps. Send Now on last step.
- [x] **P2** — Class + Section dropdowns were side-by-side (50% width each) — too narrow for `CustomDropdown` on mobile
  - Fixed (v2.4.0): Changed to full-width stacked layout (Class on one row, Section below)
- [x] **P2** — Template section showed before recipient fields were complete — should only appear after recipients done
  - Fixed (v2.4.0): Template step only reachable via Next button after `isRefComplete` passes
- [x] **P2** — `Alert.alert` used for send errors — should use `showError` toast
  - Fixed (v2.4.0): All error feedback uses `showError` from `useToastContext`

---

### Screen: Templates

- [x] **P2** — "New" button label was just "New" — web says "+ New Template"
  - Fixed (v2.4.0): Button now reads "New Template"
- [x] **P2** — Deactivate confirmation used `Alert.alert` instead of in-app modal
  - Fixed (v2.4.0): Uses `ConfirmModal` via `useConfirmModal()` hook

---

### Screen: Logs

- [ ] **P3** — Good parity — filters, pagination, detail modal all implemented

---

## MASTERS MODULE

### Screen: Subjects

**Files:** `app/masters/subjects.tsx`

- [ ] **P2** — No inline editing (uses modal) — web has inline table editing
- [ ] **P2** — No inline category creation popover — web creates categories without leaving edit mode
- [ ] **P3** — Mobile has `is_practical` and `description` fields web doesn't show — keep these

---

### Screen: Academic Years

**Files:** `app/masters/academicyears.tsx`

- [ ] **P2** — No pagination — web paginates at 5 per page
- [ ] **P2** — No inline editing — uses modal

---

### Screen: Classes and Sections

**Files:** `app/masters/classesandsections.tsx`

- [ ] **P2** — Flattened display (no hierarchy) — web shows classes containing sections
- [ ] **P2** — No cascading delete warnings — web shows AlertDialog about affected sections

---

### Screen: Class-Subject Mappings

**Files:** `app/masters/classsubjectmappings.tsx`

- [ ] **P1** — Cannot edit `exclude_marks`, `order`, `is_active` fields — web has inline editing for all three
- [ ] **P2** — No pagination
- [ ] **P2** — No search

---

## CROSS-CUTTING CONCERNS

### Browser `window.confirm()` — Replace with In-App Modal

- [x] **P2** — Created reusable `components/ConfirmModal.tsx` with `useConfirmModal()` hook
  - Fixed in: `app/expense/types.tsx`, `app/expense/categories.tsx`, `app/expense/transactions.tsx`
- [x] **P2** — Transport screens migrated to `ConfirmModal` (v2.2.0)
  - Fixed in: `routes.tsx`, `route-stops.tsx`, `vehicles.tsx`, `trips.tsx`
- [x] **P2** — Remaining transport + fees + students + parents screens migrated to `ConfirmModal` / `showError` (v2.4.0)
  - Transport: `pricing.tsx`, `student-transport.tsx`, `student-trips.tsx` — delete confirms → `ConfirmModal`; validation errors → `showError`
  - Fees: `terms.tsx`, `types.tsx`, `class-mappings.tsx`, `student-mappings.tsx`, `refunds.tsx`, `term-amounts.tsx`, `reports.tsx` — all `Alert.alert` replaced
  - Students: `transport.tsx` — validation errors → `showError`
  - Parents: `index.tsx` — stub `Alert` calls removed
  - Communication: `(tabs)/communication.tsx` — deactivate confirm uses `ConfirmModal`; send errors use `showError`
- [ ] **P2** — Still using `Alert.alert()` (exam, masters, staff, admin screens — not yet migrated):
  - Exam: `board-patterns.tsx`, `dates.tsx`, `grade-schemes.tsx`, `hall-tickets.tsx`, `permissions.tsx`, `remark-sets.tsx`, `[id].tsx`, `results.tsx`
  - Masters: `classesandsections.tsx`, `locations.tsx`, `rolespermissions.tsx`
  - Staff: `enrollment.tsx`
  - Students: `admission.tsx`, `studentcertificates.tsx`
  - Admin: `menu.tsx`

### Silent Error Handling

- [ ] **P1** — Many screens show toast only for errors — web shows inline error boxes that persist until dismissed
- [ ] **P1** — 401 errors: mobile should redirect to login — verify all screens handle token expiry
- [ ] **P1** — 422 (FastAPI validation): mobile `src/api/client.ts` extracts detail — verify all `onError` callbacks display it
- [ ] **P2** — 500 errors: mobile should show generic "Something went wrong" — verify not showing blank screen
- [ ] **P2** — Network offline: no offline detection or message shown

### After-Action Refresh

- [x] **P1** — Transport mutations (routes, route-stops, vehicles, trips) missing `queryClient.invalidateQueries` — list never refreshed after CRUD
  - Fixed: Added `onSuccess` cache invalidation to all 12 transport mutations in `hooks/use-transport.ts`
- [ ] **P2** — Other modules: verify all mutations invalidate the correct query keys

### Auth & Permissions

- [ ] **P2** — Verify all mobile screens use permission guards matching web's resource/action pairs
- [ ] **P2** — Verify token refresh works correctly across all API calls

---

## SUMMARY STATISTICS

| Priority | Total | Fixed | Remaining |
| -------- | ----- | ----- | --------- |
| **P0** | 4 | 3 | 1 (expense audit) |
| **P1** | 16 | 5 | 11 |
| **P2** | 40 | 8 | 32 |
| **P3** | 18 | 0 | 18 |
| **TOTAL** | **78** | **16** | **62** |

---

## COMPLETED FIXES LOG

| # | Date | Fix | Files |
| - | ---- | --- | ----- |
| 1 | 2026-04-03 | Transport Routes: dynamic route/trip types + picker modals + create type on-the-fly | `app/transport/routes.tsx`, `hooks/use-transport.ts`, `src/api/transportTypes.ts`, `src/types/transport.ts`, `src/api/masters.ts` |
| 2 | 2026-04-03 | Expense Line Items: full itemized expense calculator in create screen | `app/expense/transactions/create.tsx`, `src/types/expense.ts` |
| 3 | 2026-04-03 | Transport Pricing: full schema alignment — types, API, hooks, screen rewrite | `src/types/transport.ts`, `src/api/masters.ts`, `hooks/use-transport.ts`, `app/transport/pricing.tsx` |
| 4 | 2026-04-03 | In-app ConfirmModal: replaced `window.confirm()` in 3 expense screens | `components/ConfirmModal.tsx`, `app/expense/types.tsx`, `app/expense/categories.tsx`, `app/expense/transactions.tsx` |
| 5 | 2026-04-03 | Masters Hub Alignment: removed Locations, Roles & Permissions, Parents (not in web) | `app/(tabs)/masters.tsx` |
| 6 | 2026-04-04 | Transport cache invalidation: all 12 mutations (routes, route-stops, vehicles, trips) now invalidate query cache on success | `hooks/use-transport.ts` |
| 7 | 2026-04-04 | Transport ConfirmModal: replaced `window.confirm()` / `Alert.alert()` in 4 transport screens | `app/transport/routes.tsx`, `app/transport/route-stops.tsx`, `app/transport/vehicles.tsx`, `app/transport/trips.tsx` |
| 8 | 2026-04-04 | Cancel button dark-mode fix: replaced hardcoded `#F3F4F6` bg with `colors.primary` in route-stops and trips modals | `app/transport/route-stops.tsx`, `app/transport/trips.tsx` |
| 9 | 2026-04-04 | Trips edit driver fix: `trip.driver_id ?? ''` guards against null driver_id causing dropdown to receive null value | `app/transport/trips.tsx` |

---

## TOP REMAINING FIXES (ordered by impact)

1. ~~**Transport Pricing Schema**~~ DONE
2. ~~**Expense Line Items**~~ DONE
3. **Expense Audit Page** — Build audit trail screen for mobile (P0)
4. **Fee Reports Dropdowns** — Replace UUID text inputs with class/section pickers (P1)
5. **Fee Receipts Download** — Add receipt download/export capability (P1)
6. **Exam Create Missing Fields** — Add term, publish_rank, attendance dates, min attendance (P1)
7. **Class-Subject Mappings Edit** — Add inline editing for exclude_marks, order, is_active (P1)
8. **Staff Attendance Search** — Add search/filter by name for large organizations (P1)
9. **Fee Refund Cancel** — Replace delete with proper cancel workflow (P1)
10. **Student Attendance Remarks** — Add remarks field to staff marking view (P1)
11. **window.confirm Replacement** — Apply ConfirmModal to remaining ~19 screens (P2)
