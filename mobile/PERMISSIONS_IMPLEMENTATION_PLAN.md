# Permissions System - Detailed Implementation Plan

**Status:** Planning Phase - Ready for Implementation  
**Created:** 2026-05-19

---

## IMPLEMENTATION ROADMAP

### Phase 1: Core Permission Objects (High Priority)
Add missing permission resources and actions to ensure all features can be guarded

### Phase 2: Type System Updates (High Priority)
Update TypeScript types to be complete and accurate

### Phase 3: Utility Functions (Medium Priority)
Add helper functions for easier permission management

### Phase 4: Consolidation (Medium Priority)
Clean up distributed permission definitions

---

## PHASE 1: CORE PERMISSION OBJECTS

### Task 1.1: Add Missing Permission Actions to Existing Resources

#### Location: `src/constants/permissions.ts`

**Resource: student_certificates (lines 187-193)**
```
CURRENT (INCOMPLETE):
student_certificates: {
  create: 'student_certificates:create' as PermissionString,
  read: 'student_certificates:read' as PermissionString,
  update: 'student_certificates:update' as PermissionString,
  delete: 'student_certificates:delete' as PermissionString,
  list: 'student_certificates:list' as PermissionString,
}

SHOULD BE ADDED:
+ list_own: 'student_certificates:list_own' as PermissionString,
+ list_related: 'student_certificates:list_related' as PermissionString,
+ read_own: 'student_certificates:read_own' as PermissionString,
+ read_related: 'student_certificates:read_related' as PermissionString,

RESULT:
student_certificates: {
  create: 'student_certificates:create' as PermissionString,
  read: 'student_certificates:read' as PermissionString,
  update: 'student_certificates:update' as PermissionString,
  delete: 'student_certificates:delete' as PermissionString,
  list: 'student_certificates:list' as PermissionString,
  list_own: 'student_certificates:list_own' as PermissionString,
  list_related: 'student_certificates:list_related' as PermissionString,
  read_own: 'student_certificates:read_own' as PermissionString,
  read_related: 'student_certificates:read_related' as PermissionString,
}
```

---

**Resource: fee_transactions (lines 299-305)**
```
CURRENT (INCOMPLETE):
fee_transactions: {
  create: 'fee_transactions:create' as PermissionString,
  read: 'fee_transactions:read' as PermissionString,
  update: 'fee_transactions:update' as PermissionString,
  delete: 'fee_transactions:delete' as PermissionString,
  list: 'fee_transactions:list' as PermissionString,
}

SHOULD BE ADDED:
+ read_own: 'fee_transactions:read_own' as PermissionString,
+ list_own: 'fee_transactions:list_own' as PermissionString,

RESULT:
fee_transactions: {
  create: 'fee_transactions:create' as PermissionString,
  read: 'fee_transactions:read' as PermissionString,
  read_own: 'fee_transactions:read_own' as PermissionString,
  update: 'fee_transactions:update' as PermissionString,
  delete: 'fee_transactions:delete' as PermissionString,
  list: 'fee_transactions:list' as PermissionString,
  list_own: 'fee_transactions:list_own' as PermissionString,
}
```

---

**Resource: fee_receipts (lines 306-312)**
```
CURRENT (INCOMPLETE):
fee_receipts: {
  create: 'fee_receipts:create' as PermissionString,
  read: 'fee_receipts:read' as PermissionString,
  update: 'fee_receipts:update' as PermissionString,
  delete: 'fee_receipts:delete' as PermissionString,
  list: 'fee_receipts:list' as PermissionString,
}

SHOULD BE ADDED:
+ read_own: 'fee_receipts:read_own' as PermissionString,
+ list_own: 'fee_receipts:list_own' as PermissionString,

RESULT:
fee_receipts: {
  create: 'fee_receipts:create' as PermissionString,
  read: 'fee_receipts:read' as PermissionString,
  read_own: 'fee_receipts:read_own' as PermissionString,
  update: 'fee_receipts:update' as PermissionString,
  delete: 'fee_receipts:delete' as PermissionString,
  list: 'fee_receipts:list' as PermissionString,
  list_own: 'fee_receipts:list_own' as PermissionString,
}
```

---

### Task 1.2: Add Missing Resource Definitions

#### Location: `src/constants/permissions.ts`

**ADD AFTER fee_refunds (after line 321):**
```typescript
// NEW RESOURCE
student_documents: {
  create: 'student_documents:create' as PermissionString,
  read: 'student_documents:read' as PermissionString,
  update: 'student_documents:update' as PermissionString,
  delete: 'student_documents:delete' as PermissionString,
  list: 'student_documents:list' as PermissionString,
},

certificate_types: {
  create: 'certificate_types:create' as PermissionString,
  read: 'certificate_types:read' as PermissionString,
  update: 'certificate_types:update' as PermissionString,
  delete: 'certificate_types:delete' as PermissionString,
  list: 'certificate_types:list' as PermissionString,
  approve: 'certificate_types:approve' as PermissionString,
},

fee_term_amounts: {
  create: 'fee_term_amounts:create' as PermissionString,
  read: 'fee_term_amounts:read' as PermissionString,
  update: 'fee_term_amounts:update' as PermissionString,
  delete: 'fee_term_amounts:delete' as PermissionString,
  list: 'fee_term_amounts:list' as PermissionString,
},
```

