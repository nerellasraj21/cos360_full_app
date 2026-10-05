import { useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  feeRefundsApi,
  FeeRefundApproveRequest,
  FeeRefundApproveResponse,
  FeeRefundProcessRequest,
  FeeRefundProcessResponse,
  FeeRefundTransactionSummaryResponse,
} from '../../index';
import type { FeeRefundCreateRequest, FeeRefundWithDetails as FeeRefundResponse } from '../../../types/fee';

export function useFeeRefunds(academicYearId?: string) {
  return usePermissionProtectedQuery<FeeRefundResponse[]>({
    queryKey: ['feeRefunds', academicYearId],
    queryFn: () => feeRefundsApi.getFeeRefunds(academicYearId),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'list',
  });
}

export function usePendingApprovalRefunds() {
  return usePermissionProtectedQuery<FeeRefundResponse[]>({
    queryKey: ['feeRefunds', 'pending-approval'],
    queryFn: () => feeRefundsApi.getPendingApprovalRefunds(),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'list',
  });
}

export function useApprovedProcessingRefunds() {
  return usePermissionProtectedQuery<FeeRefundResponse[]>({
    queryKey: ['feeRefunds', 'approved-processing'],
    queryFn: () => feeRefundsApi.getApprovedProcessingRefunds(),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'list',
  });
}

export function useFeeRefund(id: string) {
  return usePermissionProtectedQuery<FeeRefundResponse>({
    queryKey: ['feeRefunds', id],
    queryFn: () => feeRefundsApi.getFeeRefund(id),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'read',
    enabled: !!id,
  });
}

export function useFeeRefundTransactionSummary(transactionId: string) {
  return usePermissionProtectedQuery<FeeRefundTransactionSummaryResponse>({
    queryKey: ['feeRefunds', 'transaction', transactionId],
    queryFn: () => feeRefundsApi.getFeeRefundTransactionSummary(transactionId),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'read',
    enabled: !!transactionId,
  });
}

export function useCreateFeeRefund() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<FeeRefundResponse, Error, FeeRefundCreateRequest>({
    mutationFn: (data) => feeRefundsApi.createFeeRefund(data),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      showSuccess('Refund request created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create refund request');
    },
  });
}

export function useApproveFeeRefund() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<FeeRefundApproveResponse, Error, FeeRefundApproveRequest>({
    mutationFn: (data) => feeRefundsApi.approveFeeRefund(data),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'approve',
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      const action = variables.action === 'approve' ? 'approved' : 'rejected';
      showSuccess(`Refund ${action} successfully`);
    },
    onError: (error) => {
      showError(error.message || 'Failed to process refund approval');
    },
  });
}

export function useProcessFeeRefund() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return usePermissionProtectedMutation<FeeRefundProcessResponse, Error, FeeRefundProcessRequest>({
    mutationFn: (data) => feeRefundsApi.processFeeRefund(data),
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'process',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeRefunds'] });
      showSuccess('Refund processed successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to process refund');
    },
  });
}
