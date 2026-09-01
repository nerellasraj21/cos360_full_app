# Mobile App Implementation Verification Plan

**Date:** 2026-05-19  
**Task:** Synchronize missing modules from web app (frontend) to mobile app  
**Status:** ANALYSIS PHASE

---

## ✅ What the Web App (Frontend) Has

Based on files shown in IDE by user:

| File | Type | Purpose |
|------|------|---------|
| `app/users.ts` | Types | User management types (admin users API) |
| `app/admission.ts` | Types | Student admission types |
| `app/attendance.ts` | Types | Attendance tracking types |
| `app/auth.ts` | Types | Authentication types |
| `app/common.ts` | Types | Common/shared types |
| `app/exam.ts` | Types | Exam management types |

---

## 📊 What the Mobile App Currently Has

### **In `app/` directory (Root):**
- ✅ `app/common.ts` - Common types (EXISTS - VERIFIED)

### **In `src/types/` directory:**
- ✅ `src/types/exam.ts` - Exam types (CREATED by us)
- ✅ `src/types/expense.ts` - Expense types  
- ✅ `src/types/fees.ts` - Fees types
- ✅ `src/types/permissions.ts` - Permission types
- ✅ `src/types/transport.ts` - Transport types
- ✅ `src/types/common.ts` - Common types (CREATED by us)

### **In `src/api/` directory:**
- ✅ `src/api/auth.ts` - Auth API + types (EXISTS)
- ✅ `src/api/users.ts` - User API (CREATED by us)
- ✅ `src/api/students.ts` - Student API (includes admissions, attendance)
- ✅ `src/api/staff.ts` - Staff API (includes attendance)
- ✅ `src/api/exam.ts` - Exam API (EXISTS)
- ✅ `src/api/expense.ts` - Expense API
- ✅ `src/api/fees.ts` - Fees API
- ✅ `src/api/masters.ts` - Masters API
- ✅ `src/api/communication.ts` - Communication API
- ✅ `src/api/profile.ts` - Profile API
- ✅ `src/api/transport.ts` - Transport API

### **In `src/api/hooks/` directory:**
- ✅ `src/api/hooks/users/` - Users hooks (CREATED by us)
- ✅ `src/api/hooks/students/admissions.ts` - Admission hooks
- ✅ `src/api/hooks/students/attendance.ts` - Attendance hooks
- ✅ `src/api/hooks/students/` - Other student hooks

---

## 🔍 Missing Files in Mobile App

Files from web app that should be in `app/` directory:

| File | Status | Notes |
|------|--------|-------|
| `app/users.ts` | ❌ MISSING | User admin types (only in app folder of web app) |
| `app/admission.ts` | ❌ MISSING | Admission types (only in app folder of web app) |
| `app/attendance.ts` | ❌ MISSING | Attendance types (only in app folder of web app) |
| `app/auth.ts` | ❌ MISSING | Auth types (only in app folder of web app) |
| `app/exam.ts` | ❌ MISSING | Exam types (only in app folder of web app) |

---

## ✅ What's Already Implemented (API Layer)

### Users Module:
- ✅ `src/api/users.ts` - Admin users API (CREATED)
- ✅ `src/api/hooks/users/` - Users hooks (CREATED)
- ✅ Types exported from `src/api/index.ts`

### Admission Module:
- ✅ `src/api/students.ts` - Has `studentAdmissionsApi`
- ✅ `src/api/hooks/students/admissions.ts` - Admission hooks
- ✅ All types properly exported

### Attendance Module:
- ✅ `src/api/students.ts` - Has `studentAttendanceApi`
- ✅ `src/api/staff.ts` - Has `staffAttendanceApi`
- ✅ `src/api/hooks/students/attendance.ts` - Hooks
- ✅ All types properly exported

### Auth Module:
- ✅ `src/api/auth.ts` - Auth API with types
- ✅ Token management functions
- ✅ Menu and permission APIs

### Exam Module:
- ✅ `src/api/exam.ts` - Comprehensive exam API
- ✅ `src/types/exam.ts` - Extended exam types (CREATED)
- ✅ All CRUD operations implemented

---

## 📝 Implementation Plan

### PHASE 1: Create Missing Type Files in `app/` Directory

**Goal:** Ensure type parity between web app and mobile app by creating the missing `.ts` files in the `app/` root directory.

These files should mirror the web app's definitions and serve as the canonical type definitions for the app folder.

