import { useQuery } from '@tanstack/react-query';
import { usePermissionProtectedQuery } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import {
  feeReportsApi,
  FeeCollectionStats,
  FeeCollectionItem,
  FeePendingItem,
  FeePendingStats,
  FeeStructureItem,
  FeeStructureStats,
} from '../../index';

export function useFeeCollectionStats(params?: {
  academic_year_id?: string;
  date_from?: string;
  date_to?: string;
  payment_method?: string;
}) {
  return usePermissionProtectedQuery<FeeCollectionStats>({
    queryKey: ['feeReports', 'collection-stats', params],
    queryFn: () => feeReportsApi.getCollectionStats(params),
    resource: PERMISSION_RESOURCES.FEE_REPORTS,
    action: 'read',
  });
}

export function useFeeCollectionSummaryReport(params?: {
  academic_year_id?: string;
  date_from?: string;
  date_to?: string;
  payment_method?: string;
  page?: number;
  page_size?: number;
}) {
  return usePermissionProtectedQuery<FeeCollectionItem[]>({
    queryKey: ['feeReports', 'collection-summary', params],
    queryFn: () => feeReportsApi.getCollectionSummary(params),
    resource: PERMISSION_RESOURCES.FEE_REPORTS,
    action: 'read',
  });
}

export function useFeePendingReport(params?: {
  academic_year_id?: string;
  class_id?: string;
  section_id?: string;
  days_overdue?: number;
  page?: number;
  page_size?: number;
}) {
  return usePermissionProtectedQuery<FeePendingItem[]>({
    queryKey: ['feeReports', 'pending', params],
    queryFn: () => feeReportsApi.getPendingFees(params),
    resource: PERMISSION_RESOURCES.FEE_REPORTS,
    action: 'read',
  });
}

export function useFeePendingStats(params?: { academic_year_id?: string; class_id?: string }) {
  return usePermissionProtectedQuery<FeePendingStats>({
    queryKey: ['feeReports', 'pending-stats', params],
    queryFn: () => feeReportsApi.getPendingFeesStats(params),
    resource: PERMISSION_RESOURCES.FEE_REPORTS,
    action: 'read',
  });
}

export function useFeeStructureReport(params?: {
  academic_year_id?: string;
  class_id?: string;
  fee_type_id?: string;
  page?: number;
  page_size?: number;
}) {
  return usePermissionProtectedQuery<FeeStructureItem[]>({
    queryKey: ['feeReports', 'structure', params],
    queryFn: () => feeReportsApi.getFeeStructure(params),
    resource: PERMISSION_RESOURCES.FEE_REPORTS,
    action: 'read',
  });
}

export function useFeeStructureStats(params?: { academic_year_id?: string; class_id?: string }) {
  return usePermissionProtectedQuery<FeeStructureStats>({
    queryKey: ['feeReports', 'structure-stats', params],
    queryFn: () => feeReportsApi.getFeeStructureStats(params),
    resource: PERMISSION_RESOURCES.FEE_REPORTS,
    action: 'read',
  });
}

export function useFeeReportExport() {
  return useQuery({
    queryKey: ['feeReports', 'export'],
    queryFn: () => Promise.resolve(null),
    enabled: false,
  });
}
