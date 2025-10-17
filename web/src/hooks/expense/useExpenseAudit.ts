import { useQuery } from '@tanstack/react-query';
import { expenseAuditApi } from '@/api/expense';
import type {
    ExpenseAuditEntry,
    ExpenseAuditQueryParams
} from '@/types/expense';

// Query keys for expense audit
export const expenseAuditKeys = {
    all: ['expense-audit'] as const,
    trail: (params?: ExpenseAuditQueryParams) => [...expenseAuditKeys.all, 'trail', params] as const,
};

// Get audit trail
export function useExpenseAuditTrail(params?: ExpenseAuditQueryParams) {
    return useQuery<ExpenseAuditEntry[]>({
        queryKey: expenseAuditKeys.trail(params),
        queryFn: () => expenseAuditApi.getAuditTrail(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}