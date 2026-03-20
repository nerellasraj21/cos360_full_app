# COS360 Mobile App — Complete API Integration Guide

**Version:** 2.0
**Date:** 2026-03-19
**Replaces:** `COS360_Android_Requirements.md` (kept for architecture/UX reference)

This document is the **authoritative reference** for building the COS360 mobile app. It contains every API endpoint, exact request/response field names, required headers, permission requirements, error formats, and integration rules derived directly from the backend source code.

---

## Table of Contents

1. [API Configuration](#1-api-configuration)
2. [Authentication](#2-authentication)
3. [User Context & Permissions](#3-user-context--permissions)
4. [Standard Error Format](#4-standard-error-format)
5. [Masters / Reference Data](#5-masters--reference-data)
6. [Student Module](#6-student-module)
7. [Attendance Module](#7-attendance-module)
8. [Exam Module](#8-exam-module)
9. [Fee Module](#9-fee-module)
10. [Staff Module](#10-staff-module)
11. [Communication Module](#11-communication-module)
12. [Transport Module](#12-transport-module)
13. [Reports Module](#13-reports-module)
14. [Admin / Role Management](#14-admin--role-management)
15. [Profile Endpoints](#15-profile-endpoints)
16. [Parent & Child Endpoints](#16-parent--child-endpoints)
17. [Permission Matrix](#17-permission-matrix)
18. [Offline & Caching Strategy](#18-offline--caching-strategy)
19. [Common Pagination & Filter Patterns](#19-common-pagination--filter-patterns)

---

## 1. API Configuration

### Base URLs

| Environment | URL |
|-------------|-----|
| Emulator (localhost) | `http://10.0.2.2:8000/api/v1` |
| Physical device (local) | `http://<your-machine-ip>:8000/api/v1` |
| Staging | `https://staging-api.cos360.com/api/v1` |
| Production | `https://api.cos360.com/api/v1` |

### Required Headers (Every Request)

```
Authorization: Bearer <access_token>
cschema: <tenant_schema_name>
Content-Type: application/json
```

> **CRITICAL:** The `cschema` header identifies the tenant's database schema. Without it, all protected endpoints return `403`. Store it at login time alongside the token. The value comes from the login response's `tenant_schema` OR is the string the user enters as "school/tenant code" at login.

### Header for File Uploads

```
Authorization: Bearer <access_token>
cschema: <tenant_schema_name>
Content-Type: multipart/form-data
```

### Token Lifecycle

1. On login: store `access_token` + `refresh_token` in EncryptedSharedPreferences
2. Every request: attach access token via OkHttp Interceptor
3. On `401` response: call `POST /auth/refresh` silently
4. If refresh fails: redirect to login screen and clear stored tokens
5. On logout: call `POST /auth/logout` to blacklist both tokens

---

## 2. Authentication

### 2.1 Login

```
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "username": "string (required) — email, username, or admission number",
  "password": "string (required)",
  "client_name": "string (optional) — tenant schema name, e.g. test_tenant",
  "academic_year_id": "UUID (required) — selected at login"
}
```

> **Get academic years before login:** `GET /api/v1/auth/academic-years` — returns list of `{id, title, start_date, end_date, is_active}`. Let user pick one before submitting login.

**Success Response (200):**
```json
{
  "user": {
    "id": "UUID",
    "username": "string",
    "email": "string",
    "is_active": true
  },
  "role": {
    "id": "UUID",
    "name": "Admin | Staff | Teacher | Student | Parent",
    "description": "string | null"
  },
  "menu": [
    {
      "id": "UUID",
      "name": "string",
      "icon": "string | null",
      "path": "string | null",
      "order": 0,
      "children": []
    }
  ],
  "permissions": {
    "students": ["read", "list", "create", "update", "delete"],
    "exams": ["read", "list"],
    "fee_collection": ["read", "list", "create"]
  },
  "entity_id": "UUID | null — student_id / staff_id / parent_id depending on role",
  "academic_year_id": "UUID",
  "academic_year_title": "2025-2026",
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "is_first_login": true
}
```

> **IMPORTANT — First Login Flow:**
> - `is_first_login: true` means the user has never set their password
> - Show a mandatory "Set New Password" screen before proceeding
> - The response also contains `change_password_token` — this is a **separate short-lived token** (15 min) used ONLY for the set-password call
> - Default passwords: Staff → `Welcome@123`, Student → `student@123`, Parent → `parent@123`
> - Student usernames are their **admission number** (e.g., `NP2025001`), NOT their name

---

### 2.2 First-Login Password Change

```
POST /api/v1/auth/staff/set-password
```

> This endpoint handles ALL roles (Staff, Teacher, Student, Parent) — not just staff.

**Request Body:**
```json
{
  "change_password_token": "string (required) — from login response, valid 15 min",
  "new_password": "string (required) — min 8 chars",
  "confirm_password": "string (required) — must match new_password"
}
```

**Success Response (200):** Same structure as login response — contains new `access_token`, `refresh_token`, and full user context. Proceed directly to home screen.

---

### 2.3 Token Refresh

```
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Success Response (200):**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer"
}
```

---

### 2.4 Logout

```
POST /api/v1/auth/logout
```

**Request Body:**
```json
{
  "refresh_token": "string (required)"
}
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### 2.5 Academic Years (Pre-Login)

```
GET /api/v1/auth/academic-years
```
No auth headers required. Call before showing login screen.

**Response (200):**
```json
[
  {
    "id": "UUID",
    "title": "2025-2026",
    "start_date": "2025-06-01",
    "end_date": "2026-03-31",
    "is_active": true
  }
]
```

---

## 3. User Context & Permissions

After login, store these locally:

| Key | Source | Use |
|-----|--------|-----|
| `access_token` | Login response | Every API call |
| `refresh_token` | Login response | Token refresh |
| `cschema` | Derived from `client_name` entered at login | Every API call header |
| `user.id` | Login response | User identification |
| `role.name` | Login response | Role-gated UI |
| `permissions` | Login response | Show/hide features |
| `entity_id` | Login response | Own data access (student_id/staff_id/parent_id) |
| `academic_year_id` | Login response | All academic year scoped queries |

### Checking Permissions Before Showing UI

```kotlin
// Pseudocode — check before showing button/screen
fun hasPermission(resource: String, action: String): Boolean {
    val actions = permissions[resource] ?: return false
    return actions.contains(action)
}

// Example
if (hasPermission("students", "create")) showAdmissionButton()
if (hasPermission("exams", "list")) showExamMenu()
```

### Resource Names Used in Permissions

| Resource | Actions |
|----------|---------|
| `students` | create, read, list, update, delete |
| `exams` | create, read, list, update, delete |
| `exam_marks` | create, read, list, update |
| `fee_collection` | create, read, list |
| `fee_concessions` | create, read, list, update, delete |
| `fee_old` | create, read, list, update, delete |
| `staff` | create, read, list, update, delete |
| `attendance` | create, read, list, update, delete |
| `communication` | create, read, list, update, delete |
| `transport_pricing` | create, read, list, update, delete |
| `subjects` | read, list |
| `subject_categories` | read, list |
| `reports` | read, list |

---

## 4. Standard Error Format

All API errors return this JSON structure:

```json
{
  "error_code": "PERMISSION_ERROR",
  "message": "Access denied: you do not have permission to create students",
  "details": {
    "resource": "students",
    "action": "create"
  },
  "timestamp": "2026-03-19T10:30:00Z",
  "request_id": "abc123-def456",
  "cschema": "tenant_school1"
}
```

### Error Code Enum Values

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `VALIDATION_ERROR` | 422 | Invalid request fields |
| `AUTHORIZATION_ERROR` | 401 | Token missing/expired/invalid |
| `PERMISSION_ERROR` | 403 | No permission for this action |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `CONFLICT_ERROR` | 409 | Duplicate/conflicting data |
| `BUSINESS_RULE_ERROR` | 400 | Business logic violation |
| `RATE_LIMIT_ERROR` | 429 | Too many requests |
| `SYSTEM_ERROR` | 500 | Internal server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `SERVICE_UNAVAILABLE_ERROR` | 503 | Service temporarily down |

### Mobile Error Handling Rules

| Status | Action |
|--------|--------|
| `401` + `AUTHORIZATION_ERROR` | Silent token refresh → retry once → if still 401 → go to login |
| `403` + `PERMISSION_ERROR` | Show "You don't have access to this feature" snackbar |
| `404` | Show "Not found" screen |
| `409` | Show specific `message` from response in a dialog |
| `422` | Map `details.field` to inline form validation errors |
| `429` | Show "Too many requests — try again in X seconds" (parse from `message`) |
| `500` | Show generic error + "Retry" button; log to Crashlytics |

---

## 5. Masters / Reference Data

These endpoints provide dropdown data. Cache them for the session.

### 5.1 Academic Years

```
GET /api/v1/masters/academic-years/dropdown
GET /api/v1/masters/academic-years/               — Full list
GET /api/v1/masters/academic-years/{year_id}      — Single
```

### 5.2 Classes & Sections

```
GET /api/v1/masters/class_sections/class-list               — All classes
GET /api/v1/masters/class_sections/dropdown                 — Class dropdown
GET /api/v1/masters/class_sections/by_class_id/{class_id}/sections  — Sections for class
GET /api/v1/masters/class_sections/class-section-list       — All class+section pairs
```

**Class Response:**
```json
{
  "id": "UUID",
  "name": "Class 1",
  "short_name": "1",
  "sections": [
    { "id": "UUID", "name": "IIT A", "short_name": "A" }
  ]
}
```

### 5.3 Subjects

```
GET /api/v1/masters/subjects/dropdown
GET /api/v1/masters/subjects/                               — All subjects
GET /api/v1/masters/subjects/{subject_id}                   — Single
GET /api/v1/class-subject-mappings/{class_id}/subjects      — Subjects for a class
```

### 5.4 Holidays

```
GET /api/v1/masters/holidays/?academic_year_id={uuid}&active_only=true&skip=0&limit=50
```

### 5.5 Timetable

```
GET /api/v1/timetable/?class_id={uuid}&section_id={uuid}&academic_year_id={uuid}
GET /api/v1/timetable/{timetable_id}
```

---

## 6. Student Module

### 6.1 List / Search Students

```
GET /api/v1/students/admission/?skip=0&limit=20
    &q={search_text}
    &class_id={uuid}
    &section_id={uuid}
    &academic_year_id={uuid}
    &active_only=true
```

**Permission:** `students:list`

**Response:** Array of student objects (see 6.3 for fields).

---

### 6.2 Student Dropdown (Cascading Selector)

```
GET /api/v1/students/admission/students/dropdown?class_id={uuid}&section_id={uuid}&active_only=true
```

Returns minimal: `[{id, first_name, last_name, admission_number}]`

---

### 6.3 Student Detail

```
GET /api/v1/students/admission/id/{student_id}
GET /api/v1/students/admission/by-admission/{admission_number}
GET /api/v1/students/admission/my-admission                     — Student self-service
```

**Permission:** `students:read`

**Response:**
```json
{
  "id": "UUID",
  "admission_number": "NP2025001",
  "admission_date": "2025-06-01",
  "admission_type": "primary | non_primary",
  "academic_year_id": "UUID",
  "admitted_class_id": "UUID",
  "admitted_section_id": "UUID",
  "current_class_id": "UUID",
  "current_section_id": "UUID",
  "address_line1": "string",
  "address_line2": "string | null",
  "city": "string",
  "state": "string",
  "is_active": true,
  "student": {
    "id": "UUID",
    "first_name": "string",
    "last_name": "string",
    "date_of_birth": "2015-01-01",
    "gender": "Male | Female | Other",
    "aadhar_number": "string | null",
    "nationality": "Indian",
    "mother_tongue": "Telugu",
    "caste": "string | null",
    "community": "string | null"
  },
  "parents": [
    {
      "id": "UUID",
      "name": "string",
      "email": "string | null",
      "phone": "string | null",
      "relation_to_student": "Father | Mother | Guardian",
      "occupation": "string | null",
      "salary_range": "below_1l | 1l_3l | 3l_5l | 5l_10l | above_10l | null"
    }
  ]
}
```

---

### 6.4 Create Student Admission

```
POST /api/v1/students/admission/
```

**Permission:** `students:create`

**Request Body:**
```json
{
  "admission_date": "2025-06-01",
  "admission_type": "primary",
  "academic_year_id": "UUID",
  "admitted_class_id": "UUID",
  "admitted_section_id": "UUID",
  "address_line1": "123 Main Street",
  "city": "Hyderabad",
  "state": "Telangana",
  "student": {
    "first_name": "Ravi",
    "last_name": "Kumar",
    "date_of_birth": "2015-03-15",
    "gender": "Male",
    "father": {
      "name": "Suresh Kumar",
      "email": "suresh@example.com",
      "phone": "9876543210",
      "relation_to_student": "Father"
    },
    "mother": {
      "name": "Lakshmi Kumar",
      "relation_to_student": "Mother"
    }
  }
}
```

> `admission_type` accepted values: `"primary"` or `"non_primary"` only.
> Both `father` and `mother` objects are expected but email/phone are optional.

---

### 6.5 Update Student Admission

```
PATCH /api/v1/students/admission/{student_id}
```

**Permission:** `students:update`

Send only the fields you want to update. Supports updating student personal fields AND father/mother fields in the same call.

---

### 6.6 Documents

```
POST /api/v1/students/documents/
    Content-Type: multipart/form-data
    Fields: student_id (UUID), document_type (string), file (binary)

GET  /api/v1/students/documents/?student_id={uuid}
GET  /api/v1/students/documents/{document_id}
DELETE /api/v1/students/documents/{document_id}
```

**Permission:** `students:create` (upload), `students:read` (view)

**Response per document:**
```json
{
  "id": "UUID",
  "student_id": "UUID",
  "document_type": "string",
  "file_name": "string",
  "file_url": "https://... (S3 pre-signed URL)",
  "uploaded_at": "datetime"
}
```

---

### 6.7 Certificates

```
GET  /api/v1/certificates/by-student/{student_id}   — Admin/Staff
GET  /api/v1/certificates/my                        — Student self-service
GET  /api/v1/certificates/my-child/{student_id}     — Parent
GET  /api/v1/certificates/{certificate_id}
```

**Response per certificate:**
```json
{
  "id": "UUID",
  "student_id": "UUID",
  "certificate_type_id": "UUID",
  "certificate_type_name": "string",
  "certificate_category": "issued | received",
  "issued_date": "date | null",
  "issued_by_name": "string | null",
  "issuer_signature_url": "string | null",
  "remarks": "string | null"
}
```

---

### 6.8 Student-Parent Links

```
GET  /api/v1/student-parent-links/student/{student_id}/parents
GET  /api/v1/student-parent-links/my-children          — Parent: get own children
POST /api/v1/student-parent-links/                     — Create link (Admin)
DELETE /api/v1/student-parent-links/student/{student_id}/parent/{parent_id}
```

---

## 7. Attendance Module

### 7.1 Student Attendance

#### Mark Attendance (Single)

```
POST /api/v1/student/attendance/
```

**Permission:** `attendance:create`

**Request Body:**
```json
{
  "student_id": "UUID",
  "date": "2026-03-19",
  "status": "present | absent | late",
  "remarks": "string | null"
}
```

#### Bulk Update for a Date

```
PATCH /api/v1/student/attendance/by-date/{YYYY-MM-DD}
```

**Request Body:** Array of attendance objects — same fields as single create.

#### View My Attendance (Student)

```
GET /api/v1/student/attendance/my-attendance?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

#### Get Attendance for a Student (Admin/Staff/Teacher)

```
GET /api/v1/student/attendance/student/{student_id}/filter?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

#### Get All Attendance by Date

```
GET /api/v1/student/attendance/by-date/{YYYY-MM-DD}
    ?class_id={uuid}&section_id={uuid}
```

**Response per record:**
```json
{
  "id": "UUID",
  "student_id": "UUID",
  "date": "2026-03-19",
  "status": "present | absent | late",
  "remarks": "string | null"
}
```

---

### 7.2 Staff Attendance

```
POST   /api/v1/staff/attendance                                — Mark
GET    /api/v1/staff/attendance                                — List
GET    /api/v1/staff/{staff_id}/attendance/filter?start_date=DATE&end_date=DATE
GET    /api/v1/staff/attendance/by-date/{YYYY-MM-DD}
PATCH  /api/v1/staff/attendance/{attendance_id}                — Update
DELETE /api/v1/staff/attendance/{attendance_id}
```

---

## 8. Exam Module

### 8.1 Exam List & Detail

```
GET /api/v1/exams?academic_year_id={uuid}&exam_status={status}&nature={nature}&skip=0&limit=20
GET /api/v1/exams/{exam_id}
```

**Permission:** `exams:list`, `exams:read`

**Exam Status Values:** `draft | active | published | locked | finalized`

**Response:**
```json
{
  "id": "UUID",
  "exam_name": "Mid-Term Exam 2026",
  "board": "CBSE",
  "level": "secondary",
  "exam_type": "Written",
  "nature": "formative | summative | cumulative | custom",
  "status": "draft | active | published | locked | finalized",
  "academic_year_id": "UUID",
  "mark_entry_deadline": "2026-02-28 | null",
  "hall_ticket_published": false,
  "publish_rank": false,
  "weightage_percent": "10.00 | null",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 8.2 Exam Class-Sections

```
GET  /api/v1/exams/{exam_id}/class-sections
POST /api/v1/exams/{exam_id}/class-sections
```

**GET Response:**
```json
[
  {
    "id": "UUID",
    "exam_id": "UUID",
    "class_id": "UUID",
    "section_id": "UUID",
    "class_name": "Class 10",
    "section_name": "IIT A"
  }
]
```

---

### 8.3 Exam Subject Configs

```
GET /api/v1/exams/{exam_id}/subject-configs
    ?class_id={uuid}&section_id={uuid}

GET /api/v1/exams/{exam_id}/subject-configs/{config_id}
PUT /api/v1/exams/{exam_id}/subject-configs/{config_id}
```

**Response per config:**
```json
{
  "id": "UUID",
  "exam_id": "UUID",
  "subject_id": "UUID",
  "subject_name": "Mathematics",
  "class_id": "UUID",
  "section_id": "UUID | null",
  "max_marks": "100.00",
  "pass_marks": "35.00",
  "components": [
    {
      "id": "UUID",
      "component_name": "Written",
      "max_marks": "80.00",
      "is_optional": false,
      "sort_order": 1
    }
  ]
}
```

---

### 8.4 Mark Entry

#### Get Marks Grid (View already entered marks)

```
GET /api/v1/exams/{exam_id}/marks
    ?class_id={uuid}
    &section_id={uuid}
    &subject_config_id={uuid}
    &page=1&page_size=50
```

**Response:**
```json
{
  "total": 30,
  "page": 1,
  "items": [
    {
      "student_id": "UUID",
      "student_name": "Ravi Kumar",
      "admission_number": "NP2025001",
      "marks": [
        {
          "component_id": "UUID",
          "component_name": "Written",
          "marks_obtained": "78.00 | null",
          "is_absent": false,
          "remark_grade": null
        }
      ]
    }
  ]
}
```

#### Submit Marks (Batch)

```
POST /api/v1/exams/{exam_id}/marks
```

**Permission:** `exam_marks:create`

**Request Body:**
```json
{
  "exam_id": "UUID",
  "subject_config_id": "UUID",
  "attempt_number": 1,
  "marks": [
    {
      "student_id": "UUID",
      "component_id": "UUID",
      "marks_obtained": 78.0,
      "is_absent": false,
      "remark_grade": null
    },
    {
      "student_id": "UUID",
      "component_id": "UUID",
      "marks_obtained": null,
      "is_absent": true
    }
  ]
}
```

> Set `is_absent: true` to mark a student absent. When absent, `marks_obtained` should be `null`.
> `marks_obtained` must be `>= 0` and `<= max_marks` for that component.

---

### 8.5 Exam Results

#### View Results (Admin/Staff/Teacher)

```
GET /api/v1/exams/{exam_id}/results?class_id={uuid}&section_id={uuid}&student_id={uuid}
GET /api/v1/exams/{exam_id}/results/{student_id}
```

#### My Result (Student — only after exam is published/finalized)

```
GET /api/v1/exams/{exam_id}/my-result
```

#### Child Result (Parent)

```
GET /api/v1/exams/{exam_id}/child-result/{student_id}
```

> Returns `403` if `exam.status` is not `published` or `finalized`.
> Parent-child link is verified — a parent cannot view another family's child.

#### My Raw Marks (Student — visible immediately after teacher saves)

```
GET /api/v1/exams/{exam_id}/my-marks
```

#### Child Raw Marks (Parent)

```
GET /api/v1/exams/{exam_id}/child-marks/{student_id}
```

**Result Response:**
```json
{
  "student_id": "UUID",
  "student_name": "Ravi Kumar",
  "admission_number": "NP2025001",
  "exam_name": "Mid-Term Exam 2026",
  "subjects": [
    {
      "subject_name": "Mathematics",
      "max_marks": "100.00",
      "marks_obtained": "78.00",
      "grade": "B+",
      "remark": null,
      "components": [
        {
          "component_name": "Written",
          "max_marks": "80.00",
          "marks_obtained": "62.00"
        },
        {
          "component_name": "Internal",
          "max_marks": "20.00",
          "marks_obtained": "16.00"
        }
      ]
    }
  ],
  "total_marks": "450.00",
  "total_obtained": "352.00",
  "percentage": "78.22",
  "grade": "B+",
  "rank": 3,
  "result": "PASS"
}
```

---

### 8.6 Hall Tickets

```
GET  /api/v1/exams/{exam_id}/hall-tickets/enrolled-students
     — Lists all students enrolled for the exam

POST /api/v1/exams/{exam_id}/hall-tickets/compute
     — Compute eligibility (Admin only)

GET  /api/v1/exams/{exam_id}/hall-tickets/eligible
GET  /api/v1/exams/{exam_id}/hall-tickets/ineligible

GET  /api/v1/exams/{exam_id}/hall-tickets/download?student_id={uuid}
     — Returns PDF binary (Student can get own; Admin can get any)
```

> Hall tickets are only downloadable after `hall_ticket_published = true`.

---

### 8.7 Exam Dates

```
POST   /api/v1/exams/exam-dates
       Body: {exam_id, subject_config_id, date, start_time, end_time, room, remarks}

GET    /api/v1/exams/exam-dates?exam_id={uuid}
PUT    /api/v1/exams/exam-dates/{date_id}
DELETE /api/v1/exams/exam-dates/{date_id}
```

---

### 8.8 Exam Status Transitions (Admin)

```
POST /api/v1/exams/{exam_id}/compute   — Compute aggregates (triggers grade calculation)
POST /api/v1/exams/{exam_id}/publish   — Publish results (students can see)
POST /api/v1/exams/{exam_id}/unlock    — Body: {reason: "string"}  — Revert to active
```

---

### 8.9 Grading Schemes

```
GET  /api/v1/grading/schemes
POST /api/v1/grading/schemes
GET  /api/v1/grading/schemes/{scheme_id}
PUT  /api/v1/grading/schemes/{scheme_id}
DELETE /api/v1/grading/schemes/{scheme_id}

GET  /api/v1/grading/schemes/{scheme_id}/grades
POST /api/v1/grading/schemes/{scheme_id}/grades/bulk
```

---

## 9. Fee Module

### 9.1 Search Student for Fee

```
GET /api/v1/fee/collection/search-student
    ?q={text}               — name, admission number, or phone
    &class_id={uuid}
    &section_id={uuid}
    &academic_year_id={uuid}
```

**Permission:** `fee_collection:list`

**Response:**
```json
[
  {
    "student_id": "UUID",
    "student_name": "Ravi Kumar",
    "admission_number": "NP2025001",
    "class_name": "Class 1",
    "section_name": "IIT A",
    "father_phone": "9876543210 | null",
    "outstanding_amount": "5000.00"
  }
]
```

---

### 9.2 Fee Summary (Detailed Breakdown)

```
GET /api/v1/fee/collection/summary/{student_id}
    ?academic_year_id={uuid}
    &as_of_date=YYYY-MM-DD      — optional, defaults to today
```

**Permission:** `fee_collection:read`

**Response:**
```json
{
  "student_id": "UUID",
  "student_name": "Ravi Kumar",
  "admission_number": "NP2025001",
  "class_name": "Class 1",
  "section_name": "IIT A",
  "academic_year": "2025-2026",
  "as_of_date": "2026-03-19",
  "items": [
    {
      "s_no": 1,
      "fee_type_id": "UUID",
      "fee_type_name": "Tuition Fee",
      "assigned_fee": "10000.00",
      "fee_after_concession": "9000.00",
      "paid_amount": "5000.00",
      "due_amount": "4000.00",
      "last_paid_date": "2026-01-15T00:00:00",
      "last_receipt_number": "RCP001",
      "remarks": null
    }
  ],
  "grand_total_assigned": "25000.00",
  "grand_total_fee": "22000.00",
  "grand_total_paid": "15000.00",
  "grand_total_due": "7000.00",
  "old_fee_pending_amount": "0.00"
}
```

---

### 9.3 My Fee Summary (Student Self-Service)

```
GET /api/v1/fee/collection/my-summary
    ?academic_year_id={uuid}&as_of_date=YYYY-MM-DD
```

---

### 9.4 Child Fee Summary (Parent)

```
GET /api/v1/fee/collection/child-summary/{student_id}
    ?academic_year_id={uuid}&as_of_date=YYYY-MM-DD
```

---

### 9.5 Process Fee Payment

```
POST /api/v1/fee/collection/pay
```

**Permission:** `fee_collection:create`

**Request Body:**
```json
{
  "student_id": "UUID",
  "academic_year_id": "UUID",
  "amount_to_pay": 5000.00,
  "payment_method": "cash | cheque | bank_transfer | upi | dd | card",
  "upi_reference": "string (required if payment_method=upi, max 30 chars)",
  "bank_reference": "string (required if payment_method=bank_transfer, max 30 chars)",
  "cheque_number": "string (required if cheque/dd, max 20 chars)",
  "cheque_bank": "string (required if cheque/dd, max 100 chars)",
  "cheque_date": "YYYY-MM-DD (required if cheque/dd, max 90 days future)",
  "send_sms": true,
  "print_duplicate": false,
  "remarks": "string | null"
}
```

**Conditional Field Rules:**
- `upi` → must provide `upi_reference`
- `bank_transfer` → must provide `bank_reference`
- `cheque` or `dd` → must provide `cheque_number`, `cheque_bank`, `cheque_date`

**Success Response (200):**
```json
{
  "transaction_id": "UUID",
  "transaction_number": "TXN20260319001",
  "receipt_id": "UUID",
  "receipt_number": "RCP001",
  "amount_paid": "5000.00",
  "payment_method": "cash",
  "sms_status": "sent | failed | skipped",
  "items_paid": [
    {
      "fee_type_id": "UUID",
      "fee_type_name": "Tuition Fee",
      "amount_paid": "5000.00"
    }
  ]
}
```

> Payment distributes top-down across due items automatically. No need to specify per-fee-type amounts.

---

### 9.6 Fee Receipt PDF

```
GET /api/v1/fee/collection/receipts/{receipt_id}/pdf
```

Returns PDF binary. Use `Content-Type: application/pdf` in Accept header. Display in PDF viewer.

---

### 9.7 Fee Concessions

```
POST /api/v1/fee/concessions/bulk
     Body: Array of {student_id, fee_type_id, academic_year_id, amount, approver_role, remarks}

GET  /api/v1/fee/concessions/student/{student_id}?academic_year_id={uuid}
GET  /api/v1/fee/concessions/history/{student_id}?academic_year_id={uuid}
GET  /api/v1/fee/concessions/{concession_id}
PUT  /api/v1/fee/concessions/{concession_id}
DELETE /api/v1/fee/concessions/{concession_id}    — Revoke (soft delete)
```

**Permission:** `fee_concessions:create`, `fee_concessions:read`, etc.

**Approver Role Values:** `principal | management | accountant | admin`

---

### 9.8 Old Fees

```
POST /api/v1/fee/old-fees/
     Body: {student_id, fee_type_id, previous_year_id, current_year_id, original_amount,
            paid_amount, balance_amount, source: "manual_entry", remarks}

POST /api/v1/fee/old-fees/carry-forward
     Body: {student_id, from_academic_year_id, to_academic_year_id}

GET  /api/v1/fee/old-fees/student/{student_id}?current_year_id={uuid}
GET  /api/v1/fee/old-fees/{old_fee_id}
PUT  /api/v1/fee/old-fees/{old_fee_id}
PATCH /api/v1/fee/old-fees/{old_fee_id}/settle    — Write-off
DELETE /api/v1/fee/old-fees/{old_fee_id}          — Only manual entries
```

**Permission:** `fee_old:create`, `fee_old:read`, etc.

---

### 9.9 Fee Structure (Admin Setup)

#### Fee Terms

```
POST   /api/v1/fee/terms/
       Body: {name, academic_year_id, start_date, end_date, due_date}
GET    /api/v1/fee/terms/?academic_year_id={uuid}
PUT    /api/v1/fee/terms/{term_id}
DELETE /api/v1/fee/terms/{term_id}
```

#### Fee Categories

```
POST   /api/v1/fee/categories/
GET    /api/v1/fee/categories/dropdown
GET    /api/v1/fee/categories/?academic_year_id={uuid}
PUT    /api/v1/fee/categories/{category_id}
DELETE /api/v1/fee/categories/{category_id}
```

#### Fee Types

```
POST   /api/v1/fee/types/
       Body: {name, category_id, academic_year_id, is_optional, display_order}
GET    /api/v1/fee/types/?category_id={uuid}&academic_year_id={uuid}
PUT    /api/v1/fee/types/{type_id}
DELETE /api/v1/fee/types/{type_id}
```

#### Class Mappings (Assign Fee Type to Class)

```
POST   /api/v1/fee/class-mappings/
       Body: {fee_type_id, class_id, academic_year_id, admission_type: "primary|non_primary"}
GET    /api/v1/fee/class-mappings/?class_id={uuid}&academic_year_id={uuid}
PUT    /api/v1/fee/class-mappings/{mapping_id}
DELETE /api/v1/fee/class-mappings/{mapping_id}
```

> `fee_class_mappings` has NO `section_id` column — mappings are class-level only.

#### Class Map Term Amounts (Set amount per term)

```
POST   /api/v1/fee/class-map-term-amounts/
       Body: {fee_class_mapping_id, fee_term_id, amount}
GET    /api/v1/fee/class-map-term-amounts/?fee_class_mapping_id={uuid}
PUT    /api/v1/fee/class-map-term-amounts/{mapping_id}
DELETE /api/v1/fee/class-map-term-amounts/{mapping_id}
```

> FK column is `fee_class_mapping_id` (NOT `fee_class_map_id`).

#### Student Mappings (Override per student)

```
POST   /api/v1/fee/student-mappings/
       Body: {fee_type_id, student_id, academic_year_id, override_amount}
GET    /api/v1/fee/student-mappings/?student_id={uuid}&academic_year_id={uuid}
PATCH  /api/v1/fee/student-mappings/{mapping_id}
DELETE /api/v1/fee/student-mappings/{mapping_id}
```

---

### 9.10 Fee Transactions (Read-Only History)

```
GET /api/v1/fee/transactions/?student_id={uuid}&academic_year_id={uuid}&skip=0&limit=20
GET /api/v1/fee/receipts/?student_id={uuid}
GET /api/v1/fee/receipts/{receipt_id}
```

---

## 10. Staff Module

### 10.1 Staff List

```
GET /api/v1/staff/?skip=0&limit=20&search={text}&designation_id={uuid}&is_active={bool}
GET /api/v1/staff/enrollment/{staff_id}
```

**Permission:** `staff:list`, `staff:read`

**Response:**
```json
{
  "id": "UUID",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string | null",
  "designation_id": "UUID | null",
  "designation_name": "string | null",
  "department": "string | null",
  "is_active": true,
  "joining_date": "2024-06-01 | null"
}
```

---

### 10.2 Create Staff

```
POST /api/v1/staff/enrollment
```

**Permission:** `staff:create`

**Request Body:**
```json
{
  "first_name": "string",
  "last_name": "string",
  "email": "email",
  "phone": "string | null",
  "designation_id": "UUID | null",
  "department": "string | null",
  "joining_date": "YYYY-MM-DD | null",
  "qualifications": []
}
```

> On creation, staff gets username = email, password = `Welcome@123`, `is_first_login = TRUE`.

---

### 10.3 Designations

```
GET  /api/v1/staff/designations/dropdown
GET  /api/v1/staff/designations/?skip=0&limit=50
POST /api/v1/staff/designations/
PUT  /api/v1/staff/designations/{designation_id}
DELETE /api/v1/staff/designations/{designation_id}
```

---

### 10.4 Qualifications

```
POST   /api/v1/staff/{staff_id}/qualifications
       Body: {degree, institution, year_of_passing, specialization, remarks}
GET    /api/v1/staff/{staff_id}/qualifications
PUT    /api/v1/staff/{staff_id}/qualifications/{qualification_id}
DELETE /api/v1/staff/{staff_id}/qualifications/{qualification_id}
```

---

## 11. Communication Module

### 11.1 Templates

```
GET  /api/v1/communication/templates
     ?channel=sms|whatsapp|email&is_active=true

POST /api/v1/communication/templates
     Body: {name, channel, subject (email only), body, variables: []}

GET  /api/v1/communication/templates/{template_id}
PUT  /api/v1/communication/templates/{template_id}
DELETE /api/v1/communication/templates/{template_id}   — Soft deactivate
```

**Channel Values:** `sms | whatsapp | email`

---

### 11.2 Preview Recipient Count

```
GET /api/v1/communication/send/preview-count
    ?target_type={type}&class_id={uuid}&section_id={uuid}&role={role}
```

Returns: `{"count": 45, "target_type": "class_section_parents"}`

---

### 11.3 Send Message

```
POST /api/v1/communication/send
```

**Rate limited — avoid hammering.**

**Request Body:**
```json
{
  "template_id": "UUID",
  "target_type": "see values below",
  "target_ref": {},
  "variables": {}
}
```

**`target_type` values and required `target_ref`:**

| target_type | target_ref fields |
|-------------|-------------------|
| `individual_parent` | `{"parent_id": "UUID"}` |
| `individual_student` | `{"student_id": "UUID"}` |
| `individual_staff` | `{"staff_id": "UUID"}` |
| `class_section_parents` | `{"class_id": "UUID", "section_id": "UUID (optional)"}` |
| `class_section_students` | `{"class_id": "UUID", "section_id": "UUID (optional)"}` |
| `all_parents` | `{}` |
| `all_students` | `{}` |
| `all_staff` | `{}` |
| `all_users` | `{}` |
| `fee_defaulters` | `{}` |
| `role_based` | `{"role": "Teacher"}` |

**Response:**
```json
{
  "queued_count": 45
}
```

---

### 11.4 Dispatch Logs

```
GET /api/v1/communication/logs?skip=0&limit=20&channel={channel}&status={status}
GET /api/v1/communication/logs/{log_id}
```

---

## 12. Transport Module

### 12.1 Routes

```
GET  /api/v1/masters/routes/all_routes
GET  /api/v1/masters/routes/routeid/{route_id}
GET  /api/v1/masters/routes/dropdown
GET  /api/v1/masters/routes/stops/{route_id}     — Route stops with pickup/drop times
POST /api/v1/masters/routes/
PUT  /api/v1/masters/routes/{route_id}
DELETE /api/v1/masters/routes/{route_id}
```

**Stop Response includes:**
```json
{
  "id": "UUID",
  "route_id": "UUID",
  "stop_name": "string",
  "order": 1,
  "pickup_time": "07:30:00 | null",
  "drop_time": "16:00:00 | null",
  "landmark": "string | null"
}
```

---

### 12.2 Vehicles

```
GET  /api/v1/masters/vehicles/
GET  /api/v1/masters/vehicles/{vehicle_id}
POST /api/v1/masters/vehicles/
PUT  /api/v1/masters/vehicles/{vehicle_id}
DELETE /api/v1/masters/vehicles/{vehicle_id}
```

---

### 12.3 Trips

```
GET  /api/v1/masters/trips/
POST /api/v1/masters/trips/
     Body: {route_id, vehicle_id, trip_type_id, academic_year_id, remarks}
PUT  /api/v1/masters/trips/{trip_id}
DELETE /api/v1/masters/trips/{trip_id}
```

---

### 12.4 Student Transport Assignment

```
POST   /api/v1/students/student-transport/
       Body: {student_id, trip_id, route_stop_id, pricing_id, academic_year_id}

GET    /api/v1/students/student-transport/student/{student_id}
PATCH  /api/v1/students/student-transport/{transport_id}
DELETE /api/v1/students/student-transport/{transport_id}
```

---

### 12.5 Transport Pricing

```
GET  /api/v1/transport-pricing/?route_id={uuid}&billing_cycle={cycle}
GET  /api/v1/transport-pricing/{pricing_id}
GET  /api/v1/transport-pricing/dropdown
POST /api/v1/transport-pricing/
     Body: {route_id, billing_cycle, amount, effective_from, effective_to, remarks}
PUT  /api/v1/transport-pricing/{pricing_id}
DELETE /api/v1/transport-pricing/{pricing_id}
```

**Billing Cycle Values:** `monthly | quarterly | half_yearly | yearly | one_time`

> Overlap validation is enforced — two pricing records for the same route cannot have overlapping date ranges.

---

## 13. Reports Module

### 13.1 Student Reports

```
GET /api/v1/reports/students/summary
    ?academic_year_id={uuid}
    &class_id={uuid}
    &section_id={uuid}
    &gender=M|F|O
    &caste={string}
    &religion={string}
    &page=1&page_size=100
    &sort_by={field}&sort_order=asc|desc
```

**Permission:** `reports:list`

---

### 13.2 Staff Reports

```
GET /api/v1/reports/staff/summary?designation_id={uuid}&department={str}&is_active={bool}&page=1
```

---

### 13.3 Fee Reports

```
GET /api/v1/reports/fees/summary?academic_year_id={uuid}&class_id={uuid}&fee_type_id={uuid}
GET /api/v1/reports/fees/collections?academic_year_id={uuid}&date_from=DATE&date_to=DATE
```

---

### 13.4 Attendance Reports

```
GET /api/v1/reports/attendance/students
    ?academic_year_id={uuid}&class_id={uuid}&student_id={uuid}
    &date_from=DATE&date_to=DATE&month={int}&year={int}

GET /api/v1/reports/attendance/staff
    ?staff_id={uuid}&date_from=DATE&date_to=DATE&month={int}&year={int}
```

---

### 13.5 Financial Reports

```
GET /api/v1/reports/financial/summary?academic_year_id={uuid}&date_from=DATE&date_to=DATE
```

---

### 13.6 Export (Download PDF/Excel)

```
POST /api/v1/reports/export
     Body: {report_type, filters: {}, format: "pdf|excel", filename: "optional"}
```

---

## 14. Admin / Role Management

### 14.1 User Management

```
GET   /api/v1/admin/users/?page=1&limit=50&role={role}&search={text}&is_active={bool}
GET   /api/v1/admin/users/{user_id}
PATCH /api/v1/admin/users/{user_id}
      Body: {is_active, email, phone}
PUT   /api/v1/admin/users/{user_id}/role
      Body: {role_id: "UUID"}
POST  /api/v1/admin/users/{user_id}/reset-password
      Body: {}   — Resets to default password + sets is_first_login=TRUE
GET   /api/v1/admin/users/filters/options
```

---

### 14.2 Role Management

```
GET    /api/v1/admin/role-mgmt/roles/
POST   /api/v1/admin/role-mgmt/
       Body: {name, description, is_active}
PUT    /api/v1/admin/role-mgmt/{role_id}
DELETE /api/v1/admin/role-mgmt/{role_id}
GET    /api/v1/admin/role-mgmt/roles/{role_id}/permissions
PUT    /api/v1/admin/role-mgmt/roles/{role_id}/permissions
POST   /api/v1/admin/role-mgmt/roles/{role_id}/permissions/bulk
```

---

### 14.3 Menu Management

```
GET  /api/v1/auth/menus/
POST /api/v1/auth/menus/
     Body: {name, icon, path, parent_id, order, is_active}
```

---

### 14.4 Resource Permissions

```
GET  /api/v1/auth/resource-permissions/role/{role_id}
PUT  /api/v1/auth/resource-permissions/{permission_id}
     Body: {is_granted: true|false}
POST /api/v1/auth/resource-permissions/bulk
     Body: [{role_id, resource, action, is_granted}]
GET  /api/v1/auth/resource-permissions/check/{role_id}/{resource}/{action}
GET  /api/v1/auth/resource-permissions/matrix/all
```

---

## 15. Profile Endpoints

Each role has a dedicated "my profile" endpoint:

```
GET  /api/v1/profile/student/me         — Student's own profile
PUT  /api/v1/profile/student/me         — Update own profile (limited fields)

GET  /api/v1/profile/parent/me          — Parent's own profile
PUT  /api/v1/profile/parent/me

GET  /api/v1/profile/staff/me           — Staff's own profile
PUT  /api/v1/profile/staff/me

GET  /api/v1/profile/                   — Generic: returns profile based on role
```

---

## 16. Parent & Child Endpoints

### Parent's Children

```
GET /api/v1/student-parent-links/my-children
```

**Response:**
```json
[
  {
    "student_id": "UUID",
    "first_name": "Ravi",
    "last_name": "Kumar",
    "admission_number": "NP2025001",
    "class_id": "UUID",
    "class_name": "Class 1",
    "section_id": "UUID",
    "section_name": "IIT A",
    "academic_year_id": "UUID",
    "academic_year_title": "2025-2026"
  }
]
```

> For multi-child parents: store the list. Show a child-selector dropdown/chip row at top of each screen. Pass `student_id` in subsequent child-specific API calls.

### Parent Accessing Child Data

| Data | Endpoint |
|------|---------|
| Admission/Profile | `GET /api/v1/students/admission/id/{student_id}` |
| Attendance | `GET /api/v1/student/attendance/student/{student_id}/filter?...` |
| Exam results | `GET /api/v1/exams/{exam_id}/child-result/{student_id}` |
| Raw marks | `GET /api/v1/exams/{exam_id}/child-marks/{student_id}` |
| Fee summary | `GET /api/v1/fee/collection/child-summary/{student_id}` |
| Certificates | `GET /api/v1/certificates/my-child/{student_id}` |
| Transport | `GET /api/v1/students/student-transport/student/{student_id}` |

---

## 17. Permission Matrix

### Role-to-Feature Access

| Feature | Admin | Staff | Teacher | Student | Parent |
|---------|-------|-------|---------|---------|--------|
| Student List | ✅ | ✅ | ✅ (read) | ❌ | ❌ |
| Student Admission | ✅ | ✅ | ❌ | ❌ | ❌ |
| Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Attendance Mark | ✅ | ✅ | ✅ | ❌ | ❌ |
| Attendance View | ✅ | ✅ | ✅ | ✅ (own) | ✅ (child) |
| Exam List | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mark Entry | ✅ | ✅ | ✅ | ❌ | ❌ |
| Exam Results View | ✅ | ✅ | ✅ | ✅ (own) | ✅ (child) |
| Hall Tickets | ✅ | ✅ | ✅ | ✅ (own) | ❌ |
| Fee Collection | ✅ | ✅ | ❌ | ❌ | ❌ |
| Fee Summary View | ✅ | ✅ | ❌ | ✅ (own) | ✅ (child) |
| Fee Concessions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Communication Send | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Role Management | ✅ | ❌ | ❌ | ❌ | ❌ |

> These are defaults. The actual permissions come from the login response `permissions` object. Always check `permissions` first; don't hardcode role-based access in the app.

---

## 18. Offline & Caching Strategy

| Data | TTL | Strategy |
|------|-----|----------|
| Academic year, classes, sections | Session | Fetch on login, store in Room |
| Timetable | 24 hours | Fetch on app open if TTL expired |
| Student list (paginated) | 5 min | Cache with timestamp; invalidate on pull-to-refresh |
| Attendance (teacher mark) | Persistent queue | Local queue → sync when network restored |
| Mark entry (teacher) | Persistent queue | Local queue → sync when network restored |
| Fee summary (student/parent) | 10 min | Cache with TTL; pull-to-refresh forces reload |
| Exam results | Immutable | Cache permanently once fetched; never re-fetch |
| Exam list | 5 min | Cache with TTL |
| Reference dropdowns (castes, locations) | Session | Fetch once per session |

**Offline Queue Pattern for Attendance/Marks:**

```kotlin
// When submitting mark entry:
// 1. Save to Room table `pending_sync_queue` with status="pending"
// 2. Try API call immediately
// 3. If success → delete from Room
// 4. If network error → leave in Room, retry via SyncManager
// 5. SyncManager runs on network connectivity change
// 6. On conflict (409) → show to user for manual resolution
```

---

## 19. Common Pagination & Filter Patterns

### Pagination

Most list endpoints support:
```
?skip=0&limit=20
```

Some support:
```
?page=1&page_size=20
```

Always check response — list responses may be a plain array OR paginated:
```json
// Plain array
[{}, {}, {}]

// Paginated
{
  "total": 150,
  "skip": 0,
  "limit": 20,
  "items": [{}, {}, {}]
}
```

### Date Formats

- All dates: `YYYY-MM-DD` (ISO 8601 date, no time)
- All datetimes in response: ISO 8601 with Z suffix (`2026-03-19T10:30:00Z`)
- Use `Instant.parse()` on Android for datetime strings

### UUID Format

All IDs are UUID v4 format: `550e8400-e29b-41d4-a716-446655440000`

### Decimal / Financial Fields

Financial amounts are returned as **strings** (e.g., `"5000.00"`), not floats.
Parse with `BigDecimal` on Android to avoid floating point errors:
```kotlin
val amount = BigDecimal(response.amount_paid)
```

---

## Appendix A: Quick Reference — All Endpoints

| Module | Method | Path | Permission |
|--------|--------|------|------------|
| **AUTH** | POST | `/auth/login` | None |
| | POST | `/auth/staff/set-password` | None |
| | POST | `/auth/refresh` | None |
| | POST | `/auth/logout` | JWT |
| | GET | `/auth/academic-years` | None |
| **STUDENTS** | GET | `/students/admission/` | students:list |
| | GET | `/students/admission/id/{student_id}` | students:read |
| | GET | `/students/admission/my-admission` | students:read |
| | GET | `/students/admission/my-children-admissions` | students:list |
| | POST | `/students/admission/` | students:create |
| | PATCH | `/students/admission/{student_id}` | students:update |
| | GET | `/students/documents/?student_id={id}` | students:read |
| | POST | `/students/documents/` | students:create |
| | GET | `/certificates/by-student/{student_id}` | students:read |
| | GET | `/certificates/my` | students:read |
| | GET | `/certificates/my-child/{student_id}` | students:read |
| | GET | `/students/student-transport/student/{id}` | students:read |
| | GET | `/student-parent-links/my-children` | students:read |
| **ATTENDANCE** | POST | `/student/attendance/` | attendance:create |
| | PATCH | `/student/attendance/by-date/{date}` | attendance:update |
| | GET | `/student/attendance/my-attendance` | attendance:read |
| | GET | `/student/attendance/student/{id}/filter` | attendance:read |
| | GET | `/student/attendance/by-date/{date}` | attendance:list |
| **EXAMS** | GET | `/exams` | exams:list |
| | GET | `/exams/{id}` | exams:read |
| | GET | `/exams/{id}/class-sections` | exams:read |
| | GET | `/exams/{id}/subject-configs` | exams:read |
| | GET | `/exams/{id}/marks` | exam_marks:list |
| | POST | `/exams/{id}/marks` | exam_marks:create |
| | GET | `/exams/{id}/results` | exams:read |
| | GET | `/exams/{id}/my-result` | exams:read |
| | GET | `/exams/{id}/child-result/{sid}` | exams:read |
| | GET | `/exams/{id}/my-marks` | exam_marks:read |
| | GET | `/exams/{id}/child-marks/{sid}` | exam_marks:read |
| | GET | `/exams/{id}/hall-tickets/download` | exams:read |
| **FEE** | GET | `/fee/collection/search-student` | fee_collection:list |
| | GET | `/fee/collection/summary/{student_id}` | fee_collection:read |
| | GET | `/fee/collection/my-summary` | fee_collection:read |
| | GET | `/fee/collection/child-summary/{id}` | fee_collection:read |
| | POST | `/fee/collection/pay` | fee_collection:create |
| | GET | `/fee/collection/receipts/{id}/pdf` | fee_collection:read |
| | GET | `/fee/concessions/student/{id}` | fee_concessions:read |
| | POST | `/fee/concessions/bulk` | fee_concessions:create |
| | GET | `/fee/old-fees/student/{id}` | fee_old:list |
| **STAFF** | GET | `/staff/` | staff:list |
| | GET | `/staff/enrollment/{id}` | staff:read |
| | POST | `/staff/enrollment` | staff:create |
| | PATCH | `/staff/enrollment/{id}` | staff:update |
| **COMM** | GET | `/communication/templates` | communication:list |
| | POST | `/communication/send` | communication:create |
| | GET | `/communication/logs` | communication:list |
| **TRANSPORT** | GET | `/masters/routes/all_routes` | — |
| | GET | `/masters/routes/stops/{route_id}` | — |
| | GET | `/students/student-transport/student/{id}` | students:read |
| **REPORTS** | GET | `/reports/students/summary` | reports:list |
| | GET | `/reports/fees/summary` | reports:list |
| | GET | `/reports/attendance/students` | reports:list |
| **PROFILE** | GET | `/profile/` | JWT |
| | GET | `/profile/student/me` | JWT |
| | PUT | `/profile/student/me` | JWT |
| | GET | `/profile/parent/me` | JWT |
| | GET | `/profile/staff/me` | JWT |

---

## Appendix B: Known Integration Rules & Gotchas

1. **`cschema` header** — Never forget this. Every protected API call needs it. Store it from the login screen's "tenant code" input.

2. **First-login token is separate** — The `change_password_token` from a first-login response is NOT the same as `access_token`. It's short-lived (15 min) and only valid for the set-password endpoint.

3. **Student username = admission number** — e.g., `NP2025001`. Not their name.

4. **Fee payment is automatic distribution** — Don't let users pick which fee types to pay. Just send total amount. Backend distributes top-down.

5. **Financial amounts are strings** — Parse with `BigDecimal`, never `Float`/`Double`.

6. **Exam results gated by status** — `my-result` and `child-result` return `403` until exam is `published` or `finalized`. Show "Results not published yet" to user.

7. **Raw marks are always visible** — `my-marks` and `child-marks` are visible as soon as teachers enter them, regardless of exam status.

8. **Parent-child verification** — Backend verifies the parent-child link on all child-scoped endpoints. If link doesn't exist, returns `403`.

9. **UUID in paths** — All path params like `{student_id}`, `{exam_id}` are UUIDs. Don't use admission numbers in paths.

10. **Decimal precision** — `max_marks` and financial fields use 2 decimal places. Validate before sending.

11. **Attendance status is lowercase** — Send `"present"`, `"absent"`, `"late"` (not `"Present"`).

12. **Communication is rate-limited** — Don't call `/communication/send` in loops. Show a loading state and disable the button until response.

13. **Mark entry `is_absent`** — When marking absent, set `is_absent: true` and `marks_obtained: null`. Do NOT send `0` for absent.

14. **`admission_type` constraint** — Only `"primary"` or `"non_primary"` — anything else returns `422`.

15. **Hall ticket download** — Check `hall_ticket_published == true` before showing download button. The endpoint itself returns a PDF binary.

16. **Fee class mappings have no section** — `fee_class_mappings` is class-level only; there's no `section_id` on this model.

17. **`cschema` in error response** — Error responses include `cschema` field to help with debugging multi-tenant issues.

18. **Refresh token is one-time** — After refreshing, store the new `refresh_token` too (rotating tokens).
