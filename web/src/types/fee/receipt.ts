export interface FeeReceiptBase {
  receipt_number: string;
  fee_transaction_id: string;
  student_name: string;
  student_admission_num: string;
  class_section: string;
  academic_year: string;
  content_hash: string;
}

export interface FeeReceiptCreate extends FeeReceiptBase {
  generated_by_user_id: string;
  pdf_file_path?: string;
  remarks?: string;
}

export interface FeeReceiptUpdate {
  pdf_file_path?: string;
  is_reprinted?: boolean;
  reprint_count?: number;
  remarks?: string;
}

export interface FeeReceipt extends FeeReceiptBase {
  id: string;
  pdf_file_path?: string;
  is_reprinted: boolean;
  reprint_count: number;
  generated_by_user_id: string;
  remarks?: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface FeeReceiptSummary {
  id: string;
  receipt_number: string;
  student_name: string;
  student_admission_num: string;
  generated_at: string;
  is_reprinted: boolean;
  reprint_count: number;
}

export interface ReceiptItemDetail {
  fee_type_name: string;
  fee_term_name: string;
  amount_paid: number;
}

export interface ReceiptContent {
  receipt_number: string;
  transaction_number: string;
  student_name: string;
  student_admission_num: string;
  class_section: string;
  academic_year: string;
  payment_method: string;
  payment_reference?: string;
  total_amount: number;
  transaction_date: string;
  collected_by_user: string;
  collected_by_designation?: string;
  receipt_items: ReceiptItemDetail[];
  remarks?: string;
  school_name: string;
  school_address: string;
}

export interface ReceiptVerification {
  receipt_id: string;
  receipt_number: string;
  is_integrity_valid: boolean;
  verification_hash: string;
  verified_at: string;
  verification_details: {
    stored_hash: string;
    current_hash: string;
    match: boolean;
  };
}

export interface FeeReceiptSearchParams {
  student_id?: string;
  receipt_number?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface FeeReceiptListResponse {
  items: FeeReceipt[];
  total: number;
  skip?: number;
  limit?: number;
}