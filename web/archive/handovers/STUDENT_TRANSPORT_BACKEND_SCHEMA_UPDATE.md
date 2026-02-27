# Student Transport - Backend Schema Update

**Date:** 2026-02-09
**Status:** ✅ **COMPLETED**
**Priority:** CRITICAL - Breaking Backend Changes

---

## Executive Summary

The backend developer completely changed the Student Transport API schema from the old `StudentTransport` model to a new `StudentTrip`-based model. This required significant updates to the frontend types, form fields, and page components.

---

## Schema Changes Overview

### Old Schema (Before)
```typescript
{
  student_id: string;         // Simple string ID
  route_id: string;           // Route reference
  stop_id: string;            // Simple string ID
  trip_type: string;          // "pickup" or "drop"
  academic_year_id: string;   // Academic year reference
  fare_amount: number;        // Fee amount
}
```

### New Schema (After)
```typescript
{
  trip_id: string;            // UUID - Trip reference (NEW)
  student_id: string;         // UUID - Must be valid UUID format
  stop_id: string;            // UUID - Must be valid UUID format
  fee_term_id: string;        // UUID - Fee term reference (NEW)
  fee_per_term: number;       // Fee amount per term (RENAMED from fare_amount)
}
```

### Fields Removed
- ❌ `route_id` - Removed (route is now determined by trip)
- ❌ `trip_type` - Removed (type is part of trip definition)
- ❌ `academic_year_id` - Removed
- ❌ `fare_amount` - Renamed to `fee_per_term`

### Fields Added
- ✅ `trip_id` - UUID reference to Trip (REQUIRED)
- ✅ `fee_term_id` - UUID reference to Fee Term (REQUIRED)
- ✅ `fee_per_term` - Number (REQUIRED, replaces fare_amount)

### Fields Updated
- ⚠️ `student_id` - Now requires UUID format (not just numeric string)
- ⚠️ `stop_id` - Now requires UUID format (not just numeric string)

---

## Files Modified

### 1. Type Definitions
**File:** `src/types/masters/studentTransport.ts`

**Changes:**
```diff
export interface StudentTransportBase {
-   student_id: string;
-   route_id: string;
-   stop_id: string;
-   trip_type: string;
-   academic_year_id: string;
-   fare_amount: number;
+   trip_id: string;          // UUID - Trip reference (required)
+   student_id: string;       // UUID - Student reference (required)
+   stop_id: string;          // UUID - Stop reference (required)
+   fee_term_id: string;      // UUID - Fee term reference (required)
+   fee_per_term: number;     // Fee amount per term (required)
}
```

### 2. Page Component
**File:** `src/pages/transport/studentTransport.tsx`

**Form Fields Updated:**
```diff
const formFields: FormField[] = [
+   { name: "trip_id", label: "Trip ID", required: true },
    { name: "student_id", label: "Student ID", required: true },
-   { name: "route_id", label: "Route ID", required: true },
    { name: "stop_id", label: "Stop ID", required: true },
-   { name: "trip_type", label: "Trip Type", required: true },
-   { name: "academic_year_id", label: "Academic Year ID", required: true },
-   { name: "fare_amount", label: "Fare Amount", type: "number", required: true },
+   { name: "fee_term_id", label: "Fee Term ID", required: true },
+   { name: "fee_per_term", label: "Fee Per Term", type: "number", required: true },
];
```

**Default Values Updated:**
```diff
const defaultValues: StudentTransportCreate = {
+   trip_id: "",
    student_id: "",
-   route_id: "",
    stop_id: "",
-   trip_type: "pickup",
-   academic_year_id: "",
-   fare_amount: 0,
+   fee_term_id: "",
+   fee_per_term: 0,
};
```

**Table Columns Updated:**
```diff
const columns = [
+   { key: "trip_id", label: "Trip ID", editable: true },
    { key: "student_id", label: "Student ID", editable: true },
-   { key: "route_id", label: "Route", editable: true, render: ... },
    { key: "stop_id", label: "Stop ID", editable: true },
-   { key: "trip_type", label: "Trip Type", editable: true },
-   { key: "academic_year_id", label: "Academic Year", editable: true },
-   { key: "fare_amount", label: "Fare Amount", editable: true, render: (v) => `$${v}` },
+   { key: "fee_term_id", label: "Fee Term", editable: true },
+   { key: "fee_per_term", label: "Fee Per Term", editable: true, render: (v) => `$${v}` },
    { key: "is_active", label: "Active", editable: true, render: ... },
];
```

**Removed Unused Code:**
```diff
- import { useMemo } from "react";
- import { useRoutes } from '@/api/hooks/masters/routes';
- const { data: routes } = useRoutes();
- const routeMap = useMemo(() => new Map(routes?.map(r => [r.id, r.route_name]) || []), [routes]);
```

### 3. Permission Configuration
**Added:** Permission configuration to enable role-based access control

```typescript
permissions: {
    resource: 'STUDENT_TRANSPORT',
    create: true,
    read: true,
    update: true,
    delete: true,
    list: true,
}
```

---

## Backend Validation Errors (Before Fix)

The backend was returning these validation errors when using the old schema:

