import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseTypesApi } from '@/api/expense';
import type {
    ExpenseType,
    ExpenseTypeCreateRequest,
    ExpenseTypeUpdateRequest,
    ExpenseTypeQueryParams
} from '@/types/expense';

// Query keys for expense types
export const expenseTypeKeys = {
    all: ['expense-types'] as const,
    lists: () => [...expenseTypeKeys.all, 'list'] as const,
    list: (params?: ExpenseTypeQueryParams) => [...expenseTypeKeys.lists(), params] as const,
    details: () => [...expenseTypeKeys.all, 'detail'] as const,
    detail: (id: string) => [...expenseTypeKeys.details(), id] as const,
};

// Get all expense types
export function useExpenseTypes(params?: ExpenseTypeQueryParams) {
    return useQuery<ExpenseType[]>({
        queryKey: expenseTypeKeys.list(params),
        queryFn: () => expenseTypesApi.getAllTypes(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get single expense type by ID
export function useExpenseType(id: string) {
    return useQuery<ExpenseType>({
        queryKey: expenseTypeKeys.detail(id),
        queryFn: () => expenseTypesApi.getType(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// Create expense type mutation
export function useCreateExpenseType() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseType, Error, ExpenseTypeCreateRequest>({
        mutationFn: expenseTypesApi.createType,
        onSuccess: (data) => {
            // Invalidate and refetch types list
            queryClient.invalidateQueries({ queryKey: expenseTypeKeys.lists() });

            // Add the new type to the cache
            queryClient.setQueryData(expenseTypeKeys.detail(data.id), data);

            toast.success('Expense type created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create expense type: ${error.message}`);
        },
    });
}

// Update expense type mutation
export function useUpdateExpenseType() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseType, Error, { id: string; data: ExpenseTypeUpdateRequest }>({
        mutationFn: ({ id, data }) => expenseTypesApi.updateType(id, data),
        onSuccess: (data) => {
            // Update the specific type in cache
            queryClient.setQueryData(expenseTypeKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: expenseTypeKeys.lists() });

            toast.success('Expense type updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update expense type: ${error.message}`);
        },
    });
}

// Delete expense type mutation
export function useDeleteExpenseType() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: expenseTypesApi.deleteType,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: expenseTypeKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: expenseTypeKeys.lists() });

            toast.success('Expense type deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete expense type: ${error.message}`);
        },
    });
}