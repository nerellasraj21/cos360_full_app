import { feeTransactionApi as feeTransactionsApi } from './transactions';

// Explicit exports to resolve naming conflicts
export * from './categories';
export * from './types';
export * from './terms';

// Mappings - general fee mappings
export {
  getAllMappings as getFeeMappings,
  getMapping as getFeeMapping,
  createMapping as createFeeMapping,
  updateMapping as updateFeeMapping,
  deleteMapping as deleteFeeMapping,
  setTermAmounts,
  updateTermAmount,
  getTermAmounts,
  createClassMappingTermAmounts,
  updateClassMappingTermAmounts,
  deleteClassMappingTermAmounts,
  bulkCreateClassMappings as bulkCreateFeeClassMappings,
  bulkCreateStudentMappings as bulkCreateFeeStudentMappings,
} from './mappings';

// Transactions - with renamed healthCheck to avoid conflict with categories
export {
  healthCheck as transactionsHealthCheck,
  createTransaction,
  getTransactionById,
  updateTransactionStatus,
  searchTransactions,
  getOutstandingFees,
  getTransactionHistory,
  getTransactionByNumber,
  getMyFeeTransactions,
  getMyChildrenFeeTransactions,
  getMyOutstandingFees,
  getChildOutstandingFees,
  feeTransactionApi,
} from './transactions';

// Receipts - with renamed healthCheck
export {
  generateReceipt,
  getReceiptById,
  getReceiptByNumber,
  getReceiptContent,
  reprintReceipt,
  verifyReceipt,
  searchReceipts,
  healthCheck as receiptsHealthCheck,
} from './receipts';

export * from './refunds';

// API Objects
export { feeMappingsApi } from './mappings';
export { feeReceiptsApi } from './receipts';
export { feeClassMappingsApi } from './classMappings';
export { feeStudentMappingsApi } from './studentMappings';

// Class mappings - with specific prefixes
export {
  getAllMappings as getClassMappings,
  getMappingById as getClassMappingById,
  createMapping as createClassMapping,
  updateMapping as updateClassMapping,
  deleteMapping as deleteClassMapping,
  bulkCreateMappings as bulkCreateClassMappings,
} from './classMappings';

// Student mappings - with specific prefixes
export {
  createMapping as createStudentMapping,
  getAllMappings as getStudentMappings,
  getMappingById as getStudentMappingById,
  updateMapping as updateStudentMapping,
  deleteMapping as deleteStudentMapping,
  bulkCreateMappings as bulkCreateStudentMappings,
} from './studentMappings';

export const feeApi = {
  transactions: feeTransactionsApi,
};