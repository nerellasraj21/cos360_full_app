# Module Context - Student Management

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Student Management module handles:

- Student admissions and enrollment
- Student profile management
- Attendance tracking
- Certificate generation and management
- Document management
- Transport assignment
- Parent-student relationships

Evidence: `app/api/v1/student/`, `app/service/student/`, `context_guide.json:498-514`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model              | File                                              | Purpose                |
| ------------------ | ------------------------------------------------- | ---------------------- |
| Student            | `app/models/student/student_model.py`             | Core student data      |
| StudentDocument    | `app/models/student/student_document_model.py`    | Document attachments   |
| StudentCertificate | `app/models/student/student_certificate_model.py` | Generated certificates |
| CertificateType    | `app/models/student/certificate_type_model.py`    | Certificate templates  |
| StudentTransport   | `app/models/student/student_transport_model.py`   | Transport assignments  |
| StudentHomework    | `app/models/student/student_homework_model.py`    | Homework tracking      |
| Attendance         | `app/models/masters/attendance_model.py`          | Attendance records     |

### Services

| Service                   | File                             | Purpose                    |
| ------------------------- | -------------------------------- | -------------------------- |
| AdmissionService          | `admission_service.py`           | Student admission workflow |
| StudentService            | `student_service.py`             | Core student operations    |
| StudentAttendanceService  | `student_attendance_service.py`  | Attendance management      |
| StudentCertificateService | `student_certificate_service.py` | Certificate generation     |
| StudentDocumentService    | `student_document_service.py`    | Document handling          |
| StudentTransportService   | `student_transport_service.py`   | Transport assignment       |
| CertificateTypeService    | `certificate_type_service.py`    | Certificate type CRUD      |

### API Endpoints

| Endpoint File                    | Routes                                |
| -------------------------------- | ------------------------------------- |
| `admission_endpoints.py`         | `/api/v1/students/admissions/`        |
| `attendance_endpoints.py`        | `/api/v1/students/attendance/`        |
| `certificate_endpoints.py`       | `/api/v1/students/certificates/`      |
| `certificate_type_endpoints.py`  | `/api/v1/students/certificate-types/` |
| `student_document_endpoints.py`  | `/api/v1/students/documents/`         |
| `student_transport_endpoints.py` | `/api/v1/students/transport/`         |
| `student_parent_endpoints.py`    | `/api/v1/students/parents/`           |

---

## Data Model Summary

[EVIDENCE-BASED]

### Student

- `id` (UUID): Primary key
- `admission_number`: Auto-generated (ADM{YEAR}{SEQUENCE})
- `first_name`, `last_name`: Name fields
- `date_of_birth`: Birth date
- `gender`: Gender
- `class_id` (UUID FK): Assigned class
- `section_id` (UUID FK): Assigned section
- `academic_year_id` (UUID FK): Enrollment year
- `user_id` (UUID FK): Associated user account
- `is_active`: Enrollment status
- `photo` (VARCHAR 500, nullable): Relative URL path to student profile photo (e.g. `/media/student/photos/{id}.jpg`) — **Added 2026-04-22**

### StudentDocument

- `id` (UUID): Primary key
- `student_id` (UUID FK): Parent student
- `document_type`: Type identifier
- `file_path`: Storage path
- `uploaded_at`: Upload timestamp

### StudentCertificate

- `id` (UUID): Primary key
- `student_id` (UUID FK): Parent student
- `certificate_type_id` (UUID FK): Certificate template
- `generated_at`: Generation timestamp
- `file_path`: Storage path

### Attendance

- `id` (UUID): Primary key
- `student_id` (UUID FK): Student
- `date`: Attendance date
- `status`: Present/Absent/Late/Excused
- `remarks`: Optional notes

---

## Invariants & Rules

[EVIDENCE-BASED]

### Admission Number Generation

- Format: `ADM{YEAR}{SEQUENCE}` (e.g., ADM2024001)
- Auto-generated during admission process

Evidence: `context_guide.json:508-509`

### Parent-Student Linking

- Students can have multiple parents
- Parents can have multiple students
- Association table: `student_parent_association`

Evidence: `app/models/masters/student_parent_association_model.py`

### Session Context Issue (FIXED)

- **Problem**: flush() before SELECT required for multi-tenant compatibility
- **Status**: RESOLVED in admission_service.py

Evidence: `context_guide.json:503-506`

---

## Public Interfaces

[EVIDENCE-BASED]

### Admission Endpoints

```
POST   /api/v1/students/admissions/
  - Create new student admission
  - Input: Student details, class, section, parent info

GET    /api/v1/students/admissions/
  - List all students with pagination

GET    /api/v1/students/admissions/{id}
  - Get student details

PUT    /api/v1/students/admissions/{id}
  - Update student information

PATCH  /api/v1/students/admissions/{id}
  - Partial update

DELETE /api/v1/students/admissions/{id}
  - Soft delete student
```

### Student Photo Endpoints (Added 2026-04-22)

```
POST   /api/v1/students/admission/id/{student_id}/photo
  - Upload student profile photo
  - Body: multipart/form-data, field name must be "photo"
  - Constraints: jpg/png/webp only, max 2 MB
  - Replaces existing photo (old file deleted from disk)
  - Returns: StudentOut with photo_url field

DELETE /api/v1/students/admission/id/{student_id}/photo
  - Delete student profile photo
  - Removes file from disk, sets photo column to null
  - Returns: { "detail": "Student photo deleted successfully" }
```

**Response field:** `photo_url` (e.g. `/media/student/photos/{student_id}.jpg`)
**File storage:** `media/student/photos/{student_id}.{ext}` on the server filesystem
**Frontend rendering:** Prepend API base URL minus `/api/v1` to `photo_url` to build the full image URL
**Required permission:** `student_admissions:update`

