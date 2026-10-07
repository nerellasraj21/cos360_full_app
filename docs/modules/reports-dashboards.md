# Reports & Dashboards
Cross-module reporting endpoints with CSV/XLSX/PDF export, plus the home dashboard and the menu-driven module hub pages on web and mobile.
_Last verified against code: 2026-10-07_
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
- **Report response shape** (`ReportResponse`): `{data: [...], total_count, page, page_size, total_pages}`. Pagination uses `page` (>= 1) and `page_size` (1 to 1000, default 100); `sort_order` is `asc` or `desc`. Values outside those bounds are a 422 on every group. Dates are filtered with `date_from` and `date_to`.
- **Export routing**:
  - Every export ignores `page` and `page_size` in its filters and returns every matching row (`BaseReportService.fetch_all_rows`).
  - Every export builds the whole file in memory and returns it in the response body, whatever its size.
  - The request body is `ExportRequest` `{report_type, filters, format, filename?}`. A `format` other than `csv|xlsx|pdf` is a 422; an unknown `report_type` for the group is a 400.
  - The background path (`should_use_background_job` thresholds, `create_background_export_job`, `app/tasks/report_tasks.py`) is not called by any endpoint. See gaps before re-enabling it.
- **Permissions**: each group checks `<group>_reports:read` or `:export` (`student_reports`, `staff_reports`, `fee_reports`, `attendance_reports`, `financial_reports`). The audit and download endpoints check `reports:read`. Attendance, fee and financial read endpoints skip the check for `is_superadmin` tokens.
- **Web home dashboard** (`/_app/dashboard`, where `/` redirects): a welcome header plus one card per top-level entry of the processed menu (`useMenuData()`, Dashboard excluded). Cards navigate with `getModuleUrl(name)`; descriptions come from a hard-coded `descriptionMap` keyed by menu name.
- **Module hubs** (web `/admin`, `/masters`, `/reports`, `/students`, `/transport`; mobile hubs for masters and reports):
  - Each web hub shows one card per child of that module's node in the **backend menu**. A card navigates if the menu item has a path, and is greyed out if it doesn't. Card descriptions come from a hard-coded `descriptionMap` keyed by menu name.
  - The web Reports hub falls back to Fee Reports (`fee_reports:read`) and Expense Reports (`expense_reports:read`) cards when the Reports menu node has no children.
  - Mobile Masters uses the menu children and falls back to a permission-gated list only while the menu has none. The mobile Reports tab shows the union of a permission-gated list and the menu children that have a path.
- **Mobile home dashboard** (`app/(tabs)/index.tsx`):
  - A greeting hero card, then a grid of module cards.
  - The cards are the **union** of what the user's permissions entitle them to (a static `MODULES` registry with `resource(s)`, `alwaysShow` and `hideForRoles`) and any top-level backend menu entries.
  - Cards follow the web sidebar order.
  - If no card is visible, a lock empty-state is shown.

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Endpoints | `backend/app/api/v1/reports/` (`student_reports`, `staff_reports`, `fee_reports`, `attendance_reports`, `financial_reports`, `reports.py` for audit/download) | - | - |
| Services | `backend/app/service/reports/` (`base_report_service.py` holds export generation, `fetch_all_rows`, the thresholds and the background job) | - | - |
| Jobs / models | `backend/app/tasks/report_tasks.py`, `backend/app/celery_app.py`, `backend/app/models/reports/report_audit.py` (platform table) | - | - |
| Schemas / types | `backend/app/schemas/reports/` | `web/src/types/` (fee and staff-attendance report types) | inline in `mobile/src/api/fees.ts` and `staff.ts` |
| API calls | - | `web/src/api/staff/attendance.ts` (`/reports/attendance/staff*`), `web/src/constants/api/fee.ts` (`FEE_REPORTS_BASE`) | `feeReportsApi` in `mobile/src/api/fees.ts`, `staffAttendanceReportsApi` in `mobile/src/api/staff.ts` |
| Hubs / dashboards | - | `web/src/routes/_app/{admin,masters,reports,students,transport}/index.tsx`, `web/src/routes/_app/dashboard.tsx`, `getIconForMenuItem` and `getModuleUrl` in `web/src/components/ui/sidebar.tsx`, `web/src/lib/menuUtils.ts` | `mobile/app/(tabs)/index.tsx`, `(tabs)/masters.tsx`, `(tabs)/reports.tsx`, `mobile/src/lib/menuUtils.ts` (`roleTopLevelMenu`, `menuChildrenFor`), `mobile/components/navigation/menuMap.ts` |
| Report screens | - | none for student, staff or financial reports (fee reports are under `/fee/reports`) | `mobile/app/reports/` (`student-`, `staff-`, `fee-`, `academic-`, `transport-reports.tsx`) |

Endpoint prefixes (under `/api/v1`, mounted in `backend/app/api/v1/main_router.py`):
- `/reports/students`: `summary`, `details/{student_id}`, `export`.
- `/reports/staff`: `summary`, `details/{staff_id}`, `export`.
- `/reports/fees`: `collection-summary[/stats]`, `pending-fees[/stats]`, `fee-structure[/stats]`, `export`.
- `/reports/attendance`: `students[/stats]`, `staff[/stats]`, `export`.
- `/reports/financial`: `expenditure`, `ledger`, `summary`, `export`.
- `/reports`: `audit`, `audit/{audit_id}`, `download/{audit_id}`.

