import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToastContext } from '../../../../components/ToastProvider';
import { adminUsersApi, userProfileApi, UserListParams, UserUpdatePayload, ChangePasswordPayload, UserWithDetails } from '../../users';

// List users with filters
export function useListUsers(params: UserListParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => adminUsersApi.listUsers(params),
    enabled,
  });
}

// Get single user details
export function useGetUserDetails(userId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => adminUsersApi.getUserDetails(userId),
    enabled: enabled && !!userId,
  });
}

// Update user details
export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UserUpdatePayload }) =>
      adminUsersApi.updateUser(userId, data),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.setQueryData(['admin-user', updatedUser.id], updatedUser);
      showSuccess('User updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to update user');
    },
  });
}

// Update user role
export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      adminUsersApi.updateUserRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showSuccess('User role updated successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to update user role');
    },
  });
}

// Reset user password
export function useResetPassword() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      adminUsersApi.resetPassword(userId, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showSuccess('Password reset successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to reset password');
    },
  });
}

// Get filter options (available roles)
export function useFilterOptions() {
  return useQuery({
    queryKey: ['admin-users-filter-options'],
    queryFn: () => adminUsersApi.getFilterOptions(),
  });
}

// Change own password
export function useChangePassword() {
  const { showSuccess, showError } = useToastContext();

  return useMutation({
    mutationFn: (data: ChangePasswordPayload) =>
      userProfileApi.changePassword(data),
    onSuccess: () => {
      showSuccess('Password changed successfully');
    },
    onError: (error: Error) => {
      showError(error.message || 'Failed to change password');
    },
  });
}
