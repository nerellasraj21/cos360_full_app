import CAxios from '../index';
import type {
    ExpenseType,
    ExpenseTypeCreateRequest,
    ExpenseTypeUpdateRequest,
    ExpenseTypeQueryParams
} from '@/types/expense';

export const expenseTypesApi = {
    // Get all expense types
    getAllTypes: async (params?: ExpenseTypeQueryParams): Promise<ExpenseType[]> => {
        console.log('[DEBUG] expenseTypesApi.getAllTypes called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.category_id) queryParams.append('category_id', params.category_id);
        if (params?.recurring_only !== undefined) queryParams.append('recurring_only', params.recurring_only.toString());
        if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

        const response = await CAxios.get(`/expense/types?${queryParams.toString()}`);
        console.log('[DEBUG] expenseTypesApi.getAllTypes returning:', response.data.length, 'types');
        return response.data;
    },

    // Get type by ID
    getType: async (id: string): Promise<ExpenseType> => {
        console.log('[DEBUG] expenseTypesApi.getType called with id:', id);

        const response = await CAxios.get(`/expense/types/${id}`);
        console.log('[DEBUG] expenseTypesApi.getType returning:', response.data);
        return response.data;
    },

    // Create new type
    createType: async (data: ExpenseTypeCreateRequest): Promise<ExpenseType> => {
        console.log('[DEBUG] expenseTypesApi.createType called with data:', data);

        try {
            const response = await CAxios.post('/expense/types', data);
            console.log('[DEBUG] expenseTypesApi.createType success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] expenseTypesApi.createType failed:', error);
            throw error;
        }
    },

    // Update type
    updateType: async (id: string, data: ExpenseTypeUpdateRequest): Promise<ExpenseType> => {
        console.log('[DEBUG] expenseTypesApi.updateType called with id:', id, 'data:', data);

        const response = await CAxios.put(`/expense/types/${id}`, data);
        console.log('[DEBUG] expenseTypesApi.updateType updated:', response.data);
        return response.data;
    },

    // Delete type
    deleteType: async (id: string): Promise<void> => {
        console.log('[DEBUG] expenseTypesApi.deleteType called with id:', id);

        await CAxios.delete(`/expense/types/${id}`);
        console.log('[DEBUG] expenseTypesApi.deleteType deleted type with id:', id);
    },
};

export const {
    getAllTypes,
    getType,
    createType,
    updateType,
    deleteType,
} = expenseTypesApi;