## Rules & gotchas
1. **Hubs are only as complete as the seeded menu.** A report or master screen that exists in code but has no child entry in the tenant's menu does not appear on web hubs (the Reports hub fallback covers only fee and expense reports). On mobile it appears only if it is also in that hub's fallback or permission list. Seed the menu when you add a section; the demo catalog (`backend/scripts/seed_demo_catalog.py`) gives Reports no children.
2. **Web hubs read raw `authStore.menuItems`; the sidebar and the home dashboard read the processed `useMenuData()`.** The processed menu adds role filtering, the injected Fee submenu, "School Registration" under Masters, and canonical ordering. So a hub card list can differ from the sidebar.
3. **Staff attendance report contract.** Query params are `date_from`, `date_to`, `page`, `page_size` (max 1000); rows come back in `data` with `attendance_status`; `/stats` nests counts in `summary_stats` with `attendance_percentage`. Web `api/staff/attendance.ts` and mobile `staffAttendanceReportsApi` (typed `StaffAttendanceReportRow` / `StaffAttendanceStats` in `mobile/src/api/staff.ts`) follow it. Mobile `staffAttendanceReportsApi.exportReport` posts an `ExportRequest` with `report_type: staff_attendance`; no screen calls it, because `app/reports/staff-reports.tsx` builds its CSV from the rows on screen.
4. **Mobile "Academic", "Transport" and "Student" reports are client-side aggregations** of normal list APIs: exams, routes/vehicles/trips, and `/student/attendance/search`. There is no `/reports/academic` or `/reports/transport` backend, so don't build web pages expecting one. The mobile Fee and Staff report screens call the real `/reports/fees` and `/reports/attendance/staff` endpoints.
5. **The tenant id comes from the request.** Every report endpoint uses `get_tenant_id_from_request(request)`. `report_audit` is a platform table without row-level security, so `ReportAudit.tenant_id` stores that UUID as a string and the audit, detail and download endpoints filter on `user_id` and `tenant_id` explicitly. Any new query on it must do the same.
6. **Exports are not audited.** Only the unused background path writes `report_audit`, so `/reports/audit` and `/reports/download/{id}` have nothing to return.
7. **There is no file retention or PII masking in code**, even though older docs claim a "7-day cleanup" and "role-based masking".
8. **Export filenames are not sanitised.** `filename` from the request goes into `Content-Disposition: attachment; filename=<name>.<ext>` unquoted.
9. **Mobile has two report hubs.** `app/(tabs)/reports.tsx` merges the menu with the permission list. `app/reports/index.tsx` is permission-only. The menu `/reports` path maps to the tab version.
10. **Financial totals count only money that moved.** Summary and ledger exclude expenses with status `rejected`, `cancelled` or `deleted` and include only fee transactions with status `completed`. The ledger casts fee `transaction_date` (TIMESTAMP) to DATE to union it with expense dates. The expenditure list shows every expense.
11. **Some report fields have no source column.** Attendance rows have no timestamp, so `marked_at` is always null; staff have no employee code, so the staff attendance report's `staff_id` is the staff UUID; the expenditure report's `department` falls back to the raw `department_id` when the department row is missing.
12. **Summary filters and joins drop data silently.**
    - Student summary filters only on `academic_year_id`, `class_id`, `section_id` and `address_city`; `gender`, `caste`, `religion` and `student_type` are accepted and ignored. It inner-joins the current section, so an admission without a section is not listed.
    - Staff summary ignores `department_id`, `employment_type` and `subject_id`, and inner-joins designations, so staff without a designation are left out.
    - An unknown `sort_by` is ignored rather than rejected.

## Web / mobile parity
- Web has no pages for student, staff, attendance (outside staff attendance) or financial reports; only the Reports hub exists. Mobile has five report screens.
- Both home dashboards show module cards. Web builds them from the processed menu only; mobile merges the menu with its permission registry.
- Mobile tab visibility in `app/(tabs)/_layout.tsx` is gated by `moduleResources`, for example Masters by `academic_years`, `classes`, `subjects`, `holidays` or `timetables`. Web has no equivalent gate beyond the menu.

## Known gaps
- **Background export is unused and broken.** No endpoint calls it. Before re-enabling it:
  - No Redis or Celery worker is deployed (see [backend deploy](../operations/backend-deploy.md)).
  - `create_background_export_job` calls `log_export_request(..., filename=, user_id=, tenant_id=)`, which doesn't accept those arguments, so it raises `TypeError`.
  - Only `student*` and `staff*` report types have tasks.
  - The tasks call the report once with the request filters instead of `fetch_all_rows`, so they would export only one page (100 rows by default).
  - Files are saved under `exports/<tenant>/` on the worker's own disk, which a separate API container can't serve.
- The financial reports and the student/staff summary reports have no client consumer.
