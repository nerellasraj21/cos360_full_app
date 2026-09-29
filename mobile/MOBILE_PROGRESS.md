# COS360 Mobile App — Implementation Progress

> React Native (Expo) hybrid app (Android + iOS) backed by the COS360 FastAPI school management system.
> All API calls include `Authorization: Bearer <token>` and `cschema: <tenant>` headers (set in `src/api/client.ts`).

---

## Backend Discovery Summary

Discovered from `main_router.py` — all 80+ registered routers organized into modules:

| Module | Backend File(s) | API Prefix |
|---|---|---|
| Auth / Login | `login_endpoints.py` | `/auth` |
| Menus & Permissions | `menu_endpoints.py`, `permissions_endpoints.py`, `resource_permission_endpoints.py` | `/auth` |
| Roles | `role_endpoints.py` | `/auth` |
| Academic Years | `academic_year_routes.py` | `/academic-years` |
| Classes & Sections | `class_endpoints.py`, `class_subject_mapping_endpoints.py` | `/classes` |
| Subjects | `subject_routes.py`, `subject_category_endpoints.py` | `/subjects` |
| Holidays | `holiday_endpoints.py` | `/holidays` |
| Timetable | `timetable_routes.py` | `/timetable` |
| Student Admissions | `admission_endpoints.py` | `/students/admission` |
| Student Attendance | `attendance_endpoints.py` | `/student/attendance` |
| Student Documents | `student_document_endpoints.py` | `/students/documents` |
| Student Certificates | `certificate_endpoints.py`, `certificate_type_endpoints.py`, `issuable_certificate_endpoints.py` | `/certificates` |
| Student Transport | `student_transport_endpoints.py` | `/student-transport` |
| Student–Parent Link | `student_parent_endpoints.py` | `/student-parent` |
| Parent Masters | `parent_endpoints.py` | `/parents` |
| Staff Masters | `staff_profile_endpoints.py` | `/profile/staff` |
| Fee Categories | `fee_category_endpoints.py` | `/fee/categories` |
| Fee Types | `fee_type_endpoints.py` | `/fee/types` |
| Fee Terms | `fee_term_endpoints.py` | `/fee/terms` |
| Fee Class Mappings | `fee_class_mapping_endpoints.py`, `fee_class_map_term_amount_endpoints.py` | `/fee/class-mappings` |
| Fee Student Mappings | `fee_student_mapping_endpoints.py` | `/fee/student-mappings` |
| Fee Transactions | `fee_transaction_endpoints.py` | `/fee/transactions` |
| Fee Receipts | `fee_receipt_endpoints.py` | `/fee/receipts` |
| Fee Refunds | `fee_refund_endpoints.py` | `/fee/refunds` |
| Fee Collection | `fee_collection_endpoints.py` | `/fee/collection` |
| Fee Concessions | `fee_concession_endpoints.py` | `/fee/concessions` |
| Expense Categories | `expense_category_endpoints.py` | `/expenses/categories` |
| Expense Types | `expense_type_endpoints.py` | `/expenses/types` |
| Expense Transactions | `expense_transaction_endpoints.py` | `/expenses/transactions` |
| Expense Summary | `expense_summary_endpoints.py` | `/expenses/summary` |
| Expense Reporting | `expense_reporting_endpoints.py` | `/expenses/reports` |
| Exam Settings | `exam_settings_endpoints.py` | `/exam/settings` |
| Exams | `exam_pattern_endpoints.py` | `/exams` |
| Exam Dates | `exam_date_endpoints.py` | `/exam/dates` |
| Grading | `grading_endpoints.py`, `remark_grade_endpoints.py` | `/exam/grading` |
| Mark Entry | `mark_entry_endpoints.py`, `mark_permission_endpoints.py` | `/exam/marks` |
| Hall Tickets | `hall_ticket_endpoints.py` | `/exam/hall-tickets` |
| Exam Results | (results endpoints) | `/exam/results` |
| Communication | `communication_endpoints.py` | `/communication` |
| Transport Routes | `route_type_endpoints.py`, `route_stop_endpoints.py` | `/transport` |
| Vehicles | `vehicle_endpoints.py` | `/transport/vehicles` |
| Trips | `trip_endpoints.py`, `trip_type_endpoints.py` | `/transport/trips` |
| Transport Pricing | `transport_pricing_endpoints.py` | `/transport/pricing` |
| Reports | `attendance_reports.py`, `fee_reports.py`, `financial_reports.py`, `staff_reports.py`, `student_reports.py` | `/reports/*` |
| Profile | `student_profile_endpoints.py`, `parent_profile_endpoints.py`, `staff_profile_endpoints.py`, `profile_endpoints.py` | `/profile/*` |
| Admin User Mgmt | `user_management_endpoints.py`, `permission_endpoints.py` | `/admin/*` |
| Public Org Info | `org_routes.py` | `/org` |

