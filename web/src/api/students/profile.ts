import type { ApiError } from '@/types/common';
import CAxios from '../index';
import { STUDENT_PROFILE_ME } from '@/constants/api/students';

export interface StudentProfileOut {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  admission_number?: string;
  roll_number?: string;
  class_name?: string;
  section_name?: string;
  academic_year?: string;
  profile_picture_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentProfileUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  profile_picture_url?: string;
}

// Helper function to handle API errors
const handleApiError = (error: unknown): Error => {
  if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object' && 'data' in error.response) {
    const apiError: ApiError = error.response.data as ApiError;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error((error as Error)?.message || 'Network error');
};

// Get student profile
export const getStudentProfile = async (): Promise<StudentProfileOut> => {
  try {
    const { data } = await CAxios.get(STUDENT_PROFILE_ME);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update student profile
export const updateStudentProfile = async (
  profileData: StudentProfileUpdate
): Promise<StudentProfileOut> => {
  try {
    const { data } = await CAxios.put(STUDENT_PROFILE_ME, profileData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};