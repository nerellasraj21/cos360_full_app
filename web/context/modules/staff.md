# Module Context – Staff

Version: 1.1
Generated On: 2025-12-26
Last Updated: 2026-02-27
Source: Codebase Analysis + Backend Handover
Confidence Level: High

---

## Responsibility

The Staff module manages all staff-related functionality:

1. **Staff Management**: CRUD operations for staff members
2. **Attendance Tracking**: Daily staff attendance with bulk operations
3. **Enrollment**: Staff enrollment process
4. **Designations**: Staff role/designation management
5. **Profile Management**: Staff profile viewing and editing

---

## Key Components

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/staff/staff.tsx` | Staff list/management page |
| `src/routes/_app/staff/attendance.tsx` | Staff attendance page |
| `src/routes/_app/staff/enrollment.tsx` | Staff enrollment page |
| `src/routes/_app/staff/designations.tsx` | Designation management |
| `src/routes/_app/staff/profile.tsx` | Staff profile page |
| `src/routes/_app/staff/index.tsx` | Staff section index |

### API Hooks

| File | Purpose |
|------|---------|
| `src/api/hooks/staff/attendance.ts` | Attendance CRUD hooks (legacy `/masters/` path) |
| `src/api/hooks/staff/staff.ts` | Staff management hooks |
| `src/api/hooks/staff/useStaffProfile.ts` | Staff profile hooks |
| `src/hooks/staff/useStaff.ts` | New staff hooks (new `/staff/` path) |

### API Endpoints

| File | Purpose |
|------|---------|
| `src/api/staff/attendance.ts` | Attendance API functions |
| `src/api/staff/staff.ts` | Staff API functions (new paths) |

### Components and Pages

| Directory | Purpose |
|-----------|---------|
| `src/components/staff/` | Staff-related components |
| `src/components/staff/DesignationsTable.tsx` | Designations table component |
| `src/pages/staff/` | Staff page components |

---

## Data Model Summary

### Staff Attendance Types

```typescript
// src/types/attendance.ts, src/types/staff.ts
interface StaffAttendanceCreate {
  staff_id: number;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
}

interface StaffAttendanceUpdate {
  status?: 'present' | 'absent' | 'late';
  remarks?: string;
}

interface StaffAttendanceFilter {
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}
```

### Designation Types

```typescript
// src/types/staff/staff.ts
export interface Designation {
  id: string;
  title: string;
  staff_members?: Staff[];  // Optional array — backend may not include this yet
  created_at: string;       // ISO 8601 format
  updated_at: string;
}

export interface Staff {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  designation_id?: string;
  is_active: boolean;
}

export interface DesignationListResponse {
  items: Designation[];
  total: number;
  skip: number;
  limit: number;
}
```

---

## Invariants & Rules

### Dual API Paths — CRITICAL WARNING

Staff attendance has **two separate hook stacks**. Using the wrong one causes unexpected behavior:

| Hook Stack | File | API Path | Status |
|------------|------|----------|--------|
| Legacy | `src/api/hooks/staff/attendance.ts` | `/masters/staff/attendance` | In use by attendance page |
| New | `src/hooks/staff/useStaff.ts` | `/staff/attendance` | Available, partially used |

The legacy stack fetches ALL attendance records and filters in memory. The new stack uses proper query parameters. Prefer the new path when adding features.

See `docs/STAFF_ATTENDANCE_FLOW.md` for full data flow documentation.

### Attendance Workflow

1. **By Date Query**: Get all staff attendance for a specific date
2. **By Staff Filter**: Get attendance records for a specific staff member
3. **Bulk Update**: Update multiple attendance records at once for a date
4. **Status Values**: `present`, `absent`, `late`

### Query Key Structure

```typescript
['staff-attendances']                    // All attendances
['staff-attendance', attendanceId]       // Single attendance
['staff-attendance-by-date', date]       // By date
['staff-attendance-filter', staffId, params]  // Filtered
['staff-attendance-report', filters]     // Report
['staff-attendance-stats', filters]      // Statistics
```

**Evidence**: `src/api/hooks/staff/attendance.ts`

### Cache Invalidation

On any attendance mutation, these queries are invalidated:
- `['staff-attendances']`
- `['staff-attendance-by-date']`

---

## Public Interfaces

### Query Hooks

```typescript
// Attendance
useStaffAttendances()
useStaffAttendance(attendanceId: string)
useStaffAttendanceByDate(date: string)
useStaffAttendanceByDateFilter(staffId: string, params?: { start_date?: string; end_date?: string })
useStaffAttendanceReport(filters?: StaffAttendanceFilter)
useStaffAttendanceStats(filters?: Omit<StaffAttendanceFilter, 'page' | 'page_size'>)

// Designations
useDesignations(params?: { skip?: number; limit?: number })

// Staff management
useStaff(...)
useStaffProfile(...)
```

### Mutation Hooks

```typescript
useCreateStaffAttendance()
useUpdateStaffAttendance()
useDeleteStaffAttendance()
useBulkUpdateStaffAttendance()
useExportStaffAttendance()
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/staff/attendance` | GET | List attendances |
| `/staff/attendance` | POST | Create attendance |
| `/staff/attendance/{id}` | PUT | Update attendance |
| `/staff/attendance/{id}` | DELETE | Delete attendance |
| `/staff/attendance/date/{date}` | GET | Get by date |
| `/staff/attendance/bulk/{date}` | PUT | Bulk update |
| `/staff/attendance/report` | GET | Get report |
| `/staff/attendance/stats` | GET | Get statistics |
| `/staff/attendance/export` | POST | Export report |
| `/staff/designations/` | GET | List designations (paginated) |
| `/staff/designations/` | POST | Create designation |
| `/staff/designations/{id}` | PUT | Update designation |
| `/staff/designations/{id}` | DELETE | Delete designation |

---

## Known Issues

### Designations — Missing Backend Fields

`GET /api/v1/staff/designations/` currently returns only `{ id, title }` per item.

The frontend (`src/components/staff/DesignationsTable.tsx`) expects:
- `created_at` — timestamp for "Created Date" column
- `staff_members` — array of staff for "Staff Count" column

**Current workaround**: The table shows "0 staff members" and an error for created date.

**Backend action needed**: Return `created_at`, `updated_at`, and either a `staff_members` array (Option 1) or a `staff_count` integer (Option 2) in the designation list endpoint.

---

## Dependencies

### Internal Dependencies

- **API Core**: CAxios client for HTTP requests
- **Types**: `src/types/attendance.ts`, `src/types/staff.ts`

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **sonner**: Toast notifications

---

## Known Risks

### Performance

1. **Bulk Operations**: Large bulk updates could timeout
2. **Report Generation**: Complex reports may be slow

### Data Integrity

1. **Duplicate Attendance**: No client-side check for duplicate date entries
2. **Date Validation**: Future date attendance handling unclear

---

## Test Coverage

No dedicated staff module tests found in codebase.

---

## Uncertainties

1. **Legacy Migration**: Status of `/masters/` to `/staff/` API migration — incomplete, legacy hooks still used
2. **Leave Management**: Integration with leave system unclear
3. **Salary Integration**: Connection to payroll (if any) unknown
4. **Biometric Integration**: No evidence of biometric attendance integration
5. **Approval Workflow**: Attendance approval process (if any) unclear
