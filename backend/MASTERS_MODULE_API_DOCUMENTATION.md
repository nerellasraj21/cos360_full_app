# Masters Module API Documentation

## Overview

The Masters Module provides comprehensive management of core educational entities and configurations. This module handles academic years, classes, sections, subjects, holidays, staff management, parent information, transportation, and timetable management.

## Base URL Structure

```
/masters/
/parents/
/staff/
/masters/routes/
/masters/vehicles/
/masters/trips/
/students/timetable/
/masters/subject_categories/
```

## Authentication

All endpoints require proper authentication. Include the authorization token in the request headers:

```
Authorization: Bearer <your-jwt-token>
```

---

# Academic Years Management

## Overview
Manage academic year configurations including start/end dates and active status.

### Base URL
```
/masters/academic_years
```

### Endpoints

#### 1. Create Academic Year

**Endpoint:** `POST /masters/academic_years/`

**Request Body:**
```json
{
  "title": "2023-2024",
  "start_date": "2023-04-01",
  "end_date": "2024-03-31",
  "is_active": true
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "2023-2024",
  "start_date": "2023-04-01",
  "end_date": "2024-03-31",
  "is_active": true
}
```

#### 2. Get Academic Year by ID

**Endpoint:** `GET /masters/academic_years/{academic_year_id}`

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "2023-2024",
  "start_date": "2023-04-01",
  "end_date": "2024-03-31",
  "is_active": true
}
```

#### 3. List Academic Years

**Endpoint:** `GET /masters/academic_years/`

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 10)
- `active_only` (optional): Filter active years only (default: true)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "2023-2024",
    "start_date": "2023-04-01",
    "end_date": "2024-03-31",
    "is_active": true
  }
]
```

#### 4. Update Academic Year

**Endpoint:** `PUT /masters/academic_years/{academic_year_id}`

**Request Body:**
```json
{
  "title": "2023-2024 Updated",
  "start_date": "2023-04-01",
  "end_date": "2024-03-31",
  "is_active": false
}
```

#### 5. Deactivate Academic Year

