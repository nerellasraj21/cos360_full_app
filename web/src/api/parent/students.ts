// Parent-Student relationship API integration
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CAxios from '../index';
import type { Student, ParentStudentsResponse } from '@/types/auth';
import type { ApiError } from '@/types/common';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError: ApiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Fetch students for the authenticated parent
export const fetchParentStudents = async (parentId?: string): Promise<Student[]> => {
  try {
    // If parentId is not provided, we can't fetch students
    if (!parentId) {
      throw new Error('Parent ID is required');
    }

    // const { data } = await CAxios.get(`/student-parent-links/parent/${parentId}/students`);
    const { data } = await CAxios.get(`/student-parent-links/my-children`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Fetch detailed student information by ID
export const fetchStudentDetails = async (studentId: string): Promise<Student> => {
  try {
    const { data } = await CAxios.get(`/parent/students/${studentId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// React Query hooks
export function useParentStudents(parentId?: string) {
  return useQuery({
    queryKey: ['parent-students', parentId],
    queryFn: () => fetchParentStudents(parentId),
    enabled: !!parentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStudentDetails(studentId: string | null) {
  return useQuery({
    queryKey: ['student-details', studentId],
    queryFn: () => fetchStudentDetails(studentId!),
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
  });
}

// Refresh parent students data
export function useRefreshParentStudents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fetchParentStudents,
    onSuccess: (data) => {
      queryClient.setQueryData(['parent-students'], data);
    },
  });
}