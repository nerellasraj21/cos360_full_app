# Transport Route & Trip Types - Dynamic Implementation

**Date:** 2026-02-10
**Module:** Transport - Route Management
**Priority:** Medium - Feature Enhancement
**Status:** ✅ **COMPLETED**

---

## Summary

Converted hardcoded route types and trip types from static arrays to dynamic data fetched via React Query hooks, making them configurable without code changes.

---

## Changes Overview

### Before (Static Implementation)
```typescript
// Hardcoded in component file
const routeTypeOptions = [
    { value: 'upward', label: 'Upward' },
    { value: 'downward', label: 'Downward' }
];

const tripTypeOptions = [
    { value: 'first trip', label: 'First Trip' },
    { value: 'second trip', label: 'Second Trip' }
];
```

**Problems:**
- ❌ Requires code changes to modify options
- ❌ Not configurable per tenant/school
- ❌ Inconsistent with other master data patterns

### After (Dynamic Implementation)
```typescript
// Fetched via React Query hooks
const { data: routeTypeOptions = [] } = useRouteTypes();
const { data: tripTypeOptions = [] } = useTripTypes();
```

**Benefits:**
- ✅ Configuration-based - edit one file to update options
- ✅ Consistent API-like interface using React Query
- ✅ Easy to migrate to real backend endpoints later
- ✅ Follows existing codebase patterns

---

## Architecture

### Configuration Layer
**File:** `src/config/transportOptions.ts`

Contains the option definitions:
```typescript
export const ROUTE_TYPE_OPTIONS: OptionItem[] = [
  { value: 'upward', label: 'Upward' },
  { value: 'downward', label: 'Downward' },
];

export const TRIP_TYPE_OPTIONS: OptionItem[] = [
  { value: 'first trip', label: 'First Trip' },
  { value: 'second trip', label: 'Second Trip' },
];
```

**Why a config file instead of API?**
- Backend doesn't have `/masters/route-types` or `/masters/trip-types` endpoints yet
- Config file provides dynamic behavior without backend changes
- Easy to migrate to real API when backend is ready

### API Layer (Mock)
**File:** `src/api/hooks/masters/transportOptions.ts`

React Query hooks that mimic API behavior:
```typescript
export function useRouteTypes() {
  return useQuery<OptionItem[]>({
    queryKey: transportOptionsKeys.routeTypes(),
    queryFn: getRouteTypeOptions,
    staleTime: Infinity, // Config data doesn't change during session
  });
}

export function useTripTypes() {
  return useQuery<OptionItem[]>({
    queryKey: transportOptionsKeys.tripTypes(),
    queryFn: getTripTypeOptions,
    staleTime: Infinity,
  });
}
```

**Benefits:**
- Components use hooks just like other API data
- When backend adds endpoints, only change the hook implementation
- Maintains React Query caching and state management

### Component Layer
**File:** `src/pages/transport/routes.tsx`

Uses hooks to fetch options dynamically:
```typescript
const { data: routeTypeOptions = [], isLoading: isLoadingRouteTypes } = useRouteTypes();
const { data: tripTypeOptions = [], isLoading: isLoadingTripTypes } = useTripTypes();

// Show loading state
if (isLoadingRouteTypes || isLoadingTripTypes) {
    return <LoadingSpinner />;
}

// Use dynamic options in columns and forms
const columns = createColumns(routeTypeOptions, tripTypeOptions);
```

---

## Files Created

### 1. Configuration File
**Path:** `src/config/transportOptions.ts`

**Exports:**
- `ROUTE_TYPE_OPTIONS` - Array of route type options
- `TRIP_TYPE_OPTIONS` - Array of trip type options
- `getRouteTypeOptions()` - Promise-based getter (mimics API)
- `getTripTypeOptions()` - Promise-based getter (mimics API)
- `RouteType` type - TypeScript type for route types
- `TripType` type - TypeScript type for trip types
- `OptionItem` interface - Standard option structure

### 2. React Query Hooks
**Path:** `src/api/hooks/masters/transportOptions.ts`

