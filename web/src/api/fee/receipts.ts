import CAxios from '../index';
import type {
  FeeReceipt,
  FeeReceiptCreate,
  FeeReceiptUpdate,
  ReceiptContent,
  ReceiptVerification,
  FeeReceiptSearchParams,
  FeeReceiptListResponse
} from '@/types/fee/receipt';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
  if (error.response?.data?.detail) {
    return new Error(error.response.data.detail);
  }
  return new Error(error.message || 'Network error');
};

export const feeReceiptsApi = {
  // Generate receipt for transaction
  generateReceipt: async (transactionId: string): Promise<FeeReceipt> => {
    console.log('[DEBUG] feeReceiptsApi.generateReceipt called with transactionId:', transactionId);

    try {
      const response = await CAxios.post(`/fee/receipts/generate/${transactionId}`);
      console.log('[DEBUG] feeReceiptsApi.generateReceipt success:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DEBUG] feeReceiptsApi.generateReceipt failed:', error);
      throw handleApiError(error);
    }
  },

  // Get receipt by ID
  getReceiptById: async (receiptId: string): Promise<FeeReceipt> => {
    console.log('[DEBUG] feeReceiptsApi.getReceiptById called with receiptId:', receiptId);

    const response = await CAxios.get(`/fee/receipts/${receiptId}`);
    console.log('[DEBUG] feeReceiptsApi.getReceiptById success:', response.data);
    return response.data;
  },

  // Get receipt by number
  getReceiptByNumber: async (receiptNumber: string): Promise<FeeReceipt> => {
    console.log('[DEBUG] feeReceiptsApi.getReceiptByNumber called with receiptNumber:', receiptNumber);

    const response = await CAxios.get(`/fee/receipts/number/${receiptNumber}`);
    console.log('[DEBUG] feeReceiptsApi.getReceiptByNumber success:', response.data);
    return response.data;
  },

  // Get receipt content for PDF generation
  getReceiptContent: async (receiptId: string): Promise<ReceiptContent> => {
    console.log('[DEBUG] feeReceiptsApi.getReceiptContent called with receiptId:', receiptId);

    const response = await CAxios.get(`/fee/receipts/${receiptId}/content`);
    console.log('[DEBUG] feeReceiptsApi.getReceiptContent success:', response.data);
    return response.data;
  },

  // Reprint receipt
  reprintReceipt: async (receiptId: string): Promise<FeeReceipt> => {
    console.log('[DEBUG] feeReceiptsApi.reprintReceipt called with receiptId:', receiptId);

    const response = await CAxios.post(`/fee/receipts/${receiptId}/reprint`);
    console.log('[DEBUG] feeReceiptsApi.reprintReceipt success:', response.data);
    return response.data;
  },

  // Verify receipt integrity
  verifyReceipt: async (receiptId: string): Promise<ReceiptVerification> => {
    console.log('[DEBUG] feeReceiptsApi.verifyReceipt called with receiptId:', receiptId);

    const response = await CAxios.get(`/fee/receipts/${receiptId}/verify`);
    console.log('[DEBUG] feeReceiptsApi.verifyReceipt success:', response.data);
    return response.data;
  },

  // Search receipts
  searchReceipts: async (params?: FeeReceiptSearchParams): Promise<FeeReceiptListResponse> => {
    console.log('[DEBUG] feeReceiptsApi.searchReceipts called with params:', params);

    const queryParams = new URLSearchParams();
    if (params?.student_id) queryParams.append('student_id', params.student_id);
    if (params?.receipt_number) queryParams.append('receipt_number', params.receipt_number);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await CAxios.get(`/fee/receipts/?${queryParams.toString()}`);
    console.log('[DEBUG] feeReceiptsApi.searchReceipts returning:', response.data.items?.length || 0, 'receipts');
    return response.data;
  },

  // Download receipt as PDF
  downloadReceiptPdf: async (receiptId: string, receiptNumber?: string): Promise<void> => {
    const response = await CAxios.get(`/fee/collection/receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = receiptNumber ? `${receiptNumber}.pdf` : 'receipt.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; module: string; timestamp: string }> => {
    console.log('[DEBUG] feeReceiptsApi.healthCheck called');

    const response = await CAxios.get('/fee/receipts/health');
    console.log('[DEBUG] feeReceiptsApi.healthCheck success:', response.data);
    return response.data;
  },
};

export const {
  generateReceipt,
  getReceiptById,
  getReceiptByNumber,
  getReceiptContent,
  reprintReceipt,
  verifyReceipt,
  searchReceipts,
  downloadReceiptPdf,
  healthCheck,
} = feeReceiptsApi;