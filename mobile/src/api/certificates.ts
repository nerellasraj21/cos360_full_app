import apiClient from './client';

// ─── Issuable Certificate Template types ─────────────────────────────────────
// Templates are reusable HTML blueprints; generated certs are student-specific instances.

export interface IssuableCertificateTemplate {
  id: string;
  name: string;
  html_template: string;
  color_theme: 'blue' | 'green' | 'red' | 'orange';
  variables_used: string | null;
  is_active: string;   // backend stores "True" / "False" as string
  created_at: string;
  updated_at: string;
}

export interface IssuableCertificateTemplateCreate {
  name: string;
  html_template: string;
  color_theme: 'blue' | 'green' | 'red' | 'orange';
}

export interface IssuableCertificateTemplateUpdate {
  name?: string;
  html_template?: string;
  color_theme?: 'blue' | 'green' | 'red' | 'orange';
  is_active?: string;
}

export interface IssuedCertificateRecord {
  id: string;
  student_id: string;
  template_id: string;
  html_content: string;
  issued_date: string;
  issued_by: string;
  remarks?: string;
  is_active: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateCertificateRequest {
  student_id: string;
  template_id: string;
  edited_html: string;
  remarks?: string;
}

export interface GenerateCertificateResponse {
  id: string;
  status: string;
  message: string;
  download_url?: string | null;
}

export interface TemplatePreviewData {
  html: string;
  variables: Record<string, string>;
  student_data: {
    student_id: string;
    name: string;
    admission_number: string;
    father_name?: string;
    mother_name?: string;
    dob?: string;
    class?: string;
    section?: string;
    gender?: string;
    academic_year?: string;
    school_name?: string;
  };
}

// ─── Issuable Certificate Templates API ──────────────────────────────────────

const BASE = '/certificates/issuable-templates';

export const issuableCertificatesApi = {
  /** GET /certificates/issuable-templates/ */
  listTemplates: async (): Promise<IssuableCertificateTemplate[]> => {
    const response = await apiClient.get(`${BASE}/`);
    return response.data.items || response.data;
  },

  /** GET /certificates/issuable-templates/{id} */
  getTemplate: async (id: string): Promise<IssuableCertificateTemplate> => {
    const response = await apiClient.get(`${BASE}/${id}`);
    return response.data;
  },

  /** POST /certificates/issuable-templates/ */
  createTemplate: async (
    data: IssuableCertificateTemplateCreate,
  ): Promise<IssuableCertificateTemplate> => {
    const response = await apiClient.post(`${BASE}/`, data);
    return response.data;
  },

  /** PUT /certificates/issuable-templates/{id} */
  updateTemplate: async (
    id: string,
    data: IssuableCertificateTemplateUpdate,
  ): Promise<IssuableCertificateTemplate> => {
    const response = await apiClient.put(`${BASE}/${id}`, data);
    return response.data;
  },

  /** DELETE /certificates/issuable-templates/{id} */
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  /** GET /certificates/issuable-templates/{id}/preview/{student_id} */
  previewTemplate: async (
    templateId: string,
    studentId: string,
  ): Promise<TemplatePreviewData> => {
    const response = await apiClient.get(`${BASE}/${templateId}/preview/${studentId}`);
    return response.data;
  },

  /** POST /certificates/generate — fill template and save issued certificate */
  generateCertificate: async (
    data: GenerateCertificateRequest,
  ): Promise<GenerateCertificateResponse> => {
    const response = await apiClient.post('/certificates/generate', data);
    return response.data;
  },

  /** GET /certificates/generated/student/{student_id} — list issued certs for a student */
  listGeneratedByStudent: async (studentId: string): Promise<IssuedCertificateRecord[]> => {
    const response = await apiClient.get(`/certificates/generated/student/${studentId}`);
    return response.data.items || response.data;
  },

  /** GET /certificates/generated/{id} */
  getGenerated: async (id: string): Promise<IssuedCertificateRecord> => {
    const response = await apiClient.get(`/certificates/generated/${id}`);
    return response.data;
  },
};
