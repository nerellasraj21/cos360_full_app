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
| Model | File | Purpose |
|-------|------|---------|
| Student | `app/models/student/student_model.py` | Core student data |
| StudentDocument | `app/models/student/student_document_model.py` | Document attachments |
| StudentCertificate | `app/models/student/student_certificate_model.py` | Generated certificates |
| CertificateType | `app/models/student/certificate_type_model.py` | Certificate templates |
| StudentTransport | `app/models/student/student_transport_model.py` | Transport assignments |
| StudentHomework | `app/models/student/student_homework_model.py` | Homework tracking |
| Attendance | `app/models/masters/attendance_model.py` | Attendance records |

### Services
| Service | File | Purpose |
|---------|------|---------|
| AdmissionService | `admission_service.py` | Student admission workflow |
| StudentService | `student_service.py` | Core student operations |
| StudentAttendanceService | `student_attendance_service.py` | Attendance management |
| StudentCertificateService | `student_certificate_service.py` | Certificate generation |
| StudentDocumentService | `student_document_service.py` | Document handling |
| StudentTransportService | `student_transport_service.py` | Transport assignment |
| CertificateTypeService | `certificate_type_service.py` | Certificate type CRUD |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `admission_endpoints.py` | `/api/v1/students/admissions/` |
| `attendance_endpoints.py` | `/api/v1/students/attendance/` |
| `certificate_endpoints.py` | `/api/v1/students/certificates/` |
| `certificate_type_endpoints.py` | `/api/v1/students/certificate-types/` |
| `student_document_endpoints.py` | `/api/v1/students/documents/` |
| `student_transport_endpoints.py` | `/api/v1/students/transport/` |
| `student_parent_endpoints.py` | `/api/v1/students/parents/` |

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
4. **Photo Management**: Student photo upload/storage not explicitly documented

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
