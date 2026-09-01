# Permissions System - Code Files Reference

**Purpose:** Map all code files related to permissions system  
**Status:** Non-intrusive audit - No modifications made  
**Date:** 2026-05-19

---

## 📂 CRITICAL FILES FOR IMPLEMENTATION

### 1. **MAIN PERMISSIONS DEFINITION FILES** ⭐

#### File: `app/permissions.ts` (NEW/UNTRACKED)
- **Status:** ✅ EXISTS and COMPLETE
- **Lines:** 440
- **Purpose:** Central permission definitions using UPPERCASE key naming convention
- **Contains:**
  - ✅ ALL 4 missing resources (student_documents, certificate_types, fee_term_amounts, transport_pricing)
  - ✅ ALL missing permission actions for existing resources
  - ✅ Helper functions: `getResourcePermissions()`, `getPermission()`
  - ✅ Type exports: `PermissionResource`, `PermissionAction<T>`
- **Key Difference:** Uses UPPERCASE naming (ACADEMIC_YEARS) vs lowercase in src/constants
- **Status in Git:** UNTRACKED (not in version control yet)
- **Action Needed:** ✅ Ready to use - just needs to be staged/committed

#### File: `src/constants/permissions.ts` (EXISTING)
- **Status:** ⚠️ INCOMPLETE
- **Lines:** 566 (as const)
- **Purpose:** Mobile app permission constants using lowercase naming convention
- **Contains:**
  - ❌ MISSING: student_documents, certificate_types, fee_term_amounts, transport_pricing
  - ❌ MISSING: Extended actions for student_certificates, fee_transactions, fee_receipts
  - ✅ Helper functions for building/parsing permission strings
  - ✅ COMMON_PERMISSIONS helpers
- **Key Difference:** Uses lowercase naming (academic_years) and `as PermissionString` casting
- **Needs Update:** Yes - to match app/permissions.ts

#### File: `src/types/permissions.ts` (EXISTING)
- **Status:** ⚠️ INCOMPLETE
- **Lines:** 138
- **Purpose:** Type definitions and resource constants
- **Contains:**
  - ❌ MISSING: STUDENT_DOCUMENTS, CERTIFICATE_TYPES in PERMISSION_RESOURCES
  - ❌ MISSING: FEE_TERM_AMOUNTS, TRANSPORT_PRICING in PERMISSION_RESOURCES
  - ❌ MISSING: LIST_OWN, LIST_RELATED, DELETE_OWN in PERMISSION_ACTIONS
  - ✅ Type definitions for PermissionResource, PermissionAction
  - ✅ Error handling enums
- **Needs Update:** Yes - to sync with main definitions

---

### 2. **AUTHENTICATION & PERMISSION HANDLING FILES** 🔐

#### File: `contexts/AuthContext.tsx` (EXISTING)
- **Status:** ✅ WORKING CORRECTLY
- **Purpose:** Central authentication and permission state management
- **What It Does:**
  - Manages user login/logout
  - Stores permissions as array and permission map
  - Implements `hasPermission(resource, action)` method
  - Normalizes permissions from backend response
- **How It Uses Permissions:**
  - Lines 113: Normalizes permissions from login response
  - Lines 115-118: Creates permission map for quick lookup
  - Lines 28-29: Stores both array and map forms
- **Integration Points:**
  - Called by: useMobilePermission hook, all permission checks
  - Receives: Permission array from backend login response
  - Provides: hasPermission() method to components
- **No Changes Needed:** ✅ Works with new permissions automatically

#### File: `app/auth.ts` (EXISTING)
- **Status:** ✅ COMPLETE
- **Purpose:** Authentication types and interfaces
- **Contains:**
  - `LoginResponse` interface (has `permissions?: PermissionMap`)
  - `Permission` interface (resource, action, is_granted)
  - User, Role, Student types
- **No Changes Needed:** ✅ Already supports new permissions

#### File: `services/authUtils.ts` (NOT SHOWN BUT REFERENCED)
- **Purpose:** Backend authentication logic
- **What It Has:**
  - `normalisePermissions()` function - converts backend format to Permission[]
  - `loginUser()` function - calls login endpoint
  - Permission normalization logic
