# COS360 Android App — Requirements Document

**Version:** 1.0
**Date:** 2026-03-14
**Project:** COS360 School Management System — Android Client

---

## 1. Overview

COS360 is a multi-tenant school management platform with a FastAPI backend (PostgreSQL, Redis, S3). The Android app will serve as the primary mobile client for **Students**, **Parents**, **Teachers**, **Staff**, and **Admins** — each with role-specific dashboards and features.

### 1.1 Objectives

- Provide mobile-first access to all COS360 modules
- Role-based UI: each user sees only what their permissions allow
- Offline-capable for critical workflows (attendance, mark entry)
- Push notifications for communication, exam results, fee reminders
- Secure multi-tenant architecture with JWT auth

### 1.2 Target Users & Roles

| Role | Primary Use Cases |
|------|-------------------|
| **Admin** | Full management — users, roles, permissions, reports, settings |
| **Staff** | Enrollment, HR, fee collection, expense management |
| **Teacher** | Mark entry, attendance, class management, timetable |
| **Student** | View results, fees, certificates, timetable, homework |
| **Parent** | View child's results, fees, attendance, communicate with school |

---

## 2. Technical Architecture

### 2.1 Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Language | **Kotlin** | Official Android language, coroutine support |
| UI | **Jetpack Compose** | Modern declarative UI, Material 3 |
| Architecture | **MVVM + Clean Architecture** | Separation of concerns, testability |
| Navigation | **Compose Navigation** | Type-safe, deep-link support |
| Networking | **Retrofit + OkHttp** | Mature HTTP client, interceptor support |
| Serialization | **Kotlinx Serialization** or **Moshi** | JSON parsing |
| DI | **Hilt (Dagger)** | Google-recommended DI |
| Local DB | **Room** | Offline caching, SQLite abstraction |
| Image Loading | **Coil** | Kotlin-first, Compose-native |
| Auth Storage | **EncryptedSharedPreferences** | Secure token storage |
| Push | **Firebase Cloud Messaging (FCM)** | Push notifications |
| File Upload | **OkHttp MultipartBody** | S3-compatible uploads |
| PDF Viewer | **AndroidPdfViewer** or **PdfRenderer** | Hall tickets, receipts |

### 2.2 API Integration

**Base URL Configuration:**
```
Dev:     http://10.0.2.2:8000/api/v1   (emulator → localhost)
Staging: https://staging-api.cos360.com/api/v1
Prod:    https://api.cos360.com/api/v1
```

**Required Headers (every request):**
```
Authorization: Bearer <access_token>
cschema: <tenant_name>
Content-Type: application/json
```

**Multi-Tenancy:** The app must send the `cschema` header derived from the tenant the user logged into. This is determined at login time and stored locally.

### 2.3 Authentication Flow

```
┌─────────────┐     POST /auth/login      ┌──────────────┐
│  Login       │ ─────────────────────────→│  Backend     │
│  Screen      │                           │              │
│              │←─────────────────────────│              │
│  (email +    │  { access_token,          │  JWT issued  │
│   password + │    refresh_token,         │              │
│   tenant)    │    is_first_login }       └──────────────┘
└─────────────┘
       │
       ├── is_first_login == true ──→ Force password change screen
       │                                POST /auth/staff/set-password
       │
       └── Normal ──→ Home Dashboard (role-based)
```

**Token Lifecycle:**
1. Store tokens in EncryptedSharedPreferences
2. Attach access token to every request via OkHttp Interceptor
3. On 401 response → attempt silent refresh via `POST /auth/refresh`
4. If refresh fails → redirect to login screen
5. On logout → call `POST /auth/logout` to blacklist tokens

### 2.4 Offline Strategy

| Data | Strategy | Sync |
|------|----------|------|
| Academic year, classes, sections | Cache on login | Refresh on app open |
| Timetable | Cache daily | Refresh daily |
| Attendance (teacher) | Queue locally | Sync on connectivity |
| Mark entry (teacher) | Queue locally | Sync on connectivity |
| Fee summary (student/parent) | Cache with TTL | Refresh on pull |
| Exam results | Cache after fetch | Immutable once published |

