# Dropdown Implementation - Quick Reference Card

**For**: Frontend Developers
**Date**: 2026-02-04

---

## 📋 All Endpoints at a Glance

| Field | Type | Endpoint | Depends On |
|-------|------|----------|------------|
| **Admission Type** | Simple | `GET /api/v1/students/admission/admission-types/dropdown` | - |
| **Salary Range** | Simple | `GET /api/v1/parents/salary-ranges/dropdown` | - |
| **Caste** | Simple | `GET /api/v1/masters/castes/dropdown` | - |
| **Sub-Caste** | Cascading | `GET /api/v1/masters/castes/{caste_id}/sub-castes/dropdown` | Caste |
| **State** | Simple | `GET /api/v1/masters/locations/states/dropdown` | - |
| **District** | Cascading | `GET /api/v1/masters/locations/states/{state_id}/districts/dropdown` | State |
| **Mandal** | Cascading | `GET /api/v1/masters/locations/districts/{district_id}/mandals/dropdown` | District |

---

## 🔄 Cascading Flow

```
STATE ────→ DISTRICT ────→ MANDAL
  ↓            ↓             ↓
 Load       Load on       Load on
on page    state select  district select

CASTE ────→ SUB-CASTE
  ↓            ↓
 Load       Load on
on page    caste select
```

---

## 💾 Data Seeding Status

| Data Type | Status | Action Required |
|-----------|--------|-----------------|
| Location (States, Districts, Mandals) | ✅ Seeded | None - Ready to use |
| Castes & Sub-Castes | ⚠️ Not Seeded | Run seed endpoint once |
| Salary Ranges | ✅ Hardcoded | None - Ready to use |
| Admission Types | ✅ Hardcoded | None - Ready to use |

### To Seed Castes:
```bash
POST /api/v1/auth/seed/caste-data
Headers:
  Authorization: Bearer {admin_token}
  x-tenant-id: {tenant_id}
```

---

## 🔐 Auth Headers

All requests need:
```javascript
{
  'Authorization': 'Bearer {token}',
  'x-tenant-id': '{tenant-id}',
  'Content-Type': 'application/json'
}
```

---

## 📦 Response Format

### Standard Dropdown
```json
[
  { "id": "uuid-string", "name": "Display Name" }
]
```

### Salary Range (Special)
```json
[
  {
    "value": "below_1l",
    "label": "Below ₹1 Lakh",
    "display": "< ₹1L"
  }
]
```

### Admission Type (Special)
```json
[
  { "value": "primary", "label": "Primary Admission" }
]
```

---

## 🎯 Key Implementation Points

1. **On Page Load**: Fetch States, Castes, Admission Types, Salary Ranges
2. **State Change**: Fetch Districts, clear District & Mandal selections
3. **District Change**: Fetch Mandals, clear Mandal selection
4. **Caste Change**: Fetch Sub-Castes, clear Sub-Caste selection
5. **Error Handling**: Show user-friendly message, don't break form
6. **Loading State**: Disable dropdown & show loading while fetching

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Empty dropdown | Check if data is seeded |
| 401 Unauthorized | Verify auth token is valid |
| 404 Not Found | Check parent ID exists (for cascading) |
| CORS error | Contact backend team |
| Slow loading | Check network tab, optimize requests |

---

## 📱 Contact

- **Backend Files**: `app/api/v1/masters/`, `app/api/v1/student/`
- **Full Documentation**: `AI_GOVERNANCE/handovers/DROPDOWN_IMPLEMENTATION_HANDOVER.md`
- **API Docs**: `http://localhost:8000/docs`

---

**Quick Tip**: Test with `/docs` Swagger UI first before integrating into frontend!
