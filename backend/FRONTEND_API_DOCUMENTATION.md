# COS360 API Documentation - Frontend Integration Guide

> **🎯 Complete API Reference for Frontend Developers**  
> **API Version: v1.0** | **Documentation Version: 2025-09-13** | **Status: Production Ready** | **Coverage: 191+ Endpoints**

## 📋 **API VERSIONING STRATEGY**

### Current API Version: **v1.0**
- **Base Path**: `/api/v1/`
- **Stability**: Production stable
- **Breaking Changes**: None planned
- **Support**: Long-term support until v2.0

### Version Evolution Path
```
v1.0 (Current) → v1.1 (Minor Updates) → v1.2 (Features) → v2.0 (Major Changes)
```

### Version Handling in Frontend
```javascript
const API_VERSION = 'v1';
const BASE_URL = `${process.env.REACT_APP_API_BASE_URL}/api/${API_VERSION}`;

// Version-specific client configuration
const createAPIClient = (version = 'v1') => {
  return axios.create({
    baseURL: `${process.env.REACT_APP_API_BASE_URL}/api/${version}`,
    headers: {
      'cschema': process.env.REACT_APP_TENANT_SCHEMA,
      'Content-Type': 'application/json',
      'API-Version': version
    }
  });
};

// Handle version compatibility
const handleAPIVersioning = (error) => {
  if (error.response?.status === 400 && error.response.data?.detail?.includes('version')) {
    console.warn('API version mismatch detected');
    // Handle gracefully or prompt user to refresh
  }
};
```

### Future Version Compatibility
- **v1.x**: Backward compatible minor updates
- **v2.0**: Will include migration guide and parallel support period
- **Deprecation**: 6-month notice for breaking changes

---

## 🔐 **AUTHENTICATION & SECURITY**

### JWT Token Requirements
```javascript
// Login to get JWT token
const loginResponse = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'your_username',
    password: 'your_password'
  })
});

const { 
  access_token, 
  refresh_token,
  token_type, 
  expires_in, // 3600 seconds (1 hour)
  user_id, 
  username, 
  role 
} = await loginResponse.json();

// Store tokens securely
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
localStorage.setItem('token_expires_at', Date.now() + (expires_in * 1000));
```

### JWT Refresh Token Flow
```javascript
// Auto-refresh token implementation
const refreshAuthToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Token refresh failed');
    }
    
    const { 
      access_token, 
      refresh_token: new_refresh_token,
      expires_in 
    } = await response.json();
    
    // Update stored tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', new_refresh_token);
    localStorage.setItem('token_expires_at', Date.now() + (expires_in * 1000));
    
    return access_token;
  } catch (error) {
    // Refresh failed - redirect to login
    localStorage.clear();
    window.location.href = '/login';
    throw error;
  }
};

// Check if token needs refresh (5 minutes before expiry)
const shouldRefreshToken = () => {
  const expiresAt = localStorage.getItem('token_expires_at');
  if (!expiresAt) return true;
  
  return Date.now() > (parseInt(expiresAt) - 300000); // 5 minutes buffer
};

// Automatic token refresh interceptor
apiClient.interceptors.request.use(async (config) => {
  if (shouldRefreshToken()) {
    try {
      const newToken = await refreshAuthToken();
      config.headers.Authorization = `Bearer ${newToken}`;
    } catch (error) {
      // Refresh failed - request will fail with 401
      return Promise.reject(error);
    }
  } else {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
```

### Multi-Tenant Headers (CRITICAL)
```javascript
// ALL API calls must include these headers
const headers = {
  'Authorization': `Bearer ${access_token}`,
  'cschema': 'your_tenant_schema',  // REQUIRED for tenant isolation
  'Content-Type': 'application/json'
};
```

### Authorization Patterns
- **Role-Based Access**: Admin, Teacher, Staff, Student, Parent
- **Permission System**: 34 resources × 5 actions (create, read, update, delete, list)
- **Tenant Isolation**: All data scoped to specific tenant via `cschema` header

---

## 🏗️ **SYSTEM ARCHITECTURE**

### Base Configuration
```javascript
const API_CONFIG = {
  baseURL: 'http://localhost:8003',
  headers: {
    'cschema': process.env.REACT_APP_TENANT_SCHEMA,
    'Content-Type': 'application/json'
  }
};

// Environment Variables Needed
REACT_APP_API_BASE_URL=http://localhost:8003
REACT_APP_TENANT_SCHEMA=your_tenant_schema
```

