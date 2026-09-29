# Fee Management Module - API Integration Fix Plan

**Date:** 2026-02-05
**Priority:** 🔴 CRITICAL
**Estimated Total Time:** 2-3 days
**Found Issues:** 82+ integration bugs

---

## 📋 OVERVIEW

This document provides a step-by-step fix plan for resolving all API integration issues found in the fee management module. Issues are organized by priority and include detailed implementation steps.

---

## 🔴 PHASE 1: CRITICAL FIXES (Day 1 - 6 hours)

### Fix #1: Create Missing React Query Hooks for Transactions

**Priority:** 🔴 CRITICAL
**Time:** 2 hours
**Impact:** Enables proper caching, reduces API calls, fixes architecture violation

#### Step 1: Create Hooks File

**Create:** `src/api/hooks/fee/transactions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeTransactionApi } from '@/api/fee/transactions';
import type {
  FeeTransactionSearchParams,
  FeeTransactionCreateRequest,
  FeeTransactionUpdateRequest,
} from '@/types/fee/transaction';

// ===== QUERY KEY FACTORY =====
export const feeTransactionKeys = {
  all: ['fee-transactions'] as const,
  lists: () => [...feeTransactionKeys.all, 'list'] as const,
  list: (params: FeeTransactionSearchParams) =>
    [...feeTransactionKeys.lists(), params] as const,
  details: () => [...feeTransactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...feeTransactionKeys.details(), id] as const,
  outstanding: (studentId: string, academicYearId?: string) =>
    [...feeTransactionKeys.all, 'outstanding', studentId, academicYearId] as const,
  history: (studentId: string, academicYearId?: string) =>
    [...feeTransactionKeys.all, 'history', studentId, academicYearId] as const,
  myTransactions: (params?: { skip?: number; limit?: number }) =>
    [...feeTransactionKeys.all, 'my-transactions', params] as const,
  myChildren: (params?: any) =>
    [...feeTransactionKeys.all, 'my-children', params] as const,
};

// ===== READ HOOKS =====

export const useTransactions = (params: FeeTransactionSearchParams, enabled = true) => {
  return useQuery({
    queryKey: feeTransactionKeys.list(params),
    queryFn: () => feeTransactionApi.searchTransactions(params),
    enabled,
  });
};

export const useTransactionById = (id: string) => {
  return useQuery({
    queryKey: feeTransactionKeys.detail(id),
    queryFn: () => feeTransactionApi.getTransactionById(id),
    enabled: !!id,
  });
};

export const useOutstandingFees = (studentId: string, academicYearId?: string) => {
  return useQuery({
    queryKey: feeTransactionKeys.outstanding(studentId, academicYearId),
    queryFn: () => feeTransactionApi.getOutstandingFees(studentId, academicYearId),
    enabled: !!studentId,
  });
};

export const useTransactionHistory = (
  studentId: string,
  academicYearId?: string,
  limit?: number
) => {
  return useQuery({
    queryKey: feeTransactionKeys.history(studentId, academicYearId),
    queryFn: () => feeTransactionApi.getTransactionHistory(studentId, academicYearId, limit),
    enabled: !!studentId,
  });
};

export const useMyTransactions = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: feeTransactionKeys.myTransactions(params),
    queryFn: () => feeTransactionApi.getMyFeeTransactions(params),
  });
};

export const useMyChildrenTransactions = (params?: any) => {
  return useQuery({
    queryKey: feeTransactionKeys.myChildren(params),
    queryFn: () => feeTransactionApi.getMyChildrenFeeTransactions(params),
  });
};

// ===== MUTATION HOOKS =====

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FeeTransactionCreateRequest) =>
      feeTransactionApi.createTransaction(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: feeTransactionKeys.all });
      toast.success(`Transaction ${data.transaction_number} created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });
};

export const useUpdateTransactionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FeeTransactionUpdateRequest }) =>
      feeTransactionApi.updateTransactionStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeTransactionKeys.all });
      toast.success('Transaction status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update transaction status');
    },
  });
};

