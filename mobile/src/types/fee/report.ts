// Fee Report and Export Types
export type FeeExportFormat = 'excel' | 'pdf' | 'csv';

export interface FeeCollectionFilter {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  fee_type_id?: string;
  status?: 'paid' | 'partial' | 'pending' | 'overdue';
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface PendingFeesFilter {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  fee_type_id?: string;
  from_date?: string;
  to_date?: string;
  days_overdue?: number;
  page?: number;
  page_size?: number;
}

export interface FeeStructureFilter {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  fee_type_id?: string;
  category_id?: string;
  page?: number;
  page_size?: number;
}

export interface FeeCollectionSummaryItem {
  date: string;
  total_collected: number;
  payment_count: number;
  payment_methods: Record<string, number>;
  top_fee_types: Array<{ fee_type_name: string; amount: number }>;
}

export interface PendingFeesItem {
  student_id: string;
  student_admission_num: string;
  student_name: string;
  class_name: string;
  section_name: string;
  fee_type_name: string;
  due_amount: number;
  days_overdue: number;
  last_payment_date?: string;
  contact_number?: string;
}

export interface FeeStructureItem {
  id: string;
  class_name: string;
  section_name: string;
  fee_type_name: string;
  total_amount: number;
  term_count: number;
  per_term_amount: number;
  created_at: string;
  updated_at: string;
}

export interface FeeCollectionStats {
  total_collected: number;
  total_pending: number;
  total_overdue: number;
  collection_percentage: number;
  payment_count: number;
  average_payment_amount: number;
}

export interface PendingFeesStats {
  total_pending: number;
  total_overdue: number;
  student_count_with_pending: number;
  overdue_percentage: number;
  highest_overdue_amount: number;
  lowest_overdue_amount: number;
}

export interface FeeStructureStats {
  total_fee_structure_count: number;
  total_students_mapped: number;
  average_total_fee: number;
  highest_total_fee: number;
  lowest_total_fee: number;
}

export interface FeeReportResponse {
  report_type: 'collection' | 'pending' | 'structure';
  generated_at: string;
  academic_year_id: string;
  academic_year_name: string;
  statistics: FeeCollectionStats | PendingFeesStats | FeeStructureStats;
  items: FeeCollectionSummaryItem[] | PendingFeesItem[] | FeeStructureItem[];
  total_count: number;
  page?: number;
  page_size?: number;
}

export interface FeeExportRequest {
  report_type: 'collection' | 'pending' | 'structure';
  format: FeeExportFormat;
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  fee_type_id?: string;
  from_date?: string;
  to_date?: string;
  include_summary?: boolean;
  include_charts?: boolean;
}

export interface FeeExportJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  format: FeeExportFormat;
  report_type: 'collection' | 'pending' | 'structure';
  file_url?: string;
  created_at: string;
  estimated_completion_time?: string;
  error_message?: string;
}
