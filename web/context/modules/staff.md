# Module Context – Staff

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Staff module manages all staff-related functionality:

1. **Staff Management**: CRUD operations for staff members
2. **Attendance Tracking**: Daily staff attendance with bulk operations
3. **Enrollment**: Staff enrollment process
4. **Designations**: Staff role/designation management
5. **Profile Management**: Staff profile viewing and editing

---

## Key Components

[EVIDENCE-BASED]

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
| `src/api/hooks/staff/attendance.ts` | Attendance CRUD hooks |
| `src/api/hooks/staff/staff.ts` | Staff management hooks |
| `src/api/hooks/staff/useStaffProfile.ts` | Staff profile hooks |

### API Endpoints

| File | Purpose |
|------|---------|
| `src/api/staff/attendance.ts` | Attendance API functions |
| `src/api/staff/` | Staff API functions |

### Components

| Directory | Purpose |
|-----------|---------|
| `src/components/staff/` | Staff-related components |

### Pages

| Directory | Purpose |
|-----------|---------|
| `src/pages/staff/` | Staff page components |

---

## Data Model Summary

[EVIDENCE-BASED]

### Staff Attendance Types

```typescript
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

interface ExportRequest {
  // Export configuration
}
```

**Source**: `src/types/attendance.ts`, `src/types/staff.ts`

---

## Invariants & Rules

[EVIDENCE-BASED]

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

[EVIDENCE-BASED]

### Query Hooks

```typescript
// Attendance
useStaffAttendances()
useStaffAttendance(attendanceId: string)
useStaffAttendanceByDate(date: string)
useStaffAttendanceByDateFilter(staffId: string, params?: { start_date?: string; end_date?: string })
useStaffAttendanceReport(filters?: StaffAttendanceFilter)
useStaffAttendanceStats(filters?: Omit<StaffAttendanceFilter, 'page' | 'page_size'>)

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

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- **API Core**: CAxios client for HTTP requests
- **Types**: `src/types/attendance.ts`, `src/types/staff.ts`

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **sonner**: Toast notifications (in some implementations)

---

## Known Risks

[INFERENCE]

### Dual API Paths

**Warning**: Staff attendance has dual API paths:
- New path: `/staff/attendance`
- Legacy path: `/masters/staff/attendance`

Different hook stacks may exist for the same functionality.

**Evidence**: `STAFF_ATTENDANCE_FLOW.md`, `context_guide.json:144-147`

### Performance

1. **Bulk Operations**: Large bulk updates could timeout
2. **Report Generation**: Complex reports may be slow

### Data Integrity

1. **Duplicate Attendance**: No client-side check for duplicate date entries
2. **Date Validation**: Future date attendance handling unclear

---

## Test Coverage

[UNCERTAIN]

No dedicated staff module tests found in codebase.

---

## Uncertainties

[UNCERTAIN]

1. **Staff Types/Designations**: Full designation hierarchy unclear
2. **Leave Management**: Integration with leave system unclear
3. **Salary Integration**: Connection to payroll (if any) unknown
4. **Reporting Hierarchy**: Staff reporting structure unclear
5. **Legacy Migration**: Status of `/masters/` to `/staff/` API migration
6. **Biometric Integration**: No evidence of biometric attendance integration
7. **Approval Workflow**: Attendance approval process (if any) unclear
