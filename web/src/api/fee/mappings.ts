 import CAxios from '../index';
import type {
    FeeClassMapping,
    FeeTermAmount,
    FeeClassMappingCreateRequest,
    FeeClassMappingUpdateRequest,
    FeeTermAmountCreateRequest,
    FeeTermAmountUpdateRequest
} from '@/types/fee';
import { useAcademicYearStore } from '@/lib/academicYearStore';

export const feeMappingsApi = {
    // Get all fee class mappings
    getAllMappings: async (params?: {
        fee_type_id?: string;
        class_id?: string;
        academic_year_id?: string;
        is_active?: boolean;
        skip?: number;
        limit?: number;
    }): Promise<FeeClassMapping[]> => {
        console.log('[DEBUG] feeMappingsApi.getAllMappings called with params:', params);

        const queryParams = new URLSearchParams();
        if (params?.fee_type_id) queryParams.append('fee_type_id', params.fee_type_id);
        if (params?.class_id) queryParams.append('class_id', params.class_id);
        if (params?.academic_year_id || useAcademicYearStore.getState().selectedAcademicYearId) queryParams.append('academic_year_id', params?.academic_year_id || useAcademicYearStore.getState().selectedAcademicYearId);
        if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`/fee/mappings/?${queryParams.toString()}`);
        console.log('[DEBUG] feeMappingsApi.getAllMappings returning:', response.data.length, 'mappings');
        return response.data;
    },

    // Get mapping by ID
    getMapping: async (id: number): Promise<FeeClassMapping> => {
        console.log('[DEBUG] feeMappingsApi.getMapping called with id:', id);

        const response = await CAxios.get(`/fee/mappings/${id}`);
        console.log('[DEBUG] feeMappingsApi.getMapping returning:', response.data);
        return response.data;
    },

    // Create new mapping
    createMapping: async (data: FeeClassMappingCreateRequest): Promise<FeeClassMapping> => {
        console.log('[DEBUG] feeMappingsApi.createMapping called with data:', data);

        try {
            const response = await CAxios.post('/fee/mappings/', data);
            console.log('[DEBUG] feeMappingsApi.createMapping success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] feeMappingsApi.createMapping failed:', error);
            throw error;
        }
    },

    // Update mapping
    updateMapping: async (id: number, data: FeeClassMappingUpdateRequest): Promise<FeeClassMapping> => {
        console.log('[DEBUG] feeMappingsApi.updateMapping called with id:', id, 'data:', data);

        const response = await CAxios.put(`/fee/mappings/${id}`, data);
        console.log('[DEBUG] feeMappingsApi.updateMapping updated:', response.data);
        return response.data;
    },

    // Delete mapping
    deleteMapping: async (id: number): Promise<void> => {
        console.log('[DEBUG] feeMappingsApi.deleteMapping called with id:', id);

        await CAxios.delete(`/fee/mappings/${id}`);
        console.log('[DEBUG] feeMappingsApi.deleteMapping deleted mapping with id:', id);
    },

    // Term amounts management
    setTermAmounts: async (mappingId: number, termAmounts: FeeTermAmountCreateRequest[]): Promise<FeeTermAmount[]> => {
        console.log('[DEBUG] feeMappingsApi.setTermAmounts called with mappingId:', mappingId, 'termAmounts:', termAmounts);

        const response = await CAxios.post(`/fee/mappings/${mappingId}/term-amounts`, { term_amounts: termAmounts });
        console.log('[DEBUG] feeMappingsApi.setTermAmounts set term amounts:', response.data);
        return response.data;
    },

    updateTermAmount: async (id: number, data: FeeTermAmountUpdateRequest): Promise<FeeTermAmount> => {
        console.log('[DEBUG] feeMappingsApi.updateTermAmount called with id:', id, 'data:', data);

        const response = await CAxios.put(`/fee/term-amounts/${id}`, data);
        console.log('[DEBUG] feeMappingsApi.updateTermAmount updated:', response.data);
        return response.data;
    },

    getTermAmounts: async (mappingId: number): Promise<FeeTermAmount[]> => {
        console.log('[DEBUG] feeMappingsApi.getTermAmounts called with mappingId:', mappingId);

        const response = await CAxios.get(`/fee/mappings/${mappingId}/term-amounts`);
        console.log('[DEBUG] feeMappingsApi.getTermAmounts returning:', response.data);
        return response.data;
    },

    // New endpoints for class mapping term amounts
    createClassMappingTermAmounts: async (data: {
        fee_class_mapping_id: string;
        term_amounts: { term_id: string; term_amount: number }[];
    }): Promise<any> => {
        console.log('[DEBUG] feeMappingsApi.createClassMappingTermAmounts called with data:', data);

        const response = await CAxios.post('/fee/class-mapping-term-amounts/', data);
        console.log('[DEBUG] feeMappingsApi.createClassMappingTermAmounts success:', response.data);
        return response.data;
    },

    updateClassMappingTermAmounts: async (data: {
        fee_class_mapping_id: string;
        term_amounts: { id: string; term_id: string; term_amount: number }[];
    }): Promise<any> => {
        console.log('[DEBUG] feeMappingsApi.updateClassMappingTermAmounts called with data:', data);

        const response = await CAxios.put('/fee/class-mapping-term-amounts/', data);
        console.log('[DEBUG] feeMappingsApi.updateClassMappingTermAmounts success:', response.data);
        return response.data;
    },

    deleteClassMappingTermAmounts: async (data: {
        fee_class_mapping_id: string;
        term_amounts: { id: string }[];
    }): Promise<any> => {
        console.log('[DEBUG] feeMappingsApi.deleteClassMappingTermAmounts called with data:', data);

        const response = await CAxios.delete('/fee/class-mapping-term-amounts/', { data });
        console.log('[DEBUG] feeMappingsApi.deleteClassMappingTermAmounts success:', response.data);
        return response.data;
    },
};

