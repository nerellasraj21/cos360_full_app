# Module Context – Transport

Version: 1.2
Generated On: 2025-12-26
Last Updated: 2026-03-04
Source: Codebase Analysis + Implementation Handovers
Confidence Level: High

---

## Responsibility

The Transport module manages school transportation:

1. **Vehicles**: Fleet vehicle management
2. **Route Types**: Dynamic route type management (create-on-the-fly)
3. **Trip Types**: Dynamic trip type management (create-on-the-fly)
4. **Routes**: Transport route definitions with typed route/trip types
5. **Route Stops**: Stops along each route
6. **Trips**: Scheduled trip management
7. **Student Transport**: Student-transport assignments (admin CRUD + student/parent self-service view)
8. **Student Trips**: Student trip enrollment

---

## Key Components

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/transport/vehicles.tsx` | Vehicle management (admin) |
| `src/routes/_app/transport/routes.tsx` | Route management (admin) |
| `src/routes/_app/transport/routeStops.tsx` | Route stops (admin) |
| `src/routes/_app/transport/trips.tsx` | Trip management (admin) |
| `src/routes/_app/transport/studentTransport.tsx` | Student assignments (admin) |
| `src/routes/_app/transport/studentTrips.tsx` | Student trips (admin) |
| `src/routes/_app/students/studenttransport.tsx` | Student/Parent self-service view |

### API Hooks

| File | Purpose |
|------|---------|
| `src/api/hooks/masters/vehicles.ts` | Vehicle CRUD hooks |
| `src/api/hooks/masters/routes.ts` | Route CRUD hooks |
| `src/api/hooks/masters/routeStops.ts` | Route stop hooks |
| `src/api/hooks/masters/trips.ts` | Trip hooks |
| `src/api/hooks/masters/studentTransport.ts` | Student transport hooks |
| `src/api/hooks/masters/studentTrips.ts` | Student trip hooks |
| `src/api/hooks/masters/transportOptions.ts` | Route type + trip type hooks with invalidation |

### Transport Types API Layer

| File | Purpose |
|------|---------|
| `src/api/masters/transportTypes.ts` | Route/trip type CRUD functions |
| `src/types/masters/transportTypes.ts` | RouteType, TripType interfaces |
| `src/types/masters/route.ts` | Route interface with nested type objects |

### Components and Pages

| Directory | Purpose |
|-----------|---------|
| `src/components/masters/trips/` | Trip-related components |
| `src/pages/transport/` | Transport page components |
| `src/pages/transport/routes.tsx` | Route management with create-on-fly types |

---

## Data Model Summary

### Entity Relationships

```
Vehicle
    └── Route (has route_type_id + trip_type_id → RouteType, TripType)
        └── Route Stop (ordered list)
            └── Trip (scheduled instance)
                └── Student Trip (student on trip)

RouteType  (dynamic master list)
TripType   (dynamic master list)
```

### Type Definitions

```typescript
// ⚠ CRITICAL: field is "type_name" NOT "name"
export interface RouteTypeDropdown {
  id: string;
  type_name: string;
}

export interface TripTypeDropdown {
  id: string;
  type_name: string;
}

// Route interface (src/types/masters/route.ts)
export interface Route {
  id: string;
  route_name: string;
  route_type_id?: string;   // UUID reference (null for old routes)
  trip_type_id?: string;    // UUID reference (null for old routes)
  route_type?: {            // Populated by backend if joined
    id: string;
    type_name: string;
  };
  trip_type?: {
    id: string;
    type_name: string;
  };
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  name: string;
  number: string;
  capacity: number;
  is_active: boolean;
}

export interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  order: number;
  pickup_time?: string;
  drop_time?: string;
}
```

---

## Invariants & Rules

### Transport Types (Route Types and Trip Types)

1. **Dynamic**: Types stored in the database, not hardcoded enums
2. **Create-on-the-fly**: Users type a new name in the CreatableSelect dropdown and press Enter
3. **Duplicate prevention**: Frontend checks case-insensitively before posting
4. **Field name is `type_name`** — backend Pydantic model uses `type_name`, NOT `name`
5. **Create payload**: `{ "type_name": "Upward", "is_active": true }`

### Route Field Compatibility

- **New routes**: have `route_type_id` and `trip_type_id` UUID fields
- **Old routes** (created before UUID migration): `null` for both UUID fields; used legacy string `route_type` field
- Table renders "-" for old routes gracefully; edit them to assign UUID-based types

### Required Backend Response Format

```json
// GET /masters/route-types/dropdown
[{ "id": "uuid", "type_name": "Upward" }]

