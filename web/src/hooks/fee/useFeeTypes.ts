import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
import { toast } from 'sonner';
import { feeTypesApi } from '@/api/fee';
import type {
    FeeType,
    FeeTypeCreateRequest,
    FeeTypeUpdateRequest
} from '@/types/fee';

// Query keys for fee types
export const feeTypeKeys = {
    all: ['fee-types'] as const,
    lists: () => [...feeTypeKeys.all, 'list'] as const,
    list: (params?: any) => [...feeTypeKeys.lists(), params] as const,
    details: () => [...feeTypeKeys.all, 'detail'] as const,
    detail: (id: string) => [...feeTypeKeys.details(), id] as const,
};

// Get all fee types
export function useFeeTypes(params?: {
    fee_category_id?: string;
    skip?: number;
    limit?: number;
}) {
    const { checkPermission } = usePermission();
    const hasListPermission = checkPermission('fee_types', 'list');

    return useQuery<FeeType[]>({
        queryKey: feeTypeKeys.list(params),
        queryFn: () => feeTypesApi.getAllTypes(params),
        enabled: hasListPermission,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

import type { FeeTypeDropdown } from '@/types/fee';

// Get fee types dropdown
export function useFeeTypesDropdown(feeCategoryId?: string) {
    const { checkPermission } = usePermission();
    const hasListPermission = checkPermission('fee_types', 'list');

    return useQuery<FeeTypeDropdown[], Error>({
        queryKey: [...feeTypeKeys.all, 'dropdown', feeCategoryId],
        queryFn: () => feeTypesApi.getDropdownOptions(feeCategoryId ? { fee_category_id: feeCategoryId } : undefined),
        enabled: hasListPermission,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get single fee type by ID
export function useFeeType(id: string) {
    const { checkPermission } = usePermission();
    const hasReadPermission = checkPermission('fee_types', 'read');

    return useQuery<FeeType>({
        queryKey: feeTypeKeys.detail(id),
        queryFn: () => feeTypesApi.getType(id),
        enabled: !!id && hasReadPermission,
        staleTime: 5 * 60 * 1000,
    });
}

// Create fee type mutation
export function useCreateFeeType() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<FeeType, Error, FeeTypeCreateRequest>({
        resource: 'fee_types',
        action: 'create',
        mutationFn: feeTypesApi.createType,
        onSuccess: (data) => {
            // Invalidate and refetch types list
            queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });

            // Add the new type to the cache
            queryClient.setQueryData(feeTypeKeys.detail(data.id), data);

            // Also invalidate category types if this type belongs to a category
            if (data.fee_category_id) {
                queryClient.invalidateQueries({
                    queryKey: ['fee-categories', 'detail', data.fee_category_id, 'types']
                });
            }

            toast.success('Fee type created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create fee type: ${error.message}`);
        },
    });
}

// Update fee type mutation
export function useUpdateFeeType() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<FeeType, Error, { id: string; data: FeeTypeUpdateRequest }>({
        resource: 'fee_types',
        action: 'update',
        mutationFn: ({ id, data }) => feeTypesApi.updateType(id, data),
        onSuccess: (data) => {
            // Update the specific type in cache
            queryClient.setQueryData(feeTypeKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });

            // Also invalidate category types if this type belongs to a category
            if (data.fee_category_id) {
                queryClient.invalidateQueries({
                    queryKey: ['fee-categories', 'detail', data.fee_category_id, 'types']
                });
            }

            toast.success('Fee type updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update fee type: ${error.message}`);
        },
    });
}

// Delete fee type mutation
export function useDeleteFeeType() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<void, Error, { id: string; categoryId?: string }>({
        resource: 'fee_types',
        action: 'delete',
        mutationFn: ({ id }) => feeTypesApi.deleteType(id),
        onSuccess: (_, { id, categoryId }) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: feeTypeKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });

            // Also invalidate category types if this type belonged to a category
            if (categoryId) {
                queryClient.invalidateQueries({
                    queryKey: ['fee-categories', 'detail', categoryId, 'types']
                });
            }

            toast.success('Fee type deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee type: ${error.message}`);
        },
    });
}