**Endpoint:** `DELETE /masters/academic_years/{academic_year_id}`

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "2023-2024",
  "start_date": "2023-04-01",
  "end_date": "2024-03-31",
  "is_active": false
}
```

---

# Classes and Sections Management

## Overview
Manage class and section hierarchies with comprehensive CRUD operations.

### Base URL
```
/masters/class_sections
```

### Endpoints

#### 1. Create Class with Sections

**Endpoint:** `POST /masters/class_sections/`

**Request Body:**
```json
{
  "name": "Class 10",
  "description": "Tenth Grade",
  "is_active": true,
  "short_code": "X",
  "academic_year_id": 1,
  "sections": [
    {
      "name": "Section A",
      "description": "Morning Section",
      "is_active": true
    },
    {
      "name": "Section B",
      "description": "Afternoon Section",
      "is_active": true
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "Class 10",
  "description": "Tenth Grade",
  "is_active": true,
  "short_code": "X",
  "academic_year_id": 1,
  "sections": [
    {
      "id": 1,
      "name": "Section A",
      "description": "Morning Section",
      "is_active": true,
      "class_id": 1
    },
    {
      "id": 2,
      "name": "Section B",
      "description": "Afternoon Section",
      "is_active": true,
      "class_id": 1
    }
  ]
}
```

#### 2. Get Class by ID

**Endpoint:** `GET /masters/class_sections/by_class_id/{class_id}`

#### 3. Get All Classes with Sections

**Endpoint:** `GET /masters/class_sections/read_all`

#### 4. Update Class with Sections

**Endpoint:** `PUT /masters/class_sections/{class_id}`

#### 5. Delete Class

**Endpoint:** `DELETE /masters/class_sections/{class_id}`

#### 6. Get Class-Section List

**Endpoint:** `GET /masters/class_sections/class-section-list`

**Response:** `200 OK`
```json
[
  {
    "class_id": 1,
    "class_name": "Class 10",
    "section_id": 1,
    "section_name": "Section A"
  }
]
```

#### 7. Get All Classes

**Endpoint:** `GET /masters/class_sections/class-list`

#### 8. Get All Sections

**Endpoint:** `GET /masters/class_sections/section-list`

#### 9. Get Sections by Class Name

**Endpoint:** `GET /masters/class_sections/sections-by-class-name`

**Query Parameters:**
- `class_name` (required): Name of the class

#### 10. Get Students by Class and Section

**Endpoint:** `GET /masters/class_sections/by-class-section`

**Query Parameters:**
- `class_name` (required): Class name (e.g., 'UKG')
- `section_name` (required): Section name (e.g., 'A')

---

# Subjects Management

## Overview
Manage academic subjects with category associations and academic year context.

### Base URL
```
/masters/subjects
```

### Endpoints

#### 1. Create Subject

**Endpoint:** `POST /masters/subjects/`

**Request Body:**
```json
{
  "subject_name": "Mathematics",
  "subject_code": "MATH101",
  "subject_category_id": 1,
  "academic_year_id": 1,
  "is_active": true
}
```

#### 2. Get Subject by ID

**Endpoint:** `GET /masters/subjects/{subject_id}`

#### 3. List Subjects

**Endpoint:** `GET /masters/subjects/`

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 100)
- `active_only` (optional): Filter active subjects only (default: true)
- `academic_year_id` (optional): Filter by academic year

#### 4. Update Subject

**Endpoint:** `PUT /masters/subjects/{subject_id}`

#### 5. Deactivate Subject

**Endpoint:** `DELETE /masters/subjects/{subject_id}`

#### 6. Get Subjects by Category

**Endpoint:** `GET /masters/subjects/categories/{category_id}/subjects`

---

# Subject Categories Management

### Base URL
```
/masters/subject_categories
```

### Endpoints

#### 1. Create Subject Category

**Endpoint:** `POST /masters/masters/subject_categories/categories`

**Request Body:**
```json
{
  "name": "Science"
}
```

#### 2. List Subject Categories

**Endpoint:** `GET /masters/masters/subject_categories/categories`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Science"
  },
  {
    "id": 2,
    "name": "Mathematics"
  }
]
```

---

# Holidays Management

## Overview
Manage holiday configurations with academic year associations.

### Base URL
```
/masters/holidays
```

### Endpoints

#### 1. Create Holiday

**Endpoint:** `POST /masters/holidays/`

**Request Body:**
```json
{
  "holiday_name": "Independence Day",
  "holiday_date": "2023-08-15",
  "holiday_type": "National",
  "academic_year_id": 1,
  "is_active": true
}
```

#### 2. Get Holiday by ID

**Endpoint:** `GET /masters/holidays/{holiday_id}`

#### 3. List Holidays

**Endpoint:** `GET /masters/holidays/`

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Maximum records to return (default: 10)
- `active_only` (optional): Filter active holidays only (default: true)
- `academic_year_id` (optional): Filter by academic year

#### 4. Update Holiday

**Endpoint:** `PUT /masters/holidays/{holiday_id}`

#### 5. Deactivate Holiday

**Endpoint:** `DELETE /masters/holidays/{holiday_id}`

#### 6. Activate Holiday

**Endpoint:** `PATCH /masters/holidays/{holiday_id}/activate`

---

# Parent Management

## Overview
Manage parent information and student associations.

### Base URL
```
/parents
```

### Endpoints

#### 1. Create Parent Profile

**Endpoint:** `POST /parents/`

**Request Body:**
```json
{
  "father_name": "John Smith",
  "mother_name": "Jane Smith",
  "father_phone": "+1234567890",
  "mother_phone": "+1234567891",
  "father_email": "john.smith@email.com",
  "mother_email": "jane.smith@email.com",
  "address": "123 Main Street, City",
  "father_occupation": "Engineer",
  "mother_occupation": "Doctor"
}
```

#### 2. Get Parent by ID

**Endpoint:** `GET /parents/{parent_id}`

#### 3. List All Parents

**Endpoint:** `GET /parents/`

#### 4. Update Parent Profile

**Endpoint:** `PATCH /parents/{parent_id}`

#### 5. Delete Parent Profile

**Endpoint:** `DELETE /parents/{parent_id}`

---

# Staff Management

## Overview
Comprehensive staff enrollment, attendance, and designation management.

### Base URL
```
/staff
```

### Endpoints

## Staff Enrollment

#### 1. Create Staff Enrollment

**Endpoint:** `POST /staff/enrollment`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@school.com",
  "phone": "+1234567890",
  "designation_id": 1,
  "hire_date": "2023-04-01",
  "salary": 50000.00,
  "is_active": true
}
```

#### 2. Update Staff Enrollment

**Endpoint:** `PATCH /staff/enrollment/{staff_id}`

#### 3. List Staff Enrollments

**Endpoint:** `GET /staff/enrollments`

#### 4. Get Staff Enrollment by ID

**Endpoint:** `GET /staff/enrollment/{staff_id}`

#### 5. Delete Staff Enrollment

**Endpoint:** `DELETE /staff/enrollment/{staff_id}`

## Staff Attendance

#### 1. Create Staff Attendance

**Endpoint:** `POST /staff/attendance`

**Request Body:**
```json
{
  "staff_id": 1,
  "attendance_date": "2023-10-01",
  "check_in_time": "09:00:00",
  "check_out_time": "17:00:00",
  "status": "present",
  "remarks": "On time"
}
```

#### 2. Update Staff Attendance

**Endpoint:** `PATCH /staff/attendance/{attendance_id}`

#### 3. List Staff Attendance

**Endpoint:** `GET /staff/attendance`

#### 4. Get Staff Attendance by ID

**Endpoint:** `GET /staff/attendance/{attendance_id}`

#### 5. Filter Staff Attendance by Date

**Endpoint:** `GET /staff/{staff_id}/attendance/filter`

**Query Parameters:**
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter

## Staff Filtering and Lists

#### 1. Get Staff List by Gender

**Endpoint:** `GET /staff/`

**Query Parameters:**
- `gender` (optional): Filter by gender (male/female/other)

#### 2. Get Staff by Designation

**Endpoint:** `GET /staff/by-designation`

**Query Parameters:**
- `designation_id` (optional): Filter by designation ID

#### 3. Get All Designations

**Endpoint:** `GET /staff/`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "designation_name": "Principal",
    "description": "School Principal"
  }
]
```

#### 4. Get All Drivers

**Endpoint:** `GET /staff/drivers`

---

# Transport Management

## Overview
Comprehensive transportation management including routes, vehicles, and trips.

## Routes Management

### Base URL
```
/masters/routes
```

### Endpoints

#### 1. Create Route

**Endpoint:** `POST /masters/routes/`

**Request Body:**
```json
{
  "route_name": "Route A",
  "route_code": "RTA",
  "start_location": "School",
  "end_location": "City Center",
  "distance_km": 15.5,
  "is_active": true
}
```

#### 2. Get All Routes

**Endpoint:** `GET /masters/routes/all_routes`

#### 3. Get Route by ID

**Endpoint:** `GET /masters/routes/routeid/{route_id}`

#### 4. Update Route

**Endpoint:** `PUT /masters/routes/{route_id}`

#### 5. Partial Update Route

**Endpoint:** `PATCH /masters/routes/{route_id}`

#### 6. Delete Route

**Endpoint:** `DELETE /masters/routes/{route_id}`

#### 7. Get Stops by Route Name

**Endpoint:** `GET /masters/routes/stops-by-route`

**Query Parameters:**
- `route_name` (required): Name of the route

## Vehicles Management

### Base URL
```
/masters/vehicles
```

### Endpoints

#### 1. Create Vehicle

**Endpoint:** `POST /masters/vehicles/`

**Request Body:**
```json
{
  "vehicle_number": "ABC-123",
  "vehicle_type": "Bus",
  "capacity": 50,
  "driver_id": 1,
  "is_active": true
}
```

#### 2. Get All Vehicles

**Endpoint:** `GET /masters/vehicles/`

#### 3. Get Vehicle by ID

**Endpoint:** `GET /masters/vehicles/{vehicle_id}`

#### 4. Update Vehicle

**Endpoint:** `PUT /masters/vehicles/{vehicle_id}`

#### 5. Partial Update Vehicle

**Endpoint:** `PATCH /masters/vehicles/{vehicle_id}`

#### 6. Delete Vehicle

**Endpoint:** `DELETE /masters/vehicles/{vehicle_id}`

## Trips Management

### Base URL
```
/masters/trips
```

### Endpoints

#### 1. Create Trip

**Endpoint:** `POST /masters/trips/`

**Request Body:**
```json
{
  "trip_name": "Morning Trip",
  "route_id": 1,
  "vehicle_id": 1,
  "start_time": "07:00:00",
  "end_time": "08:30:00",
  "trip_type": "pickup",
  "is_active": true
}
```

#### 2. Get All Trips

**Endpoint:** `GET /masters/trips/`

#### 3. Get Trip by ID

**Endpoint:** `GET /masters/trips/{trip_id}`

#### 4. Update Trip

**Endpoint:** `PUT /masters/trips/{trip_id}`

#### 5. Partial Update Trip

**Endpoint:** `PATCH /masters/trips/{trip_id}`

#### 6. Delete Trip

**Endpoint:** `DELETE /masters/trips/{trip_id}`

---

# Timetable Management

## Overview
Manage school timetables with bulk operations and section-based organization.

### Base URL
```
/students/timetable
```

### Endpoints

#### 1. Create Full Timetable

**Endpoint:** `POST /students/students/timetable/bulk`

**Request Body:**
```json
{
  "section_id": 1,
  "academic_year_id": 1,
  "timetable_slots": [
    {
      "day_of_week": "Monday",
      "period_number": 1,
      "subject_id": 1,
      "teacher_id": 1,
      "start_time": "09:00:00",
      "end_time": "09:45:00"
    }
  ]
}
```

#### 2. Get Timetable by Section

**Endpoint:** `GET /students/students/timetable/section/{section_id}`

**Response:** `200 OK`
```json
{
  "section_id": 1,
  "section_name": "Section A",
  "class_name": "Class 10",
  "timetable": {
    "Monday": [
      {
        "period_number": 1,
        "subject_name": "Mathematics",
        "teacher_name": "John Smith",
        "start_time": "09:00:00",
        "end_time": "09:45:00"
      }
    ]
  }
}
```

#### 3. Bulk Update Timetable Slots

**Endpoint:** `PATCH /students/students/timetable/timetable/slots/bulk`

**Request Body:**
```json
{
  "updates": [
    {
      "slot_id": 1,
      "subject_id": 2,
      "teacher_id": 3
    }
  ]
}
```

---

# Common Error Responses

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "An error occurred while processing the request"
}
```

---

# Data Models

## Academic Year
```json
{
  "id": "integer",
  "title": "string",
  "start_date": "date (YYYY-MM-DD)",
  "end_date": "date (YYYY-MM-DD)",
  "is_active": "boolean"
}
```

## Class with Sections
```json
{
  "id": "integer",
  "name": "string",
  "description": "string (optional)",
  "is_active": "boolean",
  "short_code": "string",
  "academic_year_id": "integer",
  "sections": [
    {
      "id": "integer",
      "name": "string",
      "description": "string (optional)",
      "is_active": "boolean",
      "class_id": "integer"
    }
  ]
}
```

## Subject
```json
{
  "id": "integer",
  "subject_name": "string",
  "subject_code": "string",
  "subject_category_id": "integer",
  "academic_year_id": "integer",
  "is_active": "boolean"
}
```

## Holiday
```json
{
  "id": "integer",
  "holiday_name": "string",
  "holiday_date": "date (YYYY-MM-DD)",
  "holiday_type": "string",
  "academic_year_id": "integer",
  "is_active": "boolean"
}
```

## Staff
```json
{
  "id": "integer",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "phone": "string",
  "designation_id": "integer",
  "hire_date": "date (YYYY-MM-DD)",
  "salary": "decimal",
  "is_active": "boolean"
}
```

## Transport Route
```json
{
  "id": "integer",
  "route_name": "string",
  "route_code": "string",
  "start_location": "string",
  "end_location": "string",
  "distance_km": "decimal",
  "is_active": "boolean"
}
```

---

# Usage Examples

## Creating a Complete Class Structure

```javascript
// Create class with sections
const classData = {
  name: "Class 10",
  description: "Tenth Grade",
  is_active: true,
  short_code: "X",
  academic_year_id: 1,
  sections: [
    {
      name: "Section A",
      description: "Morning Section",
      is_active: true
    },
    {
      name: "Section B", 
      description: "Afternoon Section",
      is_active: true
    }
  ]
};

