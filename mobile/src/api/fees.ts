import apiClient from './client';
import { FeeRefundCreateRequest, FeeRefundResponse, FeeClassMappingTermAmount, FeeStudentMappingRequestLegacy as FeeStudentMappingRequest, FeeStudentMappingResponseLegacy as FeeStudentMappingResponse, FeeStudentMappingBulkRequestLegacy as FeeStudentMappingBulkRequest, FeeStudentMappingBulkResponseLegacy as FeeStudentMappingBulkResponse, FeeStudentMappingRequest as NewFeeStudentMappingRequest, FeeStudentMappingResponse as NewFeeStudentMappingResponse, FeeStudentMappingBulkRequest as NewFeeStudentMappingBulkRequest, FeeStudentMappingBulkResponse as NewFeeStudentMappingBulkResponse, FeeStudentMappingUpdateRequest } from '../types/fees';

// Type alias for backward compatibility
export type FeeRefundRequest = FeeRefundCreateRequest;

// Re-export types for backward compatibility
export type { FeeRefundCreateRequest, FeeRefundResponse, FeeClassMappingTermAmount, FeeStudentMappingRequest, FeeStudentMappingResponse, FeeStudentMappingBulkRequest, FeeStudentMappingBulkResponse };


// Fee Categories
export interface FeeCategoryRequest {
  category_name: string;
  academic_year_id: string;
  category_status: string;
}

export interface FeeCategoryResponse {
  id: string;
  category_name: string;
  category_status: string;
  academic_year_id: string;
  academic_year_title: string;
}

// Fee Types
export interface FeeTypeRequest {
  type_name: string;
  fee_category_id: string;
  academic_year_id: string;
  fee_status: string;
  fee_term_id: string;
}

export interface FeeTypeResponse {
  id: string;
  type_name: string;
  fee_category_id: string;
  academic_year_id: string;
  fee_status: string;
  fee_term_id: string;
  fee_term_dates: FeeTermDateResponse[];
  created_at?: string;
  updated_at?: string;
}

// Fee Terms
export interface FeeTermDateRequest {
  fee_term_date: string;
}

export interface FeeTermDateResponse {
  id: string;
  fee_term_id: string;
  installment_number: number;
  fee_term_date: string;
  amount: number;
  is_active: boolean;
}

export interface FeeTermRequest {
  term_name: string;
  academic_year_id: string;
  number_of_terms: number;
  term_status: string;
  fee_term_dates: FeeTermDateRequest[];
}

export interface FeeTermResponse {
  id: string;
  term_name: string;
  academic_year_id: string;
  number_of_terms: number;
  term_status: string;
  fee_term_dates: FeeTermDateResponse[];
  created_at: string;
  updated_at: string;
}

// Fee Class Mappings
export interface FeeClassMappingRequest {
  fee_type_id: string;
  class_id: string;
  academic_year_id: string;
  total_fee: number;
  all_by_default: boolean;
  term_amounts?: FeeClassMappingTermAmount[];
}


export interface FeeClassMappingBulkRequest {
  fee_type_id: string;
  class_id: string;
  academic_year_id: string;
  mappings: {
    term_amounts: FeeClassMappingTermAmount[];
  }[];
}

export interface FeeClassMappingBulkResponse {
  success: boolean;
  created_count: number;
  total_term_amounts: number;
  message: string;
  created_mappings: {
    id: string;
    class_id: string;
    fee_type_id: string;
    term_amounts_count: number;
  }[];
}

// Fee Transaction Items
export interface FeeTransactionItemRequest {
  fee_type_id: string;
  term_date_id: string; // C-2: backend schema uses term_date_id, not fee_term_id
  amount_due: number;
  amount_paid: number;
  description?: string;
}

export interface FeeTransactionItemResponse {
  id: string;
  fee_type_id: string;
  term_date_id: string; // C-2: backend schema uses term_date_id, not fee_term_id
  amount_due: number;
  amount_paid: number;
  description?: string;
}

