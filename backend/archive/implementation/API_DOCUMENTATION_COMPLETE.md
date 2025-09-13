# COS360 API Documentation - Complete Reference

## 📋 Table of Contents

- [🚀 Quick Start](#quick-start)
- [🔐 Authentication](#authentication)
- [📊 Complete API Reference](#api-reference)
  - [Authentication & Permissions](#auth-endpoints)
  - [Fee Management](#fee-endpoints)
  - [Masters Data](#masters-endpoints)
  - [Student Management](#student-endpoints)
  - [Staff Management](#staff-endpoints)
  - [Parent Management](#parent-endpoints)
  - [Transport Management](#transport-endpoints)
  - [Superadmin](#superadmin-endpoints)
- [📝 Request/Response Examples](#examples)
- [❌ Error Handling](#error-handling)
- [🔒 Security & Permissions](#security-permissions)

---

## 🚀 Quick Start {#quick-start}

### Base Configuration
- **Base URL**: `http://localhost:8003`
- **Required Header**: `cschema: test_tenant` (for all requests)
- **Authentication**: JWT Bearer token

### Quick Authentication
```bash
# Get admin token
curl -X POST "http://localhost:8003/api/v1/auth/login/login" \
  -H "Content-Type: application/json" \
  -H "cschema: test_tenant" \
  -d '{"username":"admin","password":"admin123"}'
```

<details>
<summary>📋 Environment Setup</summary>

```bash
# Start development server
uvicorn app.main:app --reload --port 8003

# Environment Variables
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/postgres
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secure-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
```
</details>

---

## 🔐 Authentication {#authentication}

### JavaScript API Client
```javascript
class COS360ApiClient {
  constructor(baseUrl = 'http://localhost:8003', tenant = 'test_tenant') {
    this.baseUrl = baseUrl;
    this.tenant = tenant;
    this.token = localStorage.getItem('access_token');
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/api/v1/auth/login/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'cschema': this.tenant
      },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      this.token = data.access_token;
      localStorage.setItem('access_token', this.token);
      return data;
    }
    throw new Error('Login failed');
  }

  async apiCall(endpoint, options = {}) {
    const config = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'cschema': this.tenant,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      throw new Error('Authentication required');
    }
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

---

## 📊 Complete API Reference {#api-reference}

### Authentication & Permissions {#auth-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| **Core Authentication** |||||
| POST | `/auth/login/login` | User login with credentials | `LoginRequest` | None |
| POST | `/auth/login/refresh` | Refresh access token | `RefreshRequest` | None |
| POST | `/auth/login/logout` | User logout | - | Valid token |
| GET | `/auth/test-jwt/admin-token` | Get test admin token | - | None |
| GET | `/auth/test-jwt/student-token` | Get test student token | - | None |
| **Menu Management** |||||
| POST | `/auth/menus/` | Create menu item | `MenuCreate` | `menus:create` |
| GET | `/auth/menus/` | List menu items | - | `menus:list` |
| GET | `/auth/menus/{id}` | Get menu item | - | `menus:read` |
| PUT | `/auth/menus/{id}` | Update menu item | `MenuUpdate` | `menus:update` |
| DELETE | `/auth/menus/{id}` | Delete menu item | - | `menus:delete` |
| **Permission Management** |||||
| POST | `/auth/permissions/` | Create permission | `PermissionCreate` | `permissions:create` |
| GET | `/auth/permissions/` | List permissions | - | `permissions:list` |
| GET | `/auth/permissions/{id}` | Get permission | - | `permissions:read` |
| PUT | `/auth/permissions/{id}` | Update permission | `PermissionUpdate` | `permissions:update` |
| DELETE | `/auth/permissions/{id}` | Delete permission | - | `permissions:delete` |
| **Role Management** |||||
| POST | `/auth/roles/roles/` | Create role | `RoleCreate` | `roles:create` |
| GET | `/auth/roles/roles/` | List roles | - | `roles:list` |
| GET | `/auth/roles/roles/{id}` | Get role | - | `roles:read` |
| PUT | `/auth/roles/roles/{id}` | Update role | `RoleUpdate` | `roles:update` |
| DELETE | `/auth/roles/roles/{id}` | Delete role | - | `roles:delete` |
| GET | `/auth/roles/roles/dropdown` | Role dropdown | - | `roles:list` |
| **Resource Permission Management** |||||
| POST | `/auth/resource-permissions/` | Create resource permission | `ResourcePermissionCreate` | `resource_permissions:create` |
| GET | `/auth/resource-permissions/` | List resource permissions | - | `resource_permissions:list` |
| GET | `/auth/resource-permissions/{id}` | Get resource permission | - | `resource_permissions:read` |
| PUT | `/auth/resource-permissions/{id}` | Update resource permission | `ResourcePermissionUpdate` | `resource_permissions:update` |
| DELETE | `/auth/resource-permissions/{id}` | Delete resource permission | - | `resource_permissions:delete` |
| POST | `/auth/resource-permissions/bulk` | Bulk create permissions | `BulkResourcePermission` | `resource_permissions:create` |
| GET | `/auth/resource-permissions/role/{role_id}` | Get permissions by role | - | `resource_permissions:list` |
| GET | `/auth/resource-permissions/resource/{resource}` | Get permissions by resource | - | `resource_permissions:list` |
| GET | `/auth/resource-permissions/role/{role_id}/summary` | Role permission summary | - | `resource_permissions:list` |
| GET | `/auth/resource-permissions/matrix/all` | Permission matrix view | - | `resource_permissions:list` |
| DELETE | `/auth/resource-permissions/role/{role_id}/all` | Delete all role permissions | - | `resource_permissions:delete` |
| GET | `/auth/resource-permissions/dropdown/resources` | Resource dropdown | - | `resource_permissions:list` |
| GET | `/auth/resource-permissions/dropdown/actions` | Action dropdown | - | `resource_permissions:list` |
| GET | `/auth/resource-permissions/check/{role_id}/{resource}/{action}` | Check permission | - | `resource_permissions:read` |

### Fee Management {#fee-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| **Fee Categories** |||||
| POST | `/fee/categories/` | Create fee category | `FeeCategoryCreate` | `fee_categories:create` |
| GET | `/fee/categories/` | List fee categories | - | `fee_categories:list` |
| GET | `/fee/categories/{id}` | Get fee category | - | `fee_categories:read` |
| PUT | `/fee/categories/{id}` | Update fee category | `FeeCategoryUpdate` | `fee_categories:update` |
| DELETE | `/fee/categories/{id}` | Delete fee category | - | `fee_categories:delete` |
| GET | `/fee/categories/dropdown` | Dropdown data | - | `fee_categories:list` |
| **Fee Types** |||||
| POST | `/fee/types/` | Create fee type | `FeeTypeCreate` | `fee_types:create` |
| GET | `/fee/types/` | List fee types | - | `fee_types:list` |
| GET | `/fee/types/{id}` | Get fee type | - | `fee_types:read` |
| PUT | `/fee/types/{id}` | Update fee type | `FeeTypeUpdate` | `fee_types:update` |
| DELETE | `/fee/types/{id}` | Delete fee type | - | `fee_types:delete` |
| GET | `/fee/types/dropdown` | Dropdown data | - | `fee_types:list` |
| **Fee Terms** |||||
| POST | `/fee/terms/` | Create fee term ✅ | `FeeTermCreate` | `fee_terms:create` |
| GET | `/fee/terms/` | List fee terms | - | `fee_terms:list` |
| GET | `/fee/terms/{id}` | Get fee term | - | `fee_terms:read` |
| PUT | `/fee/terms/{id}` | Update fee term ✅ | `FeeTermUpdate` | `fee_terms:update` |
| DELETE | `/fee/terms/{id}` | Delete fee term ⚠️ | - | `fee_terms:delete` |
| GET | `/fee/terms/dropdown` | Dropdown data | - | `fee_terms:list` |
| GET | `/fee/terms/{fee_term_id}/dates` | Get term dates | - | `fee_terms:read` |
| DELETE | `/fee/terms/dates/{fee_term_date_id}` | Delete term date | - | `fee_terms:update` |

**Fee Terms Status Update (2025-09-10)**: 
- ✅ **Fixed 500 Errors**: CREATE and UPDATE operations now return proper 201/200 responses with complete data
- ⚠️ **DELETE Limitation**: DELETE operation still has model relationship issues but is isolated
- ✅ **Validation**: Complex fee_term_dates validation (count must match number_of_terms) working correctly
| **Fee Class Mappings** |||||
| POST | `/fee/class-mappings/` | Create class mapping | `FeeClassMappingCreate` | `fee_class_mappings:create` |
| GET | `/fee/class-mappings/` | List class mappings | - | `fee_class_mappings:list` |
| GET | `/fee/class-mappings/{id}` | Get class mapping | - | `fee_class_mappings:read` |
| PUT | `/fee/class-mappings/{id}` | Update class mapping | `FeeClassMappingUpdate` | `fee_class_mappings:update` |
| DELETE | `/fee/class-mappings/{id}` | Delete class mapping | - | `fee_class_mappings:delete` |
| POST | `/fee/class-mappings/bulk` | Bulk create mappings | `BulkFeeClassMapping` | `fee_class_mappings:create` |
| **Fee Student Mappings** |||||
| POST | `/fee/student-mappings/` | Create student mapping | `FeeStudentMappingCreate` | `fee_student_mappings:create` |
| GET | `/fee/student-mappings/` | List student mappings | - | `fee_student_mappings:list` |
| GET | `/fee/student-mappings/{id}` | Get student mapping | - | `fee_student_mappings:read` |
| PUT | `/fee/student-mappings/{id}` | Update student mapping | `FeeStudentMappingUpdate` | `fee_student_mappings:update` |
| DELETE | `/fee/student-mappings/{id}` | Delete student mapping | - | `fee_student_mappings:delete` |
| POST | `/fee/student-mappings/bulk` | Bulk create mappings | `BulkFeeStudentMapping` | `fee_student_mappings:create` |
| **Fee Term Amounts** |||||
| POST | `/fee/class-mapping-term-amounts/` | Create term amount | `FeeClassMapTermAmountCreate` | `fee_class_map_term_amounts:create` |
| PUT | `/fee/class-mapping-term-amounts/` | Update term amount | `FeeClassMapTermAmountUpdate` | `fee_class_map_term_amounts:update` |
| DELETE | `/fee/class-mapping-term-amounts/` | Delete term amount | - | `fee_class_map_term_amounts:delete` |

### Masters Data {#masters-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| **Academic Years** |||||
| POST | `/masters/academic_years/` | Create academic year | `AcademicYearCreate` | `academic_years:create` |
| GET | `/masters/academic_years/` | List academic years | - | `academic_years:list` |
| GET | `/masters/academic_years/{id}` | Get academic year | - | `academic_years:read` |
| PUT | `/masters/academic_years/{id}` | Update academic year | `AcademicYearUpdate` | `academic_years:update` |
| DELETE | `/masters/academic_years/{id}` | Delete academic year | - | `academic_years:delete` |
| GET | `/masters/academic_years/dropdown` | Dropdown data | - | `academic_years:list` |
| **Classes & Sections** |||||
| POST | `/masters/class_sections/` | Create class section | `ClassSectionCreate` | `class_sections:create` |
| GET | `/masters/class_sections/read_all` | List class sections | - | `class_sections:list` |
| GET | `/masters/class_sections/{class_id}` | Get class section | - | `class_sections:read` |
| PUT | `/masters/class_sections/{class_id}` | Update class section | `ClassSectionUpdate` | `class_sections:update` |
| DELETE | `/masters/class_sections/{class_id}` | Delete class section | - | `class_sections:delete` |
| GET | `/masters/class_sections/dropdown` | Dropdown data | - | `class_sections:list` |
| GET | `/masters/class_sections/by_class_id/{class_id}` | Get sections by class | - | `class_sections:read` |
| GET | `/masters/class_sections/class-section-list` | Class-section list | - | `class_sections:list` |
| GET | `/masters/class_sections/class-list` | Class list only | - | `class_sections:list` |
| GET | `/masters/class_sections/section-list` | Section list only | - | `class_sections:list` |
| GET | `/masters/class_sections/by_class_id/{class_id}/sections` | Sections for class | - | `class_sections:read` |
| **Subjects** |||||
| POST | `/masters/subjects/` | Create subject | `SubjectCreate` | `subjects:create` |
| GET | `/masters/subjects/` | List subjects | - | `subjects:list` |
| GET | `/masters/subjects/{subject_id}` | Get subject | - | `subjects:read` |
| PUT | `/masters/subjects/{subject_id}` | Update subject | `SubjectUpdate` | `subjects:update` |
| DELETE | `/masters/subjects/{subject_id}` | Delete subject | - | `subjects:delete` |
| GET | `/masters/subjects/dropdown` | Dropdown data | - | `subjects:list` |
| GET | `/masters/subjects/categories/{category_id}/subjects` | Subjects by category | - | `subjects:list` |
| GET | `/masters/subjects/categories/{category_id}/subjects/dropdown` | Category subjects dropdown | - | `subjects:list` |
| **Subject Categories** |||||
| POST | `/masters/subject_categories/categories` | Create subject category | `SubjectCategoryCreate` | `subject_categories:create` |
| GET | `/masters/subject_categories/categories` | List subject categories | - | `subject_categories:list` |
| GET | `/masters/subject_categories/categories/{id}` | Get subject category | - | `subject_categories:read` |
| PUT | `/masters/subject_categories/categories/{id}` | Update subject category | `SubjectCategoryUpdate` | `subject_categories:update` |
| DELETE | `/masters/subject_categories/categories/{id}` | Delete subject category | - | `subject_categories:delete` |
| GET | `/masters/subject_categories/categories/dropdown` | Dropdown data | - | `subject_categories:list` |
| **Class-Subject Mappings** |||||
| POST | `/masters/class-subject-mappings/` | Create mapping | `ClassSubjectMappingCreate` | `class_subject_mappings:create` |
| GET | `/masters/class-subject-mappings/` | List mappings | - | `class_subject_mappings:list` |
| GET | `/masters/class-subject-mappings/{mapping_id}` | Get mapping | - | `class_subject_mappings:read` |
| PUT | `/masters/class-subject-mappings/{mapping_id}` | Update mapping | `ClassSubjectMappingUpdate` | `class_subject_mappings:update` |
| DELETE | `/masters/class-subject-mappings/{mapping_id}` | Delete mapping | - | `class_subject_mappings:delete` |
| POST | `/masters/class-subject-mappings/bulk` | Bulk create mappings | `BulkClassSubjectMapping` | `class_subject_mappings:create` |
| GET | `/masters/class-subject-mappings/by-class/{class_id}` | Get by class | - | `class_subject_mappings:list` |
| GET | `/masters/class-subject-mappings/dropdown` | Dropdown data | - | `class_subject_mappings:list` |
| **Routes** |||||
| POST | `/masters/routes/` | Create route | `RouteCreate` | `routes:create` |
| GET | `/masters/routes/all_routes` | List routes | - | `routes:list` |
| GET | `/masters/routes/routeid/{route_id}` | Get route | - | `routes:read` |
| PUT | `/masters/routes/{route_id}` | Update route | `RouteUpdate` | `routes:update` |
| PATCH | `/masters/routes/{route_id}` | Partial update route | `RouteUpdate` | `routes:update` |
| DELETE | `/masters/routes/{route_id}` | Delete route | - | `routes:delete` |
| GET | `/masters/routes/dropdown` | Dropdown data | - | `routes:list` |
| GET | `/masters/routes/stops-by-route` | Route stops | - | `routes:read` |
| **Vehicles** |||||
| POST | `/masters/vehicles/` | Create vehicle | `VehicleCreate` | `vehicles:create` |
| GET | `/masters/vehicles/` | List vehicles | - | `vehicles:list` |
| GET | `/masters/vehicles/{vehicle_id}` | Get vehicle | - | `vehicles:read` |
| PUT | `/masters/vehicles/{vehicle_id}` | Update vehicle | `VehicleUpdate` | `vehicles:update` |
| PATCH | `/masters/vehicles/{vehicle_id}` | Partial update vehicle | `VehicleUpdate` | `vehicles:update` |
| DELETE | `/masters/vehicles/{vehicle_id}` | Delete vehicle | - | `vehicles:delete` |
| GET | `/masters/vehicles/dropdown` | Dropdown data | - | `vehicles:list` |
| GET | `/masters/vehicles/{vehicle_id}/routes` | Get vehicle routes | - | `vehicles:read` |
| GET | `/masters/vehicles/{vehicle_id}/routes/{route_id}/stops` | Get route stops | - | `vehicles:read` |
| **Route Stops** |||||
| POST | `/masters/route-stops/` | Create route stop | `RouteStopCreate` | `route_stops:create` |
| GET | `/masters/route-stops/` | List route stops | - | `route_stops:list` |
| GET | `/masters/route-stops/{stop_id}` | Get route stop | - | `route_stops:read` |
| PUT | `/masters/route-stops/{stop_id}` | Update route stop | `RouteStopUpdate` | `route_stops:update` |
| PATCH | `/masters/route-stops/{stop_id}` | Partial update stop | `RouteStopUpdate` | `route_stops:update` |
| DELETE | `/masters/route-stops/{stop_id}` | Delete route stop | - | `route_stops:delete` |
| **Holidays** |||||
| POST | `/masters/holidays/` | Create holiday | `HolidayCreate` | `holidays:create` |
| GET | `/masters/holidays/` | List holidays | - | `holidays:list` |
| GET | `/masters/holidays/{holiday_id}` | Get holiday | - | `holidays:read` |
| PUT | `/masters/holidays/{holiday_id}` | Update holiday | `HolidayUpdate` | `holidays:update` |
| DELETE | `/masters/holidays/{holiday_id}` | Delete holiday | - | `holidays:delete` |
| GET | `/masters/holidays/dropdown` | Dropdown data | - | `holidays:list` |
| PATCH | `/masters/holidays/{holiday_id}/activate` | Activate holiday | - | `holidays:update` |
| **Trips** |||||
| POST | `/masters/trips/` | Create trip | `TripCreate` | `trips:create` |
| GET | `/masters/trips/` | List trips | - | `trips:list` |
| GET | `/masters/trips/{trip_id}` | Get trip | - | `trips:read` |
| PUT | `/masters/trips/{trip_id}` | Update trip | `TripUpdate` | `trips:update` |
| PATCH | `/masters/trips/{trip_id}` | Partial update trip | `TripUpdate` | `trips:update` |
| DELETE | `/masters/trips/{trip_id}` | Delete trip | - | `trips:delete` |

### Student Management {#student-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| **Student Admissions** |||||
| POST | `/students/admission/` | Create admission | `StudentAdmissionCreate` | `student_admissions:create` |
| GET | `/students/admission/` | List all admissions (paginated) | - | `student_admissions:list` |
| GET | `/students/admission/id/{student_id}` | Get admission by student | - | `student_admissions:read` |
| PATCH | `/students/admission/{student_id}` | Update admission | `StudentAdmissionUpdate` | `student_admissions:update` |
| DELETE | `/students/admission/{admission_id}` | Delete admission | - | `student_admissions:delete` |
| GET | `/students/admission/by-admission/{admission_id}` | Get by admission ID | - | `student_admissions:read` |
| GET | `/students/admission/search` | Search admissions | - | `student_admissions:list` |
| **Student Dropdowns** |||||
| GET | `/students/admission/students/dropdown` | Student dropdown with admission numbers | - | `students:list` |
| GET | `/students/admission/students/dropdown/simple` | Simple student dropdown | - | `students:list` |
| **Student Attendance** |||||
| POST | `/student/attendance/` | Create attendance | `AttendanceCreate` | `student_attendance:create` |
| GET | `/student/attendance/` | List attendance | - | `student_attendance:list` |
| GET | `/student/attendance/{attendance_id}` | Get attendance | - | `student_attendance:read` |
| PATCH | `/student/attendance/{attendance_id}` | Update attendance | `AttendanceUpdate` | `student_attendance:update` |
| DELETE | `/student/attendance/{attendance_id}` | Delete attendance | - | `student_attendance:delete` |
| **Student Certificates** |||||
| POST | `/student/certificates/` | Create certificate | `StudentCertificateCreate` | `student_certificates:create` |
| GET | `/student/certificates/` | List certificates | - | `student_certificates:list` |
| GET | `/student/certificates/certificateid/{certificate_id}` | Get certificate | - | `student_certificates:read` |
| PATCH | `/student/certificates/{certificate_id}` | Update certificate | `StudentCertificateUpdate` | `student_certificates:update` |
| DELETE | `/student/certificates/{certificate_id}` | Delete certificate | - | `student_certificates:delete` |
| GET | `/student/certificates/{certificate_id}/download` | Download certificate | - | `student_certificates:read` |
| GET | `/student/certificates/student/{student_id}` | Get student certificates | - | `student_certificates:list` |
| GET | `/student/certificates/certificate-types` | Get certificate types | - | `student_certificates:list` |
| **Certificate Types** |||||
| POST | `/student/certificate-types/` | Create certificate type | `CertificateTypeCreate` | `certificate_types:create` |
| GET | `/student/certificate-types/` | List certificate types | - | `certificate_types:list` |
| GET | `/student/certificate-types/{id}` | Get certificate type | - | `certificate_types:read` |
| PUT | `/student/certificate-types/{id}` | Update certificate type | `CertificateTypeUpdate` | `certificate_types:update` |
| DELETE | `/student/certificate-types/{id}` | Delete certificate type | - | `certificate_types:delete` |
| GET | `/student/certificate-types/dropdown` | Dropdown data | - | `certificate_types:list` |
| **Student Documents** |||||
| POST | `/students/documents/` | Create document | `StudentDocumentCreate` | `student_documents:create` |
| GET | `/students/documents/` | List documents | - | `student_documents:list` |
| GET | `/students/documents/{document_id}` | Get document | - | `student_documents:read` |
| PATCH | `/students/documents/{document_id}` | Update document | `StudentDocumentUpdate` | `student_documents:update` |
| DELETE | `/students/documents/{document_id}` | Delete document | - | `student_documents:delete` |
| **Student Transport** |||||
| POST | `/students/student-transport/` | Create transport assignment | `StudentTransportCreate` | `student_transport:create` |
| GET | `/students/student-transport/` | List transport assignments | - | `student_transport:list` |
| GET | `/students/student-transport/student/{student_id}` | Get student transport | - | `student_transport:read` |
| PATCH | `/students/student-transport/{transport_id}` | Update transport | `StudentTransportUpdate` | `student_transport:update` |
| DELETE | `/students/student-transport/{transport_id}` | Delete transport | - | `student_transport:delete` |
| **Timetable Management** |||||
| POST | `/students/timetable/bulk` | Bulk create timetable | `BulkTimetableCreate` | `timetables:create` |
| GET | `/students/timetable/section/{section_id}` | Get section timetable | - | `timetables:read` |
| PATCH | `/students/timetable/timetable/slots/bulk` | Bulk update slots | `BulkTimetableUpdate` | `timetables:update` |

### Staff Management {#staff-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| **Staff Enrollment** |||||
| POST | `/staff/enrollment` | Create staff enrollment | `StaffEnrollmentCreate` | `staff:create` |
| GET | `/staff/enrollments` | List staff enrollments | - | `staff:list` |
| GET | `/staff/enrollment/{staff_id}` | Get staff enrollment | - | `staff:read` |
| PATCH | `/staff/enrollment/{staff_id}` | Update staff enrollment | `StaffEnrollmentUpdate` | `staff:update` |
| DELETE | `/staff/enrollment/{staff_id}` | Delete staff enrollment | - | `staff:delete` |
| **Staff Directory** |||||
| GET | `/staff/` | List all staff | - | `staff:list` |
| GET | `/staff/by-designation` | Get staff by designation | - | `staff:list` |
| GET | `/staff/drivers` | Get driver list | - | `staff:list` |
| **Designations** |||||
| POST | `/staff/designations/` | Create designation | `DesignationCreate` | `designations:create` |
| GET | `/staff/designations/` | List designations | - | `designations:list` |
| GET | `/staff/designations/{id}` | Get designation | - | `designations:read` |
| PUT | `/staff/designations/{id}` | Update designation | `DesignationUpdate` | `designations:update` |
| DELETE | `/staff/designations/{id}` | Delete designation | - | `designations:delete` |
| GET | `/staff/designations/dropdown` | Dropdown data | - | `designations:list` |

### Parent Management {#parent-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| POST | `/parents/` | Create parent | `ParentCreate` | `parents:create` |
| GET | `/parents/` | List parents | - | `parents:list` |
| GET | `/parents/{parent_id}` | Get parent | - | `parents:read` |
| PATCH | `/parents/{parent_id}` | Update parent | `ParentUpdate` | `parents:update` |
| DELETE | `/parents/{parent_id}` | Delete parent | - | `parents:delete` |

### Transport Management {#transport-endpoints}

All transport-related endpoints are covered in the Masters section above (Routes, Vehicles, Route Stops, Trips).

### Super Admin {#superadmin-endpoints}

| Method | Endpoint | Description | Body Schema | Permission |
|--------|----------|-------------|-------------|------------|
| **Super Admin Authentication** |||||
| POST | `/super-admin/auth/login` | Super admin login | `SuperAdminLoginRequest` | None |
| POST | `/super-admin/auth/logout` | Super admin logout | - | Super Admin |
| POST | `/super-admin/auth/refresh` | Refresh super admin token | `RefreshRequest` | Super Admin |
| **Tenant Management** |||||
| GET | `/super-admin/tenants` | List all tenants | - | Super Admin |
| GET | `/super-admin/tenants/{tenant_id}` | Get tenant details | - | Super Admin |
| POST | `/super-admin/tenants` | Create new tenant | `TenantCreateRequest` | Super Admin |
| PUT | `/super-admin/tenants/{tenant_id}` | Update tenant | `TenantUpdateRequest` | Super Admin |
| DELETE | `/super-admin/tenants/{tenant_id}` | Delete tenant | - | Super Admin |
| PATCH | `/super-admin/tenants/{tenant_id}/activate` | Activate tenant | - | Super Admin |
| PATCH | `/super-admin/tenants/{tenant_id}/deactivate` | Deactivate tenant | - | Super Admin |
| **Tenant Impersonation** |||||
| POST | `/super-admin/tenants/{tenant_id}/impersonate` | Impersonate tenant admin | - | Super Admin |
| DELETE | `/super-admin/impersonation/end` | End impersonation session | - | Super Admin |
| **Plan Management** |||||
| GET | `/super-admin/plans` | List all plans | - | Super Admin |
| POST | `/super-admin/plans` | Create new plan | `PlanCreateRequest` | Super Admin |
| PUT | `/super-admin/plans/{plan_id}` | Update plan | `PlanUpdateRequest` | Super Admin |
| DELETE | `/super-admin/plans/{plan_id}` | Delete plan | - | Super Admin |
| **Resource Management** |||||
| GET | `/super-admin/resources` | List all resources | - | Super Admin |
| POST | `/super-admin/resources` | Create new resource | `ResourceCreateRequest` | Super Admin |
| PUT | `/super-admin/resources/{resource_id}` | Update resource | `ResourceUpdateRequest` | Super Admin |
| DELETE | `/super-admin/resources/{resource_id}` | Delete resource | - | Super Admin |
| **Plan-Resource Mappings** |||||
| GET | `/super-admin/plan-resources` | List plan-resource mappings | - | Super Admin |
| POST | `/super-admin/plan-resources` | Create plan-resource mapping | `PlanResourceCreateRequest` | Super Admin |
| DELETE | `/super-admin/plan-resources/{mapping_id}` | Delete plan-resource mapping | - | Super Admin |
| **System Statistics** |||||
| GET | `/super-admin/stats/overview` | System overview | - | Super Admin |
| GET | `/super-admin/stats/tenants` | Tenant statistics | - | Super Admin |
| GET | `/super-admin/stats/users` | User statistics | - | Super Admin |
| GET | `/super-admin/stats/usage` | Usage statistics | - | Super Admin |
| **Audit Logs** |||||
| GET | `/super-admin/audit-logs` | List audit logs | - | Super Admin |
| GET | `/super-admin/audit-logs/{log_id}` | Get audit log details | - | Super Admin |
| GET | `/super-admin/audit-logs/tenant/{tenant_id}` | Get tenant audit logs | - | Super Admin |
| GET | `/super-admin/audit-logs/user/{user_id}` | Get user audit logs | - | Super Admin |
| **Cross-Tenant Operations** |||||
| GET | `/super-admin/cross-tenant/users` | List all users across tenants | - | Super Admin |
| GET | `/super-admin/cross-tenant/data/{resource}` | Get resource data across tenants | - | Super Admin |
| POST | `/super-admin/cross-tenant/operations/bulk` | Bulk operations across tenants | `BulkOperationRequest` | Super Admin |

---

## 📝 Request/Response Examples {#examples}

### Authentication Examples

<details>
<summary>🔐 Login Request/Response</summary>

**Request**:
```json
POST /api/v1/auth/login/login
{
  "username": "admin",
  "password": "admin123"
}
```

**Response**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user_info": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "role": "Admin",
    "email": "admin@school.com"
  },
  "menu": [
    {
      "id": "uuid",
      "name": "Dashboard",
      "path": "/dashboard",
      "icon": "dashboard",
      "order": 1,
      "children": []
    },
    {
      "id": "uuid", 
      "name": "Masters",
      "path": null,
      "icon": "settings",
      "order": 2,
      "children": [
        {
          "id": "uuid",
          "name": "Academic Years",
          "path": "/masters/academic-years",
          "icon": "calendar",
          "order": 1
        }
      ]
    }
  ]
}
```
</details>

### Fee Management Examples

<details>
<summary>💰 Create Fee Category</summary>

**Request**:
```json
POST /api/v1/fee/categories/
{
  "category_name": "Tuition Fees",
  "description": "Regular tuition fees for all classes",
  "is_active": true
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "category_name": "Tuition Fees", 
  "description": "Regular tuition fees for all classes",
  "is_active": true,
  "created_at": "2025-09-10T10:30:00Z",
  "updated_at": "2025-09-10T10:30:00Z"
}
```
</details>

<details>
<summary>💰 Bulk Fee Class Mapping</summary>

**Request**:
```json
POST /api/v1/fee/class-mappings/bulk
{
  "fee_type_id": "550e8400-e29b-41d4-a716-446655440002",
  "fee_term_id": "550e8400-e29b-41d4-a716-446655440003",
  "academic_year_id": "550e8400-e29b-41d4-a716-446655440004",
  "mappings": [
    {
      "class_id": "550e8400-e29b-41d4-a716-446655440005",
      "term_amounts": [
        {
          "fee_term_date_id": "550e8400-e29b-41d4-a716-446655440006",
          "amount": 1000.00
        },
        {
          "fee_term_date_id": "550e8400-e29b-41d4-a716-446655440007", 
          "amount": 1000.00
        }
      ]
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "created_count": 1,
  "total_term_amounts": 2,
  "message": "Bulk fee class mappings created successfully",
  "created_mappings": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440008",
      "class_id": "550e8400-e29b-41d4-a716-446655440005",
      "fee_type_id": "550e8400-e29b-41d4-a716-446655440002",
      "term_amounts_count": 2
    }
  ]
}
```
</details>

### Student Management Examples

<details>
<summary>🎓 Create Student Admission</summary>

**Request**:
```json
POST /api/v1/students/admission/
{
  "student_name": "John Doe",
  "admission_number": "ADM2025001",
  "class_id": "550e8400-e29b-41d4-a716-446655440005",
  "section_id": "550e8400-e29b-41d4-a716-446655440009", 
  "academic_year_id": "550e8400-e29b-41d4-a716-446655440004",
  "date_of_birth": "2010-05-15",
  "admission_date": "2025-04-01",
  "parent_contact": "9876543210",
  "address": "123 Main Street, City"
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "student_name": "John Doe",
  "admission_number": "ADM2025001",
  "class_id": "550e8400-e29b-41d4-a716-446655440005",
  "section_id": "550e8400-e29b-41d4-a716-446655440009",
  "academic_year_id": "550e8400-e29b-41d4-a716-446655440004",
  "date_of_birth": "2010-05-15",
  "admission_date": "2025-04-01",
  "parent_contact": "9876543210",
  "address": "123 Main Street, City",
  "is_active": true,
  "created_at": "2025-09-10T10:30:00Z"
}
```
</details>

<details>
<summary>📋 Student Dropdown with Admission Numbers</summary>

**Request**:
```bash
GET /api/v1/students/admission/students/dropdown?active_only=true
```

**Response**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "display_name": "John Doe (ADM2025001)",
    "first_name": "John",
    "last_name": "Doe",
    "admission_number": "ADM2025001"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011", 
    "display_name": "Jane Smith (ADM2025002)",
    "first_name": "Jane",
    "last_name": "Smith", 
    "admission_number": "ADM2025002"
  }
]
```
</details>

<details>
<summary>📋 Simple Student Dropdown</summary>

**Request**:
```bash
GET /api/v1/students/admission/students/dropdown/simple?active_only=true
```

**Response**:
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440010",
    "name": "John Doe"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440011",
    "name": "Jane Smith"
  }
]
```
</details>

<details>
<summary>📋 List All Admissions (Paginated)</summary>

**Request**:
```bash
GET /api/v1/students/admission/?skip=0&limit=10
```

**Response**:
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440020",
      "student": {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "2010-05-15"
      },
      "admission_number": "ADM2025001",
      "admission_date": "2025-04-01",
      "current_class_id": "550e8400-e29b-41d4-a716-446655440005"
    }
  ],
  "total_count": 1,
  "has_next": false
}
```
</details>

### File Upload Examples

<details>
<summary>📁 Upload Student Certificate</summary>

**JavaScript Example**:
```javascript
async function uploadCertificate(studentId, certificateTypeId, file, description = '') {
  const formData = new FormData();
  formData.append('student_id', studentId);
  formData.append('certificate_type_id', certificateTypeId);
  formData.append('issue_date', new Date().toISOString().split('T')[0]);
  formData.append('description', description);
  
  if (file) {
    formData.append('certificate_file', file);
  }

  const response = await fetch('/api/v1/student/certificates/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'cschema': getTenant()
      // Do NOT set Content-Type header for FormData
    },
    body: formData
  });

  return response.json();
}
```

**Response**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440011",
  "student_id": "550e8400-e29b-41d4-a716-446655440010",
  "certificate_type_id": "550e8400-e29b-41d4-a716-446655440012",
  "issue_date": "2025-09-10",
  "description": "Bonafide Certificate",
  "file_path": "student_documents/certificates/cert_123.pdf",
  "created_at": "2025-09-10T10:30:00Z"
}
```
</details>

### Pagination Examples

<details>
<summary>📄 Paginated List Response</summary>

**Request**:
```
GET /api/v1/masters/academic_years/?skip=0&limit=10
```

**Response**:
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440004",
      "year": "2024-25",
      "start_date": "2024-04-01",
      "end_date": "2025-03-31",
      "is_active": true
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440013",
      "year": "2025-26", 
      "start_date": "2025-04-01",
      "end_date": "2026-03-31",
      "is_active": false
    }
  ],
  "total_count": 15,
  "has_next": true
}
```
</details>

---

## ❌ Error Handling {#error-handling}

### HTTP Status Codes
- **200**: Success
- **201**: Created successfully
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid/expired token)
- **402**: Payment Required (plan restriction)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **422**: Unprocessable Entity (business logic error)
- **500**: Internal Server Error

### Error Response Format
```json
{
  "detail": "Descriptive error message",
  "error_code": "SPECIFIC_ERROR_CODE",
  "field_errors": {
    "field_name": ["Field-specific error message"]
  }
}
```

### Common Error Examples

<details>
<summary>❌ Error Response Examples</summary>

**Authentication Error (401)**:
```json
{
  "detail": "Could not validate credentials",
  "error_code": "TOKEN_INVALID"
}
```

**Permission Error (403)**:
```json
{
  "detail": "Permission denied. User role 'Student' does not have permission 'academic_years:create'",
  "error_code": "INSUFFICIENT_PERMISSIONS"
}
```

**Plan Restriction (402)**:
```json
{
  "detail": "Your current plan (Basic) does not include access to this feature. Upgrade to Standard plan or higher.",
  "error_code": "PLAN_RESTRICTION",
  "required_plan": "Standard"
}
```

**Validation Error (400)**:
```json
{
  "detail": "Validation error",
  "field_errors": {
    "year": ["This field is required"],
    "start_date": ["Invalid date format"]
  }
}
```
</details>

---

## 🔒 Security & Permissions {#security-permissions}

### Multi-Layer Security
1. **Role-Based Permissions** (User's role in tenant)
2. **Plan-Based Permissions** (Tenant's subscription plan)

Both layers must allow access for a request to succeed.

### Available Roles & Permissions
- **Admin**: 130 permissions - Full system access
- **Staff**: 71 permissions - Administrative operations  
- **Teacher**: 60 permissions - Academic management
- **Student**: 48 permissions - Read-only academic info
- **Parent**: 38 permissions - Child-focused read access

### Available Plans & Resources
- **Basic**: 6 resources - Trial features
- **Standard**: 20 resources - Core school management
- **Premium**: 23 resources - Full features except admin tools
- **Enterprise**: 35 resources - Complete system access (now fully aligned)

### 3-Tier Permission Hierarchy

#### 1. Super Admin (System Level)
- **Scope**: Entire COS360 system across all tenants
- **Authentication**: Separate super admin login endpoint
- **Capabilities**:
  - Create and manage all tenants
  - Impersonate any tenant admin
  - View any tenant's data without restrictions
  - System-wide operations and configuration
  - Plan management and resource allocation
  - Global reporting and analytics
  - Audit trail access

#### 2. Tenant Admin (Organization Level)  
- **Scope**: Single tenant/organization
- **Access**: All modules within their tenant
- **Authentication**: Tenant-specific login
- **Capabilities**:
  - Full access to tenant data
  - User management within tenant
  - Organization configuration
  - Role and permission management

#### 3. Role-Based Users (Function Level)
- **Scope**: Specific modules/functions within tenant
- **Access**: Based on assigned role permissions
- **Authentication**: Tenant-specific login
- **Capabilities**: Determined by role assignments and plan limitations

### Permission Format
`{resource}:{action}` (e.g., `academic_years:create`, `students:read`)

### Common Patterns

**Check Permissions Before API Calls**:
```javascript
// Example permission checking
const canCreateStudent = user.role === 'Admin' || user.role === 'Staff';
const planAllowsStudents = tenant.plan !== 'Basic';

if (canCreateStudent && planAllowsStudents) {
  // Make API call
  await apiClient.apiCall('/api/v1/students/admission/', {
    method: 'POST',
    body: JSON.stringify(studentData)
  });
}
```

---

## 📊 API Summary

- **Total Endpoints**: 182+ CRUD operations (including 25+ Super Admin endpoints + 2 new student dropdowns)
- **Total Permissions**: 510+ (440+ role-based + 36 plan-based + Super Admin unlimited)
- **Protected Resources**: 36 system resources (fully aligned between plans and roles, including students)
- **Modules**: 9 complete modules (including Super Admin and enhanced Student Management)
- **Authentication**: JWT-based multi-tenant with 3-tier hierarchy
- **Response Format**: Consistent JSON with proper HTTP status codes
- **Permission Coverage**: 100% of endpoints now protected
- **Super Admin Capabilities**: Full system control across all tenants

### Recent Updates (2025-09-11)
- ✅ **Student Management Enhancement**: Added student dropdown endpoints and enhanced admission CRUD
- ✅ **Consolidated Architecture**: Unified all student operations under admission endpoints
- ✅ **Students Resource Protection**: Added "students" resource to role and plan permissions
- ✅ **Enhanced Pagination**: All list endpoints include `has_next` and `total_count` attributes
- ✅ **Complete CRUD Operations**: Full admission lifecycle management with comprehensive deletion

### Quick Reference
- **Authentication**: `cschema: test_tenant` header required
- **Test Credentials**: `admin` / `admin123` (Enterprise plan access)
- **Pagination**: `skip` and `limit` parameters with `has_next` indicator
- **File Uploads**: FormData with multipart/form-data
- **Error Handling**: Structured JSON responses with specific error codes

---

*Last Updated: 2025-09-11*  
*Version: Complete API Reference with 182+ Endpoints including Enhanced Student Management*

---

## 🔗 Related Documentation
- [Super Admin Implementation Plan](./SUPER_ADMIN_IMPLEMENTATION_PLAN.md) - Detailed implementation phases
- [Context Document](./CLAUDE.md) - Development guidelines and project structure
- [Public Schema Results](./public%20Schema%20results.txt) - Current permission mappings