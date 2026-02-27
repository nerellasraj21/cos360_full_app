# Frontend Integration Guide - Student Admission Features

**Date**: February 4, 2026
**For**: Frontend Development Team
**Backend Status**: ✅ **COMPLETE** - All APIs ready for integration
**API Base URL**: `{BASE_URL}/api/v1`
**Authentication**: Required - Include JWT token in `Authorization: Bearer {token}` header

---

## Executive Summary

Four new features have been added to the student admission system. This document provides everything you need to integrate them into the frontend.

### What's New

1. **Admission Type Selector**: Choose between Primary and Non-Primary admissions with separate number sequences
2. **Parent Salary Range**: Dropdown to capture parent income range
3. **Caste Selection**: 2-level cascading dropdown (Caste → Sub-Caste)
4. **Location Selection**: 3-level cascading dropdown (State → District → Mandal)

### What You'll Build

**For End Users (Admission Form)**:
- Add admission type selector (radio buttons or dropdown)
- Add salary range dropdown for parent information
- Implement 2-level cascading caste dropdown
- Implement 3-level cascading location dropdown
- Show preview of next admission number (optional)

**For Admins (Master Data Management)**:
- Caste CRUD screens
- Sub-Caste CRUD screens
- Location (State/District/Mandal) CRUD screens

---

## Quick Start Checklist

Before integrating:

- [ ] Review this document completely
- [ ] Test all API endpoints using Postman/Swagger
- [ ] Understand cascading dropdown pattern
- [ ] Set up error handling for validation failures
- [ ] Prepare UI components for dropdowns and forms

---

## Feature #1: Admission Type Selector

### User Story

> As an admin creating a student admission, I want to select whether this is a Primary or Non-Primary admission so that the system generates the correct admission number format.

### UI Requirements

**Form Field**:
- **Label**: "Admission Type" (required)
- **Component**: Radio buttons or Dropdown
- **Options**:
  - Primary → Value: `"primary"` → Display: "Primary Admission"
  - Non-Primary → Value: `"non_primary"` → Display: "Non-Primary Admission"
- **Default**: `"non_primary"`

**Admission Number Display** (optional enhancement):
- Show preview of next admission number based on selected type
- Update preview when admission type changes
- Example: "Next admission number will be: **P2026001**"

### API Integration

#### 1. Preview Next Admission Number (Optional)

```http
GET /api/v1/students/admission/next-admission-number?type={type}
```

**Query Parameters**:
- `type`: `"primary"` or `"non_primary"` (default: `"non_primary"`)

**Request Example**:
```javascript
const response = await fetch(
  `${API_BASE_URL}/students/admission/next-admission-number?type=primary`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const data = await response.json();
// data = {
//   "next_number": "P2026001",
//   "format": "P{YEAR}{SEQ}",
//   "type": "primary",
//   "note": "Preview only. Actual number generated during admission creation."
// }
```

#### 2. Submit Admission with Type

When submitting the admission form, include `admission_type` in the payload:

```javascript
const admissionData = {
  admission_type: "primary",  // NEW FIELD
  admission_date: "2026-02-04",
  student: {
    // ... student data
  },
  // ... rest of admission data
};

const response = await fetch(`${API_BASE_URL}/students/admission`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(admissionData)
});
```

**Response**:
```json
{
  "id": "uuid-here",
  "admission_number": "P2026001",
  "admission_type": "primary",
  "admission_date": "2026-02-04",
  "student": { ... }
}
```

### Validation Rules

- **Required**: No (defaults to `"non_primary"` if not provided)
- **Allowed values**: Only `"primary"` or `"non_primary"`
- **Invalid value error**: 422 Unprocessable Entity

### Number Formats

| Type | Format | Example |
|------|--------|---------|
| Primary | `P{YEAR}{SEQ}` | P2026001, P2026002 |
| Non-Primary | `NP{YEAR}{SEQ}` | NP2026001, NP2026002 |

**Note**: Sequences are independent. P2026001 and NP2026001 can both exist.

---

## Feature #2: Parent Salary Range

### User Story

> As an admin entering parent information during admission, I want to select the parent's salary range from predefined brackets so we can track demographic data.

### UI Requirements

**Form Field**:
- **Label**: "Parent Salary Range" (optional)
- **Component**: Dropdown/Select
- **Field Location**: In Father/Mother information section
- **Allow Empty**: Yes (field is optional)