---

## Authentication Flow

**Endpoints used:**

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/auth/academic-years` | Fetch academic years for login screen (public) |
| `POST` | `/auth/login` | Multi-tenant login → returns `LoginResponse` (JWT access + refresh, user, role, permissions, menu) |
| `POST` | `/auth/staff/set-password` | First-time staff password set (requires `change_password_token`) |
| `POST` | `/auth/refresh` | Refresh access token using refresh token |
| `POST` | `/auth/logout` | Blacklist tokens server-side |
| `POST` | `/profile/change-password` | Change password for any authenticated user |

**JWT Details:**
- Access token in `Authorization: Bearer` header
- Tenant identified via `cschema` header on every request
- Refresh handled automatically in `src/api/client.ts` response interceptor
- Tokens stored in `AsyncStorage` with keys `@auth/access_token`, `@auth/refresh_token`
- `academic_year_id` embedded in JWT payload

**Status: ✅ DONE**

Files:
- [`app/login.tsx`](app/login.tsx) — org selection + login form + academic year picker
- [`app/set-password.tsx`](app/set-password.tsx) — first-time password change flow
- [`app/forgot-password.tsx`](app/forgot-password.tsx) — forgot password UI
- [`services/authUtils.ts`](services/authUtils.ts) — token storage, login/logout service
- [`src/api/client.ts`](src/api/client.ts) — axios client with `cschema` header + token refresh interceptor
- [`contexts/AuthContext.tsx`](contexts/AuthContext.tsx) — global auth state (user, role, permissions, selectedStudent)

---

## Role-Based Navigation

Three roles supported: **Student**, **Parent**, **Admin/Staff**

| Role | Tab Behaviour |
|---|---|
| Student | Sees "My Portal" in Students tab with personal quick-links |
| Parent | Sees "Child Portal" in Students tab; child selected via `selectedStudent` context |
| Admin/Staff | Sees full admin grid in Students tab + all management tabs |

**Status: ✅ DONE**

Files:
- [`app/(tabs)/_layout.tsx`](app/(tabs)/_layout.tsx) — permission-gated tab visibility
- [`app/(tabs)/index.tsx`](app/(tabs)/index.tsx) — home dashboard (role-aware module grid)
- [`app/(tabs)/students.tsx`](app/(tabs)/students.tsx) — role-differentiated student/parent vs admin view
- [`app/(tabs)/fees.tsx`](app/(tabs)/fees.tsx) — role-differentiated fees view

---

## Student Documents

**Endpoints used:**

| Method | Path | Purpose | Role |
|---|---|---|---|
| `GET` | `/students/documents/?student_id={id}` | List student documents | Admin/Staff |
| `GET` | `/students/documents/all?student_id={id}` | All docs + certs + receipts | All |
| `GET` | `/students/documents/{id}` | Get single document | All |
| `POST` | `/students/documents/` | Upload document (multipart) | Admin |
| `PATCH` | `/students/documents/{id}` | Update document | Admin |
| `DELETE` | `/students/documents/{id}` | Delete document | Admin |

**Status: ✅ DONE**

Files:
- [`app/students/mydocuments.tsx`](app/students/mydocuments.tsx) — Student/Parent view own documents + upload
- [`app/students/studentdocuments.tsx`](app/students/studentdocuments.tsx) — Admin: all documents for a student
- [`app/students/documentupload.tsx`](app/students/documentupload.tsx) — Admin upload form
- [`src/api/hooks/students/documents.ts`](src/api/hooks/students/documents.ts) — React Query hooks

---

## Student Certificates

**Endpoints used:**

| Method | Path | Purpose | Role |
|---|---|---|---|
| `GET` | `/certificates/my` | Student's own certificates | Student |
| `GET` | `/certificates/my-child/{student_id}` | Child's certificates | Parent |
| `GET` | `/certificates/by-student/{student_id}` | All certs for student | Admin |
| `GET` | `/certificates/{id}/download` | Presigned S3 download URL | All |
| `POST` | `/certificates/received` | Upload received document | Admin |
| `POST` | `/certificates/issued` | Issue school certificate | Admin |
| `DELETE` | `/certificates/{id}` | Delete certificate | Admin |

**Status: ✅ DONE**

Files:
- [`app/students/mycertificates.tsx`](app/students/mycertificates.tsx) — Student/Parent view + download
- [`app/students/studentcertificates.tsx`](app/students/studentcertificates.tsx) — Admin: view/manage all
- [`app/students/certificateupload.tsx`](app/students/certificateupload.tsx) — Admin: issue/upload cert
- [`app/students/certificatetypes.tsx`](app/students/certificatetypes.tsx) — Admin: manage cert types
- [`src/api/hooks/students/certificates.ts`](src/api/hooks/students/certificates.ts) — React Query hooks

---

## Fee Receipts

**Endpoints used:**

| Method | Path | Purpose | Role |
|---|---|---|---|
| `GET` | `/fee/receipts/my-receipts` | Student's own receipts | Student |
| `GET` | `/fee/receipts/` | All receipts (admin search) | Admin |
| `GET` | `/fee/receipts/{id}` | Single receipt by ID | Admin |
| `GET` | `/fee/receipts/{id}/content` | Full receipt content for PDF | Admin |
| `POST` | `/fee/receipts/generate/{transaction_id}` | Generate receipt for transaction | Admin |
| `POST` | `/fee/receipts/{id}/reprint` | Mark as reprinted | Admin |
| `GET` | `/fee/receipts/{id}/verify` | Verify integrity (hash) | Admin |

**Status: ✅ DONE** (admin view) / ✅ DONE (student own receipts — `my-receipts` endpoint wired)

Files:
- [`app/fees/receipts.tsx`](app/fees/receipts.tsx) — Role-aware: student sees own via `my-receipts`, admin sees all
- [`src/api/fees.ts`](src/api/fees.ts) — `feeReceiptsApi.getMyReceipts()` + full admin API

---

## Fee Collection (Admin + Student/Parent)

**Endpoints used:**

| Method | Path | Purpose | Role |
|---|---|---|---|
| `GET` | `/fee/collection/search-student` | Search student for fee collection | Admin |
| `GET` | `/fee/collection/summary/{student_id}` | Fee summary by student | Admin |
| `GET` | `/fee/collection/my-summary` | Own fee summary | Student |
| `GET` | `/fee/collection/child-summary/{student_id}` | Child fee summary | Parent |
| `GET` | `/fee/collection/terms-due/{student_id}` | Overdue terms | Admin |
| `POST` | `/fee/collection/pay` | Process fee payment | Admin |
| `POST` | `/fee/collection/receipts/{id}/pdf` | Download PDF receipt | Admin |

**Status: ✅ DONE**

Files:
- [`app/fees/collection.tsx`](app/fees/collection.tsx) — Full fee collection: admin search+pay, student/parent own summary
- [`src/api/fees.ts`](src/api/fees.ts) — `feeCollectionApi.*`

---

## Student Attendance

**Endpoints used:**

| Method | Path | Purpose | Role |
|---|---|---|---|
| `GET` | `/student/attendance/my-attendance?start_date=&end_date=` | Own attendance in date range | Student |
| `GET` | `/student/attendance/student/{id}/filter` | Filtered attendance for student | Admin |
| `GET` | `/student/attendance/search` | All attendance with filters | Admin |
| `POST` | `/student/attendance/` | Create attendance record | Admin |
| `PATCH` | `/student/attendance/by-date/{date}` | Bulk update attendance for date | Admin |

**Status: ✅ DONE**

Files:
- [`app/students/attendance.tsx`](app/students/attendance.tsx) — Role-aware attendance (own for student, admin CRUD view)
- [`src/api/hooks/students/attendance.ts`](src/api/hooks/students/attendance.ts) — React Query hooks

---

## Profile

**Endpoints used:**

| Method | Path | Purpose | Role |
|---|---|---|---|
| `GET` | `/profile/student/me` | Student profile | Student |
| `PUT` | `/profile/student/me` | Update student profile (email only) | Student |
| `GET` | `/profile/parent/me` | Parent profile + children list | Parent |
| `PUT` | `/profile/parent/me` | Update parent profile (email, phone, occupation) | Parent |
| `GET` | `/profile/staff/me` | Staff profile | Staff/Admin |
| `PUT` | `/profile/staff/me` | Update staff profile (email, phone) | Staff/Admin |
| `POST` | `/profile/change-password` | Change password | All |

**Status: ✅ DONE**

Files:
- [`app/profile.tsx`](app/profile.tsx) — Role-aware profile screen (student/parent/staff views)
- [`src/api/hooks/profile/`](src/api/hooks/profile/) — React Query hooks per role
- [`src/api/profile.ts`](src/api/profile.ts) — Profile API calls

---

## Fee Management (Admin)

**Status: ✅ DONE**

| Screen | Backend Endpoint | File |
|---|---|---|
| Fee Categories | `GET/POST/PUT/DELETE /fee/categories` | [`app/fees/categories.tsx`](app/fees/categories.tsx) |
| Fee Types | `GET/POST/PUT/DELETE /fee/types` | [`app/fees/types.tsx`](app/fees/types.tsx) |
| Fee Terms | `GET/POST/PUT/DELETE /fee/terms` | [`app/fees/terms.tsx`](app/fees/terms.tsx) |
| Fee Class Mappings | `GET/POST /fee/class-mappings` | [`app/fees/class-mappings.tsx`](app/fees/class-mappings.tsx) |
| Fee Term Amounts | `GET/POST /fee/class-mappings/term-amounts` | [`app/fees/term-amounts.tsx`](app/fees/term-amounts.tsx) |
| Fee Student Mappings | `GET/POST /fee/student-mappings` | [`app/fees/student-mappings.tsx`](app/fees/student-mappings.tsx) |
| Fee Transactions | `GET/POST /fee/transactions` | [`app/fees/transactions.tsx`](app/fees/transactions.tsx) |
| Fee Receipts | `GET /fee/receipts` | [`app/fees/receipts.tsx`](app/fees/receipts.tsx) |
| Fee Refunds | `GET/POST/PATCH /fee/refunds` | [`app/fees/refunds.tsx`](app/fees/refunds.tsx) |
| Fee Reports | `GET /reports/fees/*` | [`app/fees/reports.tsx`](app/fees/reports.tsx) |

---

## Exam Module (Admin/Staff)

**Status: ✅ DONE**

| Screen | File |
|---|---|
| Exam list + create | [`app/exam/list.tsx`](app/exam/list.tsx), [`app/exam/create.tsx`](app/exam/create.tsx) |
| Exam settings | [`app/exam/settings.tsx`](app/exam/settings.tsx) |
| Grading schemes | [`app/exam/grading.tsx`](app/exam/grading.tsx), [`app/exam/grade-schemes.tsx`](app/exam/grade-schemes.tsx) |
| Board patterns | [`app/exam/board-patterns.tsx`](app/exam/board-patterns.tsx) |
| Exam dates | [`app/exam/dates.tsx`](app/exam/dates.tsx) |
| Mark entry | [`app/exam/marks.tsx`](app/exam/marks.tsx) |
| Mark permissions | [`app/exam/permissions.tsx`](app/exam/permissions.tsx) |
| Exam results | [`app/exam/results.tsx`](app/exam/results.tsx) |
| Hall tickets | [`app/exam/hall-tickets.tsx`](app/exam/hall-tickets.tsx) |
| Remark sets | [`app/exam/remark-sets.tsx`](app/exam/remark-sets.tsx) |
| Notifications | [`app/exam/notify.tsx`](app/exam/notify.tsx) |
| Audit log | [`app/exam/audit.tsx`](app/exam/audit.tsx) |
| My marks (student) | [`app/exam/my-marks/index.tsx`](app/exam/my-marks/index.tsx), [`app/exam/my-marks/[examId].tsx`](app/exam/my-marks/[examId].tsx) |

---

## Expense Module (Admin)

**Status: ✅ DONE**

| Screen | File |
|---|---|
| Expense categories | [`app/expense/categories.tsx`](app/expense/categories.tsx) |
| Expense types | [`app/expense/types.tsx`](app/expense/types.tsx) |
| Expense transactions | [`app/expense/transactions.tsx`](app/expense/transactions.tsx) |
| Expense summary | [`app/expense/summary.tsx`](app/expense/summary.tsx) |
| Expense reports | [`app/expense/reports.tsx`](app/expense/reports.tsx) |
| Expense settings | [`app/expense/settings.tsx`](app/expense/settings.tsx) |
| Expense audit | [`app/expense/audit.tsx`](app/expense/audit.tsx) |

---

## Communication Module (Admin)

**Endpoints used:** `GET/POST /communication/templates`, `POST /communication/send`, `GET /communication/logs`

**Status: ✅ DONE**

Files: [`app/(tabs)/communication.tsx`](app/(tabs)/communication.tsx)

---

## Admin Module

**Status: ✅ DONE**

| Screen | Endpoint | File |
|---|---|---|
| User management | `GET/POST/PUT/DELETE /admin/users` | [`app/admin/users.tsx`](app/admin/users.tsx) |
| Roles | `GET/POST/PUT/DELETE /auth/roles` | [`app/admin/roles.tsx`](app/admin/roles.tsx) |
| Permissions | `GET/POST /auth/permissions` | [`app/admin/permissions.tsx`](app/admin/permissions.tsx) |
| Menu management | `GET/POST/PUT/DELETE /auth/menus` | [`app/admin/menu.tsx`](app/admin/menu.tsx) |

---

## Masters Module (Admin)

**Status: ✅ DONE**

| Screen | File |
|---|---|
| Academic years | [`app/masters/academicyears.tsx`](app/masters/academicyears.tsx) |
| Classes & sections | [`app/masters/classesandsections.tsx`](app/masters/classesandsections.tsx) |
| Class–subject mappings | [`app/masters/classsubjectmappings.tsx`](app/masters/classsubjectmappings.tsx) |
| Subjects | [`app/masters/subjects.tsx`](app/masters/subjects.tsx) |
| Subject categories | [`app/masters/subjectcategories.tsx`](app/masters/subjectcategories.tsx) |
| Holidays | [`app/masters/holidays.tsx`](app/masters/holidays.tsx) |
| Timetable | [`app/masters/timetable.tsx`](app/masters/timetable.tsx) |
| Staff management | [`app/masters/staffmanagement.tsx`](app/masters/staffmanagement.tsx) |
| Parents list | [`app/masters/parents.tsx`](app/masters/parents.tsx) |
| Locations | [`app/masters/locations.tsx`](app/masters/locations.tsx) |

---

## Transport Module

**Status: ✅ DONE**

| Screen | File |
|---|---|
| Routes | [`app/transport/routes.tsx`](app/transport/routes.tsx) |
| Route stops | [`app/transport/route-stops.tsx`](app/transport/route-stops.tsx) |
| Vehicles | [`app/transport/vehicles.tsx`](app/transport/vehicles.tsx) |
| Trips | [`app/transport/trips.tsx`](app/transport/trips.tsx) |
| Transport pricing | [`app/transport/pricing.tsx`](app/transport/pricing.tsx) |
| Student transport | [`app/transport/student-transport.tsx`](app/transport/student-transport.tsx) |
| Student trips | [`app/transport/student-trips.tsx`](app/transport/student-trips.tsx) |

---

## Reports Module

**Status: ✅ DONE**

| Screen | File |
|---|---|
| Student reports | [`app/reports/student-reports.tsx`](app/reports/student-reports.tsx) |
| Staff reports | [`app/reports/staff-reports.tsx`](app/reports/staff-reports.tsx) |
| Fee reports | [`app/reports/fee-reports.tsx`](app/reports/fee-reports.tsx) |
| Academic reports | [`app/reports/academic-reports.tsx`](app/reports/academic-reports.tsx) |
| Transport reports | [`app/reports/transport-reports.tsx`](app/reports/transport-reports.tsx) |

---

## API Layer Summary

All API calls go through [`src/api/client.ts`](src/api/client.ts):
- Base URL: `process.env.EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`)
- Every request automatically adds `Authorization: Bearer <token>` and `cschema: <tenant>` headers
- 401 responses automatically trigger token refresh via `/auth/refresh`
- Refresh failure → session expired callback → forced logout to `/login`

| API File | Endpoints Covered |
|---|---|
| [`src/api/auth.ts`](src/api/auth.ts) | Login, logout, refresh, menus, permissions |
| [`src/api/students.ts`](src/api/students.ts) | Admissions, parents, student search |
| [`src/api/fees.ts`](src/api/fees.ts) | All fee endpoints (categories, types, terms, collection, receipts, refunds, concessions) |
| [`src/api/profile.ts`](src/api/profile.ts) | Student/staff/parent profile GET+PUT |
| [`src/api/staff.ts`](src/api/staff.ts) | Staff management |
| [`src/api/masters.ts`](src/api/masters.ts) | Academic years, classes, subjects, holidays, timetable |
| [`src/api/exam.ts`](src/api/exam.ts) | Full exam module |
| [`src/api/expense.ts`](src/api/expense.ts) | Full expense module |
| [`src/api/communication.ts`](src/api/communication.ts) | Templates, send, logs |
| [`src/api/transport.ts`](src/api/transport.ts) | Routes, vehicles, trips, pricing |

---

## Overall Status

| Feature | Status | Notes |
|---|---|---|
| Auth (login, logout, refresh, set-password) | ✅ Done | Full multi-tenant + academic year |
| Student document view (student/parent) | ✅ Done | Upload + download supported |
| Student certificate view (student/parent/admin) | ✅ Done | Presigned S3 download |
| Fee receipts — student own receipts | ✅ Done | Uses `/fee/receipts/my-receipts` |
| Fee receipts — admin view | ✅ Done | Full CRUD + reprint |
| Fee collection — student/parent summary | ✅ Done | Uses `my-summary` / `child-summary` |
| Fee collection — admin collect+pay | ✅ Done | Full payment flow + PDF receipt |
| Student attendance (own + admin) | ✅ Done | Date-range filter |
| Exam module | ✅ Done | Full admin + student marks view |
| Expense module | ✅ Done | Admin CRUD |
| Communication module | ✅ Done | Templates + send + logs |
| Admin management | ✅ Done | Users, roles, permissions, menus |
| Masters management | ✅ Done | All master data tables |
| Transport module | ✅ Done | Routes, vehicles, trips, pricing |
| Reports | ✅ Done | Student, staff, fee, academic, transport |
| Role-based profile | ✅ Done | Student / Parent / Staff views |

---

*Last updated: 2026-05-20*