**Exports:**
- `useRouteTypes()` - Hook to fetch route type options
- `useTripTypes()` - Hook to fetch trip type options
- `transportOptionsKeys` - Query key factory for cache management

**Features:**
- Infinite stale time (config doesn't change)
- Infinite garbage collection time (keep forever)
- Standard React Query error handling
- Consistent with other hooks in codebase

---

## Files Modified

### routes.tsx
**Path:** `src/pages/transport/routes.tsx`

**Changes:**

1. **Imports Added:**
```typescript
import { useRouteTypes, useTripTypes } from '@/api/hooks/masters/transportOptions';
import type { OptionItem } from '@/config/transportOptions';
import { Loader2 } from 'lucide-react';
```

2. **Removed Static Arrays:**
```diff
- const routeTypeOptions = [
-     { value: 'upward', label: 'Upward' },
-     { value: 'downward', label: 'Downward' }
- ];
-
- const tripTypeOptions = [
-     { value: 'first trip', label: 'First Trip' },
-     { value: 'second trip', label: 'Second Trip' }
- ];
```

3. **Created Column Generator Function:**
```typescript
const createColumns = (
  routeTypeOptions: OptionItem[],
  tripTypeOptions: OptionItem[]
) => [
  // Column definitions using passed options
];
```

4. **Added Hooks in Component:**
```typescript
export default function RoutesPage() {
    // Fetch dynamic options
    const { data: routeTypeOptions = [], isLoading: isLoadingRouteTypes } = useRouteTypes();
    const { data: tripTypeOptions = [], isLoading: isLoadingTripTypes } = useTripTypes();

    // Loading state
    if (isLoadingRouteTypes || isLoadingTripTypes) {
        return <LoadingSpinner />;
    }

    // Generate columns with options
    const columns = createColumns(routeTypeOptions, tripTypeOptions);
```

---

## Usage Guide

### Adding New Options

**To add a new route type:**
1. Open `src/config/transportOptions.ts`
2. Add to `ROUTE_TYPE_OPTIONS` array:
```typescript
export const ROUTE_TYPE_OPTIONS: OptionItem[] = [
  { value: 'upward', label: 'Upward' },
  { value: 'downward', label: 'Downward' },
  { value: 'circular', label: 'Circular' }, // NEW
];
```
3. Save - changes apply immediately (hot reload)

**To add a new trip type:**
1. Open `src/config/transportOptions.ts`
2. Add to `TRIP_TYPE_OPTIONS` array:
```typescript
export const TRIP_TYPE_OPTIONS: OptionItem[] = [
  { value: 'first trip', label: 'First Trip' },
  { value: 'second trip', label: 'Second Trip' },
  { value: 'third trip', label: 'Third Trip' }, // NEW
];
```
3. Save - changes apply immediately

### Migrating to Backend API (Future)

When backend implements `/masters/route-types` and `/masters/trip-types` endpoints:

**Step 1:** Create API functions in `src/api/masters/transportOptions.ts`:
```typescript
import CAxios from '../index';

export const getRouteTypes = async (): Promise<OptionItem[]> => {
  const response = await CAxios.get('/masters/route-types');
  return response.data;
};

export const getTripTypes = async (): Promise<OptionItem[]> => {
  const response = await CAxios.get('/masters/trip-types');
  return response.data;
};
```

**Step 2:** Update hooks in `src/api/hooks/masters/transportOptions.ts`:
```typescript
export function useRouteTypes() {
  return useQuery<OptionItem[]>({
    queryKey: transportOptionsKeys.routeTypes(),
    queryFn: () => CAxios.get('/masters/route-types').then(r => r.data), // CHANGED
    // Remove Infinity staleTime - use default for API data
  });
}
```

**Step 3:** Remove config file (optional):
- Keep it as fallback/default values
- Or remove entirely if backend is source of truth

**Components require NO changes** - they already use the hooks!

---

## Testing

### Manual Testing

1. **Navigate to Routes page:**
   ```
   http://localhost:5174/transport/routes
   ```

2. **Verify dropdowns work:**
   - Click "Add Route Management"
   - Route Type dropdown shows: Upward, Downward
   - Trip Type dropdown shows: First Trip, Second Trip
   - Both are selectable with mouse and keyboard

3. **Test table inline edit:**
   - Edit an existing route
   - Route Type and Trip Type dropdowns use same options
   - Changes save correctly

4. **Modify options:**
   - Edit `src/config/transportOptions.ts`
   - Add a new option (e.g., "Third Trip")
   - Refresh page
   - New option appears in dropdown

### Expected Behavior
- ✅ Loading state shows while fetching options (instant with config)
- ✅ All dropdowns populate with correct options
- ✅ Mouse clicks work
- ✅ Keyboard navigation works
- ✅ Form submission works
- ✅ Table editing works

---

## Impact Assessment

### Positive Impacts

1. **Maintainability**
   - Single source of truth for options
   - No code changes needed to add/modify options
   - Easy to understand configuration structure

2. **Scalability**
   - Ready for backend migration
   - Can make tenant-specific later
   - Consistent with master data patterns

3. **Developer Experience**
   - Follows React Query patterns
   - Type-safe with TypeScript
   - Clear documentation and migration path

### Limitations

1. **Not True Master Data (Yet)**
   - Still frontend-only configuration
   - Can't be managed via admin UI
   - Same options for all tenants

2. **Requires Backend Coordination**
   - Backend doesn't have endpoints yet
   - Need backend team to add master data tables
   - Migration requires coordination

### Risk Level
**Risk:** 🟢 Low

**Reasoning:**
- Non-breaking change (same options as before)
- Maintains all existing functionality
- Adds flexibility without removing features
- Easy to revert if needed

---

## Future Recommendations

### 1. Backend Master Data Endpoints

Request backend team to implement:

**Route Types Table:**
```sql
CREATE TABLE route_types (
  id UUID PRIMARY KEY,
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID, -- For multi-tenant
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
- `GET /masters/route-types` - List all route types
- `POST /masters/route-types` - Create new route type
- `PUT /masters/route-types/{id}` - Update route type
- `DELETE /masters/route-types/{id}` - Delete route type

Same structure for `trip_types`.

### 2. Admin UI for Management

Create admin pages to manage these options:
- `/masters/route-types` - Manage route types
- `/masters/trip-types` - Manage trip types

Use MasterPage component pattern for consistency.

### 3. Tenant-Specific Options

Allow different schools to have different options:
- Some schools might need "Circular" routes
- Some might have 3+ trip types
- Multi-tenant isolation required

---

## Related Files

```
src/
├── config/
│   └── transportOptions.ts          [NEW - Configuration source]
├── api/
│   └── hooks/
│       └── masters/
│           └── transportOptions.ts  [NEW - React Query hooks]
└── pages/
    └── transport/
        └── routes.tsx               [MODIFIED - Uses dynamic options]
```

---

## Documentation Updates

### Updated CLAUDE.md
- ✅ Document configuration-based dynamic options pattern
- ✅ Add migration guide for config → API
- ✅ Include in master data section

### Reference Pattern

For other developers implementing similar features:

```typescript
// 1. Create config file with options
// src/config/myOptions.ts
export const MY_OPTIONS = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

// 2. Create React Query hooks
// src/api/hooks/masters/myOptions.ts
export function useMyOptions() {
  return useQuery({
    queryKey: ['myOptions'],
    queryFn: () => Promise.resolve(MY_OPTIONS),
    staleTime: Infinity,
  });
}

// 3. Use in components
const { data: options = [] } = useMyOptions();
```

---

## Deployment Checklist

- [x] Configuration file created
- [x] React Query hooks implemented
- [x] Component updated to use hooks
- [x] Loading states handled
- [x] TypeScript types defined
- [x] Documentation created
- [ ] Backend coordination initiated
- [ ] QA testing completed
- [ ] Stakeholders informed

---

**Implemented by:** Claude Code
**Backend Coordination Required:** Yes - for future API endpoints
**Breaking Changes:** None
**Migration Required:** No
