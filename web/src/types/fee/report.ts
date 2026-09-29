// Fee Report types matching backend schemas at /reports/fees/

// --- Shared filter types ---

export interface FeeCollectionFilter {
  academic_year_id?: string;
  fee_category_id?: string;
  fee_type_id?: string;
  payment_method?: string; // cash, upi, cheque, bank_transfer
  status?: string; // pending, completed, cancelled, bounced
  date_from?: string;
  date_to?: string;
  class_id?: string;
  section_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PendingFeesFilter {
  academic_year_id?: string;
  fee_category_id?: string;
  fee_type_id?: string;
  fee_term_id?: string;
  class_id?: string;
  section_id?: string;
  days_overdue?: number;
  amount_min?: number;
  amount_max?: number;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FeeStructureFilter {
  academic_year_id?: string;
  fee_category_id?: string;
  fee_type_id?: string;
  class_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// --- Report data row types ---

export interface FeeCollectionSummaryItem {
  sl_no: number;
  transaction_number: string;
  student_admission_no: string;
  student_name: string;
  class_section: string;
  fee_category: string;
  fee_type: string;
  fee_term: string;
  amount_due: number;
  amount_paid: number;
  payment_method: string;
  payment_status: string;
  transaction_date: string;
  collected_by: string;
}

export interface PendingFeesItem {
  sl_no: number;
  student_admission_no: string;
  student_name: string;
  class_section: string;
  fee_category: string;
  fee_type: string;
  fee_term: string;
  amount_due: number;
  amount_paid: number;
  balance_amount: number;
  due_date: string | null;
  days_overdue: number | null;
}

export interface FeeStructureItem {
  sl_no: number;
  fee_category: string;
  fee_type: string;
  fee_term: string;
  class_name: string;
  section_name: string | null;
  fee_amount: number;
  academic_year: string;
  status: string;
}

// --- Stats/summary types ---

export interface FeeCollectionStats {
  total_collected: number;
  total_due: number;
  collection_percentage: number;
  payment_methods: Record<string, number>; // payment_method -> amount
  fee_categories: Record<string, number>; // category -> amount
  monthly_collection: Record<string, number>; // month -> amount
}

export interface PendingFeesStats {
  total_pending_amount: number;
  total_overdue_amount: number;
  total_students_with_pending: number;
  total_students_overdue: number;
  average_overdue_days: number;
  fee_categories_pending: Record<string, number>; // category -> amount
  class_wise_pending: Record<string, number>; // class -> amount
}

export interface FeeStructureStats {
  total_fee_types: number;
  total_categories: number;
  total_terms: number;
  average_fee_amount: number;
  fee_range: { min: number; max: number };
  category_wise_breakdown: Record<string, number>; // category -> count
}

// --- Paginated response wrapper ---

export interface FeeReportResponse<T = Record<string, unknown>> {
  data: T[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// --- Export types ---

export type FeeExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface FeeExportRequest {
  report_type: 'fee_collection_summary' | 'pending_fees' | 'fee_structure';
  filters: Record<string, unknown>;
  format: FeeExportFormat;
  filename?: string;
}

export interface FeeExportJobResponse {
  message: string;
  job_id: string;
  audit_id: string;
  is_background: boolean;
  estimated_completion: string;
  status_endpoint: string;
}
