import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  feeReceiptsApi,
  FeeReceiptResponse,
  FeeReceiptRequest,
} from '../../index';

export function useFeeReceipts() {
  return usePermissionProtectedQuery<FeeReceiptResponse[]>({
    queryKey: ['feeReceipts'],
    queryFn: () => feeReceiptsApi.getFeeReceipts(),
    resource: PERMISSION_RESOURCES.FEE_RECEIPTS,
    action: 'list',
  });
}

export function useMyFeeReceipts(params?: { limit?: number; offset?: number }, enabled = true) {
  return useQuery<FeeReceiptResponse[]>({
    queryKey: ['feeReceipts', 'my', params],
    queryFn: () => feeReceiptsApi.getMyReceipts(params),
    enabled,
  });
}

/**
 * Parent's "related" scope — resolves server-side to every linked child's
 * receipts in one list (fee_receipts:list_related). A parent has no
 * fee_receipts:list_own grant, so useMyFeeReceipts() above 403s for that
 * role. Same pattern as useMyChildrenFeeTransactions. Pass `enabled: false`
 * for a non-parent role.
 */
export function useMyChildrenFeeReceipts(params?: { limit?: number; offset?: number }, enabled = true) {
  return useQuery<FeeReceiptResponse[]>({
    queryKey: ['feeReceipts', 'my-children', params],
    queryFn: () => feeReceiptsApi.getMyChildrenReceipts(params),
    enabled,
  });
}

export function useFeeReceipt(id: string) {
  return usePermissionProtectedQuery<FeeReceiptResponse>({
    queryKey: ['feeReceipts', id],
    queryFn: () => feeReceiptsApi.getFeeReceipt(id),
    resource: PERMISSION_RESOURCES.FEE_RECEIPTS,
    action: 'read',
    enabled: !!id,
  });
}

export function useFeeReceiptByNumber(receiptNumber: string) {
  return useQuery<FeeReceiptResponse>({
    queryKey: ['feeReceipts', 'byNumber', receiptNumber],
    queryFn: () => feeReceiptsApi.getFeeReceiptByNumber(receiptNumber),
    enabled: !!receiptNumber,
  });
}

export function useGenerateFeeReceipt() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<FeeReceiptResponse, Error, string>({
    mutationFn: (transactionId) => feeReceiptsApi.generateFeeReceipt(transactionId),
    resource: PERMISSION_RESOURCES.FEE_RECEIPTS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
      showSuccess('Receipt generated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to generate receipt');
    },
  });
}

export function useCreateFeeReceipt() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<FeeReceiptResponse, Error, FeeReceiptRequest>({
    mutationFn: (data) => feeReceiptsApi.createFeeReceipt(data),
    resource: PERMISSION_RESOURCES.FEE_RECEIPTS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
      showSuccess('Receipt created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create receipt');
    },
  });
}

export function useReprintFeeReceipt() {
  const { showSuccess, showError } = useToastContext();
  return useMutation<FeeReceiptResponse, Error, string>({
    mutationFn: (receiptId) => feeReceiptsApi.reprintFeeReceipt(receiptId),
    onSuccess: () => {
      showSuccess('Receipt reprinted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to reprint receipt');
    },
  });
}

export function useVerifyFeeReceipt() {
  return useMutation({
    mutationFn: (receiptId: string) => feeReceiptsApi.verifyFeeReceipt(receiptId),
  });
}

export function useDeleteFeeReceipt() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => feeReceiptsApi.deleteFeeReceipt(id),
    resource: PERMISSION_RESOURCES.FEE_RECEIPTS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
      showSuccess('Receipt deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete receipt');
    },
  });
}
