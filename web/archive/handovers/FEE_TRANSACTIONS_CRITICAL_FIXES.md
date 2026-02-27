# Fee Transactions - Critical Fixes Required ⚠️

**URGENT:** These issues must be fixed before production deployment.

---

## 🔴 CRITICAL ISSUE #1: Security - Console Logging Sensitive Data

**File:** `src/api/fee/transactions.ts`
**Lines:** 18, 24, 27, 37, 46, 55, 72, 78, 86, 94, 101, 114, 129, 136

**Problem:**
```typescript
console.log('FeeTransactionApi: Creating transaction', data);
console.log('FeeTransactionApi: Transaction created', response.data);
```

**Risk:**
- Student personal information visible in browser console
- Payment details (UPI refs, cheque numbers, bank references) exposed
- Transaction amounts visible to anyone with console access
- Violates data privacy regulations

**Fix:**
```typescript
// Option 1: Remove all console.log
// Just delete them

// Option 2: Conditional logging
if (import.meta.env.DEV) {
  console.log('[DEBUG] Creating transaction');
}

// Option 3: Use proper logger
import { logger } from '@/lib/logger';
logger.debug('Creating transaction', { transactionId: data.id }); // Don't log full data
```

**Files to Update:**
- `src/api/fee/transactions.ts` - Remove ALL 14 console.log statements
- `src/api/fee/receipts.ts` - Remove ALL 14 console.log statements

**Estimated Time:** 15 minutes

---

## 🔴 CRITICAL ISSUE #2: Missing Payment Field Validation

**File:** `src/pages/fee/FeeTransactions.tsx`
**Function:** `handleCreateTransaction` (line 261)

**Problem:**
User can submit UPI payment without UPI reference, cheque payment without cheque number, etc.

**Fix:**
```typescript
const handleCreateTransaction = async () => {
  // Existing validations...
  if (createForm.transaction_items.length === 0) {
    toast.error('Please add at least one transaction item');
    return;
  }

  if (calculatedTotal <= 0) {
    toast.error('Total amount must be greater than 0');
    return;
  }

  // ✅ ADD THESE VALIDATIONS:

  // Validate payment method specific fields
  if (createForm.payment_method === 'upi' && !createForm.upi_reference?.trim()) {
    toast.error('UPI reference is required for UPI payments');
    return;
  }

  if (createForm.payment_method === 'cheque') {
    if (!createForm.cheque_number?.trim()) {
      toast.error('Cheque number is required for cheque payments');
      return;
    }
  }

  if (createForm.payment_method === 'bank_transfer' && !createForm.bank_reference?.trim()) {
    toast.error('Bank reference is required for bank transfer payments');
    return;
  }

  // Validate transaction items
  for (let i = 0; i < createForm.transaction_items.length; i++) {
    const item = createForm.transaction_items[i];

    if (!item.fee_type_id) {
      toast.error(`Fee type is required for item ${i + 1}`);
      return;
    }

    if (!item.fee_term_id) {
      toast.error(`Fee term is required for item ${i + 1}`);
      return;
    }

    if (item.amount_due < 0) {
      toast.error(`Amount due cannot be negative for item ${i + 1}`);
      return;
    }

    if (item.amount_paid < 0) {
      toast.error(`Amount paid cannot be negative for item ${i + 1}`);
      return;
    }

    if (item.amount_paid > item.amount_due) {
      toast.error(`Amount paid cannot exceed amount due for item ${i + 1}`);
      return;
    }
  }

  // Rest of the function...
```

**Estimated Time:** 30 minutes

---

## 🔴 CRITICAL ISSUE #3: Academic Year Null Check Missing

**File:** `src/pages/fee/FeeTransactions.tsx`
**Line:** 278

**Problem:**
```typescript
academic_year_id: selectedAcademicYearId, // Could be undefined!
```

**Fix:**
```typescript
const handleCreateTransaction = async () => {
  try {
    // Add at the beginning
    if (!selectedAcademicYearId) {
      toast.error('Academic year is not selected. Please select an academic year from the dropdown.');
      return;
    }

    // Validate that transaction items are provided
    if (createForm.transaction_items.length === 0) {
      // ...rest of function
```

**Estimated Time:** 5 minutes

---

## 🔴 CRITICAL ISSUE #4: Architecture Violation - Direct API Calls

**Problem:** Component directly imports API functions instead of using React Query hooks.

