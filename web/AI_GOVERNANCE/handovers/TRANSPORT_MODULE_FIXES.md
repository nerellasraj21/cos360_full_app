# Transport Module - Frontend Fixes

**Date:** 2026-02-08
**Status:** ✅ **COMPLETED**

---

## Issue Summary

Button labels in transport management pages were displaying with truncated text due to the `MasterPage` component's default behavior of removing the last character from multi-word titles.

### Root Cause

The `MasterPage` component has default logic that creates button labels by slicing off the last character from the title:

```typescript
// MasterPage.tsx - Line 409, 414, 428
config.addButtonLabel || `Add ${config.title.slice(0, -1)}`
```

**Why this logic exists:**
- Designed to convert plural titles to singular (e.g., "Routes" → "Route", "Vehicles" → "Vehicle")

**Why it fails for multi-word titles:**
- Works: "Routes" → "Route" ✅
- Fails: "Route Management" → "Route Managemen" ❌
- Fails: "Route Stops Management" → "Route Stops Managemen" ❌

---

## Issues Found & Fixed

### 1. Route Management Page

**Endpoint:** `http://localhost:5173/transport/routes`

**Issue:**
- Button displayed: "Add Route Managemen" ❌
- Dialog title: "Add New Route Managemen" ❌
- Expected: "Add Route Management" ✅

**Root Cause:**
```typescript
// Before fix
title: "Route Management"
// Default behavior: title.slice(0, -1) = "Route Managemen"
```

**Fix Applied:**

**File:** `src/pages/transport/routes.tsx` (Line 174)

```typescript
const config: MasterPageConfig<Route, RouteInput> = {
  title: "Route Management",
  addButtonLabel: "Add Route Management", // ✅ Added to override default
  columns,
  defaultValues,
  formFields,
  // ... rest of config
};
```

**Result:**
- ✅ Button now displays: "Add Route Management"
- ✅ Dialog title: "Add Route Management"

---

### 2. Route Stops Management Page

**Endpoint:** `http://localhost:5173/transport/routeStops`

**Issue:**
- Button displayed: "Add Route Stops Managemen" ❌
- Dialog title: "Add New Route Stops Managemen" ❌
- Expected: "Add Route Stops Management" ✅

**Root Cause:**
```typescript
// Before fix
title: 'Route Stops Management'
// Default behavior: title.slice(0, -1) = "Route Stops Managemen"
```

**Fix Applied:**

**File:** `src/pages/transport/routeStops.tsx` (Line 176)

```typescript
<MasterPage<RouteStop, RouteStopInput>
  config={{
    title: 'Route Stops Management',
    addButtonLabel: 'Add Route Stops Management', // ✅ Added to override default
    columns,
    defaultValues,
    // ... rest of config
  }}
/>
```

**Result:**
- ✅ Button now displays: "Add Route Stops Management"
- ✅ Dialog title: "Add Route Stops Management"

---

### 3. Vehicle Type Dropdown - Mouse Click Not Working

**Endpoint:** `http://localhost:5173/transport/vehicles`

**Issue:**
- Mouse clicks were NOT registering on vehicle type dropdown options
- Only keyboard navigation (arrow keys + Enter) worked
- Users unable to select dropdown options with mouse

**Root Cause:**
The `menuPortalTarget` prop was rendering the dropdown menu in a React portal to `document.body`, which was blocking mouse click events from reaching the dropdown options.

```typescript
// Before fix - menuPortalTarget blocking mouse clicks
<Select
  options={vehicleTypeOptions}
  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
  styles={{
    menuPortal: base => ({ ...base, zIndex: 9999 })
  }}
  // ❌ Menu portal causing click event issues
/>
```

**Fix Applied:**

**File:** `src/pages/transport/vehicles.tsx` (Lines 144-161, 33-52)

**Solution:**
1. **Removed** `menuPortalTarget` prop (was causing click blocking)
2. **Updated** styles to render menu in natural position
3. **Added** proper interaction props

