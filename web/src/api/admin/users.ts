import CAxios from '../index';

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

export const adminUsersApi = {
  // List all users with filters
  listUsers: async (params: UserListParams = {}): Promise<UserListResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.role) query.append('role', params.role);
    if (params.search) query.append('search', params.search);
    if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
    const response = await CAxios.get(`/admin/users/?${query.toString()}`);
    return response.data;
  },

  // Get user details by ID
  getUserDetails: async (user_id: string): Promise<UserWithDetails> => {
    const response = await CAxios.get(`/admin/users/${user_id}`);
    return response.data;
  },

  // Update user details
  updateUser: async (user_id: string, data: UserUpdatePayload): Promise<UserWithDetails> => {
    const response = await CAxios.patch(`/admin/users/${user_id}`, data);
    return response.data;
  },

  // Change user role
  updateUserRole: async (user_id: string, role_id: string): Promise<unknown> => {
    const response = await CAxios.put(`/admin/users/${user_id}/role`, { role_id });
    return response.data;
  },

  // Admin reset user password
  resetPassword: async (user_id: string, new_password: string): Promise<unknown> => {
    const response = await CAxios.post(`/admin/users/${user_id}/reset-password`, { new_password });
    return response.data;
  },

  // Get filter options (available roles)
  getFilterOptions: async (): Promise<{ available_roles: string[] }> => {
    const response = await CAxios.get('/admin/users/filters/options');
    return response.data;
  },

  // Change own password
  changePassword: async (data: { current_password: string; new_password: string; confirm_password: string }): Promise<void> => {
    await CAxios.post('/profile/change-password', data);
  },
};