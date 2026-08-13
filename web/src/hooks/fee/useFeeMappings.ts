import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeClassMappingsApi } from '@/api/fee';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import { createClassMappingTermAmounts, updateClassMappingTermAmounts, deleteClassMappingTermAmounts } from '@/api/fee/mappings';
import type {
    FeeClassMapping,
    FeeClassMappingCreateRequest,
    FeeClassMappingUpdateRequest,
    FeeClassMappingBulkCreateRequest,
    FeeClassMappingBulkResponse,
    FeeClassMappingListResponse,
    FeeStudentMapping,
    FeeStudentMappingCreateRequest,
    FeeStudentMappingUpdateRequest,
    FeeStudentMappingListResponse,
} from '@/types/fee/mapping';

// Query keys for fee class mappings
export const feeClassMappingKeys = {
    all: ['fee-class-mappings'] as const,
    lists: () => [...feeClassMappingKeys.all, 'list'] as const,
    list: (params?: any) => [...feeClassMappingKeys.lists(), params] as const,
    details: () => [...feeClassMappingKeys.all, 'detail'] as const,
    detail: (id: string) => [...feeClassMappingKeys.details(), id] as const,
};

// Get all fee class mappings
export function useFeeClassMappings(params?: {
    class_id?: string;
    fee_type_id?: string;
    academic_year_id?: string;
    all_by_default?: boolean;
    skip?: number;
    limit?: number;
}) {
    return useQuery<FeeClassMappingListResponse>({
        queryKey: feeClassMappingKeys.list(params),
        queryFn: () => feeClassMappingsApi.getAllMappings(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get single fee class mapping by ID
export function useFeeClassMapping(id: string) {
    return useQuery<FeeClassMapping>({
        queryKey: feeClassMappingKeys.detail(id),
        queryFn: () => feeClassMappingsApi.getMappingById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// Create fee class mapping mutation
export function useCreateFeeClassMapping() {
    const queryClient = useQueryClient();

    return useMutation<FeeClassMapping, Error, FeeClassMappingCreateRequest>({
        mutationFn: feeClassMappingsApi.createMapping,
        onSuccess: (data) => {
            // Invalidate and refetch mappings list
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            // Add the new mapping to the cache
            queryClient.setQueryData(feeClassMappingKeys.detail(data.id), data);

            toast.success('Fee class mapping created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create fee class mapping: ${error.message}`);
        },
    });
}

// Update fee class mapping mutation
export function useUpdateFeeClassMapping() {
    const queryClient = useQueryClient();

    return useMutation<FeeClassMapping, Error, { id: string; data: FeeClassMappingUpdateRequest }>({
        mutationFn: ({ id, data }) => feeClassMappingsApi.updateMapping(id, data),
        onSuccess: (data) => {
            // Update the specific mapping in cache
            queryClient.setQueryData(feeClassMappingKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            toast.success('Fee class mapping updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update fee class mapping: ${error.message}`);
        },
    });
}

// Delete fee class mapping mutation
export function useDeleteFeeClassMapping() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: feeClassMappingsApi.deleteMapping,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: feeClassMappingKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            toast.success('Fee class mapping deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee class mapping: ${error.message}`);
        },
    });
}

// Toggle mandatory flag mutation (PATCH /fee/class-mappings/{id}/toggle-mandatory)
export function useToggleMandatoryFeeClassMapping() {
    const queryClient = useQueryClient();

    return useMutation<FeeClassMapping, Error, string>({
        mutationFn: (id) => feeClassMappingsApi.toggleMandatory(id),
        onSuccess: (data) => {
            queryClient.setQueryData(feeClassMappingKeys.detail(data.id), data);
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });
            if (data.all_by_default) {
                toast.success('Fee applied to all students in this class.');
            }
        },
        onError: (error) => {
            toast.error(`Failed to toggle mandatory status: ${error.message}`);
        },
    });
}

// Bulk create fee class mappings mutation
export function useBulkCreateFeeClassMappings() {
    const queryClient = useQueryClient();

    return useMutation<FeeClassMappingBulkResponse, Error, FeeClassMappingBulkCreateRequest>({
        mutationFn: feeClassMappingsApi.bulkCreateMappings,
        onSuccess: (data) => {
            // Invalidate mappings list to refetch
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            toast.success(`Bulk creation completed: ${data.success_count}/${data.total_count} mappings created`);
        },
        onError: (error) => {
            toast.error(`Failed to bulk create fee class mappings: ${error.message}`);
        },
    });
}

// Create class mapping term amounts mutation
export function useCreateClassMappingTermAmounts() {
    const queryClient = useQueryClient();

    return useMutation<any, Error, {
        fee_class_mapping_id: string;
        term_amounts: { term_date_id: string; term_amount: number }[];
    }>({
        mutationFn: createClassMappingTermAmounts,
        onSuccess: () => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            toast.success('Term amounts created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create term amounts: ${error.message}`);
        },
    });
}

// Update class mapping term amounts mutation
export function useUpdateClassMappingTermAmounts() {
    const queryClient = useQueryClient();

    return useMutation<any, Error, {
        fee_class_mapping_id: string;
        term_amounts: { id: string; term_date_id: string; term_amount: number }[];
    }>({
        mutationFn: updateClassMappingTermAmounts,
        onSuccess: () => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            toast.success('Term amounts updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update term amounts: ${error.message}`);
        },
    });
}

// Delete class mapping term amounts mutation
export function useDeleteClassMappingTermAmounts() {
    const queryClient = useQueryClient();

    return useMutation<any, Error, {
        fee_class_mapping_id: string;
        term_amounts: { id: string }[];
    }>({
        mutationFn: deleteClassMappingTermAmounts,
        onSuccess: () => {
            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: feeClassMappingKeys.lists() });

            toast.success('Term amounts deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete term amounts: ${error.message}`);
        },
    });
}

// ─── Student Mapping Hooks ────────────────────────────────────────────────────

export const feeStudentMappingKeys = {
    all: ['fee-student-mappings'] as const,
    lists: () => [...feeStudentMappingKeys.all, 'list'] as const,
    list: (params?: object) => [...feeStudentMappingKeys.lists(), params] as const,
    details: () => [...feeStudentMappingKeys.all, 'detail'] as const,
    detail: (id: string) => [...feeStudentMappingKeys.details(), id] as const,
};

export function useFeeStudentMappings(params?: {
    student_id?: string;
    class_id?: string;
    section_id?: string;
    fee_type_id?: string;
    academic_year_id?: string;
}) {
    return useQuery<FeeStudentMapping[] | FeeStudentMappingListResponse>({
        queryKey: feeStudentMappingKeys.list(params),
        queryFn: () => feeStudentMappingsApi.getAllMappings(params),
        staleTime: 5 * 60 * 1000,
    });
}

export function useFeeStudentMapping(id: string) {
    return useQuery<FeeStudentMapping>({
        queryKey: feeStudentMappingKeys.detail(id),
        queryFn: () => feeStudentMappingsApi.getMappingById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

export function useCreateFeeStudentMapping() {
    const queryClient = useQueryClient();
    return useMutation<FeeStudentMapping, Error, FeeStudentMappingCreateRequest>({
        mutationFn: feeStudentMappingsApi.createMapping,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: feeStudentMappingKeys.lists() });
            queryClient.setQueryData(feeStudentMappingKeys.detail(data.id), data);
            toast.success('Fee student mapping created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create fee student mapping: ${error.message}`);
        },
    });
}

export function useUpdateFeeStudentMapping() {
    const queryClient = useQueryClient();
    return useMutation<FeeStudentMapping, Error, { id: string; data: FeeStudentMappingUpdateRequest }>({
        mutationFn: ({ id, data }) => feeStudentMappingsApi.updateMapping(id, data),
        onSuccess: (data) => {
            queryClient.setQueryData(feeStudentMappingKeys.detail(data.id), data);
            queryClient.invalidateQueries({ queryKey: feeStudentMappingKeys.lists() });
            toast.success('Fee student mapping updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update fee student mapping: ${error.message}`);
        },
    });
}

export function useDeleteFeeStudentMapping() {
    const queryClient = useQueryClient();
    return useMutation<{ message: string }, Error, string>({
        mutationFn: feeStudentMappingsApi.deleteMapping,
        onSuccess: (_, id) => {
            queryClient.removeQueries({ queryKey: feeStudentMappingKeys.detail(id) });
            queryClient.invalidateQueries({ queryKey: feeStudentMappingKeys.lists() });
            toast.success('Fee student mapping deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee student mapping: ${error.message}`);
        },
    });
}