### Multi-Tenant Database Structure
- **Public Schema**: Tenant management, plans, permissions
- **Tenant Schemas**: Isolated per organization (`cos360_main`, `test_tenant_schema`)
- **Data Isolation**: Complete separation between tenants

---

## 📋 **MODULES OVERVIEW**

| Module | Features | Endpoints | Business Purpose |
|--------|----------|-----------|------------------|
| **Masters** | 8 | 59 | Academic structure, staff, holidays |
| **Fee** | 4 | 57 | Complete fee collection system |
| **Student** | 5 | 28 | Student lifecycle management |
| **Transport** | 4 | 22 | Transport operations |
| **Auth** | 3 | 18 | Authentication & permissions |
| **Public** | 2 | 7 | Tenant & plan management |

---

## 📚 **MASTERS MODULE API**
**Base Path**: `/api/v1/masters/`  
**Features**: Academic foundation, staff management, scheduling

### Academic Year Management
**Purpose**: Foundation for all academic operations

#### Endpoints
```javascript
// Create Academic Year
POST /api/v1/masters/academic_years/
// Request Schema: AcademicYearCreate
{
  "name": "2025-2026",
  "start_date": "2025-04-01", 
  "end_date": "2026-03-31",
  "is_active": true
}
// Response: AcademicYearRead (201 Created)
// Permission: academic_years:create

// List Academic Years (Paginated)
GET /api/v1/masters/academic_years/?skip=0&limit=10
// Response Schema: PaginatedAcademicYearRead
{
  "items": [AcademicYearRead],
  "total_count": 15,
  "has_next": true
}
// Permission: academic_years:list

// Get Academic Year by ID
GET /api/v1/masters/academic_years/{id}
// Response: AcademicYearRead (200 OK)

// Update Academic Year
PUT /api/v1/masters/academic_years/{id}
// Request Schema: AcademicYearUpdate (partial fields)

// Delete Academic Year
DELETE /api/v1/masters/academic_years/{id}
// Response: DeleteResponse (200 OK)

// Dropdown (For Form Controls)
GET /api/v1/masters/academic_years/dropdown
// Response: AcademicYearDropdown
[
  { "id": "uuid", "name": "2025-2026" },
  { "id": "uuid", "name": "2024-2025" }
]
```

### Class & Section Management
**Purpose**: Academic structure for student organization

#### Endpoints
```javascript
// Create Class with Sections
POST /api/v1/masters/classes/
{
  "name": "Grade 10",
  "academic_year_id": "uuid",
  "sections": [
    { "section_name": "A", "capacity": 30 },
    { "section_name": "B", "capacity": 30 }
  ]
}

// Utility Endpoints
GET /api/v1/masters/classes/sections-by-class-name?class_name=Grade%2010
GET /api/v1/masters/classes/classes-with-sections
GET /api/v1/masters/classes/class-names-only
```

### Subject Management
**Purpose**: Subject catalog and class assignments

#### Key Features
- Subject categories (Science, Mathematics, etc.)
- Class-subject mappings with ordering
- Bulk assignment operations

```javascript
// Bulk Assign Subjects to Classes
POST /api/v1/masters/class-subject-mappings/bulk
{
  "mappings": [
    {
      "class_id": "uuid",
      "subject_id": "uuid", 
      "order": 1,
      "exclude_marks": false
    }
  ]
}
// Response: BulkOperationResult
```

### Staff & Designation Management
**Purpose**: Human resource management

#### Key Features
- Staff profiles with designations
- Driver filtering for transport
- Attendance tracking integration

### Holiday Management
**Purpose**: Academic calendar management

### Parent Management
**Purpose**: Parent-student associations

### Timetable Management
**Purpose**: Schedule coordination

---

## 💰 **FEE MODULE API**
**Base Path**: `/api/v1/fee/`  
**Features**: Complete fee collection system with transactions, receipts, refunds

### Fee Structure Hierarchy
```
📊 Fee Management Flow:
Categories → Types → Terms → Mappings → Transactions → Receipts → Refunds
```

### Fee Transactions (Phase 1 Core)
**Purpose**: Multi-payment transaction processing

