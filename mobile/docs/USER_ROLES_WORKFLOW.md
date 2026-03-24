# COS360 — User Roles & Workflow Guide

> **Last updated:** 2026-03-24
> **Platform:** Mobile App (React Native / Expo) + Web App (cos360.app)

---

## Overview

COS360 uses a **role-based access control (RBAC)** system. Each user is assigned one role, and each role holds a set of `resource:action` permissions. The backend returns the user's role + permission list at login; all permission checks are evaluated client-side against this list.

**Permission format:** `resource:action`
**Actions available:** `create | read | update | delete | list | approve | export | read_own | update_own | delete_own`

---

## User Roles

| # | Role | Target User | Access Level |
|---|------|-------------|--------------|
| 1 | [Super Admin](#1-super-admin) | System owner / IT admin | Full unrestricted access |
| 2 | [School Admin](#2-school-admin) | School principal / director | All school operations |
| 3 | [Teacher](#3-teacher) | Teaching staff | Students, marks, attendance, own profile |
| 4 | [Accountant](#4-accountant) | Finance staff | Fees, expenses, financial reports |
| 5 | [Transport Manager](#5-transport-manager) | Transport coordinator | Routes, vehicles, trips, student transport |
| 6 | [Parent](#6-parent) | Parent / Guardian | Own child's info, fee receipts, communication |
| 7 | [Student](#7-student) | Enrolled student | Own profile, marks, documents, transport info |

---

## 1. Super Admin

**Who uses this:** System owner, IT administrator, or top-level manager.

### Accessible Modules
All modules with full CRUD + approval + export permissions.

### Workflow
```
Login
 └── Dashboard (full stats: all modules)
      ├── Students → View / Admit / Edit / Delete students
      ├── Staff    → View / Enroll / Edit / Delete staff
      ├── Fees     → Manage categories, types, terms, transactions, refunds, mappings
      ├── Expense  → Categories, transactions, approve, audit logs
      ├── Transport → Routes, stops, vehicles, trips, student assignments, pricing
      ├── Exam     → Create exams, enter marks, publish results, hall tickets
      ├── Masters  → Academic years, classes, sections, subjects, holidays, timetable
      ├── Reports  → All reports (academic, fee, staff, student, transport)
      ├── Communication → Compose (SMS/WhatsApp/Email), templates, logs
      └── Admin
           ├── User Management   → Create / edit / deactivate users
           ├── Role Management   → Create / edit / delete roles
           ├── Permission Matrix → Assign permissions per role
           └── Menu Management   → Configure sidebar/tab visibility
```

### Key Permissions
```
users:*  roles:*  permissions:*  menu:*
students:*  staff:*  fees:*  expense:*  transport:*  exam:*
roles_permissions:*  reports:*  communication:*
```

---

## 2. School Admin

**Who uses this:** Principal, vice-principal, school director — day-to-day management.

### Accessible Modules
All operational modules. No access to system-level admin (user/role/permission/menu management).

### Workflow
```
Login
 └── Dashboard (all module stats)
      ├── Students → Full CRUD + admissions + attendance + documents + certificates
      ├── Staff    → Full CRUD + attendance + designations
      ├── Fees     → Full CRUD + collection + reports (cannot configure system roles)
      ├── Expense  → Categories + transactions + approve expense claims
      ├── Transport → Routes + vehicles + trips + student transport assignments
      ├── Exam     → Create + manage exams, enter/lock/publish marks
      ├── Masters  → Academic years, classes, sections, subjects, holidays, timetable
      ├── Reports  → Export all reports
      └── Communication → Compose + manage templates + view logs
```

### Key Permissions
```
students:create|read|update|delete|list|export
student_admissions:create|read|update|delete|list
student_attendance:create|read|update|list
staff:create|read|update|delete|list
fee_*:create|read|update|delete|list|export
expense_transactions:approve
transport_*:create|read|update|delete|list
exam:create|read|update|list
roles_permissions:list|read  (view only — cannot modify)
```

---

## 3. Teacher

**Who uses this:** Class teachers, subject teachers.

### Accessible Modules
Students (read), Attendance (manage own classes), Marks entry, Timetable, own profile.

### Workflow
```
Login
 └── Dashboard (limited stats: own class/subject data)
      ├── Students
      │    ├── View student list (own classes)
      │    ├── View student profiles
      │    └── View attendance records
      ├── Exam
      │    ├── View exams
      │    ├── Enter marks (for assigned subjects)
      │    └── View results
      ├── Masters
      │    ├── View timetable
      │    ├── View holidays
      │    └── View class & section info
      └── Profile → View & update own staff profile
```

### Key Permissions
```
students:read|list
student_attendance:read|list|create|update  (own class only)
exam:read|list
exam_marks:create|update  (own subjects)
exam_results:read|list
timetables:read|list
holidays:read|list
classes:read|list  sections:read|list  subjects:read|list
staff:read_own|update_own
profile:read_own|update_own
```

### NOT accessible
- Fees, Expense, Transport management, Admin screens, Communication (compose)
- Creating/deleting students or staff

---

## 4. Accountant

**Who uses this:** Finance officer, fee collector, accounts manager.

### Accessible Modules
Fees (full), Expense (full), Reports (financial), limited student view for fee context.

### Workflow
```
Login
 └── Dashboard (financial stats: fee collection, expense totals)
      ├── Fees
      │    ├── Fee Categories → Create / Edit / Delete
      │    ├── Fee Types      → Create / Edit / Delete
      │    ├── Fee Terms      → Create / Edit / Delete
      │    ├── Transactions   → Record, view, filter fee payments
      │    ├── Refunds        → Process and view refunds
      │    ├── Class Mappings → Assign fee types to classes
      │    ├── Student Mappings → Override fees per student
      │    └── Term Amounts   → Set per-term fee amounts
      ├── Expense
      │    ├── Categories  → Create / Edit
      │    ├── Types       → Create / Edit
      │    ├── Transactions → Record, view, filter
      │    ├── Approvals   → Approve / reject pending expenses
      │    └── Audit Logs  → View expense history
      ├── Reports
      │    ├── Fee Reports       → Collection summary, outstanding, etc.
      │    └── Student Reports   → Fee status per student
      └── Students (read-only)  → Look up student for fee context
```

### Key Permissions
```
fee_categories:create|read|update|delete|list
fee_types:create|read|update|delete|list
fee_terms:create|read|update|delete|list
fee_transactions:create|read|update|delete|list|export
fee_refunds:create|read|update|delete|list
fee_class_mappings:create|read|update|delete|list
fee_student_mappings:create|read|update|delete|list
fee_collection:create|read|list
fee_reports:read|list|export
expense_categories:create|read|update|delete|list
expense_types:create|read|update|delete|list
expense_transactions:create|read|update|delete|list|approve|export
expense_audit:read|list
students:read|list  (no create/update/delete)
```

### NOT accessible
- Transport management, Exam marks, Staff management, Admin screens

---

## 5. Transport Manager

**Who uses this:** Transport coordinator, bus route planner.

### Accessible Modules
Full transport module, student transport assignments, limited student view.

### Workflow
```
Login
 └── Dashboard (transport stats: routes, vehicles, trips, students)
      ├── Transport
      │    ├── Routes      → Create / Edit / Delete routes
      │    ├── Route Stops → Add / Edit stops per route (with timing + fees)
      │    ├── Vehicles    → Register, edit, manage vehicles
      │    ├── Trips       → Create / manage trips (vehicle + route + driver)
      │    ├── Student Transport → Assign students to trips + stops
      │    └── Pricing     → Set route-stop pricing tiers
      └── Students (read-only) → Look up student for transport assignment
```

### Key Permissions
```
transport_routes:create|read|update|delete|list
route_stops:create|read|update|delete|list
transport_vehicles:create|read|update|delete|list
transport_trips:create|read|update|delete|list
student_transport:create|read|update|delete|list
transport_pricing:create|read|update|delete|list
students:read|list  (no create/update/delete)
```

### NOT accessible
- Fees, Expense, Exam, Staff management, Admin screens, Communication

---

## 6. Parent

**Who uses this:** Parent or legal guardian of an enrolled student.

### Accessible Modules
Read-only view of own child's information. No edit rights except own profile.

### Workflow
```
Login  →  (select child if multiple enrolled)
 └── Dashboard (own child's snapshot)
      ├── My Child
      │    ├── Profile & Admission details (read-only)
      │    ├── Attendance record (read-only)
      │    ├── Documents (view, download)
      │    └── Certificates (view, download)
      ├── Fees
      │    ├── View outstanding fees
      │    ├── View payment history / receipts
      │    └── View term amounts
      ├── Exam
      │    └── View results / marks for own child
      ├── Transport
      │    └── View transport assignment (route, stop, timings)
      ├── Communication
      │    └── View messages received (read-only)
      └── Profile → Update own parent contact info
```

### Key Permissions
```
parent_profile:read_own|update_own
students:read  (own child only — enforced server-side)
student_attendance:read
student_documents:read
student_certificates:read
student_transport:read
fee_transactions:read  fee_terms:read  fee_types:read
exam_results:read  (own child)
profile:read_own|update_own
```

### NOT accessible
- Any create/update/delete on student records
- Staff, Expense, Admin, Transport management, Masters config

---

## 7. Student

**Who uses this:** Enrolled student (self-service portal).

### Accessible Modules
Own profile, own marks, own documents, own transport info.

### Workflow
```
Login
 └── Dashboard (own info snapshot)
      ├── My Profile   → View admission details, class, section
      ├── My Documents → Download own documents
      ├── My Certificates → Download own certificates
      ├── My Marks
      │    ├── Select exam
      │    └── View subject-wise marks + grade + result
      ├── My Transport → View assigned route, stop, timing
      ├── My Fees      → View outstanding fees + payment history
      └── Profile      → Update contact info (limited fields)
```

### Key Permissions
```
student_profile:read_own
students:read_own
student_documents:read_own|delete_own
student_certificates:read_own
student_transport:read_own
exam_results:read_own
exam_marks:read_own
fee_transactions:read_own
fee_terms:read
profile:read_own|update_own
```

### NOT accessible
- All management screens (students, staff, fees, expense, transport, admin)
- Other students' data

---

## Permission Matrix (Summary)

| Resource | Super Admin | School Admin | Teacher | Accountant | Transport Mgr | Parent | Student |
|----------|:-----------:|:------------:|:-------:|:----------:|:-------------:|:------:|:-------:|
| students | CRUD+Export | CRUD+Export | Read | Read | Read | Own child | Own |
| student_admissions | Full | Full | — | — | — | — | — |
| student_attendance | Full | Full | CRUD (own class) | — | — | Read (own) | — |
| student_documents | Full | Full | Read | — | — | Read (own) | Own |
| student_certificates | Full | Full | Read | — | — | Read (own) | Own |
| student_transport | Full | Full | — | — | CRUD | Read (own) | Read (own) |
| staff | Full | Full | Own profile | — | — | — | — |
| fee_* | Full | Full | — | Full | — | Read (own) | Read (own) |
| expense_* | Full | CRUD+Approve | — | Full | — | — | — |
| transport_routes | Full | Full | — | — | CRUD | — | — |
| transport_vehicles | Full | Full | — | — | CRUD | — | — |
| transport_trips | Full | Full | — | — | CRUD | — | — |
| exam | Full | Full | Read+Marks | — | — | — | — |
| exam_marks | Full | Full | Create+Update | — | — | — | Own |
| exam_results | Full | Full | Read | — | — | Own child | Own |
| masters (all) | Full | Full | Read | Read | Read | — | — |
| roles_permissions | Full | Read only | — | — | — | — | — |
| users/roles/perms | Full | — | — | — | — | — | — |
| communication | Full | Full | — | — | — | Read | — |
| reports | Full | Full | — | Fee reports | — | — | — |

---

## Screen → Permission Mapping

| Screen Path | Required Permission(s) | Mode |
|-------------|------------------------|------|
| `/students` | `students:list` OR `students:read` | ANY |
| `/students/admission` | `student_admissions:list` OR `student_admissions:read` | ANY |
| `/students/[id]` | `students:read` | ALL |
| `/students/attendance` | `student_attendance:list` OR `student_attendance:read` | ANY |
| `/students/documents` | `student_documents:list` OR `student_documents:read` | ANY |
| `/students/certificates` | `student_certificates:list` OR `student_certificates:read` | ANY |
| `/students/transport` | `student_transport:list` OR `student_transport:read` | ANY |
| `/fees` | `fee_categories:list` OR `fee_types:list` OR `fee_transactions:list` | ANY |
| `/fees/transactions` | `fee_transactions:list` OR `fee_transactions:read` | ANY |
| `/fees/refunds` | `fee_refunds:list` OR `fee_refunds:read` | ANY |
| `/staff` | `staff:list` OR `staff:read` | ANY |
| `/staff/attendance` | `staff_attendance:list` OR `staff_attendance:read` | ANY |
| `/transport` | `transport_routes:list` OR `transport_vehicles:list` OR `transport_trips:list` | ANY |
| `/transport/routes` | `transport_routes:list` OR `transport_routes:read` | ANY |
| `/transport/vehicles` | `transport_vehicles:list` OR `transport_vehicles:read` | ANY |
| `/transport/trips` | `transport_trips:list` OR `transport_trips:read` | ANY |
| `/transport/student-transport` | `student_transport:list` OR `student_transport:read` | ANY |
| `/expense` | `expense_categories:list` OR `expense_transactions:list` | ANY |
| `/expense/transactions` | `expense_transactions:list` OR `expense_transactions:read` | ANY |
| `/expense/approvals` | `expense_transactions:approve` | ALL |
| `/expense/audit` | `expense_audit:list` OR `expense_audit:read` | ANY |
| `/masters` | `academic_years:list` OR `classes:list` OR `sections:list` OR `subjects:list` | ANY |
| `/masters/rolespermissions` | `roles_permissions:list` OR `roles_permissions:read` | ANY |
| `/parents` | `parent_profile:read_own` OR `students:read` | ANY |
| `/profile` | `profile:read_own` OR `parent_profile:read_own` | ANY |
| `/(tabs)/settings` | None (all authenticated users) | — |

---

## Auth Flow

```
1. Enter Organisation Code
       ↓
2. Select Academic Year  (GET /auth/academic-years — requires cschema header)
       ↓
3. Enter Username + Password
       ↓
4. Backend returns:
       access_token, refresh_token, user, role, permissions[], menu[]
       ↓
5. Stored in AsyncStorage (via services/authUtils.ts)
       ↓
6. API client auto-attaches:
       Authorization: Bearer {token}
       cschema: {tenantId}
       ↓
7. On 401 → auto-refresh token → retry request
   On logout → clearAuthData() removes all AsyncStorage keys
```

---

## Adding a New Role (Developer Guide)

1. Create the role via **Admin → Role Management** (or `/masters/rolespermissions`)
2. Assign permissions via **Permission Matrix** tab
3. If a new screen needs permission-gating, add an entry to `src/config/screenPermissions.ts`
4. Wrap the screen or action with `<PermissionGuard resource="..." action="..." />` component
5. Test using a user account with that role

---

## UX Feedback (Toast Notifications)

All CRUD operations across all modules show non-blocking toast notifications at the top of the screen on success or failure. Toasts are rendered by `components/ToastProvider.tsx` and `components/FeedbackToast.tsx`, which are wired into the root layout (`app/_layout.tsx`).

### Usage

```typescript
import { useToastContext } from '@/components/ToastProvider';

const { showSuccess, showError } = useToastContext();

// After successful mutation
showSuccess('Record Saved', 'The item was updated successfully.');

// After failed mutation
showError('Save Failed', error.message);
```

### Rules

| Scenario | Pattern |
| -------- | ------- |
| Mutation succeeded (create / update / delete) | `showSuccess(title, message)` toast |
| Mutation failed (API error) | `showError(title, error.message)` toast |
| Destructive action confirmation (delete) | `Alert.alert` — user must confirm before the action fires |
| Form validation error | `Alert.alert` or inline field error — NOT a toast |

---

## Related Files

| Purpose | File |
|---------|------|
| Permission type definitions | [src/types/permissions.ts](../src/types/permissions.ts) |
| Permission string constants | [src/constants/permissions.ts](../src/constants/permissions.ts) |
| Screen → permission mapping | [src/config/screenPermissions.ts](../src/config/screenPermissions.ts) |
| Auth state management | [services/authUtils.ts](../services/authUtils.ts) |
| Role + permission React Query hooks | [src/api/hooks/masters/rolesAndPermissions.ts](../src/api/hooks/masters/rolesAndPermissions.ts) |
| Roles & Permissions UI screen | [app/masters/rolespermissions.tsx](../app/masters/rolespermissions.tsx) |