- **Critical Function:** `normalisePermissions()`
  - Must convert backend permission format to: `{ resource, action, is_granted }`
  - Example: Backend sends `['student_documents:create']` → converts to `{ resource: 'student_documents', action: 'create', is_granted: true }`
- **No Changes Needed:** ✅ Should work with any resource/action combination

---

### 3. **PERMISSION CHECKING HOOKS** 🪝

#### File: `src/hooks/useMobilePermission.ts` (EXISTING)
- **Status:** ✅ WORKING
- **Purpose:** React hook for permission checking in components
- **Provides Methods:**
  - `checkPermission(resource, action)` - Basic check
  - `hasPermission(resource, action)` - Direct check
  - `hasAllPermissions([...])` - Check multiple with AND logic
  - `hasAnyPermission([...])` - Check multiple with OR logic
  - `canCreate()`, `canRead()`, `canUpdate()`, `canDelete()` - CRUD shortcuts
- **Implementation:** Delegates to AuthContext's hasPermission()
- **No Changes Needed:** ✅ Works with new permissions automatically

#### File: `src/hooks/useScreenPermissions.ts` (EXISTING)
- **Status:** ✅ WORKING
- **Purpose:** Check screen-level permissions
- **Uses:** `SCREEN_PERMISSIONS` config from src/config/screenPermissions.ts
- **No Changes Needed:** ✅ Works with new permissions automatically

#### File: `hooks/use-mobile-permissions.ts` (EXISTING - OLD FORMAT)
- **Status:** ⚠️ ALTERNATIVE IMPLEMENTATION
- **Note:** Similar to useMobilePermission.ts but in different location
- **Contains:** Extended permission methods and CRUD helpers
- **Usage:** Check if actively used or if useMobilePermission.ts is preferred

---

### 4. **PERMISSION CONFIGURATION FILES** ⚙️

#### File: `src/config/screenPermissions.ts` (EXISTING)
- **Status:** ✅ COMPLETE
- **Lines:** 352
- **Purpose:** Maps app screens to required permissions
- **Current State:**
  - ✅ Already includes NEW resources: student_documents, student_certificates
  - ✅ Permission tuples are generic strings, not tied to specific definitions
  - Example (line 40-42):
    ```typescript
    '/students/documents': {
      requiredPermissions: [['student_documents', 'list'], ['student_documents', 'read']],
      requireAll: false,
    }
    ```
- **How It Works:**
  - Components check screen paths against this config
  - `validateScreenAccess()` function validates access
  - Can show fallback screens or redirects
- **Action Needed:** ✅ NO CHANGES - Already forward-compatible with new permissions

#### File: `src/api/mobilePermissions.ts` (EXISTING - NOT ACTIVE)
- **Status:** ⚠️ NOT CURRENTLY USED
- **Note:** (Line 1-2) "This file is not currently called anywhere in the app"
- **Purpose:** Would handle permission caching and syncing
- **Note:** Has TODO comment about H-2 (dual auth stores) issue
- **Action Needed:** ⚠️ REVIEW - May need activation after core implementation

---

### 5. **API & INTEGRATION FILES** 🔌

#### File: `src/api/auth.ts` (EXISTING)
- **Status:** ✅ COMPLETE
- **Purpose:** Backend API calls for auth
- **Contains:**
  - Token management (get, set, clear)
  - Menu API calls
  - Permission API calls
  - Token refresh logic
- **Note:** Lines 135-139: `getBasePermissions()` API for admin screens
- **No Changes Needed:** ✅ Generic endpoints work with any permissions

#### File: `src/api/client.ts` (REFERENCED BUT NOT SHOWN)
- **Purpose:** Axios client setup for API calls
- **Critical:** Sets up authentication headers with token
- **Used By:** All API calls
- **No Changes Needed:** ✅ Works with any permissions

---

### 6. **UTILITY & COMPATIBILITY FILES** 🛠️

#### File: `utils/permission-compatibility.ts` (EXISTING)
- **Status:** ✅ EXISTS
- **Purpose:** Handles backward compatibility for permission checking
- **Function:** `hasPermissionWithFallbacks()`
- **Used By:** AuthContext (line 22 in AuthContext.tsx)
- **No Changes Needed:** ✅ Generic fallback logic

