import { useQueryClient } from '@tanstack/react-query';
import {
  usePermissionProtectedQuery,
  usePermissionProtectedMutation,
  usePermissionProtectedListQuery,
  usePermissionProtectedReadQuery,
  usePermissionProtectedCreateMutation,
  usePermissionProtectedUpdateMutation,
  usePermissionProtectedDeleteMutation,
} from './use-permission-protected-api';
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
import { PERMISSION_RESOURCES } from '../src/types/permissions';
import type {
  ExpenseCategoryInput,
  ExpenseDepartmentInput,
  ExpenseTypeInput,
  ExpenseTransactionInput,
  ExpenseApprovalRequest,
} from '../src/types/expense';

// Permission-protected Categories hooks
export const useExpenseCategoriesProtected = (params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.EXPENSE_CATEGORIES,
    ['expense-categories', params],
    () => expenseCategoriesApi.getCategories(params)
  );
};

export const useExpenseCategoryDropdownProtected = () => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_CATEGORIES,
    action: 'read',
    queryKey: ['expense-categories-dropdown'],
    queryFn: () => expenseCategoriesApi.getCategoriesDropdown(),
  });
};

export const useCreateExpenseCategoryProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.EXPENSE_CATEGORIES,
    (data: ExpenseCategoryInput) => expenseCategoriesApi.createCategory(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
      },
    }
  );
};

export const useUpdateExpenseCategoryProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.EXPENSE_CATEGORIES,
    ({ id, data }: { id: string; data: Partial<ExpenseCategoryInput> }) =>
      expenseCategoriesApi.updateCategory(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
      },
    }
  );
};

export const useDeleteExpenseCategoryProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.EXPENSE_CATEGORIES,
    (id: string) => expenseCategoriesApi.deleteCategory(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
        queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
      },
    }
  );
};

// Permission-protected Types hooks
export const useExpenseTypesProtected = (params?: {
  category_id?: string;
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.EXPENSE_TYPES,
    ['expense-types', params],
    () => expenseTypesApi.getTypes(params)
  );
};

export const useExpenseTypeDropdownProtected = (categoryId?: string) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_TYPES,
    action: 'read',
    queryKey: ['expense-types-dropdown', categoryId],
    queryFn: () => expenseTypesApi.getTypesDropdown({ category_id: categoryId }),
  });
};

export const useCreateExpenseTypeProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.EXPENSE_TYPES,
    (data: ExpenseTypeInput) => expenseTypesApi.createType(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-types'] });
        queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
      },
    }
  );
};

export const useUpdateExpenseTypeProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.EXPENSE_TYPES,
    ({ id, data }: { id: string; data: Partial<ExpenseTypeInput> }) =>
      expenseTypesApi.updateType(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-types'] });
        queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
      },
    }
  );
};

export const useDeleteExpenseTypeProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.EXPENSE_TYPES,
    (id: string) => expenseTypesApi.deleteType(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-types'] });
        queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
      },
    }
  );
};

// Permission-protected Transactions hooks
export const useExpenseTransactionsProtected = (params?: {
  skip?: number;
  limit?: number;
  status_filter?: string;
  expense_type_id?: string;
  department_id?: string;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    ['expense-transactions', params],
    () => expenseTransactionsApi.getTransactions(params)
  );
};

export const useExpenseTransactionProtected = (id: string) => {
  return usePermissionProtectedReadQuery(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    ['expense-transaction', id],
    () => expenseTransactionsApi.getTransaction(id),
    { enabled: !!id }
  );
};

export const useCreateExpenseTransactionProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    (data: ExpenseTransactionInput) => expenseTransactionsApi.createTransaction(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      },
    }
  );
};

export const useUpdateExpenseTransactionProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    ({ id, data }: { id: string; data: Partial<ExpenseTransactionInput> }) =>
      expenseTransactionsApi.updateTransaction(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['expense-transaction'] });
      },
    }
  );
};

export const useDeleteExpenseTransactionProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    (id: string) => expenseTransactionsApi.deleteTransaction(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      },
    }
  );
};

export const useApproveExpenseTransactionProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedMutation({
    resource: PERMISSION_RESOURCES.EXPENSE_APPROVALS,
    action: 'approve',
    mutationFn: ({ id, data }: { id: string; data: ExpenseApprovalRequest }) =>
      expenseTransactionsApi.approveTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['expense-transaction'] });
      queryClient.invalidateQueries({ queryKey: ['expense-pending-approvals'] });
    },
  });
};

