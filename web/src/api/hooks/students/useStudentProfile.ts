import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StudentProfileOut, StudentProfileUpdate } from '@/api/students/profile';
import { getStudentProfile, updateStudentProfile } from '@/api/students/profile';

// Query hook for fetching student profile
export function useStudentProfile() {
  return useQuery<StudentProfileOut>({
    queryKey: ['student', 'profile'],
    queryFn: getStudentProfile,
  });
}

// Mutation hook for updating student profile
export function useUpdateStudentProfile() {
  const queryClient = useQueryClient();
  return useMutation<StudentProfileOut, Error, StudentProfileUpdate>({
    mutationFn: updateStudentProfile,
    onSuccess: () => {
      toast.success('Student profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}