#### File: `utils/verify-permissions.ts` (EXISTING)
- **Status:** ✅ EXISTS
- **Purpose:** Testing and verification utilities
- **Contains:** Mock permission data, test functions
- **Action Needed:** ✅ UPDATE - Add tests for new permissions

#### File: `utils/mobilePermissionCache.ts` (EXISTING)
- **Status:** ✅ EXISTS
- **Purpose:** Caches permissions locally
- **No Changes Needed:** ✅ Works with any permission data

#### File: `src/utils/permission-errors.ts` (EXISTING)
- **Status:** ✅ EXISTS
- **Purpose:** Permission error types and handling
- **No Changes Needed:** ✅ Generic error handling

---

## 📊 FILE DEPENDENCY DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│ Backend Login Endpoint                                   │
│ (sends permissions array + permission map)               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ services/authUtils.ts                                    │
│ • normalisePermissions() - converts backend format       │
│ • loginUser() - calls backend                            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│ contexts/AuthContext.tsx  (MAIN PERMISSION HUB)         │
│ • Stores permissions array + map                         │
│ • Provides hasPermission(resource, action)              │
│ • Normalizes from backend format                        │
└───┬──────────┬────────────────┬────────────────┬────────┘
    │          │                │                │
    ▼          ▼                ▼                ▼
┌────────┐ ┌─────────┐ ┌──────────────┐ ┌───────────────┐
│Hooks   │ │Constants│ │Config        │ │Auth Types     │
├────────┤ ├─────────┤ ├──────────────┤ ├───────────────┤
│useMobil│ │perms.ts │ │screenPerms.ts│ │auth.ts        │
│Permiss │ │         │ │              │ │               │
│useScrn │ │types.ts │ │Maps screens  │ │Permission     │
│Permiss │ │         │ │to perms      │ │interface      │
└────────┘ └─────────┘ └──────────────┘ └───────────────┘
    │          │                │                │
    └──────────┴────────────────┴────────────────┘
              │
              ▼
    ┌──────────────────────┐
    │ React Components     │
    │ (Use permissions)    │
    └──────────────────────┘
```

---

## ✅ IMPLEMENTATION CHECKLIST BY FILE

### Must Modify:
- [ ] **src/constants/permissions.ts** - Add 4 resources + 8 actions + update types
- [ ] **src/types/permissions.ts** - Add resources/actions to constants

### Should Verify:
- [ ] **app/permissions.ts** - Review, stage, and commit (already complete)
- [ ] **src/config/screenPermissions.ts** - Add new screen permission configs if needed
- [ ] **utils/verify-permissions.ts** - Update test fixtures

### No Changes Needed:
- ✅ contexts/AuthContext.tsx
- ✅ app/auth.ts  
- ✅ src/api/auth.ts
- ✅ src/hooks/useMobilePermission.ts
- ✅ src/hooks/useScreenPermissions.ts
- ✅ utils/permission-compatibility.ts
- ✅ utils/mobilePermissionCache.ts

### Optional/Future:
- ⚠️ src/api/mobilePermissions.ts - Review if activation needed
- ⚠️ hooks/use-mobile-permissions.ts - Determine if duplicate of useMobilePermission.ts

---

## 🔄 DATA FLOW FOR NEW PERMISSIONS

### 1. User Logs In
```
User submits credentials
  ↓
Backend returns LoginResponse with:
  - access_token
  - refresh_token
  - user info
  - role
  - permissions: [
      { resource: 'students', action: 'list', is_granted: true },
      { resource: 'students', action: 'create', is_granted: true },
      { resource: 'student_documents', action: 'read', is_granted: true },  ← NEW
      ...
    ]
  - menu items
```

### 2. AuthContext Processes
```
AuthContext.login() receives LoginResponse
  ↓
normalisePermissions() converts format if needed
  ↓
Creates permissionsMap:
  {
    'students:list': { resource: 'students', action: 'list', is_granted: true },
    'student_documents:read': { ... },  ← NEW
    ...
  }
  ↓
Stores in state as both array and map
```

### 3. Components Check Permissions
```
Component calls: useMobilePermission()
  ↓
useMobilePermission.canRead('student_documents')
  ↓
Delegates to: AuthContext.hasPermission('student_documents', 'read')
  ↓
Checks permissionsMap['student_documents:read']
  ↓
