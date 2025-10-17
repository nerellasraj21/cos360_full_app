
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '@/api/expense';
import { expenseCache, expenseCacheUtils, usePaginatedExpenseData } from '@/lib/expenseCache';
import { handleExpenseApiError, handleExpenseTransactionError, handleExpenseAttachmentError, handleExpenseReportError } from '@/lib/expenseErrorHandler';
import { expenseNotifications } from '@/lib/expenseNotifications';
import { usePermissionProtectedMutation } from '@/hooks/usePermissionProtectedMutation';
import { usePermissionProtectedQuery } from '@/hooks/usePermissionProtectedQuery';
import { PERMISSIONS } from '@/constants/permissions';
import type {
  ExpenseCategory,
  ExpenseCategoryCreate as ExpenseCategoryCreateRequest,
  ExpenseCategoryUpdate as ExpenseCategoryUpdateRequest,
  ExpenseCategoryListResponse,
  ExpenseCategoryDropdown,
  ExpenseType,
  ExpenseTypeCreate as ExpenseTypeCreateRequest,
  ExpenseTypeUpdate as ExpenseTypeUpdateRequest,
  ExpenseTypeListResponse,
  ExpenseTypeDropdown,
  ExpenseTransaction,
  ExpenseTransactionCreate as ExpenseTransactionCreateRequest,
  ExpenseTransactionUpdate as ExpenseTransactionUpdateRequest,
  ExpenseTransactionApproval as ExpenseTransactionApprovalRequest,
  ExpenseTransactionListResponse,
  ExpenseAttachment,
  ExpenseAttachmentCreate as ExpenseAttachmentCreateRequest,
  ExpenseAttachmentUpdate as ExpenseAttachmentUpdateRequest,
  ExpenseAttachmentDownload,
  ExpenseAuditLog,
  ExpenseAuditLogSummary,
  ExpenseSettings,
  ExpenseSettingsCreate as ExpenseSettingsCreateRequest,
  ExpenseSettingsUpdate as ExpenseSettingsUpdateRequest,
  ExpenseSettingsValue,
  ExpenseCommonSettings,
  ExpenseDepartment,
  ExpenseDepartmentDropdown,
  ExpenseCategoryReport,
  ExpenseTypeReport,
  ExpenseTrendReport,
  ExpenseReportExport,
  ExpenseReportExportResponse,
  ExpenseReportFilter
} from '@/types/expense';

// ============================================================================
// CATEGORY HOOKS
// ============================================================================

