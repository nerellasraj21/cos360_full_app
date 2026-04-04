import apiClient from './client';
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
  ExpenseSettingsValue,
  ExpenseCommonSettings,
  ExpenseDepartment,
  ExpenseDepartmentDropdown,
  ExpenseCategoryReport,
  ExpenseTypeReport,
  ExpenseTrendReport,
  ExpenseSummaryReport,
  ExpenseReportExportResponse,
  ExpenseReportFilter,
  ExpenseApprovalRequest,
  PaginatedResponse,
} from '../types/expense';

// Categories API
export const expenseCategoriesApi = {
  getCategories: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<PaginatedResponse<ExpenseCategory>> => {
    const response = await apiClient.get('/expense/categories', { params });
    return response.data;
  },

  getCategoriesDropdown: async (): Promise<ExpenseCategoryDropdown[]> => {
    const response = await apiClient.get('/expense/categories/dropdown');
    return response.data;
  },

  createCategory: async (data: ExpenseCategoryInput): Promise<ExpenseCategory> => {
    const response = await apiClient.post('/expense/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: Partial<ExpenseCategoryInput>): Promise<ExpenseCategory> => {
    const response = await apiClient.put(`/expense/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/expense/categories/${id}`);
  },

  getCategory: async (id: string): Promise<ExpenseCategory> => {
    const response = await apiClient.get(`/expense/categories/${id}`);
    return response.data;
  },
};

// Types API
export const expenseTypesApi = {
  getTypes: async (params?: {
    category_id?: string;
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<PaginatedResponse<ExpenseType>> => {
    const response = await apiClient.get('/expense/types', { params });
    return response.data;
  },

  getTypesDropdown: async (params?: { category_id?: string }): Promise<ExpenseTypeDropdown[]> => {
    const response = await apiClient.get('/expense/types/dropdown', { params });
    return response.data;
  },

  createType: async (data: ExpenseTypeInput): Promise<ExpenseType> => {
    const response = await apiClient.post('/expense/types', data);
    return response.data;
  },

  updateType: async (id: string, data: Partial<ExpenseTypeInput>): Promise<ExpenseType> => {
    const response = await apiClient.put(`/expense/types/${id}`, data);
    return response.data;
  },

  deleteType: async (id: string): Promise<void> => {
    await apiClient.delete(`/expense/types/${id}`);
  },

  getType: async (id: string): Promise<ExpenseType> => {
    const response = await apiClient.get(`/expense/types/${id}`);
    return response.data;
  },
};

// Transactions API
export const expenseTransactionsApi = {
  getTransactions: async (params?: {
    skip?: number;
    limit?: number;
    category_id?: string;
    type_id?: string;
    // Fix #5: backend query param is 'status_filter' (not 'status') — removed stale 'status' field
    status_filter?: string;
    start_date?: string;
    end_date?: string;
    expense_type_id?: string;
    department_id?: string;
  }): Promise<ExpenseTransactionListResponse> => {
    const response = await apiClient.get('/expense/transactions', { params });
    return response.data;
  },

  getTransaction: async (id: string): Promise<ExpenseTransaction> => {
    const response = await apiClient.get(`/expense/transactions/${id}`);
    return response.data;
  },

  createTransaction: async (data: ExpenseTransactionInput): Promise<ExpenseTransaction> => {
    const response = await apiClient.post('/expense/transactions', data);
    return response.data;
  },

  updateTransaction: async (id: string, data: Partial<ExpenseTransactionInput>): Promise<ExpenseTransaction> => {
    const response = await apiClient.put(`/expense/transactions/${id}`, data);
    return response.data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`/expense/transactions/${id}`);
  },

  approveTransaction: async (id: string, data: ExpenseApprovalRequest): Promise<ExpenseTransaction> => {
    const response = await apiClient.post(`/expense/transactions/${id}/approval`, data);
    return response.data;
  },

  getPendingApprovals: async (params?: { skip?: number; limit?: number }): Promise<ExpenseTransactionListResponse> => {
    const response = await apiClient.get('/expense/transactions/pending/approval', { params });
    return response.data;
  },

  /** PUT /expense/transactions/{id}/status */
  updateTransactionStatus: async (id: string, data: { status: string }): Promise<ExpenseTransaction> => {
    const response = await apiClient.put(`/expense/transactions/${id}/status`, data);
    return response.data;
  },
};

// Attachments API
export const expenseAttachmentsApi = {
  uploadAttachment: async (
    transactionId: string,
    file: File,
    documentType: string,
    departmentId?: string
  ): Promise<ExpenseAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (departmentId) {
      formData.append('department_id', departmentId);
    }

    const response = await apiClient.post(`/expense/attachments/transactions/${transactionId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAttachments: async (transactionId: string): Promise<ExpenseAttachment[]> => {
    const response = await apiClient.get(`/expense/attachments/transactions/${transactionId}/list`);
    return response.data;
  },

  downloadAttachment: async (attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/expense/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  updateAttachment: async (
    attachmentId: string,
    data: {
      document_type?: string;
      is_verified?: boolean;
      verification_notes?: string;
      department_id?: string;
    }
  ): Promise<ExpenseAttachment> => {
    const response = await apiClient.put(`/expense/attachments/${attachmentId}`, data);
    return response.data;
  },

  deleteAttachment: async (attachmentId: string): Promise<void> => {
    await apiClient.delete(`/expense/attachments/${attachmentId}`);
  },
};

// Audit API
export const expenseAuditApi = {
  getAuditLogs: async (
    transactionId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<PaginatedResponse<ExpenseAuditLog>> => {
    const response = await apiClient.get(`/expense/audit/transactions/${transactionId}/logs`, { params });
    return response.data;
  },

  getAuditSummary: async (transactionId: string): Promise<ExpenseAuditLogSummary> => {
    const response = await apiClient.get(`/expense/audit/transactions/${transactionId}/summary`);
    return response.data;
  },

  /** GET /expense/audit — all audit logs with filters */
  getGlobalAuditLogs: async (params?: {
    skip?: number;
    limit?: number;
    transaction_id?: string;
    action?: string;
    action_category?: string;
    actor_user_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<PaginatedResponse<ExpenseAuditLog>> => {
    const response = await apiClient.get('/expense/audit', { params });
    return response.data;
  },
};

// Settings API
export const expenseSettingsApi = {
  getSettings: async (params?: {
    category?: string;
    active_only?: boolean;
  }): Promise<ExpenseSettings[]> => {
    const response = await apiClient.get('/expense/settings', { params });
    return response.data;
  },

  getSettingValue: async (key: string): Promise<ExpenseSettingsValue> => {
    const response = await apiClient.get(`/expense/settings/key/${key}/value`);
    return response.data;
  },

  getCommonSettings: async (): Promise<ExpenseCommonSettings> => {
    const response = await apiClient.get('/expense/settings/ui/common');
    return response.data;
  },

  createSetting: async (data: ExpenseSettings): Promise<ExpenseSettings> => {
    const response = await apiClient.post('/expense/settings', data);
    return response.data;
  },

  updateSetting: async (id: string, data: Partial<ExpenseSettings>): Promise<ExpenseSettings> => {
    const response = await apiClient.put(`/expense/settings/${id}`, data);
    return response.data;
  },

  deleteSetting: async (id: string): Promise<void> => {
    await apiClient.delete(`/expense/settings/${id}`);
  },
};

// Departments API
export const expenseDepartmentsApi = {
  getDepartments: async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<PaginatedResponse<ExpenseDepartment>> => {
    const response = await apiClient.get('/expense/departments', { params });
    return response.data;
  },

  getDepartmentsDropdown: async (): Promise<ExpenseDepartmentDropdown[]> => {
    const response = await apiClient.get('/expense/departments/dropdown');
    return response.data;
  },
};

// Reports API
export const expenseReportsApi = {
  getCategoryReport: async (filters: ExpenseReportFilter): Promise<ExpenseCategoryReport[]> => {
    const response = await apiClient.get('/expense/reports/by-category', { params: filters });
    return response.data;
  },

  getTypeReport: async (filters: ExpenseReportFilter): Promise<ExpenseTypeReport[]> => {
    const response = await apiClient.get('/expense/reports/by-type', { params: filters });
    return response.data;
  },

  getTrendReport: async (filters: ExpenseReportFilter): Promise<ExpenseTrendReport> => {
    const response = await apiClient.get('/expense/reports/trend', { params: filters });
    return response.data;
  },

  /** GET /expense/summary — hierarchical summary */
  getSummaryReport: async (params?: {
    academic_year_id?: string;
    start_date?: string;
    end_date?: string;
    status_filter?: string;
  }): Promise<ExpenseSummaryReport> => {
    const response = await apiClient.get('/expense/summary', { params });
    return response.data;
  },

  exportReport: async (data: {
    report_type: string;
    export_format: 'csv' | 'excel' | 'pdf' | 'json';
    filters: ExpenseReportFilter;
    include_details?: boolean;
  }): Promise<ExpenseReportExportResponse> => {
    const response = await apiClient.post('/expense/reports', data);
    return response.data;
  },

  getExportStatus: async (exportId: string): Promise<ExpenseReportExportResponse> => {
    const response = await apiClient.get(`/expense/reports/export/${exportId}/status`);
    return response.data;
  },
};