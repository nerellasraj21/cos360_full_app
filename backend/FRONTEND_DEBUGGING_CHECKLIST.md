# Frontend Debugging Checklist - Route & Trip Types

## 🔍 Quick Diagnosis Steps

### Step 1: Check Console Network Tab

Open browser DevTools (F12) → Network tab → Try to create a route type

#### What to Look For:

**1. Request Payload:**
```json
{
  "type_name": "New Type",  // ✅ Correct
  "is_active": true
}
```

❌ **Wrong:**
```json
{
  "name": "New Type",  // ❌ Should be "type_name"
  "is_active": true
}
```

**2. Response Status:**
- **200/201** ✅ Success - Data created
- **403** ❌ Permissions issue - User needs to logout/login
- **422** ❌ Validation error - Wrong field name (`name` instead of `type_name`)
- **401** ❌ Auth issue - Token missing or invalid

**3. Response Body (if 422 error):**
```json
{
  "detail": [
    {
      "loc": ["body", "type_name"],  // ← This tells you what field is missing
      "msg": "Field required"
    }
  ]
}
```

---

### Step 2: Check Route Form Submission

When you submit a route with route_type and trip_type, check the **request payload**:

#### Expected Payload:
```json
{
  "route_name": "Route A",
  "starting_stop": "Stop 1",
  "ending_stop": "Stop 2",
  "number_of_stops": 5,
  "route_type": "Upward",      // ✅ STRING value, not UUID
  "trip_type": "First Trip",   // ✅ STRING value, not UUID
  "start_time": "08:00:00",
  "end_time": "09:00:00",
  "is_active": true
}
```

#### Check Response:
```json
{
  "id": "route-uuid-here",
  "route_name": "Route A",
  "route_type": "Upward",      // ✅ Should show the STRING value
  "trip_type": "First Trip",   // ✅ Should show the STRING value
  ...
}
```

---

### Step 3: Identify Where the Issue Is

#### Test A: Create Route Type

**Request:**
```http
POST /api/v1/masters/route-types/
{
  "type_name": "Test Type",
  "is_active": true
}
```

**Check Response:**
- ✅ If shows UUID → Backend is working correctly
- ❌ If 422 error → Frontend sending wrong field name
- ❌ If 403 error → Permission issue - logout/login needed

#### Test B: Get Dropdown

**Request:**
```http
GET /api/v1/masters/route-types/dropdown
```

**Check Response:**
```json
[
  {
    "id": "uuid-here",
    "type_name": "Upward"  // ✅ Should have both id and type_name
  }
]
```

- ✅ If shows data → Backend is working
- ❌ If empty array `[]` → Tables not created or no seed data
- ❌ If 403 error → Permissions issue

#### Test C: Create Route with Type

**Request:**
```http
POST /api/v1/masters/routes/
{
  "route_name": "Test Route",
  "route_type": "Upward",  // String value
  "trip_type": "First Trip",
  ...other fields
}
```

**Check Response:**
```json
{
  "id": "route-uuid",
  "route_type": "Upward",  // ← CHECK THIS VALUE
  "trip_type": "First Trip"
}
```

**Diagnosis:**
- ✅ **If shows "Upward"** → Backend storing/returning correctly ✅
- ✅ **If shows UUID** → Backend issue (storing UUID instead of string)
- ❌ **If shows `undefined` or `""`** → Frontend issue (MasterPage not collecting values)
- ❌ **If shows `null`** → Value not being sent from frontend

---

## 🐛 Common Frontend Issues

### Issue 1: Type Name Field

**Symptom:** 422 validation error

**Check:**
```typescript
// ❌ Wrong
const payload = {
  name: typeName,  // Should be "type_name"
  is_active: true
};

// ✅ Correct
const payload = {
  type_name: typeName,  // Must be "type_name"
  is_active: true
};
```

---

### Issue 2: Storing UUID Instead of String

**Symptom:** Route shows UUID in route_type field instead of readable text

**Check:**
```typescript
// ❌ Wrong - Storing UUID
setSelectedRouteType(response.data.id);  // Stores UUID

// ✅ Correct - Storing type_name
setSelectedRouteType(response.data.type_name);  // Stores "Upward"
```

**In Form Submission:**
```typescript
// ❌ Wrong
const routePayload = {
  route_type: routeTypeId,  // UUID
  ...
};

// ✅ Correct
const routePayload = {
  route_type: selectedRouteType,  // "Upward" string
  ...
};
```