// Fee Transactions
export interface FeeTransactionCreateRequest {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'upi';
  transaction_items: FeeTransactionItemRequest[];
  transaction_date?: string;
  remarks?: string;
  collected_by?: string;
  upi_reference?: string;
  cheque_number?: string;
  cheque_date?: string;    // C-3: backend requires for cheque payments
  cheque_bank?: string;    // C-3: backend requires for cheque payments
  bank_reference?: string;
  bank_name?: string;      // C-3: backend requires for bank_transfer
}

export interface FeeTransactionResponse {
  id: string;
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  payment_method: string;
  transaction_items: FeeTransactionItemResponse[];
  total_amount: number;
  transaction_date?: string;
  remarks?: string;
  collected_by?: string;
  upi_reference?: string;
  cheque_number?: string;
  cheque_date?: string;
  cheque_bank?: string;
  bank_reference?: string;
  bank_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeTransactionHealthResponse {
  status: string;
}

// Fee Receipts
export interface FeeReceiptRequest {
  transaction_id: string;
  receipt_number: string;
  issued_date: string;
  issued_by: string;
  notes?: string;
}

export interface FeeReceiptResponse {
  id: string;
  transaction_id: string;
  receipt_number: string;
  issued_date: string;
  issued_by: string;
  notes?: string;
  created_at: string;
}

export interface FeeReceiptHealthResponse {
  status: string;
}

export interface FeeReceiptContentResponse {
  content: string;
  content_type: string;
}

export interface FeeReceiptVerifyResponse {
  verified: boolean;
  receipt_id: string;
  receipt_number: string;
  transaction_id: string;
}

// Fee Refunds (types imported from ../types/fees)

export interface FeeRefundHealthResponse {
  status: string;
}

export interface FeeRefundApproveRequest {
  refund_id: string;
  action: 'approve' | 'reject';
  approval_remarks: string;
}

export interface FeeRefundApproveResponse {
  message: string;
  refund_id: string;
}

export interface FeeRefundProcessRequest {
  refund_id: string;
}

export interface FeeRefundProcessResponse {
  message: string;
  refund_id: string;
}

export interface FeeRefundTransactionSummaryResponse {
  transaction_id: string;
  total_refunded: number;
  refunds: FeeRefundResponse[];
}

// ─── Fee Collection API ───────────────────────────────────────────────────────

export interface FeeSearchStudentResult {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  father_phone: string | null;
  outstanding_amount: string;
}

export interface FeeCollectionSummaryItem {
  s_no: number;
  fee_type_id: string;
  fee_type_name: string;
  assigned_fee: string;
  fee_after_concession: string;
  paid_amount: string;
  due_amount: string;
  last_paid_date: string | null;
  last_receipt_number: string | null;
  remarks: string | null;
}

export interface FeeCollectionSummary {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  as_of_date: string;
  items: FeeCollectionSummaryItem[];
  grand_total_assigned: string;
  grand_total_fee: string;
  grand_total_paid: string;
  grand_total_due: string;
  old_fee_pending_amount: string;
}

export interface FeePaymentRequest {
  student_id: string;
  academic_year_id: string;
  amount_to_pay: number;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'dd' | 'card';
  upi_reference?: string;
  bank_reference?: string;
  cheque_number?: string;
  cheque_bank?: string;
  cheque_date?: string;
  send_sms?: boolean;
  print_duplicate?: boolean;
  remarks?: string | null;
}

export interface FeePaymentResponse {
  transaction_id: string;
  transaction_number: string;
  receipt_id: string;
  receipt_number: string;
  amount_paid: string;
  payment_method: string;
  sms_status: 'sent' | 'failed' | 'skipped';
  items_paid: { fee_type_id: string; fee_type_name: string; amount_paid: string }[];
}

export interface FeeConcession {
  id: string;
  student_id: string;
  fee_type_id: string;
  academic_year_id: string;
  amount: string;
  approver_role: string;
  remarks: string | null;
  created_at: string;
}

export interface FeeConcessionCreate {
  student_id: string;
  fee_type_id: string;
  academic_year_id: string;
  amount: number;
  approver_role: 'principal' | 'management' | 'accountant' | 'admin';
  remarks?: string;
}

export const feeCollectionApi = {
  /** GET /fee/collection/search */
  searchStudent: async (params: {
    q?: string;
    class_id?: string;
    section_id?: string;
    academic_year_id?: string;
  }): Promise<FeeSearchStudentResult[]> => {
    const response = await apiClient.get('/fee/collection/search', { params });
    return response.data;
  },

  /** GET /fee/collection/summary/{student_id} */
  getSummary: async (
    studentId: string,
    params?: { academic_year_id?: string; as_of_date?: string },
  ): Promise<FeeCollectionSummary> => {
    const response = await apiClient.get(`/fee/collection/summary/${studentId}`, { params });
    return response.data;
  },

  /** GET /fee/collection/my-summary — Student self-service */
  getMySummary: async (params?: {
    academic_year_id?: string;
    as_of_date?: string;
  }): Promise<FeeCollectionSummary> => {
    const response = await apiClient.get('/fee/collection/my-summary', { params });
    return response.data;
  },

  /** GET /fee/collection/child-summary/{student_id} — Parent */
  getChildSummary: async (
    studentId: string,
    params?: { academic_year_id?: string; as_of_date?: string },
  ): Promise<FeeCollectionSummary> => {
    const response = await apiClient.get(`/fee/collection/child-summary/${studentId}`, { params });
    return response.data;
  },

  /** POST /fee/collection/pay */
  pay: async (data: FeePaymentRequest): Promise<FeePaymentResponse> => {
    const response = await apiClient.post('/fee/collection/pay', data);
    return response.data;
  },

  /** GET /fee/collection/receipts/{receipt_id}/pdf — returns PDF binary */
  getReceiptPdf: async (receiptId: string): Promise<Blob> => {
    const response = await apiClient.get(`/fee/collection/receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const feeConcessionsApi = {
  /** POST /fee/concessions/bulk */
  bulkCreate: async (data: FeeConcessionCreate[]): Promise<FeeConcession[]> => {
    const response = await apiClient.post('/fee/concessions/bulk', data);
    return response.data;
  },

  /** GET /fee/concessions/student/{student_id} */
  getByStudent: async (
    studentId: string,
    params?: { academic_year_id?: string },
  ): Promise<FeeConcession[]> => {
    const response = await apiClient.get(`/fee/concessions/student/${studentId}`, { params });
    return response.data.items || response.data;
  },

  /** GET /fee/concessions/history/{student_id} */
  getHistory: async (
    studentId: string,
    params?: { academic_year_id?: string },
  ): Promise<FeeConcession[]> => {
    const response = await apiClient.get(`/fee/concessions/history/${studentId}`, { params });
    return response.data.items || response.data;
  },

  /** GET /fee/concessions/{concession_id} */
  getById: async (concessionId: string): Promise<FeeConcession> => {
    const response = await apiClient.get(`/fee/concessions/${concessionId}`);
    return response.data;
  },

  /** PUT /fee/concessions/{concession_id} */
  update: async (
    concessionId: string,
    data: Partial<FeeConcessionCreate>,
  ): Promise<FeeConcession> => {
    const response = await apiClient.put(`/fee/concessions/${concessionId}`, data);
    return response.data;
  },

  /** DELETE /fee/concessions/{concession_id} */
  delete: async (concessionId: string): Promise<void> => {
    await apiClient.delete(`/fee/concessions/${concessionId}`);
  },
};

// ─── Fee Class Mapping Term Amounts API ───────────────────────────────────────

// Fee Class Mapping Term Amounts API
export const feeClassMappingTermAmountsApi = {
  updateTermAmount: async (id: string, data: Partial<FeeClassMappingTermAmount>): Promise<FeeClassMappingTermAmount> => {
    const response = await apiClient.put(`/fee/class-mapping-term-amounts/${id}`, data);
    return response.data;
  },

  createTermAmount: async (data: FeeClassMappingTermAmount): Promise<FeeClassMappingTermAmount> => {
    const response = await apiClient.post('/fee/class-mapping-term-amounts/', data);
    return response.data;
  },

  deleteTermAmount: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/class-mapping-term-amounts/${id}`);
  },
};

// Fee Categories API
export const feeCategoriesApi = {
  getFeeCategories: async (params?: {
    academic_year_id?: string;
    category_status?: string;
    skip?: number;
    limit?: number;
  }): Promise<FeeCategoryResponse[]> => {
    const response = await apiClient.get('/fee/categories/', { params });
    return response.data.items || response.data;
  },

  createFeeCategory: async (data: FeeCategoryRequest): Promise<FeeCategoryResponse> => {
    const response = await apiClient.post('/fee/categories/', data);
    return response.data;
  },

  updateFeeCategory: async (id: string, data: Partial<FeeCategoryRequest>): Promise<FeeCategoryResponse> => {
    const response = await apiClient.put(`/fee/categories/${id}`, data);
    return response.data;
  },

  deleteFeeCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/categories/${id}`);
  },

  getFeeCategory: async (id: string): Promise<FeeCategoryResponse> => {
    const response = await apiClient.get(`/fee/categories/${id}`);
    return response.data;
  },

  getFeeCategoriesDropdown: async (): Promise<{id: string, label: string}[]> => {
    const response = await apiClient.get('/fee/categories/dropdown');
    return (response.data as { id: string; category_name: string }[]).map(item => ({
      id: item.id,
      label: item.category_name,
    }));
  },
};

// Fee Types API
export const feeTypesApi = {
  getFeeTypes: async (): Promise<FeeTypeResponse[]> => {
    const response = await apiClient.get('/fee/types/');
    return response.data.items || response.data;
  },

  createFeeType: async (data: FeeTypeRequest): Promise<FeeTypeResponse> => {
    const response = await apiClient.post('/fee/types/', data);
    return response.data;
  },

  updateFeeType: async (id: string, data: Partial<FeeTypeRequest>): Promise<FeeTypeResponse> => {
    const response = await apiClient.put(`/fee/types/${id}`, data);
    return response.data;
  },

  deleteFeeType: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/types/${id}`);
  },

  getFeeType: async (id: string): Promise<FeeTypeResponse> => {
    const response = await apiClient.get(`/fee/types/${id}`);
    return response.data;
  },

  getFeeTypesDropdown: async (): Promise<{id: string, label: string}[]> => {
    const response = await apiClient.get('/fee/types/dropdown');
    return response.data;
  },
};