Use Room database for offline storage. Implement a `SyncManager` that runs on network restoration.

---

## 3. Feature Modules

### 3.1 Authentication & Onboarding

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| AUTH-01 | Login (email/username + password + tenant selection) | P0 | All |
| AUTH-02 | Academic year selection (after login) | P0 | All |
| AUTH-03 | First-login password change | P0 | Staff, Teacher |
| AUTH-04 | Token refresh (silent, automatic) | P0 | All |
| AUTH-05 | Logout (blacklist tokens) | P0 | All |
| AUTH-06 | Remember me / biometric unlock | P1 | All |
| AUTH-07 | Forgot password flow | P2 | All |
| AUTH-08 | Tenant auto-detect (from org code / QR) | P2 | All |

**API Endpoints:**
- `POST /auth/login`
- `POST /auth/staff/set-password`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/academic-years`

---

### 3.2 Dashboard (Home Screen)

Role-specific home screens with summary cards and quick actions.

**Admin Dashboard:**
- Total students / staff count
- Fee collection summary (today / month)
- Pending approvals count
- Quick links: Add Student, Fee Collection, Reports

**Teacher Dashboard:**
- Today's timetable
- Pending mark entries
- Attendance status (today)
- Quick links: Mark Attendance, Enter Marks

**Student Dashboard:**
- Upcoming exams
- Fee due summary
- Attendance percentage
- Recent results / grades

**Parent Dashboard:**
- Children switcher (if multiple children)
- Each child's fee status, attendance %, recent results
- School announcements

---

### 3.3 Student Management

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| STU-01 | Student list (paginated, searchable) | P0 | Admin, Staff |
| STU-02 | Student profile view | P0 | All (scoped) |
| STU-03 | Student admission (create) | P1 | Admin, Staff |
| STU-04 | Student profile update | P1 | Admin, Staff |
| STU-05 | Parent link management | P1 | Admin, Staff |
| STU-06 | Document upload (camera + gallery) | P1 | Admin, Staff |
| STU-07 | Document viewer (PDF, images) | P1 | All (scoped) |
| STU-08 | Student certificate view | P1 | Student, Parent |
| STU-09 | Student transport assignment view | P2 | Student, Parent |

**API Endpoints:**
- `GET /students/admission` — List/search
- `POST /students/admission` — Create
- `PUT /students/admission/{id}` — Update
- `GET /students/admission/{id}` — Detail
- `POST /students/documents` — Upload (multipart)
- `GET /students/documents/{doc_id}` — Download
- `GET /students/certificates` — List
- `GET /students/{student_id}/transport` — Transport info

---

### 3.4 Attendance

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| ATT-01 | Mark attendance (class-section selector → student list → toggle) | P0 | Teacher |
| ATT-02 | View today's attendance status | P0 | Student, Parent |
| ATT-03 | Attendance summary (monthly/yearly %) | P0 | Student, Parent, Teacher |
| ATT-04 | Staff attendance marking | P1 | Admin |
| ATT-05 | Bulk attendance import | P2 | Admin |

**Offline:** Teachers should be able to mark attendance offline. Queue locally, sync when connected.

---

### 3.5 Exam Management

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| EXM-01 | View exam list (upcoming, past) | P0 | All |
| EXM-02 | View exam schedule / dates | P0 | Student, Parent, Teacher |
| EXM-03 | Mark entry (subject → student list → enter marks) | P0 | Teacher |
| EXM-04 | View results / grade card | P0 | Student, Parent |
| EXM-05 | View hall ticket (PDF) | P0 | Student |
| EXM-06 | Create / configure exam | P1 | Admin |
| EXM-07 | Add class-sections to exam | P1 | Admin |
| EXM-08 | Configure subjects & grading | P1 | Admin |
| EXM-09 | Mark permission management | P1 | Admin |
| EXM-10 | Publish / lock results | P1 | Admin |
| EXM-11 | Exam pattern templates | P2 | Admin |
| EXM-12 | Exam notifications (push) | P1 | All |

**Mark Entry UX (Teacher):**
```
Select Exam → Select Class-Section → Select Subject
→ Student list with mark input fields
→ Save (validates marks ≤ max_marks)
→ Submit confirmation
```

**API Endpoints:**
- `GET /exams` — List exams
- `GET /exams/{id}` — Exam detail
- `GET /exams/{id}/class-sections` — Classes in exam
- `GET /exams/{exam_id}/subjects/{section_id}` — Subject configs
- `POST /mark-entry/{exam_id}` — Submit marks
- `GET /exam-results/{exam_id}` — Results
- `GET /hall-tickets/{exam_id}` — Hall ticket PDF

---

### 3.6 Fee Management

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| FEE-01 | Search student for fee collection | P0 | Admin, Staff |
| FEE-02 | View fee summary (term-wise breakdown) | P0 | All (scoped) |
| FEE-03 | Fee payment (collect payment + generate receipt) | P0 | Admin, Staff |
| FEE-04 | View / download payment receipt (PDF) | P0 | All |
| FEE-05 | My fee summary (student self-service) | P0 | Student |
| FEE-06 | Child fee summary (parent self-service) | P0 | Parent |
| FEE-07 | Fee concession management | P1 | Admin |
| FEE-08 | Old fee management (carry-forward) | P1 | Admin |
| FEE-09 | Fee structure setup (terms, categories, types) | P2 | Admin |
| FEE-10 | Fee class/student mappings | P2 | Admin |
| FEE-11 | Fee defaulter list | P1 | Admin, Staff |
| FEE-12 | Fee refund management | P2 | Admin |

**Fee Collection UX (Staff):**
```
Search Student (admission no / mobile / name)
→ View fee summary (paid, pending, overdue per term)
→ Select items to pay → Enter amount → Select payment method
→ Confirm → Receipt generated
→ Print / share receipt
```

**API Endpoints:**
- `GET /fee/collection/search-student` — Multi-criteria search
- `GET /fee/collection/summary/{student_id}` — Fee breakdown
- `GET /fee/collection/my-summary` — Student self-service
- `POST /fee/collection/pay` — Process payment
- `GET /fee/collection/payment-receipt/{receipt_id}` — Receipt
- `GET /fee/concessions` — Concession list
- `POST /fee/concessions` — Create concession
- `GET /fee/old-fees` — Old fees list

---

### 3.7 Transport

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| TRN-01 | View assigned route / vehicle / trip | P1 | Student, Parent |
| TRN-02 | View route stops with timing | P1 | Student, Parent |
| TRN-03 | Route management (CRUD) | P2 | Admin |
| TRN-04 | Vehicle management (CRUD) | P2 | Admin |
| TRN-05 | Student transport assignment | P2 | Admin |
| TRN-06 | Transport pricing management | P2 | Admin |

---

### 3.8 Communication & Notifications

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| COM-01 | Push notification reception (FCM) | P0 | All |
| COM-02 | In-app notification center | P0 | All |
| COM-03 | View notification history | P1 | All |
| COM-04 | Create & send notifications | P1 | Admin, Staff |
| COM-05 | Message template management | P2 | Admin |
| COM-06 | Preview recipient count before send | P1 | Admin, Staff |

**Push Notification Integration:**
- Register FCM device token on login
- Backend sends push via FCM for: exam dates, results, fee reminders, announcements
- Deep links: notification tap → relevant screen (exam detail, fee summary, etc.)

**API Endpoints:**
- `GET /communication/logs` — Notification history
- `POST /communication/send` — Send notification
- `GET /communication/preview-count` — Recipient count
- `GET /communication/templates` — Templates

---

### 3.9 Timetable

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| TT-01 | View weekly timetable (class-section) | P0 | Student, Parent, Teacher |
| TT-02 | Today's schedule (quick view) | P0 | Student, Teacher |
| TT-03 | Timetable management (CRUD) | P2 | Admin |

---

### 3.10 Reports & Analytics

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| RPT-01 | Fee collection dashboard (charts) | P1 | Admin |
| RPT-02 | Attendance analytics (charts) | P1 | Admin |
| RPT-03 | Student report export (PDF/Excel) | P2 | Admin |
| RPT-04 | Staff report export | P2 | Admin |
| RPT-05 | Financial summary | P2 | Admin |

**API Endpoints:**
- `GET /reports/students`
- `GET /reports/staff`
- `GET /reports/fees`
- `GET /reports/attendance`
- `GET /reports/financial`

---

### 3.11 Expense Management

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| EXP-01 | View expense transactions | P2 | Admin, Staff |
| EXP-02 | Create expense entry (with camera receipt) | P2 | Staff |
| EXP-03 | Expense approval workflow | P2 | Admin |
| EXP-04 | Expense categories / types setup | P2 | Admin |
| EXP-05 | Expense reports | P2 | Admin |

---

### 3.12 Admin Features

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| ADM-01 | User management (list, search, status) | P1 | Admin |
| ADM-02 | Role management | P2 | Admin |
| ADM-03 | Permission management | P2 | Admin |
| ADM-04 | Menu management | P2 | Admin |
| ADM-05 | Academic year management | P1 | Admin |
| ADM-06 | Class / section management | P1 | Admin |
| ADM-07 | Subject management | P2 | Admin |
| ADM-08 | Holiday management | P2 | Admin |

---

### 3.13 Profile & Settings

| ID | Feature | Priority | Roles |
|----|---------|----------|-------|
| PRF-01 | View own profile | P0 | All |
| PRF-02 | Edit profile (limited fields) | P1 | All |
| PRF-03 | Change password | P0 | All |
| PRF-04 | App language selection | P2 | All |
| PRF-05 | Notification preferences | P2 | All |
| PRF-06 | Theme (light/dark) | P2 | All |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target |
|--------|--------|
| App cold start | < 2 seconds |
| Screen transition | < 300ms |
| API response (cached) | < 100ms |
| API response (network) | < 3 seconds |
| Offline data access | < 500ms |
| List scroll (60 fps) | No frame drops |

### 4.2 Security

- **Token storage:** EncryptedSharedPreferences (AES-256)
- **Certificate pinning:** Required for production API endpoints
- **No sensitive data in logs:** Strip tokens, passwords from log output
- **Root/jailbreak detection:** Warn user, optionally block
- **ProGuard/R8:** Code obfuscation for release builds
- **Biometric auth:** Optional fingerprint/face unlock for app re-entry
- **Session timeout:** Auto-lock after 15 minutes of inactivity
- **Secure WebView:** Disable JavaScript where not needed

### 4.3 Compatibility

| Spec | Requirement |
|------|-------------|
| Min SDK | API 26 (Android 8.0) |
| Target SDK | API 35 (Android 15) |
| Screen sizes | Phone + Tablet (responsive) |
| Orientations | Portrait primary, landscape for mark entry / timetable |
| Languages | English (default), Hindi, Telugu (Phase 2) |

### 4.4 Accessibility

- Material 3 dynamic color support
- Content descriptions on all interactive elements
- Minimum touch target: 48dp
- Support for system font scaling
- High contrast mode support

### 4.5 Data & Storage

| Item | Limit |
|------|-------|
| Offline cache size | Max 100 MB |
| Image cache | Max 50 MB (auto-evict LRU) |
| File upload | Max 10 MB per file |
| Supported formats | PDF, JPG, JPEG, PNG, DOCX |

---

## 5. Screen Inventory

### 5.1 Core Screens (P0 — MVP)

| # | Screen | Role(s) |
|---|--------|---------|
| 1 | Splash / Loading | All |
| 2 | Login | All |
| 3 | Academic Year Selector | All |
| 4 | First-Login Password Change | Staff, Teacher |
| 5 | Home Dashboard | All (role-specific) |
| 6 | Profile View | All |
| 7 | Change Password | All |
| 8 | Student List | Admin, Staff, Teacher |
| 9 | Student Detail | All (scoped) |
| 10 | Attendance — Mark (class selector → toggle list) | Teacher |
| 11 | Attendance — My Summary | Student, Parent |
| 12 | Exam List | All |
| 13 | Exam Detail / Schedule | All |
| 14 | Mark Entry (subject → student list → input) | Teacher |
| 15 | Results / Grade Card | Student, Parent |
| 16 | Hall Ticket Viewer (PDF) | Student |
| 17 | Fee Summary | All (scoped) |
| 18 | Fee Collection — Search Student | Admin, Staff |
| 19 | Fee Collection — Pay | Admin, Staff |
| 20 | Fee Receipt Viewer (PDF) | All |
| 21 | Timetable (weekly grid) | Student, Parent, Teacher |
| 22 | Notification Center | All |

### 5.2 Extended Screens (P1)

| # | Screen | Role(s) |
|---|--------|---------|
| 23 | Student Admission Form | Admin, Staff |
| 24 | Document Upload | Admin, Staff |
| 25 | Document Viewer | All (scoped) |
| 26 | Fee Concession Management | Admin |
| 27 | Fee Defaulter List | Admin, Staff |
| 28 | Old Fee Management | Admin |
| 29 | User Management List | Admin |
| 30 | Academic Year Management | Admin |
| 31 | Class / Section Management | Admin |
| 32 | Send Notification | Admin, Staff |
| 33 | Notification History | All |
| 34 | Fee Dashboard (charts) | Admin |
| 35 | Attendance Dashboard (charts) | Admin |

### 5.3 Admin Screens (P2)

| # | Screen | Role(s) |
|---|--------|---------|
| 36 | Role Management | Admin |
| 37 | Permission Management | Admin |
| 38 | Menu Management | Admin |
| 39 | Subject Management | Admin |
| 40 | Holiday Management | Admin |
| 41 | Transport — Routes | Admin |
| 42 | Transport — Vehicles | Admin |
| 43 | Transport — Assignments | Admin |
| 44 | Transport — Pricing | Admin |
| 45 | Transport — My Route (Student View) | Student, Parent |
| 46 | Expense — Transactions | Admin, Staff |
| 47 | Expense — Create Entry | Staff |
| 48 | Expense — Approvals | Admin |
| 49 | Report Export | Admin |
| 50 | Template Management | Admin |
| 51 | Fee Structure Setup | Admin |
| 52 | App Settings | All |

---

## 6. Navigation Structure

```
Bottom Navigation (4-5 tabs, role-dependent):

