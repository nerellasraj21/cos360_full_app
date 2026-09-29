# Module Context - Masters (Core Data)

Version: 1.2
Generated On: 2025-12-26
Last Updated: 2025-12-28
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Masters module manages core reference data used across the system:

- Academic year management
- Class and section management
- Subject and subject category management
- Staff management
- Parent management
- Holiday calendar
- Timetable configuration
- Transport management (routes, vehicles, trips)
- Designation management

Evidence: `app/api/v1/masters/`, `app/service/masters/`, `context_guide.json:376-389`

---

## Key Components

[EVIDENCE-BASED]

### Models

| Model                  | File                                | Purpose                    |
| ---------------------- | ----------------------------------- | -------------------------- |
| AcademicYear           | `academic_year_model.py`            | Academic year periods      |
| Class                  | `class_model.py`                    | Class/grade definitions    |
| Section                | `sections_model.py`                 | Class sections             |
| Subject                | `subject_model.py`                  | Subject definitions        |
| SubjectCategory        | `subject_category_model.py`         | Subject groupings          |
| ClassSubjectMapping    | `class_subject_mapping_model.py`    | Class-subject associations |
| Staff                  | `staff_model.py`                    | Staff records              |
| StaffAttendance        | `staff_attendance_model.py`         | Staff attendance           |
| Parent                 | `parent_model.py`                   | Parent records             |
| Designation            | `designations_model.py`             | Staff designations         |
| Holiday                | `holidays_model.py`                 | Holiday calendar           |
| Timetable              | `timetable_model.py`                | Timetable structure        |
| TimetableSlot          | `timetable_slot_model.py`           | Time slots                 |
| SlotTime               | `slot_time_model.py`                | Slot timings               |
| TimetableSubjectOption | `timetable_subject_option_model.py` | Subject options            |
| Attendance             | `attendance_model.py`               | Student attendance         |

### Transport Sub-module

| Model       | File                              | Purpose             |
| ----------- | --------------------------------- | ------------------- |
| Route       | `transport/routes_model.py`       | Transport routes    |
| RouteStop   | `transport/route_stop_model.py`   | Route stops         |
| Vehicle     | `transport/vehicle_model.py`      | Vehicles            |
| Trip        | `transport/trip_model.py`         | Trip schedules      |
| StudentTrip | `transport/student_trip_model.py` | Student assignments |

### ClassSubjectMapping

[EVIDENCE-BASED]

- `id` (UUID): Primary key
- `class_id` (UUID FK): Parent class
- `section_id` (UUID FK): Section within the class (**Added 2025-12-28**)
- `subject_id` (UUID FK): Subject being mapped
- `academic_year_id` (UUID FK): Academic year
- `exclude_marks` (boolean): Whether to exclude from marks calculation
- `order` (integer): Display order
- `is_active` (boolean): Status

**Database Constraints:**
- Unique constraint on `(class_id, section_id, subject_id, academic_year_id)` - prevents duplicate mappings
- Foreign key `fk_class_subject_mappings_section_id` to `sections(id)`
- Index `ix_class_subject_mappings_section_id` for query performance

**Bulk API Behavior (Updated 2025-12-28):**
- `section_id` is **optional** in bulk create/update requests
- If `section_id` is provided: applies to that specific section only
- If `section_id` is `null` or omitted: applies to **ALL active sections** in the class
- Response includes `sections_processed` count

Evidence: Database schema, `class_subject_mapping_model.py`, `class_subject_mapping_service.py`

### Services

| Service                    | File                               | Purpose              |
| -------------------------- | ---------------------------------- | -------------------- |
| AcademicYearService        | `academic_year_service.py`         | Academic year CRUD   |
| ClassService               | `class_service.py`                 | Class management     |
| SubjectService             | `subject_service.py`               | Subject management   |
| SubjectCategoryService     | `subject_category_service.py`      | Category management  |
| ClassSubjectMappingService | `class_subject_mapping_service.py` | Section-based subject mapping |
| StaffService               | `staff_service.py`                 | Staff management     |
| ParentService              | `parent_service.py`                | Parent management    |
| DesignationService         | `designation_service.py`           | Designation CRUD     |
| HolidayService             | `holiday_service.py`               | Holiday calendar     |
| TimetableService           | `timetable_service.py`             | Timetable management |
| StudentParentLinkService   | `student_parent_link_service.py`   | Parent-student links |

### Transport Services

| Service            | File                                |
| ------------------ | ----------------------------------- |
| RoutesService      | `transport/routes_service.py`       |
| RouteStopService   | `transport/route_stop_service.py`   |
| VehicleService     | `transport/vehicle_service.py`      |
| TripService        | `transport/trip_service.py`         |
| StudentTripService | `transport/student_trip_service.py` |

### API Endpoints