// Get fee terms by fee type (helper function)
export const getFeeTermsByFeeType = async (feeTypeId: string): Promise<FeeTypeResponse> => {
  return await feeTypesApi.getFeeType(feeTypeId);
};

// Fee Terms API
export const feeTermsApi = {
  getFeeTerms: async (params?: {
    academic_year_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<FeeTermResponse[]> => {
    const response = await apiClient.get('/fee/terms/', { params });
    return response.data.items || response.data;
  },

  createFeeTerm: async (data: FeeTermRequest): Promise<FeeTermResponse> => {
    const response = await apiClient.post('/fee/terms/', data);
    return response.data;
  },

  updateFeeTerm: async (id: string, data: Partial<FeeTermRequest>): Promise<FeeTermResponse> => {
    const response = await apiClient.put(`/fee/terms/${id}`, data);
    return response.data;
  },

  deleteFeeTerm: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/terms/${id}`);
  },

  getFeeTerm: async (id: string): Promise<FeeTermResponse> => {
    const response = await apiClient.get(`/fee/terms/${id}`);
    return response.data;
  },

  getFeeTermsDropdown: async (params?: { fee_type_id?: string; academic_year_id?: string }): Promise<{id: string, label: string}[]> => {
    const response = await apiClient.get('/fee/terms/dropdown', { params });
    return (response.data as { id: string; term_name: string }[]).map(item => ({
      id: item.id,
      label: item.term_name,
    }));
  },

  getFeeTermDates: async (feeTermId: string): Promise<FeeTermDateResponse[]> => {
    const response = await apiClient.get(`/fee/terms/${feeTermId}/dates`);
    return response.data;
  },

  deleteFeeTermDate: async (feeTermDateId: string): Promise<void> => {
    await apiClient.delete(`/fee/terms/dates/${feeTermDateId}`);
  },
};

// Fee Class Mappings
export interface FeeClassMappingResponse {
  id: string;
  class_id: string;
  class_name?: string;
  fee_type_id: string;
  fee_type_name?: string;
  total_fee?: string;
  academic_year_id?: string;
  academic_year_name?: string;
  all_by_default?: boolean;
  class_fee_mapping_terms?: any[];
  term_amounts?: FeeClassMappingTermAmount[];
  created_at?: string;
  updated_at?: string;
  term_amounts_count: number;
}

// Fee Class Mappings API
export const feeClassMappingsApi = {
  getFeeClassMappings: async (academicYearId?: string): Promise<FeeClassMappingResponse[]> => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
    const response = await apiClient.get('/fee/class-mappings/', { params });
    return response.data.items || response.data;
  },

  createFeeClassMapping: async (data: FeeClassMappingRequest): Promise<FeeClassMappingResponse> => {
    const response = await apiClient.post('/fee/class-mappings/', data);
    return response.data;
  },

  updateFeeClassMapping: async (id: string, data: Partial<FeeClassMappingRequest>): Promise<FeeClassMappingResponse> => {
    const response = await apiClient.put(`/fee/class-mappings/${id}`, data);
    return response.data;
  },

  deleteFeeClassMapping: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/class-mappings/${id}`);
  },

  getFeeClassMapping: async (id: string): Promise<FeeClassMappingResponse> => {
    const response = await apiClient.get(`/fee/class-mappings/${id}`);
    return response.data;
  },

  bulkCreateFeeClassMappings: async (data: FeeClassMappingBulkRequest): Promise<FeeClassMappingBulkResponse> => {
    const response = await apiClient.post('/fee/class-mappings/bulk', data);
    return response.data;
  },
};

