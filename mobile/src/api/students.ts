import apiClient from './client';

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  aadhar_number?: string;
  caste?: string;
  sub_caste?: string;
  community?: string;
  nationality?: string;
  mother_tongue?: string;
  identification_marks?: string;
}

export interface StudentOut {
  id: string;
  first_name: string;
  last_name: string;
  admission_number?: string;
}

export interface Parent {
  id: string;
  name: string;
  email: string;
  phone: string;
  occupation: string;
  aadhar_number?: string;
  gender: string;
  relation_to_student: string;
}

export interface StudentAdmissionCreate {
  admission_date: string;
  academic_year_id: string;
  admitted_academic_year_id: string;
  admitted_class_id: string;
  admitted_section_id: string;
  current_class_id: string;
  current_section_id: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  is_previous_school?: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;
  student: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    is_primary?: boolean;
    aadhar_number?: string;
    apaar_number?: string;
    caste?: string;
    sub_caste?: string;
    community?: string;
    nationality?: string;
    mother_tongue?: string;
    identification_marks?: string;
    father: {
      name: string;
      email?: string;
      phone?: string;
      occupation?: string;
      aadhar_number?: string;
      gender?: string;
      relation_to_student: string;
    };
    mother: {
      name: string;
      email?: string;
      phone?: string;
      occupation?: string;
      aadhar_number?: string;
      gender?: string;
      relation_to_student: string;
    };
  };
}

export interface StudentAdmissionResponse {
  id: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender?: string;
    user_id: string;
  };
  admission_number: string;
  admission_date: string;
  current_class_id: string;
  current_section_id: string;
  academic_year_id: string;
  is_active: boolean;
  created_at: string;
}

// Alias for backward compatibility
export interface StudentAdmission extends StudentAdmissionResponse {}

export interface StudentAdmissionUpdate {
  student_name?: string;
  admission_number?: string;
  class_id?: string;
  section_id?: string;
  academic_year_id?: string;
  date_of_birth?: string;
  admission_date?: string;
  parent_contact?: string;
  address?: string;
}

export interface StudentCreate {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  aadhar_number?: string;
  caste?: string;
  sub_caste?: string;
  community?: string;
  nationality?: string;
  mother_tongue?: string;
  identification_marks?: string;
}

export interface StudentDropdownItem {
  id: string;
  display_name: string;
  admission_number: string;
}

export interface StudentDropdownSimpleItem {
  id: string;
  name: string;
}

export interface StudentAttendanceCreate {
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  remarks?: string;
}

