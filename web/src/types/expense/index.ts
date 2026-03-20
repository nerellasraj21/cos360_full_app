
// ============================================================================
// HIERARCHICAL SUMMARY TYPES
// ============================================================================

export interface ExpenseEntryRead {
  id: string;
  amount: number;
  description: string;
  transaction_date: string;
  payment_method: string;
  vendor_name?: string;
  status: string;
  reference_number?: string;
}

export interface ExpenseTypeSummaryItem {
  type_id: string;
  type_name: string;
  type_description?: string;
  entries: ExpenseEntryRead[];
  type_total: number;
  entry_count: number;
}

export interface ExpenseCategorySummaryItem {
  category_id: string;
  category_name: string;
  category_description?: string;
  types: ExpenseTypeSummaryItem[];
  category_total: number;
  entry_count: number;
}

export interface ExpenseHierarchicalSummary {
  categories: ExpenseCategorySummaryItem[];
  grand_total: number;
  total_entries: number;
  academic_year_id?: string;
  academic_year_title?: string;
  start_date?: string;
  end_date?: string;
  generated_at: string;
}

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategoryDropdown {
  id: string;
  name: string;
}

export interface ExpenseCategoryCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface ExpenseCategoryUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
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

export interface ExpenseTypeDropdown {
  id: string;
  name: string;
  category_id: string;
}

export interface ExpenseTypeCreate {
  name: string;
  category_id: string;
  description?: string;
}

