import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { User } from '@/types/auth';
import { adminUsersApi } from '@/api/admin/users';

type AdminUserUpdate = {
  username?: string;
  email?: string;
  is_active?: boolean;
};

type ChangePasswordData = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

// Query hook for fetching admin user profile
export function useAdminProfile(user_id: string) {
  return useQuery<User>({
    queryKey: ['admin', 'users', user_id],
    queryFn: () => adminUsersApi.getUserDetails(user_id),
  });
}

// Mutation hook for updating admin user profile
export function useUpdateAdminProfile(user_id: string) {
  const queryClient = useQueryClient();
  return useMutation<User, Error, AdminUserUpdate>({
    mutationFn: (data) => adminUsersApi.updateUser(user_id, data),
    onSuccess: () => {
      toast.success('Admin profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', user_id] });
    },
    onError: (error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

// Mutation hook for changing admin password
export function useChangeAdminPassword() {
  return useMutation<void, Error, ChangePasswordData>({
    mutationFn: adminUsersApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });
}