# COS360 Mobile App — API Integration Reference

**Version:** 1.4.0
**Date:** March 2026
**Base URL:** `https://www.cos360.app/api/v1` (configured via `EXPO_PUBLIC_API_URL` in `.env`)

---

## 1. HTTP Client Configuration

**File:** `src/api/client.ts`

```typescript
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,  // set in .env
  timeout: 10000,
});
```

### Request Interceptor

Every request automatically includes:

- `Authorization: Bearer {access_token}` — from AsyncStorage
- `cschema: {tenant_schema}` — identifies the school client/tenant

### Response Interceptor

- **401 Unauthorized:** Triggers automatic token refresh via `POST /auth/login/refresh`
  - On success: retries original request with new token
  - On failure: clears stored tokens, redirects to login
- **Network Error:** Adds request to offline sync queue

---

## 2. Authentication API

**File:** `src/api/auth.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/login` | Login with username & password, returns JWT |
| POST | `/auth/login/refresh` | Refresh access token using refresh token |
| POST | `/auth/logout` | Invalidate tokens |
| GET | `/auth/academic-years` | List academic years (public, needs `cschema` header) |

### Login Request

```json
{
  "username": "admin",
  "password": "testpass123"
}
```

> The tenant schema is sent as the `cschema` header, not in the request body.

### Login Response

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": 1, "username": "admin", "email": "admin@school.com" },
  "role": { "id": 1, "name": "Admin" },
  "permissions": [
    { "resource": "exams", "action": "read", "is_granted": true }
  ]
}
```

---

## 3. Permission API

**File:** `src/api/mobilePermissions.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/auth/mobile/permissions/sync` | Sync all permissions for current user |
| POST | `/auth/permissions/check` | Check single permission |
| POST | `/auth/permissions/bulk-check` | Check multiple permissions at once |

### Permission Sync Response

```json
{
  "permissions": {
    "student_admissions": ["read", "create", "update", "list"],
    "fee_transactions": ["read", "list"],
    "exams": ["read", "list"]
  }
}
```

### Permission Cache

Permissions are cached locally in AsyncStorage after sync. Cache is used as fallback if server is unreachable.

---

## 4. Students API

**File:** `src/api/students.ts`

### Student Admissions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/students/admission/` | List all students |
| POST | `/students/admission/` | Create new student admission |
| PATCH | `/students/admission/{student_id}` | Update student |
| PATCH | `/students/admission/{student_id}/toggle-active` | Toggle active status |
| DELETE | `/students/admission/{admission_id}` | Delete student |
| GET | `/students/admission/id/{student_id}` | Get by internal ID |
| GET | `/students/admission/by-admission/{admission_id}` | Get by admission number |
| GET | `/students/admission/search` | Search students |
| GET | `/students/admission/students/dropdown` | Full dropdown list |
| GET | `/students/admission/students/dropdown/simple` | Simple dropdown list |
| GET | `/students/admission/my-admission` | Get own admission (student role) |
| GET | `/students/admission/my-children-admissions` | Get children (parent role) |
| GET | `/students/admission/admission-types/dropdown` | Admission types dropdown — returns `[{ value: 'primary', label: 'Primary Admission' }, { value: 'non_primary', label: 'Non-Primary Admission' }]` |
| GET | `/students/admission/next-admission-number` | Generate next admission number |

### Attendance

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/student/attendance/` | List attendance records |
| POST | `/student/attendance/` | Mark attendance |
| PATCH | `/student/attendance/by-date/{date}` | Bulk mark by date |
| PATCH | `/student/attendance/{id}` | Update attendance record |
| DELETE | `/student/attendance/{id}` | Delete record |
| GET | `/student/attendance/by-date/{date}` | Get attendance for a date |
| GET | `/student/attendance/student/{student_id}/filter` | Filter by student |

### Certificates

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/certificates/` | List certificates |
| POST | `/certificates/` | Create certificate |
| PATCH | `/certificates/{id}` | Update certificate |
| DELETE | `/certificates/{id}` | Delete certificate |
| GET | `/certificates/{id}` | Get certificate detail |
| GET | `/certificates/{id}/download` | Download certificate file |
| GET | `/certificates/types/` | List certificate types |
| POST | `/certificates/types/` | Create certificate type |
| PUT | `/certificates/types/{id}` | Update type |
| DELETE | `/certificates/types/{id}` | Delete type |
| GET | `/certificates/my` | Student's own certificates |
| GET | `/certificates/my-child/{student_id}` | Parent view of child certificates |
| GET | `/certificates/by-student/{student_id}` | Admin view by student |

