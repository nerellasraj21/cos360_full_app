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
  fee_term_id: string;
  amount_due: number;
  amount_paid: number;
  description?: string;
}

export interface FeeTransactionItemResponse {
  id: string;
  fee_type_id: string;
  fee_term_id: string;
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
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'online';
  transaction_items: FeeTransactionItemRequest[];
  transaction_date?: string;
  remarks?: string;
  collected_by?: string;
  upi_reference?: string;
  cheque_number?: string;
  bank_reference?: string;
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
  bank_reference?: string;
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
  getFeeCategories: async (): Promise<FeeCategoryResponse[]> => {
    const response = await apiClient.get('/fee/categories/');
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
    console.log('deleteFeeCategory API called with id:', id);
    try {
      const response = await apiClient.delete(`/fee/categories/${id}`);
      console.log('deleteFeeCategory API response:', response);
    } catch (error) {
      console.log('deleteFeeCategory API error:', error);
      throw error;
    }
  },

  getFeeCategory: async (id: string): Promise<FeeCategoryResponse> => {
    const response = await apiClient.get(`/fee/categories/${id}`);
    return response.data;
  },

  getFeeCategoriesDropdown: async (): Promise<{id: string, label: string}[]> => {
    const response = await apiClient.get('/fee/categories/dropdown');
    return response.data;
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
  getFeeTerms: async (academicYearId?: string): Promise<FeeTermResponse[]> => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
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
    console.log('deleteFeeTerm API called with id:', id);
    await apiClient.delete(`/fee/terms/${id}`);
  },

  getFeeTerm: async (id: string): Promise<FeeTermResponse> => {
    const response = await apiClient.get(`/fee/terms/${id}`);
    return response.data;
  },

  getFeeTermsDropdown: async (academicYearId?: string): Promise<{id: string, label: string}[]> => {
    const params = academicYearId ? { academic_year_id: academicYearId } : {};
    const response = await apiClient.get('/fee/terms/dropdown', { params });
    return response.data;
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
    console.log('createFeeTransaction called with data:', data);
    const response = await apiClient.post('/fee/transactions/', data);
    console.log('createFeeTransaction response:', response.data);
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