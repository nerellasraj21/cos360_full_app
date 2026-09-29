# Transport
School transport: routes and their stops, vehicles, trips (a vehicle on a route with a driver), transport pricing, and which trip and stop each student is assigned to.
_Last verified against code: 2026-09-29_
Flows, decisions, and feature map: [graph view](../graph/views/transport.md) (source: docs/graph/graph.jsonl).

## What it does
- **Route types and trip types** are dynamic dictionaries (`route_types`, `trip_types`, with a unique `type_name`). They only feed dropdowns. A route stores the chosen **name as a plain string**.
- **Routes** have a unique `route_name`, starting and ending stop names, `number_of_stops` (typed in by hand, not computed), start and end times, and `is_active`.
- **Route stops** are unique on (`route_id`, `number`). Each has a `name`, a sequence `number`, `reaching_time` (deprecated but still required), optional `pickup_time`/`drop_time`, and a default fee `fees`.
- **Vehicles** have a unique `registration_number`, a `vehicle_type` (free text such as Bus, Van or Auto), inspection and pollution dates, and optional driver, insurance, AC, `fees` and `number_of_trips` fields.
- **Trips** join one vehicle to one route (unique on (`vehicle_id`, `route_id`)), with an optional `driver_id` (FK to `users.id`) and a `trip_number`.
- **Transport pricing** (`transport_pricing`) is a set of billing-cycle plans for each vehicle, and optionally for one route of that vehicle.
  - Fields: `billing_cycle` (`annual | semester | monthly | custom`), `cycle_name`, `amount > 0`, `start_date < end_date`, `is_active`.
  - Active plans with the same vehicle, route and cycle may not have overlapping dates. A clash returns **409** with the id of the conflicting plan.
  - A plan with `route_id = NULL` is only compared with other NULL-route plans.
- **Student transport** (`student_transport_assignments`) assigns a student to a trip and a stop, with `fee_per_term` and an optional `pricing_id`. A student can't be assigned to the same trip twice.
  - Admin, staff and teacher manage assignments.
  - A student sees only their own assignment. A parent sees only their linked children.
- **Permission resources:** `route_types`, `trip_types`, `routes`, `route_stops`, `vehicles`, `transport_trips` (the resource is not called `trips`), `transport_pricing` and `student_transport`. See [permissions](../permissions.md).

## Where the code lives
| Layer | Backend | Web | Mobile |
|---|---|---|---|
| Models | `backend/app/models/masters/transport/`, `backend/app/models/student/student_transport_model.py` | — | — |
| Schemas / types | `backend/app/schemas/masters/transport/`, `backend/app/schemas/student/student_transport_schema.py` | `web/src/types/masters/{route,routeStop,vehicle,trip,transportTypes,transportPricing,studentTransport}.ts` | `mobile/src/types/transport.ts` (canonical), `mobile/src/api/students.ts` (StudentTransport types) |
| Services | `backend/app/service/masters/transport/`, `backend/app/service/student/student_transport_service.py` | — | — |
| Endpoints / API | `backend/app/api/v1/masters/transport/`, `backend/app/api/v1/student/student_transport_endpoints.py` | `web/src/api/masters/`, `web/src/constants/api/transport.ts` | `mobile/src/api/{masters,transport,transportTypes,students}.ts` |
| Hooks | — | `web/src/api/hooks/masters/` (`transportOptions.ts` for the types) | `mobile/hooks/use-transport.ts` |
| UI | — | `web/src/pages/transport/`, `web/src/pages/students/StudentTransportPage.tsx` (role-aware), routes `web/src/routes/_app/transport/`, `/_app/students/studenttransport` | `mobile/app/transport/`, `mobile/app/students/transport.tsx` |

Endpoint prefixes:
- `/masters/route-types` and `/masters/trip-types`. The list is at `/all`, and there is also `/dropdown`.
- `/masters/routes`. The paths are unusual: list is `/all_routes`, get one is `/routeid/{id}`, plus `/dropdown` and `/stops-by-route?route_name=`.
- `/masters/route-stops`
- `/masters/vehicles`, with `/dropdown`, `/{id}/routes`, `/{id}/trips` and `/{id}/routes/{route_id}/stops`
- `/masters/trips`
- `/masters/transport-pricing`, with `/dropdown?vehicle_id=`
- `/students/student-transport`: `GET /`, `POST /`, `GET /student/{student_id}`, `PATCH /{id}`, `DELETE /{id}`

## Rules & gotchas
1. **`route_type` and `trip_type` are strings with no foreign key.** Several archived handovers describe `route_type_id`/`trip_type_id` UUID columns with nested objects. That was never shipped.
   - Renaming or deleting a type does not change existing routes.
   - Old rows can hold lowercase values (`"upward"`) or NULL, which the UI shows as "-".
2. **The type payload and response field is `type_name`, never `name`.** Sending `name` returns a 422.
   - After seeding `route_types`/`trip_types` permissions, users must log out and back in: the backend checks the DB live, but clients cache the permission map from the login response (not the JWT), so the UI keeps hiding or blocking the controls until re-login.
3. **`GET /masters/route-stops/` ignores every query parameter** (`route_id`, `active_only`) and returns all active stops across all routes.
   - Web `fetchRouteStopsByRouteId`, the web assign dialog and both mobile assign screens therefore show stops from every route.
   - The backend does **not** check that `stop_id` is on the trip's route.
