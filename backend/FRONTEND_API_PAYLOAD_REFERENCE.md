# Frontend API Payload Reference - Route & Trip Types

## 🚨 Common Errors & Fixes

### Error 1: 422 Validation Error
**Cause:** Wrong field name in payload
❌ **Wrong:** `{ "name": "value" }`
✅ **Correct:** `{ "type_name": "value" }`

### Error 2: 403 Forbidden
**Cause:** User needs to logout and login again after permissions were added
**Fix:**
1. Logout from application
2. Clear browser cache (Ctrl+Shift+Delete)
3. Login again
4. Try again

---

## ✅ Correct API Payloads

### Create Route Type

**Endpoint:** `POST /api/v1/masters/route-types/`

**Headers:**
```javascript
{
  "Authorization": "Bearer YOUR_TOKEN",
  "x-client-name": "test_tenant",
  "Content-Type": "application/json"
}
```

**Payload:**
```javascript
{
  "type_name": "Circular Route",     // ❗ MUST be "type_name", NOT "name"
  "description": "Route in a circle", // Optional
  "is_active": true                   // Optional, defaults to true
}
```

**Response (201 Created):**
```json
{
  "id": "c9bd1cdd-8caf-4305-8d2f-7a5c66784f5a",
  "type_name": "Circular Route",
  "description": "Route in a circle",
  "is_active": true,
  "created_at": "2026-02-13T04:21:31.837552+00:00",
  "updated_at": "2026-02-13T04:21:31.837552+00:00"
}
```

---

### Create Trip Type

**Endpoint:** `POST /api/v1/masters/trip-types/`

**Headers:** Same as above

**Payload:**
```javascript
{
  "type_name": "Third Trip",          // ❗ MUST be "type_name", NOT "name"
  "description": "Third trip of day", // Optional
  "is_active": true                   // Optional, defaults to true
}
```

**Response:** Same structure as Route Type

---

### Get Dropdown Options

**Route Types Endpoint:** `GET /api/v1/masters/route-types/dropdown`
**Trip Types Endpoint:** `GET /api/v1/masters/trip-types/dropdown`

**Headers:**
```javascript
{
  "Authorization": "Bearer YOUR_TOKEN",
  "x-client-name": "test_tenant"
}
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid-1",
    "type_name": "Upward"
  },
  {
    "id": "uuid-2",
    "type_name": "Downward"
  },
  {
    "id": "uuid-3",
    "type_name": "Circular Route"
  }
]
```

**Note:** Response only includes `id` and `type_name` for dropdown efficiency

---

## React/TypeScript Examples

### TypeScript Types

