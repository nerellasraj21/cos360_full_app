# Reports & Dashboards
Cross-module reporting endpoints with CSV/XLSX/PDF export, plus the home dashboard and the menu-driven module hub pages on web and mobile.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/reports-dashboards.md) (source: docs/graph/graph.jsonl).

Module-owned reports are documented with their modules: fee reports in [fee](fee.md), expense reports in [expense](expense.md), and the exam grading dashboard in [exam](exam.md). Staff attendance reports are consumed by the staff attendance page ([staff](staff.md)). For the menu and permission model see [permissions](../permissions.md) and [architecture](../architecture.md).

## What it does
- **Backend reports**:
  - Student summary and details.
  - Staff summary and details.
  - Fee: collection summary, pending fees and fee structure, each with `/stats`.
  - Attendance: student and staff lists, each with `/stats`.
  - Financial: expenditure, ledger and summary.
  - Every group except financial summary has `POST /export`, which returns a file as `csv`, `xlsx` (openpyxl) or `pdf` (reportlab).
- **Report response shape** (`ReportResponse`): `{data: [...], total_count, page, page_size, total_pages}`. Pagination uses `page` and `page_size` (≤1000, default 100). Dates are filtered with `date_from` and `date_to`.
- **Export routing**:
  - Small exports stream straight back as a file download.
  - Large ones (>1000 rows; xlsx >500; pdf >300) are meant to become a Celery job. That job writes a `public.report_audit` row and saves the file under `exports/<tenant>/`, to be fetched later through `/reports/audit/{id}` and `/reports/download/{id}` (see gaps: this path is broken).
- **Permissions**: each group checks `<group>_reports:read` or `:export` (`student_reports`, `staff_reports`, `fee_reports`, `attendance_reports`, `financial_reports`). The audit and download endpoints check `reports:read`. Attendance, fee and financial endpoints skip the check for `is_superadmin` tokens.
- **Web home dashboard** (`/_app/dashboard`, where `/` redirects): currently just a page header, with no widgets.
- **Module hubs** (web `/admin`, `/masters`, `/reports`, `/students`, `/transport`; mobile hubs for masters and reports):
  - Each hub shows a "Coming Soon" banner plus one card per child of that module's node in the **backend menu**. A card navigates if the menu item has a path, and is greyed out if it doesn't.
  - Card descriptions come from a hard-coded `descriptionMap` keyed by menu name.
- **Mobile home dashboard** (`app/(tabs)/index.tsx`):
  - A greeting hero card, then a grid of module cards.
  - The cards are the **union** of what the user's permissions entitle them to (a static `MODULES` registry with `resource(s)`, `alwaysShow` and `hideForRoles`) and any top-level backend menu entries.
  - Cards follow the web sidebar order.
  - If no card is visible, a lock empty-state is shown.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints | `backend/app/api/v1/reports/` (`student_reports`, `staff_reports`, `fee_reports`, `attendance_reports`, `financial_reports`, `reports.py` for audit/download) | — | — |
| Services | `backend/app/service/reports/` (`base_report_service.py` holds export generation, the thresholds and the background job) | — | — |
| Jobs / models | `backend/app/tasks/report_tasks.py`, `backend/app/celery_app.py`, `backend/app/models/reports/report_audit.py` (public schema) | — | — |
| Schemas / types | `backend/app/schemas/reports/` | `web/src/types/` (fee and staff-attendance report types) | inline in `mobile/src/api/fees.ts` and `staff.ts` |
| API calls | — | `web/src/api/staff/attendance.ts` (`/reports/attendance/staff*`), `web/src/constants/api/fee.ts` (`FEE_REPORTS_BASE`) | `feeReportsApi` in `mobile/src/api/fees.ts`, `staffAttendanceReportsApi` in `mobile/src/api/staff.ts` |
| Hubs / dashboards | — | `web/src/routes/_app/{admin,masters,reports,students,transport}/index.tsx`, `web/src/routes/_app/dashboard.tsx`, `getIconForMenuItem` in `web/src/components/ui/sidebar.tsx`, `web/src/lib/menuUtils.ts` | `mobile/app/(tabs)/index.tsx`, `(tabs)/masters.tsx`, `(tabs)/reports.tsx`, `mobile/src/lib/menuUtils.ts`, `mobile/components/navigation/menuMap.ts` |
| Report screens | — | none for student, staff or financial reports (fee reports are under `/fee/reports`) | `mobile/app/reports/` (`student-`, `staff-`, `fee-`, `academic-`, `transport-reports.tsx`) |

