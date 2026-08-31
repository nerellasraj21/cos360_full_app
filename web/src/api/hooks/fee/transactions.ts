import { useQuery } from '@tanstack/react-query';
import { getMyFeeTransactions, getMyChildrenFeeTransactions, getMyOutstandingFees } from '@/api/fee/transactions';
import type { FeeTransaction, FeeOutstandingFees } from '@/types/fee/transaction';

export const feeTransactionKeys = {
  all: ['fee-transactions'] as const,
  mine: () => [...feeTransactionKeys.all, 'my-transactions'] as const,
  myChildren: () => [...feeTransactionKeys.all, 'my-children-transactions'] as const,
  myOutstanding: () => [...feeTransactionKeys.all, 'my-outstanding'] as const,
};

const unwrapTransactions = (res: unknown): FeeTransaction[] => {
  if (Array.isArray(res)) return res as FeeTransaction[];
  const wrapped = res as { data?: FeeTransaction[]; items?: FeeTransaction[] } | undefined;
  return wrapped?.data ?? wrapped?.items ?? [];
};

// Student's own outstanding-fee breakdown. Uses fee_transactions:read_own
// (already granted to the Student role) rather than /fee/collection/my-summary,
// which requires fee_collection:read — a permission the Student role does not
// have and that was deliberately not added; use what's already granted instead.
export function useMyOutstandingFees() {
  return useQuery<FeeOutstandingFees>({
    queryKey: feeTransactionKeys.myOutstanding(),
    queryFn: () => getMyOutstandingFees(),
  });
}

// Student's own payment history. Backend endpoint (/fee/transactions/my-fees)
// scopes to the caller's JWT identity under the fee_transactions:
// read_own/list_own grant — no student_id is passed.
// `enabled` defaults to true; pass false (e.g. for a parent) so this never
// fires for a role that doesn't hold read_own/list_own — a permission-denied
// response here has been observed to come back as 401, which collides with
// the token-refresh interceptor and can spuriously log the user out.
export function useMyFeeTransactions(enabled = true) {
  return useQuery({
    queryKey: feeTransactionKeys.mine(),
    queryFn: () => getMyFeeTransactions(),
    select: unwrapTransactions,
    enabled,
  });
}

// Parent's "related" scope — /fee/transactions/my-children-fees resolves
// server-side to every linked child's transactions in one list (same pattern
// as /fee/receipts/my-receipts), under fee_transactions:read_related/list_related.
// `enabled` defaults to true; pass false for a non-parent role — see note above.
export function useMyChildrenFeeTransactions(enabled = true) {
  return useQuery({
    queryKey: feeTransactionKeys.myChildren(),
    queryFn: () => getMyChildrenFeeTransactions(),
    select: unwrapTransactions,
    enabled,
  });
}
