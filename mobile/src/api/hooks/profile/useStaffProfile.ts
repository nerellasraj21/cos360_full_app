import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffProfileApi, StaffProfile, StaffProfileUpdate } from '../../profile';

// Query keys
export const staffProfileKeys = {
  all: ['staff', 'profile'] as const,
  profile: () => [...staffProfileKeys.all] as const,
};

// Get staff profile hook
export const useStaffProfile = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: staffProfileKeys.profile(),
    queryFn: staffProfileApi.getProfile,
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

// Update staff profile hook
export const useUpdateStaffProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StaffProfileUpdate) => staffProfileApi.updateProfile(data),
    onSuccess: (updatedProfile: StaffProfile) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(staffProfileKeys.profile(), updatedProfile);
      
      // Invalidate related queries if needed
      queryClient.invalidateQueries({
        queryKey: staffProfileKeys.all,
      });
    },
    onError: (error) => {
      console.error('Failed to update staff profile:', error);
    },
  });
};