export function useExpenseCategories(params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) {
  return usePermissionProtectedQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories', params],
    queryFn: () => expenseApi.getCategories(params),
    resource: 'expense_categories',
    action: 'list',
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useExpenseCategoryDropdown() {
  return useQuery<ExpenseCategoryDropdown[]>({
    queryKey: ['expense-categories-dropdown'],
    queryFn: () => expenseApi.getCategoryDropdown(),
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseCategory, Error, ExpenseCategoryCreateRequest>({
    resource: 'expense_categories',
    action: 'create',
    mutationFn: expenseApi.createCategory,
    onSuccess: () => {
      expenseCache.invalidateCategories();
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
      expenseNotifications.categoryCreated();
    },
    onError: handleExpenseApiError,
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseCategory, Error, { id: string; data: ExpenseCategoryUpdateRequest }>({
    resource: 'expense_categories',
    action: 'update',
    mutationFn: ({ id, data }) => expenseApi.updateCategory(id, data),
    onSuccess: () => {
      expenseCache.invalidateCategories();
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
      expenseNotifications.categoryUpdated();
    },
    onError: handleExpenseApiError,
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'expense_categories',
    action: 'delete',
    mutationFn: expenseApi.deleteCategory,
    onSuccess: () => {
      expenseCache.invalidateCategories();
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories-dropdown'] });
      expenseNotifications.categoryDeleted();
    },
    onError: handleExpenseApiError,
  });
}

// ============================================================================
// TYPE HOOKS
// ============================================================================

export function useExpenseTypes(params?: {
  category_id?: string;
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) {
  return usePermissionProtectedQuery<ExpenseType[]>({
    queryKey: ['expense-types', params],
    queryFn: () => expenseApi.getTypes(params),
    resource: 'expense_types',
    action: 'list',
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useExpenseTypeDropdown(categoryId?: string) {
  return useQuery<ExpenseTypeDropdown[]>({
    queryKey: ['expense-types-dropdown', categoryId],
    queryFn: () => expenseApi.getTypeDropdown(categoryId),
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useCreateExpenseType() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseType, Error, ExpenseTypeCreateRequest>({
    resource: 'expense_types',
    action: 'create',
    mutationFn: expenseApi.createType,
    onSuccess: () => {
      expenseCache.invalidateTypes();
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
      expenseNotifications.typeCreated();
    },
    onError: handleExpenseApiError,
  });
}

export function useUpdateExpenseType() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseType, Error, { id: string; data: ExpenseTypeUpdateRequest }>({
    resource: 'expense_types',
    action: 'update',
    mutationFn: ({ id, data }) => expenseApi.updateType(id, data),
    onSuccess: () => {
      expenseCache.invalidateTypes();
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
      expenseNotifications.typeUpdated();
    },
    onError: handleExpenseApiError,
  });
}

export function useDeleteExpenseType() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'expense_types',
    action: 'delete',
    mutationFn: expenseApi.deleteType,
    onSuccess: () => {
      expenseCache.invalidateTypes();
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      queryClient.invalidateQueries({ queryKey: ['expense-types-dropdown'] });
      expenseNotifications.typeDeleted();
    },
    onError: handleExpenseApiError,
  });
}

// ============================================================================
// TRANSACTION HOOKS
// ============================================================================

export function useExpenseTransactions(params?: {
  skip?: number;
  limit?: number;
  status_filter?: string;
  expense_type_id?: string;
  department_id?: string;
}) {
  return useQuery<ExpenseTransaction[]>({
    queryKey: ['expense-transactions', params],
    queryFn: () => expenseApi.getTransactions(params),
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useExpenseTransaction(id: string) {
  return useQuery<ExpenseTransaction>({
    queryKey: ['expense-transaction', id],
    queryFn: () => expenseApi.getTransaction(id),
    enabled: !!id,
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useCreateExpenseTransaction() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseTransaction, Error, ExpenseTransactionCreateRequest>({
    resource: 'expense_transactions',
    action: 'create',
    mutationFn: expenseApi.createTransaction,
    onSuccess: () => {
      expenseCache.invalidateTransactions();
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      expenseNotifications.transactionCreated();
    },
    onError: (error) => handleExpenseTransactionError(error, 'create'),
  });
}

export function useUpdateExpenseTransaction() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseTransaction, Error, { id: string; data: ExpenseTransactionUpdateRequest }>({
    resource: 'expense_transactions',
    action: 'update',
    mutationFn: ({ id, data }) => expenseApi.updateTransaction(id, data),
    onSuccess: () => {
      expenseCache.invalidateTransactions();
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      expenseNotifications.transactionUpdated();
    },
    onError: (error) => handleExpenseTransactionError(error, 'update'),
  });
}

export function useApproveExpenseTransaction() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseTransaction, Error, { id: string; data: ExpenseTransactionApprovalRequest }>({
    resource: 'expense_transactions',
    action: 'approve',
    mutationFn: ({ id, data }) => expenseApi.approveTransaction(id, data),
    onSuccess: (_, { data }) => {
      expenseCache.invalidateTransactions();
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      if (data.action === 'approve') {
        expenseNotifications.transactionApproved();
      } else {
        expenseNotifications.transactionRejected();
      }
    },
    onError: (error) => handleExpenseTransactionError(error, 'approve'),
  });
}

export function useDeleteExpenseTransaction() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'expense_transactions',
    action: 'delete',
    mutationFn: expenseApi.deleteTransaction,
    onSuccess: () => {
      expenseCache.invalidateTransactions();
      queryClient.invalidateQueries({ queryKey: ['expense-transactions'] });
      expenseNotifications.transactionDeleted();
    },
    onError: (error) => handleExpenseTransactionError(error, 'delete'),
  });
}

export function usePendingExpenseApprovals(params?: {
  skip?: number;
  limit?: number;
}) {
  return usePermissionProtectedQuery<ExpenseTransactionListResponse>({
    queryKey: ['expense-pending-approvals', params],
    queryFn: () => expenseApi.getPendingApprovals(params),
    resource: 'expense_transactions',
    action: 'approve',
    staleTime: expenseCacheUtils.TTL.SHORT, // Shorter cache for approvals
  });
}

// ============================================================================
// ATTACHMENT HOOKS
// ============================================================================

export function useExpenseTransactionAttachments(transactionId: string) {
  return useQuery<ExpenseAttachment[]>({
    queryKey: ['expense-attachments', transactionId],
    queryFn: () => expenseApi.getTransactionAttachments(transactionId),
    enabled: !!transactionId,
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useUploadExpenseAttachment() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseAttachment, Error, { transactionId: string; file: File; documentType: string; departmentId?: string }>({
    resource: 'expense_attachments',
    action: 'create',
    mutationFn: ({ transactionId, file, documentType, departmentId }) =>
      expenseApi.uploadAttachment(transactionId, file, documentType, departmentId),
    onSuccess: (_, { transactionId }) => {
      expenseCache.invalidateAttachments();
      queryClient.invalidateQueries({ queryKey: ['expense-attachments', transactionId] });
      expenseNotifications.attachmentUploaded();
    },
    onError: (error) => handleExpenseAttachmentError(error, 'upload'),
  });
}

export function useDownloadExpenseAttachment() {
  return useMutation<Blob, Error, string>({
    mutationFn: expenseApi.downloadAttachment,
    onSuccess: () => {
      expenseNotifications.attachmentDownloaded();
    },
    onError: (error) => handleExpenseAttachmentError(error, 'download'),
  });
}

export function useDeleteExpenseAttachment() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'expense_attachments',
    action: 'delete',
    mutationFn: expenseApi.deleteAttachment,
    onSuccess: () => {
      expenseCache.invalidateAttachments();
      queryClient.invalidateQueries({ queryKey: ['expense-attachments'] });
      expenseNotifications.attachmentDeleted();
    },
    onError: (error) => handleExpenseAttachmentError(error, 'delete'),
  });
}

// ============================================================================
// AUDIT LOG HOOKS
// ============================================================================

export function useExpenseTransactionAuditLogs(transactionId: string, params?: {
  skip?: number;
  limit?: number;
}) {
  return useQuery<ExpenseAuditLog[]>({
    queryKey: ['expense-audit-logs', transactionId, params],
    queryFn: () => expenseApi.getTransactionAuditLogs(transactionId, params),
    enabled: !!transactionId,
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useExpenseAuditSummary(transactionId: string) {
  return useQuery<ExpenseAuditLogSummary>({
    queryKey: ['expense-audit-summary', transactionId],
    queryFn: () => expenseApi.getAuditSummary(transactionId),
    enabled: !!transactionId,
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

// ============================================================================
// SETTINGS HOOKS
// ============================================================================

export function useExpenseSettings(params?: {
  category?: string;
  active_only?: boolean;
}) {
  return useQuery<ExpenseSettings[]>({
    queryKey: ['expense-settings', params],
    queryFn: () => expenseApi.getSettings(params),
    staleTime: expenseCacheUtils.TTL.EXTRA_LONG,
  });
}

export function useExpenseSettingValue(key: string) {
  return useQuery<ExpenseSettingsValue>({
    queryKey: ['expense-setting-value', key],
    queryFn: () => expenseApi.getSettingValue(key),
    enabled: !!key,
    staleTime: expenseCacheUtils.TTL.EXTRA_LONG,
  });
}

export function useExpenseCommonSettings() {
  return useQuery<ExpenseCommonSettings>({
    queryKey: ['expense-common-settings'],
    queryFn: () => expenseApi.getCommonSettings(),
    staleTime: expenseCacheUtils.TTL.EXTRA_LONG,
  });
}

// ============================================================================
// DEPARTMENT HOOKS
// ============================================================================

export function useExpenseDepartments(params?: {
  skip?: number;
  limit?: number;
  active_only?: boolean;
}) {
  return useQuery<ExpenseDepartment[]>({
    queryKey: ['expense-departments', params],
    queryFn: () => expenseApi.getDepartments(params),
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useExpenseDepartmentDropdown() {
  return useQuery<ExpenseDepartmentDropdown[]>({
    queryKey: ['expense-departments-dropdown'],
    queryFn: () => expenseApi.getDepartmentDropdown(),
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useCreateExpenseSetting() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseSettings, Error, ExpenseSettingsCreateRequest>({
    resource: 'expense_settings',
    action: 'create',
    mutationFn: expenseApi.createSetting,
    onSuccess: () => {
      expenseCache.invalidateSettings();
      queryClient.invalidateQueries({ queryKey: ['expense-settings'] });
      expenseNotifications.settingsUpdated();
    },
    onError: handleExpenseApiError,
  });
}

export function useUpdateExpenseSetting() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<ExpenseSettings, Error, { id: string; data: ExpenseSettingsUpdateRequest }>({
    resource: 'expense_settings',
    action: 'update',
    mutationFn: ({ id, data }) => expenseApi.updateSetting(id, data),
    onSuccess: () => {
      expenseCache.invalidateSettings();
      queryClient.invalidateQueries({ queryKey: ['expense-settings'] });
      expenseNotifications.settingsUpdated();
    },
    onError: handleExpenseApiError,
  });
}

export function useDeleteExpenseSetting() {
  const queryClient = useQueryClient();

  return usePermissionProtectedMutation<void, Error, string>({
    resource: 'expense_settings',
    action: 'delete',
    mutationFn: expenseApi.deleteSetting,
    onSuccess: () => {
      expenseCache.invalidateSettings();
      queryClient.invalidateQueries({ queryKey: ['expense-settings'] });
    },
    onError: handleExpenseApiError,
  });
}

// ============================================================================
// REPORT HOOKS
// ============================================================================

export function useExpenseCategoryReport(filters: ExpenseReportFilter) {
  return useQuery<ExpenseCategoryReport>({
    queryKey: ['expense-category-report', filters],
    queryFn: () => expenseApi.getCategoryReport(filters),
    enabled: Object.keys(filters).length > 0,
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useExpenseTypeReport(filters: ExpenseReportFilter) {
  return useQuery<ExpenseTypeReport>({
    queryKey: ['expense-type-report', filters],
    queryFn: () => expenseApi.getTypeReport(filters),
    enabled: Object.keys(filters).length > 0,
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useExpenseTrendReport(filters: ExpenseReportFilter) {
  return useQuery<ExpenseTrendReport>({
    queryKey: ['expense-trend-report', filters],
    queryFn: () => expenseApi.getTrendReport(filters),
    enabled: Object.keys(filters).length > 0,
    staleTime: expenseCacheUtils.TTL.LONG,
  });
}

export function useExpenseSummary(periodDays: number = 30) {
  return useQuery<any>({
    queryKey: ['expense-summary', periodDays],
    queryFn: () => expenseApi.getExpenseSummary(periodDays),
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useExpenseSummaryReport(filters?: ExpenseReportFilter) {
  return usePermissionProtectedQuery<any>({
    queryKey: ['expense-summary-report', filters],
    queryFn: () => expenseApi.getExpenseSummary(),
    resource: 'expense_transactions',
    action: 'list',
    enabled: !filters || Object.keys(filters).length > 0,
    staleTime: expenseCacheUtils.TTL.MEDIUM,
  });
}

export function useExportExpenseReport() {
  return useMutation<ExpenseReportExportResponse, Error, ExpenseReportExport>({
    mutationFn: expenseApi.exportReport,
    onSuccess: () => {
      expenseNotifications.exportStarted();
    },
    onError: (error) => handleExpenseReportError(error, 'export'),
  });
}

export function useExpenseExportStatus(exportId: string) {
  return useQuery<ExpenseReportExportResponse>({
    queryKey: ['expense-export-status', exportId],
    queryFn: () => expenseApi.getExportStatus(exportId),
    enabled: !!exportId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') {
        return false; // Stop polling
      }
      return 2000; // Poll every 2 seconds
    },
  });
}

// ============================================================================
// PAGINATED DATA HOOKS
// ============================================================================

export const usePaginatedExpenseCategories = (defaultLimit: number = 50) =>
  usePaginatedExpenseData(
    async (skip, limit) => {
      const items = await expenseApi.getCategories({ skip, limit });
      return { items, total: items.length };
    },
    'categories',
    defaultLimit
  );

export const usePaginatedExpenseTypes = (defaultLimit: number = 50) =>
  usePaginatedExpenseData(
    async (skip, limit) => {
      const items = await expenseApi.getTypes({ skip, limit });
      return { items, total: items.length };
    },
    'types',
    defaultLimit
  );

export const usePaginatedExpenseTransactions = (defaultLimit: number = 50) =>
  usePaginatedExpenseData(
    async (skip, limit) => {
      const items = await expenseApi.getTransactions({ skip, limit });
      return { items, total: items.length };
    },
    'transactions',
    defaultLimit
  );