# Middleware Layer - Agent Contact Point

## 🎯 Purpose & Responsibility

The `app/middleware/` directory contains request processing middleware for COS360's multi-tenant school management system. The primary component handles automatic tenant detection, database context switching, and request preprocessing for seamless multi-tenant operations across educational institutions.

**Core Responsibility**: Provide transparent multi-tenant request processing with automatic tenant detection, database schema routing, and proper request context establishment for all incoming API requests.

## 📁 Directory Structure

```
middleware/
├── tenant_middleware.py     # Core tenant detection and context switching
└── README.md               # This agent contact point file
```

## 🏗️ Architecture Overview

### **Tenant Detection Pipeline**
- **Header-Based Routing**: Automatic tenant identification via request headers
- **Schema Context**: Dynamic database schema switching based on tenant information
- **Request Preprocessing**: Transparent tenant context establishment for all requests
- **Error Handling**: Graceful handling of tenant detection failures and invalid requests

### **Multi-Tenant Request Flow**
```
Incoming Request → Tenant Detection → Schema Context → Database Routing → Business Logic
```

1. **Request Reception**: FastAPI receives HTTP request from client application
2. **Header Analysis**: Middleware examines `cschema` or `X-Client-Name` headers
3. **Tenant Validation**: Verify tenant exists and is active in system
4. **Context Establishment**: Set database schema context for request processing
5. **Request Forwarding**: Pass request to appropriate endpoint with tenant context

## 🔧 Key Components

### Component 1: Tenant Middleware (`tenant_middleware.py`)
- **Location**: `app/middleware/tenant_middleware.py`
- **Purpose**: Automatic tenant detection and database context switching
- **Key Functions**:
  - Header parsing for tenant identification (`cschema`, `X-Client-Name`)
  - Tenant validation and schema existence verification
  - Database session context establishment
  - Error handling for invalid or missing tenant information
- **Dependencies**: Database session management, tenant models
- **Used By**: All API requests requiring tenant context

## 🔄 Data Flow

### **Tenant Detection Process**
```python
# Middleware processing flow
async def tenant_middleware(request: Request, call_next):
    # 1. Extract tenant information from headers
    tenant_schema = request.headers.get("cschema") or request.headers.get("X-Client-Name")

    # 2. Validate tenant exists and is active
    if tenant_schema:
        tenant = await validate_tenant(tenant_schema)
        if tenant and tenant.is_active:
            # 3. Set request context for database routing
            request.state.tenant_schema = tenant_schema
            request.state.tenant_id = tenant.id
        else:
            raise HTTPException(status_code=400, detail="Invalid tenant")

    # 4. Process request with tenant context
    response = await call_next(request)
    return response
```

### **Context Propagation**
1. **Header Extraction**: Parse tenant identification from request headers
2. **Tenant Validation**: Verify tenant exists in public schema and is active
3. **Context Setting**: Establish tenant context in request state
4. **Database Routing**: Database sessions automatically route to tenant schema
5. **Response Processing**: Maintain tenant context throughout request lifecycle

## 🔗 Integration Points

### **Inputs**
- **HTTP Headers**: `cschema` or `X-Client-Name` for tenant identification
- **Request Objects**: FastAPI Request objects for all incoming API calls
- **Tenant Database**: Public schema tenant records for validation
- **Configuration**: Tenant routing rules and validation settings

### **Outputs**
- **Request Context**: Tenant information attached to request state
- **Database Routing**: Proper schema context for database sessions
- **Error Responses**: Standardized tenant validation error messages
- **Audit Information**: Tenant access logging for security monitoring

### **External Dependencies**
- **FastAPI**: Request/response cycle integration
- **Database Models**: Tenant model for validation queries
- **Session Management**: Database session routing based on tenant context
- **HTTP Standards**: Standard header processing and response codes

### **Internal Dependencies**
- **Database Layer**: `app/db/session.py` for session context routing
- **Models**: `app/models/public/tenant.py` for tenant validation
- **API Layer**: All API endpoints receive processed tenant context
- **Service Layer**: Business logic operates with established tenant context

## 📊 Business Logic Summary

### **Tenant Routing Logic**
- **Multi-Tenant Support**: Automatic detection of educational institution tenants
- **Schema Isolation**: Complete data separation through database schema routing
- **Public Operations**: Bypass tenant detection for public endpoints (health, status)
- **Cross-Tenant Prevention**: Ensure requests cannot access other tenant data

### **Request Validation Rules**
- **Tenant Existence**: Verify tenant is registered in system
- **Tenant Status**: Ensure tenant is active and not suspended
- **Schema Availability**: Validate tenant database schema exists and is accessible
- **Permission Context**: Establish baseline permission context for request processing

### **Error Handling Patterns**
- **Missing Headers**: Graceful handling of requests without tenant identification
- **Invalid Tenants**: Clear error messages for non-existent or inactive tenants
- **Schema Errors**: Proper handling of database schema access issues
- **Fallback Logic**: Default behavior for system-wide operations

## ⚙️ Configuration

### **Header Configuration**
```python
# Supported tenant identification headers
TENANT_HEADERS = ["cschema", "X-Client-Name"]
DEFAULT_TENANT_HEADER = "cschema"
```

### **Middleware Registration**
```python
# FastAPI middleware registration
app.add_middleware(
    TenantMiddleware,
    excluded_paths=["/health", "/docs", "/openapi.json"]  # Public endpoints
)
```

### **Tenant Validation Settings**
```python
# Tenant validation configuration
TENANT_CACHE_TTL = 300  # Cache tenant info for 5 minutes
TENANT_VALIDATION_TIMEOUT = 5  # Database query timeout
```

