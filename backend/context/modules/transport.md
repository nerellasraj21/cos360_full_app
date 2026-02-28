# Module Context - Transport Management

Version: 1.0
Last Updated: 2026-02-27
Source: Codebase Analysis (app/models/masters/transport/, app/service/masters/transport/, app/api/v1/masters/)
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Transport module (under the Masters domain) manages school transport infrastructure and student assignments:

- **Route types**: Classification of routes (e.g., morning, evening, express)
- **Routes**: Definitions with start/end stops, timing, and stop sequences
- **Route stops**: Individual stops with sequence, arrival time, and transport fee per stop
- **Vehicles**: Fleet management with registration, type, and inspection/pollution tracking
- **Trip types**: Classification of trips (e.g., daily, weekly, special)
- **Trips**: Scheduled execution linking a vehicle + route + driver
- **Student trips**: Student enrollment on a trip with assigned pickup stop and per-term fee

Evidence: `app/api/v1/masters/transport/`, `app/service/masters/transport/`, `app/models/masters/transport/`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model | File | Purpose |
| --- | --- | --- |
| RouteType | `masters/transport/route_type_model.py` | Route classification (type_name, unique) |
| Route | `masters/transport/route_model.py` | Core route definition with timing and stop count |
| RouteStop | `masters/transport/route_stop_model.py` | Individual stop on a route (sequence, time, fee) |
| Vehicle | `masters/transport/vehicle_model.py` | Fleet vehicle with inspection/pollution dates |
| TripType | `masters/transport/trip_type_model.py` | Trip classification (type_name, unique) |
| Trip | `masters/transport/trip_model.py` | Scheduled trip linking vehicle + route + driver |
| StudentTrip | `masters/transport/student_trip_model.py` | Student enrollment on a trip with assigned stop |

### Services

| Service | File | Purpose |
| --- | --- | --- |
| RouteTypeService | `masters/transport/route_type_service.py` | CRUD + dropdown; validates type_name uniqueness |
| RoutesService | `masters/transport/routes_service.py` | CRUD + dropdown; nested stop lookup by route_name |
| RouteStopService | `masters/transport/route_stop_service.py` | CRUD with eager-loaded route_name in all responses |
| VehicleService | `masters/transport/vehicle_service.py` | CRUD + dropdown; vehicle-centric route/stop queries |
| TripTypeService | `masters/transport/trip_type_service.py` | CRUD + dropdown; validates type_name uniqueness |
| TripService | `masters/transport/trip_service.py` | CRUD for trips (**hard delete**, not soft) |
| StudentTripService | `masters/transport/student_trip_service.py` | CRUD + soft deactivation for student-trip records |

### API Endpoints

| Endpoint File | Route Prefix | Description |
| --- | --- | --- |
| `route_type_endpoints.py` | `/masters/route-types` | CRUD + dropdown for route types |
| `routes_endpoints.py` | `/masters/routes` | CRUD + dropdown + stops-by-route |
| `route_stop_endpoints.py` | `/masters/route-stops` | CRUD for route stops |
| `vehicle_endpoints.py` | `/masters/vehicles` | CRUD + dropdown + vehicle-route-stop queries |
| `trip_type_endpoints.py` | `/masters/trip-types` | CRUD + dropdown for trip types |
| `trip_endpoints.py` | `/masters/trips` | CRUD for trips (resource: `transport_trips`) |
| `student_trip_endpoints.py` | `/masters/student-trips` | **All endpoints commented out — not active** |

---

## Data Model Summary

[EVIDENCE-BASED]

### RouteType
- `id` (UUID, PK), `type_name` (String, unique, not null), `description` (String, optional)
- `is_active` (Boolean, default True), `created_at`, `updated_at` (DateTime with timezone)

### Route
- `id` (UUID, PK), `route_name` (String, not null)
- `starting_stop`, `ending_stop` (String, not null), `number_of_stops` (Integer)
- `route_type` (String — **no FK**, dropdown value stored as string)
- `trip_type` (String — **no FK**, dropdown value stored as string)
- `start_time`, `end_time` (Time), `is_active` (Boolean, default True)
- **Relationships**: `stops` (List[RouteStop]), `trips` (List[Trip])

