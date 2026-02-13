# Transport Types - Debugging Guide

**Status:** Frontend implementation complete, experiencing 403 and 422 errors
**Date:** 2026-02-13
**Issue:** Backend permissions and validation errors preventing route/trip type creation

---

## Current Errors

### 1. **403 Forbidden Errors** (Dropdown Endpoints)
```
GET /api/v1/masters/route-types/dropdown → 403 Forbidden
GET /api/v1/masters/trip-types/dropdown → 403 Forbidden
```

**Root Cause:** Backend permissions not configured for route-types and trip-types resources
**Status:** BLOCKER - Cannot test create-on-the-fly functionality until resolved

### 2. **422 Unprocessable Entity** (Create Endpoint)
```
POST /api/v1/masters/route-types/ → 422 Unprocessable Entity
```

**Possible Causes:**
- Request payload structure mismatch
- Missing required fields
- Validation errors from backend

---

## Debugging Enhancements Added

### Enhanced Error Handler

Updated `src/api/masters/transportTypes.ts` with improved error handling:

```typescript
const handleApiError = (error: any): Error => {
  console.error('API Error:', error);

  if (error.response?.data) {
    const errorData = error.response.data;
    console.error('Error Response Data:', errorData);

    // Handle FastAPI validation errors (422)
    if (Array.isArray(errorData.detail)) {
      const messages = errorData.detail.map((err: any) =>
        `${err.loc?.join('.') || 'field'}: ${err.msg}`
      ).join(', ');
      return new Error(`Validation Error: ${messages}`);
    }

    // Handle string detail
    if (typeof errorData.detail === 'string') {
      return new Error(errorData.detail);
    }

    // Handle generic error message
    if (errorData.message) {
      return new Error(errorData.message);
    }
  }

  return new Error(error.message || 'Network error');
};
```

**What This Does:**
- Logs full error object to console
- Parses FastAPI validation error arrays
- Shows specific field validation errors
- Displays detailed error messages in toast notifications

### Request Payload Logging

Added console logging to create functions:

```typescript
// Route Types
create: async (data: RouteTypeCreate): Promise<RouteType> => {
  console.log('Creating route type with payload:', data);
  const response = await CAxios.post(ROUTE_TYPES_BASE, data);
  console.log('Route type created successfully:', response.data);
  return response.data;
}

// Trip Types
create: async (data: TripTypeCreate): Promise<TripType> => {
  console.log('Creating trip type with payload:', data);
  const response = await CAxios.post(TRIP_TYPES_BASE, data);
  console.log('Trip type created successfully:', response.data);
  return response.data;
}
```

**What This Does:**
- Shows exactly what payload is being sent to backend
- Confirms successful creation with response data
- Helps identify payload structure mismatches

---

## How to Debug

### Step 1: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to http://localhost:5173/transport/routes
4. Click "Add Route Management" button
5. Look for console logs:
   - Error logs will show detailed backend validation errors
   - Request payloads will show what data is being sent

### Step 2: Check Network Tab

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Try to create a new route type
4. Look for the failed request:
   - **403 errors:** Check Response tab for permission details
   - **422 errors:** Check Response → Preview to see validation errors

### Step 3: Verify Payload Format

**Current Payload (Frontend):**
```json
{
  "name": "New Route Type",
  "is_active": true
}
```

**Expected Fields:**
- `name` (string, required)
- `description` (string, optional)
- `is_active` (boolean, optional, default: true)

**Check if backend expects:**
- Different field names (e.g., `route_type_name` instead of `name`)?
- Additional required fields?
- Different data structure?

---

## Action Items for Backend Developer

### Fix 403 Forbidden Errors

**What's Needed:**
Add permissions for `route_types` and `trip_types` resources

**Endpoints That Need Permissions:**
```
GET  /masters/route-types/dropdown  → requires 'list' or 'read' permission
GET  /masters/trip-types/dropdown   → requires 'list' or 'read' permission
POST /masters/route-types/          → requires 'create' permission
POST /masters/trip-types/           → requires 'create' permission
```

**How to Fix:**
1. Add resources to RBAC system:
   - Resource name: `route_types`
   - Resource name: `trip_types`
2. Grant permissions to user's role:
   - Actions: `['list', 'read', 'create', 'update', 'delete']`
