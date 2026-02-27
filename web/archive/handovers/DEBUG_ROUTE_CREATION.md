# Debug Route Creation - Empty Route Type and Trip Type

**Issue:** Both old AND new routes show "-" in Route Type and Trip Type columns
**Date:** 2026-02-13

---

## 🔍 What to Check

### Step 1: Open Browser Console
1. Press F12
2. Go to Console tab
3. Keep it open

### Step 2: Create a New Route

1. Navigate to `/transport/routes`
2. Click "Add Route Management"
3. Fill in the form:
   - **Route Name:** "Test Route"
   - **Starting Stop:** "Stop A"
   - **Ending Stop:** "Stop B"
   - **Number of Stops:** 5
   - **Route Type:** Type "Upward" and press Enter (create new type)
   - **Trip Type:** Type "First Trip" and press Enter (create new type)
   - **Start Time:** 07:00
   - **End Time:** 08:30
   - **Active:** Checked
4. Click "Add Route Management" button

### Step 3: Check Console Output

Look for these logs in the console:

#### When Creating Route Type:
```
Creating route type with payload: { type_name: "Upward", is_active: true }
Route type created successfully: { id: "uuid-here", type_name: "Upward", ... }
```

#### When Creating Trip Type:
```
Creating trip type with payload: { type_name: "First Trip", is_active: true }
Trip type created successfully: { id: "uuid-here", type_name: "First Trip", ... }
```

#### When Creating Route:
```
Creating route with payload: {
  route_name: "Test Route",
  starting_stop: "Stop A",
  ending_stop: "Stop B", number_of_stops: 5,
  route_type_id: "uuid-here",  ← Should be a UUID, NOT empty/undefined
  trip_type_id: "uuid-here",   ← Should be a UUID, NOT empty/undefined
  start_time: "07:00:00",
  end_time: "08:30:00",
  is_active: true
}
route_type_id: "uuid-here"     ← Should show the UUID
trip_type_id: "uuid-here"      ← Should show the UUID
Route created successfully: { ... }
```

### Step 4: Copy Console Output

Copy and paste the **entire console output** showing:
1. The route type creation
2. The trip type creation
3. The route creation payload
4. What the backend returned

---

## 🎯 What We're Looking For

### ✅ GOOD (Expected):
```
route_type_id: "abc-123-def-456"  ← Valid UUID
trip_type_id: "xyz-789-ghi-012"   ← Valid UUID
```

### ❌ BAD (Problem):
```
route_type_id: undefined          ← Field not set
route_type_id: null               ← Field is null
route_type_id: ""                 ← Empty string
```

---

## Possible Issues

### Issue 1: MasterPage Not Collecting Custom Field Values

**Symptoms:**
- Console shows: `route_type_id: undefined` or `route_type_id: ""`
- The type is created successfully
- But the route creation payload doesn't include the UUID

**Cause:**
MasterPage component might not be properly collecting values from `renderCustomField`

**Solution:**
Need to investigate how MasterPage handles custom fields and ensure it includes them in form submission

### Issue 2: onChange Not Being Called

**Symptoms:**
- Type is created
- Console shows the created type with UUID
- But onChange(newType.id) isn't setting the form value

**Cause:**
The onChange callback might not be wired correctly

**Solution:**
Check if onChange is actually updating the form state

### Issue 3: Backend Not Storing the Fields

**Symptoms:**
- Console shows correct payload with UUIDs
- Backend returns 200 OK
- But the returned route has null for route_type_id and trip_type_id

**Cause:**
Backend might be ignoring these fields or not storing them

**Solution:**
Backend developer needs to check the route creation endpoint

### Issue 4: GET /routes Not Returning the Fields

**Symptoms:**
- Route is created successfully with UUIDs
- But when fetching routes, the fields are null

**Cause:**
Backend GET endpoint might not be returning these fields

**Solution:**
Backend developer needs to check the routes list endpoint

---

## Next Steps

1. **Copy the console output** showing the route creation
2. **Share it here** so we can see what's being sent
3. **Check the Network tab:**
   - Find the POST request to `/masters/routes/`
   - Click on it
   - Go to "Payload" or "Request" tab
   - Copy the request body
4. **Check the Response:**
   - In the same request
   - Go to "Response" tab
   - Copy what the backend returned

---

## Temporary Workaround

If the issue is with MasterPage not collecting custom field values:

We may need to handle the route creation differently, possibly:
1. Create a custom form component instead of using MasterPage
2. Or modify how we integrate with MasterPage's form handling

---

**Please share the console output and we'll identify the exact issue!**
