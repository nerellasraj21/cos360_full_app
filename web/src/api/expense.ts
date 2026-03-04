import CAxios from './index';
import { EXPENSE_ENDPOINTS } from '@/constants/api/expense';
import type {
  ExpenseCategory,
  ExpenseCategoryCreate,
  ExpenseCategoryUpdate,
  ExpenseCategoryListResponse,
  ExpenseCategoryDropdown,
  ExpenseType,
  ExpenseTypeCreate,
  ExpenseTypeUpdate,
  ExpenseTypeListResponse,
  ExpenseTypeDropdown,
  ExpenseTransaction,
  ExpenseTransactionCreate,
  ExpenseTransactionUpdate,
  ExpenseTransactionApproval,
  ExpenseTransactionListResponse,
  ExpenseAttachment,
  ExpenseAttachmentCreate,
  ExpenseAttachmentUpdate,
  ExpenseAttachmentDownload,
  ExpenseAuditLog,
  ExpenseAuditLogSummary,
  ExpenseSettings,
  ExpenseSettingsCreate,
  ExpenseSettingsUpdate,
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

class ExpenseService {
  request = async <T>(endpoint: string, options: any = {}): Promise<T> => {
    // Convert RequestInit style options to axios config
    const axiosConfig: any = {
      url: endpoint,
      ...(options || {}),
    };

    // Handle method and body conversion
    if (options.method) {
      axiosConfig.method = options.method;
    }
    if (options.body) {
      axiosConfig.data = options.body;
    }

    const response = await CAxios(axiosConfig);
    return response.data;
  };

  // Categories
  getCategories = async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<ExpenseCategory[]> => {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.active_only !== undefined) query.set('active_only', params.active_only.toString());

    return this.request(`${EXPENSE_ENDPOINTS.CATEGORIES}?${query}`);
  };

  getCategoryDropdown = async (): Promise<ExpenseCategoryDropdown[]> => {
    return this.request(`${EXPENSE_ENDPOINTS.CATEGORIES}/dropdown`);
  };

  createCategory = async (data: ExpenseCategoryCreate): Promise<ExpenseCategory> => {
    return this.request(EXPENSE_ENDPOINTS.CATEGORIES, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  updateCategory = async (id: string, data: ExpenseCategoryUpdate): Promise<ExpenseCategory> => {
    return this.request(`${EXPENSE_ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  getCategoryById = async (id: string): Promise<ExpenseCategory> => {
    return this.request(`${EXPENSE_ENDPOINTS.CATEGORIES}/${id}`);
  };

  deleteCategory = async (id: string): Promise<void> => {
    return this.request(`${EXPENSE_ENDPOINTS.CATEGORIES}/${id}`, {
      method: 'DELETE',
    });
  };

  // Types
  getTypes = async (params?: {
    category_id?: string;
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<ExpenseType[]> => {
    const query = new URLSearchParams();
    if (params?.category_id) query.set('category_id', params.category_id);
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.active_only !== undefined) query.set('active_only', params.active_only.toString());

    return this.request(`${EXPENSE_ENDPOINTS.TYPES}?${query}`);
  };

  getTypeDropdown = async (categoryId?: string): Promise<ExpenseTypeDropdown[]> => {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`${EXPENSE_ENDPOINTS.TYPES}/dropdown${query}`);
  };

  createType = async (data: ExpenseTypeCreate): Promise<ExpenseType> => {
    return this.request(EXPENSE_ENDPOINTS.TYPES, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  updateType = async (id: string, data: ExpenseTypeUpdate): Promise<ExpenseType> => {
    return this.request(`${EXPENSE_ENDPOINTS.TYPES}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  getTypeById = async (id: string): Promise<ExpenseType> => {
    return this.request(`${EXPENSE_ENDPOINTS.TYPES}/${id}`);
  };

  deleteType = async (id: string): Promise<void> => {
    return this.request(`${EXPENSE_ENDPOINTS.TYPES}/${id}`, {
      method: 'DELETE',
    });
  };

  deleteTransaction = async (id: string): Promise<void> => {
    return this.request(`${EXPENSE_ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'DELETE',
    });
  };

  // Transactions
  getTransactions = async (params?: {
    skip?: number;
    limit?: number;
    status_filter?: string;
    expense_type_id?: string;
    department_id?: string;
  }): Promise<ExpenseTransaction[]> => {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.status_filter) query.set('status_filter', params.status_filter);
    if (params?.expense_type_id) query.set('expense_type_id', params.expense_type_id);
    if (params?.department_id) query.set('department_id', params.department_id);

    return this.request(`${EXPENSE_ENDPOINTS.TRANSACTIONS}?${query}`);
  };

  getTransaction = async (id: string): Promise<ExpenseTransaction> => {
    return this.request(`${EXPENSE_ENDPOINTS.TRANSACTIONS}/${id}`);
  };

  createTransaction = async (data: ExpenseTransactionCreate): Promise<ExpenseTransaction> => {
    return this.request(EXPENSE_ENDPOINTS.TRANSACTIONS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  updateTransaction = async (id: string, data: ExpenseTransactionUpdate): Promise<ExpenseTransaction> => {
    return this.request(`${EXPENSE_ENDPOINTS.TRANSACTIONS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  approveTransaction = async (id: string, data: ExpenseTransactionApproval): Promise<ExpenseTransaction> => {
    return this.request(`${EXPENSE_ENDPOINTS.TRANSACTIONS}/${id}/approval`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  getPendingApprovals = async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<ExpenseTransactionListResponse> => {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return this.request(`${EXPENSE_ENDPOINTS.TRANSACTIONS}/pending/approval?${query}`);
  };

  // Attachments
  uploadAttachment = async (transactionId: string, file: File, documentType: string, departmentId?: string): Promise<ExpenseAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (departmentId) formData.append('department_id', departmentId);

    const response = await CAxios.post(`${EXPENSE_ENDPOINTS.ATTACHMENTS}/transactions/${transactionId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  };

  getTransactionAttachments = async (transactionId: string): Promise<ExpenseAttachment[]> => {
    return this.request(`${EXPENSE_ENDPOINTS.ATTACHMENTS}/transactions/${transactionId}/list`);
  };

  downloadAttachment = async (attachmentId: string): Promise<Blob> => {
    const response = await CAxios({
      url: `${EXPENSE_ENDPOINTS.ATTACHMENTS}/${attachmentId}/download`,
      method: 'GET',
      responseType: 'blob',
    });

    return response.data;
  };

  updateAttachment = async (attachmentId: string, data: ExpenseAttachmentUpdate): Promise<ExpenseAttachment> => {
    return this.request(`${EXPENSE_ENDPOINTS.ATTACHMENTS}/${attachmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  deleteAttachment = async (attachmentId: string): Promise<void> => {
    return this.request(`${EXPENSE_ENDPOINTS.ATTACHMENTS}/${attachmentId}`, {
      method: 'DELETE',
    });
  };

  // Audit Logs
  getTransactionAuditLogs = async (transactionId: string, params?: {
    skip?: number;
    limit?: number;
  }): Promise<ExpenseAuditLog[]> => {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return this.request(`${EXPENSE_ENDPOINTS.AUDIT}/transactions/${transactionId}/logs?${query}`);
  };

  getAuditLogs = async (params?: {
    transaction_id?: string;
    action?: string;
    actor_user_id?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: ExpenseAuditLog[]; total: number; skip: number; limit: number }> => {
    const query = new URLSearchParams();
    if (params?.transaction_id) query.set('transaction_id', params.transaction_id);
    if (params?.action) query.set('action', params.action);
    if (params?.actor_user_id) query.set('actor_user_id', params.actor_user_id);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return this.request(`${EXPENSE_ENDPOINTS.AUDIT}?${query}`);
  };

  getAuditSummary = async (transactionId: string): Promise<ExpenseAuditLogSummary> => {
    return this.request(`${EXPENSE_ENDPOINTS.AUDIT}/transactions/${transactionId}/summary`);
  };

  // Settings
  getSettings = async (params?: {
    category?: string;
    active_only?: boolean;
  }): Promise<ExpenseSettings[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.active_only !== undefined) query.set('active_only', params.active_only.toString());

    return this.request(`${EXPENSE_ENDPOINTS.SETTINGS}?${query}`);
  };

  // Departments
  getDepartments = async (params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
  }): Promise<ExpenseDepartment[]> => {
    const query = new URLSearchParams();
    if (params?.skip) query.set('skip', params.skip.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.active_only !== undefined) query.set('active_only', params.active_only.toString());

    return this.request(`${EXPENSE_ENDPOINTS.DEPARTMENTS}?${query}`);
  };

  getDepartmentDropdown = async (): Promise<ExpenseDepartmentDropdown[]> => {
    return this.request(`${EXPENSE_ENDPOINTS.DEPARTMENTS}/dropdown`);
  };

  getSettingValue = async (key: string): Promise<ExpenseSettingsValue> => {
    return this.request(`${EXPENSE_ENDPOINTS.SETTINGS}/key/${key}/value`);
  };

  getCommonSettings = async (): Promise<ExpenseCommonSettings> => {
    return this.request(`${EXPENSE_ENDPOINTS.SETTINGS}/ui/common`);
  };

  createSetting = async (data: ExpenseSettingsCreate): Promise<ExpenseSettings> => {
    return this.request(EXPENSE_ENDPOINTS.SETTINGS, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };

  updateSetting = async (id: string, data: ExpenseSettingsUpdate): Promise<ExpenseSettings> => {
    return this.request(`${EXPENSE_ENDPOINTS.SETTINGS}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  };

  getSettingById = async (id: string): Promise<ExpenseSettings> => {
    return this.request(`${EXPENSE_ENDPOINTS.SETTINGS}/${id}`);
  };

  deleteSetting = async (id: string): Promise<void> => {
    return this.request(`${EXPENSE_ENDPOINTS.SETTINGS}/${id}`, {
      method: 'DELETE',
    });
  };

  // Reports
  getCategoryReport = async (filters: ExpenseReportFilter): Promise<ExpenseCategoryReport> => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, v));
        } else {
          query.set(key, value.toString());
        }
      }
    });

    return this.request(`${EXPENSE_ENDPOINTS.REPORTS}/by-category?${query}`);
  };

  getTypeReport = async (filters: ExpenseReportFilter): Promise<ExpenseTypeReport> => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, v));
        } else {
          query.set(key, value.toString());
        }
      }
    });

    return this.request(`${EXPENSE_ENDPOINTS.REPORTS}/by-type?${query}`);
  };

  getTrendReport = async (filters: ExpenseReportFilter): Promise<ExpenseTrendReport> => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => query.append(key, v));
        } else {
          query.set(key, value.toString());
        }
      }
    });

    return this.request(`${EXPENSE_ENDPOINTS.REPORTS}/trend?${query}`);
  };

  getExpenseSummary = async (periodDays: number = 30): Promise<any> => {
    return this.request(`${EXPENSE_ENDPOINTS.REPORTS}/summary?period_days=${periodDays}`);
  };

  getSummaryReport = async (params: {
    start_date?: string;
    end_date?: string;
    [key: string]: string | number | string[] | undefined;
  }): Promise<any> => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          (value as string[]).forEach(v => query.append(key, v));
        } else {
          query.set(key, String(value));
        }
      }
    });
    return this.request(`${EXPENSE_ENDPOINTS.REPORTS}/summary?${query}`);
  };

  generateReport = async (type: string, params?: Record<string, string | number | string[] | undefined>): Promise<any> => {
    return this.request(EXPENSE_ENDPOINTS.REPORTS, {
      method: 'POST',
      body: JSON.stringify({ report_type: type, filters: params || {} }),
    });
  };

  exportReport = async (exportRequest: ExpenseReportExport): Promise<ExpenseReportExportResponse> => {
    return this.request(EXPENSE_ENDPOINTS.REPORTS, {
      method: 'POST',
      body: JSON.stringify(exportRequest),
    });
  };

  getExportStatus = async (exportId: string): Promise<ExpenseReportExportResponse> => {
    return this.request(`${EXPENSE_ENDPOINTS.REPORTS}/export/${exportId}/status`);
  };
}

export const expenseApi = new ExpenseService();