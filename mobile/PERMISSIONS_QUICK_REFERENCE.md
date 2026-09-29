# Permissions System - Quick Reference Guide

**Purpose:** Visual guide showing exactly what needs to be added  
**Target Users:** Developers implementing the changes

---

## AT A GLANCE

### Missing Components Count
- ❌ **4 Complete Resources** (not defined at all)
- ❌ **3 Existing Resources** with partial action definitions
- ❌ **3 New Action Types** (not in union)
- ⚠️ **2 Files** needing synchronization
- ✅ **3 New Utility Functions** to add

---

## 1. MISSING RESOURCES CHECKLIST

### ❌ MUST ADD - 4 Complete Resources

#### Resource 1: student_documents
```typescript
// Add to src/constants/permissions.ts
student_documents: {
  create: 'student_documents:create' as PermissionString,
  read: 'student_documents:read' as PermissionString,
  update: 'student_documents:update' as PermissionString,
  delete: 'student_documents:delete' as PermissionString,
  list: 'student_documents:list' as PermissionString,
},
```
**Web App:** Yes (line 67-73 in app/permissions.ts)  
**Mobile App:** ❌ Missing

---

#### Resource 2: certificate_types
```typescript
// Add to src/constants/permissions.ts
certificate_types: {
  create: 'certificate_types:create' as PermissionString,
  read: 'certificate_types:read' as PermissionString,
  update: 'certificate_types:update' as PermissionString,
  delete: 'certificate_types:delete' as PermissionString,
  list: 'certificate_types:list' as PermissionString,
  approve: 'certificate_types:approve' as PermissionString,
},
```
**Web App:** Yes (line 85-92 in app/permissions.ts)  
**Mobile App:** ❌ Missing

---

#### Resource 3: fee_term_amounts
```typescript
// Add to src/constants/permissions.ts
fee_term_amounts: {
  create: 'fee_term_amounts:create' as PermissionString,
  read: 'fee_term_amounts:read' as PermissionString,
  update: 'fee_term_amounts:update' as PermissionString,
  delete: 'fee_term_amounts:delete' as PermissionString,
  list: 'fee_term_amounts:list' as PermissionString,
},
```
**Web App:** Yes (line 169-175 in app/permissions.ts)  
**Mobile App:** ❌ Missing

---

#### Resource 4: transport_pricing
```typescript
// Add to src/constants/permissions.ts
transport_pricing: {
  create: 'transport_pricing:create' as PermissionString,
  read: 'transport_pricing:read' as PermissionString,
  update: 'transport_pricing:update' as PermissionString,
  delete: 'transport_pricing:delete' as PermissionString,
  list: 'transport_pricing:list' as PermissionString,
},
```
**Web App:** Yes (line 418-424 in app/permissions.ts)  
**Mobile App:** ❌ Missing

---

## 2. INCOMPLETE RESOURCES CHECKLIST

### ⚠️ MUST COMPLETE - 3 Resources Missing Actions

#### Incomplete 1: student_certificates
```
CURRENTLY HAS:           NEEDS TO ADD:
✅ create               ❌ list_own
✅ read                 ❌ list_related
✅ update               ❌ read_own
✅ delete               ❌ read_related
✅ list
```

**Location:** src/constants/permissions.ts, lines 187-193

**Code to add:**
```typescript
list_own: 'student_certificates:list_own' as PermissionString,
list_related: 'student_certificates:list_related' as PermissionString,
read_own: 'student_certificates:read_own' as PermissionString,
read_related: 'student_certificates:read_related' as PermissionString,
```

---

#### Incomplete 2: fee_transactions
```
CURRENTLY HAS:           NEEDS TO ADD:
✅ create               ❌ read_own
✅ read                 ❌ list_own
✅ update
✅ delete
✅ list
```

**Location:** src/constants/permissions.ts, lines 299-305

**Code to add:**
```typescript
read_own: 'fee_transactions:read_own' as PermissionString,
list_own: 'fee_transactions:list_own' as PermissionString,
```

---

#### Incomplete 3: fee_receipts
```
CURRENTLY HAS:           NEEDS TO ADD:
✅ create               ❌ read_own
✅ read                 ❌ list_own
✅ update
✅ delete
✅ list
```

**Location:** src/constants/permissions.ts, lines 306-312

**Code to add:**
```typescript
read_own: 'fee_receipts:read_own' as PermissionString,
list_own: 'fee_receipts:list_own' as PermissionString,
```

---

## 3. MISSING TYPE DEFINITIONS

### ❌ MUST UPDATE - PermissionAction Type

