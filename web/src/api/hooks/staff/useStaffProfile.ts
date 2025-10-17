import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StaffProfile } from '@/types/staff/staff';
import { fetchStaffProfile, updateStaffProfile } from '@/api/staff/staff';

type StaffProfileUpdate = {
  email?: string | null;
  phone?: string | null;
};

// Query hook for fetching staff profile
export function useStaffProfile() {
  return useQuery<StaffProfile>({
    queryKey: ['staff', 'profile'],
    queryFn: fetchStaffProfile,
  });
}

// Mutation hook for updating staff profile
export function useUpdateStaffProfile() {
  const queryClient = useQueryClient();
  return useMutation<StaffProfile, Error, StaffProfileUpdate>({
    mutationFn: updateStaffProfile,
    onSuccess: () => {
      toast.success('Staff profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff', 'profile'] });
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}