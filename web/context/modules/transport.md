# Module Context – Transport

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Transport module manages school transportation:

1. **Vehicles**: Fleet vehicle management
2. **Routes**: Transport route definitions
3. **Route Stops**: Stops along each route
4. **Trips**: Scheduled trip management
5. **Student Transport**: Student-transport assignments
6. **Student Trips**: Student trip enrollment

---

## Key Components

[EVIDENCE-BASED]

### Routes

| File | Purpose |
|------|---------|
| `src/routes/_app/transport/vehicles.tsx` | Vehicle management |
| `src/routes/_app/transport/routes.tsx` | Route management |
| `src/routes/_app/transport/routeStops.tsx` | Route stops |
| `src/routes/_app/transport/trips.tsx` | Trip management |
| `src/routes/_app/transport/studentTransport.tsx` | Student assignments |
| `src/routes/_app/transport/studentTrips.tsx` | Student trips |

### API Hooks

| File | Purpose |
|------|---------|
| `src/api/hooks/masters/vehicles.ts` | Vehicle CRUD hooks |
| `src/api/hooks/masters/routes.ts` | Route CRUD hooks |
| `src/api/hooks/masters/routeStops.ts` | Route stop hooks |
| `src/api/hooks/masters/trips.ts` | Trip hooks |
| `src/api/hooks/masters/studentTransport.ts` | Student transport hooks |
| `src/api/hooks/masters/studentTrips.ts` | Student trip hooks |

### Transport Hooks

| Directory | Purpose |
|-----------|---------|
| `src/hooks/transport/` | Additional transport hooks |

### Components

| Directory | Purpose |
|-----------|---------|
| `src/components/masters/trips/` | Trip-related components |

### Pages

| Directory | Purpose |
|-----------|---------|
| `src/pages/transport/` | Transport page components |

---

## Data Model Summary

[INFERENCE - Based on common transport patterns]

### Entity Relationships

```
Vehicle
    └── Route
        └── Route Stop (ordered list)
            └── Trip (scheduled instance)
                └── Student Trip (student on trip)
```

### Expected Types

```typescript
interface Vehicle {
  id: string;
  name: string;
  number: string;
  capacity: number;
  is_active: boolean;
}

interface Route {
  id: string;
  name: string;
  vehicle_id?: string;
  is_active: boolean;
}

interface RouteStop {
  id: string;
  route_id: string;
  name: string;
  order: number;
  pickup_time?: string;
  drop_time?: string;
}

interface Trip {
  id: string;
  route_id: string;
  type: 'pickup' | 'drop';
  scheduled_time: string;
}

interface StudentTransport {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
}

interface StudentTrip {
  id: string;
  student_id: string;
  trip_id: string;
}
```

---

## Invariants & Rules

[INFERENCE]

### Vehicle Rules

1. Vehicles have capacity limits
2. Vehicles can be assigned to routes

### Route Rules

1. Routes have ordered stops
2. Routes associated with vehicles
3. Pickup and drop times per stop

### Assignment Rules

1. Students assigned to specific stops
2. Students assigned to specific trips
3. Capacity validation likely required

---

## Public Interfaces

[EVIDENCE-BASED]

### Dropdown Components

From dropdown system:
```typescript
TransportRoutesDropdown
VehiclesDropdown (if exists)
```

### Expected Hooks

```typescript
// Vehicles
useVehicles()
useCreateVehicle()
useUpdateVehicle()
useDeleteVehicle()

// Routes
useRoutes()
useCreateRoute()
useUpdateRoute()
useDeleteRoute()

// Route Stops
useRouteStops(routeId)
useCreateRouteStop()
useUpdateRouteStop()
useDeleteRouteStop()

// Trips
useTrips()
useCreateTrip()
useUpdateTrip()
useDeleteTrip()

// Student Transport
useStudentTransport()
useAssignStudentTransport()

// Student Trips
useStudentTrips()
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- **Students Module**: Student selection for assignments
- **Masters Module**: API hooks in masters directory
- **Dropdown System**: Transport route dropdowns

### External Dependencies

- **@tanstack/react-query**: Data fetching and caching

---

## Known Risks

[INFERENCE]

### Capacity Management

1. **Overcapacity**: Need to validate against vehicle capacity
2. **Route Optimization**: No evidence of route optimization

### Schedule Management

1. **Time Conflicts**: Trip scheduling conflicts
2. **Dynamic Updates**: Real-time location tracking absent

### Data Integrity

1. **Orphan Assignments**: Stop removed with active assignments
2. **Route Changes**: Impact on existing assignments

---

## Test Coverage

[UNCERTAIN]

No dedicated transport module tests found in codebase.

---

## Uncertainties

[UNCERTAIN]

1. **GPS Tracking**: No evidence of real-time vehicle tracking
2. **Parent Notifications**: How parents are notified unclear
3. **Fee Integration**: Transport fee connection unclear
4. **Attendance Integration**: Transport attendance tracking unclear
5. **Driver Management**: Driver assignment not analyzed
6. **Route Optimization**: If route optimization exists
7. **Emergency Protocols**: Emergency handling procedures unclear
8. **Capacity Enforcement**: How capacity limits are enforced
9. **Pickup/Drop Windows**: Time window tolerance handling