export interface StudentAttendanceOut {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  remarks?: string;
  created_at: string;
  updated_at: string;
  student?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface StudentAttendanceUpdate {
  student_id?: string;
  date?: string;
  status?: 'present' | 'absent';
  remarks?: string;
}

export interface CertificateResponse {
  id: string;
  student_id: string;
  certificate_type_id: string;
  issue_date: string;
  description?: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  certificate_type_name?: string;
}

export interface CertificateCreate {
  student_id: string;
  certificate_type_id: string;
  issue_date: string;
  description?: string;
  certificate_file?: File;
}

export interface CertificateUpdate {
  student_id?: string;
  certificate_type_id?: string;
  issue_date?: string;
  description?: string;
  certificate_file?: File;
}

export interface CertificateTypeRead {
  id: string;
  name: string;
  description?: string;
}

export interface CertificateTypeDropdown {
  id: string;
  name: string;
}

export interface CertificateTypeCreate {
  name: string;
  description?: string;
}

export interface CertificateTypeUpdate {
  name?: string;
  description?: string;
}

// Alias for backward compatibility
export interface CertificateType extends CertificateTypeRead {}

export interface ReactNativeFile {
  uri: string;
  type: string;
  name: string;
}

export interface DocumentResponse {
  id: string;
  student_id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface DocumentCreate {
  student_id: string;
  document_type: string;
  document_name: string;
  document_file: File | ReactNativeFile;
}

export interface DocumentUpdate {
  student_id?: string;
  document_type?: string;
  document_name?: string;
  document_file?: File;
  is_active?: boolean;
}

export interface StudentTransport {
  id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
  pickup_time?: string;
  drop_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentTransportCreate {
  student_id: string;
  route_id: string;
  stop_id: string;
  pickup_time?: string;
  drop_time?: string;
  is_active?: boolean;
}

export interface StudentTransportUpdate {
  student_id?: string;
  route_id?: string;
  stop_id?: string;
  pickup_time?: string;
  drop_time?: string;
  is_active?: boolean;
}

export interface StudentTrip {
  id: string;
  student_id: string;
  trip_id: string;
  pickup_time?: string;
  drop_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentTripCreate {
  student_id: string;
  trip_id: string;
  pickup_time?: string;
  drop_time?: string;
  is_active?: boolean;
}

export interface StudentTripUpdate {
  student_id?: string;
  trip_id?: string;
  pickup_time?: string;
  drop_time?: string;
  is_active?: boolean;
}

export interface TimetableSlot {
  id: string;
  section_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_id?: string;
  room_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulkTimetableCreate {
  timetable_data: Array<{
    section_id: string;
    subject_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    teacher_id?: string;
    room_number?: string;
  }>;
}

export interface BulkTimetableUpdate {
  updates: Array<{
    id: string;
    section_id?: string;
    subject_id?: string;
    day_of_week?: number;
    start_time?: string;
    end_time?: string;
    teacher_id?: string;
    room_number?: string;
    is_active?: boolean;
  }>;
}

export interface TimetableDataItem {
  time: {
    from: string;  // "HH:MM" format
    to: string;    // "HH:MM" format
  };
  type: 'subject' | 'special';
  subjects?: Record<string, string>;  // day -> subject_id mapping
  label?: string;  // for special periods
}

export interface FrontendTimetableCreate {
  section_id: string;
  timetable_data: TimetableDataItem[];
}

export interface FrontendTimetableRead {
  section_id: string;
  timetable_data: TimetableDataItem[];
}

// Student Admissions API
export const studentAdmissionsApi = {
  listAdmissions: async (params?: { skip?: number; limit?: number }): Promise<{ items: StudentAdmissionResponse[]; total_count: number; has_next: boolean }> => {
    const response = await apiClient.get('/students/admission/', { params });
    return response.data;
  },

  getStudentAdmissions: async (params?: { skip?: number; limit?: number }): Promise<{ items: StudentAdmissionResponse[]; total_count: number; has_next: boolean }> => {
    const response = await apiClient.get('/students/admission/', { params });
    return response.data;
  },

  createStudentAdmission: async (data: StudentAdmissionCreate): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.post('/students/admission/', data);
    return response.data;
  },

  updateStudentAdmission: async (studentId: string, data: StudentAdmissionUpdate): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.patch(`/students/admission/${studentId}`, data);
    return response.data;
  },

  deleteStudentAdmission: async (admissionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/students/admission/${admissionId}`);
    return response.data;
  },

  getAdmissionByStudentId: async (studentId: string): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.get(`/students/admission/id/${studentId}`);
    return response.data;
  },

  getStudentByAdmissionId: async (admissionId: string): Promise<StudentOut> => {
    const response = await apiClient.get(`/students/admission/by-admission/${admissionId}`);
    return response.data;
  },

  searchStudents: async (query: string): Promise<StudentOut[]> => {
    const response = await apiClient.get('/students/admission/search', { params: { query } });
    return response.data;
  },

  studentsDropdown: async (activeOnly?: boolean): Promise<StudentDropdownItem[]> => {
    const response = await apiClient.get('/students/admission/students/dropdown', { params: { active_only: activeOnly } });
    return response.data;
  },

  studentsDropdownSimple: async (activeOnly?: boolean): Promise<StudentDropdownSimpleItem[]> => {
    const response = await apiClient.get('/students/admission/students/dropdown/simple', { params: { active_only: activeOnly } });
    return response.data;
  },

  getActiveStudentsDropdownSimple: async (): Promise<StudentDropdownSimpleItem[]> => {
    const response = await apiClient.get('/students/admission/students/dropdown/simple', { params: { active_only: true } });
    return response.data;
  },

  myAdmission: async (): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.get('/students/admission/my-admission');
    return response.data;
  },

  myChildrenAdmissions: async (): Promise<StudentAdmissionResponse[]> => {
    const response = await apiClient.get('/students/admission/my-children-admissions');
    return response.data;
  },
};

// Student Attendance API
export const studentAttendanceApi = {
  getAllAttendances: async (params?: { date?: string; class_id?: string; section_id?: string }): Promise<StudentAttendanceOut[]> => {
    const response = await apiClient.get('/students/attendance', { params });
    return response.data;
  },

  createAttendance: async (data: StudentAttendanceCreate): Promise<StudentAttendanceOut> => {
    const response = await apiClient.post('/students/attendance', data);
    return response.data;
  },

  updateAttendance: async (id: string, data: StudentAttendanceUpdate): Promise<StudentAttendanceOut> => {
    const response = await apiClient.put(`/students/attendance/${id}`, data);
    return response.data;
  },

  deleteAttendance: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/attendance/${id}`);
  },
};

// Student Certificates API
export const studentCertificatesApi = {
  listCertificates: async (params?: { student_id?: string; certificate_type_id?: string }): Promise<CertificateResponse[]> => {
    const response = await apiClient.get('/students/certificates', { params });
    return response.data;
  },

  getCertificate: async (id: string): Promise<CertificateResponse> => {
    const response = await apiClient.get(`/students/certificates/${id}`);
    return response.data;
  },

  downloadCertificate: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/students/certificates/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  createCertificate: async (data: CertificateCreate): Promise<CertificateResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });
    const response = await apiClient.post('/student/certificates/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateCertificate: async (id: string, data: CertificateUpdate): Promise<CertificateResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });
    const response = await apiClient.put(`/students/certificates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteCertificate: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/certificates/${id}`);
  },
};