export const useExpensePendingApprovalsProtected = () => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.EXPENSE_APPROVALS,
    ['expense-pending-approvals'],
    () => expenseTransactionsApi.getPendingApprovals()
  );
};

// Permission-protected Attachments hooks
export const useExpenseAttachmentsProtected = (transactionId: string) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    action: 'read',
    queryKey: ['expense-attachments', transactionId],
    queryFn: () => expenseAttachmentsApi.getAttachments(transactionId),
    enabled: !!transactionId,
  });
};

export const useUploadExpenseAttachmentProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedMutation({
    resource: PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    action: 'update',
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

export const useUpdateExpenseAttachmentProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    ({
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
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-attachments'] });
      },
    }
  );
};

export const useDeleteExpenseAttachmentProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    (attachmentId: string) => expenseAttachmentsApi.deleteAttachment(attachmentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-attachments'] });
      },
    }
  );
};

// Permission-protected Audit hooks
export const useExpenseAuditLogsProtected = (
  transactionId: string,
  params?: { skip?: number; limit?: number }
) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_AUDIT,
    action: 'read',
    queryKey: ['expense-audit-logs', transactionId, params],
    queryFn: () => expenseAuditApi.getAuditLogs(transactionId, params),
    enabled: !!transactionId,
  });
};

export const useExpenseAuditSummaryProtected = (transactionId: string) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_AUDIT,
    action: 'read',
    queryKey: ['expense-audit-summary', transactionId],
    queryFn: () => expenseAuditApi.getAuditSummary(transactionId),
    enabled: !!transactionId,
  });
};

// Permission-protected Settings hooks
export const useExpenseSettingsProtected = (params?: { category?: string; active_only?: boolean }) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.SETTINGS,
    action: 'read',
    queryKey: ['expense-settings', params],
    queryFn: () => expenseSettingsApi.getSettings(params),
  });
};

export const useExpenseCommonSettingsProtected = () => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.SETTINGS,
    action: 'read',
    queryKey: ['expense-common-settings'],
    queryFn: () => expenseSettingsApi.getCommonSettings(),
  });
};

// Permission-protected Departments hooks
export const useExpenseDepartmentsProtected = (params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) => {
  return usePermissionProtectedListQuery(
    PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS,
    ['expense-departments', params],
    () => expenseDepartmentsApi.getDepartments(params)
  );
};

export const useExpenseDepartmentDropdownProtected = () => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS,
    action: 'read',
    queryKey: ['expense-departments-dropdown'],
    queryFn: () => expenseDepartmentsApi.getDepartmentsDropdown(),
  });
};

export const useCreateExpenseDepartmentProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedCreateMutation(
    PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS,
    (data: ExpenseDepartmentInput) => expenseDepartmentsApi.createDepartment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-departments'] });
        queryClient.invalidateQueries({ queryKey: ['expense-departments-dropdown'] });
      },
    }
  );
};

export const useUpdateExpenseDepartmentProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedUpdateMutation(
    PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS,
    ({ id, data }: { id: string; data: Partial<ExpenseDepartmentInput> }) =>
      expenseDepartmentsApi.updateDepartment(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-departments'] });
        queryClient.invalidateQueries({ queryKey: ['expense-departments-dropdown'] });
      },
    }
  );
};

export const useDeleteExpenseDepartmentProtected = () => {
  const queryClient = useQueryClient();
  return usePermissionProtectedDeleteMutation(
    PERMISSION_RESOURCES.EXPENSE_DEPARTMENTS,
    (id: string) => expenseDepartmentsApi.deleteDepartment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['expense-departments'] });
        queryClient.invalidateQueries({ queryKey: ['expense-departments-dropdown'] });
      },
    }
  );
};

// Permission-protected Reports hooks
export const useExpenseSummaryReportProtected = (params?: {
  start_date?: string;
  end_date?: string;
  status_filter?: string;
}) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_TRANSACTIONS,
    action: 'read',
    queryKey: ['expense-summary-report', params],
    queryFn: () => expenseReportsApi.getSummaryReport(params),
  });
};

// Permission-protected Global Audit Logs hook
export const useExpenseGlobalAuditLogsProtected = (params?: {
  skip?: number;
  limit?: number;
  transaction_id?: string;
  action?: string;
  action_category?: string;
}) => {
  return usePermissionProtectedQuery({
    resource: PERMISSION_RESOURCES.EXPENSE_AUDIT,
    action: 'read',
    queryKey: ['expense-global-audit-logs', params],
    queryFn: () => expenseAuditApi.getGlobalAuditLogs(params),
  });
};