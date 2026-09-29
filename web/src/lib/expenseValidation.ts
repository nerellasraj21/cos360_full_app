
import type { ExpenseTransactionCreate, ExpenseCategoryCreate, ExpenseTypeCreate, ExpenseDepartmentCreate } from '@/types/expense';

export const TRANSACTION_VALIDATION_RULES = {
  expense_type_id: {
    required: true,
    message: 'Expense type is required'
  },
  amount: {
    required: true,
    min: 0,
    max: 999999.99,
    decimalPlaces: 2,
    message: 'Amount must be a positive number with max 2 decimal places'
  },
  transaction_date: {
    required: true,
    type: 'date',
    max: new Date().toISOString().split('T')[0], // Not future date
    message: 'Transaction date cannot be in the future'
  },
  description: {
    required: true,
    minLength: 1,
    maxLength: 500,
    message: 'Description is required (1-500 characters)'
  },
  reference_number: {
    maxLength: 100,
    message: 'Reference number cannot exceed 100 characters'
  },
  payment_method: {
    required: true,
    options: ['cash', 'cheque', 'bank_transfer', 'upi'],
    message: 'Please select a valid payment method'
  },
  vendor_name: {
    maxLength: 200,
    message: 'Vendor name cannot exceed 200 characters'
  },
  idempotency_key: {
    required: true,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Idempotency key must contain only alphanumeric characters, underscores, and hyphens'
  }
};

// ============================================================================
// FILE UPLOAD VALIDATION
// ============================================================================

export const FILE_UPLOAD_VALIDATION = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  documentTypes: [
    'invoice',
    'receipt',
    'bill',
    'contract',
    'quotation',
    'payment_proof',
    'other'
  ]
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > FILE_UPLOAD_VALIDATION.maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  if (!FILE_UPLOAD_VALIDATION.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  return { valid: true };
}

export function validateTransactionForm(data: Partial<ExpenseTransactionCreate>): Record<string, string> {
  const errors: Record<string, string> = {};

  // Required field validations
  if (!data.expense_type_id?.trim()) {
    errors.expense_type_id = TRANSACTION_VALIDATION_RULES.expense_type_id.message;
  }

  if (data.amount === undefined || data.amount === null || data.amount < 0) {
    errors.amount = TRANSACTION_VALIDATION_RULES.amount.message;
  } else if (data.amount > TRANSACTION_VALIDATION_RULES.amount.max) {
    errors.amount = 'Amount exceeds maximum allowed value';
  } else {
    // Check decimal places
    const decimalPlaces = (data.amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > TRANSACTION_VALIDATION_RULES.amount.decimalPlaces) {
      errors.amount = TRANSACTION_VALIDATION_RULES.amount.message;
    }
  }

  if (!data.transaction_date) {
    errors.transaction_date = TRANSACTION_VALIDATION_RULES.transaction_date.message;
  } else {
    const transactionDate = new Date(data.transaction_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (transactionDate > today) {
      errors.transaction_date = TRANSACTION_VALIDATION_RULES.transaction_date.message;
    }
  }

  if (!data.description?.trim()) {
    errors.description = TRANSACTION_VALIDATION_RULES.description.message;
  } else if (data.description.length > TRANSACTION_VALIDATION_RULES.description.maxLength) {
    errors.description = TRANSACTION_VALIDATION_RULES.description.message;
  }

  if (!data.payment_method) {
    errors.payment_method = TRANSACTION_VALIDATION_RULES.payment_method.message;
  } else if (!TRANSACTION_VALIDATION_RULES.payment_method.options.includes(data.payment_method)) {
    errors.payment_method = TRANSACTION_VALIDATION_RULES.payment_method.message;
  }

  if (!data.idempotency_key?.trim()) {
    errors.idempotency_key = TRANSACTION_VALIDATION_RULES.idempotency_key.message;
  } else if (!TRANSACTION_VALIDATION_RULES.idempotency_key.pattern.test(data.idempotency_key)) {
    errors.idempotency_key = TRANSACTION_VALIDATION_RULES.idempotency_key.message;
  }

  // Optional field validations
  if (data.reference_number && data.reference_number.length > TRANSACTION_VALIDATION_RULES.reference_number.maxLength) {
    errors.reference_number = TRANSACTION_VALIDATION_RULES.reference_number.message;
  }

  if (data.vendor_name && data.vendor_name.length > TRANSACTION_VALIDATION_RULES.vendor_name.maxLength) {
    errors.vendor_name = TRANSACTION_VALIDATION_RULES.vendor_name.message;
  }

  return errors;
}

export function validateCategoryForm(data: Partial<ExpenseCategoryCreate>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Category name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Category name must be at least 2 characters';
  } else if (data.name.length > 100) {
    errors.name = 'Category name cannot exceed 100 characters';
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  return errors;
}

export function validateTypeForm(data: Partial<ExpenseTypeCreate>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Type name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Type name must be at least 2 characters';
  } else if (data.name.length > 100) {
    errors.name = 'Type name cannot exceed 100 characters';
  }

  if (!data.category_id?.trim()) {
    errors.category_id = 'Category is required';
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  return errors;
}

export function validateDepartmentForm(data: Partial<ExpenseDepartmentCreate>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name?.trim()) {
    errors.name = 'Department name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Department name must be at least 2 characters';
  } else if (data.name.length > 100) {
    errors.name = 'Department name cannot exceed 100 characters';
  }

  if (data.description && data.description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  return errors;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generateIdempotencyKey(): string {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}