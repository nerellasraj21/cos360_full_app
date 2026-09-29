import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { expenseTransactionsApi } from '@/api/expense/transactions';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { usePermissionProtectedQuery } from '@/hooks/usePermissionProtectedQuery';
import { PERMISSIONS } from '@/constants/permissions';
import type {
    ExpenseTransaction,
    ExpenseTransactionCreate,
    ExpenseTransactionUpdate
} from '@/types/expense';

type ExpenseTransactionFilters = {
    expense_type_id?: string;
    department_id?: string;
    status?: string[];
    payment_method?: string[];
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
    skip?: number;
    limit?: number;
};

// Query keys for expense transactions
export const expenseTransactionKeys = {
  all: ['expense-transactions'] as const,
  lists: () => [...expenseTransactionKeys.all, 'list'] as const,
  list: (params?: ExpenseTransactionFilters) => [...expenseTransactionKeys.lists(), params] as const,
  details: () => [...expenseTransactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseTransactionKeys.details(), id] as const,
};

// Get all expense transactions with search/filter
export function useExpenseTransactions(params?: ExpenseTransactionFilters) {
    return usePermissionProtectedQuery<ExpenseTransaction[]>({
        queryKey: expenseTransactionKeys.list(params),
        queryFn: () => expenseTransactionsApi.getAllTransactions(params),
        resource: 'expense_transactions',
        action: 'list',
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

// Get single expense transaction by ID
export function useExpenseTransaction(id: string) {
    return usePermissionProtectedQuery<ExpenseTransaction>({
        queryKey: expenseTransactionKeys.detail(id),
        queryFn: () => expenseTransactionsApi.getTransaction(id),
        resource: 'expense_transactions',
        action: 'read',
        enabled: !!id,
        staleTime: 2 * 60 * 1000,
    });
}

// Create expense transaction mutation
export function useCreateExpenseTransaction() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<ExpenseTransaction, Error, ExpenseTransactionCreate>({
        resource: 'expense_transactions',
        action: 'create',
        mutationFn: expenseTransactionsApi.createTransaction,
        onSuccess: (data) => {
            // Invalidate and refetch transactions list
            queryClient.invalidateQueries({ queryKey: expenseTransactionKeys.lists() });

            // Add the new transaction to the cache
            queryClient.setQueryData(expenseTransactionKeys.detail(data.id), data);

            toast.success('Expense transaction created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create expense transaction: ${error.message}`);
        },
    });
}

// Update expense transaction mutation
export function useUpdateExpenseTransaction() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<ExpenseTransaction, Error, { id: string; data: ExpenseTransactionUpdate }>({
        resource: 'expense_transactions',
        action: 'update',
        mutationFn: ({ id, data }) => expenseTransactionsApi.updateTransaction(id, data),
        onSuccess: (data) => {
            // Update the specific transaction in cache
            queryClient.setQueryData(expenseTransactionKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: expenseTransactionKeys.lists() });

            toast.success('Expense transaction updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update expense transaction: ${error.message}`);
        },
    });
}

// Update transaction status mutation
export function useUpdateExpenseTransactionStatus() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<ExpenseTransaction, Error, { id: string; data: ExpenseTransactionUpdate }>({
        resource: 'expense_transactions',
        action: 'update',
        mutationFn: ({ id, data }) => expenseTransactionsApi.updateTransactionStatus(id, data),
        onSuccess: (data) => {
            // Update the specific transaction in cache
            queryClient.setQueryData(expenseTransactionKeys.detail(data.id), data);

            // Invalidate lists to ensure consistency
            queryClient.invalidateQueries({ queryKey: expenseTransactionKeys.lists() });

            toast.success('Transaction status updated successfully');
        },
        onError: (error) => {
            toast.error(`Failed to update transaction status: ${error.message}`);
        },
    });
}

// Delete expense transaction mutation
export function useDeleteExpenseTransaction() {
    const queryClient = useQueryClient();

    return usePermissionProtectedMutation<void, Error, string>({
        resource: 'expense_transactions',
        action: 'delete',
        mutationFn: expenseTransactionsApi.deleteTransaction,
        onSuccess: (_, id) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: expenseTransactionKeys.detail(id) });

            // Invalidate lists
            queryClient.invalidateQueries({ queryKey: expenseTransactionKeys.lists() });

            toast.success('Expense transaction deleted successfully');
        },
        onError: (error) => {
            toast.error(`Failed to delete expense transaction: ${error.message}`);
        },
    });
}