4. **Stops:**
   - `RouteStopCreate` still requires `reaching_time`, even though it is deprecated. Send a value until the schema changes.
   - `RouteStop.fees` is an `Integer` column while the schema allows a float, so only send whole-number fees.
   - The web table hides `reaching_time` but the form still sets it.
   - `get_route_stops()` has to return `pickup_time`/`drop_time` in every response dict. Leaving them out once meant the values were saved but never shown.
5. **Trips:**
   - There can be only one trip per vehicle–route pair, and a duplicate returns 400. Morning and evening runs therefore need different routes, not just different `trip_number`s.
   - Trips are **hard-deleted**. Everything else uses a soft delete (`is_active = False`).
   - Deleting a trip that has student assignments hits the NOT NULL foreign key `student_transport_assignments.trip_id` and fails.
6. **Student assignments:**
   - Assignments are hard-deleted.
   - There is no `is_active` and no `fee_term_id`: the column is commented out in the model and removed from the schemas. Never send either field. Old payloads with `route_id`, `fare_amount` or `pickup_stop_id` are also dead.
   - There is no `academic_year_id` either: an assignment is not year-scoped and carries over into the next year until it is deleted.
   - `fee_per_term` is a `Float`. The pricing `amount` is a `Decimal` and arrives as a JSON string, so wrap it in `Number()`.
7. **The legacy `student_trips` table has no API.** Its endpoints are commented out in `main_router.py`. The "Student Trips" screens on web (`pages/transport/studentTrips.tsx`) and mobile (`app/transport/student-trips.tsx`) are another view of `/students/student-transport/`.
   - Their API wrappers (web `api/masters/studentTrips.ts`, mobile `studentTripsApi`) also define `GET /students/student-transport/{id}`, and web additionally `PUT /{id}`. Neither exists; only `PATCH` and `DELETE` are routed.
8. **Dropdown caching:** the route-type, trip-type, route and vehicle dropdowns are cached in memory for 5 minutes (`@cache_dropdown`, `app/tools/cache_utils.py`).
   - The cache key includes the tenant schema only when `db` is passed **positionally**. Keep calling them as `fn(db, ...)`.
   - Invalidation only affects the current worker, so other workers can serve stale data for up to 5 minutes.
9. **The vehicle API has no `fee_category_id`/`fee_type_id`.** Web `vehicles.tsx` sends them anyway, and Pydantic silently drops them.
   - The web create dialog also sets `last_inspected_date` and `pollution_renewal_date` to today.
10. **Web react-select inside a Dialog needs three things:** `modal={false}` on the Dialog, `menuPortalTarget={document.body}`, and `pointerEvents: 'auto'` plus a high `zIndex` in the menu/menuPortal styles. Without them the menu doesn't respond to clicks.
    - Use the `RouteIcon` alias for lucide's `Route` icon, because the plain name clashes with the TanStack `Route`.
11. **Role checks on the student-transport read are exact string matches** (`role == "Student"` / `"Parent"`). Any other spelling falls through to the permission check.
12. **Pricing:**
    - `GET /masters/transport-pricing/?vehicle_id=&billing_cycle=` lists active plans only, newest `start_date` first.
    - The dropdown also returns only active plans, but it has no date-range or route filter, so plans that have expired or belong to another route still show up.
    - A soft-deleted plan can still be read with `GET /{id}`.

## Web / mobile parity
- **Hubs:** web builds the transport hub cards from the backend `menuItems`, while mobile hard-codes 7 sections in `app/transport/index.tsx`: Routes, Route Stops, Vehicles, Trips, Pricing, Student Transport and Student Trips. Only add a section on mobile if the backend menu seeds it.
- **Student self-service:** web uses `/students/studenttransport` with Student, Parent and Admin views. Mobile uses `app/students/transport.tsx`, which also has a stop search.
- **Mobile has two assign screens:** `app/students/transport.tsx` offers the pricing-plan picker (`pricing_id`), but the hub's Student Transport screen (`app/transport/student-transport.tsx`) has none and requires `fee_per_term` to be typed.
- **Mobile API imports:** use `studentTransportApi` from `src/api/students`. `src/api/index.ts` now re-exports that same one. Canonical transport types live in `src/types/transport.ts`, and `src/api/masters.ts` only re-exports them.
- **Default values differ:** mobile sets route-stop `reaching_time` to 07:00 and `fees` to 0; web sets 08:30 and 25.

## Known gaps
- No check that `stop_id` belongs to the trip's route, and route stops can't be filtered by route on the server. See rule 3.
- No capacity field or capacity check. GPS, trip logs and parent notifications are not built.
- The pricing overlap check uses `scalar_one_or_none()`. If more than one plan already overlaps, it raises `MultipleResultsFound`, which becomes a 500.
- The web Student Transport table (`pages/transport/studentTransport.tsx`) still has an "Active" column although assignments have no `is_active` (it always shows a dash), and it lists raw trip, student and stop IDs instead of names.
- Trips and pricing services use `commit()` → `refresh()`, not the repo's flush → select → commit pattern.
- An unapproved redesign proposal (Feb 2026, not kept) asked for a 3-step assign wizard, the student's class/section shown when assigning, a payment schedule (monthly/quarterly/yearly/bulk), bulk assign, and a trip roster grouped by stop. None of it is implemented.
