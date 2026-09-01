// Fee Receipt Types
export interface FeeReceipt {
  id: string;
  transaction_id: string;
  receipt_number: string;
  student_id: string;
  student_admission_num: string;
  student_name: string;
  academic_year_id: string;
  academic_year_name: string;
  total_amount: number;
  received_amount: number;
  receipt_date: string;
  payment_method: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeReceiptCreate {
  transaction_id: string;
  receipt_number: string;
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_amount: number;
  received_amount: number;
  receipt_date: string;
  payment_method: string;
  remarks?: string;
}

export interface FeeReceiptUpdate {
  receipt_number?: string;
  received_amount?: number;
  receipt_date?: string;
  payment_method?: string;
  remarks?: string;
}