```json
{
    "detail": [
        {
            "type": "uuid_parsing",
            "loc": ["body", "student_id"],
            "msg": "Input should be a valid UUID, invalid length: expected length 32 for simple format, found 3",
            "input": "344"
        },
        {
            "type": "missing",
            "loc": ["body", "trip_id"],
            "msg": "Field required"
        },
        {
            "type": "uuid_parsing",
            "loc": ["body", "stop_id"],
            "msg": "Input should be a valid UUID, invalid length: expected length 32 for simple format, found 2",
            "input": "55"
        },
        {
            "type": "missing",
            "loc": ["body", "fee_per_term"],
            "msg": "Field required"
        }
    ]
}
```

---

## Impact Analysis

### Breaking Changes
✅ **YES** - This is a breaking change. Old data format will NOT work with new backend.

### Data Migration Required
⚠️ **YES** - Existing student transport records need to be migrated to new schema (backend responsibility)

### Affects Other Modules
- ❌ Student Transport module only
- May affect fee calculations if `fee_per_term` logic differs from `fare_amount`

### User Impact
- Users will need to select Trip instead of Route
- Users will need to select Fee Term
- Cannot specify trip_type directly (determined by Trip)

---

## Testing Requirements

### Form Submission Test
1. Navigate to `/transport/studentTransport`
2. Click "Add Student Transport"
3. Fill in required fields:
   - Trip ID (UUID format)
   - Student ID (UUID format)
   - Stop ID (UUID format)
   - Fee Term ID (UUID format)
   - Fee Per Term (number)
4. Submit form
5. Verify record is created successfully

### UUID Format Validation
- Test with valid UUID: `bb30dcea-194c-4f71-8343-80edc5ebcc74` ✅
- Test with invalid format: `344` ❌ (should fail with validation error)

### Display Test
1. Load page with existing records
2. Verify all columns display correctly:
   - Trip ID
   - Student ID
   - Stop ID
   - Fee Term
   - Fee Per Term (with $ prefix)
   - Active status badge

### Permissions Test
1. Login with user without `student_transport:list` permission
2. Verify "You don't have permission" message appears
3. Login with authorized user
4. Verify data loads successfully

---

## Recommendations for Future

### 1. Better Dropdowns
Replace text input fields with proper dropdowns:

```typescript
// Instead of text input for trip_id
<TripsDropdown
  value={formData.trip_id}
  onChange={(value) => setFormData({ ...formData, trip_id: value })}
/>

// Instead of text input for student_id
<StudentsDropdown
  value={formData.student_id}
  onChange={(value) => setFormData({ ...formData, student_id: value })}
/>
```

### 2. Display Names Instead of IDs
Load related data and display names in table:

```typescript
// Instead of showing UUID
"bb30dcea-194c-4f71-8343-80edc5ebcc74"

// Show meaningful name
"Morning Route - Pickup"
```

### 3. Backend Handover Document
Create a document for backend team with:
- Migration script for existing data
- API endpoint documentation update
- Breaking changes notice
- Data validation rules

### 4. Frontend Improvements Needed
- [ ] Add dropdown components for Trip, Student, Stop, and Fee Term selection
- [ ] Fetch and display related entity names in table
- [ ] Add form validation for UUID format
- [ ] Add helpful error messages when validation fails
- [ ] Improve UX by showing entity names instead of UUIDs

---

## API Endpoint

**Endpoint:** `/students/student-transport/`
**Methods:** GET, POST, PATCH, DELETE
**Schema:** Now uses StudentTrip-based model

---

## Related Files

- **Types:** `src/types/masters/studentTransport.ts`
- **API:** `src/api/masters/studentTransport.ts`
- **Hooks:** `src/api/hooks/masters/studentTransport.ts`
- **Page:** `src/pages/transport/studentTransport.tsx`
- **Route:** `src/routes/_app/transport/studentTransport.tsx`
- **Permissions:** `src/constants/permissions.ts` (STUDENT_TRANSPORT)

---

## Questions for Backend Team

1. **Data Migration:** Has the existing student transport data been migrated to the new schema?
2. **Cascade Delete:** What happens to student transport records if a Trip is deleted?
3. **Fee Term:** How does `fee_per_term` relate to the overall transport fee structure?
4. **UUID Format:** Are all IDs required to be UUIDs, or can some be numeric?
5. **Trip Relationship:** Does `trip_id` replace the need for `route_id` completely?
6. **Academic Year:** Is academic year now tracked at the Trip level instead of StudentTransport?

---

## Status Summary

✅ Type definitions updated
✅ Page component updated
✅ Form fields updated
✅ Table columns updated
✅ Permissions configured
✅ Unused code removed
✅ TypeScript errors resolved

⚠️ **Next Steps:**
1. Add dropdown components for better UX
2. Display entity names instead of UUIDs
3. Test with real backend data
4. Verify data migration completed
5. Update user documentation

---

**Completed By:** Claude Code
**Date:** 2026-02-09
**Related Docs:**
- STUDENT_TRANSPORT_TYPE_FIXES.md
- TRANSPORT_MODULE_FIXES.md
