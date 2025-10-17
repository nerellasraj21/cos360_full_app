// Dashboard hooks
export {
    useFeeDashboardStats,
    useFeeValidationWarnings,
} from './useFeeDashboard';

// Fee Categories hooks
export {
    useFeeCategories,
    useFeeCategory,
    useFeeCategoryTypes,
    useCreateFeeCategory,
    useUpdateFeeCategory,
    useDeleteFeeCategory,
    feeCategoryKeys,
} from './useFeeCategories';

// Fee Terms hooks
export {
    useFeeTerms,
    useFeeTerm,
    useCreateFeeTerm,
    useUpdateFeeTerm,
    useDeleteFeeTerm,
    useAddPaymentDate,
    useUpdatePaymentDate,
    useDeletePaymentDate,
    feeTermKeys,
    paymentDateKeys,
} from './useFeeTerms';

// Fee Types hooks
export {
    useFeeTypes,
    useFeeType,
    useCreateFeeType,
    useUpdateFeeType,
    useDeleteFeeType,
    feeTypeKeys,
} from './useFeeTypes';

// Fee Mappings hooks
export {
    useFeeMappings,
    useFeeMapping,
    useFeeTermAmounts,
    useCreateFeeMapping,
    useUpdateFeeMapping,
    useDeleteFeeMapping,
    useSetTermAmounts,
    useUpdateTermAmount,
    feeMappingKeys,
} from './useFeeMappings';

// Bulk Operations hooks
export {
    useBulkDelete,
    useBulkStatusChange,
    useAcademicYearTransfer,
} from './useBulkOperations';

// Types for bulk operations
export type {
    BulkDeleteRequest,
    BulkStatusChangeRequest,
    BulkOperationResult,
    AcademicYearTransferRequest,
} from './useBulkOperations';