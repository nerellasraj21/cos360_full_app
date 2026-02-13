# Frontend Integration Guide - Dynamic Route & Trip Types with Inline Creation

## 🎯 Overview

This guide shows how to implement **inline creation** for route types and trip types directly from the dropdown in your route form.

### Key Features:
- ✅ **No field name changes** - Keep `route_type` and `trip_type` (strings)
- ✅ **Dynamic dropdowns** - Options fetched from master tables
- ✅ **Inline creation** - Add new types without leaving the form
- ✅ **Instant availability** - New types immediately appear in dropdown and table

## 🔧 Backend Setup

### Step 1: Run Migration

```bash
alembic upgrade head
```

This creates:
- `route_types` table with default options: "Upward", "Downward"
- `trip_types` table with default options: "First Trip", "Second Trip"

### Step 2: Verify Seeded Data

```bash
# Check route types
curl GET /masters/route-types/dropdown

# Expected response:
[
  {"id": "uuid-1", "type_name": "Upward"},
  {"id": "uuid-2", "type_name": "Downward"}
]

# Check trip types
curl GET /masters/trip-types/dropdown

# Expected response:
[
  {"id": "uuid-1", "type_name": "First Trip"},
  {"id": "uuid-2", "type_name": "Second Trip"}
]
```

## 📝 Frontend Implementation

