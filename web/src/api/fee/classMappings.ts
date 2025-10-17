import CAxios from '../index';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type {
    FeeClassMapping,
    FeeClassMappingCreateRequest,
    FeeClassMappingUpdateRequest,
    FeeClassMappingBulkCreateRequest,
    FeeClassMappingBulkResponse,
    FeeClassMappingListResponse
} from '@/types/fee/mapping';

export const feeClassMappingsApi = {
    // Get all fee class mappings
    getAllMappings: async (params?: {
        class_id?: string;
        fee_type_id?: string;
        academic_year_id?: string;
        all_by_default?: boolean;
        skip?: number;
        limit?: number;
    }): Promise<FeeClassMappingListResponse> => {
        console.log('[DEBUG] feeClassMappingsApi.getAllMappings called with params:', params);

        const academicYearId = params?.academic_year_id || useAcademicYearStore.getState().selectedAcademicYearId;

        const queryParams = new URLSearchParams();
        if (params?.class_id) queryParams.append('class_id', params.class_id);
        if (params?.fee_type_id) queryParams.append('fee_type_id', params.fee_type_id);
        if (academicYearId) queryParams.append('academic_year_id', academicYearId);
        if (params?.all_by_default !== undefined) queryParams.append('all_by_default', params.all_by_default.toString());
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`/fee/class-mappings/?${queryParams.toString()}`);
        console.log('[DEBUG] feeClassMappingsApi.getAllMappings returning:', response.data);
        return response.data;
    },

    // Get fee class mapping by ID
    getMappingById: async (id: string): Promise<FeeClassMapping> => {
        console.log('[DEBUG] feeClassMappingsApi.getMappingById called with id:', id);

        const response = await CAxios.get(`/fee/class-mappings/${id}`);
        console.log('[DEBUG] feeClassMappingsApi.getMappingById returning:', response.data);
        return response.data;
    },

    // Create fee class mapping
    createMapping: async (data: FeeClassMappingCreateRequest): Promise<FeeClassMapping> => {
        console.log('[DEBUG] feeClassMappingsApi.createMapping called with data:', data);

        try {
            const response = await CAxios.post('/fee/class-mappings/', data);
            console.log('[DEBUG] feeClassMappingsApi.createMapping success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] feeClassMappingsApi.createMapping failed:', error);
            throw error;
        }
    },

    // Update fee class mapping
    updateMapping: async (id: string, data: FeeClassMappingUpdateRequest): Promise<FeeClassMapping> => {
        console.log('[DEBUG] feeClassMappingsApi.updateMapping called with id:', id, 'data:', data);

        const response = await CAxios.put(`/fee/class-mappings/${id}`, data);
        console.log('[DEBUG] feeClassMappingsApi.updateMapping updated:', response.data);
        return response.data;
    },

    // Delete fee class mapping
    deleteMapping: async (id: string): Promise<void> => {
        console.log('[DEBUG] feeClassMappingsApi.deleteMapping called with id:', id);

        await CAxios.delete(`/fee/class-mappings/${id}`);
        console.log('[DEBUG] feeClassMappingsApi.deleteMapping deleted mapping with id:', id);
    },

    // Bulk create fee class mappings
    bulkCreateMappings: async (data: FeeClassMappingBulkCreateRequest): Promise<FeeClassMappingBulkResponse> => {
        console.log('[DEBUG] feeClassMappingsApi.bulkCreateMappings called with data:', data);

        try {
            const response = await CAxios.post('/fee/class-mappings/bulk', data);
            console.log('[DEBUG] feeClassMappingsApi.bulkCreateMappings success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] feeClassMappingsApi.bulkCreateMappings failed:', error);
            throw error;
        }
    },
};

export const {
    getAllMappings,
    getMappingById,
    createMapping,
    updateMapping,
    deleteMapping,
    bulkCreateMappings,
} = feeClassMappingsApi;