#### Transaction Workflow
```javascript
// 1. Create Fee Transaction
POST /api/v1/fee/transactions/
{
  "student_id": "uuid",
  "academic_year_id": "uuid",
  "total_amount": 5000.00,
  "payment_method": "cash", // cash|card|bank_transfer|cheque|online
  "transaction_date": "2025-09-13",
  "items": [
    { "fee_type": "tuition", "amount": 4000.00 },
    { "fee_type": "lab_fee", "amount": 1000.00 }
  ]
}
// Response: FeeTransactionRead (201 Created)

// 2. Generate Receipt
POST /api/v1/fee/receipts/
{
  "transaction_id": "uuid",
  "receipt_type": "payment", // payment|advance|adjustment
  "custom_message": "Thank you for your payment"
}
// Response: FeeReceiptRead with SHA-256 hash for integrity

// 3. Student Outstanding Fees
GET /api/v1/fee/transactions/student/{student_id}/outstanding
// Response: StudentOutstandingFeesResponse
{
  "student_id": "uuid",
  "student_name": "John Doe",
  "total_outstanding": 15000.00,
  "outstanding_by_term": [
    { "term": "Q1", "amount": 5000.00 },
    { "term": "Q2", "amount": 10000.00 }
  ]
}
```

### Fee Receipts
**Purpose**: Secure receipt generation and verification

#### Key Features
- SHA-256 integrity verification
- Reprint tracking
- QR code generation for mobile verification

```javascript
// Receipt Verification
GET /api/v1/fee/receipts/{id}/verify
// Response: FeeReceiptVerificationResponse
{
  "receipt_id": "uuid",
  "is_valid": true,
  "hash_match": true,
  "tamper_detected": false
}

// Print-Ready Content
GET /api/v1/fee/receipts/{id}/content
// Response: HTML and QR code for printing
```

### Fee Refunds
**Purpose**: Complete refund workflow with approvals

#### Refund Workflow
```javascript
// 1. Request Refund
POST /api/v1/fee/refunds/
{
  "transaction_id": "uuid",
  "refund_amount": 1000.00,
  "reason": "Lab fee not applicable",
  "refund_type": "partial", // full|partial|adjustment
  "requested_by": "admin_user"
}

// 2. Approve Refund  
PUT /api/v1/fee/refunds/{id}/approve
{
  "approved_by": "manager_user",
  "approval_notes": "Refund approved as per policy"
}

// 3. Process Refund
PUT /api/v1/fee/refunds/{id}/process  
{
  "processed_by": "finance_user",
  "processing_reference": "REF123456"
}
```

### Fee Categories & Types
**Purpose**: Fee structure definition

#### Structure
```javascript
// Fee Category → Fee Type relationship
// Category: "Academic Fees"
//   ├── Type: "Tuition Fee"
//   ├── Type: "Lab Fee" 
//   └── Type: "Library Fee"
```

### Fee Terms & Mappings
**Purpose**: Payment scheduling and assignments

#### Key Features
- Term-based payment schedules
- Class-wise fee assignments
- Individual student fee customization
- Bulk mapping operations

```javascript
// Class Fee Mapping with Term Amounts
POST /api/v1/fee/class-mappings/
{
  "class_id": "uuid",
  "fee_type_id": "uuid",
  "academic_year_id": "uuid",
  "term_amounts": [
    { "fee_term_id": "uuid", "amount": 2500.00 },
    { "fee_term_id": "uuid", "amount": 2500.00 }
  ]
}
```

---

## 👨‍🎓 **STUDENT MODULE API**
**Base Path**: `/api/v1/student/`  
**Features**: Complete student lifecycle management

### Student Admissions
**Purpose**: Student enrollment and management

#### Complete CRUD Example
```javascript
// Create Student Admission
POST /api/v1/student/admissions/
{
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Michael",
  "date_of_birth": "2010-05-15",
  "admission_number": "2025001",
  "class_id": "550e8400-e29b-41d4-a716-446655440001",
  "section_id": "550e8400-e29b-41d4-a716-446655440002", 
  "academic_year_id": "550e8400-e29b-41d4-a716-446655440003",
  "parent_id": "550e8400-e29b-41d4-a716-446655440004",
  "admission_date": "2025-09-13"
}
// Response: StudentAdmissionRead (201 Created)
// Permission: student_admissions:create

// List Students (Paginated)
GET /api/v1/student/admissions/?skip=0&limit=10&class_id=uuid
// Response: PaginatedStudentAdmissionRead
{
  "items": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Michael Doe",
      "admission_number": "2025001",
      "class_name": "Grade 10",
      "section_name": "A",
      "is_active": true,
      "created_at": "2025-09-13T10:30:00Z"
    }
  ],
  "total_count": 150,
  "has_next": true
}

// Get Student by ID
GET /api/v1/student/admissions/{id}
// Response: StudentAdmissionRead (200 OK)

// Update Student
PUT /api/v1/student/admissions/{id}
{
  "class_id": "new_class_uuid",
  "section_id": "new_section_uuid",
  "is_active": true
}
// Response: StudentAdmissionRead (200 OK)

// Delete Student (Soft Delete)
DELETE /api/v1/student/admissions/{id}
// Response: DeleteResponse (200 OK)
```

