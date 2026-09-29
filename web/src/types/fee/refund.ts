import type { BaseEntity } from '../common';

export interface BankDetails {
  account_holder: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
}

export interface RefundItem {
  transaction_item_id?: string;
  refund_amount: number;
  reason: string;
  fee_type_name?: string;
}

export interface FeeRefund extends BaseEntity {
  refund_number: string;
  fee_transaction_id: string;
  refund_amount: string | number;
  refund_reason: 'fee_adjustment' | 'student_withdrawal' | 'excess_payment' | 'other';
  detailed_reason: string;
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  requested_by_user_id: string;
  approved_by_user_id?: string | null;
  approval_remarks?: string | null;
  approved_date?: string | null;
  refund_method?: 'cash' | 'bank_transfer' | 'cheque' | null;
  refund_reference?: string | null;
  processing_remarks?: string | null;
  processed_by_user_id?: string | null;
  processed_date?: string | null;
  requested_date: string;
  created_at: string;
  updated_at: string;
}

export interface FeeRefundCreateRequest {
  fee_transaction_id: string;
  refund_amount: number;
  refund_reason: 'fee_adjustment' | 'student_withdrawal' | 'excess_payment' | 'other';
  detailed_reason: string;
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  requested_by_user_id: string;
}

export interface FeeRefundUpdateRequest {
  status?: 'approved' | 'rejected' | 'processed' | 'completed';
  approved_by?: string;
  processing_date?: string;
  completion_date?: string;
  reference_number?: string;
  rejection_reason?: string;
  remarks?: string;
}

export interface FeeRefundWithDetails extends FeeRefund {
  // Additional fields for enhanced display
  transaction_number?: string;
  transaction_amount?: number;
  transaction_date?: string;
  payment_method?: string;
}

export interface RefundSummary {
  transaction_id: string;
  total_refund_requested: number;
  total_refund_approved: number;
  total_refund_processed: number;
  refund_counts: {
    pending: number;
    approved: number;
    processed: number;
    rejected: number;
  };
  available_for_refund: number;
}

export interface RefundHealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database_connection: boolean;
  pending_refunds_count: number;
  processed_refunds_count: number;
}