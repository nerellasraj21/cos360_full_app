# COS360 - Multi-Tenant School Management System - Agent Contact Point

## 🎯 Purpose & Responsibility

COS360 is a production-ready FastAPI-based multi-tenant school management system designed for scalable educational institutions. The system features a sophisticated 3-tier permission architecture (Super Admin → Tenant Admin → Role-based Users) with complete database-driven access control and schema-per-tenant isolation.

**Core Mission**: Provide comprehensive school management capabilities including student admissions, fee management, academic scheduling, staff management, and multi-tenant administration with enterprise-grade security and performance.

## 📁 Directory Structure

```
COS360/
├── app/                           # Main application code with multi-tenant architecture
│   ├── api/                       # FastAPI REST endpoints with permission validation
│   ├── models/                    # SQLAlchemy database models with UUID patterns
│   ├── schemas/                   # Pydantic validation schemas for API contracts
│   ├── service/                   # Business logic layer with database refresh patterns
│   ├── db/                        # Database session management and connections
│   ├── middleware/                # Tenant detection and request processing
│   ├── tools/                     # Utilities for password hashing, caching, etc.
│   └── main.py                    # FastAPI application entry point
├── migrations/                    # Alembic database migrations with multi-tenant support
├── tests/                         # Comprehensive test suite with tenant isolation
├── docs/                          # Technical documentation and analysis
├── scripts/                       # Deployment and maintenance scripts
├── .claude/                       # AI agent configurations and memory
├── requirements.txt               # Python dependencies for production deployment
├── .env                          # Environment configuration (local development)
├── CLAUDE.md                     # Project instructions and development guide
└── README.md                     # This agent contact point file
```

## 🏗️ Architecture Overview

### **Multi-Tenant Architecture**

- **Schema-per-tenant**: Complete data isolation using PostgreSQL schemas
- **Public Schema**: System-wide data (tenants, plans, menus) shared across all tenants
- **Dynamic Tenant Detection**: Via `cschema` header or `X-Client-Name` for seamless routing
- **Isolated Sessions**: Each tenant gets dedicated database sessions with proper context management

### **Permission System (3-Tier)**

1. **Super Admin**: Cross-tenant system management and audit capabilities
2. **Tenant Admin**: Full control within their tenant schema
3. **Role-based Users**: Fine-grained permissions based on roles and plan limitations

### **Database Patterns**

- **UUID Primary Keys**: All entities use UUID for better multi-tenant compatibility
- **Async SQLAlchemy 2.0**: Modern async patterns throughout
- **Database Refresh Pattern**: `flush() → select() → commit()` for multi-tenant safety
- **Relationship Loading**: `selectinload` for optimal query performance

## 🔧 Key Components

### Component 1: Multi-Tenant API Layer

- **Location**: `app/api/v1/`
- **Purpose**: RESTful endpoints with automatic tenant detection and permission validation
- **Key Features**: Dependency injection, comprehensive error handling, standardized responses
- **Dependencies**: FastAPI, tenant middleware, authentication services
- **Used By**: Frontend applications, external integrations

### Component 2: Database Models

- **Location**: `app/models/`
- **Purpose**: SQLAlchemy ORM models defining schema structure and relationships
- **Key Features**: BaseOrg/BasePublic inheritance, UUID patterns, audit fields
- **Dependencies**: SQLAlchemy 2.0, PostgreSQL
- **Used By**: Service layer, migrations, API endpoints

### Component 3: Service Layer

- **Location**: `app/service/`
- **Purpose**: Business logic implementation with database refresh patterns
- **Key Features**: Async operations, transaction management, error handling
- **Dependencies**: Database models, async sessions
- **Used By**: API endpoints for all business operations

### Component 4: Permission Management

- **Location**: `app/service/auth/` and `app/models/auth/`
- **Purpose**: Dual-layer permission validation (Plan + Role based)
- **Key Features**: Database-driven permissions, audit logging, JWT integration
- **Dependencies**: Authentication models, tenant context
- **Used By**: All protected API endpoints

### Component 5: Tenant Middleware

- **Location**: `app/middleware/tenant_middleware.py`
- **Purpose**: Automatic tenant detection and session context management
- **Key Features**: Header-based routing, schema switching, error handling
- **Dependencies**: Database session management
- **Used By**: All incoming API requests

## 🔄 Data Flow

1. **Request Processing**: Tenant middleware detects tenant from headers → Sets database context
2. **Authentication**: JWT validation → Role extraction → Permission lookup
3. **Business Logic**: Service layer processes request → Database refresh pattern applied
4. **Response**: Standardized API response with proper error handling

## 🔗 Integration Points

### **Inputs**

- **Frontend Applications**: React/Vue.js applications via REST API
- **External Systems**: Third-party integrations via documented API endpoints
- **Database**: PostgreSQL with multi-tenant schema structure
- **Authentication**: JWT tokens with role-based claims

### **Outputs**

- **REST API Responses**: JSON with standardized error codes and messages
- **Database Operations**: CRUD operations with proper audit trails
- **Audit Logs**: Super Admin action tracking for compliance
- **Performance Metrics**: Query optimization and response time monitoring

### **External Dependencies**

- **PostgreSQL**: Primary database with UUID and async support
- **FastAPI**: Web framework with dependency injection
- **Alembic**: Database migration management
- **SQLAlchemy 2.0**: Async ORM with relationship management
- **Pydantic**: Data validation and serialization
- **JWT**: Secure authentication token handling

### **Internal Dependencies**

- **Session Management**: `app/db/session.py`
- **Tenant Detection**: `app/middleware/tenant_middleware.py`
- **Permission Validation**: `app/service/auth/`
- **Business Services**: Domain-specific services in `app/service/`

