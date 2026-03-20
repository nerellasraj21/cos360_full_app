import CAxios from '../index';
import type { ExpenseHierarchicalSummary } from '@/types/expense';

export interface ExpenseSummaryParams {
  academic_year_id?: string;
  start_date?: string;
  end_date?: string;
  status_filter?: string;
}

export const expenseSummaryApi = {
  getHierarchicalSummary: async (params?: ExpenseSummaryParams): Promise<ExpenseHierarchicalSummary> => {
    const queryParams = new URLSearchParams();
    if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.status_filter) queryParams.append('status_filter', params.status_filter);

    const query = queryParams.toString();
    const response = await CAxios.get(`/expense/summary${query ? `?${query}` : ''}`);
    return response.data;
  },
};
