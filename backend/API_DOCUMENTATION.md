# COS360 API Documentation for Frontend Developers

## Base URL
```
http://localhost:8003
```

## Authentication
All protected endpoints require JWT authentication in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Tenant Header
All requests must include the tenant identifier:
```
X-Client-Name: test_tenant
```

## Response Format
All endpoints return JSON responses with appropriate HTTP status codes:
- `200` - Success (GET requests)
- `201` - Created (POST requests)  
- `401` - Unauthorized (Missing/invalid token)
- `402` - Payment Required (Plan limitation - upgrade needed)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

## Plan-Based Access Control (NEW)
All endpoints now support subscription-based access control with 4 plan tiers:

### Plan Tiers
- **Basic Plan** (Free): 6 limited resources, read-only access to core features
- **Standard Plan**: 20 resources, full fee management, basic transport
- **Premium Plan**: 23 resources, advanced features, timetable management
- **Enterprise Plan**: 27 resources, complete access including admin features

### Plan Limitation Responses
When a user's plan doesn't support a feature, endpoints return HTTP 402 with upgrade information:

```json
{
  "error": "plan_limitation",
  "message": "This feature requires a Premium plan upgrade",
  "current_plan": "Basic",
  "required_plan": "Premium",
  "resource": "academic_years",
  "action": "create",
  "upgrade_available": true
}
```

---

# 🔐 Authentication Endpoints

## Get Test JWT Tokens
For development purposes, you can get test tokens:

### Admin Token
```http
GET /api/v1/auth/test-jwt/admin-token
```
**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "sub": "550e8400-e29b-41d4-a716-446655440001",
    "username": "admin@test.com",
    "role": "Admin",
    "client_name": "test_tenant"
  }
}
```

### Student Token  
```http
GET /api/v1/auth/test-jwt/student-token
```
**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "sub": "550e8400-e29b-41d4-a716-446655440003",
    "username": "student@test.com", 
    "role": "Student",
    "client_name": "test_tenant"
  }
}
```

---

# 🎓 Academic Years Module

Base path: `/api/v1/masters/academic_years`

## Permissions
- **Admin**: Full CRUD access
- **Teacher**: Read + List only
- **Student**: Read + List only

## Endpoints

### Create Academic Year
```http
POST /api/v1/masters/academic_years/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "title": "Academic Year 2025-26",
  "start_date": "2025-04-01", 
  "end_date": "2026-03-31",
  "is_active": true
}
```
**Response (201):**
```json
{
  "id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "title": "Academic Year 2025-26",
  "start_date": "2025-04-01",
  "end_date": "2026-03-31", 
  "is_active": true
}
```

### Get All Academic Years
```http
GET /api/v1/masters/academic_years/
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Response (200):**
```json
[
  {
    "id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
    "title": "Academic Year 2025-26",
    "start_date": "2025-04-01",
    "end_date": "2026-03-31",
    "is_active": true
  }
]
```

### Get Academic Years Dropdown
```http
GET /api/v1/masters/academic_years/dropdown
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Response (200):**
```json
[
  {
    "id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
    "title": "Academic Year 2025-26"
  }
]
```

### Get Single Academic Year
```http
GET /api/v1/masters/academic_years/{id}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Update Academic Year
```http
PUT /api/v1/masters/academic_years/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "title": "Updated Academic Year 2025-26",
  "start_date": "2025-04-01",
  "end_date": "2026-03-31",
  "is_active": false
}
```

### Delete Academic Year
```http
DELETE /api/v1/masters/academic_years/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

---

# 💰 Fee Management Module - WITH PLAN-BASED FILTERING ✅

## Multi-Layer Access Control (UPDATED 2025-09-07)
All Fee module endpoints now enforce **plan-based filtering** in addition to role-based permissions:

### Security Layers
1. **JWT Authentication** - Valid bearer token required
2. **Role-Based Permissions** - Role must have access to resource:action
3. **Plan-Based Filtering** - Tenant's subscription plan must support feature

### Role Permissions (All Fee Endpoints)
- **Admin**: Full CRUD access (Create, Read, Update, Delete, List)
- **Teacher**: Read + List only
- **Student**: Read + List only

### Plan-Based Feature Availability
- **Basic Plan**: No access to fee management (premium business feature)
- **Standard Plan**: Full access to fee categories, types, terms, mappings
- **Premium Plan**: All Standard features + advanced fee reporting
- **Enterprise Plan**: All features including bulk fee operations