// Certificate Types API
export const certificateTypesApi = {
  // Fetch all certificate types (paginated)
  listCertificateTypes: async (params?: { skip?: number; limit?: number }): Promise<{ items: CertificateTypeRead[]; total_count: number; has_next: boolean }> => {
    const response = await apiClient.get('/student/certificate-types', { params });
    return response.data;
  },

  // Fetch all certificate types
  fetchCertificateTypes: async (): Promise<{ items: CertificateTypeRead[] }> => {
    const response = await apiClient.get('/student/certificate-types/');
    return response.data;
  },

  // Fetch certificate type by ID
  getCertificateType: async (id: string): Promise<CertificateTypeRead> => {
    const response = await apiClient.get(`/student/certificate-types/${id}`);
    return response.data;
  },

  // Fetch certificate types for dropdown
  getCertificateTypesDropdown: async (): Promise<CertificateTypeDropdown[]> => {
    const response = await apiClient.get('/student/certificate-types/dropdown');
    return response.data;
  },

  // Create new certificate type
  createCertificateType: async (data: CertificateTypeCreate): Promise<CertificateTypeRead> => {
    const response = await apiClient.post('/student/certificate-types', data);
    return response.data;
  },

  // Update certificate type
  updateCertificateType: async (id: string, data: CertificateTypeUpdate): Promise<CertificateTypeRead> => {
    const response = await apiClient.put(`/student/certificate-types/${id}`, data);
    return response.data;
  },

  // Delete certificate type
  deleteCertificateType: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/student/certificate-types/${id}`);
    return response.data;
  },
};

export const studentDocumentsApi = {
  listDocuments: async (params?: { student_id?: string; document_type?: string }): Promise<DocumentResponse[]> => {
    const response = await apiClient.get('/students/documents', { params });
    return response.data;
  },

  getDocument: async (id: string): Promise<DocumentResponse> => {
    const response = await apiClient.get(`/students/documents/${id}`);
    return response.data;
  },

  downloadDocument: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/students/documents/download/${id}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  uploadDocument: async (data: DocumentCreate): Promise<DocumentResponse> => {
    console.log('uploadDocument called with data:', data);
    console.log('student_id in data:', data.student_id);

    const formData = new FormData();
    formData.append('student_id', data.student_id);
    formData.append('document_type', data.document_type);
    formData.append('document_name', data.document_name);

    console.log('FormData after appending text fields:', formData);

    // Check if document_file is a React Native file object (with uri, type, name properties)
    if (data.document_file && typeof data.document_file === 'object' && 'uri' in data.document_file && 'type' in data.document_file && 'name' in data.document_file) {
      console.log('Processing React Native file:', data.document_file);
      // For React Native, fetch the blob from uri before appending to FormData
      const response = await fetch(data.document_file.uri);
      console.log('Fetch response status:', response.status);
      const blob = await response.blob();
      console.log('Blob created:', blob.size, blob.type);
      formData.append('document_file', blob, data.document_file.name);
      console.log('FormData after appending blob:', formData);
    } else if (data.document_file instanceof File) {
      console.log('Processing web File:', data.document_file);
      formData.append('document_file', data.document_file);
    } else {
      console.error('Unsupported file type:', data.document_file);
      throw new Error('Unsupported file type');
    }

    console.log('Sending request to /students/documents/ with FormData');
    const response = await apiClient.post('/students/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('API response:', response);
    return response.data;
  },

  updateDocument: async (id: string, data: DocumentUpdate): Promise<DocumentResponse> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });
    const response = await apiClient.put(`/students/documents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/documents/${id}`);
  },
};

// Student Transport API
export const studentTransportApi = {
  listStudentTransport: async (params?: { student_id?: string; route_id?: string; is_active?: boolean }): Promise<StudentTransport[]> => {
    const response = await apiClient.get('/students/student-transport', { params });
    return response.data;
  },

  getStudentTransport: async (id: string): Promise<StudentTransport> => {
    const response = await apiClient.get(`/students/student-transport/${id}`);
    return response.data;
  },

  createStudentTransport: async (data: StudentTransportCreate): Promise<StudentTransport> => {
    const response = await apiClient.post('/students/student-transport', data);
    return response.data;
  },

  updateStudentTransport: async (id: string, data: StudentTransportUpdate): Promise<StudentTransport> => {
    const response = await apiClient.put(`/students/student-transport/${id}`, data);
    return response.data;
  },

  deleteStudentTransport: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/student-transport/${id}`);
  },

  // Student Trips API
  listStudentTrips: async (params?: { student_id?: string; trip_id?: string }): Promise<StudentTrip[]> => {
    const response = await apiClient.get('/students/student-transport/trips', { params });
    return response.data;
  },

  getStudentTrip: async (id: string): Promise<StudentTrip> => {
    const response = await apiClient.get(`/students/student-transport/trips/${id}`);
    return response.data;
  },

  createStudentTrip: async (data: StudentTripCreate): Promise<StudentTrip> => {
    const response = await apiClient.post('/students/student-transport/trips', data);
    return response.data;
  },

  updateStudentTrip: async (id: string, data: StudentTripUpdate): Promise<StudentTrip> => {
    const response = await apiClient.put(`/students/student-transport/trips/${id}`, data);
    return response.data;
  },

  deleteStudentTrip: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/student-transport/trips/${id}`);
  },
};

// Timetable API
export const timetableApi = {
  // Legacy API (keeping for compatibility)
  getTimetableBySection: async (sectionId: string): Promise<TimetableSlot[]> => {
    const response = await apiClient.get(`/students/timetable/section/${sectionId}`);
    return response.data.items || response.data;
  },

  bulkCreateTimetable: async (data: BulkTimetableCreate): Promise<any> => {
    const response = await apiClient.post('/students/timetable/bulk', data);
    return response.data;
  },

  bulkUpdateTimetableSlots: async (data: BulkTimetableUpdate): Promise<any> => {
    const response = await apiClient.patch('/students/timetable/timetable/slots/bulk', data);
    return response.data;
  },

  createFrontendTimetable: async (data: FrontendTimetableCreate): Promise<void> => {
    await apiClient.post('/students/timetable/frontend', data);
  },

  updateFrontendTimetable: async (sectionId: string, data: FrontendTimetableCreate): Promise<void> => {
    await apiClient.put(`/students/timetable/frontend/${sectionId}`, data);
  },

  getFrontendTimetable: async (sectionId: string): Promise<FrontendTimetableRead> => {
    const response = await apiClient.get(`/students/timetable/frontend/${sectionId}`);
    return response.data;
  },
};

export interface ParentStudent {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
  class_name: string;
  section_id?: string;
  section_name?: string;
  academic_year: string;
  academic_year_id: string;
  is_active: boolean;
  date_of_birth?: string;
  gender?: string;
}

// Parent Students API
export const parentStudentsApi = {
  getParentStudents: async (): Promise<ParentStudent[]> => {
    try {
      // Use the correct endpoint from the API response
      const response = await apiClient.get('/student-parent-links/my-children');
      const students = response.data || [];

      // Transform to ParentStudent format without dummy data
      return students.map((student: any) => ({
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        first_name: student.first_name,
        last_name: student.last_name,
        admission_number: student.admission_number,
        class_id: student.class_id,
        class_name: student.class_name,
        section_id: student.section_id,
        section_name: student.section_name,
        academic_year: student.academic_year,
        academic_year_id: student.academic_year_id,
        is_active: student.is_active,
        date_of_birth: student.date_of_birth,
        gender: student.gender,
      }));
    } catch (error) {
      console.error('Failed to fetch parent students:', error);
      throw error;
    }
  },
};