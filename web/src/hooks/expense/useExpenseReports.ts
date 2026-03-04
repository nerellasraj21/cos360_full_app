import { useQuery } from '@tanstack/react-query';
import { expenseApi } from '@/api/expense';
import type {
    ExpenseReportSummary,
    ExpenseReportQueryParams,
    BudgetAnalysis,
    BudgetAnalysisQueryParams,
    ExpenseTransactionFilters
} from '@/types/expense';

// Query keys for expense reports
export const expenseReportKeys = {
    all: ['expense-reports'] as const,
    summary: (params: ExpenseReportQueryParams) => [...expenseReportKeys.all, 'summary', params] as const,
    budgetAnalysis: (params: BudgetAnalysisQueryParams) => [...expenseReportKeys.all, 'budget-analysis', params] as const,
};

// Get expense summary report
export function useExpenseSummaryReport(params: ExpenseReportQueryParams) {
    return useQuery<ExpenseReportSummary>({
        queryKey: expenseReportKeys.summary(params),
        queryFn: () => expenseApi.getSummaryReport(params as ExpenseTransactionFilters),
        enabled: !!(params.start_date && params.end_date),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Get budget analysis
export function useExpenseBudgetAnalysis(params: BudgetAnalysisQueryParams) {
    return useQuery<BudgetAnalysis>({
        queryKey: expenseReportKeys.budgetAnalysis(params),
        queryFn: () => expenseApi.generateReport('budget_analysis', params as Record<string, string | number | string[] | undefined>) as Promise<BudgetAnalysis>,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}
