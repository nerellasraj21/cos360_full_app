// Fee Category Types
export interface FeeCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeCategoryInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface FeeCategoryCreateRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface FeeCategoryUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface FeeCategorySearchParams {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface FeeCategoryListResponse {
  items: FeeCategory[];
  total_count: number;
  has_next: boolean;
  skip: number;
  limit: number;
}

export interface FeeCategoryHealthCheck {
  category_id: string;
  category_name: string;
  fee_types_count: number;
  is_in_use: boolean;
  last_used_date?: string;
}