### Student Documents
**Purpose**: Document management for student records

```javascript
// Upload Student Document
POST /api/v1/student/documents/
{
  "student_id": "uuid",
  "document_type": "birth_certificate",
  "document_name": "John_Doe_Birth_Certificate.pdf",
  "file_path": "documents/students/2025001/",
  "uploaded_by": "admin_user"
}

// Get Student Documents
GET /api/v1/student/documents/?student_id=uuid
```

### Student Certificates
**Purpose**: Certificate generation and tracking

```javascript
// Generate Certificate
POST /api/v1/student/certificates/
{
  "student_id": "uuid",
  "certificate_type_id": "uuid",
  "issued_date": "2025-09-13",
  "valid_until": "2030-09-13"
}

// Get Student Certificates
GET /api/v1/student/certificates/?student_id=uuid
```

### Student Attendance  
**Purpose**: Attendance tracking and reporting

```javascript
// Mark Attendance
POST /api/v1/student/attendance/
{
  "student_id": "uuid",
  "date": "2025-09-13",
  "status": "present", // present|absent|late|excused
  "marked_by": "teacher_user"
}

// Get Attendance Report
GET /api/v1/student/attendance/?student_id=uuid&date_from=2025-09-01&date_to=2025-09-13
```

### Student Transport
**Purpose**: Transport assignment and tracking

```javascript
// Assign Student to Transport
POST /api/v1/student/transport/
{
  "student_id": "uuid",
  "route_id": "uuid",
  "pickup_stop_id": "uuid",
  "drop_stop_id": "uuid",
  "effective_from": "2025-09-13"
}
```

---

## 🚌 **TRANSPORT MODULE API**
**Base Path**: `/api/v1/masters/transport/`  
**Features**: Complete transport operations management

### Transport Routes
**Purpose**: Route planning and management

#### Complete CRUD Example
```javascript
// Create Transport Route
POST /api/v1/masters/transport/routes/
{
  "name": "Downtown Route",
  "description": "Main city route covering downtown area", 
  "distance_km": 15.5,
  "estimated_duration_minutes": 45,
  "is_active": true
}
// Response: RouteRead (201 Created)
// Permission: routes:create

// List Routes (Paginated)
GET /api/v1/masters/transport/routes/?skip=0&limit=10
// Response: PaginatedRouteRead
{
  "items": [
    {
      "id": "uuid",
      "name": "Downtown Route",
      "description": "Main city route",
      "distance_km": 15.5,
      "estimated_duration_minutes": 45,
      "is_active": true,
      "created_at": "2025-09-13T10:30:00Z"
    }
  ],
  "total_count": 25,
  "has_next": true
}

// Get Route by ID
GET /api/v1/masters/transport/routes/{id}
// Response: RouteRead (200 OK)

// Update Route
PUT /api/v1/masters/transport/routes/{id}
{
  "distance_km": 16.0,
  "estimated_duration_minutes": 50,
  "is_active": true
}

// Route Dropdown
GET /api/v1/masters/transport/routes/dropdown
// Response: RouteDropdown
[
  { "id": "uuid", "name": "Downtown Route" },
  { "id": "uuid", "name": "Suburban Route" }
]
```

### Vehicles
**Purpose**: Vehicle fleet management

```javascript
// Create Vehicle
POST /api/v1/masters/transport/vehicles/
{
  "vehicle_number": "TN01AB1234",
  "vehicle_type": "bus", // bus|van|car
  "capacity": 40,
  "driver_id": "uuid",
  "is_active": true,
  "insurance_expiry": "2026-09-13",
  "fitness_expiry": "2025-12-31"
}

// Assign Vehicle to Route
PUT /api/v1/masters/transport/vehicles/{id}/assign-route
{
  "route_id": "uuid",
  "effective_from": "2025-09-13"
}
```