// Fee Student Mappings API
export const feeStudentMappingsApi = {
  getFeeStudentMappings: async (filters?: { student_id?: string; class_id?: string; section_id?: string; fee_type_id?: string; academic_year_id?: string }): Promise<NewFeeStudentMappingResponse[]> => {
    const params = Object.fromEntries(
      Object.entries(filters || {}).filter(([key, value]) => value && typeof value === 'string' && value.trim() !== '')
    );
    const response = await apiClient.get('/fee/student-mappings/', { params });
    return response.data.items || response.data;
  },

  createFeeStudentMapping: async (data: NewFeeStudentMappingRequest): Promise<NewFeeStudentMappingResponse> => {
    const response = await apiClient.post('/fee/student-mappings/', data);
    return response.data;
  },

  updateFeeStudentMapping: async (id: string, data: FeeStudentMappingUpdateRequest): Promise<NewFeeStudentMappingResponse> => {
    const response = await apiClient.put(`/fee/student-mappings/${id}`, data);
    return response.data;
  },

  deleteFeeStudentMapping: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/student-mappings/${id}`);
  },

  getFeeStudentMapping: async (id: string): Promise<NewFeeStudentMappingResponse> => {
    const response = await apiClient.get(`/fee/student-mappings/${id}`);
    return response.data;
  },

  bulkCreateFeeStudentMappings: async (data: NewFeeStudentMappingBulkRequest): Promise<NewFeeStudentMappingBulkResponse> => {
    const response = await apiClient.post('/fee/student-mappings/bulk', data);
    return response.data;
  },
};

// Fee Transactions API
export const feeTransactionsApi = {
  getFeeTransactions: async (academicYearId?: string): Promise<FeeTransactionResponse[]> => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
    const response = await apiClient.get('/fee/transactions/', { params });
    return response.data.items || response.data;
  },

  createFeeTransaction: async (data: FeeTransactionCreateRequest): Promise<FeeTransactionResponse> => {
    const response = await apiClient.post('/fee/transactions/', data);
    return response.data;
  },

  updateFeeTransaction: async (id: string, data: Partial<FeeTransactionCreateRequest>): Promise<FeeTransactionResponse> => {
    const response = await apiClient.put(`/fee/transactions/${id}`, data);
    return response.data;
  },

  deleteFeeTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/transactions/${id}`);
  },

  getFeeTransaction: async (id: string): Promise<FeeTransactionResponse> => {
    const response = await apiClient.get(`/fee/transactions/${id}`);
    return response.data;
  },

  getFeeTransactionsHealth: async (): Promise<FeeTransactionHealthResponse> => {
    const response = await apiClient.get('/fee/transactions/health');
    return response.data;
  },

  getStudentFeeTransactionHistory: async (studentId: string): Promise<FeeTransactionResponse[]> => {
    const response = await apiClient.get(`/fee/transactions/student/${studentId}/history`);
    return response.data.items || response.data;
  },

  getStudentOutstandingFees: async (studentId: string): Promise<FeeTransactionResponse[]> => {
    const response = await apiClient.get(`/fee/transactions/student/${studentId}/outstanding`);
    return response.data.items || response.data;
  },

  getFeeTransactionByNumber: async (transactionNumber: string): Promise<FeeTransactionResponse> => {
    const response = await apiClient.get(`/fee/transactions/transaction-number/${transactionNumber}`);
    return response.data;
  },
};

