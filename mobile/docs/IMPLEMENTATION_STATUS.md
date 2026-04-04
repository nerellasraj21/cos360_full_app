# COS360 Mobile App — Implementation Status

**As of:** April 2026
**Version:** 2.5.0 (Exam Module — Full Web Parity + Shared Date/Time Pickers)

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ Complete | Feature fully implemented and integrated |
| 🔄 In Progress | Partially implemented |
| ⏳ Planned | Not yet started |

---

## 1. Core Infrastructure

| Feature | Status | Details |
|---------|--------|---------|
| Expo Router setup | ✅ Complete | File-based routing with tab groups |
| TypeScript configuration | ✅ Complete | Strict mode, typed routes enabled |
| React Compiler | ✅ Complete | Experimental auto-memoization |
| New Architecture (JSI) | ✅ Complete | Enabled in app.json |
| Axios HTTP client | ✅ Complete | With request/response interceptors |
| React Query setup | ✅ Complete | QueryClient configured globally |
| AsyncStorage integration | ✅ Complete | Token & permission persistence |
| Error boundary | ✅ Complete | `components/ErrorBoundary.tsx` |
| Toast notifications | ✅ Complete | `components/ToastProvider.tsx` |
| Confirm modal (in-app) | ✅ Complete | `components/ConfirmModal.tsx` + `useConfirmModal()` hook — replaces browser `window.confirm()` (v2.2.0) |
| Time picker modal | ✅ Complete | `components/ui/time-picker-modal.tsx` — 12h display with AM/PM toggle, up/down arrows, quick presets; exported as `TimePickerModal` + `formatTime12h` from `components/ui` (v2.5.0) |
| Date picker modal | ✅ Complete | `components/ui/date-picker-modal.tsx` — Day/Month/Year columns, Today/Tomorrow/+1 Week presets, outputs `YYYY-MM-DD`; exported as `DatePickerModal` + `formatDate` from `components/ui` (v2.5.0) |
| Loading indicators | ✅ Complete | `components/LoadingIndicator.tsx` |
| Offline sync queue | ❌ Removed | Queue was written but never drained — dead code removed from `src/api/client.ts`. `services/offlineStorage.ts` retained for reference. |
| App icons (Android) | ✅ Complete | Adaptive icon (foreground/background/monochrome) |
| Splash screen | ✅ Complete | Custom splash with dark/light variant |
| Deep linking | ✅ Complete | `cos360://` scheme configured |

---

## 2. Authentication Module

| Feature | Status | Details |
|---------|--------|---------|
| Login screen | ✅ Complete | Email + password + Academic Year picker; form validation; auto-retry years on picker open; error banner; COS360 brand logo image (v1.9.0) |
| JWT token storage | ✅ Complete | Native: `expo-secure-store` (iOS Keychain / Android Keystore). Web: `AsyncStorage` with `@secure/` prefix fallback |
| Automatic token refresh | ✅ Complete | Intercepts 401, refreshes, retries request |
| Logout | ✅ Complete | Clears tokens, redirects to login |
| Auth context | ✅ Complete | `contexts/AuthContext.tsx` |
| Mobile auth store (Zustand) | ℹ️ Dead code | `src/stores/mobileAuthStore.ts` — not used by main auth flow; `AuthContext` is the single source of truth |
| Permission sync on login | ✅ Complete | Permissions embedded in login response — no separate sync endpoint exists on backend |
| Permission cache | ✅ Complete | `utils/mobilePermissionCache.ts` |
| Permission bulk check | ✅ Complete | `src/api/mobilePermissions.ts` — cache-only reads, no HTTP calls |
| Auth redirect on app start | ✅ Complete | `app/index.tsx` handles redirect |
| First-login set-password flow | ✅ Complete | `requires_password_change` in login response → redirect to `/set-password`; endpoint `POST /auth/staff/set-password` |
| Multi-tenant (cschema) | ✅ Complete | Header injected on every request |
| Parent multi-student context | ✅ Complete | Student selector in auth context |

---

## 3. Permission System

| Feature | Status | Details |
|---------|--------|---------|
| Permission definitions | ✅ Complete | `src/constants/permissions.ts` |
| Screen permission config | ✅ Complete | `src/config/screenPermissions.ts` |
| Permission guard component | ✅ Complete | `PermissionGuard.tsx`, `MobilePermissionGuard.tsx` |
| Protected tab bar | ✅ Complete | `src/components/mobile/ProtectedTabBar.tsx` |
| Permission-based menu | ✅ Complete | `src/components/mobile/PermissionBasedMenu.tsx` |
| Access denied screen | ✅ Complete | `src/components/mobile/AccessDeniedScreen.tsx` |
| Permission status indicator | ✅ Complete | `src/components/mobile/PermissionStatusIndicator.tsx` |
| Permission performance context | ✅ Complete | `contexts/PermissionPerformanceContext.tsx` |
| Permission analytics | ✅ Complete | `utils/permission-analytics.ts` |
| Permission debug tools | ✅ Complete | `utils/permission-debug.ts` |
| Protected route component | ✅ Complete | `components/navigation/ProtectedRoute.tsx` |
| Permission error handler | ✅ Complete | `components/navigation/PermissionErrorHandler.tsx` |
| Permission feedback system | ✅ Complete | `components/ui/PermissionFeedbackSystem.tsx` |
| Use permission hook | ✅ Complete | `src/hooks/useMobilePermission.ts` |
| Protected query hook | ✅ Complete | `src/hooks/usePermissionProtectedQuery.ts` |
| Protected mutation hook | ✅ Complete | `src/hooks/usePermissionProtectedMutation.ts` |
| Screen permission hook | ✅ Complete | `src/hooks/useScreenPermissions.ts` |
| Admin permission resources | ✅ Complete | `ADMIN_USERS`, `ADMIN_ROLES`, `ADMIN_PERMISSIONS`, `ADMIN_MENU` in `src/types/permissions.ts` |

---

## 4. Home / Dashboard

| Feature | Status | Details |
|---------|--------|---------|
| Dashboard screen | ✅ Complete | `app/(tabs)/index.tsx` |
| Quick action cards | ✅ Complete | 9 permission-gated + 3 always-visible module cards (Transport, Communication, Reports); Administration now permission-gated via `resources: ['users','roles','staff']` |
| Permission-filtered cards | ✅ Complete | `accessibleModules` filter — only shows cards with `read`, `list`, or `read_own` permission |
| Empty state for restricted roles | ✅ Complete | Lock icon + message when user has no module permissions |
| Greeting hero card | ✅ Complete | Greeting, username, date — no hardcoded stats |

---

## 5. Students Module

### 5.1 Student Management

