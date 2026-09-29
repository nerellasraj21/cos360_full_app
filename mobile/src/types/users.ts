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