### Attendance Endpoints

```
POST   /api/v1/students/attendance/
  - Record attendance

GET    /api/v1/students/attendance/
  - Query attendance records

GET    /api/v1/students/attendance/student/{student_id}
  - Student's attendance history
```

### Certificate Endpoints

```
POST   /api/v1/students/certificates/
  - Generate certificate

GET    /api/v1/students/certificates/
  - List certificates

GET    /api/v1/students/certificates/{id}/download
  - Download certificate file
```

### Document Endpoints

```
POST   /api/v1/students/documents/
  - Upload document

GET    /api/v1/students/documents/student/{student_id}
  - List student's documents

DELETE /api/v1/students/documents/{id}
  - Delete document
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- Masters Module (classes, sections, academic years)
- Authentication Module (user accounts)
- Parent model from Masters

### File Storage

- Documents stored in filesystem (`student_documents/`)
- Certificates stored in `uploaded_certificates/`

---

## Known Risks

[INFERENCE]

### Data Integrity

1. **Orphan Records**: Deleting class/section may affect student assignments
2. **File Cleanup**: Deleted document references may leave orphan files

### Performance

1. **Large Uploads**: No visible file size limits on document uploads
2. **Certificate Generation**: PDF generation for large batches may be slow

---

## Test Coverage

[EVIDENCE-BASED]

- Production deployment successful with 6+ students created
- Critical fixes implemented and verified:
  - Session context issue: RESOLVED
  - Error handling: ENHANCED

Evidence: `context_guide.json:498-514`

---

## Uncertainties

[UNCERTAIN]

1. **Bulk Operations**: Bulk admission import capability not observed
2. **Archive Policy**: Student data retention/archival policy not documented
3. **Transfer Workflow**: Student transfer between classes/schools not visible
4. **Photo Management**: ~~Student photo upload/storage not explicitly documented~~ — **RESOLVED 2026-04-22**: `POST/DELETE /students/admission/id/{id}/photo` implemented; stored in `media/student/photos/`

---

---

## User-Context Aware Endpoints (March 2026)

[EVIDENCE-BASED]

Several student endpoints now use `check_user_resource_access` (from `app/tools/enhanced_permissions.py`) instead of `check_role_plan_permission_with_error`. These endpoints return different data depending on the caller's role and access scope.

### How it works

`UserContextService._determine_access_scope` checks in this priority order:

1. `{action}_own` → scope = `"own"` (Student seeing their own data)
2. `{action}_related` → scope = `"related"` (Parent seeing linked children)
3. `{action}` → scope = `"all"` (Admin/Teacher seeing everything)
4. None found → `"denied"` → 403

### Admission Endpoints (User-Context Aware)

| Endpoint | Permission checked | Student result | Parent result | Admin/Teacher result |
| -------- | ----------------- | -------------- | ------------- | -------------------- |
| `GET /students/admission/` | `student_admissions:list` | Own admission only | Linked children's admissions | All admissions |
| `GET /students/admission/id/{student_id}` | `student_admissions:read` | Own record only | Linked child's record | Any record |
| `GET /students/admission/search` | `student_admissions:list` | Own name match only | Children's name match | All matches |

### Attendance Endpoints (User-Context Aware)

| Endpoint | Who calls it | Required query params |
| -------- | ------------ | --------------------- |
| `GET /student/attendance/my-attendance` | Student (self) | `start_date`, `end_date` (both mandatory) |
| `GET /student/attendance/student/{student_id}/filter` | Parent / Admin / Teacher | `start_date`, `end_date` (both mandatory) |

> **IMPORTANT**: Both `start_date` and `end_date` are mandatory. Omitting either returns `422 Unprocessable Entity`. Frontend must always supply both — recommended default: first day of current month to today.

### Route Ordering Bug (Fixed March 2026)

`GET /my-attendance` was defined **after** `GET /{attendance_id}` in `attendance_endpoints.py`. FastAPI matched `/{attendance_id}` first and tried to parse `"my-attendance"` as a UUID → 422. Fixed by moving the static route before the dynamic one.

**Rule**: In FastAPI, always define static path segments (`/my-attendance`, `/search`, `/next-admission-number`) **before** dynamic segments (`/{id}`, `/{attendance_id}`).

### Transport Ownership Checks (March 2026)

`GET /students/student-transport/student/{student_id}` enforces ownership at the endpoint level:

- **Student role**: Verifies `student.user_id == current_user.sub` (UUID from JWT). Returns 403 if student_id doesn't match their own.
- **Parent role**: Verifies `student_id` is in the parent's linked children via `student_parent_links`. Returns 403 otherwise.
- **Admin/Teacher/Staff**: Uses `check_role_plan_permission_with_error` as before.

---

## Menu Structure for Student/Parent Roles (March 2026)

[EVIDENCE-BASED]

Student and Parent roles are limited to 13 menus (seeded by `seed_endpoints.py`). The URL allowlist used is:

```text
/dashboard
/students
/students/admission
/students/attendance
/students/studenttransport      (all lowercase — was /transport/studentTransport before fix)
/students/studentdocuments
/students/studentcertificates
/exam
/exam/exams
/exam/marks
/exam/hall-tickets
/exam/results
```

Admin Transport menus (`/transport/routes`, `/transport/vehicles`, etc.) are NOT included.

---

## Student Profile Endpoint (March 2026)

[EVIDENCE-BASED]

`GET /api/v1/profile/student/me` — Returns the logged-in student's profile.
`PUT /api/v1/profile/student/me` — Update profile (only `email` field is editable by the student).

Permissions required: `profile:read_own` and `profile:update_own` (seeded for Student role March 2026).

Service: `app/service/profile/student_profile_service.py`

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
