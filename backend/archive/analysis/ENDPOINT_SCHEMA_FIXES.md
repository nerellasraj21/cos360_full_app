# Endpoint Schema Key Fixes Required

## Patterns Found with `request_schema: null`

### ✅ **Correct Usage** (No Body Expected)
- **GET /{id}** - Single record retrieval - `request_schema: null` is correct
- **DELETE /{id}** - Delete operations - `request_schema: null` is correct  
- **GET /dropdown** - Dropdown endpoints - `request_schema: null` is correct

### ❌ **Needs Fixing** (Should Have Schemas)
- **GET /** with pagination - Should use `request_schema: PaginationQuery`
- **GET /** with filters - Should use `request_schema: {Module}ListQuery`

## Required Fixes

### Academic Year Module
- ✅ `GET /api/v1/masters/academic_years/{id}` - null is correct
- ❌ `GET /api/v1/masters/academic_years/` - should be `AcademicYearListQuery`
- ✅ `GET /api/v1/masters/academic_years/dropdown` - null is correct

### Pattern: All List Endpoints Should Have Query Schemas
All `GET /` endpoints that support pagination should reference their ListQuery schema instead of null.

## Action Plan
1. Keep `request_schema: null` for single-record GET and all DELETE operations
2. Update list endpoints to use proper ListQuery schemas
3. Add any missing query parameter schemas to SESSION_CONTEXT_SCHEMAS.yml if needed

## Status
- **Issue Identified**: List endpoints using null instead of query schemas
- **Scope**: ~25 endpoints need ListQuery schema references
- **Impact**: Affects API documentation and automated testing