**Display Options**:
- Use `label` for full dropdown text
- Use `display` for compact UI (tables, cards)
- Use `value` for API communication

### API Integration

#### 1. Get Salary Range Options

```http
GET /api/v1/masters/parents/salary-ranges/dropdown
```

**Request Example**:
```javascript
const response = await fetch(
  `${API_BASE_URL}/masters/parents/salary-ranges/dropdown`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const ranges = await response.json();
```

**Response**:
```json
[
  {
    "value": "below_1l",
    "label": "Below ₹1 Lakh",
    "display": "< ₹1L"
  },
  {
    "value": "1l_3l",
    "label": "₹1 - ₹3 Lakhs",
    "display": "₹1L - ₹3L"
  },
  {
    "value": "3l_5l",
    "label": "₹3 - ₹5 Lakhs",
    "display": "₹3L - ₹5L"
  },
  {
    "value": "5l_10l",
    "label": "₹5 - ₹10 Lakhs",
    "display": "₹5L - ₹10L"
  },
  {
    "value": "above_10l",
    "label": "Above ₹10 Lakhs",
    "display": "> ₹10L"
  }
]
```

#### 2. Submit Admission with Salary Range

```javascript
const admissionData = {
  student: {
    father: {
      name: "John Doe",
      salary_range: "3l_5l",  // NEW FIELD
      // ... other father data
    },
    mother: {
      name: "Jane Doe",
      salary_range: "1l_3l",  // NEW FIELD (optional)
      // ... other mother data
    }
  }
};
```

### Validation Rules

- **Required**: No (optional field)
- **Allowed values**: `below_1l`, `1l_3l`, `3l_5l`, `5l_10l`, `above_10l`
- **Invalid value error**: 422 Unprocessable Entity

### UI Example (React)

```jsx
function SalaryRangeSelector({ value, onChange }) {
  const [ranges, setRanges] = React.useState([]);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/masters/parents/salary-ranges/dropdown`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setRanges(data));
  }, []);

  return (
    <select value={value || ""} onChange={e => onChange(e.target.value)}>
      <option value="">-- Select Salary Range --</option>
      {ranges.map(range => (
        <option key={range.value} value={range.value}>
          {range.label}
        </option>
      ))}
    </select>
  );
}
```

---

## Feature #3: Caste Cascading Dropdowns

### User Story

> As an admin creating a student record, I want to select the student's caste and then select a sub-caste within that caste, so the system captures accurate caste information.

### UI Requirements

**Two-Level Cascade**:

1. **Caste Dropdown** (Level 1)
   - Label: "Caste" (optional)
   - Initially loads all castes
   - On selection → triggers sub-caste dropdown

2. **Sub-Caste Dropdown** (Level 2)
   - Label: "Sub-Caste" (optional)
   - Disabled until caste is selected
   - Loads sub-castes for selected caste only

### Workflow

```
1. User opens form
   ↓
2. Load all castes → populate Caste dropdown
   ↓
3. User selects "General"
   ↓
4. Enable Sub-Caste dropdown
   ↓
5. Load sub-castes for "General" → populate Sub-Caste dropdown
   ↓
6. User selects sub-caste
   ↓
