# Module Context – Students

Version: 1.1
Generated On: 2025-12-26
Last Updated: 2026-02-27
Source: Codebase Analysis + Feature Handovers
Confidence Level: High

---

## Responsibility

The Students module manages all student-related functionality:

1. **Student Admission**: Multi-step enrollment process
2. **Attendance Tracking**: Daily student attendance management
3. **Documents Management**: Upload and view student documents
4. **Certificates Management**: Certificate types and student certificates
5. **Student Profile**: View and edit student information

---

## Key Components

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/students.tsx` | Students section layout |
| `src/routes/_app/students/admission.tsx` | Student admission page |
| `src/routes/_app/students/admission/$admissionId.tsx` | Edit specific admission |
| `src/routes/_app/students/attendance.tsx` | Student attendance page |
| `src/routes/_app/students/profile.tsx` | Student profile page |
| `src/routes/_app/students/documentsupload.tsx` | Document upload page |
| `src/routes/_app/students/mydocuments.tsx` | View my documents |
| `src/routes/_app/students/studentdocuments.tsx` | View student documents (admin) |
| `src/routes/_app/students/certificatesupload.tsx` | Certificate upload |
| `src/routes/_app/students/mycertificates.tsx` | View my certificates |
| `src/routes/_app/students/studentcertificates.tsx` | View student certificates (admin) |
| `src/routes/_app/students/certificatetypes.tsx` | Certificate type management |

### API Hooks

| File | Purpose |
|------|---------|
| `src/api/hooks/students/admissions.ts` | Admission CRUD hooks |
| `src/api/hooks/students/attendance.ts` | Attendance hooks |
| `src/api/hooks/students/documents.ts` | Document management hooks |
| `src/api/hooks/students/certificates.ts` | Certificate hooks |
| `src/api/hooks/students/profile.ts` | Profile data hooks |
| `src/api/hooks/students/useAdmission.ts` | Admission form hooks |
| `src/api/hooks/students/useStudentProfile.ts` | Student profile hooks |

### API Endpoints

| File | Purpose |
|------|---------|
| `src/api/students/admissions.ts` | Admission API functions |

### Components and Pages

| Directory | Purpose |
|-----------|---------|
| `src/components/students/` | Student-related components |
| `src/components/students/admission-steps/` | Multi-step admission form step components |
| `src/pages/students/` | Student page components |

---

## Data Model Summary

### Student Admission Types

```typescript
// src/types/admission.ts
interface StudentAdmissionCreate { /* Complex multi-field admission data */ }
interface StudentAdmissionResponse {
  student_id: string;
  /* Full admission response data */
}
interface StudentAdmissionUpdate { /* Update fields */ }

interface StudentOut {
  id: string;
  name: string;
  admission_number: string;
  /* Additional student fields */
}
```

### Dropdown Types

```typescript
interface StudentDropdownItem {
  id: string;
  name: string;
  admission_number: string;
  class_name: string;
}

interface StudentDropdownSimpleItem {
  id: string;
  name: string;
}
```

---

## Admission Form — Steps and Features

### Form Structure (Multi-Step)

The admission form is divided into steps implemented under `src/components/students/admission-steps/`:

```
Step 1: Personal Information
  - Student name, DOB, gender
  - Mother tongue (dropdown — hardcoded/master list)
  - Academic year (taken from header store, not re-entered)
  - Class and Section (cascading: Class → Section)
  - Primary Status (moved to Step 1)

Step 2: Parent/Guardian Information
  - Father, Mother, Guardian details
  - Parent search by phone number (search existing parent records)
  - Salary range (pending backend support)

Step 3: Address Information
  - Current and permanent address
  - Location fields (State/District/Mandal) — pending backend support

Step 4: Other Details
  - Health information, certificates
  - Experience fields (label updated)

