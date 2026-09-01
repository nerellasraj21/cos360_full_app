# Permissions System - Web App vs Mobile App Comparison & Implementation Plan

**Date:** 2026-05-19  
**Status:** Analysis Complete - No Code Changes Made

---

## EXECUTIVE SUMMARY

The mobile app has a solid permissions foundation built on the web app's structure, but there are **12 key areas with missing implementations**, ranging from missing permission actions in specific resources to entirely missing resources and utility functions.

---

## 1. MISSING PERMISSION ACTIONS IN EXISTING RESOURCES

### 1.1 STUDENT_CERTIFICATES Resource
**Web App has:**
- `LIST_OWN` → `student_certificates:list_own`
- `LIST_RELATED` → `student_certificates:list_related`
- `READ_OWN` → `student_certificates:read_own`
- `READ_RELATED` → `student_certificates:read_related`

**Mobile App has:**
- `CREATE`, `READ`, `UPDATE`, `DELETE`, `LIST` only

**Impact:** Students cannot view their own certificates or related certificates based on role

---

### 1.2 FEE_TRANSACTIONS Resource
**Web App has:**
- `READ_OWN` → `fee_transactions:read_own`
- `LIST_OWN` → `fee_transactions:list_own`

**Mobile App missing:** These owner-specific actions

**Impact:** Cannot implement role-based fee viewing (student sees own fees, admin sees all)

---

### 1.3 FEE_RECEIPTS Resource
**Web App has:**
- `READ_OWN` → `fee_receipts:read_own`
- `LIST_OWN` → `fee_receipts:list_own`

**Mobile App missing:** These owner-specific actions

**Impact:** Cannot filter receipts by ownership/role

---

## 2. MISSING ENTIRE RESOURCE DEFINITIONS

### 2.1 STUDENT_DOCUMENTS Resource
**Web App defines:**
```
STUDENT_DOCUMENTS: {
  CREATE: 'student_documents:create',
  READ: 'student_documents:read',
  UPDATE: 'student_documents:update',
  DELETE: 'student_documents:delete',
  LIST: 'student_documents:list',
}
```

**Mobile App Status:** Not in src/constants/permissions.ts

**Impact:** No document upload/management permissions

---

### 2.2 CERTIFICATE_TYPES Resource
**Web App defines:**
```
CERTIFICATE_TYPES: {
  CREATE: 'certificate_types:create',
  READ: 'certificate_types:read',
  UPDATE: 'certificate_types:update',
  DELETE: 'certificate_types:delete',
  LIST: 'certificate_types:list',
  APPROVE: 'certificate_types:approve',
}
```

**Mobile App Status:** Not in src/constants/permissions.ts

**Impact:** Cannot manage certificate types as admin

---

### 2.3 FEE_TERM_AMOUNTS Resource
**Web App defines:**
```
FEE_TERM_AMOUNTS: {
  CREATE: 'fee_term_amounts:create',
  READ: 'fee_term_amounts:read',
  UPDATE: 'fee_term_amounts:update',
  DELETE: 'fee_term_amounts:delete',
  LIST: 'fee_term_amounts:list',
}
```

**Mobile App Status:** Not in src/constants/permissions.ts

**Impact:** Cannot set fee amounts per term

---

### 2.4 TRANSPORT_PRICING Resource
**Web App defines:**
```
TRANSPORT_PRICING: {
  CREATE: 'transport_pricing:create',
  READ: 'transport_pricing:read',
  UPDATE: 'transport_pricing:update',
  DELETE: 'transport_pricing:delete',
  LIST: 'transport_pricing:list',
}
```

**Mobile App Status:** Not in src/constants/permissions.ts

**Impact:** Cannot manage transport pricing configurations

---

## 3. STRUCTURAL & NAMING DIFFERENCES

### 3.1 Naming Convention
| Aspect | Web App | Mobile App |
|--------|---------|-----------|
| Resource Keys | Uppercase (e.g., `ACADEMIC_YEARS`) | lowercase (e.g., `academic_years`) |
| Action Keys | Uppercase (e.g., `CREATE`, `READ`) | lowercase (e.g., `create`, `read`) |
| Format | Constants/Enums | lowercase keys with type casting |

**Current Implementation:** Both work, but inconsistent with existing codebase patterns

---

### 3.2 File Organization
**Web App:**
- Single file: `app/permissions.ts`

**Mobile App (distributed):**
- `src/constants/permissions.ts` - Main PERMISSIONS object
- `src/types/permissions.ts` - Additional types and constants (PERMISSION_RESOURCES, PERMISSION_ACTIONS)
- Multiple helper utilities in `/hooks` and `/utils`

**Issue:** Definitions split across multiple files; some redundancy in naming