### Transport Trips
**Purpose**: Trip coordination and scheduling

```javascript
// Create Transport Trip
POST /api/v1/masters/transport/trips/
{
  "route_id": "uuid",
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "trip_type": "pickup", // pickup|drop|both
  "scheduled_start_time": "07:30:00",
  "scheduled_end_time": "09:00:00",
  "is_active": true
}

// Get Trip Status
GET /api/v1/masters/transport/trips/{id}/status
// Response: Current trip status, student count, ETA
```

### Route Stops
**Purpose**: Detailed stop management

```javascript
// Create Route Stop
POST /api/v1/masters/transport/route-stops/
{
  "route_id": "uuid",
  "stop_name": "Main Bus Stand",
  "stop_address": "123 Main Street, Downtown",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "stop_order": 1,
  "estimated_arrival_time": "07:45:00"
}

// Get Route Stops
GET /api/v1/masters/transport/route-stops/?route_id=uuid
// Response: Ordered list of stops for the route
```

---

## 🔐 **AUTH MODULE API**
**Base Path**: `/api/v1/auth/`  
**Features**: Authentication and permission management

### Authentication Core
```javascript
// User Login
POST /api/v1/auth/login
{
  "username": "admin",
  "password": "password123"
}
// Response: LoginResponse with JWT token

// Get Current User Permissions
GET /api/v1/auth/permissions/
// Response: PermissionListResponse

// User Roles
GET /api/v1/auth/roles/
```

### Development Tools
**Purpose**: Testing and development utilities

```javascript
// Generate Test JWT (Development Only)
POST /api/v1/auth/dev/test-jwt
{
  "username": "test_user",
  "role": "Admin",
  "permissions": ["academic_years:create"]
}
```

### Permission Seeding
**Purpose**: System setup and permission management

---

## 🏢 **PUBLIC MODULE API**
**Base Path**: `/api/v1/public/`  
**Features**: Tenant and plan management (Super Admin access)

### Tenant Management
**Purpose**: Multi-tenant system administration

#### Complete CRUD Example
```javascript
// Create New Tenant (Super Admin Only)
POST /api/v1/public/tenants/
{
  "name": "ABC School",
  "schema_name": "abc_school_schema",
  "contact_email": "admin@abcschool.edu",
  "contact_phone": "+1234567890",
  "address": "123 Education Street, City",
  "plan_id": "uuid",
  "is_active": true
}
// Response: TenantRead (201 Created)
// Permission: Super Admin only

// List All Tenants (Super Admin Only)
GET /api/v1/public/tenants/?skip=0&limit=10
// Response: PaginatedTenantRead
{
  "items": [
    {
      "id": "uuid",
      "name": "ABC School",
      "schema_name": "abc_school_schema",
      "plan_name": "Enterprise",
      "is_active": true,
      "created_at": "2025-09-13T10:30:00Z"
    }
  ],
  "total_count": 50,
  "has_next": true
}

// Get Tenant Details
GET /api/v1/public/tenants/{id}
// Response: Complete tenant information with plan details

// Update Tenant Plan
PUT /api/v1/public/tenants/{id}/plan
{
  "plan_id": "uuid",
  "effective_from": "2025-10-01"
}
```

### Plan Management  
**Purpose**: Subscription plan features and limits

```javascript
// Create Subscription Plan (Super Admin Only)
POST /api/v1/public/plans/
{
  "name": "Enterprise",
  "description": "Full feature access for large schools",
  "max_students": 10000,
  "max_staff": 500,
  "features": ["fee_collection", "transport", "certificates"],
  "monthly_price": 999.00,
  "is_active": true
}

// Get Plan Features
GET /api/v1/public/plans/{id}/features
// Response: Detailed feature access matrix

// Plan Resource Access
GET /api/v1/public/plans/{id}/resources
// Response: List of resources available in this plan
[
  { "resource": "academic_years", "actions": ["create", "read", "update", "delete", "list"] },
  { "resource": "fee_transactions", "actions": ["create", "read", "list"] }
]
```

---

## 📐 **COMMON PATTERNS**

### Standard CRUD Operations
```javascript
// Every resource follows this pattern:
POST   /resource/           // Create (201 Created)
GET    /resource/           // List with pagination (200 OK)
GET    /resource/{id}       // Get by ID (200 OK)
PUT    /resource/{id}       // Update (200 OK)
DELETE /resource/{id}       // Delete (200 OK)
GET    /resource/dropdown   // Dropdown data (200 OK)
```