| Feature | Status | File |
|---------|--------|------|
| Student list with search | ✅ Complete | `app/(tabs)/students.tsx` |
| Student detail view | ✅ Complete | `app/students/[id].tsx` |
| Student admission — list view + view modal | ✅ Complete | `app/students/admission.tsx` — table-style cards, eye-icon view modal with 34 fields |
| Student admission — 6-step create form | ✅ Complete | Calendar date picker, 2-col layouts, Indian states dropdown, Yes/No prev-school, web-matched summary |
| Student admission — edit form (parent data) | ✅ Fixed (v2.3.0) | Edit used to open with empty father/mother fields. Fixed: `handleEditAdmission(admission)` takes full list object, populates form directly without re-fetch. `editStudentId` state + `activeStudentId = editStudentId \|\| studentId` pattern. |
| Student admission — toggle active status | ✅ Complete | `studentAdmissionsApi.toggleActiveStatus(id)` via useMutation |
| Student profile view | ✅ Complete | `app/students/profile.tsx` |
| Student profile form/edit | ✅ Complete | `components/profile/StudentProfileForm.tsx` |
| Student profile display | ✅ Complete | `components/profile/StudentProfileView.tsx` |
| Student profile API hook | ✅ Complete | `src/api/hooks/profile/useStudentProfile.ts` |

### 5.2 Student Attendance

| Feature | Status | File |
|---------|--------|------|
| Attendance view — staff/admin (web-style redesign) | ✅ Complete | `app/students/attendance.tsx` — compact 3-col filter row, Refresh + Save Attendance buttons, stats cards, local statusMap, P/A/L per-row buttons, bulk save. Refresh now reloads Class/Section dropdowns (v2.3.0) |
| Attendance view — student/parent history | ✅ Complete | `app/students/attendance.tsx` — monthly filter, stats summary, records list |
| Attendance API hooks | ✅ Complete | `src/api/hooks/students/attendance.ts` |

### 5.3 Student Documents

| Feature | Status | File |
|---------|--------|------|
| Document list | ✅ Complete | `app/students/documents.tsx` |
| Document upload | ✅ Complete | `app/students/documentupload.tsx` |
| My documents (student view) | ✅ Complete | `app/students/mydocuments.tsx` |
| Student documents (admin) | ✅ Complete | `app/students/studentdocuments.tsx` |
| Documents API hooks | ✅ Complete | `src/api/hooks/students/documents.ts` |

### 5.4 Student Certificates

| Feature | Status | File |
|---------|--------|------|
| Certificate list | ✅ Complete | `app/students/certificates.tsx` |
| Certificate types | ✅ Complete | `app/students/certificatetypes.tsx` |
| Certificate upload | ✅ Complete | `app/students/certificateupload.tsx` |
| My certificates (student) | ✅ Complete | `app/students/mycertificates.tsx` |
| Student certificates (admin) | ✅ Complete | `app/students/studentcertificates.tsx` |
| Certificates API hooks | ✅ Complete | `src/api/hooks/students/certificates.ts` |

---

## 6. Fees Module

**Hub sections (matches web app):** Fee Categories · Fee Types · Fee Terms · Fee Mappings · Fee Term Amounts · Fee Collection · Fee Receipts · Fee Refunds · Fee Reports

| Feature | Status | File |
|---------|--------|------|
| Fee hub (9 sections) | ✅ Complete | `app/(tabs)/fees.tsx` |
| Fee categories | ✅ Complete | `app/fees/categories.tsx` |
| Fee types | ✅ Complete | `app/fees/types.tsx` |
| Fee terms | ✅ Complete | `app/fees/terms.tsx` |
| Fee mappings (class-level) | ✅ Complete | `app/fees/class-mappings.tsx` |
| Fee term amounts | ✅ Complete | `app/fees/term-amounts.tsx` |
| Fee collection (role-aware) | ✅ Complete | `app/fees/collection.tsx` |
| Fee receipts | ✅ Complete | `app/fees/receipts.tsx` |
| Fee refunds | ✅ Complete | `app/fees/refunds.tsx` |
| Fees API | ✅ Complete | `src/api/fees.ts` |
| Fee type definitions | ✅ Complete | `src/types/fees.ts` |
| Fee permission hook | ✅ Complete | `hooks/use-fee-permissions.ts` |

---

## 7. Masters Module

| Feature | Status | File |
|---------|--------|------|
| Academic years | ✅ Complete | `app/masters/academicyears.tsx` |
| Classes & sections | ✅ Complete | `app/masters/classesandsections.tsx` |
| Subjects | ✅ Complete | `app/masters/subjects.tsx` |
| Subject categories | ✅ Complete | `app/masters/subjectcategories.tsx` |
| Holidays | ✅ Complete | `app/masters/holidays.tsx` |
| Roles & permissions | ✅ Complete | `app/masters/rolespermissions.tsx` |
| Timetable | ✅ Complete | `app/masters/timetable.tsx` |
| Masters API (1,184 lines) | ✅ Complete | `src/api/masters.ts` |
| Academic year hooks | ✅ Complete | `src/api/hooks/masters/academicYears.ts` |
| Classes hooks | ✅ Complete | `src/api/hooks/masters/classesAndSections.ts` |
| Subjects hooks | ✅ Complete | `src/api/hooks/masters/subjects.ts` |
| Subject categories hooks | ✅ Complete | `src/api/hooks/masters/subjectCategories.ts` |
| Holidays hooks | ✅ Complete | `src/api/hooks/masters/holidays.ts` |
| Roles hooks | ✅ Complete | `src/api/hooks/masters/rolesAndPermissions.ts` |
| Timetable hooks | ✅ Complete | `src/api/hooks/masters/timetables.ts` |
| Academic year context | ✅ Complete | `contexts/AcademicYearContext.tsx` |

---

## 8. Transport Module

**Hub sections (matches web app):** Routes · Route Stops · Vehicles · Transport Trips · Transport Pricing · Student Transport

