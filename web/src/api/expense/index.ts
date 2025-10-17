import CAxios from '../index';
import type {
  // Core Entities
  ExpenseTransactionRead,
  ExpenseTransactionItem,
  ExpenseCategoryRead,
  ExpenseTypeRead,
  ExpenseSettings,
  ExpenseAuditLog,
  ExpenseAttachment,

  // Request Types
  ExpenseTransactionCreateRequest,
  ExpenseTransactionUpdateRequest,
  ExpenseTransactionApprovalRequest,
  ExpenseTransactionItemCreateRequest,
  ExpenseTransactionItemUpdateRequest,
  ExpenseCategoryCreateRequest,
  ExpenseCategoryUpdateRequest,
  ExpenseTypeCreateRequest,
  ExpenseTypeUpdateRequest,
  ExpenseSettingsCreateRequest,
  ExpenseSettingsUpdateRequest,

  // Response Types
  ExpenseTransactionListResponse,
  ExpenseCategoryListResponse,
  ExpenseTypeListResponse,
  ExpenseSettingsListResponse,
  ExpenseAuditLogListResponse,
  ExpenseAttachmentListResponse,

  // Filter Types
  ExpenseTransactionFilters,
  ExpenseAuditLogFilters,

  // Dropdown Types
  ExpenseCategoryDropdown,
  ExpenseTypeDropdown,

  // Report Types
  ExpenseReport,
  ExpenseSummaryReport,
} from '@/types/expense';


