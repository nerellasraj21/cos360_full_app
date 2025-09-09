# COS360 API Documentation for Frontend Developers & Automation Testers

## 🚀 Quick Start Guide

### Environment Setup
```bash
# Clone and start the application
git clone <repository-url>
cd COS360
pip install -r requirements.txt

# Start development server
uvicorn app.main:app --reload --port 8003

# Database setup (if needed)
alembic upgrade head
```

### Base URL
```
Development: http://localhost:8003
Production: https://your-domain.com
```

### Required Headers (ALL REQUESTS)
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
cschema: test_tenant
```

> **⚠️ CRITICAL: Tenant Header Change**  
> The tenant header MUST be `cschema` (not `X-Client-Name`).  
> Using the wrong header will result in HTTP 402 "Payment Required" errors  
> because the system won't detect your tenant correctly.

### Tenant Configuration
Available test tenants:
- `test_tenant` - Basic plan tenant for development
- `test_basic` - Basic plan with limitations  
- `default` - Enterprise plan with full access

## 📊 Data Models & Schema Reference

### Core Entity UUIDs (For Testing)
```javascript
// Sample UUIDs for testing - use these for consistent testing
const TEST_ENTITIES = {
  academic_year: "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  classes: [
    "550e8400-e29b-41d4-a716-446655440001", // Grade 10A
    "550e8400-e29b-41d4-a716-446655440002", // Grade 10B
    "550e8400-e29b-41d4-a716-446655440003"  // Grade 10C
  ],
  students: [
    "550e8400-e29b-41d4-a716-446655441001", // John Doe
    "550e8400-e29b-41d4-a716-446655441002", // Jane Smith  
    "550e8400-e29b-41d4-a716-446655441003"  // Bob Wilson
  ],
  fee_types: [
    "550e8400-e29b-41d4-a716-446655440010", // Tuition Fee
    "550e8400-e29b-41d4-a716-446655440011"  // Lab Fee
  ],
  sections: [
    "550e8400-e29b-41d4-a716-446655440101", // Section A
    "550e8400-e29b-41d4-a716-446655440102"  // Section B
  ]
};
```

### Entity Relationships
```
Academic Year (1) → (N) Fee Categories → (N) Fee Types
Class (1) → (N) Sections → (N) Students
Fee Types + Classes = Fee Class Mappings
Fee Types + Students = Fee Student Mappings
Students (N) → (1) Admissions (admission_number)
```

### Common Field Types
```javascript
// UUID fields (string format)
id: "550e8400-e29b-41d4-a716-446655440001"

// Decimal fields (number format)  
total_fee: 1500.00

// Date fields (ISO string format)
start_date: "2025-04-01"
end_date: "2026-03-31"

// Boolean fields
is_active: true
all_by_default: false
```

## 📋 Testing & Automation Guide

### Postman Collection Setup
```json
// Environment Variables for Postman
{
  "base_url": "http://localhost:8003",
  "admin_token": "{{admin_jwt_token}}",
  "student_token": "{{student_jwt_token}}",
  "tenant_name": "test_tenant",
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90"
}
```

### Pre-request Script (Add to Postman Collection)
```javascript
// Auto-fetch JWT tokens before requests
pm.sendRequest({
    url: pm.environment.get("base_url") + "/api/v1/auth/test-jwt/admin-token",
    method: 'GET',
}, function (err, response) {
    if (!err) {
        const token = response.json().access_token;
        pm.environment.set("admin_jwt_token", token);
    }
});
```

### Test Scenarios for Automation
```javascript
// 1. Authentication Test Cases
const authTestCases = [
  {
    name: "Valid Admin Token",
    token: "valid_admin_token",
    expected: 200
  },
  {
    name: "Invalid Token", 
    token: "invalid_token",
    expected: 401
  },
  {
    name: "Missing Token",
    token: null,
    expected: 401
  },
  {
    name: "Student Token on Admin Endpoint",
    token: "valid_student_token",
    expected: 403
  }
];

// 2. Plan Limitation Test Cases  
const planTestCases = [
  {
    tenant: "test_basic", // Basic plan
    endpoint: "fee_categories",
    action: "create",
    expected: 402
  },
  {
    tenant: "default", // Enterprise plan
    endpoint: "fee_categories", 
    action: "create",
    expected: 201
  }
];

// 3. Bulk Operations Test Cases
const bulkTestCases = [
  {
    name: "All Success",
    class_ids: ["uuid1", "uuid2", "uuid3"],
    expected: { success_count: 3, total_count: 3 }
  },
  {
    name: "Partial Success",
    class_ids: ["valid_uuid", "invalid_uuid"], 
    expected: { success_count: 1, total_count: 2 }
  },
  {
    name: "All Failures",
    class_ids: ["invalid1", "invalid2"],
    expected: { success_count: 0, total_count: 2 }
  }
];
```

## Response Format & Error Handling

### Standard Response Structure
```json
// Success Response (200/201)
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "field1": "value1",
  "field2": "value2",
  "created_at": "2025-09-07T12:00:00Z"
}

// List Response (200)
[
  {
    "id": "uuid1", 
    "name": "Item 1"
  },
  {
    "id": "uuid2",
    "name": "Item 2" 
  }
]

// Bulk Operation Response
{
  "success_count": 2,
  "total_count": 3,
  "created_mappings": [...],
  "errors": [...],
  "message": "Success summary"
}
```

### HTTP Status Codes
- `200` - Success (GET requests)
- `201` - Created (POST requests)  
- `401` - Unauthorized (Missing/invalid token)
- `402` - Payment Required (Plan limitation - upgrade needed)
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

### Complete Error Reference

#### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

#### 403 Forbidden  
```json
{
  "detail": "Insufficient permissions: Student cannot create academic_years"
}
```

#### 402 Plan Limitation
```json
{
  "error": "plan_limitation",
  "message": "This feature requires a Premium plan upgrade", 
  "current_plan": "Basic",
  "required_plan": "Premium",
  "resource": "fee_categories",
  "action": "create",
  "upgrade_available": true
}
```

#### 404 Not Found
```json
{
  "detail": "Academic year with id 550e8400-e29b-41d4-a716-446655440001 not found"
}
```

#### 422 Validation Errors
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "total_fee"], 
      "msg": "Value error, total_fee must be non-negative",
      "input": -100.0,
      "ctx": {"error": {}}
    },
    {
      "type": "missing",
      "loc": ["body", "academic_year_id"],
      "msg": "Field required"
    }
  ]
}
```

#### 500 Server Error
```json
{
  "detail": "An error occurred while processing your request"
}
```

### Business Logic Error Patterns
```json
// Duplicate Record
{
  "detail": "Academic year with title 'Test Year' already exists for this period"
}

// Related Record Not Found
{
  "detail": "Fee type with id 550e8400-e29b-41d4-a716-446655440010 not found" 
}

// Business Rule Violation
{
  "detail": "Cannot delete academic year: active fee mappings exist"
}

// Bulk Operation Errors
{
  "success_count": 1,
  "total_count": 3,
  "errors": [
    {
      "class_id": "550e8400-e29b-41d4-a716-446655440002",
      "class_name": "Grade 10B",
      "error": "Fee mapping already exists for this combination",
      "error_code": "DUPLICATE_MAPPING"
    },
    {
      "class_id": "550e8400-e29b-41d4-a716-446655440003", 
      "error": "Class not found",
      "error_code": "CLASS_NOT_FOUND"
    }
  ]
}
```