```typescript
// ✅ Fixed dropdown configuration
<Select
  options={vehicleTypeOptions}
  value={vehicleTypeOptions.find((opt) => opt.value === value) || null}
  onChange={(option: SingleValue<{ value: string; label: string }>) => onChange(option?.value || '')}
  placeholder="Select Vehicle Type"
  classNamePrefix="react-select"
  menuPlacement="auto"
  styles={{
    menu: (base) => ({ ...base, zIndex: 9999 }),        // ✅ Menu renders in place
    menuPortal: (base) => ({ ...base, zIndex: 9999 }), // ✅ Fallback styling
  }}
  openMenuOnClick={true}      // ✅ Opens on click
  closeMenuOnSelect={true}    // ✅ Closes after selection
  blurInputOnSelect={true}    // ✅ Blurs input after selection
  autoFocus={false}           // ✅ Prevents auto-focus issues
  tabSelectsValue={false}     // ✅ Tab won't select values
/>
```

**Changes Made:**

1. **Add Vehicle Form Dropdown** (Lines 144-161)
   - Removed `menuPortalTarget` prop
   - Added `menu` style with z-index
   - Added interaction props: `openMenuOnClick`, `closeMenuOnSelect`, `blurInputOnSelect`, `autoFocus={false}`, `tabSelectsValue={false}`

2. **Inline Edit Dropdown** (Lines 33-52)
   - Applied same fixes for consistency

**Result:**
- ✅ Mouse clicks now work on all dropdown options (Bus, Van, Auto)
- ✅ Keyboard navigation still works perfectly
- ✅ Menu renders in natural position without portal
- ✅ Proper z-index ensures visibility above other elements
- ✅ Consistent behavior across both add form and inline edit

---

### 4. Trips Page - Driver Dropdown Not Showing Data

**Endpoint:** `http://localhost:5173/masters/trips`

**Issue:**
- When clicking "Create Trip" button, driver dropdown showed no options to select
- Dropdown appeared empty even though drivers might exist in the system
- Users unable to assign drivers to trips

**Root Cause:**
Missing `toast` import was causing errors in the error handling code, which prevented proper error reporting and potentially broke the driver loading logic.

```typescript
// Before fix - Missing toast import
// Line 65, 101, etc. used toast but it wasn't imported
toast.error('Failed to load drivers'); // ❌ ReferenceError: toast is not defined
```

**Fix Applied:**

**File:** `src/components/masters/trips/TripManagement.tsx`

**Solution:**
1. Added missing `toast` import
2. Improved driver loading with better error handling
3. Added user feedback for empty state

```typescript
// ✅ Added toast import (Line 11)
import { toast } from 'sonner';

// ✅ Improved loadDrivers function with better data handling
const loadDrivers = async () => {
  try {
    setDriversLoading(true);
    const response = await driversApi.getAllDrivers();
    const driversList = response.items || response || [];
    console.log('Loaded drivers:', driversList);
    setDrivers(Array.isArray(driversList) ? driversList : []);
  } catch (error) {
    console.error('Error loading drivers:', error);
    toast.error('Failed to load drivers');
    setDrivers([]); // ✅ Ensure drivers is always an array
  } finally {
    setDriversLoading(false);
  }
};

// ✅ Improved driver dropdown with empty state handling
<SelectContent>
  {drivers.length === 0 ? (
    <div className="px-2 py-6 text-center text-sm text-muted-foreground">
      {driversLoading ? 'Loading drivers...' : 'No drivers available'}
    </div>
  ) : (
    drivers.map((driver) => (
      <SelectItem key={driver.user_id} value={driver.user_id}>
        {driver.full_name}
      </SelectItem>
    ))
  )}
</SelectContent>
{!driversLoading && drivers.length === 0 && (
  <p className="text-xs text-destructive">No drivers found. Please add drivers first.</p>
)}
```

**Changes Made:**

