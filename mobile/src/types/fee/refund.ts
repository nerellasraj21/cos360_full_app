// Fee Refund Types
export type RefundReason = 'fee_adjustment' | 'student_withdrawal' | 'excess_payment' | 'other';
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'completed';
export type RefundMethod = 'cash' | 'bank_transfer' | 'cheque';

export interface FeeRefund {
  id: string;
  transaction_id: string;
  refund_amount: number;
  refund_reason: RefundReason;
  detailed_reason: string;
  refund_date: string;
  refund_method: RefundMethod;
  status: RefundStatus;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeRefundCreateRequest {
  transaction_id: string;
  refund_amount: number;
  refund_reason: RefundReason;
  detailed_reason: string;
  refund_date: string;
  refund_method: RefundMethod;
  academic_year_id: string;
}

export interface FeeRefundUpdateRequest {
  refund_amount?: number;
  refund_reason?: RefundReason;
  detailed_reason?: string;
  refund_date?: string;
  refund_method?: RefundMethod;
  status?: RefundStatus;
}

export interface FeeRefundWithDetails {
  id: string;
  transaction_id: string;
  student_id: string;
  student_admission_num: string;
  student_name: string;
  academic_year_id: string;
  academic_year_name: string;
  refund_amount: number;
  refund_reason: RefundReason;
  detailed_reason: string;
  refund_date: string;
  refund_method: RefundMethod;
  status: RefundStatus;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

/** Refund row as rendered by the refunds screen — status is guaranteed present
 *  (the API may omit it, in which case the screen defaults to 'pending'). */
export interface FeeRefundWithStatus extends Omit<FeeRefundWithDetails, 'status'> {
  status: RefundStatus;
}

/** Local form state for the create-refund modal. Field names are the form's own
 *  vocabulary; handleSubmit maps them onto FeeRefundCreateRequest before posting. */
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
