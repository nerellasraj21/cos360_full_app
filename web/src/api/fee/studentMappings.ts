import CAxios from '../index';
import { FEE_STUDENT_MAPPINGS, FEE_STUDENT_MAPPINGS_BULK } from '@/constants/api/fee';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type {
    FeeStudentMapping,
    FeeStudentMappingCreateRequest,
    FeeStudentMappingUpdateRequest,
    FeeStudentMappingBulkCreateRequest,
    FeeStudentMappingBulkResponse,
    FeeStudentMappingListResponse
} from '@/types/fee/mapping';

export const feeStudentMappingsApi = {
    // Create individual fee student mapping
    createMapping: async (data: FeeStudentMappingCreateRequest): Promise<FeeStudentMapping> => {
        console.log('[DEBUG] feeStudentMappingsApi.createMapping called with data:', data);

        try {

            const response = await CAxios.post(FEE_STUDENT_MAPPINGS, data);
            console.log('[DEBUG] feeStudentMappingsApi.createMapping success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] feeStudentMappingsApi.createMapping failed:', error);
            throw error;
        }
    },

    // Get all fee student mappings with optional filtering
    getAllMappings: async (params?: {
        student_id?: string;
        class_id?: string;
        section_id?: string;
        fee_type_id?: string;
        academic_year_id?: string;
    }): Promise<FeeStudentMapping[] | FeeStudentMappingListResponse> => {
        console.log('[DEBUG] feeStudentMappingsApi.getAllMappings called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.student_id) queryParams.append('student_id', params.student_id);
        if (params?.class_id) queryParams.append('class_id', params.class_id);
        if (params?.section_id) queryParams.append('section_id', params.section_id);
        if (params?.fee_type_id) queryParams.append('fee_type_id', params.fee_type_id);
        const academicYearId = params?.academic_year_id || useAcademicYearStore.getState().selectedAcademicYearId;
        if (academicYearId) queryParams.append('academic_year_id', academicYearId);


        const response = await CAxios.get(`${FEE_STUDENT_MAPPINGS}?${queryParams.toString()}`);
        console.log('[DEBUG] feeStudentMappingsApi.getAllMappings returning:', Array.isArray(response.data) ? response.data.length : response.data.items?.length || 0, 'mappings');
        return response.data;
    },

    // Get single fee student mapping by ID
    getMappingById: async (mappingId: string): Promise<FeeStudentMapping> => {
        console.log('[DEBUG] feeStudentMappingsApi.getMappingById called with mappingId:', mappingId);

        const response = await CAxios.get(`${FEE_STUDENT_MAPPINGS}${mappingId}`);
        console.log('[DEBUG] feeStudentMappingsApi.getMappingById success:', response.data);
        return response.data;
    },

    // Update fee student mapping
    updateMapping: async (mappingId: string, data: FeeStudentMappingUpdateRequest): Promise<FeeStudentMapping> => {
        console.log('[DEBUG] feeStudentMappingsApi.updateMapping called with mappingId:', mappingId, 'data:', data);

        const response = await CAxios.put(`${FEE_STUDENT_MAPPINGS}${mappingId}`, data);
        console.log('[DEBUG] feeStudentMappingsApi.updateMapping success:', response.data);
        return response.data;
    },

    // Delete fee student mapping
    deleteMapping: async (mappingId: string): Promise<{ message: string }> => {
        console.log('[DEBUG] feeStudentMappingsApi.deleteMapping called with mappingId:', mappingId);

        const response = await CAxios.delete(`${FEE_STUDENT_MAPPINGS}${mappingId}`);
        console.log('[DEBUG] feeStudentMappingsApi.deleteMapping success:', response.data);
        return response.data;
    },

    // Bulk create fee student mappings
    bulkCreateMappings: async (data: FeeStudentMappingBulkCreateRequest): Promise<FeeStudentMappingBulkResponse> => {
        console.log('[DEBUG] feeStudentMappingsApi.bulkCreateMappings called with data:', data);

        const response = await CAxios.post(FEE_STUDENT_MAPPINGS_BULK, data);
        console.log('[DEBUG] feeStudentMappingsApi.bulkCreateMappings success:', response.data);
        return response.data;
    },
};

export const {
    createMapping,
    getAllMappings,
    getMappingById,
    updateMapping,
    deleteMapping,
    bulkCreateMappings,
} = feeStudentMappingsApi;