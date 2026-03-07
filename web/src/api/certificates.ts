import { useMutation, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';

// Types for API responses
export interface CertificateCreateRequest {
  student_id: string;
  certificate_type_id: string;
  issue_date: string; // ISO date string
  certificate_number: string;
  remarks?: string;
}

export interface CertificateCreateResponse {
  id: string;
  student_id: string;
  certificate_type_id: string;
  issue_date: string;
  certificate_number: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateError {
  detail: string;
  error_code: string;
  field_errors?: Record<string, string[]>;
}

// Certificate creation mutation hook
export function useCertificateCreateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CertificateCreateRequest): Promise<CertificateCreateResponse> => {
      const { data: response } = await CAxios.post<CertificateCreateResponse>('/certificates/', data);
      return response;
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['student-certificates', data.student_id] });
    },
    onError: (error: any) => {
      console.error('Certificate creation error:', error);

      // Handle specific validation errors
      if (error.response?.status === 400) {
        const errorData = error.response.data as CertificateError;
        if (errorData.error_code === 'VALIDATION_ERROR') {
          throw new Error(errorData.detail || 'Validation error occurred');
        }
      } else if (error.response?.status === 409) {
        const errorData = error.response.data as CertificateError;
        if (errorData.error_code === 'DUPLICATE_ENTRY') {
          throw new Error('Certificate number already exists');
        }
      } else if (error.response?.status === 403) {
        const errorData = error.response.data as CertificateError;
        if (errorData.error_code === 'INSUFFICIENT_PERMISSIONS') {
          throw new Error('Permission denied: student_certificates:create');
        }
      }

      // Re-throw the error for component handling
      throw error;
    },
  });
}

// Utility function to validate certificate data before submission
export const validateCertificateData = (data: CertificateCreateRequest): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!data.student_id) {
    errors.student_id = 'Student ID is required';
  }

  if (!data.certificate_type_id) {
    errors.certificate_type_id = 'Certificate type is required';
  }

  if (!data.issue_date) {
    errors.issue_date = 'Issue date is required';
  } else {
    // Validate date format
    const date = new Date(data.issue_date);
    if (isNaN(date.getTime())) {
      errors.issue_date = 'Invalid date format';
    }
  }

  if (!data.certificate_number || data.certificate_number.trim().length === 0) {
    errors.certificate_number = 'Certificate number is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};