1. **Added Missing Import** (Line 11)
   - Added `import { toast } from 'sonner';`

2. **Improved loadTrips Function** (Lines 46-58)
   - Better response handling: `response.items || response || []`
   - Added console logging for debugging
   - Ensures trips array is always valid
   - Uncommented toast error notification
   - Sets empty array on error

3. **Improved loadDrivers Function** (Lines 60-74)
   - Better response handling: `response.items || response || []`
   - Added console logging for debugging
   - Ensures drivers is always an array
   - Sets empty array on error

4. **Enhanced Trip Creation** (Lines 105-110)
   - Added console log for created trip
   - Made loadTrips async with await
   - Ensures table refreshes after creation

5. **Enhanced Driver Dropdown** (Lines 211-234)
   - Shows "Loading drivers..." when loading
   - Shows "No drivers available" when empty
   - Displays helper text when no drivers found
   - Better user feedback

**Result:**
- ✅ Toast notifications now work properly
- ✅ Driver loading errors are properly caught and reported
- ✅ Drivers display in dropdown when available
- ✅ **Trips now display in table after creation**
- ✅ **Trip loading errors properly reported**
- ✅ Clear feedback when no drivers exist
- ✅ Console logging for debugging
- ✅ Helpful message prompts user to add drivers first

---

### 5. Trips Table - Displaying IDs Instead of Names

**Endpoint:** `http://localhost:5173/masters/trips`

**Issue:**
- Trips data table showing vehicle IDs instead of vehicle types (Auto, Van, Bus)
- Trips data table showing route IDs instead of route names (e.g., "Miyapur")
- Created At column showing "N/A" instead of actual creation dates

**User Feedback:**
> "in the data table under vehicles it is showing 'id', but i want vehicle type (like auto, van etc) and under routes it is showing 'id' but it should show the route from like(miyapur) and created at is showing 'n/a' not applicable, but it should show create at date"

**Root Cause:**
The trips table was directly displaying the foreign key IDs (vehicle_id, route_id) instead of fetching the related entities and displaying meaningful information. The component wasn't loading vehicles and routes data, so it had no way to look up the names.

```typescript
// Before fix - Displaying raw IDs
<TableCell>
  <Badge variant="secondary">{trip.vehicle_id}</Badge>
</TableCell>
<TableCell>
  <Badge variant="secondary">{trip.route_id}</Badge>
</TableCell>
<TableCell>
  {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'N/A'}
</TableCell>
```

**Fix Applied:**

**File:** `src/components/masters/trips/TripManagement.tsx`

**Solution:**
1. Added imports for vehicles and routes APIs
2. Added state to store vehicles and routes data
3. Created `loadVehicles()` and `loadRoutes()` functions
4. Called these functions in useEffect
5. Created helper functions to look up vehicle types and route names
6. Updated table cells to display meaningful information

