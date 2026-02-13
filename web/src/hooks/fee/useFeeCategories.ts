import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { toast } from 'sonner';
import { feeCategoriesApi } from '@/api/fee';
import type {
    FeeCategory,
    FeeCategoryCreateRequest,
    FeeCategoryUpdateRequest,
    FeeCategorySearchParams,
    FeeCategoryListResponse,
    FeeCategoryHealthCheck,
    FeeType
} from '@/types/fee';

// ===== QUERY KEYS =====

/**
 * Query key factory for fee categories
 */
export const feeCategoryKeys = {
    all: ['fee-categories'] as const,
    lists: () => [...feeCategoryKeys.all, 'list'] as const,
    list: (params?: FeeCategorySearchParams) => [...feeCategoryKeys.lists(), params] as const,
    details: () => [...feeCategoryKeys.all, 'detail'] as const,
    detail: (id: string) => [...feeCategoryKeys.details(), id] as const,
    types: (categoryId: string) => [...feeCategoryKeys.detail(categoryId), 'types'] as const,
    health: () => [...feeCategoryKeys.all, 'health'] as const,
};

// ===== READ HOOKS =====

/**
 * Hook to get health status of fee categories module
 */
export function useFeeCategoriesHealth() {
    return useQuery<FeeCategoryHealthCheck>({
        queryKey: feeCategoryKeys.health(),
        queryFn: () => feeCategoriesApi.healthCheck(),
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Hook to get all fee categories with pagination
 * @param params - Search and pagination parameters
 * @returns Paginated fee categories with total count
 */
export function useFeeCategories(params?: FeeCategorySearchParams) {
    const { checkPermission } = usePermission();
    const hasListPermission = checkPermission('fee_categories', 'list');

    console.log('[useFeeCategories] Hook called with:', {
        params,
        hasListPermission,
        queryKey: feeCategoryKeys.list(params)
    });

    return useQuery<FeeCategoryListResponse>({
        queryKey: feeCategoryKeys.list(params),
        queryFn: () => {
            console.log('[useFeeCategories] Fetching data...');
            return feeCategoriesApi.getAllCategories(params);
        },
        enabled: hasListPermission,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook to get single fee category by ID
 * @param id - Category ID
 */
export function useFeeCategory(id: string) {
    const { checkPermission } = usePermission();
    const hasReadPermission = checkPermission('fee_categories', 'read');

    return useQuery<FeeCategory>({
        queryKey: feeCategoryKeys.detail(id),
        queryFn: () => feeCategoriesApi.getCategory(id),
        enabled: !!id && hasReadPermission,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook to get fee types for a category (filtered from all types)
 * @param categoryId - Category ID
 * @param enabled - Whether to enable the query
 */
export function useFeeCategoryTypes(categoryId: string, enabled = true) {
    return useQuery<FeeType[]>({
        queryKey: feeCategoryKeys.types(categoryId),
        queryFn: async () => {
            // Import the fee types API
            const { feeTypesApi } = await import('@/api/fee');
            const allTypes = await feeTypesApi.getAllTypes();
            // Filter types by category_id
            return allTypes.filter(type => type.fee_category_id === categoryId);
        },
        enabled: !!categoryId && enabled,
        staleTime: 5 * 60 * 1000,
    });
}

// ===== MUTATION HOOKS =====

/**
 * Hook to create a new fee category
 */
export function useCreateFeeCategory() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<FeeCategory, Error, FeeCategoryCreateRequest>({
        resource: 'fee_categories',
        action: 'create',
        mutationFn: feeCategoriesApi.createCategory,
        onSuccess: (data) => {
            // Invalidate ALL category-related queries to ensure refresh
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.all });

            // Also refetch active queries immediately
            queryClient.refetchQueries({
                queryKey: feeCategoryKeys.lists(),
                type: 'active'
            });

            // Add the new category to the cache
            queryClient.setQueryData(feeCategoryKeys.detail(data.id), data);

            toast.success('Fee category created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create fee category: ${error.message}`);
        },
    });
}

/**
 * Hook to update an existing fee category
 */
export function useUpdateFeeCategory() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<FeeCategory, Error, { id: string; data: FeeCategoryUpdateRequest }>({
        resource: 'fee_categories',
        action: 'update',
        mutationFn: ({ id, data }) => feeCategoriesApi.updateCategory(id, data),
        onSuccess: (data) => {
            // Update the specific category in cache
            queryClient.setQueryData(feeCategoryKeys.detail(data.id), data);

            // Invalidate ALL category-related queries
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.all });

            // Refetch active queries immediately
            queryClient.refetchQueries({
                queryKey: feeCategoryKeys.lists(),
                type: 'active'
            });

            toast.success('Fee category updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update fee category: ${error.message}`);
        },
    });
}

/**
 * Hook to delete a fee category
 */
export function useDeleteFeeCategory() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<void, Error, string>({
        resource: 'fee_categories',
        action: 'delete',
        mutationFn: feeCategoriesApi.deleteCategory,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: feeCategoryKeys.detail(id) });

            // Invalidate ALL category-related queries
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.all });

            // Refetch active queries immediately
            queryClient.refetchQueries({
                queryKey: feeCategoryKeys.lists(),
                type: 'active'
            });

            toast.success('Fee category deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee category: ${error.message}`);
        },
    });
}