**Current (Wrong):**
```typescript
// src/pages/fee/FeeTransactions.tsx
import { searchTransactions, getTransactionById, ... } from '@/api/fee/transactions';

const { data, isLoading } = useQuery({
  queryKey: ['fee-transactions', searchParams],
  queryFn: () => searchTransactions(searchParams),
});
```

**Fix:**

### Step 1: Create React Query Hooks File

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

// Query key factory
export const feeTransactionKeys = {
  all: ['fee-transactions'] as const,
  lists: () => [...feeTransactionKeys.all, 'list'] as const,
  list: (params: FeeTransactionSearchParams) =>
    [...feeTransactionKeys.lists(), params] as const,
  details: () => [...feeTransactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...feeTransactionKeys.details(), id] as const,
  outstanding: (studentId: string, academicYearId: string) =>
    [...feeTransactionKeys.all, 'outstanding', studentId, academicYearId] as const,
  history: (studentId: string, academicYearId: string) =>
    [...feeTransactionKeys.all, 'history', studentId, academicYearId] as const,
};

// Hooks
export const useTransactions = (params: FeeTransactionSearchParams) => {
  return useQuery({
    queryKey: feeTransactionKeys.list(params),
    queryFn: () => feeTransactionApi.searchTransactions(params),
  });
};

export const useTransactionById = (id: string) => {
  return useQuery({
    queryKey: feeTransactionKeys.detail(id),
    queryFn: () => feeTransactionApi.getTransactionById(id),
    enabled: !!id,
  });
};

export const useOutstandingFees = (studentId: string, academicYearId: string) => {
  return useQuery({
    queryKey: feeTransactionKeys.outstanding(studentId, academicYearId),
    queryFn: () => feeTransactionApi.getOutstandingFees(studentId, academicYearId),
    enabled: !!studentId && !!academicYearId,
  });
};

export const useTransactionHistory = (studentId: string, academicYearId: string, limit?: number) => {
  return useQuery({
    queryKey: feeTransactionKeys.history(studentId, academicYearId),
    queryFn: () => feeTransactionApi.getTransactionHistory(studentId, academicYearId, limit),
    enabled: !!studentId && !!academicYearId,
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FeeTransactionCreateRequest) =>
      feeTransactionApi.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeTransactionKeys.all });
      toast.success('Transaction created successfully');
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
```

### Step 2: Update Component to Use Hooks

**File:** `src/pages/fee/FeeTransactions.tsx`

**Replace:**
```typescript
// ❌ Remove these imports
import {
  searchTransactions,
  getTransactionById,
  updateTransactionStatus,
  getOutstandingFees,
  createTransaction,
  getTransactionHistory
} from '@/api/fee/transactions';

// ✅ Add these imports
import {
  useTransactions,
  useTransactionById,
  useOutstandingFees,
  useTransactionHistory,
  useCreateTransaction,
  useUpdateTransactionStatus,
} from '@/api/hooks/fee/transactions';
```

**Replace usage:**
```typescript
// ❌ Old way
const { data: transactionsResponse, isLoading, error, refetch } = useQuery({
  queryKey: ['fee-transactions', searchParams],
  queryFn: () => searchTransactions(searchParams),
  enabled: true,
});

// ✅ New way
const { data: transactionsResponse, isLoading, error } = useTransactions(searchParams);
```

```typescript
// ❌ Old way
const { data: outstandingFees } = useQuery({
  queryKey: ['outstanding-fees', searchParams.student_id, selectedAcademicYearId],
  queryFn: () => getOutstandingFees(searchParams.student_id!, selectedAcademicYearId),
  enabled: !!searchParams.student_id && !!selectedAcademicYearId,
});

// ✅ New way
const { data: outstandingFees } = useOutstandingFees(
  searchParams.student_id || '',
  selectedAcademicYearId || ''
);
```

```typescript
// ❌ Old way
const handleCreateTransaction = async () => {
  try {
    await createTransaction(transactionData);
    toast.success('Transaction created successfully');
    setShowCreateDialog(false);
    resetCreateForm();
    refetch();
  } catch (error) {
    console.error('Failed to create transaction:', error);
    toast.error('Failed to create transaction');
  }
};

// ✅ New way
const createMutation = useCreateTransaction();