| Endpoint File                        | Routes                                         |
| ------------------------------------ | ---------------------------------------------- |
| `academic_year_routes.py`            | `/api/v1/masters/academic-years/`              |
| `class_endpoints.py`                 | `/api/v1/masters/classes/`                     |
| `subject_routes.py`                  | `/api/v1/masters/subjects/`                    |
| `subject_category_endpoints.py`      | `/api/v1/masters/subject_categories/categories/` |
| `subject_category_endpoints.py`      | `/api/v1/subject-categories` (alias)           |
| `class_subject_mapping_endpoints.py` | `/api/v1/masters/class-subject-mappings/`      |
| `staff_endpoints.py`                 | `/api/v1/masters/staff/`                       |
| `parent_endpoints.py`                | `/api/v1/masters/parents/`                     |
| `holiday_endpoints.py`               | `/api/v1/masters/holidays/`                    |
| `timetable_routes.py`                | `/api/v1/masters/timetables/`                  |
| `transport/routes_endpoints.py`      | `/api/v1/masters/transport/routes/`            |
| `transport/route_stop_endpoints.py`  | `/api/v1/masters/transport/stops/`             |
| `transport/vehicle_endpoints.py`     | `/api/v1/masters/transport/vehicles/`          |
| `transport/trip_endpoints.py`        | `/api/v1/masters/transport/trips/`             |

---

## Data Model Summary

[EVIDENCE-BASED]

### AcademicYear

- `id` (UUID): Primary key
- `name`: Year name (e.g., "2024-25")
- `start_date`: Year start
- `end_date`: Year end
- `is_active`: Current year flag
- `is_default`: Default selection

### Class

- `id` (UUID): Primary key
- `name`: Class name (e.g., "Grade 10")
- `display_order`: Sort order
- `academic_year_id` (UUID FK): Academic year
- `is_active`: Status

### Section

- `id` (UUID): Primary key
- `class_id` (UUID FK): Parent class
- `name`: Section name (e.g., "A", "B")
- `capacity`: Maximum students
- `is_active`: Status

### Subject

- `id` (UUID): Primary key
- `name`: Subject name
- `code`: Subject code
- `category_id` (UUID FK): Subject category
- `is_active`: Status

### Staff

- `id` (UUID): Primary key
- `first_name`, `last_name`: Name
- `email`: Email address
- `phone`: Phone number
- `designation_id` (UUID FK): Designation
- `user_id` (UUID FK): User account
- `joining_date`: Employment start
- `is_active`: Status

### Parent

- `id` (UUID): Primary key
- `first_name`, `last_name`: Name
- `email`: Email address
- `phone`: Phone number
- `relationship`: Father/Mother/Guardian
- `user_id` (UUID FK): User account
- `is_active`: Status

---

## Invariants & Rules

[EVIDENCE-BASED]

### Academic Year

- Only one academic year can be `is_default = true`
- Date ranges should not overlap

Evidence: `context_guide.json:376-379`

### Class-Section Hierarchy

- Classes contain multiple sections
- Each section belongs to one class

Evidence: `context_guide.json:380-385`

### Class-Subject Mapping Rules

[EVIDENCE-BASED]

**Data Model (Updated 2025-12-28):**
- Subject mappings are now **section-specific**
- Each mapping links a subject to a specific class+section combination
- Unique constraint enforces: one subject per class+section+academic_year
- This allows different sections to have different subject assignments

**Bulk Operations:**
- Bulk endpoint supports upsert behavior (create/update/deactivate)
- When `section_id` is null: applies to ALL active sections in the class
- When `section_id` is provided: applies to that specific section only
- Subjects NOT in the request are automatically deactivated (`is_active=false`)

**Service Architecture:**
- `_process_section_mappings()`: Internal helper for single section processing
- `bulk_create_or_update_class_subject_mappings()`: Main entry point with multi-section support

Evidence: Database migration 2025-12-28, `class_subject_mapping_model.py`, `class_subject_mapping_service.py:47-235`

### Database Refresh Pattern Fixes

Fixed in this module:

- `academic_year_service.py` (create, update, deactivate)
- `subject_category_service.py` (create, update)

Evidence: `context_guide.json:696-701`

### Unfixed Refresh Pattern Issues

[EVIDENCE-BASED]

- `timetable_service.py` (9 instances) - HIGH PRIORITY
- `staff_service.py` (2 instances)
- `designation_service.py` (2 instances)
- `class_service.py` (1 instance)
- `class_subject_mapping_service.py` (3 instances)
- `parent_service.py` (2 instances)
- Transport services (15 instances total)

Evidence: `context_guide.json:713-730`

---

## Public Interfaces

[EVIDENCE-BASED]

### Academic Year Endpoints

```
GET    /api/v1/masters/academic-years/
POST   /api/v1/masters/academic-years/
GET    /api/v1/masters/academic-years/{id}
PUT    /api/v1/masters/academic-years/{id}
DELETE /api/v1/masters/academic-years/{id}
GET    /api/v1/masters/academic-years/dropdown
```

### Class Endpoints

```
GET    /api/v1/masters/classes/
POST   /api/v1/masters/classes/
GET    /api/v1/masters/classes/{id}
PUT    /api/v1/masters/classes/{id}
DELETE /api/v1/masters/classes/{id}
GET    /api/v1/masters/classes/dropdown
GET    /api/v1/masters/classes/{id}/sections
```