3. Verify permission checks in endpoint decorators

### Fix 422 Validation Errors

**What to Check:**
1. **Pydantic Schema** - Ensure backend accepts:
   ```python
   class RouteTypeCreate(BaseModel):
       name: str
       description: Optional[str] = None
       is_active: bool = True
   ```

2. **Required Fields** - Verify only `name` is required
3. **Field Validation** - Check for any custom validators that might be rejecting the data
4. **Response Format** - Ensure successful creation returns full RouteType object with UUID

**Debug Backend:**
- Add logging in the create endpoint
- Log incoming request payload
- Log validation errors before returning 422
- Check if `is_active` is causing issues (try making it optional)

---

## Frontend Verification Checklist

✅ **CAxios Configuration**
- Authorization header: `Bearer ${accessToken}` ✓
- Tenant header: `cschema` ✓
- Content-Type: `application/json` ✓

✅ **Request Payload**
- Sending correct structure: `{ name, is_active }` ✓
- Using correct endpoints: `/masters/route-types/` ✓
- Using correct HTTP method: POST ✓

✅ **Type Definitions**
```typescript
export interface RouteTypeCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}
```

✅ **Create-on-the-Fly Implementation**
- CreatableSelect component configured ✓
- onCreateOption handler implemented ✓
- Duplicate validation in place ✓
- Loading states handled ✓
- Error handling with toast notifications ✓

---

## Testing After Fixes

Once backend permissions and validation are fixed:

### Test Dropdown Loading
1. Navigate to /transport/routes
2. Click "Add Route Management"
3. ✅ Route Type dropdown should load options
4. ✅ Trip Type dropdown should load options

### Test Create-on-the-Fly
1. In Route Type dropdown, type "New Type"
2. Press Enter or click "Create 'New Type'"
3. ✅ Should show loading state
4. ✅ Should create new type in backend
5. ✅ Should add to dropdown immediately
6. ✅ Should auto-select the new type
7. ✅ Should show success toast

### Test Duplicate Validation
1. Try to create a type that already exists
2. ✅ Should show error toast: "Route type 'X' already exists"
3. ✅ Should not make API call

### Test Form Submission Prevention
1. Focus on dropdown
2. Type new type name
3. Press Enter
4. ✅ Should create type (not submit form)
5. Fill other fields
6. Click "Add Route" button
7. ✅ Should submit complete form

---

## Current Implementation Files

### Frontend Files
- `src/api/masters/transportTypes.ts` - API functions (with debugging)
- `src/api/hooks/masters/transportOptions.ts` - React Query hooks
- `src/types/masters/transportTypes.ts` - TypeScript interfaces
- `src/pages/transport/routes.tsx` - Routes page with create-on-the-fly
- `src/types/masters/route.ts` - Route type with UUID references

### Documentation
- `TRANSPORT_ROUTES_DROPDOWN_FIX.md` - Dropdown interaction fixes
- `TRANSPORT_TYPES_API_MIGRATION.md` - Static to dynamic migration
- `TRANSPORT_TYPES_CREATE_ON_FLY.md` - Create-on-the-fly feature
- `CLAUDE.md` - Updated with react-select in Dialog pattern

---

## Expected Console Output (Success Case)

```
Creating route type with payload: { name: "Upward", is_active: true }
Route type created successfully: {
  id: "uuid-here",
  name: "Upward",
  description: null,
  is_active: true,
  created_at: "2026-02-13T...",
  updated_at: "2026-02-13T..."
}
```

## Expected Console Output (Error Case)

```
API Error: AxiosError {...}
Error Response Data: {
  detail: [
    { loc: ["body", "name"], msg: "field required", type: "value_error.missing" }
  ]
}
```

---

## Next Steps

1. **Check Console Logs** - Look for detailed error messages
2. **Share with Backend** - Send validation error details to backend developer
3. **Wait for Permissions Fix** - Backend must grant route_types/trip_types permissions
4. **Wait for Schema Fix** - Backend must ensure payload structure matches
5. **Re-test** - Once backend fixes are deployed, test all scenarios above

---

**Status:** Frontend ready, waiting for backend permissions and validation fixes
**Frontend Contact:** Provide console logs and Network tab screenshots to backend developer
**Backend Contact:** Fix permissions and validate Pydantic schema matches frontend payload
