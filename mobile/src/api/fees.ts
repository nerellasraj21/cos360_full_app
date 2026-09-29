import apiClient from './client';
import type {
  FeeRefundCreateRequest,
  FeeRefundWithDetails as FeeRefundResponse,
  FeeClassMappingTermAmount,
  FeeStudentMappingCreateRequest as NewFeeStudentMappingRequest,
  FeeStudentMappingResponse as NewFeeStudentMappingResponse,
  FeeStudentMappingBulkRequest as NewFeeStudentMappingBulkRequest,
  FeeStudentMappingBulkResponse as NewFeeStudentMappingBulkResponse,
  FeeStudentMappingUpdateRequest,
} from '../types/fee';

// Type alias for backward compatibility
export type FeeRefundRequest = FeeRefundCreateRequest;

// Re-export types for backward compatibility
export type { FeeRefundCreateRequest, FeeRefundResponse, FeeClassMappingTermAmount };
export type {
  NewFeeStudentMappingRequest as FeeStudentMappingRequest,
  NewFeeStudentMappingResponse as FeeStudentMappingResponse,
  NewFeeStudentMappingBulkRequest as FeeStudentMappingBulkRequest,
  NewFeeStudentMappingBulkResponse as FeeStudentMappingBulkResponse,
};


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
  fee_category_name?: string;
  academic_year_id: string;
  fee_status: string;
  fee_term_id: string;
  fee_term_name?: string;
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
  // Web parity (`src/types/fee/transaction.ts`): backend-computed fields used
  // by My Transactions instead of deriving status client-side.
  transaction_number?: string;
  status?: string;
  receipt_generated?: boolean;
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

// Self-service outstanding-fee breakdown (GET /fee/transactions/my-outstanding-fees)
export interface OutstandingFeeItem {
  fee_type_id: string;
  fee_type_name: string;
  fee_term_id: string;
  fee_term_name: string;
  amount_due: number;
  amount_paid: number;
  outstanding_amount: number;
}

export interface OutstandingFeeSummary {
  student_id: string;
  student_admission_num: string;
  academic_year_id: string;
  total_outstanding: number;
  outstanding_items: OutstandingFeeItem[];
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
  // Rich fields returned by the backend list endpoint (used by the management UI)
  fee_transaction_id?: string;
  student_name?: string;
  student_admission_num?: string;
  class_section?: string;
  academic_year?: string;
  is_reprinted?: boolean;
  reprint_count?: number;
  generated_at?: string;
  remarks?: string;
  content_hash?: string;
}

export interface FeeReceiptHealthResponse {
  status: string;
}

export interface FeeReceiptContentResponse {
  content: string;
  content_type: string;
}

