import CAxios from '../index';
import type {
  Template,
  TemplateCreate,
  TemplateUpdate,
  PaginatedResponse,
  SendRequest,
  SendResponse,
  PreviewCountParams,
  PreviewCountResponse,
  NotificationLog,
  LogDetail,
  LogFilters,
  TemplateFilters,
} from '@/types/communication';

// CAxios already injects the Authorization header via interceptors.

export const communicationApi = {
  // ─── Templates ─────────────────────────────────────────────────────────────

  getTemplates: async (filters?: TemplateFilters): Promise<PaginatedResponse<Template>> => {
    const params = new URLSearchParams();
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.is_active !== undefined && filters.is_active !== '')
      params.append('is_active', String(filters.is_active));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));

    const response = await CAxios.get(`/communication/templates/?${params.toString()}`);
    // Backend returns plain array (not paginated) — normalise to PaginatedResponse shape
    const raw = response.data;
    if (Array.isArray(raw)) {
      return { items: raw, total: raw.length, page: 1, page_size: raw.length || 20 };
    }
    return raw;
  },

  getTemplate: async (id: string): Promise<Template> => {
    const response = await CAxios.get(`/communication/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data: TemplateCreate): Promise<Template> => {
    const response = await CAxios.post('/communication/templates/', data);
    return response.data;
  },

  updateTemplate: async (id: string, data: TemplateUpdate): Promise<Template> => {
    const response = await CAxios.put(`/communication/templates/${id}`, data);
    return response.data;
  },

  deactivateTemplate: async (id: string): Promise<Template> => {
    // Backend returns the updated TemplateRead object (is_active=false), not a { message } body
    const response = await CAxios.delete(`/communication/templates/${id}`);
    return response.data;
  },

  // ─── Send ───────────────────────────────────────────────────────────────────

  getPreviewCount: async (params: PreviewCountParams): Promise<PreviewCountResponse> => {
    const query = new URLSearchParams();
    query.append('target_type', params.target_type);
    if (params.class_id) query.append('class_id', params.class_id);
    if (params.section_id) query.append('section_id', params.section_id);
    if (params.role) query.append('role', params.role);
    if (params.parent_id) query.append('parent_id', params.parent_id);
    if (params.student_id) query.append('student_id', params.student_id);
    if (params.staff_id) query.append('staff_id', params.staff_id);
    params.parent_ids?.forEach((id) => query.append('parent_ids', id));
    params.student_ids?.forEach((id) => query.append('student_ids', id));
    params.staff_ids?.forEach((id) => query.append('staff_ids', id));

    const response = await CAxios.get(`/communication/send/preview-count?${query.toString()}`);
    return response.data;
  },

  sendNotification: async (data: SendRequest): Promise<SendResponse> => {
    const response = await CAxios.post('/communication/send', data);
    return response.data;
  },

  // ─── Logs ───────────────────────────────────────────────────────────────────

  getLogs: async (filters?: LogFilters): Promise<PaginatedResponse<NotificationLog>> => {
    const params = new URLSearchParams();
    if (filters?.channel) params.append('channel', filters.channel);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.target_type) params.append('target_type', filters.target_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.page_size) params.append('page_size', String(filters.page_size));

    const response = await CAxios.get(`/communication/logs?${params.toString()}`);
    return response.data;
  },

  getLogDetail: async (id: string): Promise<LogDetail> => {
    const response = await CAxios.get(`/communication/logs/${id}`);
    return response.data;
  },
};