### RouteStop
- `id` (UUID, PK), `route_id` (UUID, FK → routes.id)
- `name` (String, not null), `number` (Integer — sequence), `reaching_time` (Time)
- `fees` (Integer — transport fee at this stop), `is_active` (Boolean, default True)
- **Relationships**: `route` (Route) — eagerly loaded; `route_name` injected into response

### Vehicle
- `id` (UUID, PK), `name` (String), `registration_number` (String, unique)
- `vehicle_type` (String — Bus, Van, Auto)
- `last_inspected_date`, `pollution_renewal_date` (Date)
- `is_active` (Boolean, default True)
- **Relationships**: `trips` (List[Trip])

### TripType
- `id` (UUID, PK), `type_name` (String, unique, not null), `description` (String, optional)
- `is_active` (Boolean, default True), `created_at`, `updated_at` (DateTime with timezone)

### Trip
- `id` (UUID, PK), `vehicle_id` (UUID, FK → vehicles.id), `route_id` (UUID, FK → routes.id)
- `driver_id` (UUID, FK → users.id), `trip_number` (Integer)
- `created_at`, `updated_at` (DateTime with timezone)
- **Relationships**: `vehicle` (Vehicle), `route` (Route), `student_trips` (List[StudentTrip])

### StudentTrip
- `id` (UUID, PK), `trip_id` (UUID, FK → trips.id), `student_id` (UUID, FK → students.id)
- `stop_id` (UUID, FK → route_stops.id), `fee_term_id` (UUID, FK → fee_terms.id, **nullable**)
- `fee_per_term` (Integer), `is_active` (Boolean, default True)
- **Relationships**: `trip` (Trip)

---

## Invariants & Rules

[EVIDENCE-BASED]

1. **RouteType / TripType uniqueness**: `type_name` must be unique — service validates before create and update
2. **Route type/trip type not enforced by FK**: `route_type` and `trip_type` on Route are plain strings; no referential integrity at DB level
3. **Route stop sequencing**: Each stop has a `number` (sequence within route) and `reaching_time`
4. **Stop-level fees**: Transport fee is defined per stop (`fees` on RouteStop), not per student
5. **Trip hard delete**: Only `Trip` uses `await db.delete(trip)` — all other entities use soft delete (`is_active = False`)
6. **Student trip soft delete**: StudentTrip uses `is_active = False` (not physical delete)
7. **Vehicle inspection tracking**: `last_inspected_date` and `pollution_renewal_date` are tracked for regulatory compliance; no automated expiry logic
8. **Dropdown caching**: RouteType, TripType, Route, Vehicle provide cached dropdowns (5-minute TTL); cache invalidated on create/update/delete
9. **Trip-vehicle-route binding**: Multiple trips can use the same vehicle-route pair (e.g., morning and evening trips differ by `trip_number`)
10. **StudentTrip API disabled**: `student_trip_endpoints.py` is entirely commented out — StudentTrip is only accessible via service layer

---

## Public Interfaces

[EVIDENCE-BASED]

### Route Types
```
POST    /api/v1/masters/route-types                       Create route type (30/min rate limit)
GET     /api/v1/masters/route-types/all                   List all active route types
GET     /api/v1/masters/route-types/dropdown              Dropdown (id + type_name, cached, 100/min)
GET     /api/v1/masters/route-types/{route_type_id}       Get single route type
PUT     /api/v1/masters/route-types/{route_type_id}       Full update
PATCH   /api/v1/masters/route-types/{route_type_id}       Partial update
DELETE  /api/v1/masters/route-types/{route_type_id}       Soft delete
```

### Routes
```
POST    /api/v1/masters/routes                            Create route (30/min rate limit)
GET     /api/v1/masters/routes/all_routes                 List all active routes
GET     /api/v1/masters/routes/dropdown                   Dropdown (id + route_name, cached, 100/min)
GET     /api/v1/masters/routes/stops-by-route             Get stops for route (?route_name=...)
GET     /api/v1/masters/routes/routeid/{route_id}         Get single route by ID
PUT     /api/v1/masters/routes/{route_id}                 Full update
PATCH   /api/v1/masters/routes/{route_id}                 Partial update
DELETE  /api/v1/masters/routes/{route_id}                 Soft delete
```