export interface FeeReceiptVerifyResponse {
  verified?: boolean;
  receipt_id: string;
  receipt_number: string;
  transaction_id?: string;
  // Backend integrity-check fields
  is_valid?: boolean;
  stored_hash?: string;
  current_hash?: string;
  verification_date?: string;
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

export interface FeePaymentItemRequest {
  fee_type_id: string;
  amount: number;
}

export interface FeePaymentRequest {
  student_id: string;
  academic_year_id: string;
  amount_to_pay: number;
  // Explicit per-fee-type breakdown. When provided, the backend allocates strictly to
  // these fee types instead of auto-distributing top-down across whatever has dues.
  fee_items?: FeePaymentItemRequest[];
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'dd' | 'card';
  receipt_number?: string;
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

/** Backend /fee/concessions/bulk contract (matches the web app). */
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

/** GET /fee/concessions/history/{student_id} item shape (matches the web app). */
export interface ConcessionHistoryItem {
  id: string;
  date_applied: string;
  fee_type_id?: string;
  fee_type_name: string;
  amount: number;
  reason: string;
  approver: string;
  recorded_by_staff_name: string | null;
}

/**
 * PUT /fee/concessions/{id} payload — the same field names as the
 * /fee/concessions/bulk contract (concession_amount/reason/approved_by),
 * NOT the legacy FeeConcessionCreate shape used by the flat bulkCreate() call.
 */
export interface ConcessionUpdatePayload {
  concession_amount?: number;
  reason?: string;
  approved_by?: string;
}

export interface TermsDueItem {
  fee_type_id: string;
  fee_type_name: string;
  term_id: string;
  term_name: string;
  term_date_id: string;
  due_date: string;
  term_amount: number;
  paid_amount: number;
  pending_amount: number;
}

export interface TermsDueResponse {
  student_id: string;
  student_name: string;
  admission_number: string;
  as_of_date: string;
  selected_month: string;
  current_month_terms: TermsDueItem[];
  overdue_terms: TermsDueItem[];
  total_current_month_pending: number;
  total_overdue_pending: number;
  grand_total_pending: number;
}

export interface SmsSummaryPreview {
  parent_name: string;
  parent_phone: string;
  student_name: string;
  admission_number: string;
  academic_year: string;
  due_amount: number;
  message: string;
  can_send: boolean;
}

export interface FeeHistoryFeeType {
  fee_type_id: string;
  fee_type_name: string;
  amount_paid: number;
}

export interface FeeHistoryItem {
  receipt_id: string;
  transaction_date: string;
  receipt_number: string;
  amount_paid: number;
  payment_method: string;
  fee_types_paid: FeeHistoryFeeType[];
}

export interface FeeHistoryResponse {
  student_id: string;
  academic_year_id: string;
  items: FeeHistoryItem[];
  total_paid: number;
}

export const feeCollectionApi = {
  /** GET /fee/collection/search-student — backend uses hyphenated path, not /search */
  searchStudent: async (params: {
    q?: string;
    class_id?: string;
    section_id?: string;
    academic_year_id?: string;
  }): Promise<FeeSearchStudentResult[]> => {
    const response = await apiClient.get('/fee/collection/search-student', { params });
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : raw?.items ?? raw?.results ?? raw?.data ?? [];
    // Normalize — backend returns first_name/last_name separately, not student_name
    return items.map((s: any) => {
      const fullName = s.student_name || s.full_name || s.name ||
        [s.first_name, s.last_name].filter(Boolean).join(' ').trim() ||
        s.studentName || '';
      return {
        ...s,
        student_name: fullName,
        admission_number: s.admission_number || s.admission_num || s.admissionNumber || '',
        class_name: s.class_name || s.className || '',
        section_name: s.section_name || s.sectionName || '',
        student_id: s.student_id || s.id || s.studentId || '',
        // expose parent contact for the card
        father_phone: s.parent_name || s.mobile_number || s.father_phone || null,
      };
    });
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

  /** GET /fee/collection/history/{student_id} — paid-receipt history for the year */
  getFeeHistory: async (
    studentId: string,
    params?: { academic_year_id?: string },
  ): Promise<FeeHistoryResponse> => {
    const response = await apiClient.get(`/fee/collection/history/${studentId}`, { params });
    return response.data;
  },

  /** GET /fee/collection/terms-due/{student_id} — term-wise installment dates (matches web) */
  getTermsDue: async (
    studentId: string,
    params?: { academic_year_id?: string; as_of_date?: string },
  ): Promise<TermsDueResponse> => {
    const response = await apiClient.get(`/fee/collection/terms-due/${studentId}`, { params });
    const raw = response.data;
    const parseItem = (item: any): TermsDueItem => ({
      ...item,
      term_amount: Number(item.term_amount),
      paid_amount: Number(item.paid_amount),
      pending_amount: Number(item.pending_amount),
    });
    return {
      ...raw,
      current_month_terms: (raw.current_month_terms ?? []).map(parseItem),
      overdue_terms: (raw.overdue_terms ?? []).map(parseItem),
      total_current_month_pending: Number(raw.total_current_month_pending),
      total_overdue_pending: Number(raw.total_overdue_pending),
      grand_total_pending: Number(raw.grand_total_pending),
    };
  },
};

export const feeConcessionsApi = {
  /** POST /fee/concessions/bulk — legacy flat-array shape (kept for back-compat) */
  bulkCreate: async (data: FeeConcessionCreate[]): Promise<FeeConcession[]> => {
    const response = await apiClient.post('/fee/concessions/bulk', data);
    return response.data;
  },

  /** POST /fee/concessions/bulk — correct wrapped payload the backend expects */
  bulkCreateConcessions: async (data: BulkConcessionRequest): Promise<void> => {
    await apiClient.post('/fee/concessions/bulk', data);
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
  ): Promise<ConcessionHistoryItem[]> => {
    const response = await apiClient.get(`/fee/concessions/history/${studentId}`, { params });
    return response.data.items || response.data;
  },

  /** GET /fee/concessions/{concession_id} */
  getById: async (concessionId: string): Promise<FeeConcession> => {
    const response = await apiClient.get(`/fee/concessions/${concessionId}`);
    return response.data;
  },

  /** PUT /fee/concessions/{concession_id} — see ConcessionUpdatePayload for the field names this endpoint actually expects. */
  update: async (concessionId: string, data: ConcessionUpdatePayload): Promise<void> => {
    await apiClient.put(`/fee/concessions/${concessionId}`, data);
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

  bulkCreateTermAmounts: async (data: {
    fee_class_mapping_id: string;
    term_amounts: { term_date_id: string; term_amount: number }[];
  }): Promise<any> => {
    // Web parity (src/api/fee/mappings.ts createClassMappingTermAmounts) — no
    // "/bulk" suffix; the backend route is the same one for single or many.
    const response = await apiClient.post('/fee/class-mapping-term-amounts/', data);
    return response.data;
  },

  bulkUpdateTermAmounts: async (data: {
    fee_class_mapping_id: string;
    term_amounts: { id: string; term_date_id: string; term_amount: number }[];
  }): Promise<any> => {
    // Web parity (src/api/fee/mappings.ts updateClassMappingTermAmounts) — no
    // "/bulk" suffix.
    const response = await apiClient.put('/fee/class-mapping-term-amounts/', data);
    return response.data;
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
  getFeeClassMappings: async (academicYearId?: string, classId?: string): Promise<FeeClassMappingResponse[]> => {
    const params: Record<string, string> = {};
    if (academicYearId) params.academic_year_id = academicYearId;
    if (classId) params.class_id = classId;
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

  /** PATCH /fee/class-mappings/{id}/toggle-mandatory — flips the all_by_default flag */
  toggleMandatory: async (id: string): Promise<FeeClassMappingResponse> => {
    const response = await apiClient.patch(`/fee/class-mappings/${id}/toggle-mandatory`);
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

  /**
   * GET /fee/transactions/my-outstanding-fees — student self-service
   * (requires only fee_transactions:read_own, already granted to Student).
   *
   * Web parity: replaces /fee/collection/my-summary as the data source for
   * the student "My Fees" screen — that endpoint needs fee_collection:read,
   * a permission the Student role doesn't have and isn't getting.
   */
  getMyOutstandingFees: async (): Promise<OutstandingFeeSummary> => {
    const response = await apiClient.get('/fee/transactions/my-outstanding-fees');
    return response.data;
  },

  /** GET /fee/transactions/my-fees — student views their own transactions (requires fee_transactions:read_own/list_own) */
  getMyFeeTransactions: async (params?: { skip?: number; limit?: number }): Promise<FeeTransactionResponse[]> => {
    const response = await apiClient.get('/fee/transactions/my-fees', { params });
    return response.data.items || response.data || [];
  },

  /**
   * GET /fee/transactions/my-children-fees — parent's "related" scope,
   * resolves server-side to every linked child's transactions in one list
   * (requires fee_transactions:read_related/list_related). Same pattern as
   * getMyReceipts above for fee_receipts.
   */
  getMyChildrenFeeTransactions: async (params?: { skip?: number; limit?: number; academic_year_id?: string; transaction_status?: string }): Promise<FeeTransactionResponse[]> => {
    const response = await apiClient.get('/fee/transactions/my-children-fees', { params });
    return response.data.items || response.data || [];
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

  /** GET /fee/receipts/my-receipts — student views their own receipts (requires fee_receipts:list_own) */
  getMyReceipts: async (params?: { limit?: number; offset?: number }): Promise<FeeReceiptResponse[]> => {
    const response = await apiClient.get('/fee/receipts/my-receipts', { params });
    return response.data.items || response.data || [];
  },

  /**
   * GET /fee/receipts/my-children-receipts — parent's "related" scope,
   * resolves server-side to every linked child's receipts in one list
   * (requires fee_receipts:list_related). Same pattern as
   * getMyChildrenFeeTransactions above for fee_transactions. A parent has no
   * fee_receipts:list_own grant, so getMyReceipts() above 403s for that role.
   */
  getMyChildrenReceipts: async (params?: { limit?: number; offset?: number }): Promise<FeeReceiptResponse[]> => {
    const response = await apiClient.get('/fee/receipts/my-children-receipts', { params });
    return response.data.items || response.data || [];
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

  /** POST /fee/refunds/{id}/cancel — proper cancel workflow (preserves audit trail), matches web app */
  cancelFeeRefund: async (id: string, reason: string): Promise<FeeRefundResponse> => {
    const response = await apiClient.post(`/fee/refunds/${id}/cancel`, {
      cancellation_reason: reason,
    });
    return response.data;
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