### Documents

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/students/documents/` | List documents |
| POST | `/students/documents/` | Upload document |
| PATCH | `/students/documents/{id}` | Update document |
| DELETE | `/students/documents/{id}` | Delete document |

### Student Transport

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/students/student-transport/` | List student transport assignments |
| POST | `/students/student-transport/` | Assign student to route/stop |
| PATCH | `/students/student-transport/{id}` | Update transport assignment |
| DELETE | `/students/student-transport/{id}` | Remove assignment |
| GET | `/students/student-transport/student/{student_id}` | Get transport for student |

### Timetable (Student)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/students/timetable/section/{sectionId}` | Get section timetable |
| GET | `/students/timetable/frontend/{sectionId}` | Frontend timetable view |
| POST | `/students/timetable/bulk` | Bulk create timetable entries |
| PUT | `/students/timetable/frontend/{sectionId}` | Update timetable |

---

## 5. Masters API

**File:** `src/api/masters.ts`

### Academic Years

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/academic_years/` | List academic years |
| POST | `/masters/academic_years/` | Create academic year |
| PUT | `/masters/academic_years/{id}` | Update |
| DELETE | `/masters/academic_years/{id}` | Delete |
| GET | `/masters/academic_years/{id}` | Get by ID |
| GET | `/masters/academic_years/dropdown` | Dropdown list |

### Classes & Sections

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/class_sections/read_all` | List all class-sections |
| POST | `/masters/class_sections/` | Create class-section |
| PUT | `/masters/class_sections/{id}` | Update |
| DELETE | `/masters/class_sections/{id}` | Delete |
| GET | `/masters/class_sections/{id}` | Get by ID |
| GET | `/masters/class_sections/dropdown` | Dropdown list |
| GET | `/masters/class_sections/class-list` | Classes only |
| GET | `/masters/class_sections/section-list` | Sections only |
| POST | `/masters/class_sections/{classId}/sections` | Add section to class |
| PUT | `/masters/class_sections/sections/{sectionId}` | Update section |
| DELETE | `/masters/class_sections/sections/{sectionId}` | Delete section |

### Subjects

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/subjects/` | List subjects |
| POST | `/masters/subjects/` | Create subject |
| PUT | `/masters/subjects/{id}` | Update |
| DELETE | `/masters/subjects/{id}` | Delete |
| GET | `/masters/subjects/dropdown` | Dropdown list |
| GET | `/masters/subject_categories/categories` | List subject categories |
| POST | `/masters/subject_categories/categories` | Create category |
| PUT | `/masters/subject_categories/categories/{id}` | Update |
| DELETE | `/masters/subject_categories/categories/{id}` | Delete |
| GET | `/masters/class-subject-mappings/` | List class-subject mappings |
| POST | `/masters/class-subject-mappings/` | Create mapping |
| POST | `/masters/class-subject-mappings/bulk` | Bulk create mappings |
| PUT | `/masters/class-subject-mappings/{id}` | Update |
| DELETE | `/masters/class-subject-mappings/{id}` | Delete |

### Holidays

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/holidays/` | List holidays |
| POST | `/masters/holidays/` | Create holiday |
| PUT | `/masters/holidays/{id}` | Update |
| DELETE | `/masters/holidays/{id}` | Delete |
| PATCH | `/masters/holidays/{id}/activate` | Toggle active |
| GET | `/masters/holidays/dropdown` | Dropdown list |

