# Database Session Management - Agent Contact Point

## 🎯 Purpose & Responsibility

The `app/db/` directory contains database configuration and session management for COS360's multi-tenant PostgreSQL architecture. This module handles async SQLAlchemy 2.0 sessions with automatic tenant schema routing, connection pooling, and proper transaction isolation across multiple educational institution tenants.

**Core Responsibility**: Provide reliable, efficient, and secure database connectivity with complete tenant isolation and optimized performance for high-concurrency school management operations.

## 📁 Directory Structure

```
db/
├── session.py               # Core async session management with tenant routing
├── database.py              # Database connection configuration and setup
└── README.md               # This agent contact point file
```

## 🏗️ Architecture Overview

### **Multi-Tenant Session Management**
- **Schema-per-Tenant**: Dynamic schema routing based on tenant context
- **Async SQLAlchemy 2.0**: Modern async patterns with proper connection pooling
- **Dependency Injection**: FastAPI-compatible session factories for automatic injection
- **Transaction Isolation**: Proper transaction boundaries with multi-tenant safety

### **Connection Management**
- **Connection Pooling**: Optimized pool settings for concurrent multi-tenant access
- **Session Lifecycle**: Proper session creation, management, and cleanup
- **Error Handling**: Connection failure recovery and session rollback patterns
- **Performance Optimization**: Efficient connection reuse and resource management

## 🔧 Key Components

### Component 1: Session Management (`session.py`)
- **Location**: `app/db/session.py`
- **Purpose**: Multi-tenant async database session creation and management
- **Key Functions**:
  - `get_tenant_db()` - Dependency injection factory for tenant-specific sessions
  - `get_public_db()` - Public schema database session factory
  - Session cleanup and transaction management
- **Dependencies**: SQLAlchemy async, tenant middleware context
- **Used By**: All API endpoints requiring database access

### Component 2: Database Configuration (`database.py`)
- **Location**: `app/db/database.py`
- **Purpose**: Database connection string management and engine configuration
- **Key Functions**:
  - Database URL construction with tenant schema routing
  - Engine creation with optimized settings
  - Connection pool configuration
- **Dependencies**: Environment variables, PostgreSQL async driver
- **Used By**: Session management and application startup

## 🔄 Data Flow

### **Session Creation Flow**
1. **Request Processing**: API endpoint requests database session via dependency injection
2. **Tenant Detection**: Middleware extracts tenant information from request headers
3. **Schema Routing**: Session configured for specific tenant schema or public schema
4. **Session Creation**: Async SQLAlchemy session created with proper configuration
5. **Transaction Management**: Automatic transaction handling with proper cleanup