### Subject Endpoints

```
GET    /api/v1/masters/subjects/
POST   /api/v1/masters/subjects/
GET    /api/v1/masters/subjects/{id}
PUT    /api/v1/masters/subjects/{id}
DELETE /api/v1/masters/subjects/{id}
```

### Subject Category Endpoints

**Primary Endpoints** (under `/masters/subject_categories/categories`):

```
GET    /api/v1/masters/subject_categories/categories           # List all
POST   /api/v1/masters/subject_categories/categories           # Create
GET    /api/v1/masters/subject_categories/categories/dropdown  # Dropdown
GET    /api/v1/masters/subject_categories/categories/{id}      # Get by ID
PUT    /api/v1/masters/subject_categories/categories/{id}      # Update
DELETE /api/v1/masters/subject_categories/categories/{id}      # Delete
```

**Alias Endpoints** (Added 2025-12-28 for frontend inline creation):

```
GET    /api/v1/subject-categories    # List all (alias)
POST   /api/v1/subject-categories    # Create (alias)
```

**Note:** The alias endpoints at `/api/v1/subject-categories` were added to support inline category creation from the Subject creation form. They call the same service functions as the primary endpoints.

### Class Subject Mapping Endpoints

```
GET    /api/v1/masters/class-subject-mappings/           # List with filters
GET    /api/v1/masters/class-subject-mappings/by-class/{class_id}  # By class
GET    /api/v1/masters/class-subject-mappings/dropdown   # For dropdowns
POST   /api/v1/masters/class-subject-mappings/           # Single create
POST   /api/v1/masters/class-subject-mappings/bulk       # Bulk upsert
GET    /api/v1/masters/class-subject-mappings/{id}       # Get by ID
PUT    /api/v1/masters/class-subject-mappings/{id}       # Update
DELETE /api/v1/masters/class-subject-mappings/{id}       # Delete
```

**Bulk Endpoint Behavior (Updated 2025-12-28):**
- `section_id` is **optional** in request body
- If `section_id` is `null` or omitted: applies to ALL active sections
- Response includes `sections_processed` count
- Upsert: creates new, updates existing, deactivates missing subjects

### Staff Endpoints

```
GET    /api/v1/masters/staff/
POST   /api/v1/masters/staff/
GET    /api/v1/masters/staff/{id}
PUT    /api/v1/masters/staff/{id}
DELETE /api/v1/masters/staff/{id}

POST   /api/v1/masters/staff/enrollment/{staff_id}/photo   (Added 2026-04-22)
  - Upload staff profile photo (multipart/form-data, field "photo", max 2 MB, jpg/png/webp)
DELETE /api/v1/masters/staff/enrollment/{staff_id}/photo   (Added 2026-04-22)
  - Delete staff profile photo
```

**Staff photo field:** `photo_url` in `StaffEnrollmentOut` / `StaffOut` (validation_alias of DB column `photo`).
File stored at `media/staff/photos/{staff_id}.{ext}`. Frontend builds full URL same as student photos.

### Parent Endpoints

```
GET    /api/v1/masters/parents/
POST   /api/v1/masters/parents/
GET    /api/v1/masters/parents/{id}
PUT    /api/v1/masters/parents/{id}
DELETE /api/v1/masters/parents/{id}
```

### Transport Endpoints

```
GET/POST /api/v1/masters/transport/routes/
GET/POST /api/v1/masters/transport/stops/
GET/POST /api/v1/masters/transport/vehicles/
GET/POST /api/v1/masters/transport/trips/
```

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies

- Authentication Module (user accounts for staff/parents)
- Student Module (class/section assignments)
- Fee Module (class-based fee mapping)

### Downstream Consumers

- Student Management (uses classes, sections)
- Fee Management (uses classes, academic years)
- Reports (aggregates by class, academic year)

---

## Known Risks

[INFERENCE]

### Data Dependencies

1. **Cascade Effects**: Deleting class affects students, fee mappings
2. **Academic Year Switch**: Changing active year has system-wide impact

### Performance

1. **Timetable Queries**: Complex slot/subject relationships
2. **Transport Optimization**: Route planning complexity

### High Priority Fixes Needed

- Timetable service has 9 unfixed refresh pattern instances
- Transport services have 15 unfixed instances

---

## Test Coverage

[EVIDENCE-BASED]

- Academic year: 22 records in cos360_main
- Classes: 9 records in cos360_main
- Routes: 3 records
- Vehicles: 4 records

Evidence: `context_guide.json:306-311,518-525`

---

## Uncertainties

[UNCERTAIN]

1. **Timetable Generation**: Automatic timetable generation logic not visible
2. **Conflict Detection**: Schedule conflict detection not documented
3. **Staff Attendance Reports**: Attendance reporting capabilities unclear
4. **Transport Tracking**: Real-time vehicle tracking not observed

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