### Roles & Permissions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/admin/role-mgmt/roles/` | List roles |
| POST | `/admin/role-mgmt/` | Create role |
| PUT | `/admin/role-mgmt/roles/{id}` | Update role |
| DELETE | `/admin/role-mgmt/roles/{id}` | Delete role |
| GET | `/auth/resource-permissions/` | List resource permissions |
| POST | `/auth/resource-permissions/` | Create resource permission |
| POST | `/auth/resource-permissions/bulk` | Bulk create |
| PUT | `/auth/resource-permissions/{id}` | Update |
| DELETE | `/auth/resource-permissions/{id}` | Delete |
| GET | `/auth/resource-permissions/matrix/all` | Full permission matrix |
| GET | `/auth/available-resources` | List available resources |

### Castes (Dropdown)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/castes/dropdown` | List castes |
| GET | `/masters/castes/{casteId}/sub-castes/dropdown` | Sub-castes for caste |

---

## 6. Fees API

**File:** `src/api/fees.ts`

### Fee Categories

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/categories/` | List fee categories |
| POST | `/fee/categories/` | Create category |
| PUT | `/fee/categories/{id}` | Update category |
| DELETE | `/fee/categories/{id}` | Delete category |
| GET | `/fee/categories/{id}` | Get by ID |
| GET | `/fee/categories/dropdown` | Dropdown list |

### Fee Types

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/types/` | List fee types |
| POST | `/fee/types/` | Create fee type |
| PUT | `/fee/types/{id}` | Update |
| DELETE | `/fee/types/{id}` | Delete |
| GET | `/fee/types/{id}` | Get by ID |
| GET | `/fee/types/dropdown` | Dropdown list |

### Fee Terms

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/terms/` | List payment terms |
| POST | `/fee/terms/` | Create term |
| PUT | `/fee/terms/{id}` | Update |
| DELETE | `/fee/terms/{id}` | Delete |
| GET | `/fee/terms/{id}` | Get by ID |
| GET | `/fee/terms/dropdown` | Dropdown list |
| GET | `/fee/terms/{feeTermId}/dates` | Get term dates |
| DELETE | `/fee/terms/dates/{feeTermDateId}` | Delete term date |

### Fee Mappings (Class-Level)

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/class-mappings/` | List class fee mappings |
| POST | `/fee/class-mappings/` | Create class mapping |
| PUT | `/fee/class-mappings/{id}` | Update mapping |
| DELETE | `/fee/class-mappings/{id}` | Delete mapping |
| GET | `/fee/class-mappings/{id}` | Get by ID |
| POST | `/fee/class-mappings/bulk` | Bulk create mappings |

### Fee Term Amounts

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/class-mapping-term-amounts/` | List term amounts |
| POST | `/fee/class-mapping-term-amounts/` | Create term amount |
| PUT | `/fee/class-mapping-term-amounts/{id}` | Update amount |
| DELETE | `/fee/class-mapping-term-amounts/{id}` | Delete |

### Fee Collection

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/collection/search-student` | Search student for collection |
| GET | `/fee/collection/summary/{student_id}` | Get fee summary (admin) |
| GET | `/fee/collection/my-summary` | Own fee summary (student) |
| GET | `/fee/collection/child-summary/{student_id}` | Child fee summary (parent) |
| POST | `/fee/collection/pay` | Process fee payment |
| GET | `/fee/collection/receipts/{receipt_id}/pdf` | Download receipt PDF |

### Fee Concessions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/fee/concessions/bulk` | Bulk create concessions |
| GET | `/fee/concessions/student/{student_id}` | Get student concessions |
| GET | `/fee/concessions/history/{student_id}` | Concession history |
| GET | `/fee/concessions/{concession_id}` | Get by ID |
| PUT | `/fee/concessions/{concession_id}` | Update |
| DELETE | `/fee/concessions/{concession_id}` | Delete |

