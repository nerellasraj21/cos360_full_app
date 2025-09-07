# COS360 Complete API Reference - All Endpoints Catalog

## 📋 Complete Endpoint Inventory (For Automation Testing)

This document provides a **complete catalog** of ALL available API endpoints in the COS360 system, organized by module for systematic testing and automation.

### Base Configuration
```
Base URL: http://localhost:8003
Required Headers:
- Authorization: Bearer <jwt_token>
- Content-Type: application/json  
- X-Client-Name: <tenant_name>
```

---

## 🔐 Auth Module (8 endpoint files)

### 1. Login Endpoints (`login_endpoints.py`)
```http
POST /api/v1/auth/login
GET /api/v1/auth/user-menu
```

### 2. Menu Endpoints (`menu_endpoints.py`)
```http
GET /api/v1/auth/menus/
POST /api/v1/auth/menus/
```

### 3. Permissions Endpoints (`permissions_endpoints.py`)
```http
GET /api/v1/auth/permissions/
POST /api/v1/auth/permissions/
```

### 4. Resource Permission Endpoints (`resource_permission_endpoints.py`)
```http
POST /api/v1/auth/resource-permissions/
POST /api/v1/auth/resource-permissions/bulk
GET /api/v1/auth/resource-permissions/
GET /api/v1/auth/resource-permissions/{id}
PUT /api/v1/auth/resource-permissions/{id}
DELETE /api/v1/auth/resource-permissions/{id}
GET /api/v1/auth/resource-permissions/role/{role_id}
GET /api/v1/auth/resource-permissions/resource/{resource}
GET /api/v1/auth/resource-permissions/role/{role_id}/summary
DELETE /api/v1/auth/resource-permissions/role/{role_id}/all
DELETE /api/v1/auth/resource-permissions/resource/{resource}/all
GET /api/v1/auth/resource-permissions/check/{role_id}/{resource}/{action}
GET /api/v1/auth/resource-permissions/matrix/all
GET /api/v1/auth/resource-permissions/dropdown/resources
GET /api/v1/auth/resource-permissions/dropdown/actions
```

### 5. Role Endpoints (`role_endpoints.py`)
```http
GET /api/v1/auth/roles/
POST /api/v1/auth/roles/
```

### 6. Seed Endpoints (`seed_endpoints.py`)
```http
POST /api/v1/auth/seed-data
```

### 7. Test JWT Endpoints (`test_jwt_endpoints.py`)
```http
GET /api/v1/auth/test-jwt/admin-token
GET /api/v1/auth/test-jwt/student-token
GET /api/v1/auth/test-jwt/teacher-token
GET /api/v1/auth/test-jwt/staff-token
GET /api/v1/auth/test-jwt/parent-token
```

### 8. Test Setup Endpoints (`test_setup_endpoints.py`)
```http
POST /api/v1/auth/test-setup/reset-permissions
POST /api/v1/auth/test-setup/create-test-data
```

---

## 💰 Fee Module (6 endpoint files)

### 1. Fee Category Endpoints (`fee_category_endpoints.py`)
```http
POST /api/v1/fee/categories/
GET /api/v1/fee/categories/
GET /api/v1/fee/categories/dropdown
GET /api/v1/fee/categories/{id}
PUT /api/v1/fee/categories/{id}
DELETE /api/v1/fee/categories/{id}
```

### 2. Fee Class Map Term Amount Endpoints (`fee_class_map_term_amount_endpoints.py`)
```http
GET /api/v1/fee/class-mapping-term-amounts/
POST /api/v1/fee/class-mapping-term-amounts/bulk
PUT /api/v1/fee/class-mapping-term-amounts/bulk
```

### 3. Fee Class Mapping Endpoints (`fee_class_mapping_endpoints.py`) ⭐ BULK
```http
POST /api/v1/fee/class-mappings/
GET /api/v1/fee/class-mappings/
GET /api/v1/fee/class-mappings/{mapping_id}
PUT /api/v1/fee/class-mappings/{mapping_id}
DELETE /api/v1/fee/class-mappings/{mapping_id}
POST /api/v1/fee/class-mappings/bulk  # NEW BULK OPERATION
```

### 4. Fee Student Mapping Endpoints (`fee_student_mapping_endpoints.py`) ⭐ BULK
```http
POST /api/v1/fee/student-mappings/
GET /api/v1/fee/student-mappings/
GET /api/v1/fee/student-mappings/{mapping_id}
PUT /api/v1/fee/student-mappings/{mapping_id}
DELETE /api/v1/fee/student-mappings/{mapping_id}
POST /api/v1/fee/student-mappings/bulk  # NEW BULK OPERATION
```

### 5. Fee Term Endpoints (`fee_term_endpoints.py`)
```http
POST /api/v1/fee/terms/
GET /api/v1/fee/terms/
GET /api/v1/fee/terms/{id}
PUT /api/v1/fee/terms/{id}
DELETE /api/v1/fee/terms/{id}
DELETE /api/v1/fee/terms/dates/{fee_term_date_id}
```