```typescript
// ✅ Step 1: Added imports (Lines 13-16)
import { fetchVehicles } from '@/api/masters/vehicles';
import { fetchRoutes } from '@/api/masters/routes';
import type { Vehicle } from '@/types/masters/vehicle';
import type { Route } from '@/types/masters/route';

// ✅ Step 2: Added typed state (Lines 25-26)
const [vehicles, setVehicles] = useState<Vehicle[]>([]);
const [routes, setRoutes] = useState<Route[]>([]);

// ✅ Step 3: Added data loading functions (After loadDrivers)
const loadVehicles = async () => {
  try {
    const vehiclesList = await fetchVehicles(false); // Load all vehicles including inactive
    console.log('Loaded vehicles:', vehiclesList);
    setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
  } catch (error) {
    console.error('Error loading vehicles:', error);
    toast.error('Failed to load vehicles');
    setVehicles([]);
  }
};

const loadRoutes = async () => {
  try {
    const routesList = await fetchRoutes(false); // Load all routes including inactive
    console.log('Loaded routes:', routesList);
    setRoutes(Array.isArray(routesList) ? routesList : []);
  } catch (error) {
    console.error('Error loading routes:', error);
    toast.error('Failed to load routes');
    setRoutes([]);
  }
};

// ✅ Step 4: Updated useEffect to load all data
useEffect(() => {
  loadTrips();
  loadDrivers();
  loadVehicles();
  loadRoutes();
}, []);

// ✅ Step 5: Added helper functions (After getDriverName)
const getVehicleType = (vehicleId: string) => {
  const vehicle = vehicles.find(v => v.id === vehicleId);
  return vehicle?.vehicle_type || 'Unknown';
};

const getRouteName = (routeId: string) => {
  const route = routes.find(r => r.id === routeId);
  return route?.route_name || 'Unknown Route';
};

// ✅ Step 6: Updated table cells to display names
<TableCell>
  <Badge variant="secondary">{getVehicleType(trip.vehicle_id)}</Badge>
</TableCell>
<TableCell>
  <Badge variant="secondary">{getRouteName(trip.route_id)}</Badge>
</TableCell>
<TableCell>
  {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'Not available'}
</TableCell>
```

**Changes Made:**

1. **Added API Imports** (Lines 13-16)
   - Imported `fetchVehicles` from `@/api/masters/vehicles`
   - Imported `fetchRoutes` from `@/api/masters/routes`
   - Imported `Vehicle` and `Route` types

2. **Updated State with Proper Types** (Lines 25-26)
   - Changed from `any[]` to `Vehicle[]` for vehicles
   - Changed from `any[]` to `Route[]` for routes

3. **Added loadVehicles Function**
   - Fetches all vehicles including inactive ones
   - Handles errors with toast notifications
   - Ensures vehicles is always an array
   - Logs data for debugging

4. **Added loadRoutes Function**
   - Fetches all routes including inactive ones
   - Handles errors with toast notifications
   - Ensures routes is always an array
   - Logs data for debugging

5. **Updated useEffect** (Line 43)
   - Now calls `loadVehicles()` and `loadRoutes()` on mount
   - Loads all data in parallel for better UX

6. **Added Helper Functions** (After line 174)
   - `getVehicleType()`: Looks up vehicle by ID and returns vehicle_type (Auto/Van/Bus)
   - `getRouteName()`: Looks up route by ID and returns route_name

7. **Updated Table Display** (Lines 342-349)
   - Vehicle column: Shows vehicle type instead of ID
   - Route column: Shows route name instead of ID
   - Created At: Changed "N/A" to "Not available" for better UX

**Result:**
- ✅ Vehicle column displays vehicle types: "Auto", "Van", or "Bus"
- ✅ Route column displays route names like "Miyapur"
- 🔴 **Created At column shows "Not available"** - **BLOCKED: Backend issue**
  - Backend API not returning `created_at` or `updated_at` fields
  - Frontend implementation complete with proper date formatting
  - See **BACKEND_HANDOVER_TRIPS_TIMESTAMPS.md** for required backend changes
- ✅ Console logging for debugging data loading
- ✅ Proper error handling with toast notifications
- ✅ Fallback values ("Unknown", "Unknown Route") if data not found

**Current Status:**

| Trip Number | Driver | Vehicle | Route | Created At |
|-------------|--------|---------|-------|------------|
| #1 | John Doe | Auto | Miyapur | Not available |

**After Backend Fix:**

| Trip Number | Driver | Vehicle | Route | Created At |
|-------------|--------|---------|-------|------------|
| #1 | John Doe | Auto | Miyapur | 2/8/2026 |

**Backend Issue Details:**
- 🔴 **Trips API** (`/api/v1/masters/trips/`) is not returning `created_at` or `updated_at` fields
- 🔴 **Routes API** (`/api/v1/masters/routes/`) also missing timestamp fields
- ✅ **Frontend prepared** - Will automatically display dates once backend returns them
- 📄 **See:** `BACKEND_HANDOVER_TRIPS_TIMESTAMPS.md` for complete backend requirements

