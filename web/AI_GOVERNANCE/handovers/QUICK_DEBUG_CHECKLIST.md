# Quick Debug Checklist - Unable to Add Dynamic Data

**Issue:** Cannot add dynamic route/trip types
**Date:** 2026-02-13

---

## Step 1: Did You Logout and Login?

**CRITICAL:** The backend added permissions, but your current session still has the old permissions cached in the JWT token.

**Action Required:**
1. Click **Logout** button in the app
2. Login again with your credentials
3. This refreshes your JWT token with new permissions

**Without this step, you'll still get 403 Forbidden errors!**

---

## Step 2: Check Browser Console (F12)

Open DevTools Console and look for errors:

### ❌ If You See 403 Errors:
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
GET /api/v1/masters/route-types/dropdown → 403
```

**Solution:** You didn't logout/login yet. See Step 1.

### ❌ If You See 422 Errors:
```
Validation Error: body.type_name: field required
```

**Solution:** Field name mismatch (but we already fixed this). Try hard refresh: `Ctrl + Shift + R`

### ❌ If You See 401 Errors:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
```

**Solution:** Your token expired. Logout and login again.

### ❌ If You See No Errors:
**The issue might be with the UI. Continue to Step 3.**

---

## Step 3: Check Network Tab

Open DevTools → Network Tab:

1. **Filter by:** Fetch/XHR
2. **Navigate to:** http://localhost:5173/transport/routes
3. **Click:** "Add Route Management" button

### Look for these requests:

✅ **Should succeed:**
```
GET /api/v1/masters/route-types/dropdown → 200 OK
Response: [{ id: "uuid", type_name: "..." }, ...]
```

```
GET /api/v1/masters/trip-types/dropdown → 200 OK
Response: [{ id: "uuid", type_name: "..." }, ...]
```

❌ **If they fail (403/401):**
- You need to logout/login to refresh permissions

---

## Step 4: Test Dropdown Loading

After clicking "Add Route Management":

### ✅ Expected Behavior:
- Route Type dropdown shows a text input
- Trip Type dropdown shows a text input
- You can click and type in them
- Placeholder text: "Select or type to create..."

### ❌ If Dropdowns Don't Show:
- Check console for React errors
- Try hard refresh: `Ctrl + Shift + R`

### ❌ If Dropdowns Show But Are Empty:
- Check Network tab - did the dropdown endpoints return 200 OK?
- Check the Response - does it have data?

---

## Step 5: Test Create-On-The-Fly

1. Click in the **Route Type** dropdown
2. Type: `Upward`
3. You should see: **"Create 'Upward'"** option appear
4. Press **Enter** or click the create option

### ✅ Expected Behavior:
```
Console Output:
Creating route type with payload: { type_name: "Upward", is_active: true }
Route type created successfully: { id: "uuid-here", type_name: "Upward", ... }
```

**Toast Notification:**
"Route type 'Upward' created successfully"

**Dropdown Updates:**
- "Upward" appears in the dropdown
- "Upward" is auto-selected

### ❌ If Nothing Happens When You Type:
- The CreatableSelect might not be rendering
- Check React console errors
- Try hard refresh

### ❌ If You See "Create" Option But Clicking Does Nothing:
- Check console for errors
- Check Network tab for failed POST request
- Look for the API error details

### ❌ If Create Fails with Error:
- Copy the exact error message from console
- Copy the Network tab Response
- Share both for debugging

---

## Step 6: Verify Field Name

The payload being sent should use `type_name` (not `name`).

**Check Console Log:**
```
Creating route type with payload: { type_name: "Upward", is_active: true }
                                      ^^^^^^^^^ Should be "type_name"
```

**If it shows `name` instead of `type_name`:**
- Hard refresh the page: `Ctrl + Shift + R`
- If still wrong, the code didn't compile properly

---

## Common Issues and Solutions

### Issue 1: "Still Getting 403 Errors"
**Cause:** Didn't logout/login to refresh JWT token
**Solution:**
1. Click Logout
2. Login again
3. Navigate back to /transport/routes

### Issue 2: "Dropdowns Are Empty"
**Cause:** API endpoints returning no data or failing
**Solution:**
1. Check Network tab - are endpoints returning 200 OK?
2. Check Response data - is it an empty array `[]` or an error?
3. If empty array → Backend has no initial data (this is OK, you can create new ones)
4. If error → Check error message

### Issue 3: "Can Type But Create Option Doesn't Appear"
**Cause:** Not using CreatableSelect component
**Solution:**
- Hard refresh: `Ctrl + Shift + R`
- If still not working, check console for React errors

### Issue 4: "Create Option Appears But Clicking Does Nothing"
**Cause:**
- onCreateOption handler not firing
- Mutation failing silently
**Solution:**
- Check console for errors
- Check Network tab for POST request
- Look for toast error messages

### Issue 5: "Getting Validation Error: type_name Required"
**Cause:** Frontend sending wrong field name
**Solution:**
- Hard refresh: `Ctrl + Shift + R`
- Clear browser cache
- Check console log shows `type_name` in payload

---

## Quick Test Script

**Follow these exact steps:**

1. ✅ **Logout** from the app
2. ✅ **Login** again
3. ✅ Open **DevTools** (F12)
4. ✅ Go to **Console** tab
5. ✅ Navigate to: http://localhost:5173/transport/routes
6. ✅ Click: "Add Route Management"
7. ✅ Check Network tab:
   - Should see 2 GET requests to dropdown endpoints
   - Both should return 200 OK
   - Both should have data in Response
8. ✅ Click in Route Type dropdown
9. ✅ Type: `TestType123`
10. ✅ Should see: "Create 'TestType123'" option
11. ✅ Press Enter
12. ✅ Check Console:
    - Should log: "Creating route type with payload: { type_name: 'TestType123', is_active: true }"
    - Should log: "Route type created successfully: { ... }"
13. ✅ Should see toast: "Route type 'TestType123' created successfully"
14. ✅ Dropdown should now show "TestType123" as selected

---

## What to Share If Still Not Working

Please provide:

1. **Console Output** (F12 → Console tab)
   - Copy any errors (red text)
   - Copy the "Creating route type with payload:" log
   - Copy any other relevant logs

2. **Network Tab** (F12 → Network tab)
   - Filter by Fetch/XHR
   - Find the failed request
   - Click on it
   - Go to Response tab
   - Copy the response data

3. **Screenshots**
   - The Route Type dropdown (showing what you see)
   - The console errors (if any)
   - The Network tab (showing failed requests)

4. **Specific Behavior**
   - What exact steps did you take?
   - What did you expect to happen?
   - What actually happened?
   - Did you logout/login first?

---

## Expected Flow (When Working)

1. User logs in ✅
2. Navigate to /transport/routes ✅
3. Click "Add Route Management" ✅
4. Dropdowns load with existing types (or empty if none exist) ✅
5. User types "Upward" in Route Type dropdown ✅
6. "Create 'Upward'" option appears ✅
7. User presses Enter ✅
8. Console logs payload: `{ type_name: "Upward", is_active: true }` ✅
9. Backend creates type and returns UUID ✅
10. Console logs success ✅
11. Toast shows "Route type 'Upward' created successfully" ✅
12. Dropdown updates with "Upward" as an option ✅
13. "Upward" is auto-selected ✅
14. User can continue filling other fields ✅
15. User clicks "Add Route Management" button ✅
16. Complete route is created with UUID references ✅

---

**Start with Step 1 (Logout/Login) - This fixes 90% of permission issues!**
