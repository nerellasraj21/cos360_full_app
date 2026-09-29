import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseApi } from '@/api/expense';
import type {
    ExpenseSettings,
    ExpenseSettingsCreateRequest,
    ExpenseSettingsUpdateRequest,
} from '@/types/expense';

// Query keys for expense settings
export const expenseSettingsKeys = {
    all: ['expense-settings'] as const,
    lists: () => [...expenseSettingsKeys.all, 'list'] as const,
    list: (params?: any) => [...expenseSettingsKeys.lists(), params] as const,
    details: () => [...expenseSettingsKeys.all, 'detail'] as const,
    detail: (id: string) => [...expenseSettingsKeys.details(), id] as const,
};

// Get all expense settings with filtering
export function useExpenseSettings(params?: { skip?: number; limit?: number; department_id?: string }) {
    return useQuery<ExpenseSettings[]>({
        queryKey: expenseSettingsKeys.list(params),
        queryFn: () => expenseApi.getSettings(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get single expense setting by ID
export function useExpenseSetting(id: string) {
    return useQuery<ExpenseSettings>({
        queryKey: expenseSettingsKeys.detail(id),
        queryFn: () => expenseApi.getSettingById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}

// Create expense setting mutation
export function useCreateExpenseSetting() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseSettings, Error, ExpenseSettingsCreateRequest>({
        mutationFn: (data) => expenseApi.createSetting(data),
        onSuccess: (data) => {
            // Invalidate and refetch settings list
            queryClient.invalidateQueries({ queryKey: expenseSettingsKeys.lists() });

            // Add the new setting to the cache
            queryClient.setQueryData(expenseSettingsKeys.detail(data.id), data);

            toast.success('Expense setting created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create expense setting: ${error.message}`);
        },
    });
}

// Update expense setting mutation
export function useUpdateExpenseSetting() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseSettings, Error, { id: string; data: ExpenseSettingsUpdateRequest }>({
        mutationFn: ({ id, data }) => expenseApi.updateSetting(id, data),
        onSuccess: (data) => {
            // Update the specific setting in cache
            queryClient.setQueryData(expenseSettingsKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: expenseSettingsKeys.lists() });

            toast.success('Expense setting updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update expense setting: ${error.message}`);
        },
    });
}

// Delete expense setting mutation
export function useDeleteExpenseSetting() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: (id) => expenseApi.deleteSetting(id),
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: expenseSettingsKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: expenseSettingsKeys.lists() });

            toast.success('Expense setting deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete expense setting: ${error.message}`);
        },
    });
}

// Legacy hooks for backward compatibility
export function useExpenseSettingsLegacy() {
    return useQuery<ExpenseSettings[]>({
        queryKey: ['expense-settings-legacy'],
        queryFn: () => expenseApi.getSettings(),
        staleTime: 15 * 60 * 1000, // 15 minutes
    });
}

export function useUpdateExpenseSettingsLegacy() {
    const queryClient = useQueryClient();

    return useMutation<ExpenseSettings, Error, { id: string; data: ExpenseSettingsUpdateRequest }>({
        mutationFn: ({ id, data }) => expenseApi.updateSetting(id, data),
        onSuccess: (data) => {
            // Update the settings in cache
            queryClient.setQueryData(['expense-settings-legacy'], [data]);

            toast.success('Expense settings updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update expense settings: ${error.message}`);
        },
    });
}
