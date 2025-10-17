import CAxios from '../index';
import type {
    ExpenseCategoryRead,
    ExpenseCategoryCreateRequest,
    ExpenseCategoryUpdateRequest
} from '@/types/expense';

export const expenseCategoriesApi = {
    // Get all expense categories
    getAllCategories: async (params?: any): Promise<ExpenseCategoryRead[]> => {
        console.log('[DEBUG] expenseCategoriesApi.getAllCategories called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.parent_only !== undefined) queryParams.append('parent_only', params.parent_only.toString());
        if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());
        if (params?.include_budget !== undefined) queryParams.append('include_budget', params.include_budget.toString());

        const response = await CAxios.get(`/expense/categories?${queryParams.toString()}`);
            console.log('[DEBUG] expenseCategoriesApi.getAllCategories returning:', response.data.length, 'categories');
            return response.data.data || response.data;
    },

    // Get category by ID
    getCategory: async (id: string): Promise<ExpenseCategoryRead> => {
        console.log('[DEBUG] expenseCategoriesApi.getCategory called with id:', id);

        const response = await CAxios.get(`/expense/categories/${id}`);
        console.log('[DEBUG] expenseCategoriesApi.getCategory returning:', response.data);
        return response.data;
    },

    // Create new category
    createCategory: async (data: ExpenseCategoryCreateRequest): Promise<ExpenseCategoryRead> => {
        console.log('[DEBUG] expenseCategoriesApi.createCategory called with data:', data);

        try {
            const response = await CAxios.post('/expense/categories', data);
            console.log('[DEBUG] expenseCategoriesApi.createCategory success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] expenseCategoriesApi.createCategory failed:', error);
            throw error;
        }
    },

    // Update category
    updateCategory: async (id: string, data: ExpenseCategoryUpdateRequest): Promise<ExpenseCategoryRead> => {
        console.log('[DEBUG] expenseCategoriesApi.updateCategory called with id:', id, 'data:', data);

        const response = await CAxios.put(`/expense/categories/${id}`, data);
        console.log('[DEBUG] expenseCategoriesApi.updateCategory updated:', response.data);
        return response.data;
    },

    // Delete category
    deleteCategory: async (id: string): Promise<void> => {
        console.log('[DEBUG] expenseCategoriesApi.deleteCategory called with id:', id);

        await CAxios.delete(`/expense/categories/${id}`);
        console.log('[DEBUG] expenseCategoriesApi.deleteCategory deleted category with id:', id);
    },
};

export const {
    getAllCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
} = expenseCategoriesApi;