import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  feeCollectionApi,
  feeConcessionsApi,
  feeTransactionsApi,
  FeeCollectionSummary,
  FeePaymentRequest,
  FeePaymentResponse,
  FeeConcession,
  FeeConcessionCreate,
  OutstandingFeeSummary,
} from '../../index';

export function useFeeCollectionSummary(studentId: string, params?: { academic_year_id?: string }) {
  return useQuery<FeeCollectionSummary>({
    queryKey: ['feeCollection', 'summary', studentId, params],
    queryFn: () => feeCollectionApi.getSummary(studentId, params),
    enabled: !!studentId,
  });
}

export function useMyFeeCollectionSummary(params?: { academic_year_id?: string }) {
  const { role } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  return useQuery<FeeCollectionSummary>({
    queryKey: ['feeCollection', 'my-summary', roleName, params],
    queryFn: () => feeCollectionApi.getMySummary(params),
    enabled: ['student'].includes(roleName),
  });
}

// Web parity: /fee/collection/my-summary needs fee_collection:read, which the
// Student role doesn't have and isn't getting — use the already-granted
// fee_transactions:read_own self-service endpoint instead.
export function useMyOutstandingFees() {
  const { role } = useAuth();
  const roleName = role?.name?.toLowerCase() ?? '';
  return useQuery<OutstandingFeeSummary>({
    queryKey: ['feeTransactions', 'my-outstanding-fees', roleName],
    queryFn: () => feeTransactionsApi.getMyOutstandingFees(),
    enabled: roleName === 'student',
  });
}

export function useChildFeeCollectionSummary(
  studentId: string,
  params?: { academic_year_id?: string },
) {
  return useQuery<FeeCollectionSummary>({
    queryKey: ['feeCollection', 'child-summary', studentId, params],
    queryFn: () => feeCollectionApi.getChildSummary(studentId, params),
    enabled: !!studentId,
  });
}

export function useFeeSearchStudents(params: {
  q?: string;
  class_id?: string;
  section_id?: string;
  academic_year_id?: string;
}) {
  return useQuery({
    queryKey: ['feeCollection', 'search', params],
    queryFn: () => feeCollectionApi.searchStudent(params),
    enabled: !!(params.q || params.class_id),
  });
}

export function usePayFee() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return useMutation<FeePaymentResponse, Error, FeePaymentRequest>({
    mutationFn: (data) => feeCollectionApi.pay(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feeCollection', 'summary', variables.student_id] });
      queryClient.invalidateQueries({ queryKey: ['feeTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['feeReceipts'] });
      showSuccess('Payment recorded successfully');
    },
    onError: (error) => {
      showError(error.message || 'Payment failed');
    },
  });
}

export function useFeeConcessionsForStudent(studentId: string, params?: { academic_year_id?: string }) {
  return useQuery<FeeConcession[]>({
    queryKey: ['feeConcessions', studentId, params],
    queryFn: () => feeConcessionsApi.getByStudent(studentId, params),
    enabled: !!studentId,
  });
}

export function useCreateFeeConcession() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  return useMutation<FeeConcession[], Error, FeeConcessionCreate[]>({
    mutationFn: (data) => feeConcessionsApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeConcessions'] });
      queryClient.invalidateQueries({ queryKey: ['feeCollection'] });
      showSuccess('Concession applied successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to apply concession');
    },
  });
}