export interface ExpenseTypeUpdate {
  name?: string;
  category_id?: string;
  description?: string;
  is_active?: boolean;
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
  academic_year_id?: string;
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

export interface ExpenseTransactionCreate {
  expense_type_id: string;
  amount: number;
  transaction_date: string;
  description: string;
  reference_number?: string;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  vendor_name?: string;
  idempotency_key: string;
  requires_approval_override?: boolean;
  attachments?: File[];
}

export interface ExpenseTransactionUpdate {
  expense_type_id?: string;
  amount?: number;
  transaction_date?: string;
  description?: string;
  reference_number?: string;
  payment_method?: 'cash' | 'cheque' | 'bank_transfer' | 'upi';
  vendor_name?: string;
  department_id?: string | null;
}

export interface ExpenseTransactionApproval {
  action: 'approve' | 'reject';
  approval_comment: string;
}

export interface TransactionItem {
  item_name?: string;
  item_description?: string;
  unit_price?: number;
  quantity?: number;
  tax_rate?: number;
  discount_rate?: number;
  final_amount?: number;
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

export interface ExpenseAttachmentCreate {
  transaction_id: string;
  document_type: string;
  department_id?: string;
  file: File;
}

export interface ExpenseAttachmentUpdate {
  document_type?: string;
  is_verified?: boolean;
  verification_notes?: string;
  department_id?: string;
}

export interface ExpenseAttachmentDownload {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  download_url: string;
}

export interface ExpenseAuditLog {
  id: string;
  transaction_id: string;
  action: string;
  action_category: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  full_record_before?: Record<string, any>;
  full_record_after?: Record<string, any>;
  action_reason?: string;
  action_notes?: string;
  request_ip_address?: string;
  request_user_agent?: string;
  request_session_id?: string;
  api_endpoint?: string;
  http_method?: string;
  request_id?: string;
  workflow_stage?: string;
  compliance_flags?: Record<string, any>;
  department_id?: string;
  actor_user_id: string;
  actor_role: string;
  actor_username: string;
  created_at: string;
}

export interface ExpenseAuditLogSummary {
  transaction_id: string;
  total_logs: number;
  last_action: string;
  last_actor: string;
  last_action_at: string;
  creation_logs: number;
  update_logs: number;
  approval_logs: number;
  document_logs: number;
}

export interface ExpenseSettings {
  id: string;
  setting_key: string;
  setting_name: string;
  setting_description?: string;
  setting_category: 'approval' | 'workflow' | 'security' | 'compliance' | 'notification' | 'integration';
  string_value?: string;
  numeric_value?: number;
  integer_value?: number;
  boolean_value?: boolean;
  json_value?: Record<string, any>;
  department_id?: string;
  applies_to_all_departments: boolean;
  default_value?: string;
  is_system_setting: boolean;
  is_user_configurable: boolean;
  validation_rules?: Record<string, any>;
  allowed_values?: any[];
  requires_approval: boolean;
  approval_threshold?: number;
  is_audit_required: boolean;
  is_sensitive: boolean;
  compliance_level: 'standard' | 'high' | 'critical';
  version: number;
  is_active: boolean;
  effective_from?: string;
  effective_until?: string;
  created_by_user_id: string;
  created_by_role: string;
  last_modified_by_user_id?: string;
  last_modified_by_role?: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSettingsCreate {
  setting_key: string;
  setting_name: string;
  setting_description?: string;
  setting_category: 'approval' | 'workflow' | 'security' | 'compliance' | 'notification' | 'integration';
  string_value?: string;
  numeric_value?: number;
  integer_value?: number;
  boolean_value?: boolean;
  json_value?: Record<string, any>;
  department_id?: string;
  applies_to_all_departments?: boolean;
  default_value?: string;
  is_system_setting?: boolean;
  is_user_configurable?: boolean;
  validation_rules?: Record<string, any>;
  allowed_values?: any[];
  requires_approval?: boolean;
  approval_threshold?: number;
  is_audit_required?: boolean;
  is_sensitive?: boolean;
  compliance_level?: 'standard' | 'high' | 'critical';
  effective_from?: string;
  effective_until?: string;
}

export interface ExpenseSettingsUpdate {
  setting_name?: string;
  setting_description?: string;
  string_value?: string;
  numeric_value?: number;
  integer_value?: number;
  boolean_value?: boolean;
  json_value?: Record<string, any>;
  department_id?: string;
  applies_to_all_departments?: boolean;
  is_user_configurable?: boolean;
  validation_rules?: Record<string, any>;
  allowed_values?: any[];
  requires_approval?: boolean;
  approval_threshold?: number;
  is_active?: boolean;
  effective_from?: string;
  effective_until?: string;
}

export interface ExpenseSettingsValue {
  setting_key: string;
  value: string | number | boolean | Record<string, any>;
  value_type: 'string' | 'integer' | 'numeric' | 'boolean' | 'json';
}

// ============================================================================
// REPORT TYPES
// ============================================================================

type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';

export interface ExpenseReportFilter {
  start_date?: string;
  end_date?: string;
  category_ids?: string[];
  type_ids?: string[];
  status_filter?: string;
  department_id?: string;
  min_amount?: number;
  max_amount?: number;
  created_by_user_id?: string;
}

export interface CategorySummary {
  category_id: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
  percentage_of_total: number;
}

export interface TypeSummary {
  type_id: string;
  type_name: string;
  category_name: string;
  total_amount: number;
  transaction_count: number;
  average_amount: number;
}

export interface MonthlyTrend {
  month: string;
  total_amount: number;
  transaction_count: number;
  average_per_transaction: number;
}

export interface ExpenseReportSummary {
  report_period: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  total_transactions: number;
  average_transaction: number;
  categories_count: number;
  departments_count: number;
}

export interface ExpenseCategoryReport {
  summary: ExpenseReportSummary;
  categories: CategorySummary[];
  generated_at: string;
  generated_by: string;
}

export interface ExpenseTypeReport {
  summary: ExpenseReportSummary;
  types: TypeSummary[];
  generated_at: string;
  generated_by: string;
}

export interface ExpenseTrendReport {
  summary: ExpenseReportSummary;
  monthly_trends: MonthlyTrend[];
  generated_at: string;
  generated_by: string;
}

export interface ExpenseReportExport {
  report_type: string;
  export_format: ExportFormat;
  filters: ExpenseReportFilter;
  include_details?: boolean;
}

export interface ExpenseReportExportResponse {
  export_id: string;
  report_type: string;
  export_format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  file_size?: number;
  expires_at?: string;
  generated_at: string;
}

// ============================================================================
// LIST RESPONSE TYPES
// ============================================================================

export interface ExpenseCategoryListResponse {
  items: ExpenseCategory[];
  total: number;
  skip: number;
  limit: number;
}

export interface ExpenseTypeListResponse {
  items: ExpenseType[];
  total: number;
  skip: number;
  limit: number;
}

export interface ExpenseTransactionListResponse {
  items: ExpenseTransaction[];
  total: number;
  skip: number;
  limit: number;
  summary?: {
    total_amount: number;
    approved_amount: number;
    pending_amount: number;
    paid_amount: number;
    cancelled_amount: number;
  };
}

// ============================================================================
// COMMON SETTINGS TYPE
// ============================================================================

export interface ExpenseDepartment {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDepartmentCreate {
  name: string;
  description?: string;
}

export interface ExpenseDepartmentUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface ExpenseDepartmentDropdown {
  id: string;
  name: string;
}

export interface ExpenseCommonSettings {
  approval_workflow_enabled: boolean;
  default_approval_threshold: number;
  attachment_required: boolean;
  max_attachment_size: number;
  allowed_file_types: string[];
  audit_retention_days: number;
  notification_enabled: boolean;
  auto_archive_days: number;
}

// ============================================================================
// REQUEST TYPE ALIASES (for API compatibility)
// ============================================================================

// Category types
export type ExpenseCategoryRead = ExpenseCategory;
export type ExpenseCategoryCreateRequest = ExpenseCategoryCreate;
export type ExpenseCategoryUpdateRequest = ExpenseCategoryUpdate;

// Type types
export type ExpenseTypeRead = ExpenseType;
export type ExpenseTypeCreateRequest = ExpenseTypeCreate;
export type ExpenseTypeUpdateRequest = ExpenseTypeUpdate;
export type ExpenseTypeQueryParams = {
  category_id?: string;
  is_active?: boolean;
  active_only?: boolean;
  recurring_only?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
};

// Transaction types
export type ExpenseTransactionRead = ExpenseTransaction;
export type ExpenseTransactionCreateRequest = ExpenseTransactionCreate;
export type ExpenseTransactionUpdateRequest = ExpenseTransactionUpdate;
export type ExpenseTransactionApprovalRequest = ExpenseTransactionApproval;
export type ExpenseTransactionItem = TransactionItem;
export type ExpenseTransactionItemCreateRequest = TransactionItem;
export type ExpenseTransactionItemUpdateRequest = TransactionItem;
export type ExpenseTransactionFilters = {
  start_date?: string;
  end_date?: string;
  date_from?: string;
  date_to?: string;
  category_ids?: string[];
  type_ids?: string[];
  expense_type_id?: string;
  status_filter?: string;
  status?: string[];
  payment_method?: string[];
  department_id?: string;
  min_amount?: number;
  max_amount?: number;
  amount_min?: number;
  amount_max?: number;
  created_by_user_id?: string;
  skip?: number;
  limit?: number;
};

// Attachment types
export type ExpenseAttachmentUploadRequest = ExpenseAttachmentCreate;
export type ExpenseAttachmentUpdateRequest = ExpenseAttachmentUpdate;

// Audit types
export type ExpenseAuditEntry = ExpenseAuditLog;
export type ExpenseAuditQueryParams = {
  transaction_id?: string;
  action?: string;
  actor_user_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
};
export type ExpenseAuditLogFilters = {
  transaction_id?: string;
  action?: string;
  actor_user_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
};

// Settings types
export type ExpenseSettingsCreateRequest = ExpenseSettingsCreate;
export type ExpenseSettingsUpdateRequest = ExpenseSettingsUpdate;
export type ExpenseSettingsListResponse = {
  items: ExpenseSettings[];
  total: number;
  skip: number;
  limit: number;
};

// Report types
export type ExpenseReport = ExpenseCategoryReport | ExpenseTypeReport | ExpenseTrendReport;
export type ExpenseReportQueryParams = ExpenseReportFilter;
export type BudgetAnalysis = {
  category_id: string;
  category_name: string;
  budgeted_amount: number;
  actual_amount: number;
  variance: number;
  variance_percentage: number;
};
export type BudgetAnalysisQueryParams = {
  fiscal_year?: string;
  department_id?: string;
};

// Summary types
export type ExpenseSummaryReport = {
  total_transactions: number;
  total_amount: number;
  approved_amount: number;
  pending_amount: number;
  paid_amount: number;
  cancelled_amount: number;
  categories_count: number;
  types_count: number;
  departments_count: number;
};

// List response types
export type ExpenseAuditLogListResponse = {
  items: ExpenseAuditLog[];
  total: number;
  skip: number;
  limit: number;
};

export type ExpenseAttachmentListResponse = {
  items: ExpenseAttachment[];
  total: number;
  skip: number;
  limit: number;
};