### 6. Fee Type Endpoints (`fee_type_endpoints.py`)
```http
POST /api/v1/fee/types/
GET /api/v1/fee/types/
GET /api/v1/fee/types/dropdown
GET /api/v1/fee/types/{id}
PUT /api/v1/fee/types/{id}
DELETE /api/v1/fee/types/{id}
```

---

## 🎓 Masters Module (8 endpoint files)

### 1. Academic Year Routes (`academic_year_routes.py`)
```http
POST /api/v1/masters/academic_years/
GET /api/v1/masters/academic_years/
GET /api/v1/masters/academic_years/dropdown
GET /api/v1/masters/academic_years/{id}
PUT /api/v1/masters/academic_years/{id}
DELETE /api/v1/masters/academic_years/{id}
```

### 2. Class Endpoints (`class_endpoints.py`)
```http
POST /api/v1/masters/class_sections/
GET /api/v1/masters/class_sections/
GET /api/v1/masters/class_sections/dropdown
GET /api/v1/masters/class_sections/{id}
PUT /api/v1/masters/class_sections/{id}
DELETE /api/v1/masters/class_sections/{id}
GET /api/v1/masters/class_sections/classes/
GET /api/v1/masters/class_sections/classes/dropdown
GET /api/v1/masters/class_sections/sections/
GET /api/v1/masters/class_sections/sections/dropdown
GET /api/v1/masters/class_sections/sections/by-class/{class_id}
GET /api/v1/masters/class_sections/{id}/full
```

### 3. Holiday Endpoints (`holiday_endpoints.py`)
```http
POST /api/v1/masters/holidays/
GET /api/v1/masters/holidays/
GET /api/v1/masters/holidays/{id}
PUT /api/v1/masters/holidays/{id}
DELETE /api/v1/masters/holidays/{id}
POST /api/v1/masters/holidays/{id}/activate
POST /api/v1/masters/holidays/{id}/deactivate
```

### 4. Parent Endpoints (`parent_endpoints.py`)
```http
POST /api/v1/masters/parents/
GET /api/v1/masters/parents/
GET /api/v1/masters/parents/{id}
PUT /api/v1/masters/parents/{id}
DELETE /api/v1/masters/parents/{id}
```

### 5. Staff Endpoints (`staff_endpoints.py`)
```http
POST /api/v1/staff/
GET /api/v1/staff/
GET /api/v1/staff/dropdown
GET /api/v1/staff/{id}
PUT /api/v1/staff/{id}
DELETE /api/v1/staff/{id}
POST /api/v1/staff/attendance/
GET /api/v1/staff/attendance/
```

### 6. Subject Category Endpoints (`subject_category_endpoints.py`)
```http
POST /api/v1/masters/subject_categories/
GET /api/v1/masters/subject_categories/
GET /api/v1/masters/subject_categories/{id}
```

### 7. Subject Routes (`subject_routes.py`)
```http
POST /api/v1/masters/subjects/
GET /api/v1/masters/subjects/
GET /api/v1/masters/subjects/dropdown
GET /api/v1/masters/subjects/{id}
PUT /api/v1/masters/subjects/{id}
DELETE /api/v1/masters/subjects/{id}
```

### 8. Timetable Routes (`timetable_routes.py`)
```http
POST /api/v1/masters/timetables/bulk
GET /api/v1/masters/timetables/section/{section_id}
GET /api/v1/masters/timetables/{id}
```

---

## 🚌 Transport Module (5 endpoint files)

### 1. Route Stop Endpoints (`route_stop_endpoints.py`)
```http
POST /api/v1/masters/route-stops/
GET /api/v1/masters/route-stops/
GET /api/v1/masters/route-stops/{id}
PUT /api/v1/masters/route-stops/{id}
DELETE /api/v1/masters/route-stops/{id}
GET /api/v1/masters/route-stops/dropdown
```

### 2. Routes Endpoints (`routes_endpoints.py`)
```http
POST /api/v1/masters/routes/
GET /api/v1/masters/routes/
GET /api/v1/masters/routes/dropdown
GET /api/v1/masters/routes/{id}
PUT /api/v1/masters/routes/{id}
DELETE /api/v1/masters/routes/{id}
GET /api/v1/masters/routes/{route_id}/stops
GET /api/v1/masters/routes/search
```

### 3. Student Trip Endpoints (`student_trip_endpoints.py`)
```http
POST /api/v1/student/student-trips/
GET /api/v1/student/student-trips/
GET /api/v1/student/student-trips/{id}
PUT /api/v1/student/student-trips/{id}
DELETE /api/v1/student/student-trips/{id}
```

### 4. Trip Endpoints (`trip_endpoints.py`)
```http
POST /api/v1/masters/transport/trips/
GET /api/v1/masters/transport/trips/
GET /api/v1/masters/transport/trips/{id}
PUT /api/v1/masters/transport/trips/{id}
DELETE /api/v1/masters/transport/trips/{id}
GET /api/v1/masters/transport/trips/dropdown
```