### Complete React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function RouteFormWithInlineCreation() {
  // State for dropdown options
  const [routeTypes, setRouteTypes] = useState([]);
  const [tripTypes, setTripTypes] = useState([]);

  // State for inline creation modals
  const [showRouteTypeModal, setShowRouteTypeModal] = useState(false);
  const [showTripTypeModal, setShowTripTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDescription, setNewTypeDescription] = useState('');

  // State for route form (NO FIELD NAME CHANGES)
  const [routeForm, setRouteForm] = useState({
    route_name: '',
    starting_stop: '',
    ending_stop: '',
    number_of_stops: 0,
    route_type: '',  // ✅ String field - unchanged
    trip_type: '',   // ✅ String field - unchanged
    start_time: '08:00:00',
    end_time: '09:00:00',
    is_active: true
  });

  // Fetch dropdown options on component mount
  useEffect(() => {
    fetchRouteTypes();
    fetchTripTypes();
  }, []);

  const fetchRouteTypes = async () => {
    const response = await fetch('/masters/route-types/dropdown?active_only=true');
    const data = await response.json();
    setRouteTypes(data);
  };

  const fetchTripTypes = async () => {
    const response = await fetch('/masters/trip-types/dropdown?active_only=true');
    const data = await response.json();
    setTripTypes(data);
  };

  // Inline creation of route type
  const createRouteType = async () => {
    try {
      const response = await fetch('/masters/route-types/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_name: newTypeName,
          description: newTypeDescription,
          is_active: true
        })
      });

      if (response.ok) {
        const newType = await response.json();

        // Refresh dropdown options
        await fetchRouteTypes();

        // Auto-select the newly created type
        setRouteForm({ ...routeForm, route_type: newType.type_name });

        // Close modal and reset
        setShowRouteTypeModal(false);
        setNewTypeName('');
        setNewTypeDescription('');

        alert('Route type created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create route type'}`);
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  };

  // Inline creation of trip type
  const createTripType = async () => {
    try {
      const response = await fetch('/masters/trip-types/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_name: newTypeName,
          description: newTypeDescription,
          is_active: true
        })
      });

      if (response.ok) {
        const newType = await response.json();

        // Refresh dropdown options
        await fetchTripTypes();

        // Auto-select the newly created type
        setRouteForm({ ...routeForm, trip_type: newType.type_name });

        // Close modal and reset
        setShowTripTypeModal(false);
        setNewTypeName('');
        setNewTypeDescription('');

        alert('Trip type created successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail || 'Failed to create trip type'}`);
      }
    } catch (error) {
      alert('Network error: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch('/masters/routes/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(routeForm)
    });

    if (response.ok) {
      alert('Route created successfully!');
      // Reset form or redirect
    } else {
      const error = await response.json();
      alert('Error: ' + error.detail);
    }
  };

  return (
    <div className="route-form">
      <h2>Create Route</h2>

      <form onSubmit={handleSubmit}>
        {/* Other form fields... */}

        {/* Route Type Dropdown with Inline Creation */}
        <div className="form-group">
          <label>Route Type</label>
          <div className="input-with-button">
            <select
              value={routeForm.route_type}
              onChange={(e) => setRouteForm({ ...routeForm, route_type: e.target.value })}
              required
            >
              <option value="">Select Route Type</option>
              {routeTypes.map(type => (
                <option key={type.id} value={type.type_name}>
                  {type.type_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowRouteTypeModal(true)}
              className="add-new-btn"
            >
              + Add New
            </button>
          </div>
        </div>

        {/* Trip Type Dropdown with Inline Creation */}
        <div className="form-group">
          <label>Trip Type</label>
          <div className="input-with-button">
            <select
              value={routeForm.trip_type}
              onChange={(e) => setRouteForm({ ...routeForm, trip_type: e.target.value })}
              required
            >
              <option value="">Select Trip Type</option>
              {tripTypes.map(type => (
                <option key={type.id} value={type.type_name}>
                  {type.type_name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowTripTypeModal(true)}
              className="add-new-btn"
            >
              + Add New
            </button>
          </div>
        </div>

        {/* Other form fields... */}

        <button type="submit">Create Route</button>
      </form>

      {/* Route Type Creation Modal */}
      {showRouteTypeModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create New Route Type</h3>
            <input
              type="text"
              placeholder="Type Name (e.g., Express Route)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={createRouteType}>Create</button>
              <button onClick={() => {
                setShowRouteTypeModal(false);
                setNewTypeName('');
                setNewTypeDescription('');
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Type Creation Modal */}
      {showTripTypeModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create New Trip Type</h3>
            <input
              type="text"
              placeholder="Type Name (e.g., Evening Extra)"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={newTypeDescription}
              onChange={(e) => setNewTypeDescription(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={createTripType}>Create</button>
              <button onClick={() => {
                setShowTripTypeModal(false);
                setNewTypeName('');
                setNewTypeDescription('');
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteFormWithInlineCreation;
```

### Styling Example (CSS)

```css
.input-with-button {
  display: flex;
  gap: 8px;
}

.input-with-button select {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-new-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.add-new-btn:hover {
  background: #45a049;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content input,
.modal-content textarea {
  width: 100%;
  padding: 8px;
  margin: 8px 0;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.modal-buttons button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons button:first-child {
  background: #4CAF50;
  color: white;
}

.modal-buttons button:last-child {
  background: #f44336;
  color: white;
}
```

## 📊 Displaying Routes in Table

### Route List Component

```jsx
function RoutesList() {
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    const response = await fetch('/masters/routes/all_routes');
    const data = await response.json();
    setRoutes(data);
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Route Name</th>
          <th>Starting Stop</th>
          <th>Ending Stop</th>
          <th>Route Type</th>
          <th>Trip Type</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {routes.map(route => (
          <tr key={route.id}>
            <td>{route.route_name}</td>
            <td>{route.starting_stop}</td>
            <td>{route.ending_stop}</td>
            <td>{route.route_type || 'N/A'}</td>  {/* ✅ Direct string value */}
            <td>{route.trip_type || 'N/A'}</td>   {/* ✅ Direct string value */}
            <td>{route.start_time}</td>
            <td>{route.end_time}</td>
            <td>
              <button onClick={() => editRoute(route.id)}>Edit</button>
              <button onClick={() => deleteRoute(route.id)}>Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## 🎨 Alternative UI Patterns

### Option 1: Select with Create Option (Dropdown with Special Option)

```jsx
<select
  value={routeForm.route_type}
  onChange={(e) => {
    if (e.target.value === '__create_new__') {
      setShowRouteTypeModal(true);
    } else {
      setRouteForm({ ...routeForm, route_type: e.target.value });
    }
  }}
>
  <option value="">Select Route Type</option>
  {routeTypes.map(type => (
    <option key={type.id} value={type.type_name}>{type.type_name}</option>
  ))}
  <option value="__create_new__">+ Create New Type...</option>
</select>
```

### Option 2: React Select with Creatable

```jsx
import CreatableSelect from 'react-select/creatable';

function RouteTypeSelect() {
  const options = routeTypes.map(type => ({
    value: type.type_name,
    label: type.type_name
  }));

  const handleCreate = async (inputValue) => {
    const response = await fetch('/masters/route-types/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type_name: inputValue,
        description: '',
        is_active: true
      })
    });

    if (response.ok) {
      await fetchRouteTypes();
      setRouteForm({ ...routeForm, route_type: inputValue });
    }
  };

  return (
    <CreatableSelect
      options={options}
      onChange={(option) => setRouteForm({ ...routeForm, route_type: option.value })}
      onCreateOption={handleCreate}
      placeholder="Select or create route type..."
    />
  );
}
```

### Option 3: Inline Input (Type to Add)

```jsx
<div className="inline-create-input">
  <input
    list="route-types"
    value={routeForm.route_type}
    onChange={(e) => setRouteForm({ ...routeForm, route_type: e.target.value })}
    placeholder="Type or select route type..."
  />
  <datalist id="route-types">
    {routeTypes.map(type => (
      <option key={type.id} value={type.type_name} />
    ))}
  </datalist>
  {routeForm.route_type && !routeTypes.some(t => t.type_name === routeForm.route_type) && (
    <button onClick={() => createNewType(routeForm.route_type)}>
      Add "{routeForm.route_type}" as new type
    </button>
  )}
</div>
```

## 🔄 API Endpoints Summary

### Route Types
- `GET /masters/route-types/dropdown` - Get all active route types
- `POST /masters/route-types/` - Create new route type
- `GET /masters/route-types/all` - Get all route types (with details)
- `PUT /masters/route-types/{id}` - Update route type
- `DELETE /masters/route-types/{id}` - Soft delete route type

### Trip Types
- `GET /masters/trip-types/dropdown` - Get all active trip types
- `POST /masters/trip-types/` - Create new trip type
- `GET /masters/trip-types/all` - Get all trip types (with details)
- `PUT /masters/trip-types/{id}` - Update trip type
- `DELETE /masters/trip-types/{id}` - Soft delete trip type

### Routes
- `POST /masters/routes/` - Create route (with `route_type` and `trip_type` strings)
- `GET /masters/routes/all_routes` - Get all routes
- `PUT /masters/routes/{id}` - Update route
- `DELETE /masters/routes/{id}` - Delete route

## ✅ Testing Checklist

- [ ] Run migration to create master tables
- [ ] Verify seeded data (Upward, Downward, First Trip, Second Trip)
- [ ] Dropdown displays default options
- [ ] Click "Add New" opens modal
- [ ] Create new route type via modal
- [ ] New route type appears in dropdown immediately
- [ ] Create route with new route type
- [ ] Route displays correctly in table with new type
- [ ] Create new trip type via modal
- [ ] New trip type appears in dropdown immediately
- [ ] Create route with new trip type
- [ ] Route displays correctly in table with new type
- [ ] Edit existing route preserves type values
- [ ] Duplicate type names are prevented (API validation)

## 🐛 Troubleshooting

### Issue: "Add New" button doesn't work
**Solution:** Check browser console for errors. Verify modal state management.

### Issue: New type doesn't appear in dropdown
**Solution:** Ensure `fetchRouteTypes()` or `fetchTripTypes()` is called after creation.

### Issue: Getting 400 error when creating type
**Solution:** Type name must be unique. Check if the name already exists.

### Issue: Route creation fails with new type
**Solution:** Verify the type_name string matches exactly what's saved in the master table.

## 📝 Summary

### What Changed:
- ✅ **NO** field name changes - Keep `route_type` and `trip_type`
- ✅ Master tables for dropdown options
- ✅ Inline creation capability
- ✅ Immediate availability of new options

### Frontend Implementation:
1. Fetch dropdown options from new endpoints
2. Display "Add New" button next to dropdowns
3. Show modal for inline creation
4. POST new type to API
5. Refresh dropdown and auto-select new option
6. Submit route with string value (not UUID)

### Benefits:
- 🎯 No breaking changes to existing forms
- 🚀 Dynamic dropdown options
- ⚡ Inline creation for better UX
- 📊 Consistent data across application
- 🔧 Easy to add custom types as needed

---

**Need help?** Check the comprehensive documentation at `docs/04-modules/transport/DYNAMIC_ROUTE_TRIP_TYPES.md`