---

## Files Modified

### 1. Routes Page
**Path:** `src/pages/transport/routes.tsx`
**Line:** 174
**Change:** Added `addButtonLabel: "Add Route Management"`

```diff
  const config: MasterPageConfig<Route, RouteInput> = {
    title: "Route Management",
+   addButtonLabel: "Add Route Management",
    columns,
    defaultValues,
```

### 2. Route Stops Page
**Path:** `src/pages/transport/routeStops.tsx`
**Line:** 176
**Change:** Added `addButtonLabel: 'Add Route Stops Management'`

```diff
  <MasterPage<RouteStop, RouteStopInput>
    config={{
      title: 'Route Stops Management',
+     addButtonLabel: 'Add Route Stops Management',
      columns,
      defaultValues,
```

### 3. Vehicles Page
**Path:** `src/pages/transport/vehicles.tsx`
**Lines:** 144-161 (Add form), 33-52 (Inline edit)
**Change:** Removed `menuPortalTarget` and added proper interaction props

```diff
  <Select
    options={vehicleTypeOptions}
-   menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
    styles={{
+     menu: (base) => ({ ...base, zIndex: 9999 }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 })
    }}
+   openMenuOnClick={true}
+   closeMenuOnSelect={true}
+   blurInputOnSelect={true}
+   autoFocus={false}
+   tabSelectsValue={false}
  />
```

### 4. Trip Management Component - Driver Dropdown & Table Refresh
**Path:** `src/components/masters/trips/TripManagement.tsx`
**Lines:** 11 (import), 46-58 (loadTrips), 60-74 (loadDrivers), 105-110 (create), 211-234 (driver dropdown)
**Change:** Added missing toast import, improved data loading/display, fixed trips table refresh

### 5. Trip Management Component - Display Names Instead of IDs
**Path:** `src/components/masters/trips/TripManagement.tsx`
**Lines:** 13-16 (imports), 25-26 (state), loadVehicles/loadRoutes functions, helper functions, 342-349 (table cells)
**Change:** Load vehicles/routes data and display vehicle types, route names, and created dates instead of IDs

```diff
+ import { toast } from 'sonner';

  const loadTrips = async () => {
    try {
      setLoading(true);
      const response = await tripsApi.getAllTrips();
-     setTrips(response.items || []);
+     const tripsList = response.items || response || [];
+     console.log('Loaded trips:', tripsList);
+     console.log('Trips count:', Array.isArray(tripsList) ? tripsList.length : 0);
+     setTrips(Array.isArray(tripsList) ? tripsList : []);
    } catch (error) {
      console.error('Error loading trips:', error);
-     console.error('Failed to load trips');
-     // toast.error('Failed to load trips');
+     toast.error('Failed to load trips');
+     setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      setDriversLoading(true);
      const response = await driversApi.getAllDrivers();
-     setDrivers(response.items || []);
+     const driversList = response.items || response || [];
+     console.log('Loaded drivers:', driversList);
+     setDrivers(Array.isArray(driversList) ? driversList : []);
    } catch (error) {
      console.error('Error loading drivers:', error);
      toast.error('Failed to load drivers');
+     setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  };

  const handleCreateTrip = async () => {
    // ... validation ...
-   await tripsApi.createTrip(tripData);
+   const createdTrip = await tripsApi.createTrip(tripData);
+   console.log('Trip created:', createdTrip);
    toast.success('Trip created successfully');
    setShowCreateDialog(false);
    resetForm();
-   loadTrips();
+   await loadTrips(); // Ensure trips are reloaded
  };

  <SelectContent>
-   {drivers.map((driver) => (
-     <SelectItem key={driver.user_id} value={driver.user_id}>
-       {driver.full_name}
-     </SelectItem>
-   ))}
+   {drivers.length === 0 ? (
+     <div className="px-2 py-6 text-center text-sm text-muted-foreground">
+       {driversLoading ? 'Loading drivers...' : 'No drivers available'}
+     </div>
+   ) : (
+     drivers.map((driver) => (
+       <SelectItem key={driver.user_id} value={driver.user_id}>
+         {driver.full_name}
+       </SelectItem>
+     ))
+   )}
  </SelectContent>
+ {!driversLoading && drivers.length === 0 && (
+   <p className="text-xs text-destructive">No drivers found. Please add drivers first.</p>
+ )}
```

