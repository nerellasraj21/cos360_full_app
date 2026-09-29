export type PaymentMethod = 'cash' | 'upi' | 'cheque' | 'bank_transfer';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'bounced';

export interface FeeTransactionItem {
  id: string;
  fee_type_id: string;
  fee_term_id: string;
  amount_due: number;
  amount_paid: number;
  description?: string;
  fee_type?: {
    id: string;
    name: string;
    category?: string;
  };
  fee_term?: {
    id: string;
    name: string;
    due_date?: string;
  };
}

export interface FeeTransaction {
  id: string;
  transaction_number: string;
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_amount: number;
  payment_method: PaymentMethod;
  upi_reference?: string | null;
  upi_app_name?: string | null;
  cheque_number?: string | null;
  cheque_date?: string | null;
  cheque_bank?: string | null;
  bank_reference?: string | null;
  bank_name?: string | null;
  remarks?: string;
  status: TransactionStatus;
  collected_by: string;
  approved_by?: string | null;
  transaction_date: string;
  receipt_generated: boolean;
  receipt_hash?: string | null;
  transaction_items: FeeTransactionItem[];
  created_at: string;
  updated_at: string;
}

export interface FeeTransactionCreateRequest {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_amount: number | string;
  payment_method: PaymentMethod;
  upi_reference?: string;
  upi_app_name?: string;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  bank_reference?: string;
  bank_name?: string;
  remarks?: string;
  transaction_items: Array<{
    fee_type_id: string;
    fee_term_id: string;
    term_date_id: string;
    amount_due: number;
    amount_paid: number;
    description?: string;
  }>;
}

export interface FeeTransactionUpdateRequest {
  status?: TransactionStatus;
  cheque_status?: 'cleared' | 'bounced';
  approved_by_user_id?: string;
  remarks?: string;
}

export interface FeeTransactionDetail extends FeeTransaction {
  student: {
    id: string;
    name: string;
    admission_number: string;
    class: string;
    parent_contact?: string;
  };
  academic_year: {
    id: string;
    name: string;
  };
  payment_details?: {
    upi_reference?: string;
    upi_app_name?: string;
    cheque_number?: string;
    cheque_date?: string;
    cheque_bank?: string;
    bank_reference?: string;
    bank_name?: string;
  };
  collected_by_user: {
    id: string;
    name: string;
  };
  approved_by_user?: {
    id: string;
    name: string;
  };
  receipt_url?: string;
}

export interface FeeTransactionSearchParams {
  student_id?: string;
  academic_year_id?: string;
  payment_method?: PaymentMethod;
  status?: TransactionStatus;
  has_receipt?: boolean;
  date_from?: string;
  date_to?: string;
  transaction_number?: string;
  amount_from?: number;
  amount_to?: number;
  limit?: number;
  offset?: number;
}

export interface FeeOutstandingFees {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_outstanding: number;
  outstanding_items: Array<{
    fee_type_id: string;
    fee_type_name: string;
    fee_term_id: string;
    fee_term_name: string;
    amount_due: number;
    amount_paid: number;
    outstanding_amount: number;
  }>;
}

export interface FeeTransactionHistory {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  transactions: Array<{
    transaction_number: string;
    transaction_date: string;
    payment_method: PaymentMethod;
    total_amount: number;
    status: TransactionStatus;
    receipt_generated: boolean;
    fee_types_paid: string[];
  }>;
}