## 📊 Business Logic Summary

### **Core Educational Modules**

- **Student Management**: Admissions, enrollment, academic records with multi-tenant isolation
- **Fee Management**: Complex fee structures, collection tracking, receipt generation
- **Academic Operations**: Year management, class scheduling, subject assignments
- **Staff Management**: Employee records, role assignments, permission management
- **Transport Management**: Route planning, vehicle tracking, student assignments

### **Administrative Functions**

- **Tenant Management**: Schema creation, plan assignment, resource allocation
- **Permission Management**: Role-based access control with plan limitations
- **Audit & Compliance**: Complete action tracking for regulatory requirements
- **Menu Synchronization**: Hierarchical menu system with 49 configurable items

## ⚙️ Configuration

### **Environment Variables**

- `DATABASE_URL`: PostgreSQL connection string with async support
- `SECRET_KEY`: JWT signing key for authentication
- `ENVIRONMENT`: Development/production environment flag

### **Database Configuration**

- **Public Schema**: Tenants, plans, menus, super admin data
- **Tenant Schemas**: Isolated data per educational institution
- **Connection Pooling**: Optimized for high-concurrency multi-tenant access

## 🚨 Error Handling

### **Multi-Tenant Error Patterns**

- **Schema Not Found**: Automatic tenant validation with meaningful error messages
- **Permission Denied**: Dual-layer validation with specific error codes
- **Database Refresh Conflicts**: Proper transaction rollback and retry logic
- **Authentication Failures**: Secure error responses without information leakage

## 📈 Performance Considerations

### **Database Optimization**

- **Connection Pooling**: Per-tenant session management
- **Query Optimization**: `selectinload` for relationship loading
- **Index Strategy**: UUID-based indexing for optimal multi-tenant performance
- **Cache Patterns**: Implemented in `app/tools/cache_utils.py`

### **API Performance**

- **Async Operations**: Non-blocking I/O throughout the application
- **Response Optimization**: Pagination, filtering, and selective field loading
- **Database Refresh Pattern**: Minimizes session conflicts in multi-tenant environment

## 🔒 Security Aspects

### **Multi-Tenant Security**

- **Complete Data Isolation**: Schema-per-tenant prevents data leakage
- **Permission Validation**: Dual-layer checks on all business operations
- **JWT Security**: Secure token generation with role-based claims
- **Audit Logging**: Complete action tracking in `public.super_admin_audit`

### **Production Security**

- **SSL/TLS**: All connections encrypted in production
- **Password Security**: Bcrypt hashing with salt
- **Input Validation**: Comprehensive Pydantic schema validation
- **SQL Injection Prevention**: Parameterized queries throughout

## 🧪 Testing

### **Testing Strategy**

- **Multi-Tenant Tests**: Schema isolation validation
- **Permission Tests**: Role and plan-based access verification
- **Integration Tests**: End-to-end business workflow validation
- **Unit Tests**: Service layer and utility function coverage

### **Test Structure**

- **Location**: `tests/` directory with modular organization
- **Fixtures**: Database setup and teardown with tenant isolation
- **Mock Patterns**: External dependency mocking for reliable tests

## 📝 Agent Guidance

### When to Dive Deeper

- **Database Issues**: Examine `app/db/session.py` and specific model files
- **Permission Problems**: Check `app/service/auth/` and permission validation logic
- **Multi-Tenant Conflicts**: Review tenant middleware and session management
- **Performance Issues**: Analyze service layer patterns and database queries
- **API Endpoint Issues**: Examine specific router files in `app/api/v1/`

### Quick Reference

- **Primary Entry Point**: `app/main.py` - FastAPI application setup
- **Most Complex Component**: `app/service/auth/multi_tenant_auth_service.py` - Authentication logic
- **Database Patterns**: `app/service/masters/staff_service.py` - Reference for refresh patterns
- **Common Issues**: Multi-tenant session context, permission validation, database refresh conflicts

### **Critical Files for Understanding**

1. `CLAUDE.md` - Complete development context and patterns
2. `context_guide.json` - Troubleshooting and architectural decisions
3. `app/db/session.py` - Database session management
4. `app/middleware/tenant_middleware.py` - Tenant detection logic
5. `migrate_tenants.py` - Multi-tenant migration management

## 🔄 Recent Changes

### **Database Refresh Pattern Implementation**

- **Status**: 55 instances remaining across 24 service files
- **Pattern**: `flush() → select() → commit()` for multi-tenant compatibility
- **Impact**: Critical business functions protected, production-ready for core operations
- **Remaining**: Transport, auth utilities, and support services

### **Production Deployment**

- **Database**: Migrated to Neon PostgreSQL with SSL
- **Performance**: Query optimization and response time improvements
- **Security**: Enhanced audit logging and permission validation

## 📋 TODO/Known Issues

### **Active Priorities**

1. **Complete Database Refresh Pattern**: 55 instances remaining across 24 service files
2. **API Documentation**: Enhanced OpenAPI specifications
3. **Performance Monitoring**: Query optimization and caching improvements
4. **Test Coverage**: Comprehensive integration test expansion

### **Technical Debt**

- **Legacy Code Cleanup**: Remove unused imports and deprecated patterns
- **Documentation**: API endpoint documentation completion
- **Monitoring**: Production performance metrics and alerting

### **Future Enhancements**

- **Real-time Features**: WebSocket integration for live updates
- **Mobile API**: Optimized endpoints for mobile applications
- **Advanced Reporting**: Business intelligence and analytics modules