---

## 4. MISSING UTILITY FUNCTIONS

### 4.1 getResourcePermissions() Function
**Web App implementation:**
```typescript
export const getResourcePermissions = (resource: keyof typeof PERMISSIONS) => {
  return Object.values(PERMISSIONS[resource]);
};
```

**Mobile App:** 
- Has `useMobilePermissions` hook with similar functionality embedded
- No standalone function version

**Impact:** Cannot easily get all permissions for a resource from constants directly

---

### 4.2 getPermission() Function
**Web App implementation:**
```typescript
export const getPermission = (resource: keyof typeof PERMISSIONS, action: string) => {
  const resourcePerms = PERMISSIONS[resource];
  return resourcePerms[action as keyof typeof resourcePerms] || '';
};
```

**Mobile App:**
- Has `buildPermissionString()` (inverse operation)
- Has `parsePermissionString()` (splits a permission string)
- No combined getter function

**Impact:** Need intermediate steps to retrieve permission strings

---

## 5. MISSING TYPE EXPORTS

### 5.1 PermissionResource Type
**Web App:**
```typescript
export type PermissionResource = keyof typeof PERMISSIONS;
```

**Mobile App:**
- Defined as union type of all resource names (lines 4-95 in src/constants/permissions.ts)
- Also defined as `typeof PERMISSION_RESOURCES[keyof typeof PERMISSION_RESOURCES]` in src/types/permissions.ts

**Issue:** Not exported as a simple alias from the main permissions file

---

### 5.2 PermissionAction Type
**Web App:**
```typescript
export type PermissionAction<T extends PermissionResource> = keyof typeof PERMISSIONS[T];
```

**Mobile App:**
- Defined as union type of all action names (lines 96-111 in src/constants/permissions.ts)
- Also defined from PERMISSION_ACTIONS in src/types/permissions.ts

**Issue:** Type is not generic/tied to specific resources; cannot validate action exists for resource

---

## 6. MISSING PERMISSION ACTIONS IN EXAM MODULE

### 6.1 Exam Results Permissions
**Web App has:**
- `exam_results:approve` (for approving exam results)

**Mobile App has:**
- Missing the specific `DELETE` action for exam results

**Impact:** Cannot delete exam results when needed

---

## 7. MISSING SPECIALIZED ACTIONS

### 7.1 list_own and list_related Actions
Missing from `PermissionAction` union type in src/constants/permissions.ts:
- `list_own` (for student certificates, fee transactions, etc.)
- `list_related` (for student certificates)

**Current PermissionAction includes:**
- Basic: create, read, update, delete, list
- Special: approve, process, export, download, read_related, read_own, update_own

**Missing:** list_own, list_related, delete_own

**Impact:** Type checking will fail when trying to use these actions even though they exist in PERMISSIONS

---

## 8. MISSING ADDITIONAL PERMISSION CONSTANTS

### 8.1 PROCESS Action
**Web App has:**
- Used in FEE_REFUNDS: `process: 'fee_refunds:process'`
- Used in EXPENSE_TRANSACTIONS: `approve: 'expense_transactions:approve'`

**Mobile App:**
- Has `process` in PermissionAction union
- Has it in FEE_REFUNDS and EXPENSE_TRANSACTIONS
- ✅ This is implemented correctly

---

## 9. TYPE COMPLETENESS ISSUES

### 9.1 List of Missing Type Validations
1. **resource_permission_management** not properly validated
2. **user_management** has no CREATE, DELETE (only list, read, update)
3. **timetable_management vs timetables** - Both exist (potential duplication)
4. **holiday_management vs holidays** - Both exist (potential duplication)

---

## 10. DEPRECATED/BACKWARD COMPATIBILITY ISSUES

### 10.1 classes_sections Reference
**In src/types/permissions.ts (line 38):**
```typescript
CLASSES_SECTIONS: 'classes_sections', // Keep for backward compatibility
```

**Web App:** No such backward compatibility reference

**Mobile App Issue:** Comment indicates this is legacy support, but no migration path documented

---

## 11. COMPARISON SUMMARY TABLE

