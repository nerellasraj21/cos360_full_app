# Backend-Frontend Field Name Verification

**Issue:** Route Type and Trip Type columns showing "-" in datatable
**Backend Says:** Wrong field names in frontend
**Frontend Status:** Already using `type_name` everywhere

---

## ✅ Frontend Current Configuration

### Files Already Updated to Use `type_name`:

#### 1. Type Definitions
**`src/types/masters/transportTypes.ts`:**
```typescript
export interface RouteTypeDropdown {
  id: string;
  type_name: string;  ✅ Using type_name
}

export interface TripTypeDropdown {
  id: string;
  type_name: string;  ✅ Using type_name
}
```

**`src/types/masters/route.ts`:**
```typescript
export interface Route {
  // ...
  route_type?: {
    id: string;
    type_name: string;  ✅ Using type_name
  };
  trip_type?: {
    id: string;
    type_name: string;  ✅ Using type_name
  };
}
```

#### 2. Table Rendering
**`src/pages/transport/routes.tsx` - Line 34-39:**
```typescript
render: (value: any, row: Route) => {
    if (row.route_type?.type_name) {  ✅ Using type_name
        return row.route_type.type_name;
    }
    if (!value) return <span className="text-muted-foreground">-</span>;
    const routeType = routeTypeOptions.find(rt => rt.id === value);
    return routeType?.type_name || ...;  ✅ Using type_name
}
```

**Line 42-43 (Dropdown options):**
```typescript
options={routeTypeOptions.map(rt => ({ value: rt.id, label: rt.type_name }))}
                                                            ✅ type_name
value={routeTypeOptions.map(rt => ({ value: rt.id, label: rt.type_name }))...
                                                            ✅ type_name
```

**Line 65-70 (Trip Type):**
```typescript
render: (value: any, row: Route) => {
    if (row.trip_type?.type_name) {  ✅ Using type_name
        return row.trip_type.type_name;
    }
    const tripType = tripTypeOptions.find(tt => tt.id === value);
    return tripType?.type_name || ...;  ✅ Using type_name
}
```

#### 3. Create-On-The-Fly
**Line 247 (Route Type dropdown):**
```typescript
const selectOptions = routeTypeOptions.map(rt => ({ value: rt.id, label: rt.type_name }));
                                                                          ✅ type_name
```

**Line 254 (Duplicate check):**
```typescript
if (routeTypeOptions.some(rt => rt.type_name.toLowerCase() === trimmedValue.toLowerCase())) {
                                   ✅ type_name
```

**Line 260-262 (Create payload):**
```typescript
const newType = await createRouteTypeMutation.mutateAsync({
    type_name: trimmedValue,  ✅ type_name
    is_active: true
});
```

---

## 🔍 What Backend MUST Return

### For GET /masters/route-types/dropdown:
```json
[
  {
    "id": "uuid-here",
    "type_name": "Upward"  ← MUST be "type_name", NOT "name"
  }
]
```

### For GET /masters/trip-types/dropdown:
```json
[
  {
    "id": "uuid-here",
    "type_name": "First Trip"  ← MUST be "type_name", NOT "name"
  }
]
```

### For GET /masters/routes/:
```json
[
  {
    "id": "uuid",
    "route_name": "Morning Route",
    "route_type_id": "route-type-uuid",  ← UUID reference
    "trip_type_id": "trip-type-uuid",    ← UUID reference
    // Optional populated fields (if backend joins them):
    "route_type": {
      "id": "route-type-uuid",
      "type_name": "Upward"  ← MUST be "type_name" if included
    },
    "trip_type": {
      "id": "trip-type-uuid",
      "type_name": "First Trip"  ← MUST be "type_name" if included
    }
  }
]
```

---

## 🎯 Backend Developer: Please Verify

### Check 1: Dropdown Endpoints
Run these and confirm the response format:

```bash
# Route Types Dropdown
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "cschema: test_tenant" \
     http://localhost:8000/api/v1/masters/route-types/dropdown

# Expected Response:
[{"id": "uuid", "type_name": "Upward"}]
#                ^^^^^^^^^ Must be "type_name"
```

```bash
# Trip Types Dropdown
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "cschema: test_tenant" \
     http://localhost:8000/api/v1/masters/trip-types/dropdown

# Expected Response:
[{"id": "uuid", "type_name": "First Trip"}]
#                ^^^^^^^^^ Must be "type_name"
```

