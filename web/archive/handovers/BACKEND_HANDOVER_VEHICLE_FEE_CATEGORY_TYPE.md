# Backend Handover - Vehicle API Missing fee_category_id / fee_type_id in Response

**Date:** 2026-07-08
**Status:** 🔴 **BLOCKED - Backend Change Required**
**Priority:** Medium
**Module:** Transport/Masters - Vehicles

---

## Issue Summary

The Vehicles API does not return `fee_category_id` or `fee_type_id` in its response payload — on either the list endpoint or the single-vehicle detail endpoint — even though the frontend sends both fields on create/update and the `Vehicle` type has always declared them. As a result, the Edit Vehicle dialog can never show a previously-selected Fee Category / Fee Type, because the data is not present in what the backend sends back.

This was found while investigating a related, now-confirmed-fixed issue where the vehicle's `fees` amount also wasn't showing — that one turned out to be a frontend gap (no input field existed). `fee_category_id`/`fee_type_id` are a different, backend-side gap: the frontend correctly sends and reads them, but the API response never contains them.

---

## Evidence

### 1. List endpoint — `GET /api/v1/masters/vehicles/?active_only=true`

Captured via browser DevTools Network tab. Full item for vehicle "BUs 01":

```json
{
  "name": "BUs 01",
  "registration_number": "67556758",
  "vehicle_type": "Bus",
  "last_inspected_date": "2026-07-06",
  "pollution_renewal_date": "2026-07-06",
  "fees": 1000.0,
  "driver_name": "Ram",
  "co_driver_name": "vishnu",
  "driving_licence_no": "65656364",
  "driving_licence_exp_date": "2026-08-30",
  "bus_insurance_vendor": null,
  "number_of_trips": 2,
  "insurance_expiry_date": "2026-08-09",
  "is_ac": false,
  "is_active": true,
  "id": "5b272b01-ab10-432c-a4f2-b4efc7063297"
  // ❌ Missing: fee_category_id
  // ❌ Missing: fee_type_id
}
```

### 2. Detail endpoint — `GET /api/v1/masters/vehicles/{id}`

Same vehicle, requested directly by id (`5b272b01-ab10-432c-a4f2-b4efc7063297`):

```json
{
  "name": "BUs 01",
  "registration_number": "67556758",
  "vehicle_type": "Bus",
  "last_inspected_date": "2026-07-06",
  "pollution_renewal_date": "2026-07-06",
  "fees": 1000.0,
  "driver_name": "Ram",
  "co_driver_name": "vishnu",
  "driving_licence_no": "65656364",
  "driving_licence_exp_date": "2026-08-30",
  "bus_insurance_vendor": null,
  "number_of_trips": 2,
  "insurance_expiry_date": "2026-08-09",
  "is_ac": false,
  "is_active": true,
  "id": "5b272b01-ab10-432c-a4f2-b4efc7063297"
  // ❌ Missing: fee_category_id
  // ❌ Missing: fee_type_id
}
```

Note `fees` (a plain numeric column, recently wired up on the frontend) round-trips correctly — proving the general create/update/read path works. `fee_category_id`/`fee_type_id` are the only two fields that never appear anywhere in the response, on either endpoint, even after explicitly selecting and saving values for them from the Edit Vehicle dialog.

### Reproduction steps

1. Open Transport → Vehicles → Edit on any vehicle.
2. Select a Fee Category and Fee Type, click Save Changes.
3. Reopen Edit Vehicle for the same vehicle — Fee Category/Fee Type show as unselected (blank).
4. Inspect the network response for either `GET /masters/vehicles/?active_only=true` or `GET /masters/vehicles/{id}` — the JSON has no `fee_category_id`/`fee_type_id` keys at all (not even `null`).

---

## What the Frontend Already Sends

`PUT /api/v1/masters/vehicles/{id}` request body (constructed in `src/pages/transport/vehicles.tsx`, `VehicleEditDialog.handleSubmit`) already includes:

```json
{
  "fee_category_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "fee_type_id": "e290f1ee-6c54-4b01-90e6-d701748f0852",
  "...": "other fields"
}
```

So the frontend contract is already correct on the write side. It's unconfirmed whether the backend persists these values at all (needs a DB check), but it's confirmed the backend never returns them regardless.

---

## Required Backend Changes

### 1. Verify persistence

Check whether the `vehicles` table has `fee_category_id` / `fee_type_id` columns, and whether the `PUT`/`PATCH` update endpoint actually writes the incoming request values to them.

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'vehicles'
AND column_name IN ('fee_category_id', 'fee_type_id');
```

If the columns don't exist, add them as nullable FKs to `fee_categories(id)` / `fee_types(id)` respectively.

### 2. Add fields to the Vehicle response schema

**File:** `backend/app/schemas/vehicle.py` (or similar)

```python
class VehicleOut(BaseModel):
    id: str
    name: str
    registration_number: str
    vehicle_type: str
    fees: float | None = None
    fee_category_id: str | None = None   # ✅ Add this
    fee_type_id: str | None = None       # ✅ Add this
    # ... existing fields ...

    class Config:
        from_attributes = True
```

Apply this to whichever schema backs **both** `GET /masters/vehicles/` (list) and `GET /masters/vehicles/{id}` (detail) — the evidence above shows both endpoints are affected identically.

### 3. Confirm the endpoint/ORM query returns the columns

Ensure the SQLAlchemy model for `Vehicle` includes `fee_category_id`/`fee_type_id` columns and that the query doesn't explicitly exclude them (e.g. via `.options(load_only(...))` or a manual field-selection list that predates these columns being added).

---

## Testing After Backend Fix

```bash
curl -X GET "http://localhost:8000/api/v1/masters/vehicles/<id>" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "cschema: test_tenant"

# Expected response should include:
# "fee_category_id": "<uuid>" (or null if never set)
# "fee_type_id": "<uuid>" (or null if never set)
```

Then in the frontend: Transport → Vehicles → Edit on a vehicle with a previously-saved Fee Category/Type — the dropdowns should now show the saved selections. No frontend changes are needed once the backend returns these fields; the read path (`useVehicle` detail fetch) and form population logic are already wired up correctly.

---

## Related Files

### Frontend (already correct, no further changes expected)
- `src/pages/transport/vehicles.tsx` — `VehicleAddDialog` / `VehicleEditDialog`, sends and reads `fee_category_id`/`fee_type_id`
- `src/hooks/masters/useVehicles.ts` — `useVehicle(id)` detail-fetch hook
- `src/types/masters/vehicle.ts` — `Vehicle`/`VehicleInput`/`VehicleUpdate` already declare both fields

### Backend (needs changes)
- 🔴 `backend/app/schemas/vehicle.py` (or similar) — add `fee_category_id`/`fee_type_id` to response schema
- 🔴 `backend/app/models/vehicle.py` (or similar) — confirm columns exist
- 🔴 `backend/app/api/endpoints/vehicles.py` (or similar) — confirm list/detail queries select these columns

---

## Priority Justification

**Priority: Medium**

- Blocks: Vehicle Fee Category/Type cannot be viewed after saving (data may be silently lost or simply invisible — persistence is unconfirmed).
- Does not block core vehicle/trip management functionality.
- Similar in nature to the already-documented missing `created_at`/`updated_at` gap on Trips/Routes (`BACKEND_HANDOVER_TRIPS_TIMESTAMPS.md`) — recommend backend audit all master-data response schemas for the same class of omission.

---

**Status:** 🔴 Blocked - Awaiting backend investigation and fix
**Next Steps:** Backend team to confirm DB persistence, then add `fee_category_id`/`fee_type_id` to the Vehicle response schema for both list and detail endpoints