### Fee Receipts

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/receipts/` | List all receipts |
| POST | `/fee/receipts/` | Create receipt |
| PUT | `/fee/receipts/{id}` | Update receipt |
| DELETE | `/fee/receipts/{id}` | Delete receipt |
| GET | `/fee/receipts/{id}` | Get by ID |
| POST | `/fee/receipts/generate/{transaction_id}` | Generate receipt for transaction |
| POST | `/fee/receipts/{id}/reprint` | Reprint receipt |
| GET | `/fee/receipts/{id}/verify` | Verify receipt |
| GET | `/fee/receipts/number/{receiptNumber}` | Get by receipt number |
| GET | `/fee/receipts/{id}/content` | Get receipt content |

### Fee Transactions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/transactions/` | List transactions |
| POST | `/fee/transactions/` | Record transaction |
| PUT | `/fee/transactions/{id}` | Update transaction |
| DELETE | `/fee/transactions/{id}` | Delete transaction |
| GET | `/fee/transactions/{id}` | Get by ID |
| GET | `/fee/transactions/student/{student_id}/history` | Student transaction history |
| GET | `/fee/transactions/student/{student_id}/outstanding` | Outstanding fees |
| GET | `/fee/transactions/transaction-number/{transactionNumber}` | Get by transaction number |

### Fee Refunds

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/refunds/` | List refunds |
| POST | `/fee/refunds/` | Create refund |
| PUT | `/fee/refunds/{id}` | Update refund |
| DELETE | `/fee/refunds/{id}` | Delete refund |
| GET | `/fee/refunds/{id}` | Get by ID |
| POST | `/fee/refunds/approve` | Approve refund |
| POST | `/fee/refunds/process` | Process refund |
| GET | `/fee/refunds/pending/approval` | List pending approval |
| GET | `/fee/refunds/approved/processing` | List approved/processing |
| GET | `/fee/refunds/transaction/{transactionId}/summary` | Refund summary for transaction |

### Fee Student Mappings

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/student-mappings/` | List student fee mappings |
| POST | `/fee/student-mappings/` | Create mapping |
| PUT | `/fee/student-mappings/{id}` | Update mapping |
| DELETE | `/fee/student-mappings/{id}` | Delete mapping |
| GET | `/fee/student-mappings/{id}` | Get by ID |
| POST | `/fee/student-mappings/bulk` | Bulk create |

### Fee Reports

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/reports/fees/collection-summary/stats` | Aggregate collection stats |
| GET | `/reports/fees/collection-summary` | Collection summary rows (paginated) |
| GET | `/reports/fees/pending-fees` | Pending fees report (paginated) |
| GET | `/reports/fees/fee-structure` | Fee structure report (paginated) |

---

## 7. Transport API

**Files:**
- `src/api/masters.ts` — Routes, Vehicles, Route Stops, Trips (masters data)
- `src/api/students.ts` — Student Transport assignments (correct schema — NOT masters.ts)
- `src/api/transport.ts` — Re-exports from masters; generic transport helpers
**Hooks:** `hooks/use-transport.ts` (routes/vehicles/trips), `src/api/hooks/students/transport.ts` (student assignments)

> **IMPORTANT:** Always import `studentTransportApi` from `src/api/students` (NOT `src/api/masters` or `src/api`). The `src/api/index.ts` exports the OLD masters-based `studentTransportApi` — do not use it for student transport screens.

**Student Transport payload** (`POST /students/student-transport/`):

```json
{ "student_id": "uuid", "trip_id": "uuid", "stop_id": "uuid", "fee_per_term": 1200.00, "pricing_id": "uuid (optional)" }
```

**Student Transport response** (`StudentTransportOut`) key fields: `trip.route.route_name`, `trip.trip_number`, `stop.name`, `stop.pickup_time`, `stop.drop_time`, `fee_per_term`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/routes/all_routes` | List all routes |
| GET | `/masters/routes/dropdown` | Routes dropdown |
| GET | `/masters/routes/routeid/{id}` | Get route by ID |
| POST | `/masters/routes/` | Create route |
| PUT | `/masters/routes/{id}` | Update route |
| DELETE | `/masters/routes/{id}` | Delete route |
| GET | `/masters/vehicles/` | List vehicles |
| GET | `/masters/vehicles/{id}` | Get vehicle |
| GET | `/masters/vehicles/dropdown` | Vehicles dropdown |
| POST | `/masters/vehicles/` | Add vehicle |
| PUT | `/masters/vehicles/{id}` | Update vehicle |
| DELETE | `/masters/vehicles/{id}` | Delete vehicle |
| GET | `/masters/route-stops/` | List route stops |
| GET | `/masters/route-stops/{id}` | Get stop |
| POST | `/masters/route-stops/` | Add stop |
| PUT | `/masters/route-stops/{id}` | Update stop |
| DELETE | `/masters/route-stops/{id}` | Delete stop |
| GET | `/masters/trips/` | List trips |
| GET | `/masters/trips/{id}` | Get trip |
| POST | `/masters/trips/` | Create trip |
| PUT | `/masters/trips/{id}` | Update trip |
| DELETE | `/masters/trips/{id}` | Delete trip |
| GET | `/students/student-transport/` | List student transport assignments |
| POST | `/students/student-transport/` | Assign student to route/stop |
| PATCH | `/students/student-transport/{id}` | Update assignment |
| DELETE | `/students/student-transport/{id}` | Remove assignment |
| GET | `/students/student-transport/student/{student_id}` | Student transport detail |