### Check 2: Routes List Endpoint
```bash
# All Routes
curl -H "Authorization: Bearer YOUR_TOKEN" \
     -H "cschema: test_tenant" \
     http://localhost:8000/api/v1/masters/routes/all_routes

# Expected Response:
[
  {
    "id": "uuid",
    "route_name": "Route A",
    "route_type_id": "uuid-or-null",  ← Can be null for old routes
    "trip_type_id": "uuid-or-null",   ← Can be null for old routes
    // If you populate the relationships:
    "route_type": {"id": "uuid", "type_name": "Upward"},
    #                             ^^^^^^^^^ Must be "type_name"
    "trip_type": {"id": "uuid", "type_name": "First Trip"}
    #                            ^^^^^^^^^ Must be "type_name"
  }
]
```

---

## 🔧 If Backend Is Using Different Field Names

### If Backend Sends `name` instead of `type_name`:

**Backend Pydantic Models Must Use:**
```python
class RouteTypeDropdown(BaseModel):
    id: UUID
    type_name: str  # NOT "name"

class TripTypeDropdown(BaseModel):
    id: UUID
    type_name: str  # NOT "name"

class RouteTypeNested(BaseModel):  # For populated fields
    id: UUID
    type_name: str  # NOT "name"

class TripTypeNested(BaseModel):  # For populated fields
    id: UUID
    type_name: str  # NOT "name"
```

### Database Column Name:
The database column can be named anything (e.g., `name`, `route_type_name`, etc.), but the **Pydantic serialization** must output `type_name`.

**Example SQLAlchemy Model:**
```python
class RouteType(Base):
    __tablename__ = "route_types"

    id = Column(UUID, primary_key=True)
    name = Column(String)  # Database column can be "name"
    # ...

    @property
    def type_name(self):
        return self.name  # Expose as "type_name" in API
```

**Or use alias in Pydantic:**
```python
class RouteTypeDropdown(BaseModel):
    id: UUID
    type_name: str = Field(alias="name")  # Database sends "name", API returns "type_name"

    class Config:
        populate_by_name = True
        from_attributes = True
```

---

## 🧪 Frontend Developer: Test API Responses

Open browser console and run:

```javascript
// Test Route Types Dropdown
fetch('http://localhost:8000/api/v1/masters/route-types/dropdown', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'cschema': 'test_tenant'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Route Types Response:', data);
  console.log('First item keys:', Object.keys(data[0] || {}));
  // Should show: ["id", "type_name"]
  // NOT: ["id", "name"]
});

// Test Trip Types Dropdown
fetch('http://localhost:8000/api/v1/masters/trip-types/dropdown', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'cschema': 'test_tenant'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Trip Types Response:', data);
  console.log('First item keys:', Object.keys(data[0] || {}));
});

// Test Routes List
fetch('http://localhost:8000/api/v1/masters/routes/all_routes', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'cschema': 'test_tenant'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Routes Response:', data);
  if (data[0]?.route_type) {
    console.log('route_type keys:', Object.keys(data[0].route_type));
    // Should show: ["id", "type_name"]
  }
  if (data[0]?.trip_type) {
    console.log('trip_type keys:', Object.keys(data[0].trip_type));
    // Should show: ["id", "type_name"]
  }
});
```

---

## 📊 Summary

| Component | Field Name | Status |
|-----------|-----------|--------|
| Frontend Types | `type_name` | ✅ Correct |
| Frontend Rendering | `type_name` | ✅ Correct |
| Frontend Dropdowns | `type_name` | ✅ Correct |
| Frontend Create Payload | `type_name` | ✅ Correct |
| Backend Response | `???` | ❓ **NEED TO VERIFY** |

---

## 🎯 Action Items

### For Backend Developer:
1. ✅ Verify dropdown endpoints return `type_name` field
2. ✅ Verify routes endpoint returns `route_type.type_name` if populated
3. ✅ Update Pydantic models if currently using `name` instead of `type_name`
4. ✅ Test endpoints with curl or Postman

### For Frontend Developer:
1. ✅ Run the JavaScript test in console
2. ✅ Copy the console output showing field names
3. ✅ Share the actual API response format
4. ✅ Verify Network tab shows `type_name` in responses

---

**Next Step:** Backend developer should share the actual API response from the dropdown endpoints to confirm field names match.