### Plan Limitation Examples
When a Basic plan user tries to access fee management:
```json
{
  "error": "plan_limitation",
  "message": "Fee management requires a Standard plan upgrade", 
  "current_plan": "Basic",
  "required_plan": "Standard",
  "resource": "fee_categories",
  "action": "list",
  "upgrade_available": true
}
```

---

## Fee Categories

Base path: `/api/v1/fee/categories`
**Resource:** `fee_categories` | **Multi-Layer Security:** ✅

### Create Fee Category
```http
POST /api/v1/fee/categories/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Permission Required:** Admin only ⚠️
**Plan Required:** Standard+ 💳
**Body:**
```json
{
  "category_name": "Tuition Fees",
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "is_active": true
}
```
**Response (201):**
```json
{
  "id": "a6a56517-d1a7-4b8d-9b25-860b53fd4f03",
  "category_name": "Tuition Fees",
  "category_status": "active",
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "academic_year_title": "Academic Year 2025-26"
}
```

### Get All Fee Categories  
```http
GET /api/v1/fee/categories/
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Plan Required:** Standard+ 💳
**Response (200):**
```json
[
  {
    "id": "a6a56517-d1a7-4b8d-9b25-860b53fd4f03",
    "category_name": "Tuition Fees",
    "category_status": "active",
    "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
    "academic_year_title": "Academic Year 2025-26"
  }
]
```

### Get Fee Categories Dropdown
```http
GET /api/v1/fee/categories/dropdown?academic_year_id={id}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Plan Required:** Standard+ 💳
**Query Parameters:**
- `academic_year_id` (optional): Filter by academic year ID

**Response (200):**
```json
[
  {
    "id": "a6a56517-d1a7-4b8d-9b25-860b53fd4f03",
    "category_name": "Tuition Fees"
  }
]
```

### Get Single Fee Category
```http
GET /api/v1/fee/categories/{id}
```

### Update Fee Category  
```http
PUT /api/v1/fee/categories/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Permission Required:** Admin only ⚠️
**Plan Required:** Standard+ 💳

### Delete Fee Category
```http
DELETE /api/v1/fee/categories/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```
**Permission Required:** Admin only ⚠️
**Plan Required:** Standard+ 💳

---

## Fee Types

Base path: `/api/v1/fee/types`
**Resource:** `fee_types` | **Multi-Layer Security:** ✅

### Create Fee Type
```http
POST /api/v1/fee/types/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Permission Required:** Admin only ⚠️
**Plan Required:** Standard+ 💳
**Body:**
```json
{
  "type_name": "Monthly Tuition",
  "fee_category_id": "a6a56517-d1a7-4b8d-9b25-860b53fd4f03",
  "fee_term_id": "term_uuid_here",
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "is_active": true
}
```

### Get All Fee Types
```http
GET /api/v1/fee/types/
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Fee Types Dropdown
```http
GET /api/v1/fee/types/dropdown?fee_category_id={id}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Query Parameters:**
- `fee_category_id` (optional): Filter by fee category ID

### Get Single Fee Type
```http
GET /api/v1/fee/types/{id}
```

### Update Fee Type
```http
PUT /api/v1/fee/types/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

### Delete Fee Type
```http
DELETE /api/v1/fee/types/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

---

## Fee Terms

Base path: `/api/v1/fee/terms`

### Create Fee Term
```http
POST /api/v1/fee/terms/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "term_name": "Monthly",
  "fee_type_id": "fee_type_uuid_here",
  "dates": [
    {
      "due_date": "2025-04-15",
      "late_fee": 100.00
    },
    {
      "due_date": "2025-05-15", 
      "late_fee": 100.00
    }
  ]
}
```

### Get All Fee Terms
```http
GET /api/v1/fee/terms/
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Single Fee Term
```http
GET /api/v1/fee/terms/{id}
```

### Update Fee Term
```http
PUT /api/v1/fee/terms/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

### Delete Fee Term
```http
DELETE /api/v1/fee/terms/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

### Delete Fee Term Date
```http
DELETE /api/v1/fee/terms/dates/{fee_term_date_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

---

## Fee Class Mappings

Base path: `/api/v1/fee/class-mappings`

### Create Fee Class Mapping
```http
POST /api/v1/fee/class-mappings/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "class_id": 1,
  "fee_type_id": "fee_type_uuid_here",
  "total_fee": 5000.00,
  "all_by_default": true
}
```

### Get All Fee Class Mappings
```http
GET /api/v1/fee/class-mappings/?class_id={id}&fee_type_id={id}&all_by_default={bool}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Query Parameters:**
- `class_id` (optional): Filter by class ID
- `fee_type_id` (optional): Filter by fee type ID  
- `all_by_default` (optional): Filter by all_by_default flag