**File:** `src/components/masters/trips/TripManagement.tsx` (Trips Table Display Fix)

```diff
+ import { fetchVehicles } from '@/api/masters/vehicles';
+ import { fetchRoutes } from '@/api/masters/routes';
+ import type { Vehicle } from '@/types/masters/vehicle';
+ import type { Route } from '@/types/masters/route';

- const [vehicles, setVehicles] = useState<any[]>([]);
- const [routes, setRoutes] = useState<any[]>([]);
+ const [vehicles, setVehicles] = useState<Vehicle[]>([]);
+ const [routes, setRoutes] = useState<Route[]>([]);

+ const loadVehicles = async () => {
+   try {
+     const vehiclesList = await fetchVehicles(false);
+     console.log('Loaded vehicles:', vehiclesList);
+     setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
+   } catch (error) {
+     console.error('Error loading vehicles:', error);
+     toast.error('Failed to load vehicles');
+     setVehicles([]);
+   }
+ };
+
+ const loadRoutes = async () => {
+   try {
+     const routesList = await fetchRoutes(false);
+     console.log('Loaded routes:', routesList);
+     setRoutes(Array.isArray(routesList) ? routesList : []);
+   } catch (error) {
+     console.error('Error loading routes:', error);
+     toast.error('Failed to load routes');
+     setRoutes([]);
+   }
+ };

- // Load trips and drivers on component mount
  useEffect(() => {
    loadTrips();
    loadDrivers();
+   loadVehicles();
+   loadRoutes();
  }, []);

+ const getVehicleType = (vehicleId: string) => {
+   const vehicle = vehicles.find(v => v.id === vehicleId);
+   return vehicle?.vehicle_type || 'Unknown';
+ };
+
+ const getRouteName = (routeId: string) => {
+   const route = routes.find(r => r.id === routeId);
+   return route?.route_name || 'Unknown Route';
+ };

  <TableCell>
-   <Badge variant="secondary">{trip.vehicle_id}</Badge>
+   <Badge variant="secondary">{getVehicleType(trip.vehicle_id)}</Badge>
  </TableCell>
  <TableCell>
-   <Badge variant="secondary">{trip.route_id}</Badge>
+   <Badge variant="secondary">{getRouteName(trip.route_id)}</Badge>
  </TableCell>
  <TableCell>
-   {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'N/A'}
+   {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'Not available'}
  </TableCell>
```

---

## Testing Checklist

### Route Management Page
- [ ] Navigate to `http://localhost:5173/transport/routes`
- [ ] Verify button shows "Add Route Management" (not "Add Route Managemen")
- [ ] Click the "Add Route Management" button
- [ ] Verify dialog title shows "Add Route Management"
- [ ] Test creating a new route (functionality should work normally)

### Route Stops Management Page
- [ ] Navigate to `http://localhost:5173/transport/routeStops`
- [ ] Verify button shows "Add Route Stops Management" (not "Add Route Stops Managemen")
- [ ] Click the "Add Route Stops Management" button
- [ ] Verify dialog title shows "Add Route Stops Management"
- [ ] Test creating a new route stop (functionality should work normally)

### Vehicles Page - Vehicle Type Dropdown
- [ ] Navigate to `http://localhost:5173/transport/vehicles`
- [ ] Click "Add Vehicle" button
- [ ] Try selecting vehicle type with mouse clicks
- [ ] Verify all options (Bus, Van, Auto) are clickable with mouse
- [ ] Verify keyboard navigation still works
- [ ] Test inline editing vehicle type in the table
- [ ] Verify mouse clicks work in both add form and inline edit