### **Multi-Tenant Routing Pattern**
```python
# Tenant-specific session creation
@contextmanager
async def get_tenant_session(tenant_schema: str):
    engine = create_async_engine(f"postgresql+asyncpg://.../{tenant_schema}")
    async with AsyncSession(engine) as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

## 🔗 Integration Points

### **Inputs**
- **Tenant Context**: From middleware via request headers (`cschema`, `X-Client-Name`)
- **Database Configuration**: Environment variables and connection strings
- **API Requests**: Session injection via FastAPI dependency system
- **Transaction Boundaries**: Service layer operations requiring database access

### **Outputs**
- **Async Database Sessions**: Tenant-specific or public schema sessions
- **Connection Management**: Optimized connection pooling and resource utilization
- **Transaction Isolation**: Proper ACID compliance across tenant operations
- **Error Handling**: Connection failure recovery and session cleanup

### **External Dependencies**
- **PostgreSQL**: Primary database with async connectivity support
- **SQLAlchemy 2.0**: Async ORM with advanced session management
- **asyncpg**: High-performance async PostgreSQL driver
- **FastAPI**: Dependency injection system for session management

### **Internal Dependencies**
- **Tenant Middleware**: For tenant detection and context establishment
- **Models**: SQLAlchemy ORM models for database operations
- **Services**: Business logic layer requiring database sessions
- **Configuration**: Environment-based database connection settings

## 📊 Business Logic Summary

### **Multi-Tenant Database Architecture**
- **Schema Isolation**: Complete data separation using PostgreSQL schemas
- **Tenant Routing**: Automatic schema selection based on request context
- **Public Schema**: System-wide data (tenants, plans, menus) accessible across tenants
- **Cross-Tenant Operations**: Super admin operations with special session handling

### **Session Management Patterns**
- **Dependency Injection**: Automatic session provision to API endpoints
- **Transaction Boundaries**: Service-level transaction management with proper rollback
- **Connection Lifecycle**: Efficient connection creation, reuse, and cleanup
- **Resource Optimization**: Connection pooling for high-concurrency operations

## ⚙️ Configuration

### **Database Connection Settings**
```python
# Environment variables for database configuration
DATABASE_URL = "postgresql+asyncpg://user:pass@host:port/database"
DB_POOL_SIZE = 20  # Connection pool size for concurrent operations
DB_MAX_OVERFLOW = 30  # Additional connections beyond pool size
DB_POOL_TIMEOUT = 30  # Timeout for connection acquisition
```

### **Multi-Tenant Configuration**
```python
# Tenant-specific database URL construction
TENANT_DB_URL_TEMPLATE = "postgresql+asyncpg://user:pass@host:port/database?options=-csearch_path={schema}"
PUBLIC_SCHEMA = "public"  # Schema for system-wide data
```

## 🚨 Error Handling

### **Connection Error Patterns**
- **Connection Failures**: Automatic retry with exponential backoff
- **Session Errors**: Proper rollback and cleanup on transaction failures
- **Pool Exhaustion**: Graceful handling of connection pool limits
- **Timeout Handling**: Connection and query timeout management

### **Multi-Tenant Error Management**
- **Schema Not Found**: Validation of tenant schema existence before connection
- **Permission Errors**: Database-level permission validation for tenant access
- **Cross-Tenant Protection**: Prevention of unauthorized cross-tenant data access
- **Session Isolation**: Ensuring session cleanup doesn't affect other tenants

## 📈 Performance Considerations

### **Connection Pooling Optimization**
```python
# Optimized engine configuration for multi-tenant operations
engine = create_async_engine(
    database_url,
    pool_size=20,           # Core connection pool size
    max_overflow=30,        # Additional connections under load
    pool_timeout=30,        # Connection acquisition timeout
    pool_recycle=3600,      # Connection recycling interval
    echo=False              # SQL logging disabled in production
)
```

### **Session Management Efficiency**
- **Session Reuse**: Proper session lifecycle for multiple operations
- **Transaction Optimization**: Minimized transaction duration for better concurrency
- **Lazy Loading**: Strategic relationship loading to minimize database queries
- **Connection Cleanup**: Automatic resource cleanup to prevent memory leaks

### **Query Performance**
- **Async Operations**: Non-blocking database I/O for improved throughput
- **Batch Operations**: Efficient bulk operations for large datasets
- **Index Utilization**: Session patterns supporting optimal index usage
- **Query Optimization**: Session configuration for query performance tuning

## 🔒 Security Aspects

### **Multi-Tenant Security**
- **Schema Isolation**: Complete data separation at database level
- **Access Control**: Database-level permissions for tenant schema access
- **Connection Security**: Encrypted connections with SSL/TLS
- **Credential Management**: Secure database credential handling

### **Session Security**
- **Transaction Isolation**: ACID compliance for data consistency
- **SQL Injection Prevention**: Parameterized queries through SQLAlchemy ORM
- **Connection Limits**: Protection against connection exhaustion attacks
- **Audit Logging**: Database operation logging for security monitoring

## 🧪 Testing

### **Testing Patterns**
- **Test Database Isolation**: Separate test database instances for each tenant
- **Session Mocking**: Proper session mocking for unit tests
- **Integration Testing**: Full database interaction testing with real connections
- **Performance Testing**: Connection pool and session performance validation

### **Multi-Tenant Testing**
- **Cross-Tenant Isolation**: Verification of data separation between tenants
- **Session Context Testing**: Proper tenant context establishment and cleanup
- **Connection Pool Testing**: Pool behavior under high-concurrency scenarios
- **Error Scenario Testing**: Database failure and recovery testing

## 📝 Agent Guidance

### When to Dive Deeper
- **Connection Issues**: Examine specific database connection configurations and error logs
- **Performance Problems**: Review connection pool settings and session lifecycle management
- **Multi-Tenant Issues**: Check tenant detection logic and schema routing mechanisms
- **Transaction Problems**: Analyze session transaction boundaries and rollback patterns
- **Memory Leaks**: Investigate session cleanup and connection pool management

### Quick Reference
- **Primary Entry Point**: `session.py:get_tenant_db()` - Main session dependency injection
- **Most Complex Component**: Tenant schema routing and session context management
- **Connection Configuration**: Database engine setup and connection string management
- **Common Issues**: Session cleanup, connection pool exhaustion, tenant context errors

### **Critical Files for Understanding**
1. `session.py` - Core session management and tenant routing logic
2. `database.py` - Database connection and engine configuration
3. `../middleware/tenant_middleware.py` - Tenant detection feeding into session management
4. Environment configuration - Database connection strings and pool settings

## 🔄 Recent Changes

### **SQLAlchemy 2.0 Migration**
- **Modern Async Patterns**: Updated to latest SQLAlchemy async patterns
- **Performance Improvements**: Enhanced connection pooling and session management
- **Type Safety**: Improved type hints and error handling
- **Compatibility**: Maintained compatibility with existing service layer patterns

### **Multi-Tenant Optimization**
- **Session Routing**: Improved tenant schema detection and routing
- **Connection Efficiency**: Optimized connection reuse across tenant operations
- **Error Handling**: Enhanced error recovery and session cleanup patterns

## 📋 TODO/Known Issues

### **Active Improvements**
1. **Connection Pool Monitoring**: Enhanced metrics for connection pool utilization
2. **Session Performance**: Analysis of session lifecycle optimization opportunities
3. **Error Recovery**: Advanced connection failure recovery patterns
4. **Resource Monitoring**: Database resource usage tracking and alerting

### **Future Enhancements**
- **Read Replicas**: Support for read replica routing for query optimization
- **Connection Sharding**: Advanced connection distribution for scale
- **Health Monitoring**: Comprehensive database health checking and alerting
- **Backup Integration**: Automated backup and recovery coordination