---

**ADD AFTER transport_trips (after line 365):**
```typescript
// NEW RESOURCE
transport_pricing: {
  create: 'transport_pricing:create' as PermissionString,
  read: 'transport_pricing:read' as PermissionString,
  update: 'transport_pricing:update' as PermissionString,
  delete: 'transport_pricing:delete' as PermissionString,
  list: 'transport_pricing:list' as PermissionString,
},
```

---

### Task 1.3: Update PermissionResource Type

#### Location: `src/constants/permissions.ts` (lines 4-95)

**ADD to PermissionResource union type:**
```typescript
export type PermissionResource =
  // ... existing resources ...
  | 'student_documents'        // NEW
  | 'certificate_types'        // NEW
  | 'fee_term_amounts'         // NEW
  | 'transport_pricing'        // NEW
  
  // ... rest of existing ...
```

---

## PHASE 2: TYPE SYSTEM UPDATES

### Task 2.1: Update PermissionAction Type

#### Location: `src/constants/permissions.ts` (lines 96-111)

**UPDATE from:**
```typescript
export type PermissionAction<T extends PermissionResource = PermissionResource> =
  // Common actions
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'

  // Special actions
  | 'approve'
  | 'process'
  | 'export'
  | 'download'
  | 'read_related'
  | 'read_own'
  | 'update_own'
```

**UPDATE to:**
```typescript
export type PermissionAction<T extends PermissionResource = PermissionResource> =
  // Common actions
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'list'

  // Special actions
  | 'approve'
  | 'process'
  | 'export'
  | 'download'
  | 'read_related'
  | 'read_own'
  | 'update_own'
  | 'list_own'          // NEW
  | 'list_related'      // NEW
  | 'delete_own'        // NEW
```

---

### Task 2.2: Update src/types/permissions.ts

#### Location: `src/types/permissions.ts` (lines 88-99)

**UPDATE PERMISSION_ACTIONS constant:**
```typescript
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  APPROVE: 'approve',
  EXPORT: 'export',
  READ_OWN: 'read_own',
  UPDATE_OWN: 'update_own',
  DELETE_OWN: 'delete_own',      // NEW
  LIST_OWN: 'list_own',           // NEW
  LIST_RELATED: 'list_related',   // NEW
} as const;
```

---

#### Location: `src/types/permissions.ts` (lines 4-85)

**UPDATE PERMISSION_RESOURCES constant to include:**
```typescript
export const PERMISSION_RESOURCES = {
  // ... existing entries ...
  
  // Student Module - ADD MISSING
  STUDENT_DOCUMENTS: 'student_documents',      // NEW
  
  // Fee module - ADD MISSING  
  FEE_TERM_AMOUNTS: 'fee_term_amounts',        // NEW
  
  // Certificate Types - ADD MISSING
  CERTIFICATE_TYPES: 'certificate_types',      // NEW
  
  // Transport - ADD MISSING
  TRANSPORT_PRICING: 'transport_pricing',      // NEW
  
  // ... rest of existing ...
} as const;
```

---

### Task 2.3: Ensure Type Consistency

#### Validation: Make sure the following types are properly exported

File: `src/constants/permissions.ts`

**ADD/VERIFY exports:**
```typescript
// Verify these are exported at the end of the file:
export type PermissionResource = keyof typeof PERMISSIONS;
export type PermissionAction<T extends PermissionResource = PermissionResource> = keyof typeof PERMISSIONS[T];
```

---

## PHASE 3: UTILITY FUNCTIONS

### Task 3.1: Add getResourcePermissions() Function

#### Location: `src/constants/permissions.ts` (end of file, after COMMON_PERMISSIONS)

**ADD new function:**
```typescript
// Helper function to get all permissions for a specific resource
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

---

### Task 3.2: Add getPermission() Function

#### Location: `src/constants/permissions.ts` (after getResourcePermissions)

**ADD new function:**
```typescript
// Helper function to get a specific permission string
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

---

### Task 3.3: Add hasPermissionAction() Function

#### Location: `src/constants/permissions.ts` (after getPermission)

