// Fee Transaction Types
export interface FeeTransactionItem {
  id: string;
  fee_type_id: string;
  fee_type_name: string;
  amount: number;
  paid_amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  created_at: string;
  updated_at: string;
}

export interface FeeTransaction {
  id: string;
  student_id: string;
  student_admission_num: string;
  student_name: string;
  academic_year_id: string;
  academic_year_name: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  transaction_date: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  payment_method?: string;
  reference_number?: string;
  remarks?: string;
  fee_items: FeeTransactionItem[];
  created_at: string;
  updated_at: string;
}

export interface FeeTransactionCreateRequest {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_amount: number;
  paid_amount: number;
  transaction_date: string;
  payment_method?: string;
  reference_number?: string;
  remarks?: string;
  fee_items: {
    fee_type_id: string;
    amount: number;
    paid_amount: number;
  }[];
}

export interface FeeTransactionUpdateRequest {
  paid_amount?: number;
  status?: 'paid' | 'partial' | 'pending' | 'overdue';
  payment_method?: string;
  reference_number?: string;
  remarks?: string;
}

export interface FeeTransactionDetail {
  id: string;
  student_id: string;
  student_admission_num: string;
  student_name: string;
  academic_year_id: string;
  academic_year_name: string;
  class_name: string;
  section_name: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  transaction_date: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  payment_method?: string;
  reference_number?: string;
  remarks?: string;
  fee_items: FeeTransactionItem[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}