7. Submit with caste_id and sub_caste_id
```

### API Integration

#### 1. Load Castes (Level 1)

```http
GET /api/v1/masters/castes/dropdown?active_only=true
```

**Request Example**:
```javascript
const response = await fetch(
  `${API_BASE_URL}/masters/castes/dropdown?active_only=true`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const castes = await response.json();
```

**Response**:
```json
[
  {
    "id": "caste-uuid-1",
    "name": "General",
    "code": "GEN"
  },
  {
    "id": "caste-uuid-2",
    "name": "OBC",
    "code": "OBC"
  },
  {
    "id": "caste-uuid-3",
    "name": "SC",
    "code": "SC"
  }
]
```

#### 2. Load Sub-Castes (Level 2 - Cascading)

```http
GET /api/v1/masters/castes/{caste_id}/sub-castes/dropdown?active_only=true
```

**Request Example**:
```javascript
const casteId = "caste-uuid-1"; // Selected caste ID

const response = await fetch(
  `${API_BASE_URL}/masters/castes/${casteId}/sub-castes/dropdown?active_only=true`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const subCastes = await response.json();
```

**Response**:
```json
[
  {
    "id": "sub-caste-uuid-1",
    "caste_id": "caste-uuid-1",
    "name": "Sub-Caste 1",
    "code": "SC1"
  },
  {
    "id": "sub-caste-uuid-2",
    "caste_id": "caste-uuid-1",
    "name": "Sub-Caste 2",
    "code": "SC2"
  }
]
```

#### 3. Submit Admission with Caste Data

```javascript
const admissionData = {
  student: {
    caste_id: "caste-uuid-1",        // Selected caste UUID
    sub_caste_id: "sub-caste-uuid-1" // Selected sub-caste UUID
    // ... other student data
  }
};
```

### Validation Rules

- **Caste**: Optional
- **Sub-Caste**: Optional, but must belong to selected caste
- **Invalid UUID**: 404 Not Found or 400 Bad Request

### UI Example (React)

```jsx
function CasteCascade({ casteId, subCasteId, onCasteChange, onSubCasteChange }) {
  const [castes, setCastes] = React.useState([]);
  const [subCastes, setSubCastes] = React.useState([]);

  // Load castes on mount
  React.useEffect(() => {
    fetch(`${API_BASE_URL}/masters/castes/dropdown?active_only=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setCastes(data));
  }, []);

  // Load sub-castes when caste changes
  React.useEffect(() => {
    if (casteId) {
      fetch(`${API_BASE_URL}/masters/castes/${casteId}/sub-castes/dropdown?active_only=true`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setSubCastes(data));
    } else {
      setSubCastes([]);
      onSubCasteChange(null); // Clear sub-caste when caste is cleared
    }
  }, [casteId]);

  return (
    <div>
      {/* Caste Dropdown */}
      <select
        value={casteId || ""}
        onChange={e => {
          onCasteChange(e.target.value || null);
          onSubCasteChange(null); // Clear sub-caste when caste changes
        }}
      >
        <option value="">-- Select Caste --</option>
        {castes.map(caste => (
          <option key={caste.id} value={caste.id}>
            {caste.name}
          </option>
        ))}
      </select>

      {/* Sub-Caste Dropdown */}
      <select
        value={subCasteId || ""}
        onChange={e => onSubCasteChange(e.target.value || null)}
        disabled={!casteId}
      >
        <option value="">-- Select Sub-Caste --</option>
        {subCastes.map(subCaste => (
          <option key={subCaste.id} value={subCaste.id}>
            {subCaste.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## Feature #4: Location Cascading Dropdowns

### User Story

> As an admin entering admission details, I want to select State → District → Mandal in a cascading manner so we capture accurate geographic information.

### UI Requirements

**Three-Level Cascade**:

1. **State Dropdown** (Level 1)
   - Label: "State" (optional)
   - Loads all states initially

2. **District Dropdown** (Level 2)
   - Label: "District" (optional)
   - Disabled until state is selected
   - Loads districts for selected state

3. **Mandal Dropdown** (Level 3)
   - Label: "Mandal" (optional)
   - Disabled until district is selected
   - Loads mandals for selected district

### Workflow

```
1. User opens form
   ↓
2. Load all states → populate State dropdown
   ↓
3. User selects "Andhra Pradesh"
   ↓
4. Enable District dropdown
   ↓
5. Load districts for "Andhra Pradesh" → populate District dropdown
   ↓
6. User selects "Guntur"
   ↓
7. Enable Mandal dropdown
   ↓
8. Load mandals for "Guntur" → populate Mandal dropdown
   ↓
9. User selects "Tenali"
   ↓
10. Submit with state_id, district_id, mandal_id
```

### API Integration

#### 1. Load States (Level 1)

```http
GET /api/v1/masters/locations/states/dropdown?active_only=true
```

**Request Example**:
```javascript
const response = await fetch(
  `${API_BASE_URL}/masters/locations/states/dropdown?active_only=true`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const states = await response.json();
```

**Response**:
```json
[
  {
    "id": "state-uuid-1",
    "name": "Andhra Pradesh",
    "code": "AP"
  },
  {
    "id": "state-uuid-2",
    "name": "Telangana",
    "code": "TS"
  }
]
```

#### 2. Load Districts (Level 2 - Cascading)

```http
GET /api/v1/masters/locations/states/{state_id}/districts/dropdown?active_only=true
```

**Request Example**:
```javascript
const stateId = "state-uuid-1"; // Selected state ID

const response = await fetch(
  `${API_BASE_URL}/masters/locations/states/${stateId}/districts/dropdown?active_only=true`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const districts = await response.json();
```

**Response**:
```json
[
  {
    "id": "district-uuid-1",
    "state_id": "state-uuid-1",
    "name": "Guntur",
    "code": "GTR"
  },
  {
    "id": "district-uuid-2",
    "state_id": "state-uuid-1",
    "name": "Krishna",
    "code": "KRS"
  }
]
```

#### 3. Load Mandals (Level 3 - Cascading)

```http
GET /api/v1/masters/locations/districts/{district_id}/mandals/dropdown?active_only=true
```

**Request Example**:
```javascript
const districtId = "district-uuid-1"; // Selected district ID

const response = await fetch(
  `${API_BASE_URL}/masters/locations/districts/${districtId}/mandals/dropdown?active_only=true`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const mandals = await response.json();
```

**Response**:
```json
[
  {
    "id": "mandal-uuid-1",
    "district_id": "district-uuid-1",
    "name": "Tenali"
  },
  {
    "id": "mandal-uuid-2",
    "district_id": "district-uuid-1",
    "name": "Mangalagiri"
  }
]
```

#### 4. Submit Admission with Location Data

```javascript
const admissionData = {
  state_id: "state-uuid-1",        // Selected state UUID
  district_id: "district-uuid-1",  // Selected district UUID
  mandal_id: "mandal-uuid-1"       // Selected mandal UUID
  // ... other admission data
};
```

### Validation Rules

- **State**: Optional
- **District**: Optional, but must belong to selected state
- **Mandal**: Optional, but must belong to selected district
- **Invalid UUID**: 404 Not Found or 400 Bad Request

### UI Example (React)

```jsx
function LocationCascade({
  stateId, districtId, mandalId,
  onStateChange, onDistrictChange, onMandalChange
}) {
  const [states, setStates] = React.useState([]);
  const [districts, setDistricts] = React.useState([]);
  const [mandals, setMandals] = React.useState([]);

  // Load states on mount
  React.useEffect(() => {
    fetch(`${API_BASE_URL}/masters/locations/states/dropdown?active_only=true`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStates(data));
  }, []);

  // Load districts when state changes
  React.useEffect(() => {
    if (stateId) {
      fetch(
        `${API_BASE_URL}/masters/locations/states/${stateId}/districts/dropdown?active_only=true`,
        { headers: { 'Authorization': `Bearer ${token}` }}
      )
        .then(res => res.json())
        .then(data => setDistricts(data));
    } else {
      setDistricts([]);
      setMandals([]);
      onDistrictChange(null);
      onMandalChange(null);
    }
  }, [stateId]);

  // Load mandals when district changes
  React.useEffect(() => {
    if (districtId) {
      fetch(
        `${API_BASE_URL}/masters/locations/districts/${districtId}/mandals/dropdown?active_only=true`,
        { headers: { 'Authorization': `Bearer ${token}` }}
      )
        .then(res => res.json())
        .then(data => setMandals(data));
    } else {
      setMandals([]);
      onMandalChange(null);
    }
  }, [districtId]);

  return (
    <div>
      {/* State Dropdown */}
      <select
        value={stateId || ""}
        onChange={e => {
          onStateChange(e.target.value || null);
          onDistrictChange(null); // Clear dependent fields
          onMandalChange(null);
        }}
      >
        <option value="">-- Select State --</option>
        {states.map(state => (
          <option key={state.id} value={state.id}>
            {state.name}
          </option>
        ))}
      </select>

      {/* District Dropdown */}
      <select
        value={districtId || ""}
        onChange={e => {
          onDistrictChange(e.target.value || null);
          onMandalChange(null); // Clear dependent field
        }}
        disabled={!stateId}
      >
        <option value="">-- Select District --</option>
        {districts.map(district => (
          <option key={district.id} value={district.id}>
            {district.name}
          </option>
        ))}
      </select>

      {/* Mandal Dropdown */}
      <select
        value={mandalId || ""}
        onChange={e => onMandalChange(e.target.value || null)}
        disabled={!districtId}
      >
        <option value="">-- Select Mandal --</option>
        {mandals.map(mandal => (
          <option key={mandal.id} value={mandal.id}>
            {mandal.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## Master Data Management UI (Admin Only)

### Overview

Admins need screens to populate master data for:
- Castes & Sub-Castes
- Locations (States, Districts, Mandals)

### Feature #7: Caste Management

#### Caste List Screen

**Endpoint**: `GET /api/v1/masters/castes/?skip=0&limit=20&active_only=false`

**Table Columns**:
- Name
- Code
- Status (Active/Inactive)
- Actions (Edit, Delete, View Sub-Castes)

**Actions**:
- **Create New Caste**: Opens form modal
- **Edit**: Opens edit form
- **Delete**: Confirmation dialog → `DELETE /api/v1/masters/castes/{caste_id}`
- **View Sub-Castes**: Navigate to sub-caste list for this caste

#### Caste Create/Edit Form

**Fields**:
- Name (required, text, max 100 chars)
- Code (optional, text, max 20 chars)
- Active (checkbox, default: true)

**Create**: `POST /api/v1/masters/castes/`
```json
{
  "name": "General",
  "code": "GEN",
  "is_active": true
}
```

**Update**: `PUT /api/v1/masters/castes/{caste_id}`
```json
{
  "name": "General (Updated)",
  "code": "GEN",
  "is_active": true
}
```

#### Sub-Caste List Screen

**Endpoint**: `GET /api/v1/masters/castes/{caste_id}/sub-castes?active_only=false`

**Table Columns**:
- Name
- Code
- Parent Caste (display name)
- Status (Active/Inactive)
- Actions (Edit, Delete)

#### Sub-Caste Create/Edit Form

**Fields**:
- Caste (dropdown, required, auto-filled if coming from caste screen)
- Name (required, text, max 100 chars)
- Code (optional, text, max 20 chars)
- Active (checkbox, default: true)

**Create**: `POST /api/v1/masters/castes/sub-castes`
```json
{
  "caste_id": "caste-uuid-1",
  "name": "Sub-Caste 1",
  "code": "SC1",
  "is_active": true
}
```

**Update**: `PUT /api/v1/masters/castes/sub-castes/{sub_caste_id}`
```json
{
  "name": "Sub-Caste 1 (Updated)",
  "code": "SC1",
  "is_active": true
}
```

### Feature #10: Location Management

#### State List Screen

**Endpoint**: `GET /api/v1/masters/locations/states?skip=0&limit=20&active_only=false`

**Table Columns**:
- Name
- Code
- Status (Active/Inactive)
- Actions (Edit, Delete, View Districts)

#### State Create/Edit Form

**Fields**:
- Name (required, text, max 100 chars, unique)
- Code (optional, text, max 20 chars)
- Active (checkbox, default: true)

**Create**: `POST /api/v1/masters/locations/states`
```json
{
  "name": "Andhra Pradesh",
  "code": "AP",
  "is_active": true
}
```

**Update**: `PUT /api/v1/masters/locations/states/{state_id}`

#### District List Screen

**Endpoint**: `GET /api/v1/masters/locations/states/{state_id}/districts?active_only=false`

**Table Columns**:
- Name
- Code
- Parent State
- Status
- Actions (Edit, Delete, View Mandals)

#### District Create/Edit Form

**Fields**:
- State (dropdown, required)
- Name (required, text, max 100 chars)
- Code (optional, text, max 20 chars)
- Active (checkbox, default: true)

**Create**: `POST /api/v1/masters/locations/districts`
```json
{
  "state_id": "state-uuid-1",
  "name": "Guntur",
  "code": "GTR",
  "is_active": true
}
```

#### Mandal List Screen

**Endpoint**: `GET /api/v1/masters/locations/districts/{district_id}/mandals?active_only=false`

**Table Columns**:
- Name
- Parent District
- Status
- Actions (Edit, Delete)

#### Mandal Create/Edit Form

**Fields**:
- District (dropdown, required)
- Name (required, text, max 100 chars)
- Active (checkbox, default: true)

**Create**: `POST /api/v1/masters/locations/mandals`
```json
{
  "district_id": "district-uuid-1",
  "name": "Tenali",
  "is_active": true
}
```

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized

**Cause**: Missing or invalid JWT token

```json
{
  "detail": "Not authenticated"
}
```

**Action**: Redirect to login

#### 403 Forbidden

**Cause**: User lacks required permissions

```json
{
  "detail": "Permission denied"
}
```

**Action**: Show error message "You don't have permission to perform this action"

#### 404 Not Found

**Cause**: Resource doesn't exist (e.g., invalid UUID)

```json
{
  "detail": "Caste with id abc-123 not found"
}
```

**Action**: Show error message from API

#### 422 Validation Error

**Cause**: Invalid field values

```json
{
  "detail": [
    {
      "loc": ["body", "admission_type"],
      "msg": "value is not a valid enumeration member; permitted: 'primary', 'non_primary'",
      "type": "type_error.enum"
    }
  ]
}
```

**Action**: Highlight field, show validation message

#### 400 Bad Request (Dependency Error)

**Cause**: Cannot delete resource with dependencies

```json
{
  "detail": "Cannot delete caste 'General' because it has 5 sub-caste(s). Please delete sub-castes first."
}
```

**Action**: Show error modal with message, suggest corrective action

### Validation Rules Summary

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| admission_type | No | String | "primary" or "non_primary" |
| salary_range | No | String | One of 5 predefined values |
| caste_id | No | UUID | Must exist in castes table |
| sub_caste_id | No | UUID | Must belong to selected caste |
| state_id | No | UUID | Must exist in states table |
| district_id | No | UUID | Must belong to selected state |
| mandal_id | No | UUID | Must belong to selected district |

---

## Complete Admission Form Integration

### Full Example Payload

```javascript
const admissionData = {
  // NEW FIELD #1: Admission Type
  admission_type: "primary",

  admission_date: "2026-02-04",
  academic_year_id: "academic-year-uuid",
  class_id: "class-uuid",

  // NEW FIELDS #4: Location (in admission level)
  state_id: "state-uuid-1",
  district_id: "district-uuid-1",
  mandal_id: "mandal-uuid-1",

  student: {
    // Student basic info
    first_name: "John",
    last_name: "Doe",
    date_of_birth: "2015-05-15",
    gender: "male",

    // NEW FIELDS #3: Caste (in student level)
    caste_id: "caste-uuid-1",
    sub_caste_id: "sub-caste-uuid-1",

    // Parent information
    father: {
      name: "John Doe Sr.",
      occupation: "Engineer",
      // NEW FIELD #2: Salary Range
      salary_range: "3l_5l",
      phone: "+91-9876543210"
    },
    mother: {
      name: "Jane Doe",
      occupation: "Teacher",
      // NEW FIELD #2: Salary Range
      salary_range: "1l_3l",
      phone: "+91-9876543211"
    }
  }
};

// Submit
const response = await fetch(`${API_BASE_URL}/students/admission`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(admissionData)
});

if (response.ok) {
  const admission = await response.json();
  console.log('Admission created:', admission.admission_number);
} else {
  const error = await response.json();
  console.error('Error:', error);
}
```

---

## Testing Checklist

### Feature #1: Admission Type

- [ ] Admission type selector displays both options
- [ ] Default value is "non_primary"
- [ ] Preview endpoint shows correct next number
- [ ] Preview updates when type changes
- [ ] Admission created with type="primary" gets P-format number
- [ ] Admission created with type="non_primary" gets NP-format number
- [ ] Invalid type value shows validation error

### Feature #2: Salary Range

- [ ] Dropdown loads 5 salary range options
- [ ] Field is optional (can submit without it)
- [ ] Selected value is saved correctly
- [ ] Display format shows correctly in view mode
- [ ] Invalid value shows validation error

### Feature #3: Caste Cascade

- [ ] Caste dropdown loads on page load
- [ ] Sub-caste dropdown is disabled initially
- [ ] Selecting caste enables sub-caste dropdown
- [ ] Sub-caste dropdown loads correct sub-castes
- [ ] Changing caste clears sub-caste selection
- [ ] Both IDs are submitted correctly
- [ ] Empty dropdowns work (both fields optional)

### Feature #4: Location Cascade

- [ ] State dropdown loads on page load
- [ ] District dropdown is disabled initially
- [ ] Selecting state enables district dropdown
- [ ] District dropdown loads correct districts
- [ ] Mandal dropdown is disabled initially
- [ ] Selecting district enables mandal dropdown
- [ ] Mandal dropdown loads correct mandals
- [ ] Changing state clears district and mandal
- [ ] Changing district clears mandal
- [ ] All three IDs are submitted correctly

### Master Data Management

- [ ] Can create new caste
- [ ] Can edit existing caste
- [ ] Cannot delete caste with sub-castes (error shown)
- [ ] Can view sub-castes for a caste
- [ ] Can create sub-caste for a caste
- [ ] Can create state
- [ ] Can create district for state
- [ ] Can create mandal for district
- [ ] Cannot delete state with districts (error shown)
- [ ] Active/inactive toggle works

---

## API Reference - Complete Endpoint List

### Admission Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/students/admission/next-admission-number?type={type}` | Preview next admission number | student_admissions:create |
| POST | `/students/admission` | Create admission (with new fields) | student_admissions:create |

### Parent Salary Range

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/masters/parents/salary-ranges/dropdown` | Get salary range options | Any authenticated |

### Caste Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/masters/castes/dropdown` | Get castes for dropdown | castes:read |
| GET | `/masters/castes/` | List castes (with pagination) | castes:list |
| GET | `/masters/castes/{caste_id}` | Get caste by ID | castes:read |
| POST | `/masters/castes/` | Create caste | castes:create |
| PUT | `/masters/castes/{caste_id}` | Update caste | castes:update |
| DELETE | `/masters/castes/{caste_id}` | Delete caste | castes:delete |
| GET | `/masters/castes/{caste_id}/sub-castes` | List sub-castes for caste | castes:read |
| GET | `/masters/castes/{caste_id}/sub-castes/dropdown` | Sub-castes dropdown (cascading) | castes:read |
| POST | `/masters/castes/sub-castes` | Create sub-caste | castes:create |
| GET | `/masters/castes/sub-castes/{sub_caste_id}` | Get sub-caste by ID | castes:read |
| PUT | `/masters/castes/sub-castes/{sub_caste_id}` | Update sub-caste | castes:update |
| DELETE | `/masters/castes/sub-castes/{sub_caste_id}` | Delete sub-caste | castes:delete |

### Location Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/masters/locations/states/dropdown` | Get states for dropdown | locations:read |
| GET | `/masters/locations/states` | List states (with pagination) | locations:list |
| GET | `/masters/locations/states/{state_id}` | Get state by ID | locations:read |
| POST | `/masters/locations/states` | Create state | locations:create |
| PUT | `/masters/locations/states/{state_id}` | Update state | locations:update |
| DELETE | `/masters/locations/states/{state_id}` | Delete state | locations:delete |
| GET | `/masters/locations/states/{state_id}/districts` | List districts for state | locations:read |
| GET | `/masters/locations/states/{state_id}/districts/dropdown` | Districts dropdown (cascading) | locations:read |
| POST | `/masters/locations/districts` | Create district | locations:create |
| GET | `/masters/locations/districts/{district_id}` | Get district by ID | locations:read |
| PUT | `/masters/locations/districts/{district_id}` | Update district | locations:update |
| DELETE | `/masters/locations/districts/{district_id}` | Delete district | locations:delete |
| GET | `/masters/locations/districts/{district_id}/mandals` | List mandals for district | locations:read |
| GET | `/masters/locations/districts/{district_id}/mandals/dropdown` | Mandals dropdown (cascading) | locations:read |
| POST | `/masters/locations/mandals` | Create mandal | locations:create |
| GET | `/masters/locations/mandals/{mandal_id}` | Get mandal by ID | locations:read |
| PUT | `/masters/locations/mandals/{mandal_id}` | Update mandal | locations:update |
| DELETE | `/masters/locations/mandals/{mandal_id}` | Delete mandal | locations:delete |

---

## Important Notes

### Data Population Required

**Critical**: Master data tables are currently empty. Before testing:

1. **Castes**: Admin must create castes via UI
2. **Sub-Castes**: Admin must create sub-castes for each caste
3. **States**: Admin must create states (e.g., all Indian states)
4. **Districts**: Admin must create districts for each state
5. **Mandals**: Admin must create mandals for each district

**Empty Dropdowns**: If dropdowns are empty, master data needs to be populated first.

### Caching

- Dropdown endpoints are cached for 5 minutes (300 seconds)
- After creating/updating/deleting master data, cache is invalidated
- Users may need to refresh to see latest data

### Permissions

- **Read/List/Dropdown**: Available to all authenticated users
- **Create/Update/Delete**: Admin role only

### Rate Limiting

- Create endpoints: 30 requests/minute
- Dropdown endpoints: 100 requests/minute

---

## Support & Questions

**Backend Implementation**: Complete ✅
**Database Schema**: Applied ✅
**All Endpoints**: Tested and working ✅

For technical questions or issues:
1. Check Swagger/OpenAPI documentation: `{BASE_URL}/docs`
2. Review backend handover document for implementation details
3. Contact backend team for API-specific questions

---

**END OF FRONTEND HANDOVER DOCUMENT**

*Last Updated: February 4, 2026*