// GET /masters/routes/all_routes
[{
  "id": "uuid",
  "route_name": "Morning Route",
  "route_type_id": "uuid-or-null",
  "trip_type_id": "uuid-or-null",
  "route_type": { "id": "uuid", "type_name": "Upward" },
  "trip_type": { "id": "uuid", "type_name": "First Trip" }
}]
```

---

## Public Interfaces

### Dropdown Components

```typescript
TransportRoutesDropdown
VehiclesDropdown
```

### Transport Type Hooks (`src/api/hooks/masters/transportOptions.ts`)

```typescript
useRouteTypesDropdown()  // GET /masters/route-types/dropdown
useCreateRouteType()     // POST — invalidates transportTypesKeys.routeTypes()
useTripTypesDropdown()   // GET /masters/trip-types/dropdown
useCreateTripType()      // POST — invalidates transportTypesKeys.tripTypes()
```

### Route/Vehicle Hooks

```typescript
useVehicles() / useCreateVehicle() / useUpdateVehicle() / useDeleteVehicle()
useRoutes() / useCreateRoute() / useUpdateRoute() / useDeleteRoute()
useRouteStops(routeId) / useCreateRouteStop()
useTrips() / useCreateTrip()
useStudentTransport() / useAssignStudentTransport()
useStudentTrips()
```

---

## API Endpoints

### Transport Types

```
GET    /api/v1/masters/route-types/dropdown
POST   /api/v1/masters/route-types/           { type_name, is_active }
GET    /api/v1/masters/route-types/
PUT    /api/v1/masters/route-types/{id}
DELETE /api/v1/masters/route-types/{id}

GET    /api/v1/masters/trip-types/dropdown
POST   /api/v1/masters/trip-types/            { type_name, is_active }
GET    /api/v1/masters/trip-types/
PUT    /api/v1/masters/trip-types/{id}
DELETE /api/v1/masters/trip-types/{id}
```

### Routes

```
GET    /api/v1/masters/routes/
GET    /api/v1/masters/routes/all_routes
POST   /api/v1/masters/routes/
PUT    /api/v1/masters/routes/{id}
DELETE /api/v1/masters/routes/{id}
```

---

## Permissions Required

| Resource | Actions needed |
|----------|---------------|
| `route_types` | list, read, create, update, delete |
| `trip_types` | list, read, create, update, delete |
| `routes` | list, read, create, update, delete |

**Permission cache**: After backend adds permissions, users must logout and login to refresh JWT. Old sessions get 403 errors.

---

## Dependencies

### Internal Dependencies

- **Students Module**: Student selection for assignments
- **Masters Module**: API hooks live in `src/api/hooks/masters/` directory
- **Dropdown System**: Transport route dropdowns

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching
- **react-select/creatable**: CreatableSelect for create-on-fly type dropdowns

---

## Student Transport — Self-Service (Mar 2026)

### Overview

Students and Parents access their transport assignment at `/_app/students/studenttransport` (NOT the admin transport pages).

**Role routing** in `src/pages/students/StudentTransportPage.tsx`:

- **Student** → shows own transport using `entity_id` from login
- **Parent** → child selector dropdown + transport for selected child
- **Admin/Staff/Teacher** → informational redirect to Transport section

### Enriched API Response (Mar 2026)

`GET /api/v1/students/student-transport/student/{student_id}` now returns nested details:

```json
{
  "trip": {
    "trip_number": 1,
    "route": { "route_name": "zhb-hyd", "starting_stop": "hyd", "ending_stop": "tr", "start_time": "07:00:00", "end_time": "08:30:00" },
    "vehicle": { "registration_number": "ap 29 cw 2569", "vehicle_type": "Van" }
  },
  "stop": { "name": "ZHB Bus Stand", "number": 1, "reaching_time": null, "fees": 500 },
  "fee_per_term": 500.0
}
```

**404 handling**: Backend returns 404 when no transport is assigned (instead of empty array). `fetchStudentTransportsByStudent` catches 404 and returns `[]` — the UI shows "No transport assignment found."

### Updated Type Definitions (Mar 2026)

`src/types/masters/studentTransport.ts` — updated to reflect enriched response:

```typescript
StudentTransportOut {
  trip?: TransportTripDetail    // has .route and .vehicle nested
  stop?: TransportStopDetail    // replaces old route_stop field
  fee_per_term: number
}
```

New interfaces: `TransportTripDetail`, `TransportRouteDetail`, `TransportVehicleDetail`, `TransportStopDetail`

### Access Rules

| Role | Endpoint | Restriction |
| --- | --- | --- |
| Student | `GET /students/student-transport/student/{entity_id}` | 403 if not own ID |
| Parent | `GET /students/student-transport/student/{child_id}` | 403 if not linked child |
| Admin | All transport endpoints | Requires `student_transport:read` |

---

## Known Issues

1. **Old routes show "-" for type columns**: Routes before the UUID migration have `null` type IDs. Edit them to assign types, or ask backend for a data migration.

2. **Console logs in production**: `src/api/masters/transportTypes.ts` has debug `console.log` calls. Wrap in `import.meta.env.DEV` checks before production.

3. **React-select in Dialog**: When using react-select inside Dialog, use `modal={false}` on Dialog + `menuPortalTarget={document.body}` + `pointerEvents: 'auto'` styles. See CLAUDE.md for the full pattern.

---

## Known Risks

- **Overcapacity**: Need to validate against vehicle capacity limits
- **Orphan assignments**: Stops removed while students are assigned

---

## Test Coverage

No dedicated transport module tests found in codebase.

---

## Uncertainties

1. **GPS Tracking**: No evidence of real-time vehicle tracking
2. **Parent Notifications**: How parents are notified unclear
3. **Fee Integration**: Transport fee connection unclear
4. **Driver Management**: Driver assignment not analyzed
5. **Capacity Enforcement**: How capacity limits are enforced