---

## 8. Staff API

**File:** `src/api/staff.ts`

### Enrollments

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/staff/enrollments/` | List all staff |
| POST | `/staff/enrollment` | Enroll staff member |
| PATCH | `/staff/enrollment/{id}` | Update staff |
| DELETE | `/staff/enrollment/{id}` | Delete staff |
| GET | `/staff/enrollment/{id}` | Get by ID |
| GET | `/staff/enrollment/{staffId}` | Get by staff ID |
| GET | `/profile/staff/me` | Get own profile |
| PUT | `/profile/staff/me` | Update own profile |

### Staff Attendance

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/staff/attendance` | List attendance |
| POST | `/staff/attendance` | Mark attendance |
| PATCH | `/staff/attendance/{id}` | Update record |
| DELETE | `/staff/attendance/{id}` | Delete record |
| GET | `/staff/{staffId}/attendance/filter` | Filter by staff |

### Designations

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/staff/designations/` | List designations |
| POST | `/staff/designations/` | Create designation |
| PUT | `/staff/designations/{id}` | Update |
| DELETE | `/staff/designations/{id}` | Delete |
| GET | `/staff/designations/{id}` | Get by ID |
| GET | `/staff/designations/dropdown` | Dropdown list |

### Assignments

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/staff/assignments/` | List assignments |
| POST | `/staff/assignments/` | Create assignment |
| PUT | `/staff/assignments/{id}` | Update |
| GET | `/staff/assignments/staff/{staffId}` | Get by staff |

---

## 9. Expense API

**File:** `src/api/expense.ts`

### Categories & Types

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense/categories` | List categories |
| POST | `/expense/categories` | Create category |
| PUT | `/expense/categories/{id}` | Update |
| DELETE | `/expense/categories/{id}` | Delete |
| GET | `/expense/categories/dropdown` | Dropdown |
| GET | `/expense/types` | List expense types |
| POST | `/expense/types` | Create type |
| PUT | `/expense/types/{id}` | Update |
| DELETE | `/expense/types/{id}` | Delete |
| GET | `/expense/types/dropdown` | Dropdown |

### Departments

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense/departments` | List departments |
| POST | `/expense/departments` | Create department |
| GET | `/expense/departments/dropdown` | Dropdown |

### Transactions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense/transactions` | List transactions |
| POST | `/expense/transactions` | Create transaction |
| PUT | `/expense/transactions/{id}` | Update |
| DELETE | `/expense/transactions/{id}` | Delete |
| GET | `/expense/transactions/{id}` | Get by ID |
| GET | `/expense/transactions/pending/approval` | Pending approval list |
| POST | `/expense/transactions/{id}/approval` | Approve/reject transaction |