| Feature | Status | File |
|---------|--------|------|
| Transport hub (6 sections) | ✅ Complete | `app/(tabs)/transport.tsx` |
| Route management (dynamic route/trip types) | ✅ Complete | `app/transport/routes.tsx` — picker modals + create type on-the-fly via `src/api/transportTypes.ts` (v2.2.0) |
| Route stops | ✅ Complete | `app/transport/route-stops.tsx` |
| Vehicle management | ✅ Complete | `app/transport/vehicles.tsx` |
| Trip management | ✅ Complete | `app/transport/trips.tsx` |
| Transport Pricing hub link | ✅ Complete | `app/(tabs)/transport.tsx` → `app/transport/pricing.tsx` (was orphaned — now linked) |
| Student Transport hub link | ✅ Complete | `app/(tabs)/transport.tsx` → `app/transport/student-transport.tsx` (was orphaned — now linked) |
| Student transport (correct schema) | ✅ Complete | `app/transport/student-transport.tsx` — imports from `src/api/students.ts`; form: Student → Trip → Stop → `fee_per_term` |
| Student transport — students module redesign | ✅ Complete | `app/students/transport.tsx` — table layout with horizontal scroll, S.No/Student/Trip/Route/Stop/Fee/Actions columns, search bar, Assign form in bottom-sheet modal, uses AppLayout. Delete now uses `ConfirmModal` (v2.3.0) |
| Transport API | ✅ Complete | `src/api/transport.ts` |
| Transport hooks | ✅ Complete | `hooks/use-transport.ts` — `useDrivers()` fetches live staff list from `staffApi.getStaff()` |
| Student transport hooks (correct schema) | ✅ Complete | `src/api/hooks/students/transport.ts` — imports `studentTransportApi` from `students.ts`, uses `listStudentTransport()` and `StudentTransportOut` |
| Transport type definitions | ✅ Complete | `src/types/transport.ts` — includes `BillingCycle`, `TransportPricing*` types (v2.1.0) |
| Route/Trip type API | ✅ Complete | `src/api/transportTypes.ts` — `/masters/route-types` + `/masters/trip-types` dropdown & create (v2.2.0) |

---

## 9. Staff Module

| Feature | Status | File |
|---------|--------|------|
| Staff enrollment | ✅ Complete | `app/staff/enrollment.tsx` |
| Staff profile view | ✅ Complete | `app/staff/profile.tsx` |
| Staff profile form/edit | ✅ Complete | `components/profile/StaffProfileForm.tsx` |
| Staff profile display | ✅ Complete | `components/profile/StaffProfileView.tsx` |
| Designations | ✅ Complete | `app/staff/designations.tsx` |
| Staff attendance | ✅ Complete | `app/staff/attendance.tsx` |
| Staff API (313 lines) | ✅ Complete | `src/api/staff.ts` |
| Staff API hook | ✅ Complete | `hooks/use-staff-api.ts` |
| Staff profile hook | ✅ Complete | `src/api/hooks/profile/useStaffProfile.ts` |
| Staff type definitions | ✅ Complete | `src/types/masters/staff.ts` |

---

## 10. Expense Module

**Hub sections (matches web app):** Categories · Types · Transactions · Pending Approvals · Summary · Audit Trail

| Feature | Status | File |
|---------|--------|------|
| Expense hub (6 sections) | ✅ Complete | `app/(tabs)/expense.tsx` |
| Expense categories | ✅ Complete | `app/expense/categories.tsx` |
| Expense types | ✅ Complete | `app/expense/types.tsx` |
| Expense departments | ⚠️ Placeholder | `app/expense/departments.tsx` — shows "Not Available"; backend endpoints `GET /expense/departments` and `/dropdown` not implemented |
| Expense transactions | ✅ Complete | `app/expense/transactions.tsx` |
| Transaction detail | ✅ Complete | `app/expense/transactions/[id].tsx` |
| Create transaction (with line items) | ✅ Complete | `app/expense/transactions/create.tsx` — itemized breakdown with auto-calculation (v2.2.0) |
| Expense approvals | ✅ Complete | `app/expense/approvals.tsx` |
| Expense audit | ✅ Complete | `app/expense/audit.tsx` — full implementation: filterable list, action badges, category chips, search; calls `GET /expense/audit/logs` |
| Global audit logs hook | ✅ Complete | `useExpenseGlobalAuditLogsProtected` in `hooks/use-expense-protected.ts` |
| Expense reports | ✅ Complete | `app/expense/reports.tsx` |
| Expense settings | ✅ Complete | `app/expense/settings.tsx` |
| Expense API | ✅ Complete | `src/api/expense.ts` |
| Expense hook | ✅ Complete | `hooks/use-expense.ts` |
| Expense type definitions | ✅ Complete | `src/types/expense.ts` |

---

## 11. Profile Module

| Feature | Status | File |
|---------|--------|------|
| Profile screen (entry) | ✅ Complete | `app/(tabs)/profile.tsx` |
| Student profile view & edit | ✅ Complete | `components/profile/StudentProfile*.tsx` |
| Parent profile view & edit | ✅ Complete | `components/profile/ParentProfile*.tsx` |
| Staff profile view & edit | ✅ Complete | `components/profile/StaffProfile*.tsx` |
| Profile API | ✅ Complete | `src/api/profile.ts` |
| Student profile hook | ✅ Complete | `src/api/hooks/profile/useStudentProfile.ts` |
| Parent profile hook | ✅ Complete | `src/api/hooks/profile/useParentProfile.ts` |
| Staff profile hook | ✅ Complete | `src/api/hooks/profile/useStaffProfile.ts` |
| `staffProfileApi` API export | ✅ Complete | Exported from `src/api/index.ts` (previously missing) |

---

## 12. Settings Module

| Feature | Status | File |
|---------|--------|------|
| Settings screen | ✅ Complete | `app/(tabs)/settings.tsx` |
| Theme toggle (light/dark) | ✅ Complete | `components/ThemeToggle.tsx` |
| Academic year selector | ✅ Complete | Via `AcademicYearContext` |
| Permission test screen | ✅ Complete | `app/permission-test.tsx` — dev-only (`if (!__DEV__) return null`), invisible in production |

---

## 13. Parents Module

| Feature | Status | File |
|---------|--------|------|
| Parent module index | ✅ Complete | `app/parents/index.tsx` |
| Parent profile view & edit | ✅ Complete | `components/profile/ParentProfile*.tsx` |
| Parent profile hook | ✅ Complete | `src/api/hooks/profile/useParentProfile.ts` |
| Multi-student context | ✅ Complete | Student selector in AuthContext |

---

## 14. Exam Module

> **v2.5.0 — Full Web Parity Pass (2026-04-04)**
> All four exam screens rewritten to match the web app exactly. Shared `TimePickerModal` and new `DatePickerModal` components introduced.

