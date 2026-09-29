import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  expenseCategoriesApi,
  expenseTypesApi,
  expenseTransactionsApi,
  expenseAttachmentsApi,
  expenseAuditApi,
  expenseSettingsApi,
  expenseDepartmentsApi,
  expenseReportsApi,
} from '../src/api/expense';
import type {
  ExpenseCategory,
  ExpenseCategoryInput,
  ExpenseCategoryDropdown,
  ExpenseType,
  ExpenseTypeInput,
  ExpenseTypeDropdown,
  ExpenseTransaction,
  ExpenseTransactionInput,
  ExpenseTransactionListResponse,
  ExpenseAttachment,
  ExpenseAuditLog,
  ExpenseAuditLogSummary,
  ExpenseSettings,
  ExpenseDepartmentDropdown,
  ExpenseCategoryReport,
  ExpenseTypeReport,
  ExpenseTrendReport,
  ExpenseSummaryReport,
  ExpenseReportFilter,
  ExpenseApprovalRequest,
} from '../src/types/expense';

// Categories hooks
export const useExpenseCategories = (params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) => {
  return useQuery({
    queryKey: ['expense-categories', params],
    queryFn: () => expenseCategoriesApi.getCategories(params),
  });
};

export const useExpenseCategoryDropdown = () => {
  return useQuery({
    queryKey: ['expense-categories-dropdown'],
    queryFn: () => expenseCategoriesApi.getCategoriesDropdown(),
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseCategoryInput) => expenseCategoriesApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseCategoryInput> }) =>
      expenseCategoriesApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
    },
  });
};

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseCategoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
    },
  });
};

// Types hooks
export const useExpenseTypes = (params?: {
  category_id?: string;
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) => {
  return useQuery({
    queryKey: ['expense-types', params],
    queryFn: () => expenseTypesApi.getTypes(params),
  });
};

export const useExpenseTypeDropdown = (categoryId?: string) => {
  return useQuery({
    queryKey: ['expense-types-dropdown', categoryId],
    queryFn: () => expenseTypesApi.getTypesDropdown({ category_id: categoryId }),
  });
};

export const useCreateExpenseType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseTypeInput) => expenseTypesApi.createType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
    },
  });
};

export const useUpdateExpenseType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseTypeInput> }) =>
      expenseTypesApi.updateType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
    },
  });
};

export const useDeleteExpenseType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseTypesApi.deleteType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
    },
  });
};

// Transactions hooks
export const useExpenseTransactions = (params?: {
  skip?: number;
  limit?: number;
  status_filter?: string;
  expense_type_id?: string;
  department_id?: string;
}) => {
  return useQuery({
    queryKey: ['expense-transactions', params],
    queryFn: () => expenseTransactionsApi.getTransactions(params),
  });
};

export const useExpenseTransaction = (id: string) => {
  return useQuery({
    queryKey: ['expense-transaction', id],
    queryFn: () => expenseTransactionsApi.getTransaction(id),
    enabled: !!id,
  });
};

export const useCreateExpenseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ExpenseTransactionInput) => expenseTransactionsApi.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
    },
  });
};

export const useUpdateExpenseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExpenseTransactionInput> }) =>
      expenseTransactionsApi.updateTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expense-transaction'] });
    },
  });
};

export const useDeleteExpenseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expenseTransactionsApi.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
    },
  });
};

export const useApproveExpenseTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseApprovalRequest }) =>
      expenseTransactionsApi.approveTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expense-transaction'] });
      queryClient.invalidateQueries({ queryKey: ['expense-pending-approvals'] });
    },
  });
};

export const useExpensePendingApprovals = () => {
  return useQuery({
    queryKey: ['expense-pending-approvals'],
    queryFn: () => expenseTransactionsApi.getPendingApprovals(),
  });
};

// Attachments hooks
export const useExpenseAttachments = (transactionId: string) => {
  return useQuery({
    queryKey: ['expense-attachments', transactionId],
    queryFn: () => expenseAttachmentsApi.getAttachments(transactionId),
    enabled: !!transactionId,
  });
};

export const useUploadExpenseAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transactionId,
      file,
      documentType,
      departmentId,
    }: {
      transactionId: string;
      file: File;
      documentType: string;
      departmentId?: string;
    }) => expenseAttachmentsApi.uploadAttachment(transactionId, file, documentType, departmentId),
    onSuccess: (_, { transactionId }) => {
      queryClient.invalidateQueries({ queryKey: ['expense-attachments', transactionId] });
    },
  });
};

export const useUpdateExpenseAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attachmentId,
      data,
    }: {
      attachmentId: string;
      data: {
        document_type?: string;
        is_verified?: boolean;
        verification_notes?: string;
        department_id?: string;
      };
    }) => expenseAttachmentsApi.updateAttachment(attachmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-attachments'] });
    },
  });
};

export const useDeleteExpenseAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => expenseAttachmentsApi.deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-attachments'] });
    },
  });
};

// Audit hooks
export const useExpenseAuditLogs = (
  transactionId: string,
  params?: { skip?: number; limit?: number }
) => {
  return useQuery({
    queryKey: ['expense-audit-logs', transactionId, params],
    queryFn: () => expenseAuditApi.getAuditLogs(transactionId, params),
    enabled: !!transactionId,
  });
};

export const useExpenseAuditSummary = (transactionId: string) => {
  return useQuery({
    queryKey: ['expense-audit-summary', transactionId],
    queryFn: () => expenseAuditApi.getAuditSummary(transactionId),
    enabled: !!transactionId,
  });
};

// Settings hooks
export const useExpenseSettings = (params?: { category?: string; active_only?: boolean }) => {
  return useQuery({
    queryKey: ['expense-settings', params],
    queryFn: () => expenseSettingsApi.getSettings(params),
  });
};

export const useExpenseCommonSettings = () => {
  return useQuery({
    queryKey: ['expense-common-settings'],
    queryFn: () => expenseSettingsApi.getCommonSettings(),
  });
};

// Departments hooks
export const useExpenseDepartments = (params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) => {
  return useQuery({
    queryKey: ['expense-departments', params],
    queryFn: () => expenseDepartmentsApi.getDepartments(params),
  });
};

export const useExpenseDepartmentDropdown = () => {
  return useQuery({
    queryKey: ['expense-departments-dropdown'],
    queryFn: () => expenseDepartmentsApi.getDepartmentsDropdown(),
  });
};

// Reports hooks
export const useExpenseSummaryReport = (params?: {
  start_date?: string;
  end_date?: string;
  status_filter?: string;
}) => {
  return useQuery({
    queryKey: ['expense-summary-report', params],
    queryFn: () => expenseReportsApi.getSummaryReport(params),
  });
};