### 5. Vehicle Endpoints (`vehicle_endpoints.py`)
```http
POST /api/v1/masters/vehicles/
GET /api/v1/masters/vehicles/
GET /api/v1/masters/vehicles/{id}
PUT /api/v1/masters/vehicles/{id}
DELETE /api/v1/masters/vehicles/{id}
GET /api/v1/masters/vehicles/dropdown
```

---

## 👨‍🎓 Student Module (6 endpoint files)

### 1. Admission Endpoints (`admission_endpoints.py`)
```http
POST /api/v1/student/admissions/
GET /api/v1/student/admissions/{id}
PUT /api/v1/student/admissions/{id}
GET /api/v1/student/admissions/by-admission/{admission_number}
GET /api/v1/student/admissions/search
```

### 2. Attendance Endpoints (`attendance_endpoints.py`)
```http
POST /api/v1/student/attendance/
GET /api/v1/student/attendance/
GET /api/v1/student/attendance/{id}
PUT /api/v1/student/attendance/{id}
DELETE /api/v1/student/attendance/{id}
```

### 3. Certificate Endpoints (`certificate_endpoints.py`)
```http
POST /api/v1/student/certificates/
GET /api/v1/student/certificates/
GET /api/v1/student/certificates/{id}
PUT /api/v1/student/certificates/{id}
DELETE /api/v1/student/certificates/{id}
POST /api/v1/student/certificates/{id}/upload
GET /api/v1/student/certificates/{id}/download
GET /api/v1/student/certificates/dropdown
```

### 4. Student Document Endpoints (`student_document_endpoints.py`)
```http
POST /api/v1/student/documents/
GET /api/v1/student/documents/
GET /api/v1/student/documents/{id}
PUT /api/v1/student/documents/{id}
DELETE /api/v1/student/documents/{id}
```

### 5. Student Homework Endpoints (`student_homework_endpoints.py`)
```http
POST /api/v1/student/homework/
GET /api/v1/student/homework/
GET /api/v1/student/homework/{id}
PUT /api/v1/student/homework/{id}
DELETE /api/v1/student/homework/{id}
```

### 6. Student Transport Endpoints (`student_transport_endpoints.py`)
```http
POST /api/v1/students/student-transport/
GET /api/v1/students/student-transport/
GET /api/v1/students/student-transport/{id}
PUT /api/v1/students/student-transport/{id}
DELETE /api/v1/students/student-transport/{id}
```

---

## 🏢 Public Module (1 endpoint file)

### 1. Org Routes (`org_routes.py`)
```http
GET /api/v1/public/tenants/
POST /api/v1/public/tenants/
GET /api/v1/public/tenants/{tenant_id}
PUT /api/v1/public/tenants/{tenant_id}
DELETE /api/v1/public/tenants/{tenant_id}
```

---

## 📊 Endpoint Summary

### Total Endpoint Count by Module:
- **Auth Module**: ~25 endpoints (8 files)
- **Fee Module**: ~32 endpoints (6 files) + **2 NEW BULK operations**
- **Masters Module**: ~45 endpoints (8 files) 
- **Transport Module**: ~30 endpoints (5 files)
- **Student Module**: ~35 endpoints (6 files)
- **Public Module**: ~5 endpoints (1 file)

### **TOTAL: ~172+ API endpoints across 34 endpoint files**

### New Bulk Operations Added:
1. `POST /api/v1/fee/class-mappings/bulk` - Map fee to multiple classes at once
2. `POST /api/v1/fee/student-mappings/bulk` - Map fee to multiple students at once

### Security Features Applied to ALL Endpoints:
- ✅ JWT Authentication required
- ✅ Role-based permission validation
- ✅ Plan-based subscription filtering
- ✅ Multi-tenant isolation
- ✅ Comprehensive error handling

---

## 🧪 For Automation Testers

### Missing from Main API_DOCUMENTATION.md:
The following endpoint files are **NOT fully documented** in the main API documentation:

1. **Auth Module**:
   - `seed_endpoints.py` - Database seeding operations
   - `test_setup_endpoints.py` - Test data creation

2. **Student Module**:
   - `student_homework_endpoints.py` - Student homework management
   - `student_document_endpoints.py` - Student document management

3. **Transport Module**:
   - `student_trip_endpoints.py` - Student trip assignments

4. **Public Module**:
   - `org_routes.py` - Tenant management operations

### Recommendation:
Use this **complete reference** alongside the main `API_DOCUMENTATION.md` to ensure **100% endpoint coverage** in your automation test suites.

### Test Priority Levels:
- **High Priority**: Fee, Masters, Student core CRUD operations
- **Medium Priority**: Transport, Auth management operations  
- **Low Priority**: Test utilities, seed operations, public tenant management

All endpoints follow the same security patterns and error handling conventions documented in the main API documentation file.