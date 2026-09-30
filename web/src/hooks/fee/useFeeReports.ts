import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getFeeCollectionSummary,
  getFeeCollectionStats,
  getPendingFees,
  getPendingFeesStats,
  getFeeStructure,
  getFeeStructureStats,
  exportFeeReport,
} from '@/api/fee/reports';
import type {
  FeeCollectionFilter,
  PendingFeesFilter,
  FeeStructureFilter,
  FeeExportRequest,
} from '@/types/fee/report';

export const feeReportKeys = {
  all: ['fee-reports'] as const,
  collectionSummary: (filters: FeeCollectionFilter) =>
    [...feeReportKeys.all, 'collection-summary', filters] as const,
  collectionStats: (filters: Record<string, unknown>) =>
    [...feeReportKeys.all, 'collection-stats', filters] as const,
  pendingFees: (filters: PendingFeesFilter) =>
    [...feeReportKeys.all, 'pending-fees', filters] as const,
  pendingFeesStats: (filters: Record<string, unknown>) =>
    [...feeReportKeys.all, 'pending-fees-stats', filters] as const,
  feeStructure: (filters: FeeStructureFilter) =>
    [...feeReportKeys.all, 'fee-structure', filters] as const,
  feeStructureStats: (filters: Record<string, unknown>) =>
    [...feeReportKeys.all, 'fee-structure-stats', filters] as const,
};

export function useFeeCollectionSummary(filters: FeeCollectionFilter) {
  return useQuery({
    queryKey: feeReportKeys.collectionSummary(filters),
    queryFn: () => getFeeCollectionSummary(filters),
    enabled: Object.values(filters).some((v) => v !== undefined && v !== ''),
  });
}

export function useFeeCollectionStats(
  filters: Omit<FeeCollectionFilter, 'page' | 'page_size' | 'sort_by' | 'sort_order'>
) {
  return useQuery({
    queryKey: feeReportKeys.collectionStats(filters),
    queryFn: () => getFeeCollectionStats(filters),
  });
}

export function usePendingFees(filters: PendingFeesFilter) {
  return useQuery({
    queryKey: feeReportKeys.pendingFees(filters),
    queryFn: () => getPendingFees(filters),
    enabled: Object.values(filters).some((v) => v !== undefined && v !== ''),
  });
}

export function usePendingFeesStats(
  filters: Omit<PendingFeesFilter, 'page' | 'page_size' | 'sort_by' | 'sort_order'>
) {
  return useQuery({
    queryKey: feeReportKeys.pendingFeesStats(filters),
    queryFn: () => getPendingFeesStats(filters),
  });
}

export function useFeeStructure(filters: FeeStructureFilter) {
  return useQuery({
    queryKey: feeReportKeys.feeStructure(filters),
    queryFn: () => getFeeStructure(filters),
    enabled: Object.values(filters).some((v) => v !== undefined && v !== ''),
  });
}

export function useFeeStructureStats(
  filters: Omit<FeeStructureFilter, 'page' | 'page_size' | 'sort_by' | 'sort_order'>
) {
  return useQuery({
    queryKey: feeReportKeys.feeStructureStats(filters),
    queryFn: () => getFeeStructureStats(filters),
  });
}

export function useExportFeeReport() {
  return useMutation({
    mutationFn: (request: FeeExportRequest) => exportFeeReport(request),
    onSuccess: (blob, variables) => {
      const ext = variables.format === 'xlsx' ? 'xlsx' : variables.format;
      const filename = variables.filename || `fee_report_${variables.report_type}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export report');
    },
  });
}