// Fee Receipts API
export const feeReceiptsApi = {
  getFeeReceipts: async (): Promise<FeeReceiptResponse[]> => {
    const response = await apiClient.get('/fee/receipts/');
    return response.data.items || response.data;
  },

  createFeeReceipt: async (data: FeeReceiptRequest): Promise<FeeReceiptResponse> => {
    const response = await apiClient.post('/fee/receipts/', data);
    return response.data;
  },

  updateFeeReceipt: async (id: string, data: Partial<FeeReceiptRequest>): Promise<FeeReceiptResponse> => {
    const response = await apiClient.put(`/fee/receipts/${id}`, data);
    return response.data;
  },

  deleteFeeReceipt: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/receipts/${id}`);
  },

  getFeeReceipt: async (id: string): Promise<FeeReceiptResponse> => {
    const response = await apiClient.get(`/fee/receipts/${id}`);
    return response.data;
  },

  generateFeeReceipt: async (transactionId: string): Promise<FeeReceiptResponse> => {
    const response = await apiClient.post(`/fee/receipts/generate/${transactionId}`);
    return response.data;
  },

  getFeeReceiptsHealth: async (): Promise<FeeReceiptHealthResponse> => {
    const response = await apiClient.get('/fee/receipts/health');
    return response.data;
  },

  getFeeReceiptByNumber: async (receiptNumber: string): Promise<FeeReceiptResponse> => {
    const response = await apiClient.get(`/fee/receipts/number/${receiptNumber}`);
    return response.data;
  },

  getFeeReceiptContent: async (receiptId: string): Promise<FeeReceiptContentResponse> => {
    const response = await apiClient.get(`/fee/receipts/${receiptId}/content`);
    return response.data;
  },

  reprintFeeReceipt: async (receiptId: string): Promise<FeeReceiptResponse> => {
    const response = await apiClient.post(`/fee/receipts/${receiptId}/reprint`);
    return response.data;
  },

  verifyFeeReceipt: async (receiptId: string): Promise<FeeReceiptVerifyResponse> => {
    const response = await apiClient.get(`/fee/receipts/${receiptId}/verify`);
    return response.data;
  },
};

// Fee Refunds API
export const feeRefundsApi = {
  getFeeRefunds: async (academicYearId?: string): Promise<FeeRefundResponse[]> => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
    const response = await apiClient.get('/fee/refunds/', { params });
    return response.data.items || response.data;
  },

  createFeeRefund: async (data: FeeRefundCreateRequest): Promise<FeeRefundResponse> => {
    const response = await apiClient.post('/fee/refunds/', data);
    return response.data;
  },

  updateFeeRefund: async (id: string, data: Partial<FeeRefundCreateRequest>): Promise<FeeRefundResponse> => {
    const response = await apiClient.put(`/fee/refunds/${id}`, data);
    return response.data;
  },

  deleteFeeRefund: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/refunds/${id}`);
  },

  getFeeRefund: async (id: string): Promise<FeeRefundResponse> => {
    const response = await apiClient.get(`/fee/refunds/${id}`);
    return response.data;
  },

  approveFeeRefund: async (data: FeeRefundApproveRequest): Promise<FeeRefundApproveResponse> => {
    const response = await apiClient.post('/fee/refunds/approve', data);
    return response.data;
  },

  getApprovedProcessingRefunds: async (): Promise<FeeRefundResponse[]> => {
    const response = await apiClient.get('/fee/refunds/approved/processing');
    return response.data.items || response.data;
  },

  getFeeRefundsHealth: async (): Promise<FeeRefundHealthResponse> => {
    const response = await apiClient.get('/fee/refunds/health');
    return response.data;
  },

  getPendingApprovalRefunds: async (): Promise<FeeRefundResponse[]> => {
    const response = await apiClient.get('/fee/refunds/pending/approval');
    return response.data.items || response.data;
  },

  processFeeRefund: async (data: FeeRefundProcessRequest): Promise<FeeRefundProcessResponse> => {
    const response = await apiClient.post('/fee/refunds/process', data);
    return response.data;
  },

  getFeeRefundTransactionSummary: async (transactionId: string): Promise<FeeRefundTransactionSummaryResponse> => {
    const response = await apiClient.get(`/fee/refunds/transaction/${transactionId}/summary`);
    return response.data;
  },
};