### Get Single Fee Class Mapping
```http
GET /api/v1/fee/class-mappings/{id}
```

### Update Fee Class Mapping
```http
PUT /api/v1/fee/class-mappings/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

### Delete Fee Class Mapping
```http
DELETE /api/v1/fee/class-mappings/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

---

## Fee Student Mappings

Base path: `/api/v1/fee/student-mappings`

### Create Fee Student Mapping
```http
POST /api/v1/fee/student-mappings/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "student_id": 1,
  "fee_type_id": "fee_type_uuid_here",
  "total_fee": 6000.00,
  "class_id": 1,
  "section_id": 1,
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90"
}
```

### Get All Fee Student Mappings
```http
GET /api/v1/fee/student-mappings/?student_id={id}&class_id={id}&section_id={id}&fee_type_id={id}&academic_year_id={id}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Query Parameters:**
- `student_id` (optional): Filter by student ID
- `class_id` (optional): Filter by class ID
- `section_id` (optional): Filter by section ID
- `fee_type_id` (optional): Filter by fee type ID
- `academic_year_id` (optional): Filter by academic year ID

### Get Single Fee Student Mapping
```http
GET /api/v1/fee/student-mappings/{id}
```

### Update Fee Student Mapping
```http
PUT /api/v1/fee/student-mappings/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

### Delete Fee Student Mapping
```http
DELETE /api/v1/fee/student-mappings/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

---

# 🔒 Permission System

## Role-Based Access Control

### Admin Role
- **Full Access**: Can perform all CRUD operations on all endpoints
- **Resources**: academic_years, fee_categories, fee_types, fee_terms, fee_class_mappings, fee_student_mappings
- **Actions**: create, read, update, delete, list

### Teacher Role  
- **Limited Access**: Can only read and list resources
- **Resources**: academic_years, fee_categories, fee_types, fee_terms, fee_class_mappings, fee_student_mappings
- **Actions**: read, list

### Student Role
- **Limited Access**: Can only read and list resources  
- **Resources**: academic_years, fee_categories, fee_types, fee_terms, fee_class_mappings, fee_student_mappings
- **Actions**: read, list

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "Authorization header missing or invalid"
}
```

### 403 Forbidden
```json
{
  "detail": "Insufficient permissions: Student cannot create fee_categories"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "category_name"],
      "msg": "Field required",
      "input": {...}
    }
  ]
}
```

---

# 🚀 Quick Start for Frontend Developers

## 1. Get Authentication Token
```javascript
// Get admin token for testing
const response = await fetch('http://localhost:8003/api/v1/auth/test-jwt/admin-token');
const { access_token } = await response.json();
```

## 2. Make Authenticated Requests
```javascript
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'X-Client-Name': 'test_tenant',
  'Content-Type': 'application/json'
};

// Get all academic years
const academicYears = await fetch('http://localhost:8003/api/v1/masters/academic_years/', {
  headers
}).then(res => res.json());

// Create fee category
const newCategory = await fetch('http://localhost:8003/api/v1/fee/categories/', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    category_name: 'Test Category',
    academic_year_id: academicYears[0].id,
    is_active: true
  })
}).then(res => res.json());
```

## 3. Handle Permission Errors
```javascript
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Client-Name': 'test_tenant',
      ...options.headers
    },
    ...options
  });

  if (response.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (response.status === 403) {
    // Show permission error
    alert('You do not have permission to perform this action');
  }

  return response.json();
}
```

---

# 📊 Current Implementation Status

## ✅ Fully Implemented & Tested
- **Academic Years Module**: `/api/v1/masters/academic_years/`
- **Fee Categories**: `/api/v1/fee/categories/`
- **Fee Types**: `/api/v1/fee/types/`
- **Fee Terms**: `/api/v1/fee/terms/`
- **Fee Class Mappings**: `/api/v1/fee/class-mappings/`
- **Fee Student Mappings**: `/api/v1/fee/student-mappings/`

# 🎓 Masters Module - WITH PLAN-BASED FILTERING ✅

## Multi-Layer Access Control (UPDATED 2025-09-07)
All Masters module endpoints now enforce **plan-based filtering** in addition to role-based permissions:

### Security Layers
1. **JWT Authentication** - Valid bearer token required
2. **Role-Based Permissions** - Role must have access to resource:action
3. **Plan-Based Filtering** - Tenant's subscription plan must support feature

### Role Permissions (All Masters Endpoints)
- **Admin**: Full CRUD access (Create, Read, Update, Delete, List)
- **Teacher**: Read + List only  
- **Student**: Read + List only

