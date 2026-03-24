# COS360 Mobile App — API Integration Reference

**Version:** 1.2.0
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

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/login` | Login with username & password |
| POST | `/auth/login/refresh` | Refresh access token using refresh token |
| POST | `/auth/logout` | Invalidate tokens |

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
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@school.com"
  },
  "role": {
    "id": 1,
    "name": "Admin"
  },
  "permissions": [
    { "id": "exams:read", "resource": "exams", "action": "read", "is_granted": true }
  ]
}
```

---

## 3. Permission API

**File:** `src/api/mobilePermissions.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/auth/mobile/permissions/sync` | Sync all permissions for current user |
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

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/students` | List students with search/filter |
| POST | `/students` | Create new student (admission) |
| GET | `/students/{id}` | Get student details |
| PUT | `/students/{id}` | Update student info |
| DELETE | `/students/{id}` | Delete student |
| GET | `/students/{id}/attendance` | Get student attendance |
| POST | `/students/{id}/attendance` | Mark attendance |
| GET | `/students/{id}/documents` | List student documents |
| POST | `/students/{id}/documents` | Upload document |
| DELETE | `/students/{id}/documents/{docId}` | Delete document |
| GET | `/students/{id}/certificates` | List certificates |
| POST | `/students/certificates/` | Upload certificate |
| GET | `/students/certificate-types` | List certificate types |
| GET | `/students/{id}/transport` | Get transport assignment |
| POST | `/students/{id}/transport` | Assign transport |
| GET | `/students/dropdown` | Get students for dropdown select |

**React Query Hooks:** `src/api/hooks/students/`

- `admissions.ts` — Student admission hooks
- `attendance.ts` — Attendance hooks
- `certificates.ts` — Certificate hooks
- `documents.ts` — Document hooks
- `transport.ts` — Transport hooks
- `useStudentProfile.ts` — Profile hooks

---

## 5. Masters API

**File:** `src/api/masters.ts`

### Academic Years

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/academic-years` | List academic years |
| POST | `/academic-years` | Create academic year |
| PUT | `/academic-years/{id}` | Update |
| DELETE | `/academic-years/{id}` | Delete |

### Classes & Sections

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/classes` | List classes |
| POST | `/classes` | Create class |
| GET | `/classes/{id}/sections` | List sections for class |
| POST | `/classes/{id}/sections` | Add section |

### Subjects

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/subjects` | List subjects |
| POST | `/subjects` | Create subject |
| GET | `/subject-categories` | List categories |
| POST | `/subject-categories` | Create category |
| POST | `/class-subject-mappings` | Map subject to class |

### Holidays

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/holidays` | List holidays |
| POST | `/holidays` | Add holiday |
| PUT | `/holidays/{id}` | Update |
| DELETE | `/holidays/{id}` | Delete |

### Roles & Permissions

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/roles` | List roles |
| POST | `/roles` | Create role |
| GET | `/roles/{id}/permissions` | Get role permissions |
| PUT | `/roles/{id}/permissions` | Update permissions |

### Timetables

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/timetables` | List timetable entries |
| POST | `/timetables` | Create timetable entry |
| PUT | `/timetables/{id}` | Update |
| DELETE | `/timetables/{id}` | Delete |

---

## 6. Fees API

**File:** `src/api/fees.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/fee/categories/` | List fee categories |
| POST | `/fee/categories/` | Create category |
| PUT | `/fee/categories/{id}` | Update category |
| DELETE | `/fee/categories/{id}` | Delete category |
| GET | `/fee/types/` | List fee types |
| POST | `/fee/types/` | Create fee type |
| PUT | `/fee/types/{id}` | Update fee type |
| DELETE | `/fee/types/{id}` | Delete fee type |
| GET | `/fee/terms/` | List payment terms |
| POST | `/fee/terms/` | Create term |
| PUT | `/fee/terms/{id}` | Update term |
| DELETE | `/fee/terms/{id}` | Delete term |
| GET | `/fee/class-mappings/` | List class fee mappings (Fee Mappings hub screen) |
| POST | `/fee/class-mappings/` | Create class mapping |
| PUT | `/fee/class-mappings/{id}` | Update class mapping |
| DELETE | `/fee/class-mappings/{id}` | Delete class mapping |
| GET | `/fee/class-mapping-term-amounts/` | List term amounts (Fee Term Amounts hub screen) |
| PUT | `/fee/class-mapping-term-amounts/{id}` | Update term amount |
| POST | `/fee/class-mapping-term-amounts/` | Create term amount |
| DELETE | `/fee/class-mapping-term-amounts/{id}` | Delete term amount |
| GET | `/fee/collection/search-student` | Search student for fee collection |
| GET | `/fee/collection/summary/{student_id}` | Get student fee summary (admin) |
| GET | `/fee/collection/my-summary` | Get own fee summary (student) |
| GET | `/fee/collection/child-summary/{student_id}` | Get child fee summary (parent) |
| POST | `/fee/collection/pay` | Process fee payment |
| GET | `/fee/collection/receipts/{receipt_id}/pdf` | Download receipt PDF |
| GET | `/fee/receipts/` | List all fee receipts (Fee Receipts hub screen) |
| GET | `/fee/receipts/{id}` | Get receipt detail |
| POST | `/fee/receipts/generate/{transaction_id}` | Generate receipt for transaction |
| POST | `/fee/receipts/{id}/reprint` | Reprint receipt |
| GET | `/fee/receipts/{id}/verify` | Verify receipt |
| GET | `/fee/transactions/` | List transactions |
| POST | `/fee/transactions/` | Record transaction |
| GET | `/fee/transactions/{id}` | Get transaction detail |
| GET | `/fee/refunds/` | List refunds |
| POST | `/fee/refunds/` | Create refund |
| POST | `/fee/refunds/approve` | Approve refund |
| POST | `/fee/refunds/process` | Process refund |
| GET | `/fee/student-mappings/` | List student fee mappings |
| POST | `/fee/student-mappings/` | Map fee to student |
| GET | `/reports/fees/collection-summary/stats` | Fee collection stats |
| GET | `/reports/fees/collection-summary` | Fee collection report rows |
| GET | `/reports/fees/pending-fees` | Pending fees report |
| GET | `/reports/fees/fee-structure` | Fee structure report |

---

## 7. Transport API

**File:** `src/api/transport.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/masters/routes/` | List routes |
| POST | `/masters/routes/` | Create route |
| GET | `/masters/vehicles/` | List vehicles |
| POST | `/masters/vehicles/` | Add vehicle |
| GET | `/masters/route-stops/` | List stops for route |
| POST | `/masters/route-stops/` | Add stop |
| GET | `/masters/trips/` | List trips |
| POST | `/masters/trips/` | Create trip |
| GET | `/student-transport` | List student transport assignments |
| POST | `/student-transport` | Assign student to route |
| GET | `/student-trips` | List student trip records |

---

## 8. Staff API

**File:** `src/api/staff.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/staff` | List staff members |
| POST | `/staff` | Enroll staff member |
| GET | `/staff/{id}` | Get staff details |
| PUT | `/staff/{id}` | Update staff |
| GET | `/staff/{id}/attendance` | Get staff attendance |
| POST | `/staff/attendance` | Mark staff attendance |
| GET | `/designations` | List designations |
| POST | `/designations` | Create designation |

---

## 9. Expense API

**File:** `src/api/expense.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/expense-categories` | List categories |
| POST | `/expense-categories` | Create category |
| GET | `/expense-types` | List expense types |
| POST | `/expense-types` | Create type |
| GET | `/expense-departments` | List departments |
| POST | `/expense-departments` | Create department |
| GET | `/expense-transactions` | List transactions |
| POST | `/expense-transactions` | Create transaction |
| GET | `/expense-transactions/{id}` | Get transaction |
| PUT | `/expense-transactions/{id}` | Update transaction |
| POST | `/expense-approvals/{id}/approve` | Approve expense |
| POST | `/expense-approvals/{id}/reject` | Reject expense |
| GET | `/expense-audit` | Get audit log |
| GET | `/expense-reports` | Get expense reports |

---

## 10. Profile API

**File:** `src/api/profile.ts`

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/profile/student` | Get student profile |
| PUT | `/profile/student` | Update student profile |
| GET | `/profile/parent/me` | Get parent profile |
| PUT | `/profile/parent/me` | Update parent profile |
| GET | `/profile/staff` | Get staff profile |
| PUT | `/profile/staff` | Update staff profile |

