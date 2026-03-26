import apiClient from './client';

export type CommChannel = 'sms' | 'whatsapp' | 'email';

export type TargetType =
  | 'individual_parent'
  | 'individual_student'
  | 'individual_staff'
  | 'class_section_parents'
  | 'class_section_students'
  | 'all_parents'
  | 'all_students'
  | 'all_staff'
  | 'all_users'
  | 'fee_defaulters'
  | 'role_based';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed';

export type TargetRef =
  | { parent_id: string }
  | { student_id: string }
  | { staff_id: string }
  | { class_id: string; section_id: string }
  | { role: string }
  | Record<string, unknown>;

export interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string | null;
  body: string;
  channel: CommChannel;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TemplateCreateRequest {
  name: string;
  channel: CommChannel;
  body: string;
  subject?: string | null;
  variables?: string[];
  is_active?: boolean;
}

export interface TemplateUpdateRequest {
  name?: string;
  body?: string;
  subject?: string | null;
  variables?: string[];
  is_active?: boolean;
}

export interface SendRequest {
  channel: CommChannel;
  target_type: TargetType;
  target_ref: TargetRef;
  template_id?: string;
  extra_variables?: Record<string, string>;
}

export interface SendResponse {
  queued_count: number;
  channel: CommChannel;
  target_type: TargetType;
}

export interface PreviewCountParams {
  target_type: TargetType;
  class_id?: string;
  section_id?: string;
  role?: string;
  parent_id?: string;
  student_id?: string;
  staff_id?: string;
}

export interface PreviewCountResponse {
  estimated_count: number;
}

export interface NotificationLog {
  id: string;
  recipient_name: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  channel: CommChannel;
  status: NotificationStatus;
  target_type: TargetType;
  triggered_by: string;
  provider_message_id: string | null;
  created_at: string;
}

export interface LogDetail extends NotificationLog {
  message: string;
  template_id: string;
  error_message: string | null;
  target_ref: string;
  updated_at: string;
}

export interface LogFilters {
  channel?: CommChannel;
  status?: NotificationStatus;
  target_type?: TargetType;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface LogsPage {
  items: NotificationLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface TemplateFilters {
  channel?: CommChannel;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

// Legacy aliases for backward compatibility
export type CommunicationLog = NotificationLog;
export type SendMessageRequest = SendRequest;
export type SendMessageResponse = SendResponse;
export type CommunicationTemplateCreateRequest = TemplateCreateRequest;

export const communicationApi = {
  // ── Templates ─────────────────────────────────────────────────────────────

  /** GET /communication/templates/ */
  getTemplates: async (params?: TemplateFilters): Promise<CommunicationTemplate[]> => {
    const response = await apiClient.get('/communication/templates/', { params });
    return response.data.items ?? response.data ?? [];
  },

  /** GET /communication/templates/{id} */
  getTemplate: async (id: string): Promise<CommunicationTemplate> => {
    const response = await apiClient.get(`/communication/templates/${id}`);
    return response.data;
  },

  /** POST /communication/templates/ */
  createTemplate: async (data: TemplateCreateRequest): Promise<CommunicationTemplate> => {
    const response = await apiClient.post('/communication/templates/', data);
    return response.data;
  },

  /** PUT /communication/templates/{id} */
  updateTemplate: async (
    id: string,
    data: TemplateUpdateRequest,
  ): Promise<CommunicationTemplate> => {
    const response = await apiClient.put(`/communication/templates/${id}`, data);
    return response.data;
  },

  /** DELETE /communication/templates/{id} — deactivates (is_active → false), returns updated template */
  deleteTemplate: async (id: string): Promise<CommunicationTemplate> => {
    const response = await apiClient.delete(`/communication/templates/${id}`);
    return response.data;
  },

  // ── Send ──────────────────────────────────────────────────────────────────

  /** GET /communication/send/preview-count */
  getPreviewCount: async (params: PreviewCountParams): Promise<PreviewCountResponse> => {
    const response = await apiClient.get('/communication/send/preview-count', { params });
    return response.data;
  },

  /** POST /communication/send */
  send: async (data: SendRequest): Promise<SendResponse> => {
    const response = await apiClient.post('/communication/send', data);
    return response.data;
  },

  // ── Logs ──────────────────────────────────────────────────────────────────

  /** GET /communication/logs — returns paginated response */
  getLogs: async (params?: LogFilters): Promise<LogsPage> => {
    const filteredParams = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
      : undefined;
    const response = await apiClient.get('/communication/logs', { params: filteredParams });
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page: 1, page_size: data.length || 20 };
    }
    return {
      items: data.items ?? [],
      total: data.total ?? 0,
      page: data.page ?? 1,
      page_size: data.page_size ?? 20,
    };
  },

  /** GET /communication/logs/{id} */
  getLogDetail: async (id: string): Promise<LogDetail> => {
    const response = await apiClient.get(`/communication/logs/${id}`);
    return response.data;
  },

  /** @deprecated use getLogDetail */
  getLogById: async (id: string): Promise<LogDetail> => {
    const response = await apiClient.get(`/communication/logs/${id}`);
    return response.data;
  },
};
