import CAxios from '../index';
import axios from 'axios';
import {
  FEE_COLLECTION_SUMMARY_REPORT,
  FEE_PENDING_FEES_REPORT,
  FEE_STRUCTURE_REPORT,
  FEE_REPORT_EXPORT,
} from '@/constants/api/fee';
import type {
  FeeCollectionFilter,
  PendingFeesFilter,
  FeeStructureFilter,
  FeeCollectionSummaryItem,
  PendingFeesItem,
  FeeStructureItem,
  FeeCollectionStats,
  PendingFeesStats,
  FeeStructureStats,
  FeeReportResponse,
  FeeExportRequest,
} from '@/types/fee/report';

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    throw new Error(typeof detail === 'string' ? detail : error.message);
  }
  throw error;
}

function buildParams(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

/** Normalize Decimal strings from backend to numbers */
function normalizeAmounts<T extends Record<string, unknown>>(obj: T): T {
  const AMOUNT_KEYS = [
    'amount_due', 'amount_paid', 'balance_amount', 'fee_amount',
    'total_collected', 'total_due', 'total_pending_amount', 'total_overdue_amount',
    'average_fee_amount',
  ];
  const result = { ...obj };
  for (const key of AMOUNT_KEYS) {
    if (key in result && typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = Number(result[key]);
    }
  }
  return result;
}

function normalizeRecordAmounts(record: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = typeof value === 'string' ? Number(value) : (value as number);
  }
  return result;
}

// --- Collection Summary ---

export async function getFeeCollectionSummary(
  filters: FeeCollectionFilter
): Promise<FeeReportResponse<FeeCollectionSummaryItem>> {
  try {
    const query = buildParams(filters as Record<string, unknown>);
    const { data } = await CAxios.get(`${FEE_COLLECTION_SUMMARY_REPORT}?${query}`);
    return {
      ...data,
      data: (data.data || []).map((item: Record<string, unknown>) => normalizeAmounts(item)),
    };
  } catch (error) {
    handleApiError(error);
  }
}

export async function getFeeCollectionStats(
  filters: Omit<FeeCollectionFilter, 'page' | 'page_size' | 'sort_by' | 'sort_order'>
): Promise<FeeCollectionStats> {
  try {
    const query = buildParams(filters as Record<string, unknown>);
    const { data } = await CAxios.get(`${FEE_COLLECTION_SUMMARY_REPORT}/stats?${query}`);
    return {
      total_collected: Number(data.total_collected),
      total_due: Number(data.total_due),
      collection_percentage: data.collection_percentage,
      payment_methods: normalizeRecordAmounts(data.payment_methods || {}),
      fee_categories: normalizeRecordAmounts(data.fee_categories || {}),
      monthly_collection: normalizeRecordAmounts(data.monthly_collection || {}),
    };
  } catch (error) {
    handleApiError(error);
  }
}

// --- Pending Fees ---

export async function getPendingFees(
  filters: PendingFeesFilter
): Promise<FeeReportResponse<PendingFeesItem>> {
  try {
    const query = buildParams(filters as Record<string, unknown>);
    const { data } = await CAxios.get(`${FEE_PENDING_FEES_REPORT}?${query}`);
    return {
      ...data,
      data: (data.data || []).map((item: Record<string, unknown>) => normalizeAmounts(item)),
    };
  } catch (error) {
    handleApiError(error);
  }
}

export async function getPendingFeesStats(
  filters: Omit<PendingFeesFilter, 'page' | 'page_size' | 'sort_by' | 'sort_order'>
): Promise<PendingFeesStats> {
  try {
    const query = buildParams(filters as Record<string, unknown>);
    const { data } = await CAxios.get(`${FEE_PENDING_FEES_REPORT}/stats?${query}`);
    return {
      total_pending_amount: Number(data.total_pending_amount),
      total_overdue_amount: Number(data.total_overdue_amount),
      total_students_with_pending: data.total_students_with_pending,
      total_students_overdue: data.total_students_overdue,
      average_overdue_days: data.average_overdue_days,
      fee_categories_pending: normalizeRecordAmounts(data.fee_categories_pending || {}),
      class_wise_pending: normalizeRecordAmounts(data.class_wise_pending || {}),
    };
  } catch (error) {
    handleApiError(error);
  }
}

// --- Fee Structure ---

export async function getFeeStructure(
  filters: FeeStructureFilter
): Promise<FeeReportResponse<FeeStructureItem>> {
  try {
    const query = buildParams(filters as Record<string, unknown>);
    const { data } = await CAxios.get(`${FEE_STRUCTURE_REPORT}?${query}`);
    return {
      ...data,
      data: (data.data || []).map((item: Record<string, unknown>) => normalizeAmounts(item)),
    };
  } catch (error) {
    handleApiError(error);
  }
}

export async function getFeeStructureStats(
  filters: Omit<FeeStructureFilter, 'page' | 'page_size' | 'sort_by' | 'sort_order'>
): Promise<FeeStructureStats> {
  try {
    const query = buildParams(filters as Record<string, unknown>);
    const { data } = await CAxios.get(`${FEE_STRUCTURE_REPORT}/stats?${query}`);
    return {
      total_fee_types: data.total_fee_types,
      total_categories: data.total_categories,
      total_terms: data.total_terms,
      average_fee_amount: Number(data.average_fee_amount),
      fee_range: {
        min: Number(data.fee_range?.min ?? 0),
        max: Number(data.fee_range?.max ?? 0),
      },
      category_wise_breakdown: data.category_wise_breakdown || {},
    };
  } catch (error) {
    handleApiError(error);
  }
}

// --- Export ---

export async function exportFeeReport(request: FeeExportRequest): Promise<Blob> {
  try {
    const { data } = await CAxios.post(FEE_REPORT_EXPORT, request, {
      responseType: 'blob',
    });
    return data;
  } catch (error) {
    handleApiError(error);
  }
}

export const feeReportsApi = {
  getFeeCollectionSummary,
  getFeeCollectionStats,
  getPendingFees,
  getPendingFeesStats,
  getFeeStructure,
  getFeeStructureStats,
  exportFeeReport,
};