// ===== RECEIPT HOOKS =====
// Import from separate file
export { useGenerateReceipt } from './receipts';
```

#### Step 2: Update FeeTransactions.tsx Component

**File:** `src/pages/fee/FeeTransactions.tsx`

**Find and Replace:**

```typescript
// ❌ REMOVE THESE IMPORTS (Lines 14-21)
import {
  searchTransactions,
  getTransactionById,
  updateTransactionStatus,
  getOutstandingFees,
  createTransaction,
  getTransactionHistory
} from '@/api/fee/transactions';

// ✅ ADD THESE IMPORTS
import {
  useTransactions,
  useTransactionById,
  useOutstandingFees,
  useTransactionHistory,
  useCreateTransaction,
  useUpdateTransactionStatus,
} from '@/api/hooks/fee/transactions';
```

**Replace Query Usage (Line 122-126):**

```typescript
// ❌ OLD
const { data: transactionsResponse, isLoading, error, refetch } = useQuery({
  queryKey: ['fee-transactions', searchParams],
  queryFn: () => searchTransactions(searchParams),
  enabled: true,
});

// ✅ NEW
const { data: transactionsResponse, isLoading, error } = useTransactions(searchParams);
```

**Replace Outstanding Fees Query (Line 131-135):**

```typescript
// ❌ OLD
const { data: outstandingFees } = useQuery({
  queryKey: ['outstanding-fees', searchParams.student_id, selectedAcademicYearId],
  queryFn: () => getOutstandingFees(searchParams.student_id!, selectedAcademicYearId),
  enabled: !!searchParams.student_id && !!selectedAcademicYearId,
});

// ✅ NEW
const { data: outstandingFees } = useOutstandingFees(
  searchParams.student_id || '',
  selectedAcademicYearId
);
```

**Replace Transaction History Query (Line 138-142):**

```typescript
// ❌ OLD
const { data: transactionHistory } = useQuery({
  queryKey: ['transaction-history', searchParams.student_id, selectedAcademicYearId],
  queryFn: () => getTransactionHistory(searchParams.student_id!, selectedAcademicYearId),
  enabled: !!searchParams.student_id && !!selectedAcademicYearId,
});

// ✅ NEW
const { data: transactionHistory } = useTransactionHistory(
  searchParams.student_id || '',
  selectedAcademicYearId
);
```

**Add Mutation Hooks (After line 183):**

```typescript
// Add these hooks at component level
const createMutation = useCreateTransaction();
const updateStatusMutation = useUpdateTransactionStatus();
```

**Replace handleCreateTransaction (Line 261-304):**

```typescript
// ❌ OLD - Entire function with try-catch and manual refetch