| Feature | Backend Status | Mobile Status | File |
|---------|---------------|---------------|------|
| Exam list screen | ✅ Complete | ✅ Complete | `app/exam/list.tsx` — nature filter chips, edit/clone/delete modals, `ConfirmModal` for delete (v2.5.0) |
| Exam tab entry | ✅ Complete | ✅ Complete | `app/(tabs)/exam.tsx` |
| Create exam — 5-step accordion wizard | ✅ Complete | ✅ Complete | `app/exam/create.tsx` — matches web: Exam Details → Class & Sections → Subject Config → Exam Dates → Review & Submit; `POST /exams` full payload; `CustomDropdown` for board/level/nature/academic year/grade scheme; `DatePickerModal` for all dates; `TimePickerModal` for start/end time (v2.5.0) |
| Exam detail screen | ✅ Complete | ✅ Complete | `app/exam/[id].tsx` |
| Mark entry screen | ✅ Complete | ✅ Complete | `app/exam/marks.tsx` |
| Results screen | ✅ Complete | ✅ Complete | `app/exam/results.tsx` |
| Hall tickets screen (card layout) | ✅ Complete | ✅ Complete | `app/exam/hall-tickets.tsx` — converted from horizontal scroll table to vertical card layout (v1.9.1) |
| My Marks screen (student/parent) | ✅ Complete | ✅ Complete | `app/exam/my-marks/[examId].tsx` |
| Grading dashboard | ✅ Complete | ✅ Complete | `app/exam/grading.tsx` — matches web: header card, 5 quick-link grid, 4 status stat cards, Active/Draft exam sections, role-aware for student/parent (v2.5.0) |
| Exam settings | ✅ Complete | ✅ Complete | `app/exam/settings.tsx` — board chip selector (CBSE/ICSE/State/BTech/Custom), custom board name field, reconduct policy section (v2.5.0) |
| Exam API layer | ✅ Complete | ✅ Complete | `src/api/exam.ts` — added `ClassSectionPayload`, `ComponentPayload`, `SubjectConfigPayload`, `ExamDatePayload`, `ExamCreateFull`, `ExamCreateFullResponse` types; `examsApi.createFull()` calling `POST /exams` (v2.5.0) |
| Exam permissions | ✅ Complete | ✅ Complete | `src/constants/permissions.ts` |

### Exam Module — Subject Configuration Detail (v2.5.0)

- Per class-section: subjects fetched from `/masters/class-subject-mappings/by-class/{classId}`
- Per subject: **Grade Scheme** dropdown + **Credit Hours** input + **Mark Components** (name, type Marks/Remarks, max marks, min pass, In Total toggle)
- Components only appear after clicking **+ Add Component** (not auto-added)
- Each component has a **Remove** button always visible

---

## 15. Communication Module

Single-page implementation — Compose, Templates, and Logs are in-page tabs within one screen (no separate sub-screens).
Channels: **SMS · WhatsApp · Email** (Push removed). API types updated in `src/api/communication.ts` (`CommChannel` type, flexible `recipient_type`).

| Feature | Status | File |
| ------- | ------ | ---- |
| Communication tab (single page, 3 in-page tabs) | ✅ Complete | `app/(tabs)/communication.tsx` |
| **Compose** — 4-step wizard with progress bars (Step X of 4) matching web | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Compose** — Step 1: SMS/WhatsApp/Email channel cards + Next button | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Compose** — Step 2: Target Type + Class/Section (full-width stacked) / individual IDs / role + recipient count + Back/Next | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Compose** — Step 3: Template dropdown (filtered by channel) + preview + Back/Next or Send Now | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Compose** — Step 4: Fill variables (conditional, only if template has user vars) + Back/Send Now | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Compose** — Confirmation modal (channel, target, recipients, preview, warning) | ✅ Complete | `app/(tabs)/communication.tsx` |
| **Templates** — filter bar (channel chips, status chips, search, **New Template** button) | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Templates** — list with Name/Channel badge/Variables/Status/Date/Edit/Deactivate | ✅ Complete | `app/(tabs)/communication.tsx` |
| **Templates** — CRUD modal → `GET/POST/PUT/DELETE /communication/templates/` | ✅ Complete | `app/(tabs)/communication.tsx` |
| **Templates** — deactivate uses `ConfirmModal` (no `Alert.alert`) | ✅ Complete (v2.4.0) | `app/(tabs)/communication.tsx` |
| **Logs** — filter bar (All Channels dropdown, All Status dropdown, From/To date) | ✅ Complete | `app/(tabs)/communication.tsx` |
| **Logs** — filtered list with channel/status badges, pagination | ✅ Complete | `app/(tabs)/communication.tsx` |
| **Logs** — detail modal (full message, error, provider ID) | ✅ Complete | `app/(tabs)/communication.tsx` |
| Communication API layer (`CommChannel` type, `whatsapp` support) | ✅ Complete | `src/api/communication.ts` |
| Tab gating in `TAB_CONFIGS` | ✅ Complete | `app/(tabs)/_layout.tsx` |

---

## 16. Additional Phase 2 / Phase 3 Features

| Feature | Status | File |
|---------|--------|------|
| Fee Collection screen (role-aware) | ✅ Complete | `app/fees/collection.tsx` |
| Fee Term Amounts screen | ✅ Complete | `app/fees/term-amounts.tsx` |
| Fee Receipts screen | ✅ Complete | `app/fees/receipts.tsx` |
| Fee Reports hub link | ✅ Complete | `app/(tabs)/fees.tsx` → `app/fees/reports.tsx` (was orphaned — now linked) |
| Fee Reports screen (3 tabs) | ✅ Complete | `app/fees/reports.tsx` — linked from fees hub (v1.8.0) |
| Transport Pricing CRUD (schema aligned with web) | ✅ Complete | `app/transport/pricing.tsx` — billing_cycle model with vehicle/route dropdowns, date pickers (v2.1.0) |
| Student Transport CRUD | ✅ Complete | `app/transport/student-transport.tsx` — linked from transport hub (v1.8.0) |

---

## 17. Administration Module

**Hub sections (matches web app):** User Management · Role Management · Permission Management · Menu Management

| Feature | Status | File |
|---------|--------|------|
| Administration tab hub | ✅ Complete | `app/(tabs)/admin.tsx` — banner, 4-section permission-gated grid |
| User Management screen | ✅ Complete | `app/admin/users.tsx` — stats hub showing staff/student counts + navigation cards to staff, students, and roles screens |
| Role Management screen | ✅ Complete | `app/admin/roles.tsx` — redirects to `app/masters/rolespermissions` (full CRUD lives there) |
| Permission Management screen | ✅ Complete | `app/admin/permissions.tsx` — clean `<Redirect href="/masters/rolespermissions" />` |
| Menu Management screen | ✅ Complete | `app/admin/menu.tsx` — full CRUD via `authApi.getMenus` / `authApi.createMenu`; list + create modal |
| Admin tab in `TAB_CONFIGS` | ✅ Complete | `app/(tabs)/_layout.tsx` — gated on `users/roles/permissions/menu` resources |
| Administration card in dashboard | ✅ Complete | `app/(tabs)/index.tsx` — color `#64748b`, `resources: ['users','roles','permissions','menu']` |
| Admin permission resource constants | ✅ Complete | `ADMIN_USERS`, `ADMIN_ROLES`, `ADMIN_PERMISSIONS`, `ADMIN_MENU` in `src/types/permissions.ts` |

---

## Summary

