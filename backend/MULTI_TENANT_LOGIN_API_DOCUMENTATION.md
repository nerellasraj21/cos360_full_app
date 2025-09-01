# Multi-Tenant Login System API Documentation

## Overview

The multi-tenant login system provides secure authentication for multiple tenants (clients) within a single application instance. Each tenant operates with its own database schema while sharing the same application codebase. The system supports both modern multi-tenant login and backward compatibility with legacy single-tenant login.

## Architecture

### Database Schema Structure

- **Public Schema**: Contains tenant management tables (`tenants`)
- **Tenant Schemas**: Each client has a dedicated schema (e.g., `client1_schema`, `client2_schema`) containing user data, roles, menus, and permissions
- **Master Schema**: `cos360_main` serves as the default/legacy schema

### Tenant Detection

The system automatically detects the client tenant through:

1. **X-Client-Name Header** (Primary): `X-Client-Name: clientname`
2. **Subdomain Extraction** (Secondary): `clientname.yourdomain.com`
3. **Default Fallback** (Tertiary): Uses `default` client for legacy compatibility

## API Endpoints

### POST /api/v1/auth/login/login

Multi-tenant authentication endpoint with backward compatibility.

#### Request Headers

```
X-Client-Name: clientname  # Optional - client identifier
Content-Type: application/json
```

#### Request Body

```json
{
  "username": "string", // Required - user's username
  "password": "string", // Required - user's password
  "client_name": "string" // Optional - client name override
}
```

#### Success Response (Multi-Tenant)

**Status Code:** `200 OK`

```json
{
  "user": {
    "id": 123,
    "username": "johndoe",
    "email": "john@example.com",
    "is_active": true
  },
  "role": {
    "id": 1,
    "name": "admin",
    "description": "Administrator role"
  },
  "menu": [
    {
      "id": 1,
      "name": "Dashboard",
      "path": "/dashboard",
      "display_order": 1,
      "children": [
        {
          "id": 2,
          "name": "Analytics",
          "path": "/dashboard/analytics",
          "display_order": 1
        }
      ]
    },
    {
      "id": 3,
      "name": "User Management",
      "path": "/users",
      "display_order": 2
    }
  ],
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Success Response (Legacy Compatibility)

**Status Code:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### Error Responses

**Invalid Credentials**

```json
{
  "detail": "Invalid Credentials"
}
```

**Status Code:** `401 Unauthorized`

**Invalid Connection** (Tenant not found/inactive)

```json
{
  "detail": "Invalid connection"
}
```

**Status Code:** `401 Unauthorized`

**Server Error**

```json
{
  "detail": "Authentication service unavailable"
}
```

**Status Code:** `500 Internal Server Error`

## Multi-Tenant Features

### 1. Automatic Client Detection

The system automatically detects the client/tenant through multiple methods:

```bash
# Header-based detection
curl -X POST "https://api.example.com/api/v1/auth/login/login" \
  -H "X-Client-Name: acme-corp" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'

# Subdomain-based detection
curl -X POST "https://acme-corp.example.com/api/v1/auth/login/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'

