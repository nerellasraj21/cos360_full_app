import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeCollectionApi } from '@/api/fee';
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
} from '@/types/fee';

// ===== QUERY KEYS =====

export const feeCollectionKeys = {
  all: ['fee-collection'] as const,
  search: (params: StudentSearchParams) =>
    [...feeCollectionKeys.all, 'search', params] as const,
  summary: (studentId: string, yearId: string) =>
    [...feeCollectionKeys.all, 'summary', studentId, yearId] as const,
  mySummary: (yearId: string) =>
    [...feeCollectionKeys.all, 'my-summary', yearId] as const,
  childSummary: (studentId: string, yearId: string) =>
    [...feeCollectionKeys.all, 'child-summary', studentId, yearId] as const,
};

export const feeConcessionKeys = {
  all: ['fee-concessions'] as const,
  summary: (studentId: string, yearId: string) =>
    [...feeConcessionKeys.all, 'summary', studentId, yearId] as const,
  history: (studentId: string, yearId: string) =>
    [...feeConcessionKeys.all, 'history', studentId, yearId] as const,
};

export const feeOldKeys = {
  all: ['fee-old'] as const,
  student: (studentId: string, yearId?: string) =>
    [...feeOldKeys.all, 'student', studentId, yearId] as const,
};

// ===== STUDENT SEARCH =====

export function useStudentSearch(params: StudentSearchParams, enabled: boolean) {
  return useQuery<StudentSearchResult[]>({
    queryKey: feeCollectionKeys.search(params),
    queryFn: () => feeCollectionApi.searchStudents(params),
    enabled,
  });
}

// ===== FEE SUMMARY =====

export function useFeeSummary(studentId: string, academicYearId: string) {
  return useQuery<FeeSummaryResponse>({
    queryKey: feeCollectionKeys.summary(studentId, academicYearId),
    queryFn: () => feeCollectionApi.getFeeSummary(studentId, academicYearId),
    enabled: !!studentId && !!academicYearId,
    staleTime: 30_000,
  });
}

export function useMyFeeSummary(academicYearId: string) {
  return useQuery<FeeSummaryResponse>({
    queryKey: feeCollectionKeys.mySummary(academicYearId),
    queryFn: () => feeCollectionApi.getMyFeeSummary(academicYearId),
    enabled: !!academicYearId,
    staleTime: 30_000,
  });
}

export function useChildFeeSummary(studentId: string, academicYearId: string) {
  return useQuery<FeeSummaryResponse>({
    queryKey: feeCollectionKeys.childSummary(studentId, academicYearId),
    queryFn: () => feeCollectionApi.getChildFeeSummary(studentId, academicYearId),
    enabled: !!studentId && !!academicYearId,
    staleTime: 30_000,
  });
}

// ===== FEE PAYMENT =====

export function usePayFee() {
  const queryClient = useQueryClient();
  return useMutation<FeePaymentResponse, Error, FeePaymentRequest>({
    mutationFn: (data) => feeCollectionApi.payFee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Payment recorded successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to process payment');
    },
  });
}

// ===== CONCESSIONS =====

export function useConcessionSummary(studentId: string, academicYearId: string) {
  return useQuery<ConcessionSummaryResponse>({
    queryKey: feeConcessionKeys.summary(studentId, academicYearId),
    queryFn: () => feeCollectionApi.getConcessionSummary(studentId, academicYearId),
    enabled: !!studentId && !!academicYearId,
  });
}

export function useConcessionHistory(studentId: string, academicYearId: string, enabled: boolean) {
  return useQuery<ConcessionHistoryItem[]>({
    queryKey: feeConcessionKeys.history(studentId, academicYearId),
    queryFn: () => feeCollectionApi.getConcessionHistory(studentId, academicYearId),
    enabled: enabled && !!studentId && !!academicYearId,
  });
}

export function useBulkCreateConcessions() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, BulkConcessionRequest>({
    mutationFn: (data) => feeCollectionApi.bulkCreateConcessions(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeConcessionKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Concessions saved successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save concessions');
    },
  });
}

export function useUpdateConcession() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { id: string; data: ConcessionUpdate }>({
    mutationFn: ({ id, data }) => feeCollectionApi.updateConcession(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeConcessionKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Concession updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update concession');
    },
  });
}

export function useDeleteConcession() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => feeCollectionApi.deleteConcession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeConcessionKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Concession revoked successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke concession');
    },
  });
}

// ===== OLD FEES =====

export function useOldFeesForStudent(studentId: string, currentYearId?: string) {
  return useQuery<OldFeeSummaryResponse>({
    queryKey: feeOldKeys.student(studentId, currentYearId),
    queryFn: () => feeCollectionApi.getOldFeesForStudent(studentId, currentYearId),
    enabled: !!studentId,
  });
}

export function useCreateOldFee() {
  const queryClient = useQueryClient();
  return useMutation<OldFeeRead, Error, OldFeeManualCreate>({
    mutationFn: (data) => feeCollectionApi.createOldFee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeOldKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Old fee entry added successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add old fee entry');
    },
  });
}

export function useCarryForwardOldFees() {
  const queryClient = useQueryClient();
  return useMutation<OldFeeRead[], Error, OldFeeCarryForwardRequest>({
    mutationFn: (data) => feeCollectionApi.carryForwardOldFees(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: feeOldKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success(`Carried forward ${data.length} fee record(s)`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to carry forward fees');
    },
  });
}

export function useUpdateOldFee() {
  const queryClient = useQueryClient();
  return useMutation<OldFeeRead, Error, { id: string; data: OldFeeUpdate }>({
    mutationFn: ({ id, data }) => feeCollectionApi.updateOldFee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeOldKeys.all });
      toast.success('Old fee updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update old fee');
    },
  });
}

export function useSettleOldFee() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => feeCollectionApi.settleOldFee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeOldKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Old fee marked as settled');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to settle old fee');
    },
  });
}

export function useDeleteOldFee() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => feeCollectionApi.deleteOldFee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeOldKeys.all });
      queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });
      toast.success('Old fee entry deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete old fee entry');
    },
  });
}
