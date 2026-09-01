// Fee Type Types
export interface FeeType {
  id: string;
  name: string;
  category_id: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeTypeCreateRequest {
  name: string;
  category_id: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface FeeTypeUpdateRequest {
  name?: string;
  category_id?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
}

export interface FeeTypeDropdown {
  id: string;
  name: string;
  category_id: string;
  code?: string;
}