export const {
    getAllMappings,
    getMapping,
    createMapping,
    updateMapping,
    deleteMapping,
    setTermAmounts,
    updateTermAmount,
    getTermAmounts,
    createClassMappingTermAmounts,
    updateClassMappingTermAmounts,
    deleteClassMappingTermAmounts,
} = feeMappingsApi;

// Bulk operations
export const bulkCreateClassMappings = async (data: {
    fee_type_id: string;
    class_id: string;
    academic_year_id: string;
    mappings: {
        term_amounts: {
            fee_term_date_id: string;
            amount: number;
        }[];
    }[];
}): Promise<{
    success: boolean;
    created_count: number;
    total_term_amounts: number;
    message: string;
    created_mappings: any[];
}> => {
    console.log('[DEBUG] bulkCreateClassMappings called with data:', data);

    try {
        const response = await CAxios.post('/fee/class-mappings/bulk', data);
        console.log('[DEBUG] bulkCreateClassMappings success:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG] bulkCreateClassMappings failed:', error);
        throw error;
    }
};

export const bulkCreateStudentMappings = async (data: {
    fee_type_id: string;
    student_id: string;
    academic_year_id: string;
    mappings: {
        term_amounts: {
            fee_term_date_id: string;
            amount: number;
        }[];
    }[];
}): Promise<{
    success: boolean;
    created_count: number;
    total_term_amounts: number;
    message: string;
    created_mappings: any[];
}> => {
    console.log('[DEBUG] bulkCreateStudentMappings called with data:', data);

    try {
        const response = await CAxios.post('/fee/student-mappings/bulk', data);
        console.log('[DEBUG] bulkCreateStudentMappings success:', response.data);
        return response.data;
    } catch (error) {
        console.error('[DEBUG] bulkCreateStudentMappings failed:', error);
        throw error;
    }
};