// ✅ NEW
const handleCreateTransaction = () => {
  // Validations (keep existing validation code)
  if (!selectedAcademicYearId) {
    toast.error('Please select an academic year');
    return;
  }

  if (createForm.transaction_items.length === 0) {
    toast.error('Please add at least one transaction item');
    return;
  }

  if (calculatedTotal <= 0) {
    toast.error('Total amount must be greater than 0');
    return;
  }

  // Payment method validations
  if (createForm.payment_method === 'upi' && !createForm.upi_reference?.trim()) {
    toast.error('UPI reference is required for UPI payments');
    return;
  }

  if (createForm.payment_method === 'cheque' && !createForm.cheque_number?.trim()) {
    toast.error('Cheque number is required for cheque payments');
    return;
  }

  if (createForm.payment_method === 'bank_transfer' && !createForm.bank_reference?.trim()) {
    toast.error('Bank reference is required for bank transfers');
    return;
  }

  // Validate transaction items
  for (let i = 0; i < createForm.transaction_items.length; i++) {
    const item = createForm.transaction_items[i];

    if (!item.fee_type_id || !item.fee_term_id) {
      toast.error(`Fee type and term are required for item ${i + 1}`);
      return;
    }

    if (item.amount_due < 0 || item.amount_paid < 0) {
      toast.error(`Amounts cannot be negative for item ${i + 1}`);
      return;
    }
  }

  const transactionData: FeeTransactionCreateRequest = {
    student_id: createForm.student_id,
    student_admission_num: createForm.student_admission_num,
    academic_year_id: selectedAcademicYearId,
    total_amount: calculatedTotal,
    payment_method: createForm.payment_method,
    remarks: createForm.remarks,
    transaction_items: createForm.transaction_items,
    ...(createForm.payment_method === 'upi' && {
      upi_reference: createForm.upi_reference
    }),
    ...(createForm.payment_method === 'cheque' && {
      cheque_number: createForm.cheque_number
    }),
    ...(createForm.payment_method === 'bank_transfer' && {
      bank_reference: createForm.bank_reference
    })
  };

  createMutation.mutate(transactionData, {
    onSuccess: () => {
      setShowCreateDialog(false);
      resetCreateForm();
    },
  });
};
```

**Replace handleStatusUpdate (Line 222-232):**

```typescript
// ❌ OLD - Entire function with try-catch and manual refetch

// ✅ NEW
const handleStatusUpdate = (transactionId: string, status: TransactionStatus) => {
  updateStatusMutation.mutate(
    { id: transactionId, data: { status } },
    {
      onSuccess: () => {
        setShowViewDialog(false);
      },
    }
  );
};
```

**Update Create Button (Line 678-683):**

```typescript
<Button
  onClick={handleCreateTransaction}
  disabled={
    !createForm.student_id ||
    calculatedTotal <= 0 ||
    createMutation.isPending
  }
>
  {createMutation.isPending && (
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  )}
  {createMutation.isPending ? 'Creating...' : 'Create Transaction'}
</Button>
```

---

### Fix #2: Add Comprehensive Error Handling to All API Files

**Priority:** 🔴 CRITICAL
**Time:** 2 hours
**Impact:** Prevents silent failures, provides user feedback

#### Step 1: Create Centralized Error Handler

**Create:** `src/api/utils/errorHandler.ts`

```typescript
import axios from 'axios';

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
  field?: string;
}

export const handleApiError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const message = error.response?.data?.message;

    // Handle specific status codes
    if (status === 401) {
      throw new Error('Session expired. Please login again.');
    }

    if (status === 403) {
      throw new Error('You do not have permission to perform this action.');
    }

    if (status === 404) {
      throw new Error(detail || 'Resource not found.');
    }

    if (status === 422) {
      // Validation errors
      const validationErrors = error.response?.data?.errors;
      if (validationErrors && Array.isArray(validationErrors)) {
        const errorMessages = validationErrors.map((e: any) => e.msg).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      throw new Error(detail || 'Invalid data provided.');
    }

    if (status === 500) {
      throw new Error('Server error. Please try again later.');
    }

    // Default error message
    throw new Error(detail || message || error.message || 'An unexpected error occurred');
  }

  // Non-axios errors
  if (error instanceof Error) {
    throw error;
  }

  // Unknown error type
  throw new Error('An unexpected error occurred');
};

// For non-throwing error handling (returns Error instead of throwing)
export const safeHandleApiError = (error: unknown): Error => {
  try {
    handleApiError(error);
  } catch (e) {
    return e as Error;
  }
  return new Error('Unknown error');
};
```

#### Step 2: Update All API Files to Use Error Handler

**File:** `src/api/fee/types.ts`

**Add import:**
```typescript
import { handleApiError } from '@/api/utils/errorHandler';
```

**Wrap ALL functions with try-catch:**

```typescript
// Example for getAllTypes
export const getAllTypes = async (params?: FeeTypeSearchParams): Promise<any> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.fee_category_id) {
      queryParams.append('fee_category_id', params.fee_category_id);
    }
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    const queryString = queryParams.toString();
    const url = `/fee/types/${queryString ? `?${queryString}` : ''}`;
    const response = await CAxios.get(url);
    return response.data.items || response.data;
  } catch (error) {
    handleApiError(error);
  }
};