```typescript
// For creating new types
interface CreateRouteType {
  type_name: string;      // ❗ Must be "type_name"
  description?: string;
  is_active?: boolean;
}

interface CreateTripType {
  type_name: string;      // ❗ Must be "type_name"
  description?: string;
  is_active?: boolean;
}

// For dropdown options
interface DropdownOption {
  id: string;
  type_name: string;
}

// Full response from create/get
interface RouteType {
  id: string;
  type_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TripType {
  id: string;
  type_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Create Route Type Function

```typescript
const createRouteType = async (typeName: string): Promise<RouteType> => {
  const response = await axios.post(
    '/api/v1/masters/route-types/',
    {
      type_name: typeName,  // ❗ MUST be "type_name"
      description: '',
      is_active: true
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-client-name': 'test_tenant',
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

### Create Trip Type Function

```typescript
const createTripType = async (typeName: string): Promise<TripType> => {
  const response = await axios.post(
    '/api/v1/masters/trip-types/',
    {
      type_name: typeName,  // ❗ MUST be "type_name"
      description: '',
      is_active: true
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-client-name': 'test_tenant',
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data;
};
```

### Fetch Dropdown Options

```typescript
const fetchRouteTypes = async (): Promise<DropdownOption[]> => {
  const response = await axios.get(
    '/api/v1/masters/route-types/dropdown',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-client-name': 'test_tenant'
      }
    }
  );

  return response.data;
};

const fetchTripTypes = async (): Promise<DropdownOption[]> => {
  const response = await axios.get(
    '/api/v1/masters/trip-types/dropdown',
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-client-name': 'test_tenant'
      }
    }
  );

  return response.data;
};
```

---

## Complete Integration Example

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface DropdownOption {
  id: string;
  type_name: string;
}

const RouteForm = () => {
  const [routeTypes, setRouteTypes] = useState<DropdownOption[]>([]);
  const [tripTypes, setTripTypes] = useState<DropdownOption[]>([]);
  const [selectedRouteType, setSelectedRouteType] = useState('');
  const [selectedTripType, setSelectedTripType] = useState('');

  // Load dropdown options on mount
  useEffect(() => {
    loadRouteTypes();
    loadTripTypes();
  }, []);

  const loadRouteTypes = async () => {
    try {
      const response = await axios.get('/api/v1/masters/route-types/dropdown', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-client-name': 'test_tenant'
        }
      });
      setRouteTypes(response.data);
    } catch (error) {
      console.error('Error loading route types:', error);
    }
  };

  const loadTripTypes = async () => {
    try {
      const response = await axios.get('/api/v1/masters/trip-types/dropdown', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'x-client-name': 'test_tenant'
        }
      });
      setTripTypes(response.data);
    } catch (error) {
      console.error('Error loading trip types:', error);
    }
  };

  const handleCreateRouteType = async (newTypeName: string) => {
    try {
      const response = await axios.post(
        '/api/v1/masters/route-types/',
        {
          type_name: newTypeName,  // ❗ MUST be "type_name"
          description: '',
          is_active: true
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'x-client-name': 'test_tenant',
            'Content-Type': 'application/json'
          }
        }
      );

      // Add to dropdown list
      setRouteTypes([...routeTypes, {
        id: response.data.id,
        type_name: response.data.type_name
      }]);

      // Select the newly created type
      setSelectedRouteType(response.data.type_name);

      return response.data;
    } catch (error) {
      console.error('Error creating route type:', error);
      throw error;
    }
  };

  const handleCreateTripType = async (newTypeName: string) => {
    try {
      const response = await axios.post(
        '/api/v1/masters/trip-types/',
        {
          type_name: newTypeName,  // ❗ MUST be "type_name"
          description: '',
          is_active: true
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'x-client-name': 'test_tenant',
            'Content-Type': 'application/json'
          }
        }
      );

      // Add to dropdown list
      setTripTypes([...tripTypes, {
        id: response.data.id,
        type_name: response.data.type_name
      }]);

      // Select the newly created type
      setSelectedTripType(response.data.type_name);

      return response.data;
    } catch (error) {
      console.error('Error creating trip type:', error);
      throw error;
    }
  };

  return (
    <form>
      {/* Route Type Dropdown with inline creation */}
      <CreatableSelect
        options={routeTypes.map(rt => ({ value: rt.type_name, label: rt.type_name }))}
        value={{ value: selectedRouteType, label: selectedRouteType }}
        onChange={(option) => setSelectedRouteType(option?.value || '')}
        onCreateOption={handleCreateRouteType}
        placeholder="Select or create route type..."
      />

      {/* Trip Type Dropdown with inline creation */}
      <CreatableSelect
        options={tripTypes.map(tt => ({ value: tt.type_name, label: tt.type_name }))}
        value={{ value: selectedTripType, label: selectedTripType }}
        onChange={(option) => setSelectedTripType(option?.value || '')}
        onCreateOption={handleCreateTripType}
        placeholder="Select or create trip type..."
      />

      {/* Other form fields... */}
    </form>
  );
};
```

---

## Common Issues & Solutions

### Issue 1: "Field required" error for type_name
**Error:**
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "type_name"],
      "msg": "Field required"
    }
  ]
}
```

**Fix:** Change `"name"` to `"type_name"` in your payload

---

### Issue 2: 403 Forbidden after permissions added
**Error:**
```json
{
  "detail": "Permission not found in database: Admin cannot create route_types"
}
```

**Fix:**
1. Logout from application
2. Login again (this generates new token with updated permissions)
3. Try the API call again

---

### Issue 3: 401 Unauthorized
**Error:**
```json
{
  "detail": "Authorization header missing or invalid"
}
```

**Fix:** Ensure Authorization header is included:
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

### Issue 4: Dropdown returns empty array
**Response:**
```json
[]
```

**Possible causes:**
1. Tables not created - run `create_dynamic_types_tables.sql`
2. No data seeded - run the SQL script to insert default data
3. Wrong schema - ensure tables exist in `test_tenant_schema`

**Fix:** Run this SQL:
```sql
SET search_path TO test_tenant_schema, public;
SELECT * FROM route_types;
SELECT * FROM trip_types;
```

If tables don't exist, run `create_dynamic_types_tables.sql`

---

## Testing Checklist

Before integrating:

- [ ] Backend server is running (http://localhost:8000)
- [ ] Permissions added to test_tenant_schema (run `apply_permissions_to_test_tenant.sql`)
- [ ] Tables created with seed data (run `create_dynamic_types_tables.sql`)
- [ ] User logged out and back in after permissions added
- [ ] Test with curl/Postman first before frontend integration
- [ ] Verify payload uses `type_name` not `name`

---

## Need Help?

Run the automated test script:
```bash
python test_route_trip_types_endpoints.py
```

This will test all endpoints and show you exactly what's working and what's not.
