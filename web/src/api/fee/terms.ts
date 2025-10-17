import CAxios from '../index';
import { FEE_TERMS, FEE_TERMS_DROPDOWN } from '@/constants/api/fee';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type {
    FeeTerm,
    FeeTermDate,
    FeeTermCreateRequest,
    FeeTermUpdateRequest,
    FeeTermDropdown
} from '@/types/fee';

export const feeTermsApi = {
    // Get all fee terms
    getAllTerms: async (params?: {
        academic_year_id?: string;
        skip?: number;
        limit?: number;
    }): Promise<FeeTerm[]> => {
        console.log('[DEBUG] feeTermsApi.getAllTerms called with params:', params);

        const academicYearId = params?.academic_year_id || useAcademicYearStore.getState().selectedAcademicYearId;

        const queryParams = new URLSearchParams();
        if (academicYearId) queryParams.append('academic_year_id', academicYearId);
        if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

        const response = await CAxios.get(`${FEE_TERMS}?${queryParams.toString()}`);
        console.log('[DEBUG] feeTermsApi.getAllTerms returning:', response.data.items || response.data);
        return response.data.items || response.data;
    },

    // Get term by ID
    getTerm: async (id: string): Promise<FeeTerm> => {
        console.log('[DEBUG] feeTermsApi.getTerm called with id:', id);

        const response = await CAxios.get(`${FEE_TERMS}${id}`);
        console.log('[DEBUG] feeTermsApi.getTerm returning:', response.data);
        return response.data;
    },

    // Get terms dropdown
    getTermsDropdown: async (feeTypeId?: string): Promise<FeeTermDropdown[]> => {
        const params = feeTypeId ? { fee_type_id: feeTypeId } : {};
        const response = await CAxios.get(FEE_TERMS_DROPDOWN, { params });
        return response.data;
    },

    // Get term dates only
    getTermDates: async (termId: string): Promise<FeeTermDate[]> => {
        const response = await CAxios.get(`${FEE_TERMS}${termId}/dates`);
        return response.data;
    },

    // Create new term with dates
    createTerm: async (data: FeeTermCreateRequest): Promise<FeeTerm> => {
        console.log('[DEBUG] feeTermsApi.createTerm called with data:', data);

        try {
            const response = await CAxios.post(FEE_TERMS, data);
            console.log('[DEBUG] feeTermsApi.createTerm success:', response.data);
            return response.data;
        } catch (error) {
            console.error('[DEBUG] feeTermsApi.createTerm failed:', error);
            throw error;
        }
    },

    // Update term with dates
    updateTerm: async (id: string, data: FeeTermUpdateRequest): Promise<FeeTerm> => {
        console.log('[DEBUG] feeTermsApi.updateTerm called with id:', id, 'data:', data);

        const response = await CAxios.put(`${FEE_TERMS}${id}`, data);
        console.log('[DEBUG] feeTermsApi.updateTerm updated:', response.data);
        return response.data;
    },

    // Delete term
    deleteTerm: async (id: string): Promise<void> => {
        console.log('[DEBUG] feeTermsApi.deleteTerm called with id:', id);

        await CAxios.delete(`${FEE_TERMS}${id}`);
        console.log('[DEBUG] feeTermsApi.deleteTerm deleted fee term with id:', id);
    },

    // Delete term date
    deleteTermDate: async (dateId: string): Promise<void> => {
        console.log('[DEBUG] feeTermsApi.deleteTermDate called with dateId:', dateId);

        await CAxios.delete(`${FEE_TERMS}dates/${dateId}`);
        console.log('[DEBUG] feeTermsApi.deleteTermDate deleted term date with id:', dateId);
    },
};

export const {
    getAllTerms,
    getTerm,
    getTermsDropdown,
    getTermDates,
    createTerm,
    updateTerm,
    deleteTerm,
    deleteTermDate,
} = feeTermsApi;