Preview: Summary before submission
```

### Implemented Features (Production-Ready)

| Feature | Status | Notes |
|---------|--------|-------|
| Mother tongue dropdown | Done | Hardcoded language list |
| Academic year from header | Done | Uses `academicYearStore` — not re-entered on form |
| Class/Section cascade sync | Done | Checkbox "Same as Admission Class" syncs fields |
| Primary Status on Step 1 | Done | Moved from later step |
| Parent search by phone | Done | Search existing parent records by phone number |

### Pending Features (Backend Required)

| Feature | Backend Need |
|---------|-------------|
| Auto-generate admission number | `GET /students/admissions/next-number?type=primary` |
| Caste/Sub-Caste dropdowns | `/masters/castes` + `/masters/castes/{id}/sub-castes` |
| Parent salary range | `salary_range` field on parent model |
| Location masters (State/District/Mandal) | `/masters/states`, `/masters/districts`, `/masters/mandals` |

### Cascading Dropdown Behavior

```
Class dropdown → changes → clears Section dropdown
Section dropdown → depends on selected class ID
"Same as Admission Class" checkbox → syncs Class+Section fields
```

---

## Invariants & Rules

### Admission Process

1. Multi-step form with validation at each step
2. Academic year auto-populated from `academicYearStore` (not shown as a field on the form)
3. Parent information linked to admission
4. Permission-protected at every CRUD operation

### Permission-Protected Operations

```typescript
// Admission list
usePermissionProtectedQuery({
  resource: 'student_admissions',
  action: 'list',
})

// Create admission
usePermissionProtectedMutation({
  resource: 'student_admissions',
  action: 'create',
})

// Update admission
usePermissionProtectedMutation({
  resource: 'student_admissions',
  action: 'update',
})
```

**Evidence**: `src/api/hooks/students/admissions.ts`

### Student Status Toggle

- Students can be enabled/disabled
- Status toggle requires `update` permission on `student_admissions`

---

## Public Interfaces

### Query Hooks

```typescript
useAdmissions(params?: { skip?: number; limit?: number })
useAdmissionByStudentId(studentId: string)
useStudentByAdmissionId(admissionId: string)
useStudentsSearch(query: string)
useStudentsDropdown(activeOnly?: boolean)
useStudentsDropdownSimple(activeOnly?: boolean)
useStudentAttendance(...)
useStudentDocuments(...)
useStudentCertificates(...)
```

### Mutation Hooks

```typescript
useCreateAdmission()
useUpdateAdmission()
useToggleStudentStatus()
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/students/admissions` | GET | List admissions |
| `/students/admissions` | POST | Create admission |
| `/students/admissions/{id}` | PUT | Update admission |
| `/students/dropdown` | GET | Student dropdown list |
| `/students/dropdown/simple` | GET | Simple dropdown list |
| `/students/search` | GET | Search students |

### Student Attendance API

The student attendance API had a known fix (endpoint/params/response). See `docs/STUDENT_ATTENDANCE_API_FIX.md` if available.

---

## Dependencies

### Internal Dependencies

- **Authentication Module**: Permission checking via `usePermissionProtectedQuery/Mutation`
- **Masters Module**: Academic years, classes, sections for admission
- **Dropdown System**: `StudentsDropdown` component

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **react-hook-form**: Form management
- **zod**: Form validation
- **sonner**: Toast notifications

---

## Known Risks

### Data Integrity

1. **Duplicate Admissions**: No client-side check for duplicate admission numbers (pending auto-generate feature)
2. **Orphan Records**: Parent-student relationship management unclear

### Performance

1. **Large Student Lists**: Pagination support exists but usage patterns unclear
2. **Dropdown Loading**: Active-only filtering may still load large datasets

### User Experience

1. **Multi-step Form**: Loss of data on navigation/refresh
2. **Document Upload**: File size/type validation at upload time

---

## Test Coverage

No dedicated student module tests found in codebase.

---

## Uncertainties

1. **Admission Workflow States**: Full admission workflow (pending, approved, etc.) unclear
2. **Document Storage**: Storage mechanism (S3, local, etc.) unknown
3. **Certificate Generation**: How certificates are generated/templated unclear
4. **Student Transfer**: Transfer between classes/sections mechanism unclear
5. **Historical Data**: How historical attendance/academic data is maintained
6. **Photo Upload**: Student photo handling not analyzed in detail
7. **Bulk Operations**: Bulk admission import capability unclear