const handleCreateTransaction = () => {
  // Validations...

  createMutation.mutate(transactionData, {
    onSuccess: () => {
      setShowCreateDialog(false);
      resetCreateForm();
    },
  });
};
```

```typescript
// ❌ Old way
const handleStatusUpdate = async (transactionId: string, status: TransactionStatus) => {
  try {
    await updateTransactionStatus(transactionId, { status });
    toast.success('Transaction status updated successfully');
    refetch();
    setShowViewDialog(false);
  } catch (error) {
    console.error('Failed to update transaction status:', error);
    toast.error('Failed to update transaction status');
  }
};

// ✅ New way
const updateStatusMutation = useUpdateTransactionStatus();

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

**Estimated Time:** 2-3 hours

---

## 🔴 CRITICAL ISSUE #5: Invalid Status Transitions

**File:** `src/pages/fee/FeeTransactions.tsx`
**Lines:** 1095-1128

**Problem:**
Currently allows marking completed/cancelled transactions as completed again.

**Fix:**

Add status validation function:
```typescript
const canTransitionTo = (currentStatus: TransactionStatus, newStatus: TransactionStatus): boolean => {
  const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
    pending: ['completed', 'cancelled', 'bounced'],
    completed: ['bounced'], // Only if payment method is cheque
    cancelled: [], // Terminal state
    bounced: [], // Terminal state
  };

  return validTransitions[currentStatus].includes(newStatus);
};

const handleStatusUpdate = (transactionId: string, newStatus: TransactionStatus) => {
  if (!selectedTransaction) return;

  // Check if transition is valid
  if (!canTransitionTo(selectedTransaction.status, newStatus)) {
    toast.error(
      `Cannot change status from ${selectedTransaction.status} to ${newStatus}`
    );
    return;
  }

  // Special case: Only cheque payments can be marked as bounced from completed
  if (selectedTransaction.status === 'completed' &&
      newStatus === 'bounced' &&
      selectedTransaction.payment_method !== 'cheque') {
    toast.error('Only cheque payments can be marked as bounced');
    return;
  }

  updateStatusMutation.mutate(
    { id: transactionId, data: { status: newStatus } },
    {
      onSuccess: () => {
        setShowViewDialog(false);
      },
    }
  );
};
```

Update UI to only show valid actions:
```typescript
{/* Status Update Actions */}
{selectedTransaction.status === 'pending' && (
  <>
    <Button
      variant="default"
      onClick={() => handleStatusUpdate(selectedTransaction.id, 'completed')}
    >
      Mark Completed
    </Button>
    <Button
      variant="outline"
      onClick={() => handleStatusUpdate(selectedTransaction.id, 'cancelled')}
    >
      Cancel Transaction
    </Button>
  </>
)}

{selectedTransaction.status === 'completed' &&
 selectedTransaction.payment_method === 'cheque' && (
  <Button
    variant="destructive"
    onClick={() => handleStatusUpdate(selectedTransaction.id, 'bounced')}
  >
    Mark as Bounced
  </Button>
)}

{/* Don't show any status update buttons for cancelled or bounced */}
```

**Estimated Time:** 45 minutes

---

## 🔴 CRITICAL ISSUE #6: No Confirmation for Destructive Actions

**File:** `src/pages/fee/FeeTransactions.tsx`

**Problem:**
Clicking "Cancel Transaction" immediately cancels without confirmation.

**Fix:**

Add confirmation dialog state:
```typescript
const [confirmDialog, setConfirmDialog] = useState<{
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
} | null>(null);
```

Update status update handler:
```typescript
const handleStatusUpdate = (transactionId: string, newStatus: TransactionStatus) => {
  // For destructive actions, show confirmation
  if (newStatus === 'cancelled' || newStatus === 'bounced') {
    setConfirmDialog({
      open: true,
      title: `${newStatus === 'cancelled' ? 'Cancel' : 'Mark as Bounced'} Transaction`,
      message: `Are you sure you want to ${newStatus === 'cancelled' ? 'cancel' : 'mark as bounced'} this transaction? This action cannot be undone.`,
      onConfirm: () => {
        updateStatusMutation.mutate(
          { id: transactionId, data: { status: newStatus } },
          {
            onSuccess: () => {
              setShowViewDialog(false);
              setConfirmDialog(null);
            },
          }
        );
      },
    });
    return;
  }

  // For non-destructive actions, proceed directly
  updateStatusMutation.mutate(
    { id: transactionId, data: { status: newStatus } },
    {
      onSuccess: () => {
        setShowViewDialog(false);
      },
    }
  );
};
```

