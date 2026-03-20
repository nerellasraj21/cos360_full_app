import apiClient from './client';

export interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'push';
  is_active: boolean;
  created_at: string;
}

export interface CommunicationTemplateCreateRequest {
  name: string;
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'push';
  is_active?: boolean;
}

export interface SendMessageRequest {
  recipient_type: 'all' | 'class' | 'student' | 'staff' | 'parent';
  recipient_ids?: string[];
  class_ids?: string[];
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'push';
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

export const communicationApi = {
  // ── Templates ─────────────────────────────────────────────────────────────

  getTemplates: async (): Promise<CommunicationTemplate[]> => {
    const response = await apiClient.get('/send/templates/');
    return response.data.items || response.data || [];
  },

  createTemplate: async (
    data: CommunicationTemplateCreateRequest,
  ): Promise<CommunicationTemplate> => {
    const response = await apiClient.post('/send/templates/', data);
    return response.data;
  },

  updateTemplate: async (
    id: string,
    data: Partial<CommunicationTemplateCreateRequest>,
  ): Promise<CommunicationTemplate> => {
    const response = await apiClient.put(`/send/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/send/templates/${id}`);
  },

  // ── Send ──────────────────────────────────────────────────────────────────

  send: async (data: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await apiClient.post('/send/', data);
    return response.data;
  },

  // ── Logs ──────────────────────────────────────────────────────────────────

  getLogs: async (params?: { page?: number; limit?: number }): Promise<CommunicationLog[]> => {
    const response = await apiClient.get('/send/logs', { params });
    return response.data.items || response.data || [];
  },
};
