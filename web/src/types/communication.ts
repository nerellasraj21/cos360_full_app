// ─── Enums ───────────────────────────────────────────────────────────────────

export type Channel = 'sms' | 'whatsapp' | 'email';

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

// ─── Template ────────────────────────────────────────────────────────────────

export interface Template {
  id: string;
  name: string;
  channel: Channel;
  body: string;
  subject: string | null;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TemplateCreate {
  name: string;
  channel: Channel;
  body: string;
  subject?: string | null;
  variables?: string[];
  is_active?: boolean;
}

export interface TemplateUpdate {
  name?: string;
  body?: string;
  subject?: string | null;
  variables?: string[];
  is_active?: boolean;
}

// ─── Send ────────────────────────────────────────────────────────────────────

export type TargetRef =
  | { parent_id: string }
  | { student_id: string }
  | { staff_id: string }
  | { class_id: string; section_id: string }
  | { role: string }
  | Record<string, never>;

export interface SendRequest {
  channel: Channel;
  target_type: TargetType;
  target_ref: TargetRef;
  template_id: string;
  extra_variables?: Record<string, string>;
}

export interface SendResponse {
  queued_count: number;
  channel: Channel;
  target_type: TargetType;
}

// ─── Preview Count ────────────────────────────────────────────────────────────

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

// ─── Logs ─────────────────────────────────────────────────────────────────────

export interface NotificationLog {
  id: string;
  recipient_name: string;
  recipient_phone: string | null;
  recipient_email: string | null;
  channel: Channel;
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
  channel?: Channel | '';
  status?: NotificationStatus | '';
  target_type?: TargetType | '';
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ─── Template list filters ────────────────────────────────────────────────────

export interface TemplateFilters {
  channel?: Channel | '';
  is_active?: boolean | '';
  page?: number;
  page_size?: number;
}