| Category | Total Features | Complete | In Progress | Planned |
|----------|---------------|----------|-------------|---------|
| Core Infrastructure | 16 | 16 | 0 | 0 |
| Authentication | 12 | 12 | 0 | 0 |
| Permission System | 18 | 18 | 0 | 0 |
| Dashboard | 5 | 5 | 0 | 0 |
| Students | 18 | 18 | 0 | 0 |
| Fees | 14 | 14 | 0 | 0 |
| Masters | 14 | 14 | 0 | 0 |
| Transport | 9 | 9 | 0 | 0 |
| Staff | 10 | 10 | 0 | 0 |
| Expense | 13 | 13 | 0 | 0 |
| Profile | 8 | 8 | 0 | 0 |
| Settings | 4 | 4 | 0 | 0 |
| Parents | 4 | 4 | 0 | 0 |
| Exam Module | 11 | 11 | 0 | 0 |
| Communication | 7 | 7 | 0 | 0 |
| Additional Features | 6 | 6 | 0 | 0 |
| **Administration** | **8** | **8** | **0** | **0** |
| **TOTAL** | **177** | **177** | **0** | **0** |

Overall Completion: **100%** (177/177 features)

---

---

## Login Flow Fixes (v1.9.0) — March 2026

### Academic Year Picker & Sign-In Bug Fixes

| File | Issue | Fix |
|------|-------|-----|
| `app/login.tsx` | Academic year picker showed "No academic years available" — initial fetch used `showErrors=false`, silently swallowing `cschema`-not-set errors | Added `useEffect` that auto-retries `fetchAcademicYears(true)` when picker is opened with an empty list; added Retry button to `ListEmptyComponent` |
| `app/login.tsx` | Sign In button could be pressed before academic years loaded, sending empty string as `academic_year_id` (422 from backend) | Added `academicYear` field to `FormErrors`; `validateForm()` checks `!selectedAcademicYearId && !academicYearLoading`; Sign In button disabled while `academicYearLoading` |
| `app/login.tsx` | Academic year field had no visual error state | Field border turns red + error text shown below when validation fails |
| `app/login.tsx` | Login errors were silently cleared — `clearError` is not memoized in `AuthContext` so the `useEffect([formData, clearError])` fired on every render, wiping freshly-set errors before they displayed | Removed `clearError` from `useEffect` dependency array; effect now only fires when `formData` changes (user types), with an ESLint suppression comment explaining why |
| `contexts/AuthContext.tsx` | Login error message showed generic Axios `"Request failed with status code 401"` — not helpful | Error extraction now reads `error.response.data.detail` first (string or array of `{msg}`); falls back to `error.message` |
| `services/authUtils.ts` | `loginUser` sent `academic_year_id: ""` (empty string) when no year selected — Pydantic rejects empty string for UUID field (422) | `loginUser` now only adds `academic_year_id` to payload when truthy: `if (academicYearId) payload.academic_year_id = academicYearId` |
| `services/authUtils.ts` | `expo-secure-store` is native-only; calling `secureSet`/`secureGet`/`secureDelete` on web threw "Not supported" → `storeAuthData` threw "Failed to store authentication data" → login appeared to fail even after successful API response | Added `Platform.OS === 'web'` check in all three helpers; web falls back to `AsyncStorage` with `@secure/` key prefix (tokens less secure on web but app remains functional for dev/web testing) |

---

## Table-to-Card Conversions & Text Node Fix (v1.9.1)

### Hall Tickets — Card Layout — March 2026

Converted `app/exam/hall-tickets.tsx` from a horizontal-scroll COL_*-based data table to a vertical ScrollView of mobile-friendly cards.

| Change | Details |
| ------ | ------- |
| Removed | `COL_SNO`, `COL_NAME`, `COL_ADM`, `COL_ATT`, `COL_FEE`, `COL_STATUS`, `COL_ACT`, `COL_DL` width constants |
| Removed | `TableHeader` component, `Cell` helper, `renderRow` function, horizontal `ScrollView` table |
| Added | Vertical `ScrollView` + per-student cards: green/red accent bar, name + S.No. + admission number, Eligible/Ineligible badge, Overridden badge, ineligibility reason, Attendance % + Fee Paid/Unpaid stats row, Override + Download PDF footer actions |
| Fixed | Missing `Platform.OS === 'web'` guard on override action (`Alert.alert`) — now uses `window.confirm` on web |
| Fixed | Empty-string text node bug: `{item.ineligibility_reason && ...}` → `{!!item.ineligibility_reason && ...}` — prevents "Unexpected text node: ." crash on React Native web when field is `""` |

### Empty-String Text Node Pattern (React Native Web)

**Bug:** `{someString && <Component />}` where `someString` can be `""` causes `"Unexpected text node: . A text node cannot be a child of a <View>."` on React Native web. The `&&` operator returns the left operand (`""`) when it is falsy, and React Native web tries to render that empty string as a text node.

**Fix:** Always use `{!!someString && <Component />}` or `{someString ? <Component /> : null}` for string-based conditionals inside View children.

---

## Brand Logo Update (v1.9.0)

### COS360 Logo Applied — March 2026

Replaced placeholder text-circle ("COS/360") and generic icon with the actual COS360 brand logo image throughout the app.

| File | Change |
|------|--------|
| `assets/images/cos360-logo.jpg` | Added — copied from web app `public/ICON.jpg` |
| `app/login.tsx` | 3 occurrences: loading screen, org selection screen, login form brand header — now use `<Image>` with `logoImage` style (72×72) |
| `components/navigation/AppDrawer.tsx` | Sidebar header — replaced `<Ionicons name="school">` in `brandIconBox` with `<Image>` (`brandLogoImg` style, 32×32, borderRadius 6) |

`AppHeader.tsx` `logoCircle` is a user/school **initial avatar** — intentionally not changed.

---

## Hub Navigation Fixes (v1.8.0)

### Orphaned Screens Linked to Hub — March 2026

Three screens existed in the codebase but had no navigation entry point from their module hubs. Users could not reach them without deep-linking.

| File | Issue | Fix |
|------|-------|-----|
| `app/(tabs)/transport.tsx` | `Transport Pricing` and `Student Transport` screens existed at `app/transport/pricing.tsx` and `app/transport/student-transport.tsx` but were absent from the transport hub grid (only 4 sections shown) | Added both as sections 5 and 6; hub now shows 6 sections with correct `TRANSPORT_PRICING` / `STUDENT_TRANSPORT` permission guards |
| `app/(tabs)/fees.tsx` | `Fee Reports` screen existed at `app/fees/reports.tsx` but was absent from the fees hub grid (only 8 sections shown) | Added as section 9 with `FEE_REPORTS` permission guard, `bar-chart` icon, green accent |
| `app/(tabs)/students.tsx` | `STUDENT_QUICK_LINKS` and `PARENT_QUICK_LINKS` had 6 items; timetable was inaccessible for students/parents | Added `My Timetable` / `Timetable` quick link → `/masters/timetable` to both arrays (7 items each) |