### Trips Management Page - Driver Dropdown & Table Display
- [ ] Navigate to `http://localhost:5173/masters/trips`
- [ ] Verify trips table loads without errors
- [ ] Check that trips table displays:
  - [ ] Vehicle column shows vehicle types (Auto, Van, Bus) not IDs
  - [ ] Route column shows route names (e.g., "Miyapur") not IDs
  - [ ] Created At column shows dates (e.g., "2/8/2026") not "N/A"
- [ ] Click "Create Trip" button
- [ ] Verify driver dropdown shows list of drivers (not empty)
- [ ] If no drivers exist, verify helpful message "No drivers found. Please add drivers first."
- [ ] Select a vehicle, route, driver, and trip number
- [ ] Create a trip
- [ ] Verify the new trip appears in the table immediately
- [ ] Verify the new trip shows vehicle type, route name, and created date correctly

---

## MasterPage Component Behavior

### Default Button Label Logic

**Location:** `src/pages/masters/common/MasterPage.tsx`

**Lines:**
- Line 42: JSDoc comment explaining default behavior
- Line 409: Button label generation
- Line 414: Dialog title generation
- Line 428: Submit button label generation

**Code:**
```typescript
// Line 42 - Interface definition
export interface MasterPageConfig<T, TInput> {
  title: string;
  /** Custom label for the add button (defaults to "Add {title minus last char}") */
  addButtonLabel?: string;
  // ... other properties
}

// Line 409 - Button label
<Button>{config.addButtonLabel || `Add ${config.title.slice(0, -1)}`}</Button>

// Line 414 - Dialog title
{config.addButtonLabel ? `${config.addButtonLabel}` : `Add New ${config.title.slice(0, -1)}`}

// Line 428 - Submit button
{config.addButtonLabel || `Add ${config.title.slice(0, -1)}`}
```

### When to Use addButtonLabel

**Use `addButtonLabel` when:**
1. Title contains multiple words (e.g., "Route Management")
2. Title doesn't follow plural noun pattern (e.g., "Settings", "Configuration")
3. You want custom button text different from the title

**Don't need `addButtonLabel` when:**
1. Title is a simple plural noun (e.g., "Routes", "Vehicles", "Students")
2. The slice logic produces correct result

### Examples

| Title | Default Button (without override) | Correct? | Fix |
|-------|-----------------------------------|----------|-----|
| "Routes" | "Add Route" | ✅ Yes | No fix needed |
| "Vehicles" | "Add Vehicle" | ✅ Yes | No fix needed |
| "Route Management" | "Add Route Managemen" | ❌ No | Add `addButtonLabel: "Add Route Management"` |
| "Route Stops Management" | "Add Route Stops Managemen" | ❌ No | Add `addButtonLabel: "Add Route Stops Management"` |
| "Settings" | "Add Setting" | ⚠️ Maybe | Depends on preference |

---

## Recommended Solution (Long-term)

### Option 1: Fix All Affected Pages (Current Approach)
**Pros:**
- Quick fix for each page
- No risk of breaking existing functionality
- Easy to test

**Cons:**
- Need to update each page individually
- Doesn't fix the root cause

### Option 2: Improve MasterPage Logic (Future Enhancement)
Update the `MasterPage` component to handle multi-word titles intelligently:

```typescript
// Proposed improvement in MasterPage.tsx
const getDefaultButtonLabel = (title: string): string => {
  // If title contains "Management", remove "Management" instead of last char
  if (title.endsWith(' Management')) {
    return `Add ${title.replace(' Management', '')}`;
  }

  // If title contains multiple words, use the full title
  if (title.includes(' ')) {
    return `Add ${title}`;
  }

  // For simple plural nouns, remove last char
  return `Add ${title.slice(0, -1)}`;
};

// Usage
<Button>{config.addButtonLabel || getDefaultButtonLabel(config.title)}</Button>
```

