import axios from 'axios';
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
const handleApiError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    return new Error(error.message || 'Network error');
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('Network error');
};

export const feeReceiptsApi = {
  // Generate receipt for transaction
  generateReceipt: async (transactionId: string): Promise<FeeReceipt> => {
    try {
      const response = await CAxios.post(`/fee/receipts/generate/${transactionId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get receipt by ID
  getReceiptById: async (receiptId: string): Promise<FeeReceipt> => {
    const response = await CAxios.get(`/fee/receipts/${receiptId}`);
    return response.data;
  },

  // Get receipt by number
  getReceiptByNumber: async (receiptNumber: string): Promise<FeeReceipt> => {
    const response = await CAxios.get(`/fee/receipts/number/${receiptNumber}`);
    return response.data;
  },

  // Get receipt content for PDF generation
  getReceiptContent: async (receiptId: string): Promise<ReceiptContent> => {
    const response = await CAxios.get(`/fee/receipts/${receiptId}/content`);
    return response.data;
  },

  // Reprint receipt
  reprintReceipt: async (receiptId: string): Promise<FeeReceipt> => {
    const response = await CAxios.post(`/fee/receipts/${receiptId}/reprint`);
    return response.data;
  },

  // Verify receipt integrity
  verifyReceipt: async (receiptId: string): Promise<ReceiptVerification> => {
    const response = await CAxios.get(`/fee/receipts/${receiptId}/verify`);
    return response.data;
  },

  // Search receipts
  searchReceipts: async (params?: FeeReceiptSearchParams): Promise<FeeReceiptListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.student_id) queryParams.append('student_id', params.student_id);
    if (params?.receipt_number) queryParams.append('receipt_number', params.receipt_number);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const response = await CAxios.get(`/fee/receipts/?${queryParams.toString()}`);
    return response.data;
  },

  // Returns a blob URL for in-app PDF preview — caller must call URL.revokeObjectURL when done
  getReceiptPdfBlobUrl: async (receiptId: string): Promise<string> => {
    const response = await CAxios.get(`/fee/collection/receipts/${receiptId}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return window.URL.createObjectURL(blob);
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
    const response = await CAxios.get('/fee/receipts/health');
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