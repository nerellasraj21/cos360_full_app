# Frontend Integration Guide - Dynamic Route & Trip Types

## Quick Start Verification

### Option 1: Using Python Script (Recommended)
```bash
# Install httpx if you haven't
pip install httpx

# Run the verification script
python verify_dynamic_route_trip_types.py
```

This will automatically:
- ✅ Check if seeded data exists
- ✅ Test dropdown endpoints
- ✅ Test route creation with new UUID structure
- ✅ Create sample custom types

### Option 2: Using SQL Script
```bash
# Connect to your database and run
psql -U your_user -d your_database -f verify_types_db.sql
```

### Option 3: Manual API Testing

#### 1. Verify Seeded Data

**Get Route Types:**
```bash
GET /masters/route-types/all
```

**Expected Response:**
```json
[
  {
    "id": "uuid-here",
    "type_name": "Upward",
    "description": "Upward route direction",
    "is_active": true,
    "created_at": "2024-02-12T10:00:00Z",
    "updated_at": "2024-02-12T10:00:00Z"
  },
  {
    "id": "uuid-here",
    "type_name": "Downward",
    "description": "Downward route direction",
    "is_active": true,
    "created_at": "2024-02-12T10:00:00Z",
    "updated_at": "2024-02-12T10:00:00Z"
  }
]
```

**Get Trip Types:**
```bash
GET /masters/trip-types/all
```

**Expected Response:**
```json
[
  {
    "id": "uuid-here",
    "type_name": "First Trip",
    "description": "First trip of the day",
    "is_active": true,
    "created_at": "2024-02-12T10:00:00Z",
    "updated_at": "2024-02-12T10:00:00Z"
  },
  {
    "id": "uuid-here",
    "type_name": "Second Trip",
    "description": "Second trip of the day",
    "is_active": true,
    "created_at": "2024-02-12T10:00:00Z",
    "updated_at": "2024-02-12T10:00:00Z"
  }
]
```

#### 2. Test Dropdown Endpoints

**Route Types Dropdown:**
```bash
GET /masters/route-types/dropdown?active_only=true
```

**Expected Response:**
```json
[
  {
    "id": "uuid-here",
    "type_name": "Downward"
  },
  {
    "id": "uuid-here",
    "type_name": "Upward"
  }
]
```

**Trip Types Dropdown:**
```bash
GET /masters/trip-types/dropdown?active_only=true
```

**Expected Response:**
```json
[
  {
    "id": "uuid-here",
    "type_name": "First Trip"
  },
  {
    "id": "uuid-here",
    "type_name": "Second Trip"
  }
]
```

#### 3. Test Route Creation with UUID Structure

**Create Route:**
```bash
POST /masters/routes/

{
  "route_name": "Test Route",
  "starting_stop": "Main Gate",
  "ending_stop": "North Campus",
  "number_of_stops": 5,
  "route_type_id": "uuid-from-dropdown",  ← Changed from string
  "trip_type_id": "uuid-from-dropdown",   ← Changed from string
  "start_time": "08:00:00",
  "end_time": "09:00:00",
  "is_active": true
}
```

**Expected Response:**
```json
{
  "id": "route-uuid",
  "route_name": "Test Route",
  "starting_stop": "Main Gate",
  "ending_stop": "North Campus",
  "number_of_stops": 5,
  "route_type_id": "uuid-here",
  "trip_type_id": "uuid-here",
  "start_time": "08:00:00",
  "end_time": "09:00:00",
  "is_active": true,
  "route_type_rel": {        ← Nested relationship data
    "id": "uuid-here",
    "type_name": "Upward"
  },
  "trip_type_rel": {         ← Nested relationship data
    "id": "uuid-here",
    "type_name": "First Trip"
  }
}
```

## Frontend Changes Required

### 1. Update Route Form Component

**OLD CODE (String-based):**
```javascript
const routeForm = {
  route_name: "",
  starting_stop: "",
  ending_stop: "",
  number_of_stops: 0,
  route_type: "Upward",      // ❌ String
  trip_type: "First Trip",   // ❌ String
  start_time: "08:00:00",
  end_time: "09:00:00",
  is_active: true
}
```

**NEW CODE (UUID-based):**
```javascript
const routeForm = {
  route_name: "",
  starting_stop: "",
  ending_stop: "",
  number_of_stops: 0,
  route_type_id: null,  // ✅ UUID from dropdown
  trip_type_id: null,   // ✅ UUID from dropdown
  start_time: "08:00:00",
  end_time: "09:00:00",
  is_active: true
}
```

### 2. Fetch Dropdown Options

**Add these API calls on component mount:**
```javascript
// Fetch route types
const fetchRouteTypes = async () => {
  const response = await fetch('/masters/route-types/dropdown?active_only=true');
  const routeTypes = await response.json();
  setRouteTypes(routeTypes);
}

// Fetch trip types
const fetchTripTypes = async () => {
  const response = await fetch('/masters/trip-types/dropdown?active_only=true');
  const tripTypes = await response.json();
  setTripTypes(tripTypes);
}

useEffect(() => {
  fetchRouteTypes();
  fetchTripTypes();
}, []);
```

