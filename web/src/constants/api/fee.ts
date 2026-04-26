// Fee Management API endpoints
export const FEE_BASE = '/fee';

// Categories
export const FEE_CATEGORIES = `${FEE_BASE}/categories/`;
export const FEE_CATEGORIES_DROPDOWN = `${FEE_CATEGORIES}dropdown`;

// Types
export const FEE_TYPES = `${FEE_BASE}/types/`;
export const FEE_TYPES_DROPDOWN = `${FEE_TYPES}dropdown`;

// Terms
export const FEE_TERMS = `${FEE_BASE}/terms/`;
export const FEE_TERMS_DROPDOWN = `${FEE_TERMS}dropdown`;
export const FEE_TERMS_DATES = `${FEE_TERMS}{fee_term_id}/dates`;

// Mappings
export const FEE_CLASS_MAPPINGS = `${FEE_BASE}/class-mappings/`;
export const FEE_CLASS_MAPPINGS_BULK = `${FEE_CLASS_MAPPINGS}bulk`;
export const FEE_STUDENT_MAPPINGS = `${FEE_BASE}/student-mappings/`;
export const FEE_STUDENT_MAPPINGS_BULK = `${FEE_STUDENT_MAPPINGS}bulk`;

// Transactions
export const FEE_TRANSACTIONS = `${FEE_BASE}/transactions/`;

// Receipts
export const FEE_RECEIPTS = `${FEE_BASE}/receipts/`;

// Refunds
export const FEE_REFUNDS = `${FEE_BASE}/refunds/`;

// Student Fee Dashboard
export const FEE_STUDENT_DASHBOARD = `${FEE_BASE}/student/{student_id}/dashboard`;

// Fee Reports (backend at /reports/fees/)
export const FEE_REPORTS_BASE = '/reports/fees';
export const FEE_COLLECTION_SUMMARY_REPORT = `${FEE_REPORTS_BASE}/collection-summary`;
export const FEE_PENDING_FEES_REPORT = `${FEE_REPORTS_BASE}/pending-fees`;
export const FEE_STRUCTURE_REPORT = `${FEE_REPORTS_BASE}/fee-structure`;
export const FEE_REPORT_EXPORT = `${FEE_REPORTS_BASE}/export`;

// Fee Collection
export const FEE_COLLECTION = `${FEE_BASE}/collection`;
export const FEE_COLLECTION_SEARCH = `${FEE_COLLECTION}/search-student`;
export const FEE_COLLECTION_SUMMARY = `${FEE_COLLECTION}/summary`;
export const FEE_COLLECTION_MY_SUMMARY = `${FEE_COLLECTION}/my-summary`;
export const FEE_COLLECTION_CHILD_SUMMARY = `${FEE_COLLECTION}/child-summary`;
export const FEE_COLLECTION_PAY = `${FEE_COLLECTION}/pay`;

// Fee Concessions
export const FEE_CONCESSIONS = `${FEE_BASE}/concessions`;
export const FEE_CONCESSIONS_BULK = `${FEE_CONCESSIONS}/bulk`;
export const FEE_CONCESSIONS_STUDENT = `${FEE_CONCESSIONS}/student`;
export const FEE_CONCESSIONS_HISTORY = `${FEE_CONCESSIONS}/history`;

// Fee Old Fees
export const FEE_OLD = `${FEE_BASE}/old-fees`;
export const FEE_OLD_CARRY_FORWARD = `${FEE_OLD}/carry-forward`;
export const FEE_OLD_STUDENT = `${FEE_OLD}/student`;

// Fee History
export const FEE_COLLECTION_HISTORY = `${FEE_COLLECTION}/history`;

// Fee Summary SMS (base — append /{id}/send-sms or /{id}/sms-preview)
export const FEE_COLLECTION_SUMMARY_SMS_BASE = `${FEE_COLLECTION}/summary`;

// Terms Due
export const FEE_COLLECTION_TERMS_DUE = `${FEE_COLLECTION}/terms-due`;