| File to Create | Content | Priority |
|---|---|---|
| `app/users.ts` | Admin user types + interfaces | HIGH |
| `app/admission.ts` | Student admission types | HIGH |
| `app/attendance.ts` | Attendance status types | HIGH |
| `app/auth.ts` | Auth & login response types | HIGH |
| `app/exam.ts` | Exam management types | MEDIUM |

### PHASE 2: Verify Type Exports

**Goal:** Ensure all types are properly exported from `src/api/index.ts`

Current status:
- ✅ Users: Exported (we created exports)
- ✅ Admission: Partially exported (check completeness)
- ✅ Attendance: Partially exported (check completeness)  
- ✅ Auth: Exported via `export * from './auth'`
- ✅ Exam: Exported (we created exports)
- ✅ Common: Needs to verify if properly exported

### PHASE 3: Verify API Implementations

**Goal:** Ensure all API layers are complete

- ✅ Users API: Complete (we created it)
- ✅ Admission API: Complete (already exists in students.ts)
- ✅ Attendance API: Complete (exists in students.ts and staff.ts)
- ✅ Auth API: Complete (exists in auth.ts)
- ✅ Exam API: Complete (comprehensive in exam.ts)

### PHASE 4: Verify React Query Hooks

**Goal:** Ensure all hooks are properly implemented and exported

- ✅ Users hooks: Complete (we created them)
- ✅ Admission hooks: Complete
- ✅ Attendance hooks: Complete
- ✅ Auth hooks: Need to verify
- ✅ Exam hooks: Need to verify

---

## 🎯 Action Items

### **IMMEDIATE (Must Do):**

1. **Create `app/users.ts`**
   - Copy web app version or derive from `src/api/users.ts` types
   - Ensure it exports all user-related interfaces
   - Include: `User`, `UserWithDetails`, `UserListResponse`, etc.

2. **Create `app/admission.ts`**
   - Export all admission types for student enrollment
   - Include: `StudentAdmission`, `StudentAdmissionCreate`, etc.

3. **Create `app/attendance.ts`**
   - Export attendance types for both students and staff
   - Include: `StudentAttendance`, `StaffAttendance`, etc.

4. **Create `app/auth.ts`**
   - Export auth state and login types
   - Include: `LoginRequest`, `LoginResponse`, `User`, `Role`, etc.

5. **Create `app/exam.ts`**
   - Export exam management types
   - Include: `Exam`, `ExamStatus`, `StudentMark`, etc.

### **FOLLOW-UP (Verify):**

6. Verify all types from `app/` files are exported in `src/api/index.ts`
7. Verify no type conflicts between `app/` and `src/types/`
8. Verify all hooks are properly exported from hook index files
9. Update git to track all new files
10. Commit with proper message

---

## 📚 Files Already Created (This Session)

✅ `src/api/users.ts` (91 lines)  
✅ `src/api/hooks/users/useAdminUsers.ts` (100 lines)  
✅ `src/api/hooks/users/index.ts` (2 lines)  
✅ `src/types/exam.ts` (508 lines)  
✅ `src/types/common.ts` (100 lines) - **NEEDS REVIEW**

---

## ⚠️ Issues Discovered

1. **No `app/` folder type files:** Web app has type definitions in `app/` folder (users.ts, admission.ts, etc.) but mobile app only has `app/common.ts`
   
2. **Type duplication:** `PaginatedResponse<T>` defined in multiple places:
   - `app/common.ts`
   - `src/types/expense.ts`
   - `src/types/transport.ts`
   - `src/api/hooks/students/admissions.ts`
   - Recommendation: Use `src/types/common.ts` as single source of truth

3. **Missing centralized types:** `src/types/common.ts` was just created but needs to be verified and integrated

---

## ✅ Verification Status

- [x] Web app structure verified
- [x] Mobile app structure mapped
- [x] Missing files identified
- [x] Existing API implementations confirmed
- [x] Hook implementations confirmed
- [ ] Type exports verified (NEXT)
- [ ] No conflicts found (NEXT)
- [ ] Ready for file creation (PENDING)

---

## Summary

**Web App has 5 missing type files in mobile app's `app/` directory:**
- `app/users.ts`
- `app/admission.ts`
- `app/attendance.ts`
- `app/auth.ts`
- `app/exam.ts`

**API implementations:** ✅ Mostly complete (we added users API)  
**Hooks implementations:** ✅ Mostly complete  
**Type definitions:** ⚠️ Scattered across multiple files (need consolidation)

**Recommendation:** 
1. Create the 5 missing `app/` files
2. Review and consolidate types to use `src/types/common.ts` as source of truth
3. Ensure proper exports throughout the codebase
4. Commit all changes with proper tracking