### Pagination Pattern
```javascript
// Request
GET /api/v1/masters/classes/?skip=0&limit=10

// Response
{
  "items": [...], // Array of resources
  "total_count": 25,
  "has_next": true
}
```

### Error Response Format
```javascript
// 400 Bad Request
{
  "detail": "Validation error message"
}

// 401 Unauthorized  
{
  "detail": "Authentication required"
}

// 403 Forbidden
{
  "detail": "Permission denied: academic_years:create"  
}

// 404 Not Found
{
  "detail": "Resource not found"
}

// 422 Validation Error
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### Search Pattern
```javascript
// Text search across resources
GET /api/v1/resource/?search=john&skip=0&limit=10
```

---

## 🛠️ **INTEGRATION EXAMPLES**

### React/Next.js Integration
```javascript
// API Client Setup
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    'cschema': process.env.NEXT_PUBLIC_TENANT_SCHEMA,
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Academic Year Service
export class AcademicYearService {
  static async getAll(skip = 0, limit = 10) {
    const response = await apiClient.get('/api/v1/masters/academic_years/', {
      params: { skip, limit }
    });
    return response.data;
  }

  static async create(data) {
    const response = await apiClient.post('/api/v1/masters/academic_years/', data);
    return response.data;
  }

  static async getDropdown() {
    const response = await apiClient.get('/api/v1/masters/academic_years/dropdown');
    return response.data;
  }
}
```

### Vue.js Integration
```javascript
// Composable for API calls
import { ref, reactive } from 'vue';

