import CAxios from '../index';
import type { User } from '@/types/auth';

export const adminUsersApi = {
  // Get user details by ID
  getUserDetails: async (user_id: string): Promise<User> => {
    console.log('[DEBUG] adminUsersApi.getUserDetails called with user_id:', user_id);

    const response = await CAxios.get(`/admin/users/${user_id}`);
    console.log('[DEBUG] adminUsersApi.getUserDetails returning:', response.data);
    return response.data;
  },

  // Update user details
  updateUser: async (user_id: string, data: { username?: string; email?: string; is_active?: boolean }): Promise<User> => {
    console.log('[DEBUG] adminUsersApi.updateUser called with user_id:', user_id, 'data:', data);

    const response = await CAxios.patch(`/admin/users/${user_id}`, data);
    console.log('[DEBUG] adminUsersApi.updateUser updated:', response.data);
    return response.data;
  },

  // Change password
  changePassword: async (data: { current_password: string; new_password: string; confirm_password: string }): Promise<void> => {
    console.log('[DEBUG] adminUsersApi.changePassword called with data:', data);

    await CAxios.post('/profile/change-password', data);
    console.log('[DEBUG] adminUsersApi.changePassword success');
  },
};

export const {
  getUserDetails,
  updateUser,
  changePassword,
} = adminUsersApi;