**Current (Incomplete):**
```typescript
export type PermissionAction<T extends PermissionResource = PermissionResource> =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'approve'
  | 'process'
  | 'export'
  | 'download'
  | 'read_related'
  | 'read_own'
  | 'update_own'
```

**Updated (Complete):**
```typescript
export type PermissionAction<T extends PermissionResource = PermissionResource> =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'
  | 'approve'
  | 'process'
  | 'export'
  | 'download'
  | 'read_related'
  | 'read_own'
  | 'update_own'
  | 'list_own'        // ← ADD
  | 'list_related'    // ← ADD
  | 'delete_own'      // ← ADD
```

**Location:** src/constants/permissions.ts, lines 96-111

---

### ❌ MUST UPDATE - PermissionResource Type

**Location:** src/constants/permissions.ts, lines 4-95

**Current Union includes all of:**
- academic_years, classes, sections, subjects, subject_categories, class_subject_mappings
- student_admissions, students, ~~student_documents~~, student_certificates, ~~certificate_types~~, student_attendance, student_transport
- staff, designations, staff_attendance
- parents, parent_management
- fee_categories, fee_types, fee_terms, ~~fee_term_amounts~~, fee_class_mappings, fee_student_mappings, fee_transactions, fee_receipts, fee_refunds
- routes, transport_routes, route_stops, vehicles, transport_vehicles, transport_trips, ~~transport_pricing~~
- timetables, timetable_management
- holidays, holiday_management
- user_management, role_management, permission_management, resource_permission_management
- menu_management
- fee_reports, staff_reports, student_reports, transport_reports, academic_reports
- profile, parent_profile
- expense_categories, expense_types, expense_transactions, expense_transaction_items, expense_attachments, expense_audit_logs, expense_settings, expense_reports
- exams, exam_marks, exam_results, exam_hall_tickets, exam_dates, grade_schemes

**Update:** Add the 4 missing ones (marked with ~~strikethrough~~ above)

---

## 4. MISSING UTILITY FUNCTIONS

### ❌ MUST ADD - 3 New Helper Functions

#### Function 1: getResourcePermissions()
```typescript
/**
 * Get all permission strings for a specific resource
 * @param resource - The permission resource
 * @returns Array of permission strings for the resource
 */
export const getResourcePermissions = (
  resource: PermissionResource
): string[] => {
  const resourcePerms = PERMISSIONS[resource];
  if (!resourcePerms) {
    console.warn(`Unknown permission resource: ${resource}`);
    return [];
  }
  return Object.values(resourcePerms);
};
```

**Location:** src/constants/permissions.ts (end of file)  
**Usage Example:**
```typescript
const studentCertPermissions = getResourcePermissions('student_certificates');
// Returns: ['student_certificates:create', 'student_certificates:read', ...]
```

---

#### Function 2: getPermission()
```typescript
/**
 * Get a specific permission string
 * @param resource - The permission resource
 * @param action - The action
 * @returns Permission string or empty string if not found
 */
export const getPermission = (
  resource: PermissionResource,
  action: string
): PermissionString | '' => {
  const resourcePerms = PERMISSIONS[resource] as any;
  if (!resourcePerms) {
    console.warn(`Unknown permission resource: ${resource}`);
    return '';
  }
  return resourcePerms[action] || '';
};
```

**Location:** src/constants/permissions.ts (after getResourcePermissions)  
**Usage Example:**
```typescript
const perm = getPermission('students', 'create');
// Returns: 'students:create'
```

---

#### Function 3: hasPermissionAction()
```typescript
/**
 * Check if a resource has a specific action
 * @param resource - The permission resource
 * @param action - The action name
 * @returns true if resource has the action, false otherwise
 */
export const hasPermissionAction = (
  resource: PermissionResource,
  action: string
): boolean => {
  const resourcePerms = PERMISSIONS[resource] as any;
  if (!resourcePerms) {
    return false;
  }
  return action in resourcePerms;
};
```

**Location:** src/constants/permissions.ts (after getPermission)  
**Usage Example:**
```typescript
if (hasPermissionAction('students', 'create')) {
  // Show create button
}
```

---

## 5. FILES TO SYNCHRONIZE

### ❌ MUST UPDATE - src/types/permissions.ts

**Add to PERMISSION_RESOURCES constant:**
```typescript
STUDENT_DOCUMENTS: 'student_documents',
CERTIFICATE_TYPES: 'certificate_types',
FEE_TERM_AMOUNTS: 'fee_term_amounts',
TRANSPORT_PRICING: 'transport_pricing',
```

