// Common API types used across all modules
// Central source of truth for common types - to avoid duplication

export interface ApiError {
  detail: string;
  error_code?: string;
  field_errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total_count: number;
  has_next: boolean;
  skip?: number;
  limit?: number;
}

export interface DropdownItem {
  id: string;
  name?: string;
  display_name?: string;
  title?: string;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface BaseCreateRequest {
  is_active?: boolean;
}

export interface BaseUpdateRequest {
  is_active?: boolean;
}

// Common response patterns
export interface BulkOperationResponse {
  success: boolean;
  created_count: number;
  message: string;
  created_items?: any[];
  errors?: string[];
}

// File upload types
export interface FileUploadResponse {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}

// Search and filter types
export interface SearchParams {
  q?: string;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

// Status enums
export type ActiveStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent' | 'late';
export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type DocumentStatus = 'pending' | 'verified' | 'rejected';

// List response wrapper (alternative to PaginatedResponse)
export interface ListResponse<T> {
  data: T[];
  count: number;
}

// Generic response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

// Pagination metadata
export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

// Time-tracked entity base
export interface TimeTrackedEntity extends BaseEntity {
  created_by?: string;
  updated_by?: string;
}

// Status change audit
export interface StatusChangeAudit {
  old_status: string;
  new_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
}
