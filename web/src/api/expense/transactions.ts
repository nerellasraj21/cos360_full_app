import CAxios from '../index';
import type {
    ExpenseTransactionRead,
    ExpenseTransactionCreateRequest,
    ExpenseTransactionUpdateRequest,
    ExpenseTransactionFilters
} from '@/types/expense';

export const expenseTransactionsApi = {
    // Get all transactions with search/filter
    getAllTransactions: async (params?: ExpenseTransactionFilters): Promise<ExpenseTransactionRead[]> => {
        console.log('[DEBUG] expenseTransactionsApi.getAllTransactions called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.expense_type_id) queryParams.append('expense_type_id', params.expense_type_id);
        if (params?.department_id) queryParams.append('department_id', params.department_id);
        if (params?.status && Array.isArray(params.status)) {
          params.status.forEach(s => queryParams.append('status', s));
        }
        if (params?.payment_method && Array.isArray(params.payment_method)) {
          params.payment_method.forEach(p => queryParams.append('payment_method', p));
        }
        if (params?.date_from) queryParams.append('date_from', params.date_from);
        if (params?.date_to) queryParams.append('date_to', params.date_to);
        if (params?.amount_min !== undefined) queryParams.append('amount_min', params.amount_min.toString());
        if (params?.amount_max !== undefined) queryParams.append('amount_max', params.amount_max.toString());
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`/expense/transactions/?${queryParams.toString()}`);
        console.log('[DEBUG] expenseTransactionsApi.getAllTransactions returning:', response.data.length, 'transactions');
        return response.data;
    },

    // Get transaction by ID
    getTransaction: async (id: string): Promise<ExpenseTransactionRead> => {
        console.log('[DEBUG] expenseTransactionsApi.getTransaction called with id:', id);

        const response = await CAxios.get(`/expense/transactions/${id}`);
        console.log('[DEBUG] expenseTransactionsApi.getTransaction returning:', response.data);
        return response.data;
    },

    // Create new transaction
    createTransaction: async (data: ExpenseTransactionCreateRequest): Promise<ExpenseTransactionRead> => {
        console.log('[DEBUG] expenseTransactionsApi.createTransaction called with data:', data);

        try {
            const response = await CAxios.post('/expense/transactions/', data);
            console.log('[DEBUG] expenseTransactionsApi.createTransaction success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] expenseTransactionsApi.createTransaction failed:', error);
            throw error;
        }
    },

    // Update transaction
    updateTransaction: async (id: string, data: ExpenseTransactionUpdateRequest): Promise<ExpenseTransactionRead> => {
        console.log('[DEBUG] expenseTransactionsApi.updateTransaction called with id:', id, 'data:', data);

        const response = await CAxios.put(`/expense/transactions/${id}`, data);
        console.log('[DEBUG] expenseTransactionsApi.updateTransaction updated:', response.data);
        return response.data;
    },

    // Update transaction status
    updateTransactionStatus: async (id: string, data: ExpenseTransactionUpdateRequest): Promise<ExpenseTransactionRead> => {
        console.log('[DEBUG] expenseTransactionsApi.updateTransactionStatus called with id:', id, 'data:', data);

        const response = await CAxios.put(`/expense/transactions/${id}/status`, data);
        console.log('[DEBUG] expenseTransactionsApi.updateTransactionStatus updated:', response.data);
        return response.data;
    },

    // Delete transaction
    deleteTransaction: async (id: string): Promise<void> => {
        console.log('[DEBUG] expenseTransactionsApi.deleteTransaction called with id:', id);

        await CAxios.delete(`/expense/transactions/${id}`);
        console.log('[DEBUG] expenseTransactionsApi.deleteTransaction deleted transaction with id:', id);
    },
};

export const {
    getAllTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    updateTransactionStatus,
    deleteTransaction,
} = expenseTransactionsApi;