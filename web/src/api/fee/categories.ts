import CAxios from '../index';
import axios from 'axios';
import { FEE_CATEGORIES, FEE_CATEGORIES_DROPDOWN } from '@/constants/api/fee';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type {
    FeeCategory,
    FeeCategoryCreateRequest,
    FeeCategoryUpdateRequest,
    FeeCategorySearchParams,
    FeeCategoryListResponse,
    FeeCategoryDropdownOption,
    FeeCategoryHealthCheck,
} from '@/types/fee/category';

// ===== HELPER FUNCTIONS =====

/**
 * Validates pagination parameters
 */
function validatePaginationParams(params: { skip?: number; limit?: number }) {
    if (params.limit !== undefined) {
        if (params.limit < 1 || params.limit > 500) {
            throw new Error('Limit must be between 1 and 500');
        }
    }
    if (params.skip !== undefined && params.skip < 0) {
        throw new Error('Skip/offset must be greater than or equal to 0');
    }
}

/**
 * Centralized error handler for API calls
 */
function handleApiError(error: unknown): never {
    // Check if it's an axios error
    if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const detail = error.response?.data?.detail;
        const errors = error.response?.data?.errors;

        // Log the full error for debugging
        console.error('[Fee Categories API Error]', {
            status,
            detail,
            errors,
            fullData: error.response?.data
        });

        // Handle validation errors (400, 422)
        if (status === 400 || status === 422) {
            if (Array.isArray(errors)) {
                const errorMessages = errors.map((e: any) => e.msg || e.message).join(', ');
                throw new Error(`Validation error: ${errorMessages}`);
            }
            if (detail) {
                throw new Error(detail);
            }
            throw new Error('Validation error. Please check your input.');
        }

        // Handle other errors
        if (detail) {
            throw new Error(detail);
        }
    }

    if (error instanceof Error) {
        throw error;
    }

    throw new Error('An unexpected error occurred');
}

// ===== API FUNCTIONS =====

export const feeCategoriesApi = {
    /**
     * Health check endpoint
     * @returns Health status of fee categories module
     */
    healthCheck: async (): Promise<FeeCategoryHealthCheck> => {
        try {
            const response = await CAxios.get<FeeCategoryHealthCheck>(`${FEE_CATEGORIES}health`);
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    /**
     * Get all fee categories with pagination
     * @param params - Search and pagination parameters
     * @returns Paginated list of fee categories
     */
    getAllCategories: async (
        params?: FeeCategorySearchParams
    ): Promise<FeeCategoryListResponse> => {
        try {
            // Validate pagination params
            if (params) {
                validatePaginationParams(params);
            }

            // Set defaults
            const searchParams = {
                skip: params?.skip ?? 0,
                limit: params?.limit ?? 50,
                academic_year_id: params?.academic_year_id,
                category_status: params?.category_status,
            };

            // Auto-fill academic year if not provided
            if (!searchParams.academic_year_id) {
                const academicYearId = useAcademicYearStore.getState().selectedAcademicYearId;
                if (academicYearId) {
                    searchParams.academic_year_id = academicYearId;
                }
            }

            // Build query string
            const queryParams = new URLSearchParams();
            if (searchParams.academic_year_id) {
                queryParams.append('academic_year_id', searchParams.academic_year_id);
            }
            if (searchParams.category_status) {
                queryParams.append('category_status', searchParams.category_status);
            }
            queryParams.append('skip', searchParams.skip.toString());
            queryParams.append('limit', searchParams.limit.toString());

            const response = await CAxios.get<FeeCategoryListResponse | FeeCategory[]>(
                `${FEE_CATEGORIES}?${queryParams.toString()}`
            );

            console.log('[Fee Categories API] Raw response:', response.data);

            // Handle both paginated and array responses
            if (Array.isArray(response.data)) {
                // Backend returned array instead of paginated response
                console.log('[Fee Categories API] Converting array to paginated response');
                return {
                    items: response.data,
                    total: response.data.length,
                    skip: searchParams.skip,
                    limit: searchParams.limit,
                };
            }

            // Backend returned proper paginated response
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    /**
     * Get category by ID
     * @param id - Category ID
     * @returns Single category
     */
    getCategory: async (id: string): Promise<FeeCategory> => {
        try {
            const response = await CAxios.get<FeeCategory>(`${FEE_CATEGORIES}${id}`);
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    /**
     * Get categories dropdown options
     * @param academic_year_id - Optional academic year ID
     * @returns List of category dropdown options
     */
    getCategoriesDropdown: async (
        academic_year_id?: string
    ): Promise<FeeCategoryDropdownOption[]> => {
        try {
            let yearId = academic_year_id;
            if (!yearId) {
                yearId = useAcademicYearStore.getState().selectedAcademicYearId;
            }

            const queryParams = new URLSearchParams();
            if (yearId) {
                queryParams.append('academic_year_id', yearId);
            }

            const response = await CAxios.get<FeeCategoryDropdownOption[]>(
                `${FEE_CATEGORIES_DROPDOWN}?${queryParams.toString()}`
            );
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    /**
     * Create new category
     * @param data - Category creation data
     * @returns Created category
     */
    createCategory: async (data: FeeCategoryCreateRequest): Promise<FeeCategory> => {
        try {
            // Auto-fill academic year if not provided
            const requestData = { ...data };
            if (!requestData.academic_year_id) {
                const academicYearId = useAcademicYearStore.getState().selectedAcademicYearId;
                if (!academicYearId) {
                    throw new Error('Academic year is required. Please select an academic year.');
                }
                requestData.academic_year_id = academicYearId;
            }

            // Log the request data for debugging
            console.log('[Fee Categories] Creating category with data:', requestData);

            const response = await CAxios.post<FeeCategory>(FEE_CATEGORIES, requestData);

            console.log('[Fee Categories] Category created successfully:', response.data);
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    /**
     * Update category
     * @param id - Category ID
     * @param data - Category update data
     * @returns Updated category
     */
    updateCategory: async (
        id: string,
        data: FeeCategoryUpdateRequest
    ): Promise<FeeCategory> => {
        try {
            // Auto-fill academic year if not provided
            const requestData = { ...data };
            if (!requestData.academic_year_id) {
                const academicYearId = useAcademicYearStore.getState().selectedAcademicYearId;
                if (academicYearId) {
                    requestData.academic_year_id = academicYearId;
                }
            }

            const response = await CAxios.put<FeeCategory>(
                `${FEE_CATEGORIES}${id}`,
                requestData
            );
            return response.data;
        } catch (error) {
            handleApiError(error);
        }
    },

    /**
     * Delete category
     * @param id - Category ID
     */
    deleteCategory: async (id: string): Promise<void> => {
        try {
            await CAxios.delete(`${FEE_CATEGORIES}${id}`);
        } catch (error) {
            handleApiError(error);
        }
    },
};

// Named exports for convenience
export const {
    healthCheck,
    getAllCategories,
    getCategory,
    getCategoriesDropdown,
    createCategory,
    updateCategory,
    deleteCategory,
} = feeCategoriesApi;