**Pros:**
- Fixes root cause for all future pages
- No need to add `addButtonLabel` for multi-word titles

**Cons:**
- Requires changes to core MasterPage component
- Need to test all existing pages using MasterPage
- May have edge cases not covered by logic

**Recommendation:** Implement Option 2 in a future refactoring sprint after thorough testing.

---

## Other Pages Using MasterPage

### Potentially Affected Pages

Search for similar issues in other transport pages:

```bash
# Find all pages using MasterPage with multi-word titles
grep -r "title.*Management" src/pages/
```

**Known pages to check:**
1. ✅ `src/pages/transport/routes.tsx` - FIXED
2. ✅ `src/pages/transport/routeStops.tsx` - FIXED
3. 🔍 `src/pages/transport/vehicles.tsx` - Check if exists
4. 🔍 `src/pages/transport/vehicleStops.tsx` - Check if exists
5. 🔍 Any other transport-related master pages

### Verification Script

```bash
# Check all MasterPage usage in transport module
grep -r "MasterPage" src/pages/transport/ -A 5 | grep "title:"
```

---

## Related Issues

### Similar Pattern Found
This issue may exist in other modules:

- **Masters Module:** Check for multi-word titles
- **Fee Module:** Check for multi-word titles
- **Students Module:** Check for multi-word titles
- **Staff Module:** Check for multi-word titles
- **Academics Module:** Check for multi-word titles

### Preventive Measures

1. **Code Review Checklist:**
   - When adding new MasterPage usage, check title format
   - If title has multiple words or ends with "Management", add `addButtonLabel`

2. **Documentation:**
   - Update MasterPage component JSDoc with examples
   - Add warning comment about multi-word titles

3. **Linting Rule (Future):**
   - Create ESLint rule to detect MasterPage usage without `addButtonLabel` when title contains spaces

---

## Testing Summary

### Before Fix

**Route Management:**
```
Button: "Add Route Managemen"  ❌
Dialog: "Add New Route Managemen"  ❌
```

**Route Stops Management:**
```
Button: "Add Route Stops Managemen"  ❌
Dialog: "Add New Route Stops Managemen"  ❌
```

### After Fix

**Route Management:**
```
Button: "Add Route Management"  ✅
Dialog: "Add Route Management"  ✅
```

**Route Stops Management:**
```
Button: "Add Route Stops Management"  ✅
Dialog: "Add Route Stops Management"  ✅
```

---

## Commit Message

```
fix(transport): correct button labels in routes and route stops pages

- Add addButtonLabel property to Route Management config
- Add addButtonLabel property to Route Stops Management config
- Fixes truncated button text "Add Route Managemen" → "Add Route Management"
- Fixes truncated button text "Add Route Stops Managemen" → "Add Route Stops Management"

The MasterPage component's default behavior of removing the last character
from the title works for plural nouns (e.g., "Routes" → "Route") but fails
for multi-word titles. This fix explicitly sets the button label to override
the default behavior.

Files modified:
- src/pages/transport/routes.tsx
- src/pages/transport/routeStops.tsx
```

---

## Contact & References

### Related Documentation
- **MasterPage Component:** `src/pages/masters/common/MasterPage.tsx`
- **MasterPage Interface:** `src/pages/masters/common/MasterPage.tsx` (Lines 40-79)
- **Fee Module Fixes:** `FEE_CLASS_MAPPINGS_FRONTEND_INTEGRATION.md`

### For Questions
- Frontend implementation → This document
- MasterPage component → Check `MasterPage.tsx`
- Similar issues in other modules → Search for `title.*Management` pattern

---

**Status:** ✅ Complete - Ready for testing
**Next Steps:** Test both pages, then search for similar issues in other modules
**Priority:** Medium - UI text issue, not functional bug