## ⚡ Performance & Rate Limiting

### Response Time Expectations
```javascript
// Expected response times (95th percentile)
const performanceExpectations = {
  "GET /single-record": "< 200ms",
  "GET /list": "< 500ms", 
  "POST /create": "< 300ms",
  "PUT /update": "< 300ms",
  "DELETE /delete": "< 200ms",
  "POST /bulk": "< 2000ms" // Bulk operations
};
```

### Rate Limiting
```http
# Current rate limits (per IP address)
Rate-Limit: 1000 requests per hour
Rate-Limit-Remaining: 995
Rate-Limit-Reset: 1694123456

# When rate limit exceeded (HTTP 429)
{
  "detail": "Rate limit exceeded. Try again in 3600 seconds.",
  "retry_after": 3600
}
```

### Pagination (For List Endpoints)
```javascript
// Large datasets automatically paginated
// Use query parameters for pagination
const paginationParams = {
  page: 1,        // Page number (default: 1)
  per_page: 50,   // Items per page (default: 50, max: 100)
  sort_by: "created_at",  // Sort field
  sort_order: "desc"      // asc or desc
};

// Response includes pagination metadata
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total": 250,
    "pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

### Caching Headers
```http
# GET endpoints include caching headers
Cache-Control: public, max-age=300
ETag: "abc123def456"
Last-Modified: Mon, 07 Sep 2025 12:00:00 GMT

# Use conditional requests for efficiency
If-None-Match: "abc123def456"
If-Modified-Since: Mon, 07 Sep 2025 12:00:00 GMT
```

## 🧪 Frontend Integration Patterns

### React/JavaScript Examples
```javascript
// 1. API Service Class
class COS360API {
  constructor(baseURL, authToken, tenantName) {
    this.baseURL = baseURL;
    this.authToken = authToken;
    this.tenantName = tenantName;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'cschema': this.tenantName,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data, response.status);
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error instanceof APIError) {
      return error;
    }
    
    // Network or other errors
    return new APIError({ detail: 'Network error occurred' }, 0);
  }

  // Academic Years
  async getAcademicYears() {
    return this.request('/api/v1/masters/academic_years/');
  }

  async createAcademicYear(data) {
    return this.request('/api/v1/masters/academic_years/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Bulk Operations
  async createBulkFeeClassMappings(data) {
    return this.request('/api/v1/fee/class-mappings/bulk', {
      method: 'POST', 
      body: JSON.stringify(data)
    });
  }
}

// 2. Custom Error Class
class APIError extends Error {
  constructor(errorData, statusCode) {
    super(errorData.detail || errorData.message || 'API Error');
    this.statusCode = statusCode;
    this.errorData = errorData;
    
    // Plan limitation error
    if (statusCode === 402) {
      this.isPlanLimitation = true;
      this.currentPlan = errorData.current_plan;
      this.requiredPlan = errorData.required_plan;
    }
    
    // Validation error
    if (statusCode === 422) {
      this.isValidationError = true;
      this.validationErrors = errorData.detail;
    }
  }
}

// 3. React Hook for API Integration
function useAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCall = async (apiMethod, ...args) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiMethod(...args);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      
      // Handle specific error types
      if (err.isPlanLimitation) {
        // Show upgrade modal
        showUpgradeModal(err.currentPlan, err.requiredPlan);
      } else if (err.isValidationError) {
        // Show validation errors
        showValidationErrors(err.validationErrors);
      }
      
      throw err;
    }
  };

  return { loading, error, apiCall };
}

// 4. Component Usage Example
function AcademicYearManager() {
  const { loading, error, apiCall } = useAPI();
  const [academicYears, setAcademicYears] = useState([]);

  useEffect(() => {
    loadAcademicYears();
  }, []);

  const loadAcademicYears = async () => {
    try {
      const years = await apiCall(api.getAcademicYears);
      setAcademicYears(years);
    } catch (err) {
      console.error('Failed to load academic years:', err);
    }
  };

  const createYear = async (yearData) => {
    try {
      const newYear = await apiCall(api.createAcademicYear, yearData);
      setAcademicYears([...academicYears, newYear]);
      showSuccessMessage('Academic year created successfully');
    } catch (err) {
      // Error handling is done in useAPI hook
    }
  };

  if (loading) return <LoadingSpinner />;
  
  return (
    <div>
      {error && <ErrorMessage error={error} />}
      <AcademicYearList years={academicYears} />
      <CreateYearForm onSubmit={createYear} />
    </div>
  );
}
```

### Validation Helper Functions
```javascript
// Field validation helpers
const validators = {
  uuid: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },
  
  positiveDecimal: (value) => {
    return typeof value === 'number' && value >= 0;
  },
  
  dateString: (value) => {
    return !isNaN(Date.parse(value));
  },
  
  nonEmptyArray: (value) => {
    return Array.isArray(value) && value.length > 0;
  }
};