STUDENT / PARENT:
  ├── Home (Dashboard)
  ├── Academics (Exams, Results, Timetable)
  ├── Fees (Summary, Receipts)
  ├── Notifications
  └── Profile

TEACHER:
  ├── Home (Dashboard, Today's Schedule)
  ├── Classes (Attendance, Students)
  ├── Exams (Mark Entry, Results)
  ├── Notifications
  └── Profile

ADMIN / STAFF:
  ├── Home (Dashboard, Quick Actions)
  ├── Students (List, Admission, Documents)
  ├── Fees (Collection, Concessions, Reports)
  ├── More (Exams, Transport, Expenses, Users, Reports)
  └── Profile
```

---

## 7. Push Notification Spec

### 7.1 Notification Types

| Type | Trigger | Deep Link Target |
|------|---------|-----------------|
| `exam_schedule` | Admin publishes exam dates | Exam Detail screen |
| `exam_result` | Admin publishes results | Results screen |
| `fee_reminder` | Scheduled (configurable) | Fee Summary screen |
| `fee_receipt` | Payment processed | Receipt viewer |
| `attendance_alert` | Student marked absent | Attendance summary |
| `announcement` | Admin sends notification | Notification detail |
| `password_expiry` | 7 days before expiry | Change Password screen |

### 7.2 Payload Format

```json
{
  "notification": {
    "title": "Exam Results Published",
    "body": "Results for Mid-Term Exam 2026 are now available"
  },
  "data": {
    "type": "exam_result",
    "exam_id": "uuid",
    "tenant": "tenant_name",
    "deep_link": "/exams/{exam_id}/results"
  }
}
```

---

## 8. Error Handling

### 8.1 Network Errors

| Scenario | Behavior |
|----------|----------|
| No internet | Show cached data + offline banner |
| Timeout (>30s) | Retry once, then show error with retry button |
| Server 500 | Show generic error, log to analytics |
| 401 Unauthorized | Silent token refresh → retry → if fail → login screen |
| 403 Forbidden | Show "Access Denied" message |
| 404 Not Found | Show "Not Found" screen |
| 409 Conflict | Show specific conflict message from API |
| Rate limited (429) | Show "Too many requests, try again in X seconds" |

### 8.2 Validation Errors

- Show field-level errors inline (red border + error text below field)
- Map API validation errors to form fields
- Show toast for non-field errors

---

## 9. Release Plan

### Phase 1 — MVP (8-10 weeks)

**Target:** Core workflows for all roles

- Login, auth flow, first-login password change
- Role-based dashboards
- Student list & detail view
- Attendance marking (teacher) & viewing (student/parent)
- Exam list, schedule, mark entry, results, hall tickets
- Fee summary, payment, receipt
- Timetable view
- Notification center
- Profile & change password

### Phase 2 — Extended Features (6-8 weeks)

- Student admission & document upload
- Fee concessions & old fees
- User management (admin)
- Send notifications
- Fee & attendance dashboards with charts
- Offline mode for attendance & mark entry
- Push notifications via FCM

### Phase 3 — Complete Platform (6-8 weeks)

- Transport module
- Expense management
- Report generation & export
- Role/permission/menu management
- Multi-language support
- Biometric unlock
- App settings & preferences
- Tablet-optimized layouts

---

## 10. Testing Requirements

| Type | Coverage Target | Tools |
|------|----------------|-------|
| Unit Tests | 80%+ (ViewModels, Repositories) | JUnit 5, Mockk |
| UI Tests | Critical flows | Compose Testing, Espresso |
| Integration Tests | API layer | MockWebServer |
| E2E Tests | Login → key workflows | Maestro or Appium |
| Performance | Startup, scroll, memory | Android Profiler, Macrobenchmark |
| Security | OWASP Mobile Top 10 | MobSF, manual review |

---

## 11. Analytics & Monitoring

- **Crash reporting:** Firebase Crashlytics
- **Analytics:** Firebase Analytics (screen views, key events)
- **Performance monitoring:** Firebase Performance
- **Key events to track:**
  - Login success/failure
  - Fee payment completed
  - Mark entry submitted
  - Notification opened
  - Screen load times

---

## 12. App Store Requirements

| Item | Detail |
|------|--------|
| Package name | `com.cos360.app` |
| Min Android | 8.0 (API 26) |
| Target Android | 15 (API 35) |
| App size target | < 30 MB (APK), < 50 MB (AAB) |
| Play Store category | Education |
| Required permissions | Internet, Camera, Storage, Notifications |
| Privacy policy | Required (student data, COPPA considerations) |
| Data safety form | Required (describe data collection) |

---

## Appendix A: API Endpoint Summary

| Module | Endpoint Count | Key Prefix |
|--------|---------------|------------|
| Auth | 15 | `/auth/` |
| Students | 40+ | `/students/` |
| Exams | 70+ | `/exams/`, `/mark-entry/`, `/exam-results/` |
| Fees | 50+ | `/fee/` |
| Transport | 35+ | `/masters/routes`, `/masters/vehicles` |
| Communication | 9 | `/communication/` |
| Expense | 38+ | `/expense/` |
| Reports | 27 | `/reports/` |
| Admin | 20+ | `/admin/`, `/auth/menus` |
| Masters | 80+ | `/masters/` |
| Profile | 15+ | `/profile/` |
| **Total** | **~400+** | |

## Appendix B: Data Models (Key Entities)

```
User { id, username, email, phone, role, is_active }
Student { id, first_name, last_name, dob, admission_no, class_id, section_id }
Staff { id, first_name, last_name, designation, email, phone }
Parent { id, father_name, mother_name, phone, salary_range }
Exam { id, name, academic_year_id, status, board_id }
FeeTransaction { id, student_id, amount, payment_method, status, receipt_no }
Attendance { id, student_id, date, status, marked_by }
Notification { id, channel, template_id, status, sent_at }
```

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| Tenant | A school/institution using COS360 |
| cschema | Tenant identifier sent as HTTP header |
| Academic Year | School year period (e.g., 2025-2026) |
| Admission Type | `primary` (new) or `non_primary` (transfer) |
| Mark Entry | Process of teachers entering exam scores |
| Fee Term | Payment period within academic year |
| Plan | Subscription tier determining available features |
