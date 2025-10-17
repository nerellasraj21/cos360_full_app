import { useQuery } from '@tanstack/react-query';
import { expenseReportsApi } from '@/api/expense';
import type {
    ExpenseReportSummary,
    ExpenseReportQueryParams,
    BudgetAnalysis,
    BudgetAnalysisQueryParams
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
        queryFn: () => expenseReportsApi.getSummaryReport(params),
        enabled: !!(params.date_from && params.date_to),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

// Get budget analysis
export function useExpenseBudgetAnalysis(params: BudgetAnalysisQueryParams) {
    return useQuery<BudgetAnalysis>({
        queryKey: expenseReportKeys.budgetAnalysis(params),
        queryFn: () => expenseReportsApi.getBudgetAnalysis(params),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}