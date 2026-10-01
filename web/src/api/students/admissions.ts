import type {
  StudentAdmissionCreate,
  StudentAdmissionResponse,
  StudentAdmissionUpdate,
  StudentDropdownItem,
  StudentDropdownSimpleItem,
  StudentOut,
  AdmissionTypeOption,
  BulkAdmissionUploadResponse
} from '@/types/admission';
import type { ApiError, PaginatedResponse } from '@/types/common';
import CAxios from '../index';
import {
  STUDENTS_BASE,
  STUDENT_ADMISSIONS,
  STUDENT_ADMISSIONS_LIST,
  STUDENT_ADMISSIONS_SEARCH,
  STUDENT_ADMISSIONS_DROPDOWN,
  STUDENT_ADMISSIONS_DROPDOWN_SIMPLE,
  STUDENT_ADMISSIONS_BULK_TEMPLATE,
  STUDENT_ADMISSIONS_BULK_UPLOAD
} from '@/constants/api/students';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError = error.response.data;

    // Handle validation errors (422) - detail is an array of error objects
    if (Array.isArray(apiError.detail)) {
      const validationErrors = apiError.detail
        .map((err: any) => {
          const field = err.loc?.[err.loc.length - 1] || err.loc?.[0] || 'unknown';
          return `${field}: ${err.msg}`;
        })
        .join('; ');
      return new Error(validationErrors || 'Validation error');
    }

    // Handle string error messages
    if (typeof apiError.detail === 'string') {
      return new Error(apiError.detail);
    }

    // Handle object detail (e.g. FastAPI nested errors)
    if (apiError.detail && typeof apiError.detail === 'object') {
      return new Error(JSON.stringify(apiError.detail));
    }

    // Handle non-standard formats
    if (apiError.message) return new Error(apiError.message);
    if (typeof apiError === 'string') return new Error(apiError);

    return new Error(`Server error (${error.response.status})`);
  }
  return new Error(error.message || 'Network error');
};

export interface NextAdmissionNumberResponse {
  next_number: string;
  format: string;
  type: string;
  note: string;
}

// Fetch format hint for admission number input
export const getNextAdmissionNumber = async (
  type: 'pre_primary' | 'regular'
): Promise<NextAdmissionNumberResponse> => {
  const { data } = await CAxios.get(`${STUDENTS_BASE}/admission/next-admission-number`, {
    params: { type },
  });
  return data;
};

// Create student admission
export const createStudentAdmission = async (
  admissionData: StudentAdmissionCreate
): Promise<StudentAdmissionResponse> => {
  try {
    const { data } = await CAxios.post(STUDENT_ADMISSIONS, admissionData);
    return data;
  } catch (error: any) {
    throw handleApiError(error);
  }
};

// Get admission by student ID
export const getAdmissionByStudentId = async (
  studentId: string
): Promise<StudentAdmissionResponse> => {
  try {
    const { data } = await CAxios.get(`${STUDENT_ADMISSIONS}id/${studentId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update student admission
export const updateStudentAdmission = async (
  studentId: string,
  admissionData: StudentAdmissionUpdate
): Promise<StudentAdmissionResponse> => {
  try {
    const { data } = await CAxios.patch(`${STUDENT_ADMISSIONS}${studentId}`, admissionData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get student by admission ID
export const getStudentByAdmissionId = async (
  admissionId: string
): Promise<StudentOut> => {
  try {
    const { data } = await CAxios.get(`${STUDENT_ADMISSIONS}by-admission/${admissionId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Search students
export const searchStudents = async (
  query: string
): Promise<StudentOut[]> => {
  try {
    const { data } = await CAxios.get(STUDENT_ADMISSIONS_SEARCH, {
      params: { query }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List all admissions
export const listAdmissions = async (
  skip = 0,
  limit = 10
): Promise<PaginatedResponse<StudentAdmissionResponse>> => {
  try {
    const { data } = await CAxios.get(STUDENT_ADMISSIONS_LIST, {
      params: {
        skip,
        limit,
        sort_by: 'created_at',
        sort_order: 'desc'
      }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Toggle student active status
export const toggleStudentActiveStatus = async (studentId: string, isActive: boolean): Promise<StudentAdmissionResponse> => {
  try {
    const { data } = await CAxios.patch(`${STUDENT_ADMISSIONS}${studentId}/toggle-active`, { is_active: isActive });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get students dropdown (detailed)
export const fetchStudentsDropdown = async (
  activeOnly = true,
  classId?: string,
  sectionId?: string
): Promise<StudentDropdownItem[]> => {
  try {
    const { data } = await CAxios.get(STUDENT_ADMISSIONS_DROPDOWN, {
      params: {
        active_only: activeOnly,
        ...(classId && { class_id: classId }),
        ...(sectionId && { section_id: sectionId }),
      }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get students dropdown (simple)
export const fetchStudentsDropdownSimple = async (
  activeOnly = true,
  classId?: string,
  sectionId?: string
): Promise<StudentDropdownSimpleItem[]> => {
  try {
    const { data } = await CAxios.get(STUDENT_ADMISSIONS_DROPDOWN_SIMPLE, {
      params: {
        active_only: activeOnly,
        ...(classId && { class_id: classId }),
        ...(sectionId && { section_id: sectionId }),
      }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get admission types dropdown
export const fetchAdmissionTypesDropdown = async (): Promise<AdmissionTypeOption[]> => {
  try {
    const { data } = await CAxios.get('/students/admission/admission-types/dropdown');
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Upload student photo
export const uploadStudentPhoto = async (
  studentId: string,
  file: File
): Promise<StudentAdmissionResponse> => {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    const { data } = await CAxios.post(
      `${STUDENT_ADMISSIONS}id/${studentId}/photo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete student photo
export const deleteStudentPhoto = async (studentId: string): Promise<void> => {
  try {
    await CAxios.delete(`${STUDENT_ADMISSIONS}id/${studentId}/photo`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Download bulk admission upload template
export const downloadBulkAdmissionTemplate = async (): Promise<Blob> => {
  try {
    const response = await CAxios.get(STUDENT_ADMISSIONS_BULK_TEMPLATE, {
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Bulk upload admissions via spreadsheet
export const bulkUploadAdmissions = async (
  file: File
): Promise<BulkAdmissionUploadResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await CAxios.post(STUDENT_ADMISSIONS_BULK_UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Legacy functions for backward compatibility
export const fetchStudentAdmissions = listAdmissions;
export const fetchStudentById = getAdmissionByStudentId;
export const updateStudent = updateStudentAdmission;
export const searchStudentAdmissions = searchStudents;