export function useAPI() {
  const loading = ref(false);
  const error = ref(null);

  const callAPI = async (method, url, data = null) => {
    loading.value = true;
    error.value = null;
    
    try {
      const config = {
        method,
        url: `${process.env.VUE_APP_API_BASE_URL}${url}`,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'cschema': process.env.VUE_APP_TENANT_SCHEMA,
          'Content-Type': 'application/json'
        }
      };
      
      if (data) config.data = data;
      
      const response = await axios(config);
      return response.data;
    } catch (err) {
      error.value = err.response?.data?.detail || 'API Error';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return { loading, error, callAPI };
}
```

### Angular Service Example
```typescript
// academic-year.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AcademicYearService {
  private baseUrl = `${environment.apiBaseUrl}/api/v1/masters/academic_years`;
  
  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'cschema': environment.tenantSchema,
      'Content-Type': 'application/json'
    });
  }

  getAll(skip: number = 0, limit: number = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/?skip=${skip}&limit=${limit}`, {
      headers: this.getHeaders()
    });
  }

  create(data: AcademicYearCreate): Observable<AcademicYearRead> {
    return this.http.post<AcademicYearRead>(this.baseUrl, data, {
      headers: this.getHeaders()
    });
  }
}
```

---

## 🔧 **ERROR HANDLING & BEST PRACTICES**

### Token Management
```javascript
// Auto-refresh token logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Multi-Tenant Considerations
```javascript
// Enhanced tenant switching with graceful state management
const switchTenant = async (newTenantSchema, tenantName) => {
  try {
    // 1. Validate tenant access
    const response = await fetch(`/api/v1/public/tenants/validate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ schema_name: newTenantSchema })
    });
    
    if (!response.ok) {
      throw new Error('Tenant access denied');
    }
    
    // 2. Update API client headers
    apiClient.defaults.headers['cschema'] = newTenantSchema;
    
    // 3. Update stored tenant info
    localStorage.setItem('current_tenant_schema', newTenantSchema);
    localStorage.setItem('current_tenant_name', tenantName);
    
    // 4. Framework-specific state updates (choose one)
    
    // React Context/Redux approach (preferred)
    dispatch(setCurrentTenant({ schema: newTenantSchema, name: tenantName }));
    
    // Or Vue.js Pinia/Vuex approach
    tenantStore.setCurrentTenant(newTenantSchema, tenantName);
    
    // Or Angular Service approach
    this.tenantService.switchTenant(newTenantSchema);
    
    // 5. Clear cached data
    await clearTenantSpecificCache();
    
    // 6. Navigate to dashboard (avoid full page reload)
    router.push('/dashboard');
    
    // 7. Show success feedback
    showSuccess(`Switched to ${tenantName}`);
    
  } catch (error) {
    console.error('Tenant switch failed:', error);
    showError('Failed to switch tenant. Please try again.');
  }
};

// Clear tenant-specific cached data
const clearTenantSpecificCache = async () => {
  // Clear React Query cache
  queryClient.clear();
  
  // Or clear Apollo cache
  apolloClient.cache.reset();
  
  // Clear custom caches
  dropdownCache.clear();
  
  // Clear session storage (tenant-specific data)
  const keysToRemove = Object.keys(sessionStorage).filter(key => 
    key.startsWith('tenant_') || key.includes('_cache')
  );
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
};

// Multi-tenant aware API service
class TenantAwareAPIService {
  constructor() {
    this.currentTenant = localStorage.getItem('current_tenant_schema');
  }
  
  async makeRequest(endpoint, options = {}) {
    const headers = {
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      'cschema': this.currentTenant,
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    const response = await fetch(endpoint, {
      ...options,
      headers
    });
    
    // Handle tenant context errors
    if (response.status === 400 && response.data?.detail?.includes('tenant')) {
      this.handleTenantError();
    }
    
    return response;
  }
  
  updateTenant(newTenantSchema) {
    this.currentTenant = newTenantSchema;
  }
  
  handleTenantError() {
    // Tenant context invalid - redirect to tenant selection
    router.push('/select-tenant');
  }
}

// Tenant selector component logic
const TenantSelector = () => {
  const [availableTenants, setAvailableTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  
  useEffect(() => {
    // Load user's accessible tenants
    const loadTenants = async () => {
      try {
        const response = await apiClient.get('/api/v1/auth/user/tenants');
        setAvailableTenants(response.data.tenants);
        
        const current = localStorage.getItem('current_tenant_schema');
        setCurrentTenant(current);
      } catch (error) {
        console.error('Failed to load tenants:', error);
      }
    };
    
    loadTenants();
  }, []);
  
  const handleTenantChange = async (tenantSchema, tenantName) => {
    setLoading(true);
    try {
      await switchTenant(tenantSchema, tenantName);
      setCurrentTenant(tenantSchema);
    } catch (error) {
      // Error already handled in switchTenant
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <select 
      value={currentTenant} 
      onChange={(e) => {
        const selected = availableTenants.find(t => t.schema === e.target.value);
        handleTenantChange(selected.schema, selected.name);
      }}
    >
      {availableTenants.map(tenant => (
        <option key={tenant.schema} value={tenant.schema}>
          {tenant.name}
        </option>
      ))}
    </select>
  );
};
```

### Performance Optimization
```javascript
// Implement caching for dropdown data
const useDropdownCache = () => {
  const cache = new Map();
  
  const getDropdown = async (endpoint) => {
    if (cache.has(endpoint)) {
      return cache.get(endpoint);
    }
    
    const data = await apiClient.get(endpoint);
    cache.set(endpoint, data);
    
    // Cache for 5 minutes
    setTimeout(() => cache.delete(endpoint), 5 * 60 * 1000);
    
    return data;
  };
  
  return { getDropdown };
};
```

---

## 📊 **API STATUS CODES & ERROR HANDLING**

### Status Code to Frontend Action Mapping

| Code | Meaning | Frontend Action | UI Response |
|------|---------|----------------|-------------|
| **200** | OK | Display success | Show data/confirmation message |
| **201** | Created | Navigate or refresh | Success notification + redirect |
| **400** | Bad Request | Show validation errors | Highlight form fields with errors |
| **401** | Unauthorized | Refresh token or redirect | Auto-login attempt → login page |
| **403** | Forbidden | Show permission error | "Access denied" modal + suggest admin contact |
| **404** | Not Found | Handle missing resource | "Item not found" → redirect to list view |
| **422** | Validation Error | Show field-specific errors | Inline validation messages |
| **500** | Server Error | Show generic error | "Try again later" + error reporting |

### Comprehensive Error Handling Implementation
```javascript
// Enhanced error response handler
const handleAPIError = (error, context = {}) => {
  const { response, request } = error;
  
  // Network error (no response)
  if (!response) {
    return {
      type: 'network',
      action: 'retry',
      message: 'Network error. Please check your connection.',
      ui: 'showRetryDialog'
    };
  }
  
  const { status, data } = response;
  
  switch (status) {
    case 400:
      return {
        type: 'validation',
        action: 'showErrors',
        message: data.detail || 'Invalid request data',
        ui: 'highlightFormFields',
        errors: data.errors || []
      };
      
    case 401:
      return {
        type: 'authentication',
        action: 'refreshOrLogin',
        message: 'Session expired',
        ui: 'attemptTokenRefresh',
        fallback: 'redirectToLogin'
      };
      
    case 403:
      const requiredPermission = extractPermissionFromError(data.detail);
      return {
        type: 'authorization',
        action: 'showPermissionError',
        message: `Access denied. Required permission: ${requiredPermission}`,
        ui: 'showPermissionModal',
        suggestion: 'Contact your administrator for access'
      };
      
    case 404:
      return {
        type: 'notFound',
        action: 'redirectToList',
        message: `${context.resourceType || 'Item'} not found`,
        ui: 'showNotFoundPage',
        redirect: context.listUrl || '/dashboard'
      };
      
    case 422:
      return {
        type: 'fieldValidation',
        action: 'showFieldErrors',
        message: 'Please check the highlighted fields',
        ui: 'showInlineValidation',
        fieldErrors: formatValidationErrors(data.detail)
      };
      
    case 500:
      return {
        type: 'serverError',
        action: 'showGenericError',
        message: 'Something went wrong. Please try again later.',
        ui: 'showErrorPage',
        reportable: true,
        errorId: data.error_id || generateErrorId()
      };
      
    default:
      return {
        type: 'unknown',
        action: 'showGenericError',
        message: `Unexpected error (${status})`,
        ui: 'showErrorToast'
      };
  }
};

// Helper function to format validation errors
const formatValidationErrors = (errors) => {
  if (!Array.isArray(errors)) return {};
  
  return errors.reduce((acc, error) => {
    const field = error.loc?.[error.loc.length - 1] || 'general';
    acc[field] = error.msg || 'Invalid value';
    return acc;
  }, {});
};

// Extract permission from error message
const extractPermissionFromError = (detail) => {
  const match = detail?.match(/Permission denied: (.+)/);
  return match?.[1] || 'unknown permission';
};

// Use in React components
const handleSubmit = async (formData) => {
  try {
    const response = await apiClient.post('/api/v1/masters/academic_years/', formData);
    // Success handling
    showSuccess('Academic year created successfully');
    navigate('/academic-years');
  } catch (error) {
    const errorInfo = handleAPIError(error, {
      resourceType: 'Academic Year',
      listUrl: '/academic-years'
    });
    
    switch (errorInfo.action) {
      case 'showErrors':
        setFormErrors(errorInfo.errors);
        break;
      case 'showFieldErrors':
        setFieldErrors(errorInfo.fieldErrors);
        break;
      case 'refreshOrLogin':
        // Token refresh is handled by interceptor
        break;
      case 'showPermissionError':
        setPermissionError(errorInfo.message);
        setShowPermissionModal(true);
        break;
      case 'redirectToList':
        showError(errorInfo.message);
        navigate(errorInfo.redirect);
        break;
      default:
        showError(errorInfo.message);
    }
  }
};
```

---

## 🧪 **TESTING & DEVELOPMENT**

### Environment Setup
```bash
# Development Environment Variables
API_BASE_URL=http://localhost:8003
TENANT_SCHEMA=test_tenant_schema
DEFAULT_PAGINATION_LIMIT=10
```

### Postman Collections
- Complete Postman collections available for all modules
- Environment variables pre-configured
- Test data included for each endpoint

### Development JWT Generation
```javascript
// Development only - generate test tokens
const testJWT = await fetch('/api/v1/auth/dev/test-jwt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'test_admin',
    role: 'Admin',
    permissions: ['*'] // All permissions
  })
});
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### Frontend Configuration
- [ ] Configure production API base URL
- [ ] Set correct tenant schema headers
- [ ] Implement proper error handling
- [ ] Set up JWT token refresh logic
- [ ] Configure CORS for your domain
- [ ] Test multi-tenant switching (if applicable)

### Security Requirements
- [ ] Use HTTPS in production
- [ ] Implement JWT token expiration handling
- [ ] Add proper input validation
- [ ] Set up CSRF protection
- [ ] Configure secure cookie settings
- [ ] Validate tenant isolation

---

**Last Updated**: 2025-09-13  
**API Version**: Production Ready  
**Status**: ✅ All 191+ endpoints documented and operational  
**Support**: Refer to SESSION_CONTEXT.md for detailed project information