// Apply same pattern to:
// - getType
// - updateType
// - deleteType
// - getDropdownOptions
```

**Repeat for these files:**
- `src/api/fee/terms.ts` - Add try-catch to 7 functions
- `src/api/fee/receipts.ts` - Add try-catch to 5 functions (update existing generateReceipt to use centralized handler)
- `src/api/fee/mappings.ts` - Add try-catch to 5 functions
- `src/api/fee/classMappings.ts` - Add try-catch to 4 functions

**Files that already have error handling - Update to use centralized handler:**
- `src/api/fee/categories.ts` - Replace inline error handling
- `src/api/fee/refunds.ts` - Replace existing handleApiError with import from utils

---

### Fix #3: Standardize API Path Constants

**Priority:** 🔴 CRITICAL
**Time:** 1 hour
**Impact:** Centralized endpoint management, easier maintenance

#### Step 1: Create API Constants File

**Create:** `src/api/fee/constants.ts`

```typescript
// Base path for all fee endpoints
const FEE_BASE = '/fee';

// Fee module endpoint constants
export const FEE_ENDPOINTS = {
  // Categories
  CATEGORIES: `${FEE_BASE}/categories/`,

  // Types
  TYPES: `${FEE_BASE}/types/`,

  // Terms
  TERMS: `${FEE_BASE}/terms/`,

  // Mappings
  MAPPINGS: `${FEE_BASE}/mappings/`,
  CLASS_MAPPINGS: `${FEE_BASE}/class-mappings/`,
  CLASS_MAPPINGS_BULK: `${FEE_BASE}/class-mappings/bulk`,
  STUDENT_MAPPINGS: `${FEE_BASE}/student-mappings/`,
  STUDENT_MAPPINGS_BULK: `${FEE_BASE}/student-mappings/bulk`,

  // Transactions
  TRANSACTIONS: `${FEE_BASE}/transactions/`,

  // Receipts
  RECEIPTS: `${FEE_BASE}/receipts/`,

  // Refunds
  REFUNDS: `${FEE_BASE}/refunds/`,
} as const;

// Helper to build URLs with query params
export const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
  if (!params) return endpoint;

  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${endpoint}?${queryString}` : endpoint;
};
```

#### Step 2: Update All API Files to Use Constants

**File:** `src/api/fee/types.ts`