---

### Issue 3: Not Collecting Value from Dropdown

**Symptom:** `route_type` and `trip_type` are `undefined` or empty in request

**Check:**
```typescript
// Make sure value is being captured from dropdown
const handleRouteTypeChange = (selectedOption) => {
  console.log("Selected:", selectedOption);  // Debug log
  setSelectedRouteType(selectedOption?.value || selectedOption?.type_name);
};
```

**Check State Before Submit:**
```typescript
const handleSubmit = () => {
  console.log("Route Type:", selectedRouteType);  // Should show "Upward"
  console.log("Trip Type:", selectedTripType);    // Should show "First Trip"

  // If undefined here, dropdown value not being captured
};
```

---

### Issue 4: Headers Not Sent

**Symptom:** 401 Unauthorized or 403 Forbidden

**Check:**
```typescript
// Make sure headers are included
const response = await axios.post(
  '/api/v1/masters/route-types/',
  payload,
  {
    headers: {
      'Authorization': `Bearer ${token}`,  // ← Must include
      'x-client-name': 'test_tenant',      // ← Must include
      'Content-Type': 'application/json'
    }
  }
);
```

---

## ✅ Success Checklist

### Backend Verification:

1. [ ] Run `python test_route_trip_types_endpoints.py` - All tests pass
2. [ ] Can create route type via Postman/curl
3. [ ] Can get dropdown via Postman/curl
4. [ ] Dropdown returns `[{id: "uuid", type_name: "Upward"}]` format

### Frontend Verification:

1. [ ] Network tab shows correct payload with `type_name` field
2. [ ] Network tab shows 201 Created response
3. [ ] Response includes `id` and `type_name`
4. [ ] Dropdown shows new type immediately after creation
5. [ ] Route submission includes string values (not UUIDs) for route_type/trip_type
6. [ ] After creating route, response shows readable type names (not UUIDs)

---

## 🧪 Debug Console Commands

Open browser console and run these to debug:

### Test 1: Check Token
```javascript
const token = localStorage.getItem('token');
console.log('Token:', token ? token.substring(0, 50) + '...' : 'NOT FOUND');
```

### Test 2: Decode Token
```javascript
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Role:', payload.role);
  console.log('User:', payload.email || payload.username);
}
```

### Test 3: Test API Directly
```javascript
const token = localStorage.getItem('token');

// Test create route type
fetch('http://localhost:8000/api/v1/masters/route-types/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-client-name': 'test_tenant',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type_name: 'Debug Test',
    is_active: true
  })
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

### Test 4: Test Dropdown
```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:8000/api/v1/masters/route-types/dropdown', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-client-name': 'test_tenant'
  }
})
.then(r => r.json())
.then(data => console.log('Dropdown data:', data))
.catch(err => console.error('Error:', err));
```

---

## 📊 Quick Reference: Field Names

| ❌ Wrong | ✅ Correct | Where Used |
|----------|-----------|------------|
| `name` | `type_name` | POST create route/trip type |
| `route_type_id` | `route_type` | POST create route |
| `trip_type_id` | `trip_type` | POST create route |
| UUID value | String value | Storing selected type |

---

## 🆘 Still Not Working?

### If Backend Tests Pass but Frontend Fails:

1. **Clear everything:**
   - Clear browser cache (Ctrl+Shift+Delete)
   - Logout from application
   - Close all browser tabs
   - Login again

2. **Check axios configuration:**
   - Verify base URL is correct
   - Verify interceptors are adding auth headers
   - Check if requests are being transformed

3. **Compare working vs failing:**
   - Use working endpoint (like login) as reference
   - Compare headers, payload structure
   - Check if same axios instance is used

4. **Contact Backend Developer:**
   Provide this info:
   ```
   - Request URL: [exact URL from Network tab]
   - Request Method: POST
   - Request Headers: [copy from Network tab]
   - Request Payload: [copy from Network tab]
   - Response Status: [e.g., 422]
   - Response Body: [copy from Network tab]
   - Browser: [Chrome/Firefox/etc.]
   - Console Errors: [any JavaScript errors]
   ```

---

## 📁 Reference Files

- **API Reference:** `FRONTEND_API_PAYLOAD_REFERENCE.md`
- **Backend Tests:** `test_route_trip_types_endpoints.py`
- **Permission Fixes:** `PERMISSION_TROUBLESHOOTING_GUIDE.md`
- **Quick Start:** `FIX_403_QUICK_START.md`