// ─── Fee Reports API ──────────────────────────────────────────────────────────

// ── Fee Report response types (matches backend schemas) ──────────────────────

/** Returned by GET /reports/fees/collection-summary/stats */
export interface FeeCollectionStats {
  total_collected: string;   // Decimal as string
  total_due: string;
  collection_percentage: number;
  payment_methods: Record<string, string>;   // { cash: "12000.00", ... }
  fee_categories: Record<string, string>;
  monthly_collection: Record<string, string>;
}

/** Item in GET /reports/fees/collection-summary data[] */
export interface FeeCollectionItem {
  sl_no: number;
  transaction_number: string;
  student_admission_no: string;
  student_name: string;
  class_section: string;
  fee_category: string;
  fee_type: string;
  fee_term: string;
  amount_due: string;
  amount_paid: string;
  payment_method: string;
  payment_status: string;
  transaction_date: string;
  collected_by: string;
}

/** Item in GET /reports/fees/pending-fees data[] */
export interface FeePendingItem {
  sl_no: number;
  student_admission_no: string;
  student_name: string;
  class_section: string;
  fee_category: string;
  fee_type: string;
  fee_term: string;
  amount_due: string;
  amount_paid: string;
  balance_amount: string;
  due_date: string | null;
  days_overdue: number | null;
}

