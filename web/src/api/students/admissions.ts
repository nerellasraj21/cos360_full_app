import type {
  StudentAdmissionCreate,
  StudentAdmissionResponse,
  StudentAdmissionUpdate,
  StudentDropdownItem,
  StudentDropdownSimpleItem,
  StudentOut
} from '@/types/admission';
import type { ApiError, PaginatedResponse } from '@/types/common';
import CAxios from '../index';
import {
  STUDENT_ADMISSIONS,
  STUDENT_ADMISSIONS_LIST,
  STUDENT_ADMISSIONS_SEARCH,
  STUDENT_ADMISSIONS_DROPDOWN,
  STUDENT_ADMISSIONS_DROPDOWN_SIMPLE
} from '@/constants/api/students';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError: ApiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Create student admission
export const createStudentAdmission = async (
  admissionData: StudentAdmissionCreate
): Promise<StudentAdmissionResponse> => {
  try {
    const { data } = await CAxios.post(STUDENT_ADMISSIONS, admissionData);
    return data;
  } catch (error) {
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
      params: { skip, limit }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete student admission
export const deleteStudentAdmission = async (admissionId: string): Promise<{ message: string }> => {
  try {
    const { data } = await CAxios.delete(`${STUDENT_ADMISSIONS}${admissionId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get students dropdown (detailed)
export const fetchStudentsDropdown = async (
  activeOnly = true
): Promise<StudentDropdownItem[]> => {
  try {
    const { data } = await CAxios.get(STUDENT_ADMISSIONS_DROPDOWN, {
      params: { active_only: activeOnly }
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get students dropdown (simple)
export const fetchStudentsDropdownSimple = async (
  activeOnly = true
): Promise<StudentDropdownSimpleItem[]> => {
  try {
    const { data } = await CAxios.get(STUDENT_ADMISSIONS_DROPDOWN_SIMPLE, {
      params: { active_only: activeOnly }
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
export const deleteStudent = deleteStudentAdmission;
export const searchStudentAdmissions = searchStudents;