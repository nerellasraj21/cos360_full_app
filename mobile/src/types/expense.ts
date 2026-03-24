// Expense Management Types

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface ExpenseCategoryDropdown {
  id: string;
  name: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  category_id: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseTypeInput {
  name: string;
  category_id: string;
  description?: string;
}

export interface ExpenseTypeDropdown {
  id: string;
  name: string;
  category_id: string;
}

export interface ExpenseTransaction {
  id: string;
  expense_type_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  reference_number?: string;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  vendor_name?: string;
  department_id?: string;
  org_id: string;
  idempotency_key: string;
  status: string;
  requires_approval?: boolean;
  requires_approval_override?: boolean;
  approved_by_user_id?: string;
  approved_by_role?: string;
  approved_at?: string;
  approval_comment?: string;
  version: number;
  created_by_user_id: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseTransactionInput {
  expense_type_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  reference_number?: string;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  vendor_name: string;
  idempotency_key: string;
  requires_approval_override?: boolean;
}

export interface ExpenseTransactionListResponse {
  items: ExpenseTransaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface ExpenseAttachment {
  id: string;
  transaction_id: string;
  original_filename: string;
  document_type: string;
  department_id?: string;
  stored_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  file_hash_sha256: string;
  virus_scan_status: string;
  virus_scan_result?: string;
  virus_scanned_at?: string;
  is_public: boolean;
  is_encrypted: boolean;
  encryption_key_id?: string;
  is_verified: boolean;
  verified_by_user_id?: string;
  verified_at?: string;
  verification_notes?: string;
  retention_period_months: number;
  is_archived: boolean;
  archived_at?: string;
  can_be_deleted: boolean;
  last_accessed_at?: string;
  access_count: number;
  uploaded_by_user_id: string;
  uploaded_by_role: string;
  uploaded_at: string;
  updated_at: string;
}

export interface ExpenseAuditLog {
  id: string;
  transaction_id: string;
  action: string;
  action_category?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id?: string;
  actor_user_id?: string;
  actor_username?: string;
  user_role: string;
  actor_role?: string;
  timestamp?: string;
  created_at?: string;
  ip_address?: string;
  request_ip_address?: string;
  user_agent?: string;
  notes?: string;
  action_notes?: string;
}

export interface ExpenseAuditLogSummary {
  transaction_id: string;
  total_logs: number;
  last_modified: string;
  last_modified_by: string;
  actions: string[];
}

export interface ExpenseSettings {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSettingsValue {
  key: string;
  value: string;
  category: string;
}

export interface ExpenseCommonSettings {
  approval_required_amount: number;
  auto_approval_roles: string[];
  currency: string;
  date_format: string;
  max_attachment_size: number;
  allowed_file_types: string[];
}

export interface ExpenseDepartment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDepartmentDropdown {
  id: string;
  name: string;
}

export interface ExpenseReportFilter {
  start_date?: string;
  end_date?: string;
  category_ids?: string[];
  type_ids?: string[];
  department_ids?: string[];
  status_filter?: string[];
  min_amount?: number;
  max_amount?: number;
  vendor_filter?: string;
}

export interface ExpenseCategoryReport {
  category_id: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ExpenseTypeReport {
  type_id: string;
  type_name: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

export interface ExpenseTrendReport {
  period: string;
  total_amount: number;
  transaction_count: number;
  categories: ExpenseCategoryReport[];
  growth_percentage: number;
}

export interface ExpenseSummaryReport {
  total_transactions: number;
  total_amount: number;
  approved_amount: number;
  pending_amount: number;
  paid_amount: number;
  cancelled_amount: number;
  period_days: number;
  top_categories: ExpenseCategoryReport[];
  top_vendors: {
    vendor_name: string;
    total_amount: number;
    transaction_count: number;
  }[];
}

export interface ExpenseReportExportResponse {
  export_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ExpenseApprovalRequest {
  action: 'approve' | 'reject';
  approval_comment: string;
}

// API Response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// Form types for UI
export interface ExpenseTransactionForm extends Omit<ExpenseTransactionInput, 'idempotency_key'> {
  attachments?: File[];
}

export interface ExpenseCategoryForm extends ExpenseCategoryInput {}

export interface ExpenseTypeForm extends ExpenseTypeInput {}

export interface ExpenseSettingsForm {
  key: string;
  value: string;
  category: string;
  description?: string;
  is_active?: boolean;
}