---

## Mutation Audit & Cleanup (v1.6.3)

### Full Mutation Audit — March 2026

All 200+ create/update/delete mutation operations across every module were audited.

**Result: No functional issues found.** All mutations have:

- Correct HTTP methods and endpoints
- Proper `onSuccess` query invalidation
- `onError` handlers with toast feedback
- FormData handling for file uploads
- Permission protection via `usePermissionProtectedMutation`

**Modules audited:** Students, Staff, Fees, Exam, Masters, Communication, Expense (17 sub-sections, 200+ mutations total)

### Console.log Cleanup

| File | Location | Issue | Fix |
| --- | --- | --- | --- |
| `src/api/fees.ts` | `deleteFeeCategory()` | 3 debug `console.log` statements left from development | Removed; simplified to single `await apiClient.delete(...)` |
| `src/api/fees.ts` | `deleteFeeTerm()` | 1 debug `console.log` statement | Removed |
| `src/api/fees.ts` | `createFeeTransaction()` | 2 debug `console.log` statements (request + response) | Removed |

---

## Bug Fixes (v1.6.2)

| File | Issue | Fix |
|------|-------|-----|
| `app/(tabs)/_layout.tsx:151` | Unescaped apostrophe in JSX text `"You don't have access..."` — ESLint `react/no-unescaped-entities` error | Replaced `'` with `&apos;` |
| `app/(tabs)/profile.tsx:123` | Unescaped apostrophe in JSX text `"You don't have permission..."` — ESLint `react/no-unescaped-entities` error | Replaced `'` with `&apos;` |

---

## Bug Fixes & Audit (v1.6.1)

### Code Audit — March 2026

All app screens audited. Issues found and resolved:

| File | Issue | Fix |
|------|-------|-----|
| `app/exam/remark-sets.tsx` | File contained only stub text `"test content"` — not a valid component | Replaced with full CRUD implementation: `remarkGradesApi` list/create/update/delete, dynamic remark items editor, `useMobilePermission` permission gates |
| `app/reports/transport-reports.tsx` | `Trip` type has no `is_active` field — `activeTrips` count was always `0` | Replaced `activeTrips` (filtered by non-existent field) with `totalTrips` (`trips.length`); card subtitle changed from "0 active" to "X total" |
| `hooks/use-transport.ts` | `useDrivers()` was hardcoded to return `[]` — Driver dropdown in Trips create/edit was always empty | Implemented using `staffApi.getStaff()`, mapping `first_name + last_name` to `{ id, name }` |
| `app/admin/permissions.tsx` | Had a 300ms timer redirect with loading spinner — unnecessarily complex | Replaced with clean `<Redirect href="/masters/rolespermissions" />` |
| `app/transport/trips.tsx` | Used `AppLayout` (tab wrapper with footer) instead of `ScreenLayout` (sub-screen wrapper) | Changed to `ScreenLayout` |
| `app/transport/routes.tsx` | Used `AppLayout` instead of `ScreenLayout`; route list showed `route.name` (wrong field) | Changed to `ScreenLayout`; fixed display to `route.route_name` + `starting_stop → ending_stop` |
| `app/transport/vehicles.tsx` | Used `AppLayout` instead of `ScreenLayout` | Changed to `ScreenLayout` |
| `app/admin/users.tsx` | Used `AppLayout` instead of `ScreenLayout`; was a placeholder | Changed to `ScreenLayout`; rebuilt as user stats hub with staff/student counts |
| `app/admin/menu.tsx` | Used `AppLayout` instead of `ScreenLayout` | Changed to `ScreenLayout` |
| `app/reports/transport-reports.tsx` | Routes list showed `route.name` (wrong field, always undefined) | Fixed to `route.route_name`; added `starting_stop → ending_stop` subtext |

---

## Toast Notifications Rollout (v1.5.0)

All CRUD mutation operations across every module now surface toast feedback using `useToastContext()` from `components/ToastProvider.tsx`.

### Files updated with `showSuccess` / `showError` toasts

| Module | Files |
| ------ | ----- |
| Expense | `categories.tsx`, `types.tsx`, `transactions.tsx` |
| Communication | `(tabs)/communication.tsx` |
| Masters | `academicyears.tsx`, `holidays.tsx`, `subjectcategories.tsx`, `rolespermissions.tsx`, `classsubjectmappings.tsx`, `subjects.tsx`, `timetable.tsx`, `classesandsections.tsx` |
| Students | `attendance.tsx`, `certificates.tsx`, `certificateupload.tsx`, `documents.tsx`, `studentcertificates.tsx`, `transport.tsx` |
| Transport | `pricing.tsx`, `route-stops.tsx` |
| Exam | `[id].tsx`, `create.tsx`, `marks.tsx`, `hall-tickets.tsx`, `results.tsx` |
| Fees | `receipts.tsx`, `class-mappings.tsx`, `collection.tsx`, `student-mappings.tsx`, `term-amounts.tsx`, `terms.tsx`, `types.tsx` |

### Pattern

```typescript
// Import
import { useToastContext } from '@/components/ToastProvider';

// In component
const { showSuccess, showError } = useToastContext();

// In mutation onSuccess / onError
onSuccess: () => { showSuccess('Item Created', 'Successfully saved.'); },
onError: (err) => { showError('Failed', err.message); },
```

**Rule:** `Alert.alert` is preserved only for destructive confirmation dialogs (delete confirm) and form validation errors. All mutation result feedback uses toasts.

---

## UI Overhauls & Bug Fixes (v1.6.0)

### Screen Redesigns — Matching Web App

| File | Change | Details |
|------|--------|---------|
| `app/students/admission.tsx` | Complete rewrite | List-first with rich cards (Admission No, Name, Class, Section, Year, Date, Status, Actions); eye-icon opens scrollable view modal with 34 detail fields; 6-step create form: 2-col layouts, calendar date picker (button-triggered), Indian states dropdown, district/mandal text inputs, Yes/No previous school dropdown, web-matched card summary; toggle active status via `studentAdmissionsApi.toggleActiveStatus()` |
| `app/students/attendance.tsx` | `StaffAttendanceView` redesign | Compact 3-column filter row (Class / Section / Date); "Refresh" and "Save Attendance" action buttons; Present / Absent / Late stats cards; local `statusMap` state pre-populated from fetched records; P/A/L segmented buttons per row; "Mark All" quick row; bulk save via `useMutation` |
| `app/students/transport.tsx` | Complete redesign | "Student Transport Assignments" header with "+ Assign Transport" button; search bar (student/route/stop); table with horizontal scroll — columns: S.No, Student (bold), Trip, Route, Stop, Fee/Term, Edit/Delete icons; Assign form moved to bottom-sheet `Modal`; uses `ScreenLayout` |