**ADD new function:**
```typescript
// Helper function to check if a resource has a specific action
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

---

## PHASE 4: CONSOLIDATION & CLEANUP

### Task 4.1: Review File Organization

#### Files involved:
1. `src/constants/permissions.ts` - Main definitions
2. `src/types/permissions.ts` - Type definitions and resource constants
3. `app/permissions.ts` - Current untracked file (NEW, needs review)
4. `hooks/use-mobile-permissions.ts` - Permission checking hook

---

### Task 4.2: Remove Backward Compatibility Comments (OPTIONAL)

#### Location: `src/types/permissions.ts` (line 38)

**CURRENT:**
```typescript
CLASSES_SECTIONS: 'classes_sections', // Keep for backward compatibility
```

**DECISION NEEDED:** 
- Is `classes_sections` still used anywhere?
- If not, consider removing it or documenting the migration path
- If yes, add tests to ensure fallback works correctly

---

### Task 4.3: Update COMMON_PERMISSIONS Helper

#### Location: `src/constants/permissions.ts` (lines 579-613)

**VERIFY the helper works correctly with new actions:**
```typescript
export const COMMON_PERMISSIONS = {
  // CRUD permissions
  CRUD: (resource: PermissionResource) => {
    const perms = PERMISSIONS[resource] as any
    return [
      perms.create,
      perms.read,
      perms.update,
      perms.delete,
      perms.list,
    ].filter(Boolean)
  },

  // Read-only permissions
  READ_ONLY: (resource: PermissionResource) => {
    const perms = PERMISSIONS[resource] as any
    return [
      perms.read,
      perms.list,
      perms.read_own,        // Add support for read_own
      perms.list_own,        // Add support for list_own
    ].filter(Boolean)
  },

  // Management permissions (includes approval)
  MANAGEMENT: (resource: PermissionResource) => {
    const perms = PERMISSIONS[resource] as any
    return [
      perms.create,
      perms.read,
      perms.update,
      perms.delete,
      perms.list,
      perms.approve,
      perms.process,         // Add support for process
    ].filter(Boolean)
  },
} as const
```

---

## SUMMARY OF CHANGES

### Files to Modify:
1. **src/constants/permissions.ts**
   - Add 4 missing resources (student_documents, certificate_types, fee_term_amounts, transport_pricing)
   - Add 8 missing permission actions to existing resources
   - Add 3 new PermissionAction types (list_own, list_related, delete_own)
   - Update PermissionResource union type
   - Add 3 new utility functions
   - Update COMMON_PERMISSIONS helper (optional)

2. **src/types/permissions.ts**
   - Add 4 missing resources to PERMISSION_RESOURCES constant
   - Add 3 missing actions to PERMISSION_ACTIONS constant

3. **app/permissions.ts** (New/Review)
   - Review if this should be consolidated with src/constants/permissions.ts
   - Check for duplication with existing definitions

---

## VERIFICATION STEPS

### After each phase, verify:

**Phase 1 Verification:**
- [ ] No TypeScript errors when importing from src/constants/permissions.ts
- [ ] New resources appear in PERMISSIONS object
- [ ] Permission strings are correctly formatted (resource:action)

**Phase 2 Verification:**
- [ ] PermissionResource type includes all resources
- [ ] PermissionAction type includes all actions
- [ ] Type checking works for permission strings
- [ ] IDE autocomplete shows new permissions

**Phase 3 Verification:**
- [ ] getResourcePermissions() returns correct array
- [ ] getPermission() returns correct permission string
- [ ] hasPermissionAction() correctly identifies valid actions
- [ ] All functions handle edge cases (missing resources)

**Phase 4 Verification:**
- [ ] No duplication in permission definitions
- [ ] File organization is clear and maintainable
- [ ] All imports/exports are correct
- [ ] No broken backward compatibility

---

## TESTING REQUIREMENTS

### Unit Tests Needed:
```typescript
describe('Permission Constants', () => {
  describe('Missing Resources', () => {
    test('should include student_documents resource');
    test('should include certificate_types resource');
    test('should include fee_term_amounts resource');
    test('should include transport_pricing resource');
  });

  describe('Missing Actions', () => {
    test('student_certificates should have list_own and read_own');
    test('fee_transactions should have read_own and list_own');
    test('fee_receipts should have read_own and list_own');
  });

  describe('Utility Functions', () => {
    test('getResourcePermissions should return all permissions for resource');
    test('getPermission should return correct permission string');
    test('hasPermissionAction should identify valid actions');
    test('should handle missing resources gracefully');
  });

  describe('Type Safety', () => {
    test('PermissionResource should include all resources');
    test('PermissionAction should include all actions');
    test('should allow type-safe permission checking');
  });
});
```

---

## ROLLBACK PLAN

If issues arise:
1. Revert changes to src/constants/permissions.ts
2. Revert changes to src/types/permissions.ts
3. Remove new utility functions
4. Restore previous permission checking behavior

---

## ESTIMATED EFFORT

- **Phase 1 (Core):** 30 minutes
- **Phase 2 (Types):** 20 minutes
- **Phase 3 (Functions):** 15 minutes
- **Phase 4 (Cleanup):** 20 minutes
- **Testing:** 45 minutes
- **Total:** ~2.5 hours

---

**Ready for Implementation**
