import apiClient from './client';

export interface UserWithDetails {
  id: string;
  username: string;
  email: string | null;
  is_active: boolean;
  role_id: string;
  role_name: string;
  entity_type: 'student' | 'staff' | 'parent' | null;
  entity_id: string | null;
  entity_name: string | null;
  entity_details: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserListResponse {
  users: UserWithDetails[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  is_active?: boolean;
}

export interface UserUpdatePayload {
  username?: string;
  email?: string;
  is_active?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Admin Users API
export const adminUsersApi = {
  // List all users with filters
  listUsers: async (params: UserListParams = {}): Promise<UserListResponse> => {
    const response = await apiClient.get('/admin/users/', { params });
    return response.data;
  },

  // Get user details by ID
  getUserDetails: async (user_id: string): Promise<UserWithDetails> => {
    const response = await apiClient.get(`/admin/users/${user_id}`);
    return response.data;
  },

  // Update user details
  updateUser: async (user_id: string, data: UserUpdatePayload): Promise<UserWithDetails> => {
    const response = await apiClient.patch(`/admin/users/${user_id}`, data);
    return response.data;
  },

  // Change user role
  updateUserRole: async (user_id: string, role_id: string): Promise<unknown> => {
    const response = await apiClient.put(`/admin/users/${user_id}/role`, { role_id });
    return response.data;
  },

  // Admin reset user password
  resetPassword: async (user_id: string, new_password: string): Promise<unknown> => {
    const response = await apiClient.post(`/admin/users/${user_id}/reset-password`, { new_password });
    return response.data;
  },

  // Get filter options (available roles)
  getFilterOptions: async (): Promise<{ available_roles: string[] }> => {
    const response = await apiClient.get('/admin/users/filters/options');
    return response.data;
  },
};

// User Profile API
export const userProfileApi = {
  // Change own password
  changePassword: async (data: ChangePasswordPayload): Promise<void> => {
    await apiClient.post('/profile/change-password', data);
  },
};
