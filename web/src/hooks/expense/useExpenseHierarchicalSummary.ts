import { useQuery } from '@tanstack/react-query';
import { expenseSummaryApi } from '@/api/expense/summary';
import type { ExpenseSummaryParams } from '@/api/expense/summary';
import type { ExpenseHierarchicalSummary } from '@/types/expense';

export const expenseSummaryKeys = {
  all: ['expense-summary'] as const,
  hierarchical: (params?: ExpenseSummaryParams) => [...expenseSummaryKeys.all, 'hierarchical', params] as const,
};

export function useExpenseHierarchicalSummary(params?: ExpenseSummaryParams) {
  return useQuery<ExpenseHierarchicalSummary>({
    queryKey: expenseSummaryKeys.hierarchical(params),
    queryFn: () => expenseSummaryApi.getHierarchicalSummary(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