export const expenseApi = {

  transactions: {
    // Create transaction with items and attachments
    createTransaction: async (data: ExpenseTransactionCreateRequest): Promise<ExpenseTransactionRead> => {
      console.log('[DEBUG] expenseApi.transactions.createTransaction called with data:', data);

      const formData = new FormData();

      // Add transaction data
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'transaction_items') {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'attachments') {
          // Files are handled separately
        } else if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      // Add attachments
      if (data.attachments) {
        data.attachments.forEach((file, index) => {
          formData.append(`attachments`, file);
        });
      }

      const response = await CAxios.post('/expense/transactions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[DEBUG] expenseApi.transactions.createTransaction success:', response.data);
      return response.data;
    },

    // Get all transactions with filtering
    getAllTransactions: async (filters?: ExpenseTransactionFilters): Promise<ExpenseTransactionListResponse> => {
      console.log('[DEBUG] expenseApi.transactions.getAllTransactions called with filters:', filters);

      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const response = await CAxios.get(`/expense/transactions?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.transactions.getAllTransactions returning:', response.data);
      return response.data;
    },

    // Get transaction by ID
    getTransactionById: async (id: string): Promise<ExpenseTransactionRead> => {
      console.log('[DEBUG] expenseApi.transactions.getTransactionById called with id:', id);

      const response = await CAxios.get(`/expense/transactions/${id}`);
      console.log('[DEBUG] expenseApi.transactions.getTransactionById returning:', response.data);
      return response.data;
    },

    // Update transaction
    updateTransaction: async (id: string, data: ExpenseTransactionUpdateRequest): Promise<ExpenseTransactionRead> => {
      console.log('[DEBUG] expenseApi.transactions.updateTransaction called with id:', id, 'data:', data);

      const response = await CAxios.put(`/expense/transactions/${id}`, data);
      console.log('[DEBUG] expenseApi.transactions.updateTransaction updated:', response.data);
      return response.data;
    },

    // Delete transaction
    deleteTransaction: async (id: string): Promise<void> => {
      console.log('[DEBUG] expenseApi.transactions.deleteTransaction called with id:', id);

      await CAxios.delete(`/expense/transactions/${id}`);
      console.log('[DEBUG] expenseApi.transactions.deleteTransaction deleted transaction with id:', id);
    },

    // Approve/reject transaction
    approveTransaction: async (id: string, data: ExpenseTransactionApprovalRequest): Promise<ExpenseTransactionRead> => {
      console.log('[DEBUG] expenseApi.transactions.approveTransaction called with id:', id, 'data:', data);

      const response = await CAxios.post(`/expense/transactions/${id}/approval`, data);
      console.log('[DEBUG] expenseApi.transactions.approveTransaction success:', response.data);
      return response.data;
    },

    // Get pending approvals
    getPendingApprovals: async (filters?: ExpenseTransactionFilters): Promise<ExpenseTransactionListResponse> => {
      console.log('[DEBUG] expenseApi.transactions.getPendingApprovals called with filters:', filters);

      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const response = await CAxios.get(`/expense/transactions/pending/approval?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.transactions.getPendingApprovals returning:', response.data);
      return response.data;
    },
  },

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  categories: {
    // Get all categories
    getAllCategories: async (params?: { skip?: number; limit?: number; active_only?: boolean }): Promise<ExpenseCategoryListResponse> => {
      console.log('[DEBUG] expenseApi.categories.getAllCategories called with params:', params);

      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
      if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

      const response = await CAxios.get(`/expense/categories?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.categories.getAllCategories returning:', response.data);
      return response.data;
    },

    // Get categories dropdown
    getCategoriesDropdown: async (): Promise<ExpenseCategoryDropdown[]> => {
      console.log('[DEBUG] expenseApi.categories.getCategoriesDropdown called');

      const response = await CAxios.get('/expense/categories/dropdown');
      console.log('[DEBUG] expenseApi.categories.getCategoriesDropdown returning:', response.data);
      return response.data;
    },

    // Get category by ID
    getCategoryById: async (id: string): Promise<ExpenseCategoryRead> => {
      console.log('[DEBUG] expenseApi.categories.getCategoryById called with id:', id);

      const response = await CAxios.get(`/expense/categories/${id}`);
      console.log('[DEBUG] expenseApi.categories.getCategoryById returning:', response.data);
      return response.data;
    },

    // Create category
    createCategory: async (data: ExpenseCategoryCreateRequest): Promise<ExpenseCategoryRead> => {
      console.log('[DEBUG] expenseApi.categories.createCategory called with data:', data);

      const response = await CAxios.post('/expense/categories', data);
      console.log('[DEBUG] expenseApi.categories.createCategory success:', response.data);
      return response.data;
    },

    // Update category
    updateCategory: async (id: string, data: ExpenseCategoryUpdateRequest): Promise<ExpenseCategoryRead> => {
      console.log('[DEBUG] expenseApi.categories.updateCategory called with id:', id, 'data:', data);

      const response = await CAxios.put(`/expense/categories/${id}`, data);
      console.log('[DEBUG] expenseApi.categories.updateCategory updated:', response.data);
      return response.data;
    },

    // Delete category
    deleteCategory: async (id: string): Promise<void> => {
      console.log('[DEBUG] expenseApi.categories.deleteCategory called with id:', id);

      await CAxios.delete(`/expense/categories/${id}`);
      console.log('[DEBUG] expenseApi.categories.deleteCategory deleted category with id:', id);
    },
  },

  // ============================================================================
  // EXPENSE TYPE MANAGEMENT
  // ============================================================================

  types: {
    // Get all expense types
    getAllTypes: async (params?: { skip?: number; limit?: number; active_only?: boolean }): Promise<ExpenseTypeListResponse> => {
      console.log('[DEBUG] expenseApi.types.getAllTypes called with params:', params);

      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const response = await CAxios.get(`/expense/types?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.types.getAllTypes returning:', response.data);
      return response.data;
    },

    // Get types dropdown
    getTypesDropdown: async (): Promise<ExpenseTypeDropdown[]> => {
      console.log('[DEBUG] expenseApi.types.getTypesDropdown called');

      const response = await CAxios.get('/expense/types/dropdown');
      console.log('[DEBUG] expenseApi.types.getTypesDropdown returning:', response.data);
      return response.data;
    },

    // Get expense type by ID
    getTypeById: async (id: string): Promise<ExpenseTypeRead> => {
      console.log('[DEBUG] expenseApi.types.getTypeById called with id:', id);

      const response = await CAxios.get(`/expense/types/${id}`);
      console.log('[DEBUG] expenseApi.types.getTypeById returning:', response.data);
      return response.data;
    },

    // Create expense type
    createType: async (data: ExpenseTypeCreateRequest): Promise<ExpenseTypeRead> => {
      console.log('[DEBUG] expenseApi.types.createType called with data:', data);

      const response = await CAxios.post('/expense/types', data);
      console.log('[DEBUG] expenseApi.types.createType success:', response.data);
      return response.data;
    },

    // Update expense type
    updateType: async (id: string, data: ExpenseTypeUpdateRequest): Promise<ExpenseTypeRead> => {
      console.log('[DEBUG] expenseApi.types.updateType called with id:', id, 'data:', data);

      const response = await CAxios.put(`/expense/types/${id}`, data);
      console.log('[DEBUG] expenseApi.types.updateType updated:', response.data);
      return response.data;
    },

    // Delete expense type
    deleteType: async (id: string): Promise<void> => {
      console.log('[DEBUG] expenseApi.types.deleteType called with id:', id);

      await CAxios.delete(`/expense/types/${id}`);
      console.log('[DEBUG] expenseApi.types.deleteType deleted type with id:', id);
    },
  },

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  settings: {
    // Get all settings
    getAllSettings: async (params?: { skip?: number; limit?: number }): Promise<ExpenseSettingsListResponse> => {
      console.log('[DEBUG] expenseApi.settings.getAllSettings called with params:', params);

      const queryParams = new URLSearchParams();
      if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const response = await CAxios.get(`/expense/settings?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.settings.getAllSettings returning:', response.data);
      return response.data;
    },

    // Get setting by ID
    getSettingById: async (id: string): Promise<ExpenseSettings> => {
      console.log('[DEBUG] expenseApi.settings.getSettingById called with id:', id);

      const response = await CAxios.get(`/expense/settings/${id}`);
      console.log('[DEBUG] expenseApi.settings.getSettingById returning:', response.data);
      return response.data;
    },

    // Create setting
    createSetting: async (data: ExpenseSettingsCreateRequest): Promise<ExpenseSettings> => {
      console.log('[DEBUG] expenseApi.settings.createSetting called with data:', data);

      const response = await CAxios.post('/expense/settings', data);
      console.log('[DEBUG] expenseApi.settings.createSetting success:', response.data);
      return response.data;
    },

    // Update setting
    updateSetting: async (id: string, data: ExpenseSettingsUpdateRequest): Promise<ExpenseSettings> => {
      console.log('[DEBUG] expenseApi.settings.updateSetting called with id:', id, 'data:', data);

      const response = await CAxios.put(`/expense/settings/${id}`, data);
      console.log('[DEBUG] expenseApi.settings.updateSetting updated:', response.data);
      return response.data;
    },

    // Delete setting
    deleteSetting: async (id: string): Promise<void> => {
      console.log('[DEBUG] expenseApi.settings.deleteSetting called with id:', id);

      await CAxios.delete(`/expense/settings/${id}`);
      console.log('[DEBUG] expenseApi.settings.deleteSetting deleted setting with id:', id);
    },
  },

  // ============================================================================
  // AUDIT LOG MANAGEMENT
  // ============================================================================

  audit: {
    // Get audit logs with filtering
    getAuditLogs: async (filters?: ExpenseAuditLogFilters): Promise<ExpenseAuditLogListResponse> => {
      console.log('[DEBUG] expenseApi.audit.getAuditLogs called with filters:', filters);

      const queryParams = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const response = await CAxios.get(`/expense/audit?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.audit.getAuditLogs returning:', response.data);
      return response.data;
    },
  },

  // ============================================================================
  // ATTACHMENT MANAGEMENT
  // ============================================================================

  attachments: {
    // Get transaction attachments
    getTransactionAttachments: async (transactionId: string): Promise<ExpenseAttachmentListResponse> => {
      console.log('[DEBUG] expenseApi.attachments.getTransactionAttachments called with transactionId:', transactionId);

      const response = await CAxios.get(`/expense/attachments?transaction_id=${transactionId}`);
      console.log('[DEBUG] expenseApi.attachments.getTransactionAttachments returning:', response.data);
      return response.data;
    },

    // Upload attachment
    uploadAttachment: async (transactionId: string, file: File): Promise<ExpenseAttachment> => {
      console.log('[DEBUG] expenseApi.attachments.uploadAttachment called with transactionId:', transactionId, 'file:', file.name);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('transaction_id', transactionId);

      const response = await CAxios.post('/expense/attachments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('[DEBUG] expenseApi.attachments.uploadAttachment success:', response.data);
      return response.data;
    },

    // Download attachment
    downloadAttachment: async (transactionId: string, attachmentId: string): Promise<Blob> => {
      console.log('[DEBUG] expenseApi.attachments.downloadAttachment called with transactionId:', transactionId, 'attachmentId:', attachmentId);

      const response = await CAxios.get(`/expense/attachments/${attachmentId}/download?transaction_id=${transactionId}`, {
        responseType: 'blob',
      });

      console.log('[DEBUG] expenseApi.attachments.downloadAttachment success');
      return response.data;
    },

    // Delete attachment
    deleteAttachment: async (transactionId: string, attachmentId: string): Promise<void> => {
      console.log('[DEBUG] expenseApi.attachments.deleteAttachment called with transactionId:', transactionId, 'attachmentId:', attachmentId);

      await CAxios.delete(`/expense/attachments/${attachmentId}?transaction_id=${transactionId}`);
      console.log('[DEBUG] expenseApi.attachments.deleteAttachment deleted attachment with id:', attachmentId);
    },
  },

  // ============================================================================
  // REPORTING
  // ============================================================================

  reporting: {
    // Generate report
    generateReport: async (type: string, filters?: ExpenseTransactionFilters): Promise<ExpenseReport> => {
      console.log('[DEBUG] expenseApi.reporting.generateReport called with type:', type, 'filters:', filters);

      const response = await CAxios.post('/expense/reports', {
        report_type: type,
        filters: filters || {},
      });

      console.log('[DEBUG] expenseApi.reporting.generateReport success:', response.data);
      return response.data;
    },

    // Get summary report
    getSummaryReport: async (filters?: ExpenseTransactionFilters): Promise<ExpenseSummaryReport> => {
      console.log('[DEBUG] expenseApi.reporting.getSummaryReport called with filters:', filters);

      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => queryParams.append(key, String(v)));
            } else {
              queryParams.append(key, String(value));
            }
          }
        });
      }

      const response = await CAxios.get(`/expense/reports/summary?${queryParams.toString()}`);
      console.log('[DEBUG] expenseApi.reporting.getSummaryReport returning:', response.data);
      return response.data;
    },
  },
};

// ============================================================================
// NAMED EXPORTS
// ============================================================================

export const {
  transactions,
  categories,
  types,
  settings,
  audit,
  attachments,
  reporting,
} = expenseApi;