import CAxios from '../index';
import type {
    ExpenseAttachment,
    ExpenseAttachmentUploadRequest,
    ExpenseAttachmentUpdateRequest
} from '@/types/expense';

export const expenseAttachmentsApi = {
    // Upload attachment
    uploadAttachment: async (data: ExpenseAttachmentUploadRequest): Promise<ExpenseAttachment> => {
        console.log('[DEBUG] expenseAttachmentsApi.uploadAttachment called for transaction:', data.transaction_id);

        const formData = new FormData();
        formData.append('file', data.file);

        const params = new URLSearchParams({ document_type: data.document_type ?? 'invoice' });
        if (data.department_id) params.append('department_id', data.department_id);

        const response = await CAxios.post(
            `/expense/attachments/transactions/${data.transaction_id}/upload?${params.toString()}`,
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        console.log('[DEBUG] expenseAttachmentsApi.uploadAttachment success:', response.data);
        return response.data;
    },

    // Get attachment by ID
    getAttachment: async (id: string): Promise<ExpenseAttachment> => {
        console.log('[DEBUG] expenseAttachmentsApi.getAttachment called with id:', id);

        const response = await CAxios.get(`/expense/attachments/${id}`);
        console.log('[DEBUG] expenseAttachmentsApi.getAttachment returning:', response.data);
        return response.data;
    },

    // Update attachment
    updateAttachment: async (id: string, data: ExpenseAttachmentUpdateRequest): Promise<ExpenseAttachment> => {
        console.log('[DEBUG] expenseAttachmentsApi.updateAttachment called with id:', id, 'data:', data);

        const response = await CAxios.put(`/expense/attachments/${id}`, data);
        console.log('[DEBUG] expenseAttachmentsApi.updateAttachment updated:', response.data);
        return response.data;
    },

    // Delete attachment
    deleteAttachment: async (id: string): Promise<void> => {
        console.log('[DEBUG] expenseAttachmentsApi.deleteAttachment called with id:', id);

        await CAxios.delete(`/expense/attachments/${id}`);
        console.log('[DEBUG] expenseAttachmentsApi.deleteAttachment deleted attachment with id:', id);
    },

    // Download attachment
    downloadAttachment: async (id: string): Promise<Blob> => {
        console.log('[DEBUG] expenseAttachmentsApi.downloadAttachment called with id:', id);

        const response = await CAxios.get(`/expense/attachments/${id}/download`, {
            responseType: 'blob',
        });
        console.log('[DEBUG] expenseAttachmentsApi.downloadAttachment downloaded file');
        return response.data;
    },
};

export const {
    uploadAttachment,
    getAttachment,
    updateAttachment,
    deleteAttachment,
    downloadAttachment,
} = expenseAttachmentsApi;