### 3. Update Form Select Inputs

**OLD (Hardcoded options):**
```jsx
<select name="route_type">
  <option value="Upward">Upward</option>
  <option value="Downward">Downward</option>
</select>
```

**NEW (Dynamic from API):**
```jsx
<select
  name="route_type_id"
  value={routeForm.route_type_id}
  onChange={(e) => setRouteForm({...routeForm, route_type_id: e.target.value})}
>
  <option value="">Select Route Type</option>
  {routeTypes.map(type => (
    <option key={type.id} value={type.id}>
      {type.type_name}
    </option>
  ))}
</select>

<select
  name="trip_type_id"
  value={routeForm.trip_type_id}
  onChange={(e) => setRouteForm({...routeForm, trip_type_id: e.target.value})}
>
  <option value="">Select Trip Type</option>
  {tripTypes.map(type => (
    <option key={type.id} value={type.id}>
      {type.type_name}
    </option>
  ))}
</select>
```

### 4. Display Route Type Names in Table/List

**When displaying routes, use the nested relationship:**
```jsx
// OLD
<td>{route.route_type}</td>

// NEW
<td>{route.route_type_rel?.type_name || 'N/A'}</td>
<td>{route.trip_type_rel?.type_name || 'N/A'}</td>
```

### 5. Update Route Edit Form

**When editing, pre-populate with UUIDs:**
```javascript
const loadRouteForEdit = async (routeId) => {
  const response = await fetch(`/masters/routes/routeid/${routeId}`);
  const route = await response.json();

  setRouteForm({
    route_name: route.route_name,
    starting_stop: route.starting_stop,
    ending_stop: route.ending_stop,
    number_of_stops: route.number_of_stops,
    route_type_id: route.route_type_id,  // ✅ UUID
    trip_type_id: route.trip_type_id,    // ✅ UUID
    start_time: route.start_time,
    end_time: route.end_time,
    is_active: route.is_active
  });
}
```

## Optional: Add Custom Type Management

You can also add UI for managing custom route and trip types:

```jsx
// Add New Route Type
const createRouteType = async (typeName, description) => {
  await fetch('/masters/route-types/', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      type_name: typeName,
      description: description,
      is_active: true
    })
  });
  // Refresh dropdown
  fetchRouteTypes();
}
```

## Troubleshooting

### Issue: Dropdowns are empty
**Solution:**
1. Run migration: `alembic upgrade head`
2. Verify seeded data using verification script
3. Check API permissions

### Issue: Getting 400/422 errors when creating routes
**Solution:**
1. Ensure you're sending UUIDs, not strings
2. Check that UUIDs exist in the database
3. Validate the request payload structure

### Issue: route_type_rel is null in response
**Solution:**
1. Ensure route has `route_type_id` set
2. Check foreign key relationships exist
3. Verify the route type exists and is active

## Complete React Example

```jsx
import { useState, useEffect } from 'react';

function RouteForm() {
  const [routeTypes, setRouteTypes] = useState([]);
  const [tripTypes, setTripTypes] = useState([]);
  const [formData, setFormData] = useState({
    route_name: '',
    starting_stop: '',
    ending_stop: '',
    number_of_stops: 0,
    route_type_id: '',
    trip_type_id: '',
    start_time: '08:00:00',
    end_time: '09:00:00',
    is_active: true
  });

  useEffect(() => {
    // Fetch route types
    fetch('/masters/route-types/dropdown?active_only=true')
      .then(res => res.json())
      .then(data => setRouteTypes(data));

    // Fetch trip types
    fetch('/masters/trip-types/dropdown?active_only=true')
      .then(res => res.json())
      .then(data => setTripTypes(data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/masters/routes/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Route created:', result);
      // Handle success
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}

      <select
        value={formData.route_type_id}
        onChange={(e) => setFormData({...formData, route_type_id: e.target.value})}
        required
      >
        <option value="">Select Route Type</option>
        {routeTypes.map(type => (
          <option key={type.id} value={type.id}>{type.type_name}</option>
        ))}
      </select>

      <select
        value={formData.trip_type_id}
        onChange={(e) => setFormData({...formData, trip_type_id: e.target.value})}
        required
      >
        <option value="">Select Trip Type</option>
        {tripTypes.map(type => (
          <option key={type.id} value={type.id}>{type.type_name}</option>
        ))}
      </select>

      <button type="submit">Create Route</button>
    </form>
  );
}
```

## Summary Checklist

- [ ] Run database migration
- [ ] Verify seeded data exists (run verification script)
- [ ] Update form field names (`route_type` → `route_type_id`)
- [ ] Fetch dropdown data from new endpoints
- [ ] Update select inputs to use dynamic data
- [ ] Update display logic to use `route_type_rel.type_name`
- [ ] Test route creation with new structure
- [ ] Test route editing
- [ ] Test dropdown caching (should be fast on repeated loads)
- [ ] Optional: Add UI for managing custom types

## Support
For issues, refer to:
- Main documentation: `docs/04-modules/transport/DYNAMIC_ROUTE_TRIP_TYPES.md`
- Verification script: `verify_dynamic_route_trip_types.py`
- SQL verification: `verify_types_db.sql`