// Form validation example
function validateBulkClassMapping(data) {
  const errors = {};
  
  if (!validators.nonEmptyArray(data.class_ids)) {
    errors.class_ids = 'At least one class must be selected';
  } else if (!data.class_ids.every(validators.uuid)) {
    errors.class_ids = 'All class IDs must be valid UUIDs';
  }
  
  if (!validators.uuid(data.fee_type_id)) {
    errors.fee_type_id = 'Fee type ID must be a valid UUID';
  }
  
  if (!validators.positiveDecimal(data.total_fee)) {
    errors.total_fee = 'Total fee must be a positive number';
  }
  
  return Object.keys(errors).length ? errors : null;
}
```

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

## User Login (Multi-Tenant with Hierarchical Menu)

### Login Endpoint
```http
POST /api/v1/auth/login/login
```

This endpoint authenticates users and returns their role-based hierarchical menu structure along with access tokens.

**Headers:**
```
Content-Type: application/json
cschema: test_tenant
```
> Note: The `cschema` header is optional if the client_name is provided in the request body.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "client_name": "test_tenant"  // Optional if cschema header is provided
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@school.com",
    "is_active": true
  },
  "role": {
    "id": 1,
    "name": "Admin",
    "description": "System Administrator"
  },
  "menu": [
    {
      "id": 1,
      "name": "Dashboard",
      "path": "/dashboard",
      "display_order": 1,
      "children": [
        {
          "id": 11,
          "name": "Analytics",
          "path": "/dashboard/analytics",
          "display_order": 1
        },
        {
          "id": 12,
          "name": "Reports",
          "path": "/dashboard/reports",
          "display_order": 2
        }
      ]
    },
    {
      "id": 2,
      "name": "Academic",
      "path": "/academic",
      "display_order": 2,
      "children": [
        {
          "id": 21,
          "name": "Academic Years",
          "path": "/academic/years",
          "display_order": 1
        },
        {
          "id": 22,
          "name": "Classes",
          "path": "/academic/classes",
          "display_order": 2,
          "children": [
            {
              "id": 221,
              "name": "Sections",
              "path": "/academic/classes/sections",
              "display_order": 1
            }
          ]
        }
      ]
    },
    {
      "id": 3,
      "name": "Fee Management",
      "path": "/fees",
      "display_order": 3
    }
  ],
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**

**401 - Invalid Credentials:**
```json
{
  "detail": "Invalid Credentials"
}
```

**401 - Invalid Tenant:**
```json
{
  "detail": "Invalid connection"
}
```

**500 - Server Error:**
```json
{
  "detail": "Authentication service unavailable"
}
```

### Key Points:
- **Token Expiry**: Access token expires in 24 hours, Refresh token expires in 7 days
- **Menu Structure**: Hierarchical menu with up to 4 levels (L0, L1, L2, L3)
- **Multi-Tenant**: Tenant detection via `cschema` header or `client_name` in body
- **Role-Based Menu**: Menu items filtered based on user's role permissions
- **Nested Children**: Menu items can have nested children for sub-menus

### Refresh Token Endpoint
```http
POST /api/v1/auth/login/refresh
```

Use this endpoint to get new access and refresh tokens before the current access token expires.

**Headers:**
```
Content-Type: application/json
```
> Note: No authentication header required, only the refresh token in body

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Responses:**

**401 - Invalid/Expired Refresh Token:**
```json
{
  "detail": "Invalid refresh token"
}
```

**401 - Invalid Tenant:**
```json
{
  "detail": "Invalid connection"
}
```

**500 - Server Error:**
```json
{
  "detail": "Token refresh service unavailable"
}
```

### Token Refresh Strategy
1. **Store both tokens securely** on the client side (e.g., httpOnly cookies or secure storage)
2. **Monitor access token expiry** - refresh when token has < 5 minutes remaining
3. **Use refresh token** to get new token pair before access token expires
4. **Both tokens are refreshed** - store the new refresh token as well
5. **If refresh fails** - redirect user to login page

### JavaScript Example:
```javascript
async function refreshAccessToken(currentRefreshToken) {
  try {
    const response = await fetch('http://localhost:8003/api/v1/auth/login/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: currentRefreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Store new tokens
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    
    return data.access_token;
  } catch (error) {
    // Redirect to login on refresh failure
    window.location.href = '/login';
  }
}

// Auto-refresh logic
function setupTokenRefresh() {
  setInterval(async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Decode JWT to check expiry (you'll need a JWT decode library)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;
      
      // Refresh if less than 5 minutes remaining
      if (timeUntilExpiry < 5 * 60 * 1000) {
        const refreshToken = localStorage.getItem('refresh_token');
        await refreshAccessToken(refreshToken);
      }
    }
  }, 60000); // Check every minute
}
```

### Logout Endpoint
```http
POST /api/v1/auth/login/logout
```

Simple client-side logout that validates the token and instructs the client to clear all authentication data.

**Headers:**
```
Authorization: Bearer <access_token>
cschema: test_tenant
Content-Type: application/json
```

**Success Response (200):**
```json
{
  "message": "Logout successful",
  "instructions": {
    "clear_tokens": true,
    "clear_menu": true,
    "redirect_to": "/login"
  }
}
```

**Error Responses:**

**401 - Missing/Invalid Token:**
```json
{
  "detail": "Authorization header missing or invalid"
}
```

**401 - Expired Token:**
```json
{
  "detail": "Invalid token"
}
```

**500 - Server Error:**
```json
{
  "detail": "Logout service unavailable"
}
```

### Logout Implementation Example:
```javascript
async function logout() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // No token, just clear everything and redirect
      clearAuthData();
      window.location.href = '/login';
      return;
    }

    const response = await fetch('http://localhost:8003/api/v1/auth/login/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'cschema': localStorage.getItem('tenant') || 'test_tenant',
        'Content-Type': 'application/json'
      }
    });

    // Always clear auth data regardless of response
    clearAuthData();

    if (response.ok) {
      const data = await response.json();
      console.log('Logout successful:', data.message);
      
      // Follow server instructions
      if (data.instructions.redirect_to) {
        window.location.href = data.instructions.redirect_to;
      }
    } else {
      // Token might be expired, but we still cleared client-side
      console.warn('Logout request failed, but client data cleared');
      window.location.href = '/login';
    }
  } catch (error) {
    // Network error or other issues - still clear client data
    console.error('Logout error:', error);
    clearAuthData();
    window.location.href = '/login';
  }
}

function clearAuthData() {
  // Clear tokens
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  
  // Clear menu and other cached data
  localStorage.removeItem('userMenu');
  localStorage.removeItem('userInfo');
  localStorage.removeItem('tenant');
  
  // Clear any session storage
  sessionStorage.clear();
}

