import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentProfileApi, StudentProfileOut, StudentProfileUpdate } from '../../profile';

// Query keys
export const studentProfileKeys = {
  all: ['student', 'profile'] as const,
  profile: () => [...studentProfileKeys.all] as const,
};

// Get student profile hook
export const useStudentProfile = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: studentProfileKeys.profile(),
    queryFn: studentProfileApi.getProfile,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 403/404 errors
      if (error?.response?.status === 403 || error?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Update student profile hook
export const useUpdateStudentProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StudentProfileUpdate) => studentProfileApi.updateProfile(data),
    onSuccess: (updatedProfile: StudentProfileOut) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(studentProfileKeys.profile(), updatedProfile);
      
      // Invalidate related queries if needed
      queryClient.invalidateQueries({
        queryKey: studentProfileKeys.all,
      });
    },
    onError: (error) => {
      console.error('Failed to update student profile:', error);
    },
  });
};