/** Item in GET /reports/fees/fee-structure data[] */
export interface FeeStructureItem {
  sl_no: number;
  fee_category: string;
  fee_type: string;
  fee_term: string;
  class_name: string;
  section_name: string | null;
  fee_amount: string;
  academic_year: string;
  status: string;
}

/** Stats returned by GET /reports/fee/pending-fees/stats */
export interface FeePendingStats {
  total_pending: string;
  student_count: number;
  overdue_count: number;
}

/** Stats returned by GET /reports/fee/structure/stats */
export interface FeeStructureStats {
  total_structure_amount: string;
  class_count: number;
  fee_type_count: number;
}

export const feeReportsApi = {
  /** GET /reports/fee/collection-summary/stats — aggregate totals card */
  getCollectionStats: async (params?: {
    academic_year_id?: string;
    date_from?: string;
    date_to?: string;
    payment_method?: string;
  }): Promise<FeeCollectionStats> => {
    const response = await apiClient.get('/reports/fee/collection-summary/stats', { params });
    return response.data;
  },

  /** GET /reports/fee/collection-summary — paginated transaction rows */
  getCollectionSummary: async (params?: {
    academic_year_id?: string;
    date_from?: string;
    date_to?: string;
    payment_method?: string;
    page?: number;
    page_size?: number;
  }): Promise<FeeCollectionItem[]> => {
    const response = await apiClient.get('/reports/fee/collection-summary', { params });
    return response.data.data || [];
  },

  /** GET /reports/fee/pending-fees — paginated pending rows */
  getPendingFees: async (params?: {
    academic_year_id?: string;
    class_id?: string;
    section_id?: string;
    days_overdue?: number;
    page?: number;
    page_size?: number;
  }): Promise<FeePendingItem[]> => {
    const response = await apiClient.get('/reports/fee/pending-fees', { params });
    return response.data.data || [];
  },

  /** GET /reports/fee/pending-fees/stats */
  getPendingFeesStats: async (params?: {
    academic_year_id?: string;
    class_id?: string;
  }): Promise<FeePendingStats> => {
    const response = await apiClient.get('/reports/fee/pending-fees/stats', { params });
    return response.data;
  },

  /** GET /reports/fee/structure — paginated structure rows */
  getFeeStructure: async (params?: {
    academic_year_id?: string;
    class_id?: string;
    fee_type_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<FeeStructureItem[]> => {
    const response = await apiClient.get('/reports/fee/structure', { params });
    return response.data.data || [];
  },

  /** GET /reports/fee/structure/stats */
  getFeeStructureStats: async (params?: {
    academic_year_id?: string;
    class_id?: string;
  }): Promise<FeeStructureStats> => {
    const response = await apiClient.get('/reports/fee/structure/stats', { params });
    return response.data;
  },

  /** POST /reports/fee/export → Blob (CSV/XLSX) */
  exportReport: async (data: {
    report_type: 'collection' | 'pending' | 'structure';
    format?: 'csv' | 'xlsx';
    filters?: Record<string, any>;
  }): Promise<Blob> => {
    const response = await apiClient.post('/reports/fee/export', data, { responseType: 'blob' });
    return response.data;
  },
};

// ─── Old Fees API ─────────────────────────────────────────────────────────────

export interface OldFeeItem {
  id: string;
  student_id: string;
  current_year_id: string;
  amount: number;
  description?: string;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface OldFeeManualCreate {
  student_id: string;
  current_year_id: string;
  amount: number;
  description?: string;
}

export interface OldFeeCarryForwardRequest {
  previous_year_id: string;
  current_year_id: string;
  student_ids?: string[];
}

export interface OldFeeUpdate {
  amount?: number;
  description?: string;
}

export const feeOldFeesApi = {
  /** GET /fee/old/student/{studentId} */
  getOldFeesByStudent: async (
    studentId: string,
    params?: { current_year_id?: string },
  ): Promise<OldFeeItem[]> => {
    const response = await apiClient.get(`/fee/old/student/${studentId}`, { params });
    return response.data.items || response.data;
  },

  /** POST /fee/old/ — create manually */
  createOldFee: async (data: OldFeeManualCreate): Promise<OldFeeItem> => {
    const response = await apiClient.post('/fee/old/', data);
    return response.data;
  },

  /** POST /fee/old/carry-forward */
  carryForward: async (data: OldFeeCarryForwardRequest): Promise<any> => {
    const response = await apiClient.post('/fee/old/carry-forward', data);
    return response.data;
  },

  /** PUT /fee/old/{id} */
  updateOldFee: async (id: string, data: OldFeeUpdate): Promise<OldFeeItem> => {
    const response = await apiClient.put(`/fee/old/${id}`, data);
    return response.data;
  },

  /** PATCH /fee/old/{id}/settle */
  settleOldFee: async (id: string): Promise<OldFeeItem> => {
    const response = await apiClient.patch(`/fee/old/${id}/settle`);
    return response.data;
  },

  /** DELETE /fee/old/{id} */
  deleteOldFee: async (id: string): Promise<void> => {
    await apiClient.delete(`/fee/old/${id}`);
  },
};