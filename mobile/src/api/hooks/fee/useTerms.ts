import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { feeTermsApi, FeeTermRequest, FeeTermResponse, FeeTermDateResponse } from '../../index';

export function useFeeTerms(params?: { academic_year_id?: string; skip?: number; limit?: number }) {
  return useQuery<FeeTermResponse[]>({
    queryKey: ['feeTerms', params],
    queryFn: () => feeTermsApi.getFeeTerms(params),
  });
}

export function useFeeTerm(id: string) {
  return useQuery<FeeTermResponse>({
    queryKey: ['feeTerm', id],
    queryFn: () => feeTermsApi.getFeeTerm(id),
    enabled: !!id,
  });
}

export function useFeeTermsDropdown(params?: { fee_type_id?: string; academic_year_id?: string }) {
  return useQuery<{ id: string; label: string }[]>({
    queryKey: ['feeTermsDropdown', params],
    queryFn: () => feeTermsApi.getFeeTermsDropdown(params),
  });
}

export function useFeeTermDates(feeTermId: string) {
  return useQuery<FeeTermDateResponse[]>({
    queryKey: ['feeTermDates', feeTermId],
    queryFn: () => feeTermsApi.getFeeTermDates(feeTermId),
    enabled: !!feeTermId,
  });
}

export function useCreateFeeTerm() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation<FeeTermResponse, Error, FeeTermRequest>({
    mutationFn: (data) => feeTermsApi.createFeeTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      queryClient.invalidateQueries({ queryKey: ['feeTermsDropdown'] });
      showSuccess('Fee term created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create fee term');
    },
  });
}

export function useUpdateFeeTerm() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation<FeeTermResponse, Error, { id: string; data: Partial<FeeTermRequest> }>({
    mutationFn: ({ id, data }) => feeTermsApi.updateFeeTerm(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      queryClient.invalidateQueries({ queryKey: ['feeTerm', id] });
      showSuccess('Fee term updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update fee term');
    },
  });
}

export function useDeleteFeeTerm() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation<void, Error, string>({
    mutationFn: (id) => feeTermsApi.deleteFeeTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      queryClient.invalidateQueries({ queryKey: ['feeTermsDropdown'] });
      showSuccess('Fee term deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete fee term');
    },
  });
}

export function useDeleteFeeTermDate() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation<void, Error, { feeTermDateId: string; feeTermId: string }>({
    mutationFn: ({ feeTermDateId }) => feeTermsApi.deleteFeeTermDate(feeTermDateId),
    onSuccess: (_, { feeTermId }) => {
      queryClient.invalidateQueries({ queryKey: ['feeTermDates', feeTermId] });
      queryClient.invalidateQueries({ queryKey: ['feeTerms'] });
      showSuccess('Term date deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete term date');
    },
  });
}