---

## 11. Exam API

**Mobile file:** `src/api/exam.ts` — fully integrated
**Status:** Backend + Mobile complete

### Exam Management

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/exams` | Create exam |
| GET | `/exams` | List exams (filter: `exam_status`) |
| GET | `/exams/{id}` | Get exam details |
| PUT | `/exams/{id}` | Update exam |
| DELETE | `/exams/{id}` | Delete exam |
| POST | `/exams/{id}/clone` | Clone exam |
| POST | `/exams/{id}/unlock` | Unlock for corrections |

**Create exam request fields:** `exam_name`, `board`, `level`, `exam_type`, `nature`, `academic_year_id`

### Mark Entry

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/exams/{id}/marks/template` | Download Excel template |
| GET | `/exams/{id}/marks` | Get marks grid (paginated, param: `page_size`) |
| POST | `/exams/{id}/marks` | Save/update marks (requires `component_id`) |

### Results

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/exams/{id}/compute` | Compute results |
| POST | `/exams/{id}/publish` | Publish results |
| GET | `/exams/{id}/results` | List results |
| GET | `/exams/{id}/results/{studentId}` | Get student result |

**Result fields:** `is_passed`, `total_marks_obtained`, `grade_label`

### Hall Tickets

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/exams/{id}/hall-tickets/compute` | Compute eligibility |
| GET | `/exams/{id}/hall-tickets/eligible` | List eligible students |
| GET | `/exams/{id}/hall-tickets/ineligible` | List ineligible students |
| PUT | `/exams/{id}/hall-tickets/{studentId}/override` | Override eligibility |
| POST | `/exams/{id}/hall-tickets/publish` | Publish hall tickets |
| GET | `/exams/{id}/hall-tickets/download` | Download single hall ticket PDF |
| GET | `/exams/{id}/hall-tickets/download-all` | Download all as ZIP |

### Exam Dates

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/exams/{id}/dates` | List exam dates |
| POST | `/exams/{id}/dates` | Add exam date |
| POST | `/exams/{id}/dates/bulk` | Bulk add dates |
| PUT | `/exams/{id}/dates/{dateId}` | Update date |
| DELETE | `/exams/{id}/dates/{dateId}` | Delete date |

### Grade Schemes

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/grade-schemes` | List schemes |
| POST | `/grade-schemes` | Create scheme |
| PUT | `/grade-schemes/{id}` | Update scheme |
| DELETE | `/grade-schemes/{id}` | Delete scheme |

---

## 12. Special Headers

| Header | Value | Required On |
| ------ | ----- | ----------- |
| `Authorization` | `Bearer {access_token}` | All authenticated requests |
| `cschema` | `{tenant_schema}` | All requests |
| `X-Student-ID` | `{student_id}` | Parent user requests for student data |
| `X-Academic-Year-ID` | `{year_id}` | Context-specific queries |
| `X-Class-ID` | `{class_id}` | Context-specific queries |

---

## 13. Error Handling

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

---

COS360 School Management System — API Integration Reference — March 2026
