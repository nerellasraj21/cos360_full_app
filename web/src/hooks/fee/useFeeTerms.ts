import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeTermsApi } from '@/api/fee';
import type {
    FeeTerm,
    FeeTermDate,
    FeeTermCreateRequest,
    FeeTermUpdateRequest,
    FeeTermDropdown
} from '@/types/fee';

// Query keys for fee terms
export const feeTermKeys = {
  all: ['fee-terms'] as const,
  lists: () => [...feeTermKeys.all, 'list'] as const,
  list: (params?: any) => [...feeTermKeys.lists(), params] as const,
  details: () => [...feeTermKeys.all, 'detail'] as const,
  detail: (id: string) => [...feeTermKeys.details(), id] as const,
  dropdown: () => [...feeTermKeys.all, 'dropdown'] as const,
  dates: (termId: string) => [...feeTermKeys.detail(termId), 'dates'] as const,
};

// Query keys for payment dates
export const paymentDateKeys = {
  all: ['payment-dates'] as const,
  byTerm: (termId: string) => [...paymentDateKeys.all, 'term', termId] as const,
};

// Get all fee terms
export function useFeeTerms(params?: {
  academic_year_id?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}) {
    return useQuery<FeeTerm[]>({
        queryKey: feeTermKeys.list(params),
        queryFn: () => feeTermsApi.getAllTerms(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get single fee term by ID
export function useFeeTerm(id: string) {
  return useQuery<FeeTerm>({
    queryKey: feeTermKeys.detail(id),
    queryFn: () => feeTermsApi.getTerm(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get fee terms dropdown
export function useFeeTermsDropdown() {
  return useQuery<FeeTermDropdown[]>({
    queryKey: feeTermKeys.dropdown(),
    queryFn: () => feeTermsApi.getTermsDropdown(),
    staleTime: 5 * 60 * 1000,
  });
}

// Get fee term dates
export function useFeeTermDates(termId: string) {
  return useQuery<FeeTermDate[]>({
    queryKey: feeTermKeys.dates(termId),
    queryFn: () => feeTermsApi.getTermDates(termId),
    enabled: !!termId,
    staleTime: 5 * 60 * 1000,
  });
}

// Create fee term mutation
export function useCreateFeeTerm() {
    const queryClient = useQueryClient();

    return useMutation<FeeTerm, Error, FeeTermCreateRequest>({
        mutationFn: feeTermsApi.createTerm,
        onSuccess: (data) => {
          // Invalidate and refetch terms list
          queryClient.invalidateQueries({ queryKey: feeTermKeys.lists() });

          // Add the new term to the cache
          queryClient.setQueryData(feeTermKeys.detail(data.id), data);

          toast.success('Fee term created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create fee term: ${error.message}`);
        },
    });
}

// Update fee term mutation
export function useUpdateFeeTerm() {
    const queryClient = useQueryClient();

    return useMutation<FeeTerm, Error, { id: string; data: FeeTermUpdateRequest }>({
        mutationFn: ({ id, data }) => feeTermsApi.updateTerm(id, data),
        onSuccess: (data) => {
          // Update the specific term in cache
          queryClient.setQueryData(feeTermKeys.detail(data.id), data);

          // Invalidate lists to ensure consistency
          queryClient.invalidateQueries({ queryKey: feeTermKeys.lists() });

          toast.success('Fee term updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update fee term: ${error.message}`);
        },
    });
}

// Delete fee term mutation
export function useDeleteFeeTerm() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: feeTermsApi.deleteTerm,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: feeTermKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: feeTermKeys.lists() });

            toast.success('Fee term deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee term: ${error.message}`);
        },
    });
}

// Delete fee term date mutation
export function useDeleteFeeTermDate() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, { dateId: string; termId: string }>({
        mutationFn: ({ dateId }) => feeTermsApi.deleteTermDate(dateId),
        onSuccess: (_, { termId }) => {
            // Invalidate the term to refetch dates
            queryClient.invalidateQueries({ queryKey: feeTermKeys.detail(termId) });
            queryClient.invalidateQueries({ queryKey: feeTermKeys.dates(termId) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: feeTermKeys.lists() });

            toast.success('Fee term date deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee term date: ${error.message}`);
        },
    });
}