**Add to PERMISSION_ACTIONS constant:**
```typescript
LIST_OWN: 'list_own',
LIST_RELATED: 'list_related',
DELETE_OWN: 'delete_own',
```

---

### ⚠️ REVIEW - app/permissions.ts (New File)

**Status:** Currently untracked (not in git)  
**Action:** Review if this should be:
1. Consolidated with src/constants/permissions.ts
2. Kept as separate export file
3. Removed if it's a duplicate

---

## 6. PRIORITY ORDER FOR IMPLEMENTATION

### Step 1: Add Missing Resources (5-10 minutes)
- [ ] Add student_documents to PERMISSIONS
- [ ] Add certificate_types to PERMISSIONS
- [ ] Add fee_term_amounts to PERMISSIONS
- [ ] Add transport_pricing to PERMISSIONS
- [ ] Add these 4 to PermissionResource type union

### Step 2: Complete Existing Resources (5-10 minutes)
- [ ] Add list_own, list_related, read_own, read_related to student_certificates
- [ ] Add read_own, list_own to fee_transactions
- [ ] Add read_own, list_own to fee_receipts

### Step 3: Update Type Definitions (5 minutes)
- [ ] Add list_own, list_related, delete_own to PermissionAction type
- [ ] Update PERMISSION_ACTIONS in src/types/permissions.ts
- [ ] Update PERMISSION_RESOURCES in src/types/permissions.ts

### Step 4: Add Utility Functions (10 minutes)
- [ ] Add getResourcePermissions() function
- [ ] Add getPermission() function
- [ ] Add hasPermissionAction() function

### Step 5: Verify & Test (15-20 minutes)
- [ ] Compile TypeScript - no errors
- [ ] Run existing tests - all pass
- [ ] Test new functions manually
- [ ] Check IDE autocomplete for new permissions

---

## 7. BEFORE/AFTER COMPARISON

### Before Implementation
```typescript
// Missing student_documents, certificate_types, fee_term_amounts, transport_pricing
const PERMISSIONS = {
  student_certificates: {
    create, read, update, delete, list  // Missing: list_own, list_related, read_own, read_related
  },
  fee_transactions: {
    create, read, update, delete, list  // Missing: read_own, list_own
  },
  // ... no utility functions ...
}
```

### After Implementation
```typescript
// All resources present, all actions complete
const PERMISSIONS = {
  student_documents: { create, read, update, delete, list },
  certificate_types: { create, read, update, delete, list, approve },
  fee_term_amounts: { create, read, update, delete, list },
  transport_pricing: { create, read, update, delete, list },
  
  student_certificates: {
    create, read, update, delete, list, list_own, list_related, read_own, read_related
  },
  fee_transactions: {
    create, read, update, delete, list, read_own, list_own
  },
  fee_receipts: {
    create, read, update, delete, list, read_own, list_own
  },
  // ... all other resources ...
}

// New utility functions available
export const getResourcePermissions = (resource) => { ... }
export const getPermission = (resource, action) => { ... }
export const hasPermissionAction = (resource, action) => { ... }

// New action types available
export type PermissionAction = ... | 'list_own' | 'list_related' | 'delete_own'
```

---

## 8. VALIDATION CHECKLIST

After completing all changes, verify:

- [ ] TypeScript compiles without errors
- [ ] `npm test` passes all tests
- [ ] IDE shows autocomplete for all new permissions
- [ ] New utility functions work correctly
- [ ] No breaking changes to existing code
- [ ] Permission strings match web app exactly
- [ ] All 4 new resources are accessible
- [ ] All action types are in union
- [ ] Documentation updated if needed

---

## 9. POTENTIAL ISSUES & SOLUTIONS

| Issue | Solution |
|-------|----------|
| TypeScript compilation errors | Check type definitions in PermissionAction and PermissionResource |
| Missing permissions in runtime | Ensure backend also returns these new permissions in login response |
| IDE autocomplete not updating | Restart IDE/editor |
| Tests failing | Update test fixtures to include new permissions |
| Backward compatibility breaking | Check if any code hardcodes permission strings |

---

## 10. REFERENCE: WEB APP vs MOBILE APP

### Web App Location
File: `app/permissions.ts`
- Lines 1-425: All permission definitions
- Lines 428-436: Utility functions

### Mobile App Locations
- `src/constants/permissions.ts` - Main PERMISSIONS object
- `src/types/permissions.ts` - Types and constants
- `hooks/use-mobile-permissions.ts` - Permission checking hook

---

**Print this guide while implementing for quick reference!**
