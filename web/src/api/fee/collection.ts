import CAxios from '../index';
import axios from 'axios';
import {
  FEE_COLLECTION_SEARCH,
  FEE_COLLECTION_SUMMARY,
  FEE_COLLECTION_MY_SUMMARY,
  FEE_COLLECTION_CHILD_SUMMARY,
  FEE_COLLECTION_PAY,
  FEE_CONCESSIONS,
  FEE_CONCESSIONS_BULK,
  FEE_CONCESSIONS_STUDENT,
  FEE_CONCESSIONS_HISTORY,
  FEE_OLD,
  FEE_OLD_CARRY_FORWARD,
  FEE_OLD_STUDENT,
} from '@/constants/api/fee';
import type {
  StudentSearchParams,
  StudentSearchResult,
  FeeSummaryResponse,
  FeePaymentRequest,
  FeePaymentResponse,
  ConcessionSummaryResponse,
  ConcessionHistoryItem,
  BulkConcessionRequest,
  ConcessionUpdate,
  OldFeeSummaryResponse,
  OldFeeRead,
  OldFeeManualCreate,
  OldFeeCarryForwardRequest,
  OldFeeUpdate,
} from '@/types/fee/collection';

// ===== HELPER FUNCTIONS =====

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;
    const errors = error.response?.data?.errors;

    console.error('[Fee Collection API Error]', { status, detail, errors });

    if (status === 400 || status === 422) {
      if (Array.isArray(errors)) {
        const errorMessages = errors.map((e: { msg?: string; message?: string }) => e.msg || e.message).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      if (detail) throw new Error(detail);
      throw new Error('Validation error. Please check your input.');
    }

    if (detail) throw new Error(detail);
  }

  if (error instanceof Error) throw error;
  throw new Error('An unexpected error occurred');
}

const AMOUNT_KEYS = [
  'assigned_fee', 'fee_after_concession', 'paid_amount', 'due_amount',
  'grand_total_assigned', 'grand_total_fee', 'grand_total_paid', 'grand_total_due',
  'old_fee_pending_amount', 'concession_amount', 'current_due', 'amount',
  'original_amount', 'outstanding', 'amount_paid',
  'grand_total_concession', 'grand_total_fee_after_concession',
  'grand_total_original', 'grand_total_outstanding',
];

function normalizeAmounts<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj } as Record<string, unknown>;
  for (const key of AMOUNT_KEYS) {
    if (key in result && result[key] !== null && result[key] !== undefined) {
      result[key] = Number(result[key]);
    }
  }
  return result as T;
}

function normalizeResponseAmounts<T extends Record<string, unknown>>(data: T): T {
  const normalized = normalizeAmounts(data);
  if ('items' in normalized && Array.isArray(normalized.items)) {
    normalized.items = (normalized.items as Record<string, unknown>[]).map(normalizeAmounts);
  }
  if ('items_paid' in normalized && Array.isArray(normalized.items_paid)) {
    normalized.items_paid = (normalized.items_paid as Record<string, unknown>[]).map(normalizeAmounts);
  }
  return normalized as T;
}

// ===== API FUNCTIONS =====

export const feeCollectionApi = {
  // ---- Student Search ----

  searchStudents: async (params: StudentSearchParams): Promise<StudentSearchResult[]> => {
    try {
      const searchParams = new URLSearchParams();
      if (params.admission_number) searchParams.set('admission_number', params.admission_number);
      if (params.mobile_number) searchParams.set('mobile_number', params.mobile_number);
      if (params.class_id) searchParams.set('class_id', params.class_id);
      if (params.section_id) searchParams.set('section_id', params.section_id);
      if (params.city) searchParams.set('city', params.city);
      if (params.mandal) searchParams.set('mandal', params.mandal);
      if (params.village) searchParams.set('village', params.village);

      const response = await CAxios.get<StudentSearchResult[]>(
        `${FEE_COLLECTION_SEARCH}?${searchParams.toString()}`
      );
      return response.data;
    } catch (error) {
      handleApiError(error);
    }
  },

  // ---- Fee Summary ----

  getFeeSummary: async (
    studentId: string,
    academicYearId: string,
    asOfDate?: string
  ): Promise<FeeSummaryResponse> => {
    try {
      const params = new URLSearchParams({ academic_year_id: academicYearId });
      if (asOfDate) params.set('as_of_date', asOfDate);

      const response = await CAxios.get<FeeSummaryResponse>(
        `${FEE_COLLECTION_SUMMARY}/${studentId}?${params.toString()}`
      );
      return normalizeResponseAmounts(response.data as FeeSummaryResponse & Record<string, unknown>) as FeeSummaryResponse;
    } catch (error) {
      handleApiError(error);
    }
  },

  getMyFeeSummary: async (
    academicYearId: string,
    asOfDate?: string
  ): Promise<FeeSummaryResponse> => {
    try {
      const params = new URLSearchParams({ academic_year_id: academicYearId });
      if (asOfDate) params.set('as_of_date', asOfDate);

      const response = await CAxios.get<FeeSummaryResponse>(
        `${FEE_COLLECTION_MY_SUMMARY}?${params.toString()}`
      );
      return normalizeResponseAmounts(response.data as FeeSummaryResponse & Record<string, unknown>) as FeeSummaryResponse;
    } catch (error) {
      handleApiError(error);
    }
  },

  getChildFeeSummary: async (
    studentId: string,
    academicYearId: string,
    asOfDate?: string
  ): Promise<FeeSummaryResponse> => {
    try {
      const params = new URLSearchParams({ academic_year_id: academicYearId });
      if (asOfDate) params.set('as_of_date', asOfDate);

      const response = await CAxios.get<FeeSummaryResponse>(
        `${FEE_COLLECTION_CHILD_SUMMARY}/${studentId}?${params.toString()}`
      );
      return normalizeResponseAmounts(response.data as FeeSummaryResponse & Record<string, unknown>) as FeeSummaryResponse;
    } catch (error) {
      handleApiError(error);
    }
  },

  // ---- Fee Payment ----

  payFee: async (data: FeePaymentRequest): Promise<FeePaymentResponse> => {
    try {
      const response = await CAxios.post<FeePaymentResponse>(FEE_COLLECTION_PAY, data);
      return normalizeResponseAmounts(response.data as FeePaymentResponse & Record<string, unknown>) as FeePaymentResponse;
    } catch (error) {
      handleApiError(error);
    }
  },

  // ---- Concessions ----

  getConcessionSummary: async (
    studentId: string,
    academicYearId: string
  ): Promise<ConcessionSummaryResponse> => {
    try {
      const params = new URLSearchParams({ academic_year_id: academicYearId });
      const response = await CAxios.get<ConcessionSummaryResponse>(
        `${FEE_CONCESSIONS_STUDENT}/${studentId}?${params.toString()}`
      );
      return normalizeResponseAmounts(response.data as ConcessionSummaryResponse & Record<string, unknown>) as ConcessionSummaryResponse;
    } catch (error) {
      handleApiError(error);
    }
  },

  getConcessionHistory: async (
    studentId: string,
    academicYearId: string
  ): Promise<ConcessionHistoryItem[]> => {
    try {
      const params = new URLSearchParams({ academic_year_id: academicYearId });
      const response = await CAxios.get<ConcessionHistoryItem[]>(
        `${FEE_CONCESSIONS_HISTORY}/${studentId}?${params.toString()}`
      );
      return (response.data || []).map(normalizeAmounts);
    } catch (error) {
      handleApiError(error);
    }
  },

  bulkCreateConcessions: async (data: BulkConcessionRequest): Promise<void> => {
    try {
      await CAxios.post(FEE_CONCESSIONS_BULK, data);
    } catch (error) {
      handleApiError(error);
    }
  },

  updateConcession: async (id: string, data: ConcessionUpdate): Promise<void> => {
    try {
      await CAxios.put(`${FEE_CONCESSIONS}/${id}`, data);
    } catch (error) {
      handleApiError(error);
    }
  },

  deleteConcession: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`${FEE_CONCESSIONS}/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },

  // ---- Old Fees ----

  getOldFeesForStudent: async (
    studentId: string,
    currentYearId?: string
  ): Promise<OldFeeSummaryResponse> => {
    try {
      const params = new URLSearchParams();
      if (currentYearId) params.set('current_year_id', currentYearId);

      const url = params.toString()
        ? `${FEE_OLD_STUDENT}/${studentId}?${params.toString()}`
        : `${FEE_OLD_STUDENT}/${studentId}`;

      const response = await CAxios.get<OldFeeSummaryResponse>(url);
      return normalizeResponseAmounts(response.data as OldFeeSummaryResponse & Record<string, unknown>) as OldFeeSummaryResponse;
    } catch (error) {
      handleApiError(error);
    }
  },

  createOldFee: async (data: OldFeeManualCreate): Promise<OldFeeRead> => {
    try {
      const response = await CAxios.post<OldFeeRead>(`${FEE_OLD}/`, data);
      return normalizeAmounts(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  carryForwardOldFees: async (data: OldFeeCarryForwardRequest): Promise<OldFeeRead[]> => {
    try {
      const response = await CAxios.post<OldFeeRead[]>(FEE_OLD_CARRY_FORWARD, data);
      return (response.data || []).map(normalizeAmounts);
    } catch (error) {
      handleApiError(error);
    }
  },

  updateOldFee: async (id: string, data: OldFeeUpdate): Promise<OldFeeRead> => {
    try {
      const response = await CAxios.put<OldFeeRead>(`${FEE_OLD}/${id}`, data);
      return normalizeAmounts(response.data);
    } catch (error) {
      handleApiError(error);
    }
  },

  settleOldFee: async (id: string): Promise<void> => {
    try {
      await CAxios.patch(`${FEE_OLD}/${id}/settle`);
    } catch (error) {
      handleApiError(error);
    }
  },

  deleteOldFee: async (id: string): Promise<void> => {
    try {
      await CAxios.delete(`${FEE_OLD}/${id}`);
    } catch (error) {
      handleApiError(error);
    }
  },
};
