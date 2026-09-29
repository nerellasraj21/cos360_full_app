import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '@/api/expense';
import type {
    ExpenseAuditEntry,
    ExpenseAuditQueryParams,
    ExpenseAuditLog,
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
        queryFn: () => expenseApi.getAuditLogs(params).then((r: { items: ExpenseAuditLog[]; total: number; skip: number; limit: number }) => r.items),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
