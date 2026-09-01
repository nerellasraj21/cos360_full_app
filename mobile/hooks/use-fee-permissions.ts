import { useQuery } from '@tanstack/react-query';
import {
  usePermissionProtectedQuery,
  usePermissionProtectedMutation,
  usePermissionProtectedListQuery,
  usePermissionProtectedCreateMutation,
  usePermissionProtectedUpdateMutation,
  usePermissionProtectedDeleteMutation
} from './use-permission-protected-api';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { 
  feeCategoriesApi,
  feeTypesApi,
  feeTermsApi,
  feeClassMappingsApi,
  feeStudentMappingsApi,
  feeTransactionsApi,
  feeRefundsApi
} from '@/src/api/fees';
import type {
  FeeCategoryResponse,
  FeeCategoryRequest,
  FeeTypeResponse,
  FeeTypeRequest,
  FeeTermResponse,
  FeeTermRequest,
  FeeClassMappingResponse,
  FeeClassMappingRequest,
  FeeStudentMappingResponse,
  FeeStudentMappingRequest,
  FeeTransactionResponse,
  FeeTransactionCreateRequest,
  FeeRefundResponse,
  FeeRefundRequest
} from '@/src/api/fees';

// Fee Categories Hooks
export const useFeeCategories = () => {
  return usePermissionProtectedListQuery<FeeCategoryResponse[]>(
    PERMISSION_RESOURCES.FEE_CATEGORIES,
    ['feeCategories'],
    feeCategoriesApi.getFeeCategories
  );
};

export const useCreateFeeCategory = () => {
  return usePermissionProtectedCreateMutation<FeeCategoryResponse, Error, FeeCategoryRequest>(
    PERMISSION_RESOURCES.FEE_CATEGORIES,
    feeCategoriesApi.createFeeCategory
  );
};

export const useUpdateFeeCategory = () => {
  return usePermissionProtectedUpdateMutation<FeeCategoryResponse, Error, { id: string; data: Partial<FeeCategoryRequest> }>(
    PERMISSION_RESOURCES.FEE_CATEGORIES,
    ({ id, data }) => feeCategoriesApi.updateFeeCategory(id, data)
  );
};

export const useDeleteFeeCategory = () => {
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.FEE_CATEGORIES,
    feeCategoriesApi.deleteFeeCategory
  );
};

export const useFeeCategoryTypes = (categoryId: string, enabled = true) => {
  return useQuery<FeeTypeResponse[]>({
    queryKey: ['feeTypes', 'by-category', categoryId],
    queryFn: async () => {
      const all = await feeTypesApi.getFeeTypes();
      return all.filter((t) => t.fee_category_id === categoryId);
    },
    enabled: !!categoryId && enabled,
  });
};

// Fee Types Hooks
export const useFeeTypes = () => {
  return usePermissionProtectedListQuery<FeeTypeResponse[]>(
    PERMISSION_RESOURCES.FEE_TYPES,
    ['feeTypes'],
    feeTypesApi.getFeeTypes
  );
};

export const useCreateFeeType = () => {
  return usePermissionProtectedCreateMutation<FeeTypeResponse, Error, FeeTypeRequest>(
    PERMISSION_RESOURCES.FEE_TYPES,
    feeTypesApi.createFeeType
  );
};

export const useUpdateFeeType = () => {
  return usePermissionProtectedUpdateMutation<FeeTypeResponse, Error, { id: string; data: Partial<FeeTypeRequest> }>(
    PERMISSION_RESOURCES.FEE_TYPES,
    ({ id, data }) => feeTypesApi.updateFeeType(id, data)
  );
};

export const useDeleteFeeType = () => {
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.FEE_TYPES,
    feeTypesApi.deleteFeeType
  );
};

// Fee Terms Hooks
export const useFeeTerms = (academicYearId?: string) => {
  return usePermissionProtectedQuery<FeeTermResponse[]>({
    resource: PERMISSION_RESOURCES.FEE_TERMS,
    action: 'list',
    queryKey: ['feeTerms', academicYearId],
    queryFn: () => feeTermsApi.getFeeTerms(academicYearId ? { academic_year_id: academicYearId } : undefined)
  });
};

export const useCreateFeeTerm = () => {
  return usePermissionProtectedCreateMutation<FeeTermResponse, Error, FeeTermRequest>(
    PERMISSION_RESOURCES.FEE_TERMS,
    feeTermsApi.createFeeTerm
  );
};

export const useUpdateFeeTerm = () => {
  return usePermissionProtectedUpdateMutation<FeeTermResponse, Error, { id: string; data: Partial<FeeTermRequest> }>(
    PERMISSION_RESOURCES.FEE_TERMS,
    ({ id, data }) => feeTermsApi.updateFeeTerm(id, data)
  );
};

export const useDeleteFeeTerm = () => {
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.FEE_TERMS,
    feeTermsApi.deleteFeeTerm
  );
};

// Fee Class Mappings Hooks
export const useFeeClassMappings = (academicYearId?: string) => {
  return usePermissionProtectedQuery<FeeClassMappingResponse[]>({
    resource: PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,
    action: 'list',
    queryKey: ['feeClassMappings', academicYearId],
    queryFn: () => feeClassMappingsApi.getFeeClassMappings(academicYearId)
  });
};