# Client name in request body
curl -X POST "https://api.example.com/api/v1/auth/login/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123", "client_name": "acme-corp"}'
```

### 2. Hierarchical Menu System

The system returns a hierarchical menu structure based on the user's role permissions:

- **Unlimited Depth**: Supports nested menu structures (L0 → L1 → L2 → L3+)
- **Role-Based Filtering**: Only shows menu items the user has permission to view
- **Ordering**: Menus are ordered by `display_order` field
- **Clean Structure**: Parent-child relationships are properly nested

### 3. JWT Token Claims

Access tokens include tenant context for secure multi-tenant operations:

```json
{
  "sub": "123", // User ID
  "username": "johndoe", // Username
  "role": "admin", // User's role name
  "client_name": "acme-corp", // Tenant identifier
  "exp": 1234567890 // Token expiration
}
```

### 4. Database Schema Isolation

Each tenant operates in complete isolation:

- **Schema Separation**: Each client has dedicated database schema
- **Data Privacy**: No cross-tenant data access possible
- **Performance**: Optimized queries within tenant schema
- **Security**: Complete logical separation of tenant data

## Implementation Details

### Tenant Management

Tenants are managed in the public schema `tenants` table:

```sql
CREATE TABLE public.tenants (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(50) UNIQUE NOT NULL,
    schema_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Connection Management

- **Single Connection Pool**: Efficient resource utilization
- **Dynamic Schema Routing**: Uses PostgreSQL `search_path` for tenant isolation
- **Connection Caching**: Tenant metadata is cached for performance
- **Error Handling**: Graceful fallback and error recovery

### Security Features

- **Password Hashing**: Secure password storage using industry standards
- **JWT Security**: Signed tokens with tenant context
- **Input Validation**: Client name sanitization and validation
- **SQL Injection Protection**: Parameterized queries and safe schema routing
- **Rate Limiting Ready**: Compatible with rate limiting middleware

## Migration and Backward Compatibility

### Legacy Support

The system maintains full backward compatibility:

- Requests without client detection use legacy authentication
- Legacy endpoints return simplified response format
- Default tenant (`cos360_main`) handles legacy requests
- No breaking changes to existing integrations

### Migration Path

1. **Phase 1**: Deploy multi-tenant system alongside legacy
2. **Phase 2**: Gradually migrate clients to use tenant headers
3. **Phase 3**: Full multi-tenant operation with legacy fallback

## Error Handling

### Client-Side Error Handling

```javascript
try {
  const response = await fetch("/api/v1/auth/login/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Name": "acme-corp",
    },
    body: JSON.stringify({
      username: "admin",
      password: "password123",
    }),
  });

  if (response.status === 401) {
    const error = await response.json();
    if (error.detail === "Invalid connection") {
      // Handle tenant configuration issues
      showTenantError();
    } else if (error.detail === "Invalid Credentials") {
      // Handle authentication failures
      showLoginError();
    }
  } else if (response.ok) {
    const data = await response.json();
    if (data.user) {
      // Multi-tenant response - full user profile
      handleMultiTenantLogin(data);
    } else {
      // Legacy response - token only
      handleLegacyLogin(data);
    }
  }
} catch (error) {
  // Handle network or server errors
  handleServerError(error);
}
```

## Testing

### Unit Tests

- **Tenant Service**: Schema lookup and caching functionality
- **Middleware**: Client name detection and validation
- **Auth Service**: User authentication and menu building
- **Session Management**: Database connection handling

### Integration Tests

- **End-to-End Login Flow**: Complete authentication process
- **Multi-Tenant Scenarios**: Cross-tenant isolation verification
- **Error Conditions**: Invalid credentials, missing tenants
- **Backward Compatibility**: Legacy endpoint functionality

### Load Testing

- **Connection Pooling**: Verify efficient resource usage
- **Cache Performance**: Tenant lookup optimization
- **Concurrent Tenants**: Multiple tenant simultaneous access
- **Failover Scenarios**: Error recovery and graceful degradation

## Security Considerations

### Data Protection

- **Schema Isolation**: Complete tenant data separation
- **Access Control**: Role-based menu and feature access
- **Secure Storage**: Encrypted password hashing
- **Token Security**: JWT signing and validation

### Input Validation

- **Client Name Sanitization**: Remove harmful characters
- **SQL Injection Prevention**: Parameterized queries
- **Length Limits**: Prevent buffer overflow attacks
- **Character Encoding**: Proper UTF-8 handling

### Network Security

- **HTTPS Only**: Encrypted data transmission
- **Header Validation**: Secure client name detection
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: DOS attack prevention

## Performance Optimization

### Caching Strategy

- **Tenant Metadata**: In-memory tenant schema caching
- **Menu Structure**: Cached hierarchical menu builds
- **Database Connections**: Connection pool optimization
- **Redis Integration**: Distributed caching support

### Database Optimization

- **Schema Indexes**: Optimized tenant-specific queries
- **Connection Pooling**: Efficient resource utilization
- **Query Optimization**: Minimized cross-schema operations
- **Background Tasks**: Asynchronous cache warming

## Monitoring and Logging

### Application Metrics

- **Login Success Rate**: Per-tenant authentication metrics
- **Response Times**: API performance monitoring
- **Error Rates**: Failed authentication tracking
- **Cache Hit Ratio**: Tenant lookup performance

### Security Monitoring

- **Failed Login Attempts**: Brute force detection
- **Invalid Tenant Access**: Security threat monitoring
- **Token Usage**: JWT token lifecycle tracking
- **Cross-Tenant Violations**: Data isolation monitoring

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql+asyncpg://user:password@localhost/database
TENANT_CACHE_TTL=3600  # Tenant cache timeout in seconds

# JWT Configuration
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Tenant Configuration
DEFAULT_TENANT_SCHEMA=cos360_main
MAX_CLIENT_NAME_LENGTH=50
ENABLE_SUBDOMAIN_DETECTION=true
```

### Application Settings

```python
class Settings:
    # Multi-tenant settings
    enable_multi_tenant: bool = True
    default_client_name: str = "default"
    max_tenant_cache_size: int = 1000

    # Security settings
    enable_rate_limiting: bool = True
    max_login_attempts: int = 5
    lockout_duration: int = 300
```

This documentation provides comprehensive guidance for implementing, testing, and maintaining the multi-tenant login system while ensuring security, performance, and backward compatibility.