### Attachments

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense/attachments/transactions/{transactionId}/list` | List attachments |
| POST | `/expense/attachments/transactions/{transactionId}/upload` | Upload attachment |
| PUT | `/expense/attachments/{attachmentId}` | Update attachment |
| DELETE | `/expense/attachments/{attachmentId}` | Delete |
| GET | `/expense/attachments/{attachmentId}/download` | Download file |

### Audit

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense/audit/logs` | **Global** audit log list (filterable by `action`, `action_category`, `transaction_id`, `actor_user_id`, `skip`, `limit`) |
| GET | `/expense/audit/transactions/{transactionId}/logs` | Per-transaction audit logs |
| GET | `/expense/audit/transactions/{transactionId}/summary` | Per-transaction audit summary |
| GET | `/expense/audit/logs/{audit_log_id}` | Get single audit log by ID |

### Reports & Settings

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense/reports/by-category` | Report by category |
| GET | `/expense/reports/by-type` | Report by type |
| GET | `/expense/reports/trend` | Trend report |
| GET | `/expense/reports/summary` | Summary report |
| POST | `/expense/reports` | Generate export |
| GET | `/expense/reports/export/{exportId}/status` | Export status |
| GET | `/expense/settings` | List settings |
| POST | `/expense/settings` | Create setting |
| PUT | `/expense/settings/{id}` | Update setting |
| DELETE | `/expense/settings/{id}` | Delete setting |

---

## 10. Profile API

**File:** `src/api/profile.ts`
**Exports:** `studentProfileApi`, `staffProfileApi`, `parentProfileApi` — all three are exported from `src/api/index.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/profile/student/me` | Get own student profile |
| PUT | `/profile/student/me` | Update student profile |
| GET | `/profile/staff/me` | Get own staff profile |
| PUT | `/profile/staff/me` | Update staff profile |
| GET | `/profile/parent/me` | Get own parent profile |
| PUT | `/profile/parent/me` | Update parent profile |

---

## 11. Exam API

**File:** `src/api/exam.ts`

### Exam Management

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/exams` | List exams (filter: `exam_status`) |
| POST | `/exams` | Create exam |
| GET | `/exams/{examId}` | Get exam details |
| PUT | `/exams/{examId}` | Update exam |
| DELETE | `/exams/{examId}` | Delete exam |
| POST | `/exams/{examId}/clone` | Clone exam |
| POST | `/exams/{examId}/unlock` | Unlock for corrections |
| GET | `/exams/{examId}/class-sections` | Get exam class-sections |
| POST | `/exams/{examId}/class-sections` | Add class-section to exam |
| GET | `/exams/{examId}/subject-configs` | Get subject configs |
| PUT | `/exams/{examId}/subject-configs/{configId}` | Update config |
| POST | `/exams/{examId}/notify` | Send notifications |

> **Exam name field:** `exam_name` (NOT `title`). **Status values:** `draft | active | locked | published | finalized`

### Mark Entry

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/exams/{examId}/marks` | Get marks grid (param: `page_size`) |
| POST | `/exams/{examId}/marks` | Save marks (requires `component_id`) |
| POST | `/exams/{examId}/marks/upload` | Bulk upload marks via Excel |

### Results

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/exams/{examId}/compute` | Compute results |
| POST | `/exams/{examId}/publish` | Publish results |
| GET | `/exams/{examId}/results` | List results |
| GET | `/exams/{examId}/results/{studentId}` | Get student result (admin) |
| GET | `/exams/{examId}/my-result` | Student's own result |
| GET | `/exams/{examId}/child-result/{studentId}` | Child result (parent) |
| GET | `/exams/{examId}/my-marks` | Student's own marks |
| GET | `/exams/{examId}/child-marks/{studentId}` | Child marks (parent) |

> **Result fields:** `is_passed`, `total_marks_obtained`, `grade_label`

