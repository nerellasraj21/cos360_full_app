// Fee Refund Types

export type RefundReason = 'fee_adjustment' | 'student_withdrawal' | 'excess_payment' | 'other';

export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'completed';

export interface FeeRefundCreateRequest {
  transaction_id: string;
  refund_amount: number;
  refund_reason: string;
  refund_date: string;
  processed_by: string;
  refund_method: 'cash' | 'bank_transfer' | 'cheque';
  academic_year_id: string;
}

export interface FeeRefundResponse {
  id: string;
  transaction_id: string;
  refund_amount: number;
  refund_reason: string;
  refund_date: string;
  processed_by: string;
  refund_method: string;
  created_at: string;
}

export interface CreateRefundFormState {
  fee_transaction_id: string;
  refund_amount: number;
  refund_reason: RefundReason;
  detailed_reason: string;
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  requested_by_user_id: string;
}

// Extended interface for refunds with workflow status
export interface FeeRefundWithStatus {
  id: string;
  transaction_id: string;
  refund_amount: number;
  refund_reason: string;
  refund_date: string;
  processed_by: string;
  refund_method: string;
  created_at: string;
  status: RefundStatus;
}

// Fee Class Mapping Term Amount (moved from api/fees.ts)
export interface FeeClassMappingTermAmount {
  fee_term_date_id: string;
  amount: number;
}

// Existing Fee Student Mapping Types (moved from api/fees.ts)
export interface FeeStudentMappingRequestLegacy {
  student_id: string;
  fee_type_id: string;
  academic_year_id: string;
  term_amounts: FeeClassMappingTermAmount[];
}

export interface FeeStudentMappingResponseLegacy {
  id: string;
  student_id: string;
  fee_type_id: string;
  academic_year_id: string;
  term_amounts: FeeClassMappingTermAmount[];
  created_at: string;
  updated_at: string;
}

export interface FeeStudentMappingBulkRequestLegacy {
  fee_type_id: string;
  academic_year_id: string;
  mappings: {
    student_id: string;
    term_amounts: FeeClassMappingTermAmount[];
  }[];
}

export interface FeeStudentMappingBulkResponseLegacy {
  success: boolean;
  created_count: number;
  total_term_amounts: number;
  message: string;
  created_mappings: {
    id: string;
    student_id: string;
    fee_type_id: string;
    term_amounts_count: number;
  }[];
}

// New comprehensive Fee Student Mapping Types
export interface StudentFeeMappingTerm {
  fee_term_date_id: string;
  amount: number;
}

export interface StudentDetails {
  id: string;
  admission_num: string;
  name: string;
  class_name: string;
  section_name: string;
}

export interface FeeStudentMappingRequest {
  student_id: string;
  student_admission_num: string;
  class_id: string;
  section_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
}

export interface FeeStudentMappingResponse {
  id: string;
  student_details: StudentDetails;
  fee_type_name: string;
  academic_year_name: string;
  student_fee_mapping_terms: StudentFeeMappingTerm[];
  total_fee?: string;
}

export interface FeeStudentMappingBulkRequest {
  student_ids: string[];
  class_id: string;
  section_id: string;
  fee_type_id: string;
  total_fee: number;
  academic_year_id: string;
}

export interface FeeStudentMappingBulkResponse {
  success_count: number;
  total_count: number;
  created_mappings: FeeStudentMappingResponse[];
  errors: any[];
  message: string;
}

export interface FeeStudentMappingUpdateRequest extends Partial<FeeStudentMappingRequest> {}