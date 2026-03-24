import apiClient from './client';

export type CommChannel = 'sms' | 'whatsapp' | 'email';

export interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: CommChannel;
  is_active: boolean;
  created_at: string;
}

export interface CommunicationTemplateCreateRequest {
  name: string;
  subject: string;
  body: string;
  channel: CommChannel;
  is_active?: boolean;
}

export interface SendMessageRequest {
  recipient_type: string;
  recipient_ids?: string[];
  class_ids?: string[];
  section_id?: string;
  subject?: string;
  body?: string;
  channel: CommChannel;
  template_id?: string;
}

export interface SendMessageResponse {
  message: string;
  recipient_count: number;
}

export interface CommunicationLog {
  id: string;
  recipient_type: string;
  subject: string;
  body: string;
  channel: string;
  status: string;
  sent_at: string;
  sent_by: string;
  recipient_count: number;
}

export interface PreviewCountResponse {
  recipient_count: number;
  target_type: string;
}

export const communicationApi = {
  // ── Templates ─────────────────────────────────────────────────────────────

  /** GET /communication/templates/ */
  getTemplates: async (params?: {
    channel?: CommChannel;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<CommunicationTemplate[]> => {
    const response = await apiClient.get('/communication/templates/', { params });
    return response.data.items || response.data || [];
  },

  /** GET /communication/templates/{id} */
  getTemplate: async (id: string): Promise<CommunicationTemplate> => {
    const response = await apiClient.get(`/communication/templates/${id}`);
    return response.data;
  },

  /** POST /communication/templates/ */
  createTemplate: async (
    data: CommunicationTemplateCreateRequest,
  ): Promise<CommunicationTemplate> => {
    const response = await apiClient.post('/communication/templates/', data);
    return response.data;
  },

  /** PUT /communication/templates/{id} */
  updateTemplate: async (
    id: string,
    data: Partial<CommunicationTemplateCreateRequest>,
  ): Promise<CommunicationTemplate> => {
    const response = await apiClient.put(`/communication/templates/${id}`, data);
    return response.data;
  },

  /** DELETE /communication/templates/{id} */
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/communication/templates/${id}`);
  },

  // ── Send ──────────────────────────────────────────────────────────────────

  /** GET /communication/send/preview-count */
  getPreviewCount: async (params: {
    recipient_type: string;
    class_id?: string;
    section_id?: string;
  }): Promise<PreviewCountResponse> => {
    const response = await apiClient.get('/communication/send/preview-count', { params });
    return response.data;
  },

  /** POST /communication/send */
  send: async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await apiClient.post('/communication/send', data);
    return response.data;
  },

  // ── Logs ──────────────────────────────────────────────────────────────────

  /** GET /communication/logs */
  getLogs: async (params?: {
    channel?: CommChannel;
    status?: string;
    target_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<CommunicationLog[]> => {
    const response = await apiClient.get('/communication/logs', { params });
    return response.data.items || response.data || [];
  },

  /** GET /communication/logs/{id} */
  getLogById: async (id: string): Promise<CommunicationLog> => {
    const response = await apiClient.get(`/communication/logs/${id}`);
    return response.data;
  },
};