Add confirmation dialog component:
```typescript
{/* Confirmation Dialog */}
{confirmDialog && (
  <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogDescription>{confirmDialog.message}</DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" onClick={() => setConfirmDialog(null)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={confirmDialog.onConfirm}>
          Confirm
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
```

**Estimated Time:** 30 minutes

---

## 🔴 CRITICAL ISSUE #7: Type Safety - Remove 'any' Types

**File:** `src/api/fee/transactions.ts`
**Lines:** 54, 100, 113, 128, 135

**Problem:**
```typescript
static async searchTransactions(params?: FeeTransactionSearchParams): Promise<any>
```

**Fix:**

Update return types:
```typescript
// Add to types file: src/types/fee/transaction.ts
export interface FeeTransactionListResponse {
  data: FeeTransaction[];
  total: number;
  limit: number;
  offset: number;
}

export interface MyFeeTransactionsResponse {
  transactions: FeeTransaction[];
  total_count: number;
}

export interface ChildrenFeeTransactionsResponse {
  transactions: FeeTransaction[];
  children: Array<{
    student_id: string;
    student_name: string;
    outstanding_amount: number;
  }>;
}

export interface MyOutstandingFeesResponse {
  total_outstanding: number;
  outstanding_items: FeeOutstandingFees['outstanding_items'];
}
```

Update API file:
```typescript
// src/api/fee/transactions.ts
static async searchTransactions(
  params?: FeeTransactionSearchParams
): Promise<FeeTransactionListResponse> {
  // ...
}

static async getMyFeeTransactions(params?: {
  skip?: number;
  limit?: number;
}): Promise<MyFeeTransactionsResponse> {
  // ...
}

static async getMyChildrenFeeTransactions(params?: {
  skip?: number;
  limit?: number;
  academic_year_id?: string;
  transaction_status?: string;
}): Promise<ChildrenFeeTransactionsResponse> {
  // ...
}

static async getMyOutstandingFees(): Promise<MyOutstandingFeesResponse> {
  // ...
}

static async getChildOutstandingFees(
  studentId: string
): Promise<FeeOutstandingFees> {
  // ...
}
```

**Estimated Time:** 1 hour

---

## 🔴 CRITICAL ISSUE #8: total_amount Type Inconsistency

**File:** `src/types/fee/transaction.ts`
**Line:** 54

**Problem:**
```typescript
total_amount: number | string;  // Inconsistent type
```

**Fix:**
```typescript
export interface FeeTransactionCreateRequest {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_amount: number;  // ✅ Should always be number
  payment_method: PaymentMethod;
  // ... rest
}
```

Make sure component sends number:
```typescript
// src/pages/fee/FeeTransactions.tsx
const transactionData: FeeTransactionCreateRequest = {
  // ...
  total_amount: Number(calculatedTotal), // Ensure it's a number
  // ...
};
```

**Estimated Time:** 10 minutes

---

## TOTAL ESTIMATED TIME FOR CRITICAL FIXES

- Issue #1 (Console logging): 15 minutes
- Issue #2 (Payment validation): 30 minutes
- Issue #3 (Academic year check): 5 minutes
- Issue #4 (React Query hooks): 2-3 hours
- Issue #5 (Status transitions): 45 minutes
- Issue #6 (Confirmations): 30 minutes
- Issue #7 (Type safety): 1 hour
- Issue #8 (Type consistency): 10 minutes

**Total: 5-6 hours**

---

## TESTING CHECKLIST AFTER FIXES

- [ ] All console.log statements removed
- [ ] UPI payment requires UPI reference
- [ ] Cheque payment requires cheque number
- [ ] Bank transfer requires bank reference
- [ ] Negative amounts rejected
- [ ] Academic year null check works
- [ ] Cannot mark completed transaction as cancelled
- [ ] Cannot mark cancelled transaction as completed
- [ ] Confirmation dialog shows for cancellation
- [ ] Confirmation dialog shows for marking as bounced
- [ ] All TypeScript types are correct (no 'any')
- [ ] Cache invalidation works after mutations
- [ ] Loading states show during mutations
- [ ] Error messages are specific and helpful

---

**Priority:** 🔴 URGENT
**Deadline:** Before production deployment
**Assignee:** Development Team Lead