### Route Stops
```
POST    /api/v1/masters/route-stops                       Create route stop
GET     /api/v1/masters/route-stops                       List all active stops (with route_name)
GET     /api/v1/masters/route-stops/{stop_id}             Get single stop
PUT     /api/v1/masters/route-stops/{stop_id}             Full update
PATCH   /api/v1/masters/route-stops/{stop_id}             Partial update
DELETE  /api/v1/masters/route-stops/{stop_id}             Soft delete
```

### Vehicles
```
POST    /api/v1/masters/vehicles                          Create vehicle
GET     /api/v1/masters/vehicles                          List all active vehicles
GET     /api/v1/masters/vehicles/dropdown                 Dropdown (id + name)
GET     /api/v1/masters/vehicles/{vehicle_id}             Get single vehicle
GET     /api/v1/masters/vehicles/{vehicle_id}/routes      Get routes assigned to vehicle
GET     /api/v1/masters/vehicles/{vehicle_id}/routes/{route_id}/stops  Get stops for vehicle-route
PUT     /api/v1/masters/vehicles/{vehicle_id}             Full update
PATCH   /api/v1/masters/vehicles/{vehicle_id}             Partial update
DELETE  /api/v1/masters/vehicles/{vehicle_id}             Soft delete
```

### Trip Types
```
POST    /api/v1/masters/trip-types                        Create trip type (30/min rate limit)
GET     /api/v1/masters/trip-types/all                    List all active trip types
GET     /api/v1/masters/trip-types/dropdown               Dropdown (id + type_name, cached, 100/min)
GET     /api/v1/masters/trip-types/{trip_type_id}         Get single trip type
PUT     /api/v1/masters/trip-types/{trip_type_id}         Full update
PATCH   /api/v1/masters/trip-types/{trip_type_id}         Partial update
DELETE  /api/v1/masters/trip-types/{trip_type_id}         Soft delete
```

### Trips
```
POST    /api/v1/masters/trips                             Create trip
GET     /api/v1/masters/trips                             List all trips
GET     /api/v1/masters/trips/{trip_id}                   Get single trip
PUT     /api/v1/masters/trips/{trip_id}                   Full update
PATCH   /api/v1/masters/trips/{trip_id}                   Partial update
DELETE  /api/v1/masters/trips/{trip_id}                   Hard delete (permanent)
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

| Module | Used For |
| --- | --- |
| User / Staff (masters) | `Trip.driver_id` → users.id (driver assignment) |
| Student (student) | `StudentTrip.student_id` → students.id |
| Fee Terms (fee) | `StudentTrip.fee_term_id` → fee_terms.id (transport fee billing) |

### Downstream Consumers

| Consumer | Uses |
| --- | --- |
| Student module | Student transport assignment (`student_transport_endpoints.py`) |
| Reports module | Transport-related report data |

---

## Permissions

[EVIDENCE-BASED]

| Resource Name | Actions |
| --- | --- |
| `routes` | create, read, update, delete, list |
| `route_stops` | create, read, update, delete, list |
| `vehicles` | create, read, update, delete, list |
| `route_types` | create, read, update, delete, list |
| `trip_types` | create, read, update, delete, list |
| `transport_trips` | create, read, update, delete, list |

Note: Trip endpoints use resource name `transport_trips` (not `trips`) for permission checks.

---

## Known Risks

[INFERENCE]

1. **No FK on route_type / trip_type in Route**: String values stored directly — renaming or deleting a RouteType/TripType will NOT cascade to Route records; data can become orphaned
2. **Trip hard delete cascades to StudentTrip**: Deleting a Trip permanently may leave StudentTrip records orphaned if no cascade delete is defined
3. **StudentTrip API disabled**: No public CRUD for student-trip enrollment; must be managed via service layer or admin script
4. **Datetime with timezone on RouteType/TripType/Trip**: These models use `DateTime(timezone=True)`, unlike most other models. Ensure consistent timezone handling across queries

---

## Test Coverage

[UNCERTAIN]

No dedicated transport module test file identified. Transport endpoints are tested as part of the broader masters module integration tests.

---

## Uncertainties

[UNCERTAIN]

- StudentTrip endpoint re-activation plan not documented — unclear if this is intentional or deferred
- Route `number_of_stops` field appears to be manually entered rather than computed from RouteStop count — potential for data inconsistency

---

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based (extracted from model/service/endpoint source code) or explicitly marked.
