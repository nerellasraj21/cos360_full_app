import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseApi } from '@/api/expense';
import type {
    ExpenseCategory,
    ExpenseCategoryCreateRequest,
    ExpenseCategoryUpdateRequest
} from '@/types/expense';

type ExpenseCategoryQueryParams = {
    skip?: number;
    limit?: number;
    active_only?: boolean;
};

// Query keys for expense categories
export const expenseCategoryKeys = {
    all: ['expense-categories'] as const,
    lists: () => [...expenseCategoryKeys.all, 'list'] as const,
    list: (params?: ExpenseCategoryQueryParams) => [...expenseCategoryKeys.lists(), params] as const,
    details: () => [...expenseCategoryKeys.all, 'detail'] as const,
    detail: (id: string) => [...expenseCategoryKeys.details(), id] as const,
};

// Get all expense categories
export function useExpenseCategories(params?: ExpenseCategoryQueryParams) {
    return useQuery<ExpenseCategory[]>({
        queryKey: expenseCategoryKeys.list(params),
        queryFn: () => expenseApi.getCategories(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get single expense category by ID
export function useExpenseCategory(id: string) {
    return useQuery<ExpenseCategory>({
        queryKey: expenseCategoryKeys.detail(id),
        queryFn: () => expenseApi.getCategoryById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// Create expense category mutation
export function useCreateExpenseCategory() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseCategory, Error, ExpenseCategoryCreateRequest>({
        mutationFn: (data) => expenseApi.createCategory(data),
        onSuccess: (data) => {
            // Invalidate and refetch categories list
            queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.lists() });

            // Add the new category to the cache
            queryClient.setQueryData(expenseCategoryKeys.detail(data.id), data);

            toast.success('Expense category created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create expense category: ${error.message}`);
        },
    });
}

// Update expense category mutation
export function useUpdateExpenseCategory() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseCategory, Error, { id: string; data: ExpenseCategoryUpdateRequest }>({
        mutationFn: ({ id, data }) => expenseApi.updateCategory(id, data),
        onSuccess: (data) => {
            // Update the specific category in cache
            queryClient.setQueryData(expenseCategoryKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.lists() });

            toast.success('Expense category updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update expense category: ${error.message}`);
        },
    });
}

// Delete expense category mutation
export function useDeleteExpenseCategory() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (id) => expenseApi.deleteCategory(id),
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: expenseCategoryKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: expenseCategoryKeys.lists() });

            toast.success('Expense category deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete expense category: ${error.message}`);
        },
    });
}
