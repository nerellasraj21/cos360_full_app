import CAxios from '../index';
import type {
    FeeType,
    FeeTypeCreateRequest,
    FeeTypeUpdateRequest,
    FeeTypeDropdown
} from '@/types/fee';

export const feeTypesApi = {
    // Get all fee types
    getAllTypes: async (params?: {
        category_id?: string;
        recurring_only?: boolean;
        active_only?: boolean;
        skip?: number;
        limit?: number;
    }): Promise<FeeType[]> => {
        console.log('[DEBUG] feeTypesApi.getAllTypes called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.category_id) queryParams.append('category_id', params.category_id);
        if (params?.recurring_only !== undefined) queryParams.append('recurring_only', params.recurring_only.toString());
        if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`/fee/types/?${queryParams.toString()}`);
        console.log('[DEBUG] feeTypesApi.getAllTypes returning:', response.data.length, 'types');
        return response.data;
    },

    // Get type by ID
    getType: async (id: string): Promise<FeeType> => {
        console.log('[DEBUG] feeTypesApi.getType called with id:', id);

        const response = await CAxios.get(`/fee/types/${id}`);
        console.log('[DEBUG] feeTypesApi.getType returning:', response.data);
        return response.data;
    },

    // Create new type
    createType: async (data: FeeTypeCreateRequest): Promise<FeeType> => {
        console.log('[DEBUG] feeTypesApi.createType called with data:', data);

        const response = await CAxios.post('/fee/types/', data);
        console.log('[DEBUG] feeTypesApi.createType created:', response.data);
        return response.data;
    },

    // Update type
    updateType: async (id: string, data: FeeTypeUpdateRequest): Promise<FeeType> => {
        console.log('[DEBUG] feeTypesApi.updateType called with id:', id, 'data:', data);

        const response = await CAxios.put(`/fee/types/${id}`, data);
        console.log('[DEBUG] feeTypesApi.updateType updated:', response.data);
        return response.data;
    },

    // Delete type
    deleteType: async (id: string): Promise<void> => {
        console.log('[DEBUG] feeTypesApi.deleteType called with id:', id);

        await CAxios.delete(`/fee/types/${id}`);
        console.log('[DEBUG] feeTypesApi.deleteType deleted fee type with id:', id);
    },

    // Get dropdown options
    getDropdownOptions: async (params?: {
        fee_category_id?: string;
    }): Promise<FeeTypeDropdown[]> => {
        console.log('[DEBUG] feeTypesApi.getDropdownOptions called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.fee_category_id) queryParams.append('fee_category_id', params.fee_category_id);

        const response = await CAxios.get(`/fee/types/dropdown${queryParams.toString() ? '?' + queryParams.toString() : ''}`);
        console.log('[DEBUG] feeTypesApi.getDropdownOptions returning:', response.data.length, 'options');
        return response.data;
    },
};

export const {
    getAllTypes,
    getType,
    createType,
    updateType,
    deleteType,
    getDropdownOptions,
} = feeTypesApi;