export const useCreateFeeClassMapping = () => {
  return usePermissionProtectedCreateMutation<FeeClassMappingResponse, Error, FeeClassMappingRequest>(
    PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,
    feeClassMappingsApi.createFeeClassMapping
  );
};

export const useUpdateFeeClassMapping = () => {
  return usePermissionProtectedUpdateMutation<FeeClassMappingResponse, Error, { id: string; data: Partial<FeeClassMappingRequest> }>(
    PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,
    ({ id, data }) => feeClassMappingsApi.updateFeeClassMapping(id, data)
  );
};

export const useDeleteFeeClassMapping = () => {
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.FEE_CLASS_MAPPINGS,
    feeClassMappingsApi.deleteFeeClassMapping
  );
};

// Fee Student Mappings Hooks
export const useFeeStudentMappings = (filters?: any) => {
  return usePermissionProtectedQuery<any[]>({
    resource: PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
    action: 'list',
    queryKey: ['feeStudentMappings', filters],
    queryFn: () => feeStudentMappingsApi.getFeeStudentMappings(filters)
  });
};

export const useCreateFeeStudentMapping = () => {
  return usePermissionProtectedCreateMutation<any, Error, FeeStudentMappingRequest>(
    PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
    (data: FeeStudentMappingRequest) => feeStudentMappingsApi.createFeeStudentMapping(data as any)
  );
};

export const useUpdateFeeStudentMapping = () => {
  return usePermissionProtectedUpdateMutation<any, Error, { id: string; data: Partial<FeeStudentMappingRequest> }>(
    PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
    ({ id, data }) => feeStudentMappingsApi.updateFeeStudentMapping(id, data)
  );
};

export const useDeleteFeeStudentMapping = () => {
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.FEE_STUDENT_MAPPINGS,
    feeStudentMappingsApi.deleteFeeStudentMapping
  );
};

// Fee Transactions Hooks
export const useFeeTransactions = (academicYearId?: string) => {
  return usePermissionProtectedQuery<FeeTransactionResponse[]>({
    resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,
    action: 'list',
    queryKey: ['feeTransactions', academicYearId],
    queryFn: () => feeTransactionsApi.getFeeTransactions(academicYearId)
  });
};

export const useCreateFeeTransaction = () => {
  return usePermissionProtectedCreateMutation<FeeTransactionResponse, Error, FeeTransactionCreateRequest>(
    PERMISSION_RESOURCES.FEE_TRANSACTIONS,
    feeTransactionsApi.createFeeTransaction
  );
};

export const useUpdateFeeTransaction = () => {
  return usePermissionProtectedUpdateMutation<FeeTransactionResponse, Error, { id: string; data: Partial<FeeTransactionCreateRequest> }>(
    PERMISSION_RESOURCES.FEE_TRANSACTIONS,
    ({ id, data }) => feeTransactionsApi.updateFeeTransaction(id, data)
  );
};

export const useStudentOutstandingFees = (studentId: string, enabled: boolean = true) => {
  return usePermissionProtectedQuery<any[]>({
    resource: PERMISSION_RESOURCES.FEE_TRANSACTIONS,
    action: 'read',
    queryKey: ['outstandingFees', studentId],
    queryFn: () => feeTransactionsApi.getStudentOutstandingFees(studentId),
    enabled: enabled && !!studentId
  });
};

// Fee Refunds Hooks
export const useFeeRefunds = (academicYearId?: string) => {
  return usePermissionProtectedQuery<FeeRefundResponse[]>({
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'list',
    queryKey: ['feeRefunds', academicYearId],
    queryFn: () => feeRefundsApi.getFeeRefunds(academicYearId)
  });
};

export const useCreateFeeRefund = () => {
  return usePermissionProtectedCreateMutation<FeeRefundResponse, Error, FeeRefundRequest>(
    PERMISSION_RESOURCES.FEE_REFUNDS,
    feeRefundsApi.createFeeRefund
  );
};

export const useApproveFeeRefund = () => {
  return usePermissionProtectedMutation<any, Error, { refund_id: string; action: 'approve' | 'reject'; approval_remarks: string }>({
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'approve',
    mutationFn: (data) => feeRefundsApi.approveFeeRefund(data),
  });
};

export const useProcessFeeRefund = () => {
  return usePermissionProtectedMutation<any, Error, { refund_id: string }>({
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'update',
    mutationFn: ({ refund_id }) => feeRefundsApi.processFeeRefund({ refund_id })
  });
};

export const useDeleteFeeRefund = () => {
  return usePermissionProtectedDeleteMutation<void, Error, string>(
    PERMISSION_RESOURCES.FEE_REFUNDS,
    feeRefundsApi.deleteFeeRefund
  );
};

export const useFeeRefundTransactionSummary = (transactionId: string, enabled: boolean = true) => {
  return usePermissionProtectedQuery<any>({
    resource: PERMISSION_RESOURCES.FEE_REFUNDS,
    action: 'read',
    queryKey: ['refundSummary', transactionId],
    queryFn: () => feeRefundsApi.getFeeRefundTransactionSummary(transactionId),
    enabled: enabled && !!transactionId
  });
};