| Item | Web App | Mobile App | Status |
|------|---------|-----------|--------|
| STUDENT_DOCUMENTS | ✅ | ❌ | MISSING |
| CERTIFICATE_TYPES | ✅ | ❌ | MISSING |
| FEE_TERM_AMOUNTS | ✅ | ❌ | MISSING |
| TRANSPORT_PRICING | ✅ | ❌ | MISSING |
| STUDENT_CERTIFICATES.LIST_OWN | ✅ | ❌ | MISSING |
| STUDENT_CERTIFICATES.LIST_RELATED | ✅ | ❌ | MISSING |
| STUDENT_CERTIFICATES.READ_OWN | ✅ | ❌ | MISSING |
| STUDENT_CERTIFICATES.READ_RELATED | ✅ | ❌ | MISSING |
| FEE_TRANSACTIONS.READ_OWN | ✅ | ❌ | MISSING |
| FEE_TRANSACTIONS.LIST_OWN | ✅ | ❌ | MISSING |
| FEE_RECEIPTS.READ_OWN | ✅ | ❌ | MISSING |
| FEE_RECEIPTS.LIST_OWN | ✅ | ❌ | MISSING |
| getResourcePermissions() | ✅ | ⚠️ | Hook only |
| getPermission() | ✅ | ⚠️ | Indirect |
| Type: PermissionResource | ✅ | ⚠️ | Union, not alias |
| Type: PermissionAction | ✅ | ⚠️ | Not resource-generic |
| Naming Convention | UPPERCASE | lowercase | MIXED |
| File Organization | Centralized | Distributed | DIFFERENT |

---

## 12. IMPLEMENTATION PRIORITY

### **CRITICAL (Blocks Functionality)**
1. ✅ Add missing permission actions to STUDENT_CERTIFICATES
2. ✅ Add missing permission actions to FEE_TRANSACTIONS
3. ✅ Add missing permission actions to FEE_RECEIPTS
4. ✅ Add STUDENT_DOCUMENTS resource definition
5. ✅ Add CERTIFICATE_TYPES resource definition
6. ✅ Add FEE_TERM_AMOUNTS resource definition
7. ✅ Add TRANSPORT_PRICING resource definition

### **HIGH (Improves Type Safety)**
8. ✅ Add missing action types (list_own, list_related, delete_own)
9. ✅ Add getResourcePermissions() standalone function
10. ✅ Add getPermission() utility function
11. ✅ Update PermissionAction type to be resource-generic

### **MEDIUM (Code Quality)**
12. ✅ Standardize naming conventions (decide on case style)
13. ✅ Consolidate permissions into single source of truth
14. ✅ Remove backward compatibility comments if classes_sections is not used
15. ✅ Document differences between permission definitions

### **LOW (Documentation)**
16. ✅ Add inline comments explaining permission relationships
17. ✅ Document deprecated permissions
18. ✅ Create permissions migration guide

---

## 13. AFFECTED FEATURES BY MISSING PERMISSIONS

### Feature: Student Certificate Management
**Missing Permissions:**
- `student_certificates:list_own`
- `student_certificates:read_own`
- `student_certificates:list_related`
- `student_certificates:read_related`

**Impact:** Cannot implement student/parent view of own certificates

---

### Feature: Fee Management & Viewing
**Missing Permissions:**
- `fee_transactions:read_own`
- `fee_transactions:list_own`
- `fee_receipts:read_own`
- `fee_receipts:list_own`
- `fee_term_amounts:*` (entire resource)

**Impact:** Cannot show students/parents their own fee transactions and receipts separately from others

---

### Feature: Document Management
**Missing Resource:** `student_documents:*`

**Impact:** No permission structure for document upload/storage

---

### Feature: Certificate Type Management
**Missing Resource:** `certificate_types:*`

**Impact:** No admin controls for creating/managing certificate types

---

### Feature: Transport Pricing Configuration
**Missing Resource:** `transport_pricing:*`

**Impact:** No admin interface for managing transport route pricing

---

## 14. NEXT STEPS AFTER IMPLEMENTATION

1. **Update all permission-checking code** in components to use new permissions
2. **Add permission guards** to screens using new resources
3. **Update API layer** to enforce new permission checks
4. **Test permission scenarios** with different role types
5. **Update documentation** with complete permission matrix
6. **Add E2E tests** for permission-based feature access

---

## FILES REQUIRING UPDATES

### Direct Updates Needed:
1. `src/constants/permissions.ts` - Add missing resources and actions
2. `src/types/permissions.ts` - Update PermissionResource and PermissionAction types
3. `app/permissions.ts` - Add missing utilities and exports

### Potential Updates (After Core):
1. `hooks/use-mobile-permissions.ts` - May need new helper methods
2. `utils/verify-permissions.ts` - Add verification for new permissions
3. Component files using permissions - Add new permission checks

---

## VALIDATION CHECKLIST

After implementation, verify:
- [ ] All resources from web app are in mobile app
- [ ] All permission actions match between web and mobile
- [ ] Type exports are complete and accurate
- [ ] Utility functions work correctly
- [ ] No typescript errors when using new permissions
- [ ] Backward compatibility is maintained (if needed)
- [ ] Performance is not affected by changes
- [ ] Tests pass for permission system

---

**Analysis Complete - Ready for Implementation Planning**