### Plan-Based Feature Availability
- **Basic Plan**: Limited read access to core resources only
- **Standard Plan**: Full access to classes, subjects, holidays, staff
- **Premium Plan**: All Standard features + timetable management
- **Enterprise Plan**: All features including advanced configurations

### Plan Limitation Examples
When a Basic plan user tries to create a class:
```json
{
  "error": "plan_limitation",
  "message": "This feature requires a Standard plan upgrade", 
  "current_plan": "Basic",
  "required_plan": "Standard",
  "resource": "classes",
  "action": "create",
  "upgrade_available": true
}
```

---

## Classes & Sections

Base path: `/api/v1/masters/class_sections`

### Create Class with Sections
```http
POST /api/v1/masters/class_sections/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "class_name": "Class 10",
  "sections": [
    {"section_name": "A"},
    {"section_name": "B"}
  ]
}
```

### Get All Classes with Sections
```http
GET /api/v1/masters/class_sections/read_all
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Classes Dropdown
```http
GET /api/v1/masters/class_sections/dropdown?active_only=true
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Class by ID
```http
GET /api/v1/masters/class_sections/by_class_id/{class_id}
```

### Update Class
```http
PUT /api/v1/masters/class_sections/{class_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

### Delete Class
```http
DELETE /api/v1/masters/class_sections/{class_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

### Get Class-Section List
```http
GET /api/v1/masters/class_sections/class-section-list
```

### Get All Classes (Simple List)
```http
GET /api/v1/masters/class_sections/class-list
```

### Get All Sections
```http
GET /api/v1/masters/class_sections/section-list
```

### Get Sections by Class ID
```http
GET /api/v1/masters/class_sections/by_class_id/{class_id}/sections
```

---

## Staff Management  

Base path: `/api/v1/staff`

### Staff Enrollment

#### Create Staff Enrollment
```http
POST /api/v1/staff/enrollment
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "staff_name": "John Doe",
  "designation_id": 1,
  "department": "Mathematics",
  "joining_date": "2025-01-01",
  "contact_number": "+1234567890",
  "email": "john.doe@school.com"
}
```

#### Get All Staff Enrollments
```http
GET /api/v1/staff/enrollments
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

#### Get Staff Enrollment by ID
```http
GET /api/v1/staff/enrollment/{staff_id}
```

#### Update Staff Enrollment
```http
PATCH /api/v1/staff/enrollment/{staff_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

#### Delete Staff Enrollment
```http
DELETE /api/v1/staff/enrollment/{staff_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

### Staff Lists

#### Get All Staff
```http
GET /api/v1/staff/?gender={gender}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Query Parameters:**
- `gender` (optional): male, female, other

#### Get Staff by Designation
```http
GET /api/v1/staff/by-designation?designation_id={id}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Staff Attendance Endpoints
All staff attendance endpoints follow similar patterns with appropriate permission checks.

---

## Subjects

Base path: `/api/v1/masters/subjects`

### Create Subject
```http
POST /api/v1/masters/subjects/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "name": "Mathematics",
  "category_id": 1,
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "is_active": true
}
```

### Get All Subjects
```http
GET /api/v1/masters/subjects/?skip=0&limit=100&active_only=true&academic_year_id={id}
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```
**Query Parameters:**
- `skip` (optional): Number of records to skip
- `limit` (optional): Number of records to return
- `active_only` (optional): Filter active subjects only
- `academic_year_id` (optional): Filter by academic year

### Get Subjects Dropdown
```http
GET /api/v1/masters/subjects/dropdown?active_only=true
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Subject by ID
```http
GET /api/v1/masters/subjects/{subject_id}
```

### Update Subject
```http
PUT /api/v1/masters/subjects/{subject_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```

### Delete Subject
```http
DELETE /api/v1/masters/subjects/{subject_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
```

### Get Subjects by Category
```http
GET /api/v1/masters/subjects/categories/{category_id}/subjects
```

### Get Subjects by Category (Dropdown)
```http
GET /api/v1/masters/subjects/categories/{category_id}/subjects/dropdown
```

---

## Subject Categories

Base path: `/api/v1/masters/subject_categories`

### Create Subject Category
```http
POST /api/v1/masters/subject_categories/categories
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "name": "Science",
  "description": "Science subjects category"
}
```

### Get All Subject Categories
```http
GET /api/v1/masters/subject_categories/categories
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Subject Categories Dropdown
```http
GET /api/v1/masters/subject_categories/categories/dropdown
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

---

# 🚌 Transport Module

## Permissions (All Transport Endpoints)
- **Admin**: Full CRUD access (Create, Read, Update, Delete, List)
- **Teacher**: Read + List only
- **Student**: Read + List only

---

## Routes

Base path: `/api/v1/masters/routes`

### Create Route
```http
POST /api/v1/masters/routes/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "route_name": "Route A",
  "starting_stop": "School Gate",
  "ending_stop": "City Center",
  "number_of_stops": 8,
  "route_type": "Regular",
  "trip_type": "Round Trip",
  "start_time": "07:00:00",
  "end_time": "08:30:00",
  "is_active": true
}
```

### Get All Routes
```http
GET /api/v1/masters/routes/all_routes
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Routes Dropdown
```http
GET /api/v1/masters/routes/dropdown?active_only=true
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Route by ID
```http
GET /api/v1/masters/routes/routeid/{route_id}
```

### Get Stops by Route Name
```http
GET /api/v1/masters/routes/stops-by-route?route_name=Route A
```

### Update Route (Full)
```http
PUT /api/v1/masters/routes/{route_id}
```

### Update Route (Partial)
```http
PATCH /api/v1/masters/routes/{route_id}
```

### Delete Route
```http
DELETE /api/v1/masters/routes/{route_id}
```

---

## Vehicles

Base path: `/api/v1/masters/vehicles`

### Create Vehicle
```http
POST /api/v1/masters/vehicles/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "name": "School Bus 1",
  "registration_number": "MH-12-AB-1234",
  "vehicle_type": "Bus",
  "last_inspected_date": "2024-01-15",
  "pollution_renewal_date": "2024-12-31",
  "is_active": true
}
```

### Get All Vehicles
```http
GET /api/v1/masters/vehicles/
```
**Headers:**
```
Authorization: Bearer <token>
X-Client-Name: test_tenant
```

### Get Vehicle by ID
```http
GET /api/v1/masters/vehicles/{vehicle_id}
```

### Update Vehicle (Full)
```http
PUT /api/v1/masters/vehicles/{vehicle_id}
```

### Update Vehicle (Partial)  
```http
PATCH /api/v1/masters/vehicles/{vehicle_id}
```

### Delete Vehicle
```http
DELETE /api/v1/masters/vehicles/{vehicle_id}
```

---

## Route Stops

Base path: `/api/v1/masters/route-stops`

### Create Route Stop
```http
POST /api/v1/masters/route-stops/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "stop_name": "Main Square",
  "stop_address": "123 Main Street, City",
  "stop_coordinates": "18.5204,73.8567",
  "route_id": 1,
  "stop_order": 3,
  "estimated_arrival_time": "07:15:00",
  "is_active": true
}
```

### Get All Route Stops
```http
GET /api/v1/masters/route-stops/
```

### Get Route Stop by ID
```http
GET /api/v1/masters/route-stops/{stop_id}
```

### Update Route Stop (Full)
```http
PUT /api/v1/masters/route-stops/{stop_id}
```

### Update Route Stop (Partial)
```http
PATCH /api/v1/masters/route-stops/{stop_id}
```

### Delete Route Stop
```http
DELETE /api/v1/masters/route-stops/{stop_id}
```

---

## Student Transport Assignments

Base path: `/api/v1/students/student-transport`

### Assign Student to Transport
```http
POST /api/v1/students/student-transport/
```
**Headers:**
```
Authorization: Bearer <admin_token>
X-Client-Name: test_tenant
Content-Type: application/json
```
**Body:**
```json
{
  "student_id": 123,
  "route_id": 1,
  "stop_id": 5,
  "pickup_time": "07:15:00",
  "drop_time": "15:30:00",
  "is_active": true
}
```

### Get All Student Transport Assignments
```http
GET /api/v1/students/student-transport/
```

### Get Transport Assignments by Student
```http
GET /api/v1/students/student-transport/student/{student_id}
```

### Update Transport Assignment
```http
PATCH /api/v1/students/student-transport/{transport_id}
```

### Remove Student from Transport
```http
DELETE /api/v1/students/student-transport/{transport_id}
```

---

# 👨‍🎓 Student Module - WITH PLAN-BASED FILTERING ✅

## Multi-Layer Access Control (UPDATED 2025-09-07)
All Student module endpoints now enforce **plan-based filtering** in addition to role-based permissions:

### Security Layers
1. **JWT Authentication** - Valid bearer token required
2. **Role-Based Permissions** - Role must have access to resource:action
3. **Plan-Based Filtering** - Tenant's subscription plan must support feature

### Role Permissions (All Student Endpoints)
- **Admin**: Full CRUD access (Create, Read, Update, Delete, List)
- **Teacher**: Read + List only  
- **Student**: Read + List only

### Plan-Based Feature Availability
- **Basic Plan**: Limited read access to core student features
- **Standard Plan**: Full access to admissions, attendance, certificates
- **Premium Plan**: All Standard features + advanced document management
- **Enterprise Plan**: All features including student transport assignments

### Plan Limitation Examples
When a Basic plan user tries to create student admission:
```json
{
  "error": "plan_limitation",
  "message": "This feature requires a Standard plan upgrade", 
  "current_plan": "Basic",
  "required_plan": "Standard",
  "resource": "student_admissions",
  "action": "create",
  "upgrade_available": true
}
```

---

## Student Admissions 
**Base URL:** `/api/v1/students/admission`  
**Resource:** `student_admissions` | **Multi-Layer Security:** ✅

### Create Admission
```http
POST /api/v1/students/admission/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "student_name": "John Doe",
  "admission_number": "2024001",
  "class_id": "uuid",
  "admission_date": "2024-09-01"
}
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### Get Admission by Student ID
```http
GET /api/v1/students/admission/id/{student_id}
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### Update Admission
```http
PATCH /api/v1/students/admission/{student_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### Get Student by Admission ID
```http
GET /api/v1/students/admission/by-admission/{admission_id}
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### Search Students
```http
GET /api/v1/students/admission/search?query=john
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

## Student Attendance
**Base URL:** `/api/v1/student/attendance`  
**Resource:** `student_attendance` | **Multi-Layer Security:** ✅

### Create Attendance
```http
POST /api/v1/student/attendance/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "student_id": "uuid",
  "date": "2024-09-07",
  "status": "present",
  "remarks": "On time"
}
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### List All Attendance
```http
GET /api/v1/student/attendance/
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### Get Attendance by ID
```http
GET /api/v1/student/attendance/{attendance_id}
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### Update Attendance
```http
PATCH /api/v1/student/attendance/{attendance_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### Delete Attendance
```http
DELETE /api/v1/student/attendance/{attendance_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

## Student Certificates
**Base URL:** `/api/v1/student/certificates`  
**Resource:** `student_certificates` | **Multi-Layer Security:** ✅

### Upload Certificate
```http
POST /api/v1/student/certificates/
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

student_id: 123
certificate_type_id: 1
issue_date: 2024-09-01
description: "Academic Excellence"
certificate_file: [file upload]
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### List All Certificates
```http
GET /api/v1/student/certificates/
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### Get Certificate by ID
```http
GET /api/v1/student/certificates/certificateid/{certificate_id}
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### Update Certificate
```http
PATCH /api/v1/student/certificates/{certificate_id}
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### Delete Certificate
```http
DELETE /api/v1/student/certificates/{certificate_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Standard+ 💳

### Download Certificate File
```http
GET /api/v1/student/certificates/certificates/{certificate_id}/download
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### List Certificates for Student
```http
GET /api/v1/student/certificates/student/{student_id}
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

### List Certificate Types
```http
GET /api/v1/student/certificates/certificate-types
Authorization: Bearer <token>
```
**Plan Required:** Basic+ 💳

## Student Documents
**Base URL:** `/api/v1/students/documents`  
**Resource:** `student_documents` | **Multi-Layer Security:** ✅

### Upload Document
```http
POST /api/v1/students/documents/
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

student_id: 123
document_type: "Birth Certificate"
document_file: [file upload]
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Premium+ 💳

### List Documents by Student
```http
GET /api/v1/students/documents/?student_id={student_id}
Authorization: Bearer <token>
```
**Plan Required:** Standard+ 💳

### Get Document by ID
```http
GET /api/v1/students/documents/{document_id}
Authorization: Bearer <token>
```
**Plan Required:** Standard+ 💳

### Update Document
```http
PATCH /api/v1/students/documents/{document_id}
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Premium+ 💳

### Delete Document
```http
DELETE /api/v1/students/documents/{document_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Premium+ 💳

## Student Transport Assignments
**Base URL:** `/api/v1/students/student-transport`  
**Resource:** `student_transport` | **Multi-Layer Security:** ✅

### Create Transport Assignment
```http
POST /api/v1/students/student-transport/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "student_id": 123,
  "route_id": 1,
  "stop_id": 5,
  "pickup_time": "07:15:00",
  "drop_time": "15:30:00",
  "is_active": true
}
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Enterprise 💳

### List All Transport Assignments
```http
GET /api/v1/students/student-transport/
Authorization: Bearer <token>
```
**Plan Required:** Premium+ 💳

### Get Transport by Student
```http
GET /api/v1/students/student-transport/student/{student_id}
Authorization: Bearer <token>
```
**Plan Required:** Premium+ 💳

### Update Transport Assignment
```http
PATCH /api/v1/students/student-transport/{transport_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Enterprise 💳

### Delete Transport Assignment
```http
DELETE /api/v1/students/student-transport/{transport_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️  
**Plan Required:** Enterprise 💳

# 👨‍👩‍👧‍👦 Additional Masters Modules - SECURED ✅

## Parent Management
**Base URL:** `/api/v1/parents`  
**Permissions:** Admin (full CRUD), Teacher/Student (read only)

### Create Parent Profile
```http
POST /api/v1/parents/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "address": "123 Main St"
}
```
**Permission Required:** Admin only ⚠️

### List All Parents
```http
GET /api/v1/parents/
Authorization: Bearer <token>
```

### Get Parent by ID
```http
GET /api/v1/parents/{parent_id}
Authorization: Bearer <token>
```

### Update Parent Profile
```http
PATCH /api/v1/parents/{parent_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

### Delete Parent Profile
```http
DELETE /api/v1/parents/{parent_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

## Holiday Management
**Base URL:** `/api/v1/masters/holidays`  
**Permissions:** Admin (full CRUD), Teacher/Student (read only)

### Create Holiday
```http
POST /api/v1/masters/holidays/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Christmas Day",
  "start_date": "2024-12-25",
  "end_date": "2024-12-25",
  "is_active": true,
  "academic_year_id": "uuid"
}
```
**Permission Required:** Admin only ⚠️

### List Holidays
```http
GET /api/v1/masters/holidays/?skip=0&limit=10&active_only=true&academic_year_id=<uuid>
Authorization: Bearer <token>
```

### Get Holidays Dropdown
```http
GET /api/v1/masters/holidays/dropdown?active_only=true
Authorization: Bearer <token>
```

### Get Holiday by ID
```http
GET /api/v1/masters/holidays/{holiday_id}
Authorization: Bearer <token>
```

### Update Holiday
```http
PUT /api/v1/masters/holidays/{holiday_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

### Deactivate Holiday
```http
DELETE /api/v1/masters/holidays/{holiday_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

### Activate Holiday
```http
PATCH /api/v1/masters/holidays/{holiday_id}/activate
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

## Timetable Management
**Base URL:** `/api/v1/students/timetable`  
**Permissions:** Admin (full CRUD), Teacher/Student (read only)

### Create Full Timetable
```http
POST /api/v1/students/timetable/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "section_id": "uuid",
  "academic_year_id": "uuid",
  "timetable_slots": [...]
}
```
**Permission Required:** Admin only ⚠️

### Get Timetable by Section
```http
GET /api/v1/students/timetable/section/{section_id}
Authorization: Bearer <token>
```

### Bulk Update Timetable Slots
```http
PATCH /api/v1/students/timetable/timetable/slots/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "slot_updates": [...]
}
```
**Permission Required:** Admin only ⚠️

# 🚌 Additional Transport & 💰 Fee Term Modules - SECURED ✅

## Transport Trip Management
**Base URL:** `/api/v1/masters/trips`  
**Permissions:** Admin (full CRUD), Teacher/Student (read only)

### Create Trip
```http
POST /api/v1/masters/trips/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Morning Route",
  "route_id": 1,
  "vehicle_id": 1,
  "driver_id": 1,
  "trip_number": 123
}
```
**Permission Required:** Admin only ⚠️

### List All Trips
```http
GET /api/v1/masters/trips/
Authorization: Bearer <token>
```

### Get Trip by ID
```http
GET /api/v1/masters/trips/{trip_id}
Authorization: Bearer <token>
```

### Update Trip
```http
PUT /api/v1/masters/trips/{trip_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

### Partial Update Trip
```http
PATCH /api/v1/masters/trips/{trip_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

### Delete Trip
```http
DELETE /api/v1/masters/trips/{trip_id}
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

## Fee Class Term Amounts (Bulk Operations)
**Base URL:** `/api/v1/fee/class-mapping-term-amounts`  
**Permissions:** Admin only (highly sensitive financial operations)

### Bulk Create Fee Term Amounts
```http
POST /api/v1/fee/class-mapping-term-amounts/
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fee_class_mapping_id": "uuid",
  "term_amounts": [
    {"fee_term_id": "uuid", "amount": 1500.00},
    {"fee_term_id": "uuid", "amount": 1200.00}
  ]
}
```
**Permission Required:** Admin only ⚠️

### Bulk Update Fee Term Amounts
```http
PUT /api/v1/fee/class-mapping-term-amounts/
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

### Bulk Delete Fee Term Amounts
```http
DELETE /api/v1/fee/class-mapping-term-amounts/
Authorization: Bearer <admin_token>
```
**Permission Required:** Admin only ⚠️

# 🔐 Auth Module - SECURED ✅ (Plan-Based Filtering Applied)

**Plan Access Levels:**
- **Basic Plan**: ❌ No access (Admin features)
- **Standard Plan**: ❌ No access (Admin features)
- **Premium Plan**: ❌ No access (Admin features)
- **Enterprise Plan**: ✅ Full access (Admin-only features)

## Menu Management
**Base URL:** `/api/v1/auth/menus`  
**Permissions:** Admin only (full CRUD)
**Plan Required:** Enterprise

### Create Menu
```http
POST /api/v1/auth/menus/
Authorization: Bearer <admin_token>
X-Client-Name: tenant_name
Content-Type: application/json

{
  "name": "Student Reports",
  "url": "/reports/students",
  "level": "L1",
  "parent_id": null
}
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required  
- ✅ Enterprise plan required

### List All Menus
```http
GET /api/v1/auth/menus/
Authorization: Bearer <admin_token>
X-Client-Name: tenant_name
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

## Permission Management
**Base URL:** `/api/v1/auth/permissions`  
**Permissions:** Admin only (critical system security)
**Plan Required:** Enterprise

### Create Permission
```http
POST /api/v1/auth/permissions/
Authorization: Bearer <admin_token>
X-Client-Name: tenant_name
Content-Type: application/json

{
  "role_id": "uuid",
  "menu_id": 1,
  "can_view": true,
  "can_edit": false
}
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

### List All Permissions
```http
GET /api/v1/auth/permissions/
Authorization: Bearer <admin_token>
X-Client-Name: tenant_name
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

## Role Management
**Base URL:** `/api/v1/auth/roles`  
**Permissions:** Admin only (critical system security)
**Plan Required:** Enterprise

### Create Role
```http
POST /api/v1/auth/roles/roles/
Authorization: Bearer <admin_token>
X-Client-Name: tenant_name
Content-Type: application/json

{
  "name": "Librarian",
  "description": "Library management staff"
}
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

### List All Roles
```http
GET /api/v1/auth/roles/roles/
Authorization: Bearer <admin_token>
X-Client-Name: tenant_name
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

---

## 🎉 COMPLETE! All Modules Secured with Plan-Based Filtering

**🏆 FINAL SYSTEM STATUS:** All endpoint modules have been successfully secured with multi-layer validation!

### Security Implementation Summary
- ✅ **JWT Authentication** - Bearer token validation
- ✅ **Role-Based Permissions** - Database-driven access control  
- ✅ **Plan-Based Filtering** - Subscription tier enforcement
- ✅ **Multi-Tenant Support** - Tenant-specific database schemas

### Modules Protected (Latest Update: Auth Module ✅)
1. **Academic Years** - Basic subscription tier access ✅ SECURED
2. **Fee Management** - Standard+ tier for financial operations ✅ SECURED  
3. **Masters Module** - Variable tier requirements ✅ SECURED
4. **Student Module** - Basic to Enterprise tiers based on feature ✅ SECURED
5. **Transport Module** - Premium+ for advanced features ✅ SECURED
6. **Auth Module** - Enterprise tier for admin system configurations ✅ SECURED

### Plan Tier Feature Matrix
| Feature Category | Basic | Standard | Premium | Enterprise |
|-----------------|-------|----------|---------|------------|
| Academic Years | ✅ Read | ✅ Full | ✅ Full | ✅ Full |
| Fee Management | ❌ None | ✅ Full | ✅ Full | ✅ Full |
| Student Admissions | ✅ Read | ✅ Full | ✅ Full | ✅ Full |
| Student Certificates | ✅ Read | ✅ Full | ✅ Full | ✅ Full |
| Student Documents | ❌ None | ✅ Read | ✅ Full | ✅ Full |
| Transport Assignments | ❌ None | ❌ None | ✅ Read | ✅ Full |

---

*Last Updated: September 7, 2025 - Fee Module Plan Filtering Complete*
*Server Running: http://localhost:8003*
*Total Protected Endpoints: 195+ CRUD operations across ALL modules*
*Plan-Based Resources: 21+ subscription-controlled features*
*Security Status: PRODUCTION READY WITH MONETIZATION SUPPORT ✅*