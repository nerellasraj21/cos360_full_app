import { useQuery } from '@tanstack/react-query';
import { feeTransactionsApi, FeeTransactionResponse } from '../../index';

/**
 * Student's own payment history — fee_transactions:read_own/list_own.
 * Pass `enabled: false` (e.g. for a parent) so this never fires for a role
 * that doesn't hold read_own/list_own — a permission-denied response here
 * has been observed to come back as 401, which collides with the
 * token-refresh flow and can spuriously log the user out.
 */
export function useMyFeeTransactions(params?: { skip?: number; limit?: number }, enabled = true) {
  return useQuery<FeeTransactionResponse[]>({
    queryKey: ['feeTransactions', 'my', params],
    queryFn: () => feeTransactionsApi.getMyFeeTransactions(params),
    enabled,
  });
}

/**
 * Parent's "related" scope — resolves server-side to every linked child's
 * transactions in one list. fee_transactions:read_related/list_related.
 * Pass `enabled: false` for a non-parent role — see note above.
 */
export function useMyChildrenFeeTransactions(
  params?: {
    skip?: number;
    limit?: number;
    academic_year_id?: string;
    transaction_status?: string;
  },
  enabled = true,
) {
  return useQuery<FeeTransactionResponse[]>({
    queryKey: ['feeTransactions', 'my-children', params],
    queryFn: () => feeTransactionsApi.getMyChildrenFeeTransactions(params),
    enabled,
  });
}
