# Dropdown Endpoints - Testing Guide

**For**: Frontend & QA Teams
**Date**: 2026-02-04

---

## 🧪 Testing Setup

### Prerequisites
1. Backend server running at `http://localhost:8000`
2. Valid authentication token
3. Tenant ID (if multi-tenant)

### Get Authentication Token
```bash
# Login to get token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -d '{
    "username": "your_email@example.com",
    "password": "your_password"
  }'

# Response will contain access_token
# Copy the access_token value for use in subsequent requests
```

---

## 📝 Test Cases

### 1. Admission Type Dropdown

**Test**: Fetch all admission types

```bash
curl -X GET "http://localhost:8000/api/v1/students/admission/admission-types/dropdown" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Expected Response**:
```json
[
  { "value": "primary", "label": "Primary Admission" },
  { "value": "non_primary", "label": "Non-Primary Admission" }
]
```

**Status Code**: `200 OK`

---

### 2. Salary Range Dropdown

**Test**: Fetch all salary ranges

```bash
curl -X GET "http://localhost:8000/api/v1/parents/salary-ranges/dropdown" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Expected Response**:
```json
[
  { "value": "below_1l", "label": "Below ₹1 Lakh", "display": "< ₹1L" },
  { "value": "1l_3l", "label": "₹1 - ₹3 Lakhs", "display": "₹1L - ₹3L" },
  { "value": "3l_5l", "label": "₹3 - ₹5 Lakhs", "display": "₹3L - ₹5L" },
  { "value": "5l_10l", "label": "₹5 - ₹10 Lakhs", "display": "₹5L - ₹10L" },
  { "value": "above_10l", "label": "Above ₹10 Lakhs", "display": "> ₹10L" }
]
```

**Status Code**: `200 OK`

---

### 3. State Dropdown

**Test**: Fetch all states

```bash
curl -X GET "http://localhost:8000/api/v1/masters/locations/states/dropdown?active_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Expected Response**:
```json
[
  { "id": "uuid-1", "name": "Andhra Pradesh" },
  { "id": "uuid-2", "name": "Telangana" },
  { "id": "uuid-3", "name": "Karnataka" },
  { "id": "uuid-4", "name": "Tamil Nadu" },
  { "id": "uuid-5", "name": "Maharashtra" }
]
```

**Status Code**: `200 OK`

---

### 4. District Dropdown (Cascading)

**Test**: Fetch districts for a specific state

```bash
# Replace {state_id} with actual UUID from state dropdown
curl -X GET "http://localhost:8000/api/v1/masters/locations/states/{state_id}/districts/dropdown?active_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Example for Telangana**:
```json
[
  { "id": "uuid-1", "name": "Hyderabad" },
  { "id": "uuid-2", "name": "Rangareddy" },
  { "id": "uuid-3", "name": "Warangal" },
  { "id": "uuid-4", "name": "Nizamabad" },
  { "id": "uuid-5", "name": "Karimnagar" }
]
```

**Status Code**: `200 OK`

---

### 5. Mandal Dropdown (Cascading)

**Test**: Fetch mandals for a specific district

```bash
# Replace {district_id} with actual UUID from district dropdown
curl -X GET "http://localhost:8000/api/v1/masters/locations/districts/{district_id}/mandals/dropdown?active_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Example for Hyderabad**:
```json
[
  { "id": "uuid-1", "name": "Hyderabad Urban" },
  { "id": "uuid-2", "name": "Secunderabad" },
  { "id": "uuid-3", "name": "Kukatpally" },
  { "id": "uuid-4", "name": "LB Nagar" }
]
```

**Status Code**: `200 OK`

---

### 6. Caste Dropdown

**Test**: Fetch all castes

```bash
curl -X GET "http://localhost:8000/api/v1/masters/castes/dropdown?active_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Expected Response** (after seeding):
```json
[
  { "id": "uuid-1", "name": "General" },
  { "id": "uuid-2", "name": "OBC" },
  { "id": "uuid-3", "name": "SC" },
  { "id": "uuid-4", "name": "ST" },
  { "id": "uuid-5", "name": "EWS" }
]
```

**Status Code**: `200 OK`

**Note**: If empty, run the caste seeding endpoint first (see below)

---

### 7. Sub-Caste Dropdown (Cascading)

**Test**: Fetch sub-castes for a specific caste

