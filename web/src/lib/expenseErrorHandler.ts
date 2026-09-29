
import { expenseNotifications } from './expenseNotifications';

export interface ApiError {
  error_code: string;
  message: string;
  details?: any;
}

export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'Input validation failed',
  DUPLICATE_IDEMPOTENCY_KEY: 'Transaction with this idempotency key already exists',

  // Permission errors
  INSUFFICIENT_PERMISSIONS: 'User lacks required permissions',
  DEPARTMENT_ACCESS_DENIED: 'Access denied to specified department',

  // Business logic errors
  INACTIVE_EXPENSE_TYPE: 'Cannot use inactive expense type',
  TRANSACTION_IMMUTABLE: 'Cannot modify transaction in current status',
  INVALID_STATUS_FOR_APPROVAL: 'Transaction status prevents approval',

  // System errors
  RATE_LIMIT_EXCEEDED: 'Too many requests',
  INTERNAL_SERVER_ERROR: 'System error occurred'
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ============================================================================
// RATE LIMITING HANDLING
// ============================================================================

const RATE_LIMITS = {
  categories: { create: 30, update: 50, delete: 20 },
  types: { create: 30, update: 50, delete: 20 },
  transactions: { create: 50, update: 30, approve: 20 },
  attachments: { upload: 20, download: 50, delete: 20 },
  audit: { logs: 100, summary: 50 },
  settings: { create: 20, update: 30, delete: 10 },
  reports: { generate: 50, summary: 100, export: 10 }
};

function handleRateLimit(action: string, retryAfter?: number): void {
  const message = `Rate limit exceeded for ${action}. ${retryAfter ? `Try again in ${retryAfter} seconds.` : ''}`;
  expenseNotifications.rateLimitError(retryAfter);

  // Disable action button temporarily
  const button = document.querySelector(`[data-action="${action}"]`) as HTMLButtonElement;
  if (button) {
    button.disabled = true;
    setTimeout(() => {
      button.disabled = false;
    }, (retryAfter || 60) * 1000);
  }
}

// ============================================================================
// MAIN ERROR HANDLER
// ============================================================================

export function handleExpenseApiError(error: any, variables?: any, context?: any): void {
  console.error('Expense API Error:', error);

  // Handle authentication errors
  if (error.message?.includes('Unauthorized') || error.status === 401) {
    // Redirect to login
    window.location.href = '/login';
    return;
  }

  // Handle permission errors
  if (error.message?.includes('Forbidden') || error.status === 403) {
    expenseNotifications.permissionError();
    return;
  }

  // Handle rate limiting
  if (error.message?.includes('rate limit') || error.status === 429) {
    const retryAfter = error.response?.headers?.['retry-after'];
    handleRateLimit('operation', retryAfter ? parseInt(retryAfter) : undefined);
    return;
  }

  // Handle validation errors - Note: setErrors should be handled in component level
  if (error.details) {
    expenseNotifications.validationError('Please correct the highlighted errors');
    return;
  }

  // Handle specific error codes
  if (error.error_code) {
    switch (error.error_code) {
      case ERROR_CODES.DUPLICATE_IDEMPOTENCY_KEY:
        expenseNotifications.duplicateTransaction();
        break;
      case ERROR_CODES.INACTIVE_EXPENSE_TYPE:
        expenseNotifications.genericError('Selected expense type is not active');
        break;
      case ERROR_CODES.TRANSACTION_IMMUTABLE:
        expenseNotifications.genericError('Transaction cannot be modified in its current status');
        break;
      case ERROR_CODES.INVALID_STATUS_FOR_APPROVAL:
        expenseNotifications.genericError('Transaction status prevents approval');
        break;
      case ERROR_CODES.INSUFFICIENT_PERMISSIONS:
        expenseNotifications.permissionError();
        break;
      case ERROR_CODES.DEPARTMENT_ACCESS_DENIED:
        expenseNotifications.genericError('Access denied to specified department');
        break;
      default:
        expenseNotifications.genericError(error.message || 'An unexpected error occurred');
    }
    return;
  }

  // Handle network errors
  if (!error.response) {
    expenseNotifications.networkError();
    return;
  }

  // Handle server errors
  if (error.status >= 500) {
    expenseNotifications.genericError('Server error occurred. Please try again later.');
    return;
  }

  // Generic error fallback
  expenseNotifications.genericError(error.message || 'An unexpected error occurred');
}

// ============================================================================
// SPECIFIC ERROR HANDLERS
// ============================================================================

export function handleExpenseTransactionError(error: any, operation: string): void {
  console.error(`Expense Transaction ${operation} Error:`, error);

  if (error.error_code === ERROR_CODES.DUPLICATE_IDEMPOTENCY_KEY) {
    expenseNotifications.duplicateTransaction();
  } else if (error.error_code === ERROR_CODES.INVALID_STATUS_FOR_APPROVAL) {
    expenseNotifications.genericError('Transaction cannot be approved in its current status');
  } else {
    handleExpenseApiError(error);
  }
}

export function handleExpenseAttachmentError(error: any, operation: string): void {
  console.error(`Expense Attachment ${operation} Error:`, error);

  if (operation === 'upload' && error.message?.includes('size')) {
    expenseNotifications.fileTooLarge();
  } else if (operation === 'upload' && error.message?.includes('type')) {
    expenseNotifications.invalidFileType();
  } else {
    handleExpenseApiError(error);
  }
}

export function handleExpenseReportError(error: any, operation: string): void {
  console.error(`Expense Report ${operation} Error:`, error);

  if (operation === 'export' && error.status === 429) {
    expenseNotifications.rateLimitError();
  } else {
    handleExpenseApiError(error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function isRetryableError(error: any): boolean {
  // Network errors are retryable
  if (!error.response) return true;

  // Server errors might be retryable
  if (error.status >= 500) return true;

  // Rate limit errors are retryable after delay
  if (error.status === 429) return true;

  return false;
}

export function getErrorMessage(error: any): string {
  if (error.message) return error.message;
  if (error.error_code && ERROR_CODES[error.error_code as ErrorCode]) {
    return ERROR_CODES[error.error_code as ErrorCode];
  }
  return 'An unexpected error occurred';
}

export function logExpenseError(error: any, context: string): void {
  console.error(`[Expense Error - ${context}]`, {
    error,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
}