import CAxios from '../index';
import type {
    ExpenseReportSummary,
    ExpenseReportQueryParams,
    BudgetAnalysis,
    BudgetAnalysisQueryParams
} from '@/types/expense/report';

export const expenseReportsApi = {
    // Generate expense summary report
    getSummaryReport: async (params: ExpenseReportQueryParams): Promise<ExpenseReportSummary> => {
        console.log('[DEBUG] expenseReportsApi.getSummaryReport called with params:', params);

        const queryParams = new URLSearchParams();
        queryParams.append('report_type', params.report_type);
        queryParams.append('group_by', params.group_by);
        queryParams.append('date_from', params.date_from);
        queryParams.append('date_to', params.date_to);
        if (params.category_id) queryParams.append('category_id', params.category_id);
        if (params.department) queryParams.append('department', params.department);
        if (params.include_pending !== undefined) queryParams.append('include_pending', params.include_pending.toString());

        const response = await CAxios.get(`/expense/reports/summary/?${queryParams.toString()}`);
        console.log('[DEBUG] expenseReportsApi.getSummaryReport returning report');
        return response.data;
    },

    // Get budget analysis
    getBudgetAnalysis: async (params: BudgetAnalysisQueryParams): Promise<BudgetAnalysis> => {
        console.log('[DEBUG] expenseReportsApi.getBudgetAnalysis called with params:', params);

        const queryParams = new URLSearchParams();
        queryParams.append('period', params.period);
        if (params.category_id) queryParams.append('category_id', params.category_id);

        const response = await CAxios.get(`/expense/reports/budget-analysis/?${queryParams.toString()}`);
        console.log('[DEBUG] expenseReportsApi.getBudgetAnalysis returning analysis');
        return response.data;
    },
};

export const {
    getSummaryReport,
    getBudgetAnalysis,
} = expenseReportsApi;