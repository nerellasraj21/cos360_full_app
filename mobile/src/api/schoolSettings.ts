import apiClient from './client';

export interface SchoolSettings {
  id: string;
  school_name: string | null;
  contact_no: string | null;
  alt_contact_no: string | null;
  school_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  pin_code: string | null;
  country: string | null;
  academic_year: string | null;
  /** YYYY-MM-DD */
  installation_date: string | null;
  image_url: string | null;
  principal_signature_url: string | null;
  school_board: string | null;
}

export type SchoolSettingsUpdate = Partial<Omit<SchoolSettings, 'id'>>;

/** Builds a FormData payload for a single-file upload, handling both web (data:/blob: URIs) and native (file:// uri) sources — mirrors studentsApi.uploadStudentPhoto. */
async function buildSingleFileFormData(
  fieldName: string,
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<FormData> {
  const formData = new FormData();
  if (uri.startsWith('data:') || uri.startsWith('blob:')) {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append(fieldName, blob, fileName);
  } else {
    formData.append(fieldName, { uri, type: mimeType, name: fileName } as any);
  }
  return formData;
}

export const schoolSettingsApi = {
  /** GET /school-settings — 404 if not configured yet */
  getSettings: async (): Promise<SchoolSettings | null> => {
    try {
      const response = await apiClient.get('/school-settings');
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },

  /** PUT /school-settings — creates on first save, updates thereafter (upsert) */
  updateSettings: async (data: SchoolSettingsUpdate): Promise<SchoolSettings> => {
    const response = await apiClient.put('/school-settings', data);
    return response.data;
  },

  /** POST /school-settings/upload-image — multipart, field name "photo" */
  uploadImage: async (uri: string, mimeType: string): Promise<SchoolSettings> => {
    const formData = await buildSingleFileFormData('photo', uri, mimeType, 'school-logo.jpg');
    const response = await apiClient.post('/school-settings/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** POST /school-settings/upload-signature — multipart, field name "photo" */
  uploadSignature: async (uri: string, mimeType: string): Promise<SchoolSettings> => {
    const formData = await buildSingleFileFormData('photo', uri, mimeType, 'principal-signature.jpg');
    const response = await apiClient.post('/school-settings/upload-signature', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};
