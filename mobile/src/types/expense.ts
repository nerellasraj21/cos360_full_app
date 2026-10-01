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
  department_id?: string;
  requires_approval_override?: boolean;
}

// Client-side only — used for amount calculation, NOT sent to API
export interface TransactionItem {
  item_name: string;
  item_description: string;
  unit_price: number;
  quantity: number;
  tax_rate: number;
  discount_rate: number;
  final_amount: number;
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
  action_category: string;
  field_name?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  action_reason?: string | null;
  action_notes?: string | null;
  workflow_stage?: string | null;
  department_id?: string | null;
  actor_user_id: string;
  actor_role: string;
  actor_username: string;
  created_at: string;
}

export interface ExpenseAuditLogSummary {
  transaction_id: string;
  total_entries: number;
  action_breakdown: Record<string, number>;
  first_entry: string | null;
  last_entry: string | null;
  unique_actors: number;
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

export interface ExpenseCommonSettingValue {
  value: string | number | boolean | string[] | null;
  type: string;
}

export type ExpenseCommonSettingKey =
  | 'auto_approval_limit'
  | 'require_receipts_over_amount'
  | 'default_approval_required'
  | 'max_file_size_mb'
  | 'allowed_file_types';

export interface ExpenseCommonSettings {
  settings: Partial<Record<ExpenseCommonSettingKey, ExpenseCommonSettingValue>>;
  retrieved_at: string;
}

export interface ExpenseDepartment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDepartmentInput {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface ExpenseDepartmentDropdown {
  id: string;
  name: string;
}

export interface ExpenseReportFilter {
  start_date?: string;
  end_date?: string;
  status_filter?: string;
  department_id?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface ExpenseReportSummary {
  report_period: string;
  start_date: string;
  end_date: string;
  total_amount: string | number;
  total_transactions: number;
  average_transaction: string | number;
  categories_count: number;
  departments_count: number;
}

export interface ExpenseCategorySummary {
  category_id: string;
  category_name: string;
  total_amount: string | number;
  transaction_count: number;
  average_amount: string | number;
  percentage_of_total: string | number;
}

export interface ExpenseTypeSummary {
  type_id: string;
  type_name: string;
  category_name: string;
  total_amount: string | number;
  transaction_count: number;
  average_amount: string | number;
}

export interface ExpenseMonthlyTrend {
  month: string;
  total_amount: string | number;
  transaction_count: number;
  average_per_transaction: string | number;
}

export interface ExpenseCategoryReport {
  summary: ExpenseReportSummary;
  categories: ExpenseCategorySummary[];
  generated_at: string;
  generated_by: string;
}

export interface ExpenseTypeReport {
  summary: ExpenseReportSummary;
  types: ExpenseTypeSummary[];
  generated_at: string;
  generated_by: string;
}

export interface ExpenseTrendReport {
  summary: ExpenseReportSummary;
  monthly_trends: ExpenseMonthlyTrend[];
  generated_at: string;
  generated_by: string;
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
export interface ExpensePaginatedResponse<T> {
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