### Bug Fixes

| File | Issue | Fix |
|------|-------|-----|
| `src/api/students.ts` | `listCertificates` returned `response.data` which was `{ items: [...] }` (paginated object, not array) — caused `t3.map is not a function` crash in `AdminCertificates` | Changed to `return response.data?.items ?? response.data ?? []` |
| `app/students/studentcertificates.tsx` | `certsRaw` defaulted to `[]` but could be a paginated object `{ items: [...] }` when API returned it, bypassing the `= []` default | Added `Array.isArray(certsRaw) ? certsRaw : (certsRaw as any)?.items ?? []` guard in `useMemo` |

---

## Bug Fixes (v1.5.1)

| File | Issue | Fix |
|------|-------|-----|
| `src/api/students.ts` | `getAdmissionTypesDropdown` typed as `{ id: string; name: string }[]` — wrong; backend returns `{ value, label }` | Fixed return type to `{ value: string; label: string }[]` |
| `app/students/admission.tsx` | Default `admission_type` set to `'Non-Primary Admission'` (display string) — backend expects `'non_primary'` | Changed default and reset value to `'non_primary'` |
| `app/students/admission.tsx` | Dropdown options used `value: 'Primary Admission'` / `'Non-Primary Admission'` — wrong enum values sent to API | Fixed to `value: 'primary'` / `'non_primary'`; options now loaded from `GET /students/admission/admission-types/dropdown` via `useQuery` |
| `app/students/admission.tsx` | `admission_type` was missing from the create payload (`StudentAdmissionCreate`) — backend never received it | Added `admission_type: formData.admission_type as 'primary' \| 'non_primary'` to the create `apiData` object |

## Bug Fixes (v1.4.0)