Endpoint prefixes (under `/api/v1`, mounted in `backend/app/api/v1/main_router.py`):
- `/reports/students`: `summary`, `details/{student_id}`, `export`.
- `/reports/staff`: `summary`, `details/{staff_id}`, `export`.
- `/reports/fees`: `collection-summary[/stats]`, `pending-fees[/stats]`, `fee-structure[/stats]`, `export`.
- `/reports/attendance`: `students[/stats]`, `staff[/stats]`, `export`.
- `/reports/financial`: `expenditure`, `ledger`, `summary`, `export`.
- `/reports`: `audit`, `audit/{audit_id}`, `download/{audit_id}`.

## Rules & gotchas
1. **Hubs are only as complete as the seeded menu.** A report or master screen that exists in code but has no child entry in the tenant's `menus` table does not appear on web hubs. It appears on mobile only if it is also in that hub's fallback or permission list. Seed the menu when you add a section.
2. **Web hubs read raw `authStore.menuItems`, and the sidebar reads the processed `useMenuData()`.** The processed menu adds role filtering, the injected Fee submenu, "School Registration" under Masters, and canonical ordering. So a hub card list can differ from the sidebar.
3. **Staff attendance report contract.** Query params are `date_from`, `date_to`, `page`, `page_size` (max 1000); rows come back in `data` with `attendance_status`; `/stats` nests counts in `summary_stats` with `attendance_percentage`. Web `api/staff/attendance.ts` and mobile `staffAttendanceReportsApi` (typed `StaffAttendanceReportRow` / `StaffAttendanceStats` in `mobile/src/api/staff.ts`) follow it. Mobile `staffAttendanceReportsApi.exportReport` still posts `{start_date, end_date, format}` instead of an `ExportRequest`; no screen calls it.
4. **Mobile fee reports call `/reports/fee/*` and `/structure`**, which return 404. The real paths are `/reports/fees/*` and `/fee-structure`. See [fee](fee.md).
5. **Mobile "Academic", "Transport" and "Student" reports are client-side aggregations** of normal list APIs: exams, routes/vehicles/trips, and `/student/attendance/search`. There is no `/reports/academic` or `/reports/transport` backend, so don't build web pages expecting one.
6. **Student and staff report endpoints return 500 for permission failures.** They use a bare `except Exception` that swallows the `HTTPException(403)`, so a 403 comes back as a 500 "Internal server error". `GET /reports/audit` has the same problem. Fee, attendance and financial endpoints re-raise `HTTPException` correctly.
7. **Tenant ID is derived two ways.** Student, staff, audit and download endpoints read `request.state.schema_name`. The only middleware that sets it (`app/middleware/middleware.py`) is not registered, so the value is `None`. Attendance, fee and financial endpoints use `TenantService.get_tenant_schema(request.state.client_name)`, which is correct. Use the second pattern.
8. **Synchronous exports are not audited.** Only the background path writes `report_audit`, so `/reports/audit` does not show normal downloads.
9. **There is no file retention or PII masking in code**, even though older docs claim a "7-day cleanup" and "role-based masking".
10. **Mobile has two report hubs.** `app/(tabs)/reports.tsx` merges the menu with the permission list. `app/reports/index.tsx` is permission-only. The menu `/reports` path maps to the tab version.
11. **Financial totals count only money that moved.** Summary and ledger exclude expenses with status `rejected`, `cancelled` or `deleted` and include only fee transactions with status `completed`. The ledger casts fee `transaction_date` (TIMESTAMP) to DATE to union it with expense dates. The expenditure list shows every expense.
12. **Some report fields have no source column.** Attendance rows have no timestamp, so `marked_at` is always null; staff have no employee code, so the staff attendance report's `staff_id` is the staff UUID; the expenditure report's `department` is the raw `department_id` because no tenant schema has an `expense_departments` table.

## Web / mobile parity
- Web has no pages for student, staff, attendance (outside staff attendance) or financial reports; only the Reports hub exists. Mobile has five report screens (the fee screen is broken, see rule 4).
- The mobile home dashboard has module cards. The web home dashboard is empty, and web users navigate through the sidebar and module hubs.
- Mobile tab visibility in `app/(tabs)/_layout.tsx` is gated by `moduleResources`, for example Masters by `academic_years`, `classes`, `subjects`, `holidays` or `timetables`. Web has no equivalent gate beyond the menu.

## Known gaps
- **Background export is broken.**
  - `create_background_export_job` calls `log_export_request(..., filename=, user_id=, tenant_id=)`, but that method doesn't accept those arguments, so the call raises a `TypeError` and the export returns 500. As a result, any export over the thresholds fails.
  - Only `student*` and `staff*` report types have Celery tasks; fee, attendance and financial types raise `ValueError`.
  - The response advertises `status_endpoint: /api/v1/reports/export-status/{id}`, which doesn't exist. The real route is `/reports/audit/{id}`.
- The financial reports and the student/staff summary reports have no client consumer.
- The web home dashboard has no content.
