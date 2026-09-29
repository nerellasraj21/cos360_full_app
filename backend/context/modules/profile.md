# Module Context - Profile

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Profile module provides self-service profile management for users:
- View and update personal profile information
- Role-specific profile views (student, staff, parent)
- Profile audit logging

Evidence: `app/api/v1/profile/`, `app/service/profile/`

---

## Key Components

[EVIDENCE-BASED]

### Services
| Service | File | Purpose |
|---------|------|---------|
| BaseProfileService | `base_profile_service.py` | Common profile functionality |
| StudentProfileService | `student_profile_service.py` | Student self-service |
| StaffProfileService | `staff_profile_service.py` | Staff self-service |
| ParentProfileService | `parent_profile_service.py` | Parent self-service |
| ProfileAuditService | `profile_audit_service.py` | Profile change tracking |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `profile_endpoints.py` | `/api/v1/profile/` (general) |
| `student_profile_endpoints.py` | `/api/v1/profile/student/` |
| `staff_profile_endpoints.py` | `/api/v1/profile/staff/` |
| `parent_profile_endpoints.py` | `/api/v1/profile/parent/` |

---

## Service Architecture

[EVIDENCE-BASED]

### Inheritance Pattern
```
BaseProfileService
    ├── StudentProfileService
    ├── StaffProfileService
    └── ParentProfileService
```

### Base Service Features
- Common profile retrieval
- Update validation
- Audit logging integration

---

## Public Interfaces

[INFERENCE - based on file names and standard patterns]

### General Profile Endpoints
```
GET    /api/v1/profile/
  - Get current user's profile

PUT    /api/v1/profile/
  - Update current user's profile

GET    /api/v1/profile/audit
  - View profile change history
```

### Student Profile Endpoints
```
GET    /api/v1/profile/student/
  - Get student-specific profile data

PUT    /api/v1/profile/student/
  - Update student profile fields
```

### Staff Profile Endpoints
```
GET    /api/v1/profile/staff/
  - Get staff-specific profile data

PUT    /api/v1/profile/staff/
  - Update staff profile fields
```

### Parent Profile Endpoints
```
GET    /api/v1/profile/parent/
  - Get parent-specific profile data

PUT    /api/v1/profile/parent/
  - Update parent profile fields

GET    /api/v1/profile/parent/children
  - List linked students (children)
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies
- Authentication Module (current user context)
- Student Module (student records)
- Masters Module (staff, parent records)

---

## Unfixed Issues

[EVIDENCE-BASED]

### Database Refresh Pattern
- `student_profile_service.py` (1 instance)
- `staff_profile_service.py` (1 instance)
- `parent_profile_service.py` (1 instance)

Evidence: `context_guide.json:736-738`

---

## Known Risks

[INFERENCE]

### Security
1. **Data Exposure**: Profile endpoints must only return user's own data
2. **Sensitive Fields**: Some fields (e.g., address) may need extra protection

### Data Integrity
1. **Email Changes**: Email updates may affect login credentials
2. **Role Mismatch**: Profile type must match user's actual role

---

## Test Coverage

[UNCERTAIN]

- No specific test files observed
- Functionality implied by service implementations

---

## Uncertainties

[UNCERTAIN]

1. **Photo Upload**: Profile photo management not documented
2. **Verification Flow**: Profile change verification (email) unclear
3. **Privacy Settings**: User privacy preferences not visible
4. **Data Export**: Personal data export (GDPR) not observed

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