| File | Issue | Fix |
|------|-------|-----|
| `src/api/hooks/students/transport.ts` | Imported `studentTransportApi` from `../../masters` (OLD schema: `route_id`, `trip_type`, `fare_amount`) — all hooks used wrong API methods and types | Changed import to `../../students`; replaced `StudentTransport` type with `StudentTransportOut`; replaced `getStudentTransports()` calls with `listStudentTransport()`; removed unsupported `route_id` filter param |
| `app/transport/student-transport.tsx` | Imported from `'../../src/api'` (re-exports OLD masters schema); form used `route_id`, `trip_type`, `academic_year_id`, `fare_amount`; display used `route_name` on wrong nested path | Complete rewrite: now imports `studentTransportApi` directly from `@/src/api/students`; form flow changed to Student → Trip → Stop (filtered by trip's `route_id`) → `fee_per_term`; display uses `item.trip.route.route_name`, `item.stop.name`, `item.stop.pickup_time` |
| `app/expense/audit.tsx` | Was a placeholder with "Audit logs will be displayed here" — no real data | Full implementation: filterable audit log list using `GET /expense/audit/logs`; action-colored badges; category filter chips (All / transaction / approval / payment / document); search bar; shows actor, role, timestamp, notes |
| `src/api/expense.ts` | `expenseAuditApi` only had per-transaction endpoints; no global audit log endpoint existed | Added `getGlobalAuditLogs(params?)` calling `GET /expense/audit/logs` with filter support: `skip`, `limit`, `transaction_id`, `action`, `action_category`, `actor_user_id` |
| `src/types/expense.ts` | `ExpenseAuditLog` type missing backend fields: `actor_username`, `actor_role`, `created_at`, `action_category`, `action_notes`, `request_ip_address` | Added all missing fields as optional — backward-compatible; existing code unaffected |
| `hooks/use-expense-protected.ts` | No hook for global audit logs | Added `useExpenseGlobalAuditLogsProtected(params?)` using `PERMISSION_RESOURCES.EXPENSE_AUDIT` |
| `src/api/index.ts` | `staffProfileApi` from `profile.ts` was not exported — screens importing from `@/src/api` could not access staff profile API | Added `staffProfileApi` to the profile section exports |

## Bug Fixes (v1.3.0)

| File | Issue | Fix |
|------|-------|-----|
| `app/(tabs)/index.tsx` | Dashboard wrapped in `<PermissionGuard resourceConstant="profile" actionConstant="read_own">` — roles without that permission saw blank/access-denied screen after login | Removed `PermissionGuard` wrapper and import; dashboard is now accessible to all authenticated users |
| `app/(tabs)/index.tsx` | Exam module had no dashboard card despite fully built screens at `app/(tabs)/exam.tsx` and `app/exam/*` | Added Exam entry to `MODULES` array (`color: #EC4899`, `resource: 'exams'`, `route: '/(tabs)/exam'`) |
| `app/(tabs)/index.tsx` | All 6 module cards shown to every user with no permission check | Added `resource` field to all MODULES entries; added `accessibleModules` filter using `hasPermission()`; added empty state for roles with no module access |
| `app/(tabs)/index.tsx` | Hero stats bar displayed hardcoded `1,250 / 85 / ₹2.5M` — misleading for all schools | Removed entire stats bar and all related style entries (`heroStatsBar`, `heroStatItem`, `heroStatNum`, `heroStatLabel`, `heroStatDivider`) |
| `app/(tabs)/index.tsx` | Module routes used bare paths (`/students`) instead of tab group paths | Fixed all routes to `/(tabs)/students`, `/(tabs)/fees`, etc. |
| `components/AppHeader.tsx` | Search icon button had no `onPress` handler — appeared interactive but did nothing | Added `disabled={true}` and `opacity: 0.4` until search feature is implemented |

## Bug Fixes (v1.2.0)

| File | Issue | Fix |
|------|-------|-----|
| `app/students/admission.tsx` | Admission Date field was a `TouchableOpacity` only — could not type date manually; `DateTimePicker` used `display="calendar"` which fails on some Android versions | Replaced with `TextInput` (manual DD/MM/YYYY entry with auto-slash) + calendar icon button; changed `display` to `"default"`; moved to unified `activeDateField` pattern |
| `app/students/admission.tsx` | Date of Birth field (step 1) was a plain `TextInput` with no date picker | Replaced with `renderDateField` — same DD/MM/YYYY TextInput + calendar icon + native picker |
| `app/staff/enrollment.tsx` | Date of Birth and Joining Date were `TouchableOpacity`-only buttons — could not type date manually; `DateTimePicker` rendered inside `ScrollView` | Replaced with `TextInput` + calendar icon buttons; unified `activeDateField` pattern; `DateTimePicker` moved outside `ScrollView` |
| `app/fees/terms.tsx` | Fee Term Date was a `TouchableOpacity`-only button — could not type date manually | Replaced with `TextInput` + calendar icon; `DateTimePicker` onChange updated to use `event.type === 'set'` pattern; term date list now displays in DD/MM/YYYY format |

## Bug Fixes (v1.1.0)

| File | Issue | Fix |
|------|-------|-----|
| `contexts/AuthContext.tsx` | `logout()` dispatched `SET_LOADING: true` → unmounted tab screens before `router.replace` could run | Removed `SET_LOADING` dispatch; logout now only dispatches `LOGOUT` in `finally` |
| `services/authUtils.ts` | `logoutUser()` awaited `POST /auth/logout` before clearing tokens → hung if token refresh triggered | Now clears AsyncStorage first; API call fires in background (fire-and-forget) |
| `app/(tabs)/profile.tsx` | Logout button called `logout()` but never navigated — relied on unreliable `useEffect` in `_layout.tsx` | Added explicit `router.replace('/login')` after `logout()` |
| `app/(tabs)/settings.tsx` | No logout button existed | Added Sign Out button with `router.replace('/login')` |
| `src/api/auth.ts` | `refreshToken()` hardcoded `http://localhost:8003` and `cschema: 'test_tenant'` | Now uses `EXPO_PUBLIC_API_URL` env var and reads stored `@auth/client_schema` |
| `src/api/students.ts` | `createCertificate` used `/student/certificates/` (singular prefix) | Fixed to `/students/certificates/` |
| `src/api/students.ts` | All `certificateTypesApi` methods used `/student/certificate-types` | Fixed to `/students/certificate-types` |
| `src/api/masters.ts` | `routesApi.getRoutes/getAllRoutes`, `vehiclesApi.getVehicles`, `routeStopsApi.getRouteStops`, `tripsApi.getTrips` returned `response.data` directly | Now returns `response.data.items \|\| response.data` to handle paginated responses |
| `src/api/masters.ts` | `parentApi.updateAuthenticatedParentProfile()` used `/profile/parent` | Fixed to `/profile/parent/me` |
| `src/api/profile.ts` | `parentProfileApi.updateProfile()` used `/profile/parent` while get used `/profile/parent/me` | Fixed to `/profile/parent/me` |

---

---

## Security & Functional Audit (v1.6.5) — March 2026

Backend audit performed against 588 API endpoints. All issues verified against Python source before fixing.
Full details: `memory/security-audit.md`

### Fixes Applied

| ID | Severity | File(s) | Fix |
| --- | --- | --- | --- |
| S-2 | Security | `services/authUtils.ts` | JWT tokens (`access_token`, `refresh_token`, `token_expiry`, `change_password_token`) migrated from `AsyncStorage` to `expo-secure-store` (OS Keychain / Keystore); non-sensitive data (user, role, permissions, menu, student) stays in `AsyncStorage`; `secureDelete` wraps `deleteItemAsync` to silently ignore missing keys (iOS safety). On web, `Platform.OS === 'web'` check falls back to `AsyncStorage` with `@secure/` prefix (v1.9.0) |
| H-1 | High | `contexts/AuthContext.tsx` | `refreshAuth()` now restores `selectedStudent`, `availableStudents`, `studentId` from AsyncStorage and calls `setSelectedStudentForInterceptor` — parent context no longer lost after set-password redirect |
| H-4 | High | `contexts/AuthContext.tsx` | `setSelectedStudentForInterceptor` moved before `dispatch(LOGIN_SUCCESS)` — X-Student-ID headers are set before navigation fires |
| M-1 | Medium | `contexts/AuthContext.tsx`, `services/authUtils.ts` | All auth `console.log`/`console.warn` calls wrapped in `if (__DEV__)` — usernames and token lifecycle events no longer written to device log in production |
| M-1 | Medium | `src/api/client.ts` | `console.log(config.data)` removed from request interceptor (prevented plaintext password exposure via `adb logcat`); all remaining interceptor logs gated behind `__DEV__` |
| M-2 | Medium | `services/authUtils.ts` | `initializeAuth()` now runs `isAuthenticated()` sequentially first — prevents stale user data being returned while tokens are being cleared |
| M-3 | Medium | `src/api/mobilePermissions.ts` | Removed broken `useMobileAuthStore` import; `checkPermission`/`checkBulkPermissions` now accept explicit `userId`; `initializePermissionSync` returns unsubscribe handle to prevent listener leaks |
| M-3 | Medium | `src/api/client.ts` | Removed dead offline sync queue — `offlineStorage.addToSyncQueue` was called but queue was never drained; removed unused `offlineStorage` import |
| M-4 | Medium | `contexts/AuthContext.tsx` | `LOGIN_SUCCESS` action now carries `selectedStudent` + `availableStudents`; all three fields (auth + student context) committed atomically in one dispatch — React state no longer lags behind axios headers |
| M-5 | Medium | `services/authUtils.ts` | `clearAuthData()` wrapped in inner try/catch inside `refreshAccessToken` catch — guaranteed to return `null`, never re-throws |
| H-fee | High | `src/api/fees.ts`, `app/fees/refunds.tsx`, `hooks/use-fee-permissions.ts` | `FeeRefundApproveRequest` fields `action` and `approval_remarks` were always required by backend but never sent; added approve/reject modal with required remarks `TextInput`; updated `useApproveFeeRefund` to pass full payload |
| S-3 | Security | `components/PermissionDebugger.tsx`, `components/AuthStateDebugger.tsx`, `components/QuickDiagnostic.tsx`, `app/permission-test.tsx` | Added `if (!__DEV__) return null` guard — debug screens exposing full auth state are invisible in production builds |
| L-2 | Low | `services/authUtils.ts`, `contexts/AuthContext.tsx` | Extracted `normalisePermissions()` helper; all 3 copy-paste sites replaced |
| L-3 | Low | `contexts/AuthContext.tsx` | Added `stateRef = useRef(state)` + sync `useEffect`; `selectStudent`/`setAvailableStudents` now read `stateRef.current` — stale closure eliminated |
| L-4 | Low | `contexts/AuthContext.tsx` | `import { ActivityIndicator, Text, View }` moved from bottom of file to line 2 |
| L-5 | Low | `app/(tabs)/index.tsx` | Administration tile `alwaysShow: true` replaced with `resources: ['users','roles','staff']` — hidden from students/parents |
| L-6 | Low | `app/set-password.tsx` | Password validation changed to `newPassword.trim().length < 8` — spaces-only passwords rejected |
| L-1 | Low | `src/api/mobilePermissions.ts` | `getCacheMetadata` parameter renamed to `_userId` to suppress unused-parameter lint warning |

### Known Remaining Issues

| ID | Severity | Description |
| --- | --- | --- |
| S-4 | Security | No SSL certificate pinning — standard axios with no pinning |

---

*COS360 School Management System — Implementation Status*
*v1.9.0 — March 2026*
