import CAxios from '../index';
import { FEE_CATEGORIES, FEE_CATEGORIES_DROPDOWN } from '@/constants/api/fee';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type {
    FeeCategory,
    FeeCategoryCreateRequest,
    FeeCategoryUpdateRequest,
    FeeType
} from '@/types/fee';

export const feeCategoriesApi = {
    // Get all fee categories
    getAllCategories: async (params?: {
        academic_year_id?: string;
        skip?: number;
        limit?: number;
    }): Promise<FeeCategory[]> => {
        console.log('[DEBUG] feeCategoriesApi.getAllCategories called with params:', params);

        params = params || {};
        if (!params.academic_year_id) {
            params.academic_year_id = useAcademicYearStore.getState().selectedAcademicYearId;
        }

        const queryParams = new URLSearchParams();
        if (params?.academic_year_id) queryParams.append('academic_year_id', params.academic_year_id);
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`${FEE_CATEGORIES}?${queryParams.toString()}`);
        console.log('[DEBUG] feeCategoriesApi.getAllCategories returning:', response.data.items || response.data);
        return response.data.items || response.data;
    },

    // Get category by ID
    getCategory: async (id: string): Promise<FeeCategory> => {
        console.log('[DEBUG] feeCategoriesApi.getCategory called with id:', id);

        const response = await CAxios.get(`${FEE_CATEGORIES}${id}`);
        console.log('[DEBUG] feeCategoriesApi.getCategory returning:', response.data);
        return response.data;
    },

    // Get categories dropdown
    getCategoriesDropdown: async (academic_year_id?: string): Promise<{ id: string; category_name: string }[]> => {
        if (!academic_year_id) {
            academic_year_id = useAcademicYearStore.getState().selectedAcademicYearId;
        }
        const queryParams = new URLSearchParams();
        if (academic_year_id) queryParams.append('academic_year_id', academic_year_id);

        const response = await CAxios.get(`${FEE_CATEGORIES_DROPDOWN}?${queryParams.toString()}`);
        return response.data;
    },

    // Create new category
    createCategory: async (data: FeeCategoryCreateRequest): Promise<FeeCategory> => {
        console.log('[DEBUG] feeCategoriesApi.createCategory called with data:', data);

        // if (!data.academic_year_id) {
            data.academic_year_id = useAcademicYearStore.getState().selectedAcademicYearId;
            console.log("data.academic_year_id",data.academic_year_id)
            console.log("useAcademicYearStore.getState().selectedAcademicYearId",useAcademicYearStore.getState().selectedAcademicYearId)
        
        // }

        try {
            const response = await CAxios.post(FEE_CATEGORIES, data);
            console.log('[DEBUG] feeCategoriesApi.createCategory success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] feeCategoriesApi.createCategory failed:', error);
            throw error;
        }
    },

    // Update category
    updateCategory: async (id: string, data: FeeCategoryUpdateRequest): Promise<FeeCategory> => {
        console.log('[DEBUG] feeCategoriesApi.updateCategory called with id:', id, 'data:', data);

        if (!data.academic_year_id) {
            data.academic_year_id = useAcademicYearStore.getState().selectedAcademicYearId;
        }

        const response = await CAxios.put(`${FEE_CATEGORIES}${id}`, data);
        console.log('[DEBUG] feeCategoriesApi.updateCategory updated:', response.data);
        return response.data;
    },

    // Delete category
    deleteCategory: async (id: string): Promise<void> => {
        console.log('[DEBUG] feeCategoriesApi.deleteCategory called with id:', id);

        await CAxios.delete(`${FEE_CATEGORIES}${id}`);
        console.log('[DEBUG] feeCategoriesApi.deleteCategory deleted category with id:', id);
    },

};

export const {
    getAllCategories,
    getCategory,
    getCategoriesDropdown,
    createCategory,
    updateCategory,
    deleteCategory,
} = feeCategoriesApi;