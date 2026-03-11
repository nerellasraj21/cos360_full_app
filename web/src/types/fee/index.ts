// Export all fee-related types
export type { FeeCategory, FeeCategoryInput, FeeCategoryCreateRequest, FeeCategoryUpdateRequest, FeeCategorySearchParams, FeeCategoryListResponse, FeeCategoryHealthCheck } from './category';
export type { FeeTerm, FeeTermInput, FeeTermCreateRequest, FeeTermUpdateRequest, FeeTermDate, FeeTermDateInput, FeeTermDropdown } from './term';
export type { FeeType, FeeTypeCreateRequest, FeeTypeUpdateRequest, FeeTypeDropdown } from './type';
export type {
    FeeClassMapping,
    FeeClassMappingInput,
    FeeClassMappingCreateRequest,
    FeeClassMappingUpdateRequest,
    FeeClassMappingTermAmount,
    FeeStudentMapping,
    FeeStudentMappingCreateRequest,
    FeeStudentMappingUpdateRequest,
    FeeTermAmount,
    FeeTermAmountCreateRequest,
    FeeTermAmountUpdateRequest
} from './mapping';
export type { FeeTransaction, FeeTransactionItem, FeeTransactionCreateRequest, FeeTransactionUpdateRequest, FeeTransactionDetail } from './transaction';
export type { FeeReceipt, FeeReceiptCreate, FeeReceiptUpdate } from './receipt';
export type { FeeRefund, FeeRefundCreateRequest, FeeRefundUpdateRequest, FeeRefundWithDetails } from './refund';
export type {
    CollectionPaymentMethod,
    StudentSearchParams,
    StudentSearchResult,
    FeeSummaryItem,
    FeeSummaryResponse,
    FeePaymentRequest,
    FeePaymentItemPaid,
    FeePaymentResponse,
    ConcessionSummaryItem,
    ConcessionSummaryResponse,
    ConcessionItemCreate,
    BulkConcessionRequest,
    ConcessionHistoryItem,
    ConcessionUpdate,
    OldFeeRead,
    OldFeeSummaryResponse,
    OldFeeManualCreate,
    OldFeeCarryForwardRequest,
    OldFeeUpdate,
} from './collection';