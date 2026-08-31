import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeReceiptsApi } from '@/api/fee/receipts';
import type { FeeReceipt } from '@/types/fee/receipt';

export const feeReceiptKeys = {
  all: ['fee-receipts'] as const,
  mine: () => [...feeReceiptKeys.all, 'my-receipts'] as const,
  myChildren: () => [...feeReceiptKeys.all, 'my-children-receipts'] as const,
};

// Student's own receipts, via the dedicated /fee/receipts/my-receipts
// endpoint (fee_receipts:list_own — already granted). The generic
// searchReceipts()/`/fee/receipts/` endpoint needs the bare :list permission,
// which the Student role doesn't have, so it must not be used here.
// `enabled` defaults to true; pass false for a non-student role — Parent
// gets a 403 (fee_receipts:list_own is Student-only) so its query must stay
// disabled — see useMyChildrenReceipts below.
export function useMyReceipts(enabled = true) {
  return useQuery<FeeReceipt[]>({
    queryKey: feeReceiptKeys.mine(),
    queryFn: () => feeReceiptsApi.getMyReceipts(),
    enabled,
  });
}

// Parent's "related" scope — /fee/receipts/my-children-receipts resolves
// server-side to every linked child's receipts in one list (same pattern as
// /fee/transactions/my-children-fees), under fee_receipts:list_related.
// `enabled` defaults to true; pass false for a non-parent role.
export function useMyChildrenReceipts(enabled = true) {
  return useQuery<FeeReceipt[]>({
    queryKey: feeReceiptKeys.myChildren(),
    queryFn: () => feeReceiptsApi.getMyChildrenReceipts(),
    enabled,
  });
}

export function useGenerateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => feeReceiptsApi.generateReceipt(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeReceiptKeys.all });
      queryClient.invalidateQueries({ queryKey: ['fee-transactions'] });
      toast.success('Receipt generated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate receipt');
    },
  });
}
