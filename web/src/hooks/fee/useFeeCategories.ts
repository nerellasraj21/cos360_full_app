import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { PERMISSIONS } from '@/constants/permissions';
import { toast } from 'sonner';
import { feeCategoriesApi } from '@/api/fee';
import type {
    FeeCategory,
    FeeCategoryCreateRequest,
    FeeCategoryUpdateRequest,
    FeeType
} from '@/types/fee';

// Query keys for fee categories
export const feeCategoryKeys = {
    all: ['fee-categories'] as const,
    lists: () => [...feeCategoryKeys.all, 'list'] as const,
    list: (params?: any) => [...feeCategoryKeys.lists(), params] as const,
    details: () => [...feeCategoryKeys.all, 'detail'] as const,
    detail: (id: string) => [...feeCategoryKeys.details(), id] as const,
    types: (categoryId: string) => [...feeCategoryKeys.detail(categoryId), 'types'] as const,
};

// Get all fee categories
export function useFeeCategories(params?: {
  academic_year_id?: string;
  is_active?: boolean;
  skip?: number;
  limit?: number;
}) {
  const { checkPermission } = usePermission();
  const hasListPermission = checkPermission('fee_categories', 'list');

  return useQuery<FeeCategory[]>({
    queryKey: feeCategoryKeys.list(params),
    queryFn: () => feeCategoriesApi.getAllCategories(params),
    enabled: hasListPermission,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single fee category by ID
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

// Get fee types for a category (filtered from all types)
export function useFeeCategoryTypes(categoryId: string, canview = true) {
    return useQuery<FeeType[]>({
        queryKey: feeCategoryKeys.types(categoryId),
        queryFn: async () => {
            // Import the fee types API
            const { feeTypesApi } = await import('@/api/fee');
            const allTypes = await feeTypesApi.getAllTypes();
            // Filter types by category_id
            return allTypes.filter(type => type.fee_category_id === categoryId);
        },
        enabled: !!categoryId && canview,
        staleTime: 5 * 60 * 1000,
    });
}

// Create fee category mutation
export function useCreateFeeCategory() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<FeeCategory, Error, FeeCategoryCreateRequest>({
        resource: 'fee_categories',
        action: 'create',
        mutationFn: feeCategoriesApi.createCategory,
        onSuccess: (data) => {
            // Invalidate and refetch categories list
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.lists() });

            // Add the new category to the cache
            queryClient.setQueryData(feeCategoryKeys.detail(data.id), data);

            toast.success('Fee category created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create fee category: ${error.message}`);
        },
    });
}

// Update fee category mutation
export function useUpdateFeeCategory() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<FeeCategory, Error, { id: string; data: FeeCategoryUpdateRequest }>({
        resource: 'fee_categories',
        action: 'update',
        mutationFn: ({ id, data }) => feeCategoriesApi.updateCategory(id, data),
        onSuccess: (data) => {
            // Update the specific category in cache
            queryClient.setQueryData(feeCategoryKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.lists() });

            toast.success('Fee category updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update fee category: ${error.message}`);
        },
    });
}

// Delete fee category mutation
export function useDeleteFeeCategory() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<void, Error, string>({
        resource: 'fee_categories',
        action: 'delete',
        mutationFn: feeCategoriesApi.deleteCategory,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: feeCategoryKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.lists() });

            toast.success('Fee category deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete fee category: ${error.message}`);
        },
    });
}