```bash
# Replace {caste_id} with actual UUID from caste dropdown
curl -X GET "http://localhost:8000/api/v1/masters/castes/{caste_id}/sub-castes/dropdown?active_only=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Example for OBC**:
```json
[
  { "id": "uuid-1", "name": "OBC-A" },
  { "id": "uuid-2", "name": "OBC-B" },
  { "id": "uuid-3", "name": "OBC-C" },
  { "id": "uuid-4", "name": "OBC-D" }
]
```

**Status Code**: `200 OK`

---

## 🌱 Seed Data Endpoints

### Seed Location Data (PUBLIC - No Auth Required)

**Test**: Seed states, districts, and mandals

```bash
curl -X POST "http://localhost:8000/api/v1/auth/seed/location-data" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "message": "Location data seeded successfully",
  "details": {
    "states_created": ["Andhra Pradesh", "Telangana", "Karnataka", "Tamil Nadu", "Maharashtra"],
    "districts_created": ["...16 districts..."],
    "mandals_created": ["...64 mandals..."],
    "total_states": 5,
    "total_districts": 16,
    "total_mandals": 64
  }
}
```

**Status Code**: `201 Created`

---

### Seed Caste Data (Admin Only - Auth Required)

**Test**: Seed castes and sub-castes

```bash
curl -X POST "http://localhost:8000/api/v1/auth/seed/caste-data" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "message": "Caste data seeded successfully",
  "details": {
    "castes_created": ["General", "OBC", "SC", "ST", "EWS"],
    "sub_castes_created": ["General -> General", "OBC -> OBC-A", "..."],
    "total_castes": 5,
    "total_sub_castes": 19
  }
}
```

**Status Code**: `201 Created`

---

## ❌ Error Scenarios to Test

### 1. Unauthorized Access (401)

```bash
# Test without token
curl -X GET "http://localhost:8000/api/v1/masters/castes/dropdown"
```

**Expected Response**:
```json
{ "detail": "Not authenticated" }
```

**Status Code**: `401 Unauthorized`

---

### 2. Invalid Parent ID (404)

```bash
# Test with non-existent state_id
curl -X GET "http://localhost:8000/api/v1/masters/locations/states/00000000-0000-0000-0000-000000000000/districts/dropdown" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{ "detail": "State not found" }
```

**Status Code**: `404 Not Found`

---

### 3. Forbidden Access (403)

```bash
# Test caste seeding with non-admin user
curl -X POST "http://localhost:8000/api/v1/auth/seed/caste-data" \
  -H "Authorization: Bearer NON_ADMIN_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

**Expected Response**:
```json
{ "detail": "Only administrators can seed data" }
```

**Status Code**: `403 Forbidden`

---

## 🧪 Postman/Thunder Client Collection

You can import these as a collection:

**Collection Variables:**
- `base_url`: `http://localhost:8000`
- `token`: `{{your_auth_token}}`
- `tenant_id`: `{{your_tenant_id}}`
- `state_id`: `{{uuid_from_state}}`
- `district_id`: `{{uuid_from_district}}`
- `caste_id`: `{{uuid_from_caste}}`

**Requests:**
1. Login → Save token to `{{token}}`
2. Get States → Save first state id to `{{state_id}}`
3. Get Districts (use `{{state_id}}`) → Save first district id to `{{district_id}}`
4. Get Mandals (use `{{district_id}}`)
5. Get Castes → Save first caste id to `{{caste_id}}`
6. Get Sub-Castes (use `{{caste_id}}`)
7. Get Admission Types
8. Get Salary Ranges

---

## ✅ Test Checklist

### Functional Tests
- [ ] All simple dropdowns return data
- [ ] Cascading dropdowns work with valid parent IDs
- [ ] 401 error when no auth token
- [ ] 404 error when invalid parent ID
- [ ] 403 error when non-admin tries to seed
- [ ] Seeding endpoints create data successfully
- [ ] Empty array returned when no data (not error)
- [ ] Query parameter `active_only=false` returns inactive items

### Performance Tests
- [ ] Response time < 500ms for all endpoints
- [ ] Concurrent requests handled correctly
- [ ] Rate limiting works (100 req/min)

### Integration Tests
- [ ] State → District → Mandal chain works
- [ ] Caste → Sub-Caste chain works
- [ ] Changing parent updates children correctly

---

## 📊 Test Data Summary

### Available After Seeding

| Data Type | Count | Examples |
|-----------|-------|----------|
| States | 5 | Andhra Pradesh, Telangana, Karnataka |
| Districts | 16 | Hyderabad, Bangalore, Mumbai |
| Mandals | 64 | Hyderabad Urban, Secunderabad |
| Castes | 5 | General, OBC, SC, ST, EWS |
| Sub-Castes | 19 | OBC-A, Mala, Madiga, Chenchu |
| Salary Ranges | 5 | Below 1L, 1L-3L, 3L-5L |
| Admission Types | 2 | Primary, Non-Primary |

---

## 🐛 Debugging Tips

### Issue: Empty Response
1. Check if data is seeded
2. Verify `active_only` parameter
3. Check database directly
4. Review backend logs

### Issue: Slow Response
1. Check database indexes
2. Review network tab
3. Check server load
4. Verify query optimization

### Issue: CORS Error
1. Verify backend CORS settings
2. Check request headers
3. Use browser dev tools
4. Contact backend team

---

## 📞 Support

- **Swagger UI**: `http://localhost:8000/docs`
- **Backend Code**: `app/api/v1/masters/`, `app/api/v1/student/`
- **Handover Doc**: `AI_GOVERNANCE/handovers/DROPDOWN_IMPLEMENTATION_HANDOVER.md`

---

**Testing Tip**: Use Swagger UI at `/docs` for interactive API testing before writing frontend code!