const response = await fetch('/masters/class_sections/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(classData)
});

const newClass = await response.json();
```

## Managing Staff Attendance

```javascript
// Create staff attendance
const attendanceData = {
  staff_id: 1,
  attendance_date: "2023-10-01",
  check_in_time: "09:00:00",
  check_out_time: "17:00:00",
  status: "present",
  remarks: "On time"
};

const response = await fetch('/staff/attendance', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(attendanceData)
});
```

## Setting Up Transportation

```javascript
// Create route, then vehicle, then trip
const routeData = {
  route_name: "Route A",
  route_code: "RTA",
  start_location: "School",
  end_location: "City Center",
  distance_km: 15.5,
  is_active: true
};

// Step 1: Create route
const routeResponse = await fetch('/masters/routes/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(routeData)
});

const route = await routeResponse.json();

// Step 2: Create vehicle
const vehicleData = {
  vehicle_number: "ABC-123",
  vehicle_type: "Bus",
  capacity: 50,
  driver_id: 1,
  is_active: true
};

const vehicleResponse = await fetch('/masters/vehicles/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(vehicleData)
});

const vehicle = await vehicleResponse.json();

// Step 3: Create trip
const tripData = {
  trip_name: "Morning Trip",
  route_id: route.id,
  vehicle_id: vehicle.id,
  start_time: "07:00:00",
  end_time: "08:30:00",
  trip_type: "pickup",
  is_active: true
};

const tripResponse = await fetch('/masters/trips/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(tripData)
});
```

---

# Integration Notes for UI Developers

## Form Validation
- Validate date formats (YYYY-MM-DD)
- Ensure required fields are provided
- Validate email formats for staff and parents
- Check numeric constraints (capacity, salary, etc.)

## Data Relationships
- Academic Year is the foundation for most entities
- Classes require Academic Year association
- Sections belong to Classes
- Subjects are tied to Academic Years and Categories
- Staff attendance requires existing staff enrollment
- Transportation entities are interconnected (Route → Vehicle → Trip)

## Filtering and Search
- Use query parameters for efficient filtering
- Implement pagination for large datasets
- Cache frequently used data like academic years and designations

## Error Handling
- Handle validation errors with field-specific messaging
- Implement retry logic for network failures
- Show user-friendly messages for common scenarios

## Performance Considerations
- Use bulk operations for timetable management
- Implement lazy loading for large class/section lists
- Consider caching for relatively static data (holidays, routes)

## Rate Limiting
API requests are subject to rate limiting:
- 100 requests per minute per user
- 1000 requests per hour per organization

---

# Support

For technical support or questions about the Masters Module API, contact the development team or refer to the main API documentation.