// Usage
document.getElementById('logout-btn').addEventListener('click', logout);
```

### Important Logout Notes:

1. **Always Clear Client Data**: Even if the logout request fails, always clear tokens and cached data
2. **Graceful Degradation**: Handle cases where token is already expired or invalid
3. **Network Resilience**: Clear data even on network failures
4. **Complete Cleanup**: Remove all authentication-related data from storage
5. **Redirect Safely**: Always redirect to login page after logout
6. **Token Validation**: Server validates token to prevent unauthorized logout calls

## Menu Structure & Navigation Guide

### Understanding the Hierarchical Menu System

The COS360 system uses a 4-level hierarchical menu structure that is dynamically filtered based on user roles. Each menu item can have children, creating a nested navigation tree.

### Menu Database Structure

**Menu Table Fields:**
- `id` (UUID): Unique identifier for the menu item
- `name` (String): Display name of the menu item
- `url/path` (String): Navigation path (nullable for parent items)
- `level` (String): Menu level - L0 (root), L1, L2, L3 (deepest)
- `parent_id` (UUID): Reference to parent menu item (null for root items)
- `display_order` (Integer): Sort order within the same level

**Permission Structure:**
- Each role has specific menu permissions defined in `role_menu_permissions` table
- `can_view`: Boolean indicating if the role can see this menu item
- `can_edit`: Boolean for future edit permissions (currently unused)

### Menu Levels Explained

```
L0 (Root Level)
├── L1 (Main Sections)
│   ├── L2 (Sub-sections)
│   │   └── L3 (Specific Pages)
```

**Example Structure:**
```json
{
  "id": "uuid-1",
  "name": "Academic",           // L0 - Root menu
  "path": null,                 // No direct path, just a container
  "display_order": 1,
  "children": [
    {
      "id": "uuid-11",
      "name": "Academic Years",  // L1 - Section
      "path": "/academic/years",
      "display_order": 1
    },
    {
      "id": "uuid-12", 
      "name": "Classes",         // L1 - Section with children
      "path": "/academic/classes",
      "display_order": 2,
      "children": [
        {
          "id": "uuid-121",
          "name": "Sections",    // L2 - Sub-section
          "path": "/academic/classes/sections",
          "display_order": 1
        },
        {
          "id": "uuid-122",
          "name": "Subjects",    // L2 - Sub-section
          "path": "/academic/classes/subjects",
          "display_order": 2
        }
      ]
    }
  ]
}
```

### Role-Based Menu Filtering

The menu returned in the login response is automatically filtered based on the user's role:

**Admin Role Example:**
- Sees all menu items including system settings, user management, and reports

**Teacher Role Example:**
- Sees academic management, student records, attendance
- No access to fee management or system settings

**Student Role Example:**
- Limited to personal dashboard, assignments, and grades
- No administrative functions

**Parent Role Example:**
- Access to child's information, fee payments, and communication

### Important Menu Properties

1. **Dynamic Loading**: Menu is loaded once during login, not on every page
2. **Permission-Based**: Only shows items the user's role can access
3. **Sorted Display**: Items are sorted by `display_order` at each level
4. **Nested Structure**: Can have unlimited depth (but limited to L3 in practice)
5. **Path Handling**: 
   - Parent items may have `null` path (just containers)
   - Leaf items always have a valid navigation path

### Menu Item Types

**Container Items** (usually L0, some L1):
```json
{
  "name": "Fee Management",
  "path": null,  // No direct navigation
  "children": [...]  // Has sub-items
}
```

**Navigable Items** (usually L1, L2, L3):
```json
{
  "name": "Fee Categories",
  "path": "/fees/categories",  // Direct navigation path
  "children": []  // May or may not have children
}
```

**Leaf Items** (usually L2, L3):
```json
{
  "name": "Create New Fee",
  "path": "/fees/categories/new"
  // No children property or empty array
}
```

### Frontend Implementation Tips

1. **Cache the menu** from login response - don't fetch it repeatedly
2. **Use recursive components** for rendering nested structures
3. **Handle null paths** - these are just visual containers, not navigable
4. **Respect display_order** - always sort by this field
5. **Show/hide based on children** - use expand/collapse for items with children
6. **Active state** - match current route with menu paths for highlighting

## Menu Rendering Implementation Examples

### React Component Example

```jsx
// MenuComponent.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const MenuItem = ({ item, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = location.pathname === item.path;
  
  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <li className={`menu-item level-${level} ${isActive ? 'active' : ''}`}>
      {item.path ? (
        <Link 
          to={item.path} 
          className="menu-link"
          onClick={handleToggle}
        >
          {hasChildren && (
            <span className="menu-arrow">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="menu-text">{item.name}</span>
        </Link>
      ) : (
        <div 
          className="menu-header" 
          onClick={handleToggle}
        >
          {hasChildren && (
            <span className="menu-arrow">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span className="menu-text">{item.name}</span>
        </div>
      )}
      
      {hasChildren && isExpanded && (
        <ul className="menu-children">
          {item.children.map(child => (
            <MenuItem 
              key={child.id} 
              item={child} 
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const NavigationMenu = ({ menuData }) => {
  // menuData comes from login response
  return (
    <nav className="navigation-menu">
      <ul className="menu-root">
        {menuData.map(item => (
          <MenuItem key={item.id} item={item} />
        ))}
      </ul>
    </nav>
  );
};

// Usage in App component
const App = () => {
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    // After successful login
    const loginResponse = await login(username, password);
    setMenu(loginResponse.menu);
    localStorage.setItem('menu', JSON.stringify(loginResponse.menu));
  }, []);

  return <NavigationMenu menuData={menu} />;
};
```

### Vue Component Example

```vue
<!-- MenuItem.vue -->
<template>
  <li :class="['menu-item', `level-${level}`, { active: isActive }]">
    <router-link 
      v-if="item.path"
      :to="item.path"
      class="menu-link"
      @click="toggleExpand"
    >
      <span v-if="hasChildren" class="menu-arrow">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span class="menu-text">{{ item.name }}</span>
    </router-link>
    
    <div 
      v-else
      class="menu-header"
      @click="toggleExpand"
    >
      <span v-if="hasChildren" class="menu-arrow">
        {{ isExpanded ? '▼' : '▶' }}
      </span>
      <span class="menu-text">{{ item.name }}</span>
    </div>
    
    <ul v-if="hasChildren && isExpanded" class="menu-children">
      <menu-item
        v-for="child in item.children"
        :key="child.id"
        :item="child"
        :level="level + 1"
      />
    </ul>
  </li>
</template>

<script>
export default {
  name: 'MenuItem',
  props: {
    item: {
      type: Object,
      required: true
    },
    level: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      isExpanded: false
    };
  },
  computed: {
    hasChildren() {
      return this.item.children && this.item.children.length > 0;
    },
    isActive() {
      return this.$route.path === this.item.path;
    }
  },
  methods: {
    toggleExpand() {
      if (this.hasChildren) {
        this.isExpanded = !this.isExpanded;
      }
    }
  }
};
</script>

<!-- NavigationMenu.vue -->
<template>
  <nav class="navigation-menu">
    <ul class="menu-root">
      <menu-item
        v-for="item in menuData"
        :key="item.id"
        :item="item"
      />
    </ul>
  </nav>
</template>

<script>
import MenuItem from './MenuItem.vue';

export default {
  name: 'NavigationMenu',
  components: {
    MenuItem
  },
  props: {
    menuData: {
      type: Array,
      required: true
    }
  }
};
</script>
```

### CSS Styling Example

```css
.navigation-menu {
  width: 250px;
  background: #2c3e50;
  color: #ecf0f1;
}

.menu-root, .menu-children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.menu-item {
  position: relative;
}

.menu-link, .menu-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  text-decoration: none;
  color: #ecf0f1;
  cursor: pointer;
  transition: background 0.3s;
}

.menu-link:hover, .menu-header:hover {
  background: #34495e;
}

.menu-item.active > .menu-link {
  background: #3498db;
  color: #fff;
}

.menu-arrow {
  margin-right: 8px;
  font-size: 12px;
}

.menu-children {
  background: rgba(0, 0, 0, 0.1);
}

/* Indentation for nested levels */
.level-1 .menu-link,
.level-1 .menu-header {
  padding-left: 32px;
}

.level-2 .menu-link,
.level-2 .menu-header {
  padding-left: 48px;
}

.level-3 .menu-link,
.level-3 .menu-header {
  padding-left: 64px;
}
```

### Menu State Management

```javascript
// menuStore.js - Vuex/Redux/Context example
const menuStore = {
  state: {
    menu: [],
    expandedItems: [],
    activeItem: null
  },
  
  mutations: {
    SET_MENU(state, menu) {
      state.menu = menu;
      // Persist to localStorage
      localStorage.setItem('userMenu', JSON.stringify(menu));
    },
    
    TOGGLE_ITEM(state, itemId) {
      const index = state.expandedItems.indexOf(itemId);
      if (index > -1) {
        state.expandedItems.splice(index, 1);
      } else {
        state.expandedItems.push(itemId);
      }
    },
    
    SET_ACTIVE_ITEM(state, itemPath) {
      state.activeItem = itemPath;
    }
  },
  
  actions: {
    async login({ commit }, credentials) {
      const response = await api.login(credentials);
      commit('SET_MENU', response.menu);
      return response;
    },
    
    loadMenuFromStorage({ commit }) {
      const storedMenu = localStorage.getItem('userMenu');
      if (storedMenu) {
        commit('SET_MENU', JSON.parse(storedMenu));
      }
    }
  },
  
  getters: {
    getMenuByPath: (state) => (path) => {
      const findItem = (items, targetPath) => {
        for (const item of items) {
          if (item.path === targetPath) return item;
          if (item.children) {
            const found = findItem(item.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      };
      return findItem(state.menu, path);
    }
  }
};
```

### Important Implementation Notes

1. **Menu Persistence**: Store menu in localStorage/sessionStorage after login
2. **Deep Linking**: Support direct navigation to nested menu items
3. **Keyboard Navigation**: Add arrow key support for accessibility
4. **Mobile Responsive**: Create hamburger menu for mobile devices
5. **Permission Checks**: Menu already filtered by backend, no need for frontend permission logic
6. **Lazy Loading**: For large menus, consider lazy-loading child items
7. **Search**: Add menu search functionality for quick navigation

---

# 📐 API Standards & Conventions

## Pagination

All list endpoints support pagination using the following query parameters:

### Standard Pagination Parameters
```
GET /api/v1/resource?skip=0&limit=10
```

**Parameters:**
- `skip` (integer, optional): Number of records to skip. Default: 0, Min: 0
- `limit` (integer, optional): Number of records to return. Default: 10, Min: 1, Max: 100

**Pagination Response Format:**
```json
[
  { "id": "uuid-1", "name": "Item 1" },
  { "id": "uuid-2", "name": "Item 2" }
]
```
> Note: Currently returns array directly. Total count is not included in response.

### Pagination Examples

**First Page (10 items):**
```
GET /api/v1/masters/academic_years?skip=0&limit=10
```

**Second Page:**
```
GET /api/v1/masters/academic_years?skip=10&limit=10
```

**Get All (up to 100):**
```
GET /api/v1/masters/academic_years?skip=0&limit=100
```

### JavaScript Pagination Helper
```javascript
class PaginationHelper {
  constructor(baseUrl, limit = 10) {
    this.baseUrl = baseUrl;
    this.limit = limit;
    this.currentPage = 1;
  }

  async fetchPage(page) {
    const skip = (page - 1) * this.limit;
    const response = await fetch(
      `${this.baseUrl}?skip=${skip}&limit=${this.limit}`,
      {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'cschema': getTenant()
        }
      }
    );
    
    const data = await response.json();
    this.currentPage = page;
    
    // Since API doesn't return total, check if we got less than limit
    const hasMore = data.length === this.limit;
    
    return {
      data,
      page,
      hasMore,
      isEmpty: data.length === 0
    };
  }

  nextPage() {
    return this.fetchPage(this.currentPage + 1);
  }

  previousPage() {
    if (this.currentPage > 1) {
      return this.fetchPage(this.currentPage - 1);
    }
    return this.fetchPage(1);
  }
}

// Usage
const paginator = new PaginationHelper('/api/v1/masters/academic_years');
const firstPage = await paginator.fetchPage(1);
```

## Search & Filtering

### Query Parameter Conventions

Filters are passed as query parameters with the field name:

```
GET /api/v1/resource?field_name=value&other_field=value
```

### Common Filter Patterns

**Filter by Foreign Key (UUID):**
```
GET /api/v1/fee/categories?academic_year_id=606ec4d2-f0e1-4262-bd06-9da9d1d8ee90
```

**Filter by Boolean:**
```
GET /api/v1/fee/class-mappings?all_by_default=true
```

**Filter by Status:**
```
GET /api/v1/masters/academic_years?active_only=true
```

**Multiple Filters (AND operation):**
```
GET /api/v1/fee/class-mappings?class_id=uuid-1&fee_type_id=uuid-2&all_by_default=false
```

### Available Filters by Module

**Academic Years:**
- `active_only` (boolean): Return only active years

**Fee Categories:**
- `academic_year_id` (UUID): Filter by academic year

**Fee Class Mappings:**
- `class_id` (UUID): Filter by class
- `fee_type_id` (UUID): Filter by fee type
- `all_by_default` (boolean): Filter by default assignment flag

**Fee Student Mappings:**
- `student_id` (UUID): Filter by student
- `class_id` (UUID): Filter by class
- `fee_type_id` (UUID): Filter by fee type

### Filter Implementation Example
```javascript
class APIClient {
  buildQueryString(filters) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    return params.toString();
  }

  async fetchWithFilters(endpoint, filters = {}) {
    const queryString = this.buildQueryString(filters);
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    
    return fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'cschema': this.tenant
      }
    });
  }
}

// Usage
const client = new APIClient();
const filters = {
  academic_year_id: '606ec4d2-f0e1-4262-bd06-9da9d1d8ee90',
  active_only: true,
  skip: 0,
  limit: 20
};

const response = await client.fetchWithFilters('/api/v1/fee/categories', filters);
```

## Date & Time Handling

### Date Format Standards

**Date Fields (without time):**
- Format: `YYYY-MM-DD` (ISO 8601 date format)
- Example: `"2025-04-01"`
- Used for: `start_date`, `end_date`, `admission_date`, `date_of_birth`

**Timestamp Fields (with time):**
- Format: `YYYY-MM-DDTHH:mm:ss` (ISO 8601 datetime)
- Example: `"2025-09-09T14:30:00"`
- Timezone: Server timezone (timestamps stored without timezone)
- Used for: `created_at`, `updated_at`

### Date Field Examples

**Request with Date:**
```json
{
  "title": "Academic Year 2025-26",
  "start_date": "2025-04-01",
  "end_date": "2026-03-31",
  "is_active": true
}
```

**Response with Timestamps:**
```json
{
  "id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "title": "Academic Year 2025-26",
  "start_date": "2025-04-01",
  "end_date": "2026-03-31",
  "is_active": true,
  "created_at": "2025-09-09T10:30:45",
  "updated_at": "2025-09-09T10:30:45"
}
```

### Date Handling in JavaScript

```javascript
// Parse date from API
const parseAPIDate = (dateString) => {
  // For date-only fields (YYYY-MM-DD)
  if (dateString.length === 10) {
    return new Date(dateString + 'T00:00:00');
  }
  // For timestamps
  return new Date(dateString);
};

// Format date for API request
const formatDateForAPI = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format timestamp for display
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Usage
const academicYear = {
  start_date: formatDateForAPI('2025-04-01'),
  end_date: formatDateForAPI(new Date(2026, 2, 31))
};

// Display
const created = formatTimestamp(response.created_at);
// Output: "Sep 9, 2025, 10:30 AM"
```

### Important Date/Time Notes

1. **No Timezone in Database**: Timestamps are stored without timezone
2. **Server Timezone**: All times are in server's local timezone
3. **Date Validation**: End date must be after start date
4. **Auto Timestamps**: `created_at` and `updated_at` are automatically managed
5. **Date-Only Fields**: Time component is ignored if sent
6. **ISO 8601 Format**: Always use ISO format for consistency

## Rate Limiting

The API implements rate limiting on various endpoints:

### Rate Limit Tiers

**Create Operations:**
- Limit: 30 requests per minute
- Applies to: POST endpoints for creating resources

**Dropdown/List Operations:**
- Limit: 100 requests per minute
- Applies to: GET endpoints for dropdowns and lists

**Standard API Operations:**
- Limit: 60 requests per minute
- Applies to: General CRUD operations

### Rate Limit Headers

When rate limited, the API returns:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1694350140
Retry-After: 60
```

### Handling Rate Limits in Frontend

```javascript
class RateLimitHandler {
  async makeRequest(url, options) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || 60;
      console.warn(`Rate limited. Retrying after ${retryAfter} seconds`);
      
      // Optional: Show user notification
      showNotification(`Too many requests. Please wait ${retryAfter} seconds.`);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return this.makeRequest(url, options);
    }
    
    return response;
  }
}
```

---

# 📁 File Operations

## File Upload

The COS360 system supports file uploads for student certificates and documents using multipart/form-data.

### Supported File Types

**Certificate Files:**
- PDF files (recommended)
- Image files (PNG, JPG, JPEG)
- Document files (DOC, DOCX)

**Document Files:**
- All common document types
- No explicit size limits documented

### Upload Endpoints

#### Upload Student Certificate
```http
POST /api/v1/student/certificates/
```

**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
Content-Type: multipart/form-data
```

**Form Data:**
```
student_id: 550e8400-e29b-41d4-a716-446655441001  (required, UUID)
certificate_type_id: 550e8400-e29b-41d4-a716-446655442001  (required, UUID)
issue_date: 2025-09-01  (optional, YYYY-MM-DD format)
description: Certificate description  (optional, string)
certificate_file: [file]  (optional, file upload)
```

**Success Response (201):**
```json
{
  "id": "certificate-uuid",
  "student_id": "550e8400-e29b-41d4-a716-446655441001",
  "certificate_type_id": "550e8400-e29b-41d4-a716-446655442001",
  "issue_date": "2025-09-01",
  "description": "Certificate description",
  "certificate_file": "/uploaded_certificates/uuid-filename.pdf",
  "student": {
    "id": "550e8400-e29b-41d4-a716-446655441001",
    "name": "John Doe",
    "admission_number": "ADM001"
  }
}
```

#### Upload Student Document
```http
POST /api/v1/students/documents/
```

**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
Content-Type: multipart/form-data
```

**Form Data:**
```
student_id: 550e8400-e29b-41d4-a716-446655441001  (required, UUID)
document_type: ID_Card  (required, string)
document_file: [file]  (required, file upload)
```

**Success Response (201):**
```json
{
  "id": "document-uuid",
  "student_id": "550e8400-e29b-41d4-a716-446655441001",
  "document_type": "ID_Card",
  "file_path": "/uploaded_documents/uuid-filename.pdf",
  "upload_date": "2025-09-09T10:30:45"
}
```

### JavaScript File Upload Examples

#### Using Fetch API
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

  try {
    const response = await fetch('/api/v1/student/certificates/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'cschema': getTenant()
        // Note: Do NOT set Content-Type header - let browser set it with boundary
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Certificate upload failed:', error);
    throw error;
  }
}

// Usage
const fileInput = document.getElementById('certificate-file');
const file = fileInput.files[0];

if (file) {
  const result = await uploadCertificate(
    'student-uuid', 
    'certificate-type-uuid', 
    file, 
    'Bonafide Certificate'
  );
  console.log('Certificate uploaded:', result);
}
```

#### Using Axios
```javascript
import axios from 'axios';

async function uploadDocument(studentId, documentType, file) {
  const formData = new FormData();
  formData.append('student_id', studentId);
  formData.append('document_type', documentType);
  formData.append('document_file', file);

  try {
    const response = await axios.post('/api/v1/students/documents/', formData, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'cschema': getTenant(),
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });

    return response.data;
  } catch (error) {
    console.error('Document upload failed:', error.response?.data || error.message);
    throw error;
  }
}
```

#### React Upload Component Example
```jsx
import React, { useState } from 'react';

const FileUploadComponent = ({ studentId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('document_type', 'General');
    formData.append('document_file', file);

    try {
      const response = await fetch('/api/v1/students/documents/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'cschema': localStorage.getItem('tenant')
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        onUploadSuccess(result);
        setFile(null);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="upload-component">
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      />
      
      {file && (
        <div>
          <p>Selected: {file.name} ({Math.round(file.size / 1024)}KB)</p>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? `Uploading... ${progress}%` : 'Upload File'}
          </button>
        </div>
      )}
      
      {uploading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
};
```

## File Download

### Download Endpoints

#### Download Certificate File
```http
GET /api/v1/student/certificates/{certificate_id}/download
```

**Headers:**
```
Authorization: Bearer <token>
cschema: test_tenant
```

**Response:**
- Content-Type: `application/pdf` (for direct viewing)
- Content-Disposition: `attachment; filename="certificate.pdf"` (for download)
- File binary data

#### Download Implementation Examples

```javascript
// Download and save file
async function downloadCertificate(certificateId, filename = 'certificate.pdf') {
  try {
    const response = await fetch(`/api/v1/student/certificates/${certificateId}/download`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'cschema': getTenant()
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    // Get file as blob
    const blob = await response.blob();
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return blob;
  } catch (error) {
    console.error('Certificate download failed:', error);
    throw error;
  }
}

// Preview file in browser (for PDFs)
async function previewCertificate(certificateId) {
  try {
    const response = await fetch(`/api/v1/student/certificates/${certificateId}/download`, {
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'cschema': getTenant()
      }
    });

    if (!response.ok) {
      throw new Error(`Preview failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Open in new window for preview
    window.open(url, '_blank');
    
    return url;
  } catch (error) {
    console.error('Certificate preview failed:', error);
    throw error;
  }
}

// Download with progress tracking
async function downloadWithProgress(certificateId, onProgress) {
  const response = await fetch(`/api/v1/student/certificates/${certificateId}/download`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'cschema': getTenant()
    }
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = parseInt(contentLength, 10);
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;
    
    chunks.push(value);
    loaded += value.length;
    
    if (onProgress && total) {
      const progress = Math.round((loaded / total) * 100);
      onProgress(progress);
    }
  }

  const blob = new Blob(chunks);
  return blob;
}

// Usage with progress
await downloadWithProgress('certificate-uuid', (progress) => {
  console.log(`Download progress: ${progress}%`);
});
```

### File Operation Error Handling

```javascript
class FileOperationError extends Error {
  constructor(message, status, response) {
    super(message);
    this.status = status;
    this.response = response;
    this.name = 'FileOperationError';
  }
}

async function safeFileOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Response) {
      const errorData = await error.json().catch(() => ({}));
      
      switch (error.status) {
        case 401:
          throw new FileOperationError('Authentication required', 401, errorData);
        case 403:
          throw new FileOperationError('Insufficient permissions', 403, errorData);
        case 404:
          throw new FileOperationError('File not found', 404, errorData);
        case 413:
          throw new FileOperationError('File too large', 413, errorData);
        case 415:
          throw new FileOperationError('Unsupported file type', 415, errorData);
        default:
          throw new FileOperationError('File operation failed', error.status, errorData);
      }
    }
    throw error;
  }
}

// Usage
try {
  const result = await safeFileOperation(() => 
    uploadCertificate(studentId, certificateTypeId, file)
  );
  console.log('Upload successful:', result);
} catch (error) {
  if (error instanceof FileOperationError) {
    console.error(`File operation failed (${error.status}):`, error.message);
    // Show appropriate user message based on error type
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Important File Handling Notes

1. **Security**: Only Admin role can upload files (certificates and documents)
2. **File Storage**: Files are stored on server filesystem with UUID-generated names
3. **File Extensions**: Original extensions are preserved during upload
4. **Download Content-Type**: PDF files return `application/pdf`, others may vary
5. **Error Handling**: Always handle 404 for missing files, 403 for permissions
6. **File Validation**: Frontend should validate file types before upload
7. **Progress Tracking**: Implement progress bars for large file uploads
8. **Cleanup**: Always cleanup blob URLs to prevent memory leaks

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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
```

### Update Academic Year
```http
PUT /api/v1/masters/academic_years/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
```

### Get Fee Types Dropdown
```http
GET /api/v1/fee/types/dropdown?fee_category_id={id}
```
**Headers:**
```
Authorization: Bearer <token>
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

### Delete Fee Type
```http
DELETE /api/v1/fee/types/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

### Delete Fee Term
```http
DELETE /api/v1/fee/terms/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
```

### Delete Fee Term Date
```http
DELETE /api/v1/fee/terms/dates/{fee_term_date_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

### Delete Fee Class Mapping
```http
DELETE /api/v1/fee/class-mappings/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

### Delete Fee Student Mapping
```http
DELETE /api/v1/fee/student-mappings/{id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
  'cschema': 'test_tenant',
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
      'cschema': 'test_tenant',
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
cschema: test_tenant
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
cschema: test_tenant
```

### Get Classes Dropdown
```http
GET /api/v1/masters/class_sections/dropdown?active_only=true
```
**Headers:**
```
Authorization: Bearer <token>
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

### Delete Class
```http
DELETE /api/v1/masters/class_sections/{class_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

#### Delete Staff Enrollment
```http
DELETE /api/v1/staff/enrollment/{staff_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
```

### Staff Lists

#### Get All Staff
```http
GET /api/v1/staff/?gender={gender}
```
**Headers:**
```
Authorization: Bearer <token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
Content-Type: application/json
```

### Delete Subject
```http
DELETE /api/v1/masters/subjects/{subject_id}
```
**Headers:**
```
Authorization: Bearer <admin_token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
```

### Get Subject Categories Dropdown
```http
GET /api/v1/masters/subject_categories/categories/dropdown
```
**Headers:**
```
Authorization: Bearer <token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
```

### Get Routes Dropdown
```http
GET /api/v1/masters/routes/dropdown?active_only=true
```
**Headers:**
```
Authorization: Bearer <token>
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: test_tenant
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
cschema: tenant_name
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
cschema: tenant_name
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
cschema: tenant_name
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
cschema: tenant_name
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
cschema: tenant_name
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
cschema: tenant_name
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

## Resource Permission Management ⚙️
**Base URL:** `/api/v1/auth/resource-permissions`  
**Permissions:** Admin only (critical system administration)
**Plan Required:** Enterprise

### Create Resource Permission
```http
POST /api/v1/auth/resource-permissions/
Authorization: Bearer <admin_token>
cschema: tenant_name
Content-Type: application/json

{
  "role_id": "550e8400-e29b-41d4-a716-446655440000",
  "resource": "fee_categories",
  "action": "create",
  "is_granted": true
}
```
**Multi-Layer Security:**
- ✅ JWT Authentication required
- ✅ Admin role required
- ✅ Enterprise plan required

### List All Resource Permissions
```http
GET /api/v1/auth/resource-permissions/?skip=0&limit=100
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Get Permissions by Role
```http
GET /api/v1/auth/resource-permissions/role/{role_id}
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Get Permissions by Resource
```http
GET /api/v1/auth/resource-permissions/resource/fee_categories
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Bulk Create Permissions
```http
POST /api/v1/auth/resource-permissions/bulk
Authorization: Bearer <admin_token>
cschema: tenant_name
Content-Type: application/json

{
  "role_id": "550e8400-e29b-41d4-a716-446655440000",
  "permissions": [
    {
      "resource": "students",
      "action": "create",
      "is_granted": true
    },
    {
      "resource": "students", 
      "action": "read",
      "is_granted": true
    }
  ]
}
```

### Get Role Permission Summary
```http
GET /api/v1/auth/resource-permissions/role/{role_id}/summary
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Get Permission Matrix
```http
GET /api/v1/auth/resource-permissions/matrix/all
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Update Resource Permission
```http
PUT /api/v1/auth/resource-permissions/{permission_id}
Authorization: Bearer <admin_token>
cschema: tenant_name
Content-Type: application/json

{
  "is_granted": false
}
```

### Delete Resource Permission
```http
DELETE /api/v1/auth/resource-permissions/{permission_id}
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Delete All Permissions for Role
```http
DELETE /api/v1/auth/resource-permissions/role/{role_id}/all
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Get Available Resources (Dropdown)
```http
GET /api/v1/auth/resource-permissions/dropdown/resources
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Get Available Actions (Dropdown)
```http
GET /api/v1/auth/resource-permissions/dropdown/actions
Authorization: Bearer <admin_token>
cschema: tenant_name
```

### Check Permission Exists
```http
GET /api/v1/auth/resource-permissions/check/{role_id}/fee_categories/create
Authorization: Bearer <admin_token>
cschema: tenant_name
```

**Response:**
```json
{
  "role_id": "550e8400-e29b-41d4-a716-446655440000",
  "resource": "fee_categories",
  "action": "create",
  "permission_granted": true
}
```

---

## 📦 BULK OPERATIONS - Fee Management Efficiency Enhancement

### **🚀 NEW: Bulk Fee Class Mapping**

**Purpose**: Map a single fee type to multiple classes at once to reduce user interactions.

#### Create Bulk Fee Class Mappings
```http
POST /api/v1/fee/class-mappings/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json
cschema: tenant_name

{
  "class_ids": [
    "550e8400-e29b-41d4-a716-446655440001",
    "550e8400-e29b-41d4-a716-446655440002",
    "550e8400-e29b-41d4-a716-446655440003"
  ],
  "fee_type_id": "550e8400-e29b-41d4-a716-446655440010",
  "total_fee": 1500.00,
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
  "all_by_default": false
}
```

**Response (Partial Success Example):**
```json
{
  "success_count": 2,
  "total_count": 3,
  "created_mappings": [
    {
      "id": "mapping-uuid-1",
      "class_id": "550e8400-e29b-41d4-a716-446655440001",
      "class_name": "Grade 10A",
      "fee_type_id": "550e8400-e29b-41d4-a716-446655440010",
      "fee_type_name": "Tuition Fee",
      "total_fee": 1500.00,
      "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
      "academic_year_name": "2025-26",
      "all_by_default": false,
      "class_fee_mapping_terms": []
    },
    {
      "id": "mapping-uuid-2", 
      "class_id": "550e8400-e29b-41d4-a716-446655440002",
      "class_name": "Grade 10B",
      "fee_type_name": "Tuition Fee",
      "total_fee": 1500.00
    }
  ],
  "errors": [
    {
      "class_id": "550e8400-e29b-41d4-a716-446655440003",
      "class_name": "Grade 10C",
      "error": "Fee class mapping already exists for this combination of class, fee type, and academic year",
      "error_code": "DUPLICATE_MAPPING"
    }
  ],
  "message": "Successfully created 2 out of 3 fee class mappings. 1 failed."
}
```

**Validation Rules:**
- `class_ids`: Must contain at least 1 UUID, no duplicates allowed
- `total_fee`: Must be non-negative
- All referenced entities (classes, fee_type, academic_year) must exist
- Duplicate mappings for same class+fee_type+academic_year combination rejected

### **🚀 NEW: Bulk Fee Student Mapping**

**Purpose**: Map fees to multiple students from a class at once with comprehensive student details.

#### Create Bulk Fee Student Mappings
```http
POST /api/v1/fee/student-mappings/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json
cschema: tenant_name

{
  "student_ids": [
    "550e8400-e29b-41d4-a716-446655441001", 
    "550e8400-e29b-41d4-a716-446655441002",
    "550e8400-e29b-41d4-a716-446655441003"
  ],
  "class_id": "550e8400-e29b-41d4-a716-446655440001",
  "section_id": "550e8400-e29b-41d4-a716-446655440101", 
  "fee_type_id": "550e8400-e29b-41d4-a716-446655440010",
  "total_fee": 1500.00,
  "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90"
}
```

**Response (Partial Success Example):**
```json
{
  "success_count": 2,
  "total_count": 3,
  "created_mappings": [
    {
      "id": "student-mapping-uuid-1",
      "student_id": "550e8400-e29b-41d4-a716-446655441001",
      "student_admission_num": "ADM2025001",
      "class_id": "550e8400-e29b-41d4-a716-446655440001",
      "section_id": "550e8400-e29b-41d4-a716-446655440101",
      "fee_type_id": "550e8400-e29b-41d4-a716-446655440010",
      "total_fee": 1500.00,
      "academic_year_id": "606ec4d2-f0e1-4262-bd06-9da9d1d8ee90",
      "student_details": {
        "student_id": "550e8400-e29b-41d4-a716-446655441001",
        "student_name": "John Doe",
        "student_admission_number": "ADM2025001",
        "student_class": {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "name": "Grade 10"
        },
        "student_section": {
          "id": "550e8400-e29b-41d4-a716-446655440101", 
          "name": "Section A"
        }
      },
      "fee_type_name": "Tuition Fee",
      "academic_year_name": "2025-26",
      "student_fee_mapping_terms": []
    },
    {
      "id": "student-mapping-uuid-2",
      "student_id": "550e8400-e29b-41d4-a716-446655441002",
      "student_details": {
        "student_name": "Jane Smith",
        "student_admission_number": "ADM2025002"
      },
      "total_fee": 1500.00
    }
  ],
  "errors": [
    {
      "student_id": "550e8400-e29b-41d4-a716-446655441003",
      "student_name": "Bob Wilson",
      "student_admission_num": "ADM2025003", 
      "error": "Fee student mapping already exists for this combination of student, fee type, and academic year",
      "error_code": "DUPLICATE_MAPPING"
    }
  ],
  "message": "Successfully created 2 out of 3 fee student mappings. 1 failed."
}
```

**Validation Rules:**
- `student_ids`: Must contain at least 1 UUID, no duplicates allowed
- `total_fee`: Must be non-negative
- All referenced entities (students, class, section, fee_type, academic_year) must exist
- Students must have valid admission records
- Duplicate mappings for same student+fee_type+academic_year combination rejected

### **JavaScript Usage Examples**

#### Bulk Fee Class Mapping
```javascript
// Create bulk fee class mappings
async function createBulkFeeClassMappings(authToken, tenantName, mappingData) {
  try {
    const response = await fetch('/api/v1/fee/class-mappings/bulk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'cschema': tenantName
      },
      body: JSON.stringify(mappingData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success: ${result.success_count}/${result.total_count} mappings created`);
      console.log('Created mappings:', result.created_mappings);
      
      if (result.errors.length > 0) {
        console.log('⚠️ Errors occurred:', result.errors);
      }
    } else {
      console.error('❌ Request failed:', result.detail);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Network error:', error);
    throw error;
  }
}

// Usage
const bulkClassMapping = {
  class_ids: ['class-uuid-1', 'class-uuid-2', 'class-uuid-3'],
  fee_type_id: 'fee-type-uuid',
  total_fee: 1500.00,
  academic_year_id: 'academic-year-uuid',
  all_by_default: false
};

createBulkFeeClassMappings(adminToken, 'my_school', bulkClassMapping);
```

#### Bulk Fee Student Mapping
```javascript
// Create bulk fee student mappings
async function createBulkFeeStudentMappings(authToken, tenantName, mappingData) {
  try {
    const response = await fetch('/api/v1/fee/student-mappings/bulk', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'cschema': tenantName
      },
      body: JSON.stringify(mappingData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success: ${result.success_count}/${result.total_count} student mappings created`);
      console.log('Created mappings:', result.created_mappings);
      
      // Log student details
      result.created_mappings.forEach(mapping => {
        if (mapping.student_details) {
          console.log(`📝 Mapped fee to: ${mapping.student_details.student_name} (${mapping.student_details.student_admission_number})`);
        }
      });
      
      if (result.errors.length > 0) {
        console.log('⚠️ Errors occurred:');
        result.errors.forEach(error => {
          console.log(`  - ${error.student_name || error.student_id}: ${error.error}`);
        });
      }
    } else {
      console.error('❌ Request failed:', result.detail);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Network error:', error);
    throw error;
  }
}

// Usage
const bulkStudentMapping = {
  student_ids: ['student-uuid-1', 'student-uuid-2', 'student-uuid-3'],
  class_id: 'class-uuid',
  section_id: 'section-uuid',
  fee_type_id: 'fee-type-uuid',
  total_fee: 1500.00,
  academic_year_id: 'academic-year-uuid'
};

createBulkFeeStudentMappings(adminToken, 'my_school', bulkStudentMapping);
```

### **Error Handling Patterns**

#### Common Error Codes
- `VALIDATION_ERROR`: General validation failure
- `STUDENT_NOT_FOUND` / `CLASS_NOT_FOUND`: Referenced entity doesn't exist
- `DUPLICATE_MAPPING`: Mapping already exists for the combination
- `SYSTEM_ERROR`: Unexpected server error

#### Permission-Based Errors
- **HTTP 401**: Missing or invalid authentication token
- **HTTP 403**: Insufficient role permissions (only Admin can create mappings)
- **HTTP 402**: Plan limitation (requires appropriate subscription tier)

#### Best Practices
1. **Always check the `success_count` vs `total_count`** to detect partial failures
2. **Handle the `errors` array** to provide user-friendly feedback about failures
3. **Use the error codes** to implement specific retry or correction logic
4. **Display student names and details** from error responses for better user experience

---

## 🎉 COMPLETE! All Modules Secured with Plan-Based Filtering + Admin Tools + Bulk Operations

**🏆 FINAL SYSTEM STATUS:** All endpoint modules have been successfully secured with multi-layer validation and enhanced with efficient bulk operations!

### Security Implementation Summary
- ✅ **JWT Authentication** - Bearer token validation
- ✅ **Role-Based Permissions** - Database-driven access control  
- ✅ **Plan-Based Filtering** - Subscription tier enforcement
- ✅ **Multi-Tenant Support** - Tenant-specific database schemas

### Modules Protected (Latest Update: Bulk Operations ✅)
1. **Academic Years** - Basic subscription tier access ✅ SECURED
2. **Fee Management** - Standard+ tier for financial operations ✅ SECURED + **BULK OPERATIONS**  
3. **Masters Module** - Variable tier requirements ✅ SECURED
4. **Student Module** - Basic to Enterprise tiers based on feature ✅ SECURED
5. **Transport Module** - Premium+ for advanced features ✅ SECURED
6. **Auth Module** - Enterprise tier for admin system configurations ✅ SECURED

### Enhanced Feature Summary
- **🔐 Security**: Multi-layer JWT + Role + Plan validation on **all endpoints**
- **📦 Bulk Operations**: Efficient bulk fee mapping reduces user interaction time
- **🏗️ Admin Tools**: Complete permission management for enterprise subscribers
- **🌐 Multi-Tenant**: Full tenant isolation with subscription-based feature gating

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