```typescript
import { FEE_ENDPOINTS, buildUrl } from './constants';

// Replace all hardcoded paths
export const getAllTypes = async (params?: FeeTypeSearchParams): Promise<any> => {
  try {
    const url = buildUrl(FEE_ENDPOINTS.TYPES, params);
    const response = await CAxios.get(url);
    return response.data.items || response.data;
  } catch (error) {
    handleApiError(error);
  }
};

export const getType = async (id: string): Promise<FeeType> => {
  try {
    const response = await CAxios.get(`${FEE_ENDPOINTS.TYPES}${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
```

**Repeat for:**
- `src/api/fee/classMappings.ts`
- `src/api/fee/receipts.ts`
- `src/api/fee/mappings.ts`
- `src/api/fee/categories.ts` (update existing constant)
- `src/api/fee/terms.ts` (update existing constant)
- `src/api/fee/studentMappings.ts` (update existing constant)
- `src/api/fee/refunds.ts` (update existing constant)

---

### Fix #4: Fix Response Shape Inconsistencies

**Priority:** 🔴 CRITICAL
**Time:** 1 hour
**Impact:** Type safety, predictable data structures

#### Step 1: Standardize Student Mappings Response

**File:** `src/api/fee/studentMappings.ts`

```typescript
// Update getAllMappings to ALWAYS return paginated response
export const getAllMappings = async (
  params?: FeeStudentMappingSearchParams
): Promise<FeeStudentMappingListResponse> => {  // ✅ Remove union type
  try {
    const url = buildUrl(FEE_ENDPOINTS.STUDENT_MAPPINGS, params);
    const response = await CAxios.get<FeeStudentMappingListResponse>(url);

    // ✅ ALWAYS return paginated structure
    if (Array.isArray(response.data)) {
      // Wrap array in paginated response if backend returns array
      return {
        items: response.data,
        total: response.data.length,
        limit: params?.limit || 100,
        offset: params?.offset || 0,
      };
    }

    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
```

#### Step 2: Update Components to Remove Defensive Checks

**File:** `src/components/fee/mappings/StudentMappingTable.tsx` (Line 49)

```typescript
// ❌ OLD - Defensive programming
const mappingsData = Array.isArray(response) ? response : (response.items || []);

// ✅ NEW - Trust the type
const mappingsData = response.items;
```

**File:** `src/components/fee/mappings/ClassMappingTable.tsx` (Line 51-53)

```typescript
// ❌ OLD
const mappings: FeeClassMapping[] = Array.isArray(mappingsResponse)
  ? mappingsResponse
  : (mappingsResponse?.items || []);

// ✅ NEW
const mappings: FeeClassMapping[] = mappingsResponse.items;
```

#### Step 3: Standardize Categories and Terms Responses

**File:** `src/api/fee/categories.ts` (Line 31-32)

```typescript
// ❌ OLD
return response.data.items || response.data;

// ✅ NEW - Wrap if needed
export const getAllCategories = async (
  params?: FeeCategorySearchParams
): Promise<FeeCategoryListResponse> => {
  try {
    const url = buildUrl(FEE_ENDPOINTS.CATEGORIES, params);
    const response = await CAxios.get<FeeCategoryListResponse>(url);

    // Ensure paginated structure
    if (Array.isArray(response.data)) {
      return {
        items: response.data,
        total: response.data.length,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      };
    }

    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
```

**File:** `src/api/fee/terms.ts` (Line 29-30)

```typescript
// Apply same standardization as categories
```

---

## 🟠 PHASE 2: HIGH PRIORITY FIXES (Day 1 - 2 hours)

### Fix #5: Remove Duplicate API Functions

**Priority:** 🟠 HIGH
**Time:** 1 hour
**Impact:** Code clarity, reduced confusion

#### Consolidation Strategy:

**Keep:** Specialized API files (`classMappings.ts`, `studentMappings.ts`)
**Remove:** Duplicates from `mappings.ts`

**File:** `src/api/fee/mappings.ts`

**Remove these functions (already exist in dedicated files):**
- `getAllMappings` - Duplicate of `feeClassMappingsApi.getAllMappings()`
- `bulkCreateStudentMappings` - Duplicate of `feeStudentMappingsApi.bulkCreateMappings()`

**Keep only term amounts functions in mappings.ts:**
- `setTermAmounts`
- `updateTermAmount`
- `getTermAmounts`
- `createClassMappingTermAmounts`
- `updateClassMappingTermAmounts`
- `deleteClassMappingTermAmounts`

**Update:** `src/api/fee/index.ts`

```typescript
// ❌ REMOVE confusing aliases
export {
  feeMappingsApi,
  // ... remove duplicates
} from './mappings';

// ✅ KEEP clear exports
export { feeClassMappingsApi } from './classMappings';
export { feeStudentMappingsApi } from './studentMappings';
export { feeTermAmountsApi } from './mappings'; // Rename mappings to termAmounts
```

**Rename:** `src/api/fee/mappings.ts` → `src/api/fee/termAmounts.ts`

---

### Fix #6: Add Academic Year Validation

**Priority:** 🟠 HIGH
**Time:** 30 minutes
**Impact:** Prevents silent failures with undefined academic year

#### Update All API Functions That Use Academic Year

**Pattern to apply:**

```typescript
// Example from transactions.ts
static async searchTransactions(params?: FeeTransactionSearchParams): Promise<any> {
  try {
    // ✅ ADD VALIDATION
    if (params && !params.academic_year_id) {
      const academicYearId = useAcademicYearStore.getState().selectedAcademicYearId;

      if (!academicYearId) {
        throw new Error('Academic year is not selected. Please select an academic year.');
      }

      params.academic_year_id = academicYearId;
    }

    // Rest of function...
  } catch (error) {
    handleApiError(error);
  }
}
```

**Apply to:**
- `src/api/fee/transactions.ts`: searchTransactions, getOutstandingFees, getTransactionHistory
- `src/api/fee/categories.ts`: getAllCategories, createCategory
- `src/api/fee/terms.ts`: getAllTerms
- `src/api/fee/mappings.ts`: getAllMappings
- `src/api/fee/studentMappings.ts`: getAllMappings

---

### Fix #7: Fix Type Inconsistencies

**Priority:** 🟠 HIGH
**Time:** 30 minutes
**Impact:** Type safety, prevents runtime errors

#### Fix total_fee Type Mismatch

**File:** `src/types/fee/mapping.ts`

**Update FeeStudentMapping interface (Line 75):**

```typescript
export interface FeeStudentMapping {
  id: string;
  student_id: string;
  academic_year_id: string;
  fee_type_id: string;
  fee_term_id: string;
  amount_due: number;
  amount_paid: number;
  discount: number;
  total_fee: number;  // ✅ Changed from string to number
  due_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Update components that format total_fee:**

```typescript
// If displaying, format for display
<span>₹{mapping.total_fee.toLocaleString()}</span>

// If backend REALLY returns string, parse it:
<span>₹{parseFloat(mapping.total_fee).toLocaleString()}</span>
```

---

## 🟡 PHASE 3: MEDIUM PRIORITY FIXES (Day 2 - 4 hours)

### Fix #8: Standardize Query Key Patterns

**Priority:** 🟡 MEDIUM
**Time:** 2 hours
**Impact:** Consistency, predictable caching

#### Create Standard Query Key Factory Pattern

**File:** `src/api/hooks/fee/queryKeys.ts`

```typescript
// Centralized query key factory for all fee module hooks

export const createQueryKeyFactory = (resource: string) => ({
  all: [resource] as const,
  lists: () => [...createQueryKeyFactory(resource).all, 'list'] as const,
  list: (params?: any) => [...createQueryKeyFactory(resource).lists(), params] as const,
  details: () => [...createQueryKeyFactory(resource).all, 'detail'] as const,
  detail: (id: string) => [...createQueryKeyFactory(resource).details(), id] as const,
  dropdown: () => [...createQueryKeyFactory(resource).all, 'dropdown'] as const,
});

// Pre-created factories for each resource
export const feeQueryKeys = {
  categories: createQueryKeyFactory('fee-categories'),
  types: createQueryKeyFactory('fee-types'),
  terms: createQueryKeyFactory('fee-terms'),
  classMappings: createQueryKeyFactory('fee-class-mappings'),
  studentMappings: createQueryKeyFactory('fee-student-mappings'),
  transactions: createQueryKeyFactory('fee-transactions'),
  receipts: createQueryKeyFactory('fee-receipts'),
  refunds: createQueryKeyFactory('fee-refunds'),
};
```

#### Update All Hook Files to Use Factory

**File:** `src/api/hooks/fee/useFeeTypes.ts`

```typescript
import { feeQueryKeys } from './queryKeys';

// ❌ OLD
const feeTypeKeys = {
  all: ['fee-types'] as const,
  lists: () => [...feeTypeKeys.all, 'list'] as const,
  list: (params?: any) => [...feeTypeKeys.lists(), params] as const,
};

// ✅ NEW
const feeTypeKeys = feeQueryKeys.types;
```

**Repeat for all hook files.**

---

### Fix #9: Fix Invalid Cache Invalidation

**Priority:** 🟡 MEDIUM
**Time:** 30 minutes
**Impact:** Proper cache updates, no stale data

**File:** `src/api/hooks/fee/useFeeTypes.ts` (Lines 82-87)

**Current Issue:**
```typescript
queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });
queryClient.invalidateQueries({
  queryKey: ['fee-categories', 'detail', data.fee_category_id, 'types']  // ❌ Invalid key
});
```

**Fix:**
```typescript
// ✅ Invalidate all type lists
queryClient.invalidateQueries({ queryKey: feeTypeKeys.all });

// ✅ Invalidate category details if needed
import { feeQueryKeys } from './queryKeys';
queryClient.invalidateQueries({
  queryKey: feeQueryKeys.categories.detail(data.fee_category_id)
});
```

---

### Fix #10: Add Proper TypeScript Return Types

**Priority:** 🟡 MEDIUM
**Time:** 1 hour
**Impact:** Type safety, better IDE support

#### Define Missing Response Types

**File:** `src/types/fee/transaction.ts`

**Add these interfaces:**

```typescript
export interface FeeTransactionListResponse {
  data: FeeTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface MyFeeTransactionsResponse {
  transactions: FeeTransaction[];
  total_count: number;
  student_info: {
    id: string;
    name: string;
    admission_number: string;
  };
}

export interface ChildrenFeeTransactionsResponse {
  transactions: FeeTransaction[];
  children: Array<{
    student_id: string;
    student_name: string;
    admission_number: string;
    outstanding_amount: number;
  }>;
  total_outstanding: number;
}

export interface MyOutstandingFeesResponse {
  student_id: string;
  total_outstanding: number;
  outstanding_items: FeeOutstandingFees['outstanding_items'];
}

export interface ChildOutstandingFeesResponse extends FeeOutstandingFees {
  student_name: string;
  class_section: string;
}
```

#### Update API Functions to Use Types

**File:** `src/api/fee/transactions.ts`

```typescript
// ❌ OLD
static async searchTransactions(params?: FeeTransactionSearchParams): Promise<any>

// ✅ NEW
static async searchTransactions(
  params?: FeeTransactionSearchParams
): Promise<FeeTransactionListResponse>

// Apply to all functions with 'any' return type
```

---

## 🔵 PHASE 4: LOW PRIORITY (Day 3 - 2 hours)

### Fix #11: Remove Console Logging

**Priority:** 🔵 LOW (but should be done)
**Time:** 30 minutes
**Impact:** Security, cleaner code

**Pattern:** Remove all console.log statements OR wrap with environment check:

```typescript
// Option 1: Remove completely
// console.log('...');

// Option 2: Conditional logging
if (import.meta.env.DEV) {
  console.debug('[FeeAPI] Creating transaction');
}
```

**Files to clean:**
- `src/api/fee/transactions.ts` - 14 console.log statements
- `src/api/fee/receipts.ts` - 14 console.log statements
- `src/api/fee/refunds.ts` - Multiple console.log statements

---

### Fix #12: Create Proper Logger Utility

**Priority:** 🔵 LOW
**Time:** 1 hour
**Impact:** Better debugging, production safety

**Create:** `src/lib/logger.ts`

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.isDevelopment && level === 'debug') {
      return; // Don't log debug in production
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
    }
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', message, error);
  }

  // API-specific logging
  api(operation: string, endpoint: string, data?: any) {
    this.debug(`API ${operation}: ${endpoint}`, data);
  }
}

export const logger = new Logger();
```

**Usage:**

```typescript
import { logger } from '@/lib/logger';

// Instead of console.log
logger.api('POST', '/fee/transactions', { transactionId });
logger.error('Failed to create transaction', error);
```

---

### Fix #13: Add JSDoc Documentation

**Priority:** 🔵 LOW
**Time:** 30 minutes
**Impact:** Better developer experience

**Example:**

```typescript
/**
 * Creates a new fee transaction with multiple transaction items
 *
 * @param data - Transaction data including student, payment method, and line items
 * @returns Promise with created transaction including generated transaction number
 * @throws {Error} If student is not found or academic year is invalid
 *
 * @example
 * ```typescript
 * const transaction = await createTransaction({
 *   student_id: '123',
 *   payment_method: 'cash',
 *   total_amount: 5000,
 *   transaction_items: [...]
 * });
 * ```
 */
static async createTransaction(
  data: FeeTransactionCreateRequest
): Promise<FeeTransaction>
```

---

## 📝 TESTING CHECKLIST

After implementing all fixes, test these scenarios:

### ✅ Transaction Tests
- [ ] Create transaction with UPI payment (with reference)
- [ ] Create transaction with UPI payment (without reference) → Should fail
- [ ] Create transaction with cheque payment (with number)
- [ ] Create transaction with cheque payment (without number) → Should fail
- [ ] Create transaction without academic year selected → Should fail
- [ ] Create transaction with negative amounts → Should fail
- [ ] Update transaction status: pending → completed
- [ ] Update transaction status: completed → cancelled → Should fail
- [ ] Generate receipt for completed transaction
- [ ] View outstanding fees for student
- [ ] View transaction history for student

### ✅ Error Handling Tests
- [ ] API returns 401 → Should show "Session expired"
- [ ] API returns 403 → Should show "No permission"
- [ ] API returns 404 → Should show "Not found"
- [ ] API returns 422 → Should show validation errors
- [ ] API returns 500 → Should show "Server error"
- [ ] Network failure → Should show appropriate message

### ✅ Cache Invalidation Tests
- [ ] Create transaction → List refreshes automatically
- [ ] Update status → Details refresh automatically
- [ ] Generate receipt → Receipt list refreshes
- [ ] No manual refetch needed

### ✅ Type Safety Tests
- [ ] No TypeScript errors in IDE
- [ ] No 'any' types in API functions
- [ ] Autocomplete works for API responses
- [ ] total_fee is treated as number, not string

---

## 📊 IMPLEMENTATION TIMELINE

| Phase | Duration | Tasks | Priority |
|-------|----------|-------|----------|
| Phase 1 | 6 hours | Create hooks, error handling, constants, response standardization | 🔴 CRITICAL |
| Phase 2 | 2 hours | Remove duplicates, add validation, fix types | 🟠 HIGH |
| Phase 3 | 4 hours | Standardize query keys, fix cache invalidation, add return types | 🟡 MEDIUM |
| Phase 4 | 2 hours | Remove logs, create logger, add docs | 🔵 LOW |
| **Total** | **14 hours** (~2 days) | **82+ bug fixes** | **ALL** |

---

## 🎯 SUCCESS METRICS

After implementation, you should have:
- ✅ Zero TypeScript 'any' types in API layer
- ✅ 100% error handling coverage
- ✅ Zero hardcoded API paths
- ✅ Zero duplicate API functions
- ✅ Consistent response shapes
- ✅ Proper React Query hooks for all endpoints
- ✅ Standardized query key patterns
- ✅ No console.log statements in production
- ✅ Academic year validation everywhere needed
- ✅ Type-safe API responses

---

## 🚀 NEXT STEPS

1. **Create feature branch:** `git checkout -b fix/fee-module-api-integration`
2. **Implement Phase 1** (Critical fixes)
3. **Test thoroughly**
4. **Implement Phase 2** (High priority)
5. **Test again**
6. **Implement Phases 3-4** (Medium/Low priority)
7. **Final testing**
8. **Create pull request**
9. **Code review**
10. **Deploy to staging**
11. **QA testing**
12. **Deploy to production**

---

**Document Owner:** Development Team Lead
**Last Updated:** 2026-02-05
**Status:** READY FOR IMPLEMENTATION
