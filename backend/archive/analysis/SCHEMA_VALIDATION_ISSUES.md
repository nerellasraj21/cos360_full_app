# Schema Validation Issues Report

## ❌ **CRITICAL ISSUES FOUND**

### **1. Missing Schemas in SESSION_CONTEXT_SCHEMAS.yml**
These schemas are referenced in STRUCTURED.yml but missing from SCHEMAS.yml:

**Fee Module (Missing 22 schemas):**
- FeeTransactionCreate, FeeTransactionRead, FeeTransactionUpdate, FeeTransactionListQuery, PaginatedFeeTransactionRead
- StudentOutstandingFeesResponse, StudentTransactionHistoryResponse, TransactionHistoryQuery, TransactionSearchQuery
- FeeReceiptCreate, FeeReceiptRead, FeeReceiptListQuery, PaginatedFeeReceiptRead
- FeeReceiptContentResponse, FeeReceiptVerificationResponse, FeeReceiptReprintRequest
- FeeRefundCreate, FeeRefundRead, FeeRefundListQuery, PaginatedFeeRefundRead
- FeeRefundApprovalRequest, FeeRefundProcessRequest, FeeRefundSummaryQuery, FeeRefundSummaryResponse
- FeeCategoryCreate, FeeCategoryRead, FeeCategoryUpdate, FeeCategoryListQuery, PaginatedFeeCategoryRead, FeeCategoryDropdown
- FeeTypeCreate, FeeTypeRead, FeeTypeUpdate, FeeTypeListQuery, PaginatedFeeTypeRead, FeeTypeDropdown
- FeeTermCreate, FeeTermRead, FeeTermUpdate, FeeTermListQuery, PaginatedFeeTermRead, FeeTermDropdown, FeeTermDatesResponse
- FeeClassMappingCreate, FeeClassMappingRead, FeeClassMappingUpdate, FeeClassMappingListQuery, PaginatedFeeClassMappingRead, FeeClassMappingBulkCreate
- FeeStudentMappingCreate, FeeStudentMappingRead, FeeStudentMappingUpdate, FeeStudentMappingListQuery, PaginatedFeeStudentMappingRead, FeeStudentMappingBulkCreate
- FeeClassMapTermAmountCreate, FeeClassMapTermAmountRead, FeeClassMapTermAmountUpdate

**Student Module (Missing 15+ schemas):**
- StudentAdmissionRead, PaginatedStudentAdmissionRead, StudentAdmissionCreate, StudentAdmissionUpdate
- All student document, certificate, attendance, transport schemas

**Transport Module (Missing 10+ schemas):**
- RouteRead, RouteDropdown, VehicleRead, TripRead, etc.

**Auth Module (Missing 5+ schemas):**
- LoginResponse, PermissionListResponse, RoleRead, etc.

### **2. Duplicate Entries in SCHEMAS.yml**
- AcademicYearCreate (appears twice)
- AcademicYearRead (appears twice)
- ClassSubjectMappingBulkCreate (appears twice)
- BulkOperationResult (appears twice)

### **3. Incomplete Schema Definitions**
Many schemas only have partial field definitions, missing:
- Required validation rules
- Field types and constraints
- Examples for testing
- Response format specifications

## ✅ **IMMEDIATE ACTIONS REQUIRED**

1. **Add all missing schemas** to SESSION_CONTEXT_SCHEMAS.yml
2. **Remove duplicate entries**
3. **Complete partial schema definitions**
4. **Validate YAML syntax** 
5. **Cross-reference with actual Pydantic models** in codebase

## 📊 **Summary Statistics**
- **Total schemas referenced**: 47+
- **Schemas defined in SCHEMAS.yml**: ~30
- **Missing schemas**: 22+
- **Duplicate entries**: 4
- **Completion rate**: ~64% (CRITICAL)