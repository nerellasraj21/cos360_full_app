import type {
  AcademicYear,
  AcademicYearInput,
  AcademicYearDropdown,
  AcademicYearListResponse,
  ApiError
} from '@/types/masters/academicyear';
import CAxios from '../index';
import { ACADEMIC_YEARS_API_BASE } from '@/constants/api/masters/academicyears';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError: ApiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Create academic year
export const createAcademicYear = async (academicYear: AcademicYearInput): Promise<AcademicYear> => {
  try {
    const { data } = await CAxios.post(ACADEMIC_YEARS_API_BASE, academicYear);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List academic years with pagination
export const fetchAcademicYears = async (
  skip = 0,
  limit = 10
): Promise<AcademicYearListResponse> => {
  try {
    const { data } = await CAxios.get(ACADEMIC_YEARS_API_BASE, {
      params: { skip, limit, active_only: false }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get academic year by ID
export const fetchAcademicYearById = async (id: string): Promise<AcademicYear> => {
  try {
    const { data } = await CAxios.get(`${ACADEMIC_YEARS_API_BASE}${id}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update academic year
export const updateAcademicYear = async (
  id: string,
  academicYear: Partial<AcademicYearInput>
): Promise<AcademicYear> => {
  try {
    const { data } = await CAxios.put(`${ACADEMIC_YEARS_API_BASE}${id}`, academicYear);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete academic year
export const deleteAcademicYear = async (id: string): Promise<void> => {
  try {
    await CAxios.delete(`${ACADEMIC_YEARS_API_BASE}${id}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get academic years for dropdown
export const fetchAcademicYearsDropdown = async (): Promise<AcademicYearDropdown[]> => {
  try {
    const { data } = await CAxios.get(`${ACADEMIC_YEARS_API_BASE}dropdown`, {
      params: { active_only: true }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Paginated academic years for hooks compatibility
export const fetchPaginatedAcademicYears = async (
  skip: number,
  limit: number
): Promise<{ data: AcademicYear[]; hasMore: boolean; total: number }> => {
  try {
    const result = await fetchAcademicYears(skip, limit);
    const items = result.items || [];

    // Try to get total from various possible response structures
    let total = result.total || (result as any).count || 0;

    // If no total is provided by backend, estimate conservatively
    if (total === 0 && items.length > 0) {
      if (items.length === limit) {
        // Got a full page, assume at least one more page exists
        total = skip + items.length + limit;
      } else {
        // Got a partial page, this might be the last page
        total = skip + items.length;
      }
    }

    return {
      data: items,
      hasMore: items.length === limit,
      total: total
    };
  } catch (error) {
    throw handleApiError(error);
  }
};