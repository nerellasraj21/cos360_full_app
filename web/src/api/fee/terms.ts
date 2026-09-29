import CAxios from '../index';
import axios from 'axios';
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
        console.log('[Fee Terms API] Creating term with data:', data);

        try {
            // Ensure academic year is included
            if (!data.academic_year_id) {
                const academicYearId = useAcademicYearStore.getState().selectedAcademicYearId;
                if (!academicYearId) {
                    throw new Error('Academic year is required. Please select an academic year.');
                }
                data.academic_year_id = academicYearId;
            }

            const response = await CAxios.post(FEE_TERMS, data);
            console.log('[Fee Terms API] Term created successfully:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[Fee Terms API Error]', {
                status: error.response?.status,
                detail: error.response?.data?.detail,
                errors: error.response?.data?.errors,
                fullData: error.response?.data
            });

            // Better error messages
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const errorMessages = error.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
                throw new Error(`Validation error: ${errorMessages}`);
            } else if (error.message) {
                throw new Error(error.message);
            }

            throw new Error('Failed to create fee term. Please try again.');
        }
    },

    // Update term with dates
    updateTerm: async (id: string, data: FeeTermUpdateRequest): Promise<FeeTerm> => {
        console.log('[Fee Terms API] Updating term with id:', id, 'data:', data);

        try {
            const response = await CAxios.put(`${FEE_TERMS}${id}`, data);
            console.log('[Fee Terms API] Term updated successfully:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[Fee Terms API Error]', {
                status: error.response?.status,
                detail: error.response?.data?.detail,
                errors: error.response?.data?.errors,
                fullData: error.response?.data
            });

            // Better error messages
            if (error.response?.data?.detail) {
                throw new Error(error.response.data.detail);
            } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
                const errorMessages = error.response.data.errors.map((e: any) => e.msg || e.message).join(', ');
                throw new Error(`Validation error: ${errorMessages}`);
            } else if (error.message) {
                throw new Error(error.message);
            }

            throw new Error('Failed to update fee term. Please try again.');
        }
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