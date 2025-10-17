import CAxios from '../index';
import type {
    ExpenseAuditEntry,
    ExpenseAuditQueryParams
} from '@/types/expense';

export const expenseAuditApi = {
    // Get audit trail
    getAuditTrail: async (params?: ExpenseAuditQueryParams): Promise<ExpenseAuditEntry[]> => {
        console.log('[DEBUG] expenseAuditApi.getAuditTrail called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.transaction_id) queryParams.append('transaction_id', params.transaction_id);
        if (params?.user_id) queryParams.append('user_id', params.user_id);
        if (params?.action_type) queryParams.append('action_type', params.action_type);
        if (params?.date_from) queryParams.append('date_from', params.date_from);
        if (params?.date_to) queryParams.append('date_to', params.date_to);
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`/expense/audit/?${queryParams.toString()}`);
        console.log('[DEBUG] expenseAuditApi.getAuditTrail returning:', response.data.length, 'entries');
        return response.data;
    },
};

export const {
    getAuditTrail,
} = expenseAuditApi;