## 🚨 Error Handling

### **Tenant Detection Errors**
```python
# Standard error responses for tenant issues
HTTP 400 - Bad Request: "Invalid or missing tenant information"
HTTP 403 - Forbidden: "Tenant access denied or suspended"
HTTP 404 - Not Found: "Tenant not found in system"
HTTP 500 - Internal Error: "Tenant validation system error"
```

### **Error Recovery Patterns**
- **Graceful Degradation**: Public endpoints continue to function during tenant system issues
- **Error Logging**: Comprehensive logging of tenant detection failures for debugging
- **Retry Logic**: Automatic retry for transient tenant validation failures
- **Circuit Breaker**: Protection against cascading tenant validation failures

## 📈 Performance Considerations

### **Caching Strategy**
```python
# Tenant information caching for performance
tenant_cache = TTLCache(maxsize=1000, ttl=300)  # 5-minute cache

async def get_cached_tenant(tenant_schema: str):
    if tenant_schema in tenant_cache:
        return tenant_cache[tenant_schema]

    tenant = await fetch_tenant_from_db(tenant_schema)
    tenant_cache[tenant_schema] = tenant
    return tenant
```

### **Performance Optimization**
- **Tenant Caching**: In-memory caching of tenant validation results
- **Header Processing**: Efficient header parsing and validation
- **Database Queries**: Optimized tenant lookup queries with proper indexing
- **Context Sharing**: Efficient request context propagation to minimize overhead

### **Scalability Patterns**
- **Stateless Design**: No middleware state maintained between requests
- **Connection Efficiency**: Minimal database connections for tenant validation
- **Memory Management**: Efficient tenant cache management with TTL expiration
- **Request Processing**: Minimal latency addition to request processing pipeline

## 🔒 Security Aspects

### **Tenant Isolation Security**
- **Schema Validation**: Strict validation of tenant schema access permissions
- **Cross-Tenant Prevention**: Prevents requests from accessing other tenant data
- **Header Validation**: Secure processing of tenant identification headers
- **Access Logging**: Complete audit trail of tenant access patterns

### **Request Security**
- **Input Sanitization**: Proper sanitization of tenant identification inputs
- **Injection Prevention**: Protection against header injection attacks
- **Rate Limiting**: Per-tenant rate limiting for resource protection
- **Audit Logging**: Security event logging for tenant access monitoring

## 🧪 Testing

### **Middleware Testing Patterns**
```python
# Test tenant detection with various header combinations
@pytest.mark.asyncio
async def test_tenant_detection():
    # Test with cschema header
    request = MockRequest(headers={"cschema": "tenant1"})
    await tenant_middleware(request, mock_next)
    assert request.state.tenant_schema == "tenant1"

    # Test with X-Client-Name header
    request = MockRequest(headers={"X-Client-Name": "tenant2"})
    await tenant_middleware(request, mock_next)
    assert request.state.tenant_schema == "tenant2"
```

### **Multi-Tenant Testing**
- **Tenant Isolation**: Verify requests properly route to correct tenant schemas
- **Cross-Tenant Security**: Ensure requests cannot access other tenant data
- **Error Scenarios**: Test invalid tenant handling and error responses
- **Performance Testing**: Validate middleware performance under load

## 📝 Agent Guidance

### When to Dive Deeper
- **Tenant Detection Issues**: Examine header parsing logic and tenant validation
- **Context Problems**: Review request state management and context propagation
- **Performance Issues**: Analyze tenant caching and database query patterns
- **Security Concerns**: Check tenant isolation and cross-tenant access prevention
- **Multi-Tenant Routing**: Investigate database schema routing and session management

### Quick Reference
- **Primary Entry Point**: `tenant_middleware.py` - Core tenant detection logic
- **Most Complex Component**: Tenant validation and schema context establishment
- **Common Issues**: Missing headers, invalid tenants, schema routing failures
- **Integration Pattern**: Automatic context establishment for all protected endpoints

### **Critical Integration Points**
1. **Database Sessions**: Tenant context flows to `app/db/session.py`
2. **API Endpoints**: All protected routes receive tenant context
3. **Service Layer**: Business logic operates with established tenant context
4. **Error Handling**: Tenant validation errors propagate to API responses

## 🔄 Recent Changes

### **Performance Improvements**
- **Caching Implementation**: Added tenant validation result caching
- **Query Optimization**: Improved tenant lookup query performance
- **Context Efficiency**: Streamlined request context establishment
- **Error Handling**: Enhanced error response standardization

### **Security Enhancements**
- **Header Validation**: Strengthened tenant header validation patterns
- **Audit Logging**: Improved tenant access logging for security monitoring
- **Cross-Tenant Protection**: Enhanced validation to prevent cross-tenant access
- **Error Security**: Secure error responses without information leakage

## 📋 TODO/Known Issues

### **Active Improvements**
1. **Advanced Caching**: Redis-based distributed caching for tenant validation
2. **Performance Monitoring**: Middleware performance metrics and monitoring
3. **Load Balancing**: Tenant-aware load balancing for database connections
4. **Health Checking**: Tenant system health monitoring and alerting

### **Future Enhancements**
- **Dynamic Routing**: Advanced tenant routing rules and load distribution
- **Tenant Analytics**: Request pattern analysis and optimization
- **Circuit Breaker**: Advanced failure isolation and recovery patterns
- **Multi-Region**: Geographic tenant routing for global deployments

### **Technical Improvements**
- **Error Recovery**: Enhanced error recovery and fallback mechanisms
- **Security Hardening**: Additional security layers for tenant validation
- **Monitoring Integration**: Enhanced logging and monitoring capabilities
- **Documentation**: Extended middleware documentation and examples