### Hall Tickets

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/exams/{examId}/hall-tickets/compute` | Compute eligibility |
| GET | `/exams/{examId}/hall-tickets/enrolled-students` | All enrolled students |
| GET | `/exams/{examId}/hall-tickets/eligible` | Eligible students |
| GET | `/exams/{examId}/hall-tickets/ineligible` | Ineligible students |
| PUT | `/exams/{examId}/hall-tickets/{studentId}/override` | Override eligibility |
| POST | `/exams/{examId}/hall-tickets/publish` | Publish hall tickets |
| GET | `/exams/{examId}/hall-tickets/download` | Download single PDF |
| GET | `/exams/{examId}/hall-tickets/download-all` | Download all as ZIP |

### Exam Dates

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/exams/{examId}/dates` | List exam dates |
| POST | `/exams/{examId}/dates` | Add exam date |
| POST | `/exams/{examId}/dates/bulk` | Bulk add dates |
| PUT | `/exams/{examId}/dates/{dateId}` | Update date |
| DELETE | `/exams/{examId}/dates/{dateId}` | Delete date |

### Grade Schemes

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/grade-schemes/exam` | List exam grade schemes |
| POST | `/grade-schemes/exam` | Create scheme |
| PUT | `/grade-schemes/exam/{schemeId}` | Update |
| DELETE | `/grade-schemes/exam/{schemeId}` | Delete |
| GET | `/grade-schemes/subject` | List subject grade schemes |
| POST | `/grade-schemes/subject` | Create |
| PUT | `/grade-schemes/subject/{schemeId}` | Update |
| DELETE | `/grade-schemes/subject/{schemeId}` | Delete |

### Board Patterns & Templates

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/board-patterns` | List board patterns |
| POST | `/board-patterns` | Create pattern |
| PUT | `/board-patterns/{patternId}` | Update |
| DELETE | `/board-patterns/{patternId}` | Delete |
| GET | `/exam-patterns/templates` | List exam templates |
| POST | `/exam-patterns/templates` | Create template |
| DELETE | `/exam-patterns/templates/{templateId}` | Delete |
| POST | `/exam-patterns/{examId}/apply-template` | Apply template to exam |

---

## 12. Communication API

**File:** `src/api/communication.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/send/` | Send message (SMS/WhatsApp/Email) |
| GET | `/send/templates/` | List message templates |
| POST | `/send/templates/` | Create template |
| PUT | `/send/templates/{id}` | Update template |
| DELETE | `/send/templates/{id}` | Delete template |
| GET | `/send/logs` | List message logs |

**Channels:** `sms`, `whatsapp`, `email`

---

## 13. Special Headers

| Header | Value | Required On |
| ------ | ----- | ----------- |
| `Authorization` | `Bearer {access_token}` | All authenticated requests |
| `cschema` | `{tenant_schema}` | All requests |
| `X-Student-ID` | `{student_id}` | Parent user requests for student data |
| `X-Academic-Year-ID` | `{year_id}` | Context-specific queries |
| `X-Class-ID` | `{class_id}` | Context-specific queries |

---

## 14. Error Handling

| HTTP Status | Meaning | App Behavior |
| ----------- | ------- | ------------ |
| 200/201 | Success | Normal data flow |
| 400 | Bad Request / Validation Error | Show field-level errors |
| 401 | Unauthorized | Attempt token refresh; if fails → logout |
| 403 | Forbidden (no permission) | Show AccessDenied screen |
| 404 | Not Found | Show not found message |
| 422 | Validation Error | Show validation messages |
| 500 | Server Error | Show generic error toast |
| Network Error | No connectivity | Queue request for retry |

**File:** `services/errorHandler.ts`

### Mutation Feedback Pattern

All CRUD mutations use `useToastContext()` for result feedback. Do not use `Alert.alert` for mutation success/error — reserve alerts for destructive confirmation dialogs only.

```typescript
import { useToastContext } from '@/components/ToastProvider';

const { showSuccess, showError } = useToastContext();

const mutation = useMutation({
  mutationFn: api.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    showSuccess('Created', 'Item has been created.');
    closeModal();
  },
  onError: (err) => showError('Failed', err.message),
});
```

---

COS360 School Management System — API Integration Reference — March 2026