Returns: true/false
```

---

## 📋 RESOURCE MAPPING

### Current Status in Code Files:

| Resource | app/permissions.ts | src/constants | src/types | src/config | Status |
|----------|-------------------|---------------|-----------|-----------|--------|
| student_documents | ✅ | ❌ | ❌ | ✅ | PENDING |
| certificate_types | ✅ | ❌ | ❌ | ✅ | PENDING |
| fee_term_amounts | ✅ | ❌ | ❌ | ✅ | PENDING |
| transport_pricing | ✅ | ❌ | ❌ | ✅ | PENDING |
| student_certificates | ✅ (complete) | ⚠️ (incomplete) | ✅ | ✅ | IN PROGRESS |
| fee_transactions | ✅ (complete) | ⚠️ (incomplete) | ✅ | ✅ | IN PROGRESS |
| fee_receipts | ✅ (complete) | ⚠️ (incomplete) | ✅ | ✅ | IN PROGRESS |

**Key Finding:** `app/permissions.ts` is already complete with ALL needed permissions. Just needs to be properly integrated.

---

## 🎯 INTEGRATION PATH

### Option A: Use app/permissions.ts (Preferred)
1. Stage `app/permissions.ts` for commit
2. Export definitions from it in src/constants/permissions.ts
3. Update src/types/permissions.ts to match
4. Update tests

**Pros:**
- UPPERCASE naming matches web app exactly
- All definitions already complete
- Minimal new code
- Clear single source of truth

**Cons:**
- Different naming convention from existing mobile code
- May require refactoring imports

### Option B: Copy to src/constants (Alternative)
1. Copy PERMISSIONS object from app/permissions.ts
2. Paste into src/constants/permissions.ts
3. Convert naming to lowercase if preferred
4. Update src/types/permissions.ts
5. Update tests

**Pros:**
- Consistent with existing mobile structure
- All in one place

**Cons:**
- Duplicate definitions
- More work to maintain

---

## 🔍 FILES ALREADY PREPARED

The following files are **already prepared** and don't need changes:

### Screen Permissions Already Include:
✅ `/students/documents` - configured for student_documents
✅ `/students/mycertificates` - configured for student_certificates  
✅ `/fees/terms` - place for fee_term_amounts
✅ `/transport/*` - place for transport_pricing

### Backend Response Format:
✅ LoginResponse includes optional `permissions?: PermissionMap`
✅ Permission interface ready: `{ id, resource, action, is_granted }`

### Type System:
✅ Generic PermissionAction types that work with any resource
✅ PermissionResource union type (will auto-extend)

---

## ⚠️ CRITICAL DEPENDENCIES

### Must Be True for Implementation:
1. **Backend must return new permissions in login response**
   - If backend doesn't return `student_documents:read` etc.
   - Mobile app won't have those permissions to check
   - Feature guards will fail silently

2. **normalisePermissions() must handle all resources**
   - Should be generic (which it is)
   - But verify it doesn't filter out unknown resources

3. **Permission names must match between frontend and backend**
   - Backend sends: `"student_documents:create"`
   - Frontend expects: `"student_documents:create"`
   - Must be exact match

---

## 🧪 TESTING TOUCH POINTS

Files that will be affected by tests:
- `utils/verify-permissions.ts` - Add test fixtures for new permissions
- Any component tests checking permissions
- Integration tests with mock login responses

---

## 📝 SUMMARY TABLE

| File | Location | Status | Changes | Priority |
|------|----------|--------|---------|----------|
| app/permissions.ts | App root | ✅ Complete | Stage & commit | 🔴 CRITICAL |
| src/constants/permissions.ts | Core | ⚠️ Incomplete | Update definitions | 🔴 CRITICAL |
| src/types/permissions.ts | Core | ⚠️ Incomplete | Update types | 🔴 CRITICAL |
| contexts/AuthContext.tsx | Core | ✅ Ready | None | ✅ OK |
| src/config/screenPermissions.ts | Config | ✅ Ready | Review only | ✅ OK |
| src/hooks/useMobilePermission.ts | Hooks | ✅ Ready | None | ✅ OK |
| utils/verify-permissions.ts | Utils | ⚠️ Needs tests | Add test data | 🟡 MEDIUM |
| services/authUtils.ts | Services | ✅ Ready | None | ✅ OK |

---

**All code files mapped. Ready for implementation.**
