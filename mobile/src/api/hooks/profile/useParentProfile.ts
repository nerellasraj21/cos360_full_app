import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parentProfileApi, ParentProfileOut, ParentProfileUpdate } from '../../profile';

// Query keys
export const parentProfileKeys = {
  all: ['parent-profile'] as const,
  profile: () => [...parentProfileKeys.all] as const,
};

// Get parent profile hook
export const useParentProfile = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: parentProfileKeys.profile(),
    queryFn: parentProfileApi.getProfile,
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

// Update parent profile hook
export const useUpdateParentProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ParentProfileUpdate) => parentProfileApi.updateProfile(data),
    onSuccess: (updatedProfile: ParentProfileOut) => {
      // Update the cache with the new profile data
      queryClient.setQueryData(parentProfileKeys.profile(), updatedProfile);
      
      // Invalidate related queries if needed
      queryClient.invalidateQueries({
        queryKey: parentProfileKeys.all,
      });
    },
    onError: (error) => {
      console.error('Failed to update parent profile:', error);
    },
  });
};