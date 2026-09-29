import type {
  FeeRefund,
  FeeRefundCreateRequest,
  FeeRefundUpdateRequest,
  FeeRefundWithDetails,
  RefundSummary,
  RefundHealthCheck
} from '@/types/fee/refund';
import type { ApiError, PaginatedResponse } from '@/types/common';
import CAxios from '../index';
import { FEE_REFUNDS } from '@/constants/api/fee';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data) {
    const apiError: ApiError = error.response.data;
    return new Error(apiError.detail || 'An error occurred');
  }
  return new Error(error.message || 'Network error');
};

// Create fee refund
export const createFeeRefund = async (
  refundData: FeeRefundCreateRequest
): Promise<FeeRefund> => {
  try {
    const { data } = await CAxios.post(FEE_REFUNDS, refundData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// List fee refunds with pagination
export const fetchFeeRefunds = async (
  skip = 0,
  limit = 10,
  filters?: {
    student_id?: string;
    academic_year_id?: string;
    status?: string;
    processed_by?: string;
    date_range?: { start_date?: string; end_date?: string };
  }
): Promise<PaginatedResponse<FeeRefundWithDetails>> => {
  try {
    const params: any = { skip, limit };

    if (filters) {
      if (filters.student_id) params.student_id = filters.student_id;
      if (filters.academic_year_id) params.academic_year_id = filters.academic_year_id;
      if (filters.status) params.status = filters.status;
      if (filters.processed_by) params.processed_by = filters.processed_by;
      if (filters.date_range) {
        if (filters.date_range.start_date) params.start_date = filters.date_range.start_date;
        if (filters.date_range.end_date) params.end_date = filters.date_range.end_date;
      }
    }

    const { data } = await CAxios.get(FEE_REFUNDS, { params });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get fee refund by ID
export const fetchFeeRefundById = async (
  refundId: string
): Promise<FeeRefundWithDetails> => {
  try {
    const { data } = await CAxios.get(`${FEE_REFUNDS}${refundId}`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Update fee refund
export const updateFeeRefund = async (
  refundId: string,
  refundData: FeeRefundUpdateRequest
): Promise<FeeRefund> => {
  try {
    const { data } = await CAxios.put(`${FEE_REFUNDS}${refundId}`, refundData);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Delete fee refund
export const deleteFeeRefund = async (refundId: string): Promise<void> => {
  try {
    await CAxios.delete(`${FEE_REFUNDS}${refundId}`);
  } catch (error) {
    throw handleApiError(error);
  }
};

// Approve or reject refund
export const approveOrRejectRefund = async (data: {
  refund_id: string;
  action: 'approve' | 'reject';
  approved_by_user_id: string;
  approval_remarks?: string;
}): Promise<FeeRefund> => {
  try {
    const { data: response } = await CAxios.post(`${FEE_REFUNDS}approve`, data);
    return response;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Process refund
export const processRefund = async (data: {
  refund_id: string;
  processed_by_user_id: string;
  refund_method?: 'cash' | 'bank_transfer' | 'cheque';
  refund_reference?: string;
  processing_remarks?: string;
}): Promise<FeeRefund> => {
  try {
    const { data: response } = await CAxios.post(`${FEE_REFUNDS}process`, data);
    return response;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Cancel refund
export const cancelFeeRefund = async (
  refundId: string,
  reason: string
): Promise<FeeRefund> => {
  try {
    const { data } = await CAxios.post(`${FEE_REFUNDS}${refundId}/cancel`, {
      cancellation_reason: reason
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get refund by transaction ID
export const fetchRefundByTransactionId = async (
  transactionId: string
): Promise<FeeRefundWithDetails | null> => {
  try {
    const { data } = await CAxios.get(`${FEE_REFUNDS}by-transaction/${transactionId}`);
    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw handleApiError(error);
  }
};

// Get refund statistics
export const fetchRefundStatistics = async (
  academicYearId?: string,
  dateRange?: { date_from?: string; date_to?: string }
): Promise<{
  total_refund_amount: number;
  total_pending_refunds: number;
  total_approved_refunds: number;
  total_processed_refunds: number;
  total_rejected_refunds: number;
  refunds_by_reason: Record<string, number>;
  monthly_refunds: Array<{ month: string; amount: number; count: number }>;
}> => {
  try {
    const params: any = {};
    if (academicYearId) params.academic_year_id = academicYearId;
    if (dateRange) {
      if (dateRange.date_from) params.date_from = dateRange.date_from;
      if (dateRange.date_to) params.date_to = dateRange.date_to;
    }

    const { data } = await CAxios.get(`${FEE_REFUNDS}statistics`, { params });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Approve/reject refunds (bulk)
export const approveFeeRefunds = async (
  refundIds: string[],
  approvedBy: string,
  action: 'approve' | 'reject',
  rejectionReason?: string
): Promise<FeeRefund[]> => {
  try {
    const { data } = await CAxios.post(`${FEE_REFUNDS}approve`, {
      refund_ids: refundIds,
      approved_by: approvedBy,
      action,
      rejection_reason: rejectionReason
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Process refunds (bulk)
export const processFeeRefunds = async (
  refundIds: string[],
  processedBy: string,
  referenceNumber?: string
): Promise<FeeRefund[]> => {
  try {
    const { data } = await CAxios.post(`${FEE_REFUNDS}process`, {
      refund_ids: refundIds,
      processed_by: processedBy,
      reference_number: referenceNumber
    });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get pending refunds for approval
export const fetchPendingRefunds = async (
  skip = 0,
  limit = 10
): Promise<PaginatedResponse<FeeRefundWithDetails>> => {
  try {
    const params = { skip, limit };
    const { data } = await CAxios.get(`${FEE_REFUNDS}pending/approval`, { params });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get approved refunds for processing
export const fetchApprovedRefunds = async (
  skip = 0,
  limit = 10
): Promise<PaginatedResponse<FeeRefundWithDetails>> => {
  try {
    const params = { skip, limit };
    const { data } = await CAxios.get(`${FEE_REFUNDS}approved/processing`, { params });
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Get refund summary for transaction
export const fetchRefundSummary = async (
  transactionId: string
): Promise<RefundSummary> => {
  try {
    const { data } = await CAxios.get(`${FEE_REFUNDS}transaction/${transactionId}/summary`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Health check
export const fetchRefundHealth = async (): Promise<RefundHealthCheck> => {
  try {
    const { data } = await CAxios.get(`${FEE_REFUNDS}health`);
    return data;
  } catch (error) {
    throw handleApiError(error);
  }
};