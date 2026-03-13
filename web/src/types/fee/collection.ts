// ===== Fee Collection Types =====

export type CollectionPaymentMethod = 'cash' | 'upi' | 'cheque' | 'bank_transfer' | 'dd';

// ---- Student Search ----

export interface StudentSearchParams {
  q?: string;
  class_id?: string;
  section_id?: string;
}

export interface StudentSearchResult {
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  class_id: string;
  class_name: string;
  section_id: string | null;
  section_name: string | null;
  parent_name: string | null;
  mobile_number: string | null;
  photo_url: string | null;
}

// ---- Fee Summary ----

export interface FeeSummaryItem {
  s_no: number;
  fee_type_id: string;
  fee_type_name: string;
  assigned_fee: number;
  fee_after_concession: number;
  paid_amount: number;
  due_amount: number;
  last_paid_date: string | null;
  last_receipt_number: string | null;
  remarks: string | null;
}

export interface FeeSummaryResponse {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  as_of_date: string;
  items: FeeSummaryItem[];
  grand_total_assigned: number;
  grand_total_fee: number;
  grand_total_paid: number;
  grand_total_due: number;
  old_fee_pending_amount: number;
}

// ---- Fee Payment ----

export interface FeePaymentRequest {
  student_id: string;
  academic_year_id: string;
  amount_to_pay: number;
  payment_method: CollectionPaymentMethod;
  upi_reference?: string;
  bank_reference?: string;
  cheque_number?: string;
  cheque_bank?: string;
  cheque_date?: string;
  send_sms: boolean;
  print_duplicate: boolean;
  remarks?: string;
}

export interface FeePaymentItemPaid {
  fee_type_id: string;
  fee_type_name: string;
  amount_paid: number;
}

export interface FeePaymentResponse {
  transaction_id: string;
  transaction_number: string;
  receipt_id: string;
  receipt_number: string;
  amount_paid: number;
  payment_method: string;
  sms_status: 'sent' | 'failed' | 'skipped';
  items_paid: FeePaymentItemPaid[];
}

// ---- Concessions ----

export interface ConcessionSummaryItem {
  fee_type_id: string;
  fee_type_name: string;
  assigned_fee: number;
  current_due: number;
  concession_amount: number;
  reason: string | null;
  approved_by: string | null;
}

export interface ConcessionSummaryResponse {
  student_id: string;
  student_name: string;
  academic_year: string;
  items: ConcessionSummaryItem[];
  grand_total_assigned: number;
  grand_total_concession: number;
  grand_total_fee_after_concession: number;
}

export interface ConcessionItemCreate {
  fee_type_id: string;
  concession_amount: number;
  reason: string;
  approved_by: 'owner' | 'principal' | 'management' | 'correspondent';
}

export interface BulkConcessionRequest {
  student_id: string;
  academic_year_id: string;
  concessions: ConcessionItemCreate[];
}

export interface ConcessionHistoryItem {
  id: string;
  date_applied: string;
  fee_type_name: string;
  amount: number;
  reason: string;
  approver: string;
  recorded_by_staff_name: string | null;
}

export interface ConcessionUpdate {
  concession_amount?: number;
  reason?: string;
  approved_by?: string;
}

// ---- Old Fees ----

export interface OldFeeRead {
  id: string;
  academic_year_label: string;
  fee_type_name: string;
  source: 'auto_carryforward' | 'manual_entry';
  original_amount: number;
  paid_amount: number;
  outstanding: number;
  paid_date: string | null;
  receipt_manual: string | null;
  receipt_system: string | null;
  is_settled: boolean;
  remarks: string | null;
}

export interface OldFeeSummaryResponse {
  student_id: string;
  student_name: string;
  items: OldFeeRead[];
  grand_total_original: number;
  grand_total_paid: number;
  grand_total_outstanding: number;
}

export interface OldFeeManualCreate {
  student_id: string;
  academic_year_label: string;
  fee_type_name: string;
  original_amount: number;
  paid_amount?: number;
  receipt_manual?: string;
  remarks?: string;
}

export interface OldFeeCarryForwardRequest {
  student_id: string;
  source_academic_year_id: string;
  target_academic_year_id: string;
}

export interface OldFeeUpdate {
  paid_amount?: number;
  paid_date?: string;
  receipt_manual?: string;
  remarks?: string;
}
