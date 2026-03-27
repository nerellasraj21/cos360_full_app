import apiClient from './client';

// ─── Shared ───────────────────────────────────────────────────────────────────

/** React Native image/file picker result */
export interface ReactNativeFile {
  uri: string;
  type: string;
  name: string;
}

/** Parent create payload (used inside StudentAdmissionCreate) */
export interface ParentCreate {
  name: string;
  email?: string;
  phone?: string;
  occupation?: string;
  aadhar_number?: string;
  gender?: string;
  relation_to_student: string;
  salary_range?: string;
}

// ─── Admissions ───────────────────────────────────────────────────────────────

/** Nested student info returned inside admission responses */
export interface StudentOut {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  user_id?: string;
  admission_number?: string;
  // Personal details
  aadhar_number?: string | null;
  apaar_number?: string | null;
  caste?: string | null;
  sub_caste?: string | null;
  community?: string | null;
  nationality?: string | null;
  mother_tongue?: string | null;
  identification_marks?: string | null;
}

/** Backward compat alias used by masters.ts and other modules */
export interface Student extends StudentOut {}

/** POST /students/admission/ */
export interface StudentAdmissionCreate {
  admission_date: string;                         // "YYYY-MM-DD"
  admission_type?: 'primary' | 'non_primary';
  academic_year_id: string;
  admitted_academic_year_id?: string;
  admitted_class_id: string;
  admitted_section_id: string;
  current_class_id?: string;
  current_section_id?: string;
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
    date_of_birth: string;                        // "YYYY-MM-DD"
    gender: string;
    is_primary?: string;                          // "primary" | "non_primary" | "not_primary"
    aadhar_number?: string;
    apaar_number?: string;
    caste_id?: string;
    sub_caste_id?: string;
    community?: string;
    nationality?: string;
    mother_tongue?: string;
    identification_marks?: string;
    father: ParentCreate;
    mother: ParentCreate;
  };
}

/** GET /students/admission/ item */
export interface StudentAdmissionResponse {
  id: string;
  admission_number: string | null;
  admission_date: string;
  admission_type: 'primary' | 'non_primary' | null;
  academic_year_id: string | null;
  admitted_academic_year_id: string | null;
  admitted_class_id: string | null;
  admitted_section_id: string | null;
  current_class_id: string | null;
  current_section_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  is_previous_school: boolean;
  previous_school_name: string | null;
  previous_class: string | null;
  previous_school_remark: string | null;
  is_active: boolean;
  created_at: string;
  student: StudentOut;
  // Parent info returned by some endpoints
  father?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    occupation?: string | null;
    aadhar_number?: string | null;
    gender?: string | null;
    relation_to_student?: string;
  } | null;
  mother?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    occupation?: string | null;
    aadhar_number?: string | null;
    gender?: string | null;
    relation_to_student?: string;
  } | null;
}

/** Alias for backward compatibility */
export interface StudentAdmission extends StudentAdmissionResponse {}

/** PATCH /students/admission/{student_id} — all fields optional */
export interface StudentAdmissionUpdate {
  admission_date?: string;
  admission_type?: 'primary' | 'non_primary';
  academic_year_id?: string;
  admitted_academic_year_id?: string;
  admitted_class_id?: string;
  admitted_section_id?: string;
  current_class_id?: string;
  current_section_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  is_previous_school?: boolean;
  previous_school_name?: string;
  previous_class?: string;
  previous_school_remark?: string;
  // Student personal fields
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
  is_primary?: string;
  aadhar_number?: string;
  apaar_number?: string;
  nationality?: string;
  mother_tongue?: string;
  caste?: string;
  sub_caste?: string;
  community?: string;
  identification_marks?: string;
  // Father fields
  father_name?: string;
  father_email?: string;
  father_phone?: string;
  father_occupation?: string;
  father_aadhar_number?: string;
  father_gender?: string;
  father_salary_range?: string;
  // Mother fields
  mother_name?: string;
  mother_email?: string;
  mother_phone?: string;
  mother_occupation?: string;
  mother_aadhar_number?: string;
  mother_gender?: string;
  mother_salary_range?: string;
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

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late';

/** POST /student/attendance/ */
export interface StudentAttendanceCreate {
  student_id: string;
  date: string;                                   // "YYYY-MM-DD"
  status: AttendanceStatus;
  remarks?: string;
}

/** PATCH /student/attendance/{id} — only status/remarks are patchable */
export interface StudentAttendanceUpdate {
  status?: AttendanceStatus;
  remarks?: string;
}

/** GET response item */
export interface StudentAttendanceOut {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
}

// ─── Certificates ─────────────────────────────────────────────────────────────

/** GET /certificates/{id} response */
export interface CertificateRead {
  id: string;
  student_id: string;
  certificate_type_id: string | null;
  type_name: string;
  file_path: string | null;
  issue_date: string | null;                      // "YYYY-MM-DD"
  remarks: string | null;
  certificate_category: string | null;
  issued_by_name: string | null;
  issuer_signature_url: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Alias kept for backward compatibility.
 * Old code used `description` and `certificate_type_name` — those fields are
 * added as deprecated optionals so existing screens don't break immediately.
 */
export interface CertificateResponse extends CertificateRead {
  /** @deprecated Backend field is `remarks` */
  description?: string;
  /** @deprecated Backend field is `type_name` */
  certificate_type_name?: string;
}

/** GET /certificates/{id}/download response */
export interface CertificateDownloadResponse {
  presigned_url: string;
  expires_in_seconds: number;
  certificate_id: string | null;
  filename: string | null;
}

/** POST /certificates/ — general upload */
export interface CertificateCreate {
  student_id: string;
  certificate_type_id: string;
  issue_date?: string;                            // defaults to today
  remarks?: string;
  file?: ReactNativeFile | File;
}

/** POST /certificates/issued — school issues a certificate (issue_date required) */
export interface IssuedCertificateCreateRequest {
  student_id: string;
  certificate_type_id: string;
  issue_date: string;
  remarks?: string;
  file: ReactNativeFile | File;
}

/** POST /certificates/received — admin uploads a received document */
export interface ReceivedDocumentCreateRequest {
  student_id: string;
  certificate_type_id: string;
  remarks?: string;
  file: ReactNativeFile | File;
}

/** PATCH /certificates/{id} */
export interface CertificateUpdate {
  certificate_type_id?: string;
  issue_date?: string;
  remarks?: string;
  file?: ReactNativeFile | File;
}

// ─── Certificate Types ────────────────────────────────────────────────────────

export interface CertificateTypeRead {
  id: string;
  name: string;
  description: string | null;
}

export interface CertificateTypeDropdown {
  id: string;
  name: string;
}

/** POST /certificates/types/ */
export interface CertificateTypeCreate {
  name: string;
  description?: string;
}

/** PUT /certificates/types/{id} */
export interface CertificateTypeUpdate {
  name?: string;
  description?: string;
}

/** Alias */
export interface CertificateType extends CertificateTypeRead {}

// ─── Certificate selector (admin cascade) ─────────────────────────────────────

export interface CertificateSelectorClass {
  id: string;
  class_name: string;
}

export interface CertificateSelectorSection {
  id: string;
  section_name: string;
}

export interface CertificateSelectorStudent {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

// ─── Documents ────────────────────────────────────────────────────────────────

/** GET /students/documents/{id} response */
export interface DocumentOut {
  id: string;
  student_id: string;
  document_type: string;
  file_path: string;
  upload_date: string;                            // datetime string
}

/**
 * Alias kept for backward compatibility.
 * Old code referenced fields that don't exist in the backend.
 */
export interface DocumentResponse extends DocumentOut {
  /** @deprecated Not in backend — use file_path directly */
  document_name?: string;
  /** @deprecated Backend field is `upload_date` */
  uploaded_at?: string;
  /** @deprecated Not in backend */
  is_verified?: boolean;
  /** @deprecated Not in backend */
  verified_by?: string;
  /** @deprecated Not in backend */
  verified_at?: string;
}

/** POST /students/documents/ */
export interface DocumentCreate {
  student_id: string;
  document_type: string;
  document_file: ReactNativeFile | File;
}

/** PATCH /students/documents/{id} */
export interface DocumentUpdate {
  document_type?: string;
  document_file?: ReactNativeFile | File;
}

// ─── Transport ────────────────────────────────────────────────────────────────

export interface TransportRouteInfo {
  id: string;
  route_name: string;
  starting_stop: string;
  ending_stop: string;
  start_time: string | null;
  end_time: string | null;
}

export interface TransportVehicleInfo {
  id: string;
  name: string | null;
  registration_number: string | null;
  vehicle_type: string | null;
}

export interface TransportTripInfo {
  id: string;
  trip_number: number | null;
  route: TransportRouteInfo | null;
  vehicle: TransportVehicleInfo | null;
}

export interface TransportStopInfo {
  id: string;
  name: string;
  number: number | null;
  reaching_time: string | null;
  pickup_time: string | null;
  drop_time: string | null;
  fees: number | null;
}

export interface TransportStudentInfo {
  id: string;
  first_name: string;
  last_name: string;
}

export interface TransportPricingInfo {
  id: string;
  billing_cycle: string;
  cycle_name: string;
  amount: number;
}

/** GET /students/student-transport/{id} response */
export interface StudentTransportOut {
  id: string;
  student_id: string;
  trip_id: string;
  stop_id: string;
  fee_per_term: number;
  pricing_id: string | null;
  created_at: string;
  updated_at: string;
  trip: TransportTripInfo | null;
  stop: TransportStopInfo | null;
  student: TransportStudentInfo | null;
  pricing: TransportPricingInfo | null;
}

/** Alias for backward compatibility */
export interface StudentTransport extends StudentTransportOut {}

/** POST /students/student-transport/ */
export interface StudentTransportCreate {
  student_id: string;
  trip_id: string;
  stop_id: string;
  fee_per_term: number;
  pricing_id?: string;
}

/** PATCH /students/student-transport/{id} */
export interface StudentTransportUpdate {
  trip_id?: string;
  stop_id?: string;
  fee_per_term?: number;
  pricing_id?: string;
}

// ─── Timetable (legacy) ───────────────────────────────────────────────────────

export interface TimetableSlot {
  id: string;
  section_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  teacher_id: string | null;
  room_number: string | null;
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
    from: string;   // "HH:MM"
    to: string;     // "HH:MM"
  };
  type: 'subject' | 'special';
  subjects?: Record<string, string>;  // day -> subject_id
  label?: string;
}

export interface FrontendTimetableCreate {
  section_id: string;
  timetable_data: TimetableDataItem[];
}

export interface FrontendTimetableRead {
  section_id: string;
  timetable_data: TimetableDataItem[];
}

// ─── Parent-student link ──────────────────────────────────────────────────────

export interface ParentStudent {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
  class_name: string;
  section_id: string | null;
  section_name: string | null;
  academic_year: string;
  academic_year_id: string;
  is_active: boolean;
  date_of_birth: string | null;
  gender: string | null;
}

// ─── Student Admissions API ───────────────────────────────────────────────────

export const studentAdmissionsApi = {
  /** GET /students/admission/ — paginated list */
  listAdmissions: async (params?: {
    skip?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<{ items: StudentAdmissionResponse[]; total_count: number; has_next: boolean }> => {
    const response = await apiClient.get('/students/admission/', { params });
    return response.data;
  },

  /** Alias for listAdmissions */
  getStudentAdmissions: async (params?: {
    skip?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<{ items: StudentAdmissionResponse[]; total_count: number; has_next: boolean }> => {
    const response = await apiClient.get('/students/admission/', { params });
    return response.data;
  },

  /** POST /students/admission/ */
  createStudentAdmission: async (
    data: StudentAdmissionCreate,
  ): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.post('/students/admission/', data);
    return response.data;
  },

  /** PATCH /students/admission/{student_id} */
  updateStudentAdmission: async (
    studentId: string,
    data: StudentAdmissionUpdate,
  ): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.patch(`/students/admission/${studentId}`, data);
    return response.data;
  },

  /** DELETE /students/admission/{admission_id} */
  deleteStudentAdmission: async (admissionId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/students/admission/${admissionId}`);
    return response.data;
  },

  /** GET /students/admission/id/{student_id} */
  getAdmissionByStudentId: async (studentId: string): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.get(`/students/admission/id/${studentId}`);
    return response.data;
  },

  /** GET /students/admission/by-admission/{admission_id} */
  getStudentByAdmissionId: async (admissionId: string): Promise<StudentOut> => {
    const response = await apiClient.get(`/students/admission/by-admission/${admissionId}`);
    return response.data;
  },

  /** GET /students/admission/search?query=... */
  searchStudents: async (query: string): Promise<StudentOut[]> => {
    const response = await apiClient.get('/students/admission/search', { params: { query } });
    return response.data;
  },

  /** GET /students/admission/students/dropdown */
  studentsDropdown: async (params?: {
    class_id?: string;
    section_id?: string;
    active_only?: boolean;
  }): Promise<StudentDropdownItem[]> => {
    const response = await apiClient.get('/students/admission/students/dropdown', { params });
    return response.data;
  },

  /** GET /students/admission/students/dropdown/simple */
  studentsDropdownSimple: async (params?: {
    class_id?: string;
    section_id?: string;
    active_only?: boolean;
  }): Promise<StudentDropdownSimpleItem[]> => {
    const response = await apiClient.get('/students/admission/students/dropdown/simple', { params });
    return response.data;
  },

  /** GET /students/admission/students/dropdown/simple?active_only=true */
  getActiveStudentsDropdownSimple: async (): Promise<StudentDropdownSimpleItem[]> => {
    const response = await apiClient.get('/students/admission/students/dropdown/simple', {
      params: { active_only: true },
    });
    return response.data;
  },

  /** GET /students/admission/my-admission (student role) */
  myAdmission: async (): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.get('/students/admission/my-admission');
    return response.data;
  },

  /** GET /students/admission/my-children-admissions (parent role) */
  myChildrenAdmissions: async (): Promise<StudentAdmissionResponse[]> => {
    const response = await apiClient.get('/students/admission/my-children-admissions');
    return response.data;
  },

  /** PATCH /students/admission/{student_id}/toggle-active */
  toggleActiveStatus: async (studentId: string): Promise<StudentAdmissionResponse> => {
    const response = await apiClient.patch(`/students/admission/${studentId}/toggle-active`);
    return response.data;
  },

  /** GET /students/admission/admission-types/dropdown */
  getAdmissionTypesDropdown: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get('/students/admission/admission-types/dropdown');
    return response.data;
  },

  /** GET /students/admission/next-admission-number?type=primary|non_primary */
  getNextAdmissionNumber: async (
    type: 'primary' | 'non_primary',
  ): Promise<{ next_number: string }> => {
    const response = await apiClient.get('/students/admission/next-admission-number', {
      params: { type },
    });
    return response.data;
  },
};

// ─── Student Attendance API ───────────────────────────────────────────────────

export const studentAttendanceApi = {
  /** GET /student/attendance/ */
  getAllAttendances: async (params?: {
    date?: string;
    class_id?: string;
    section_id?: string;
  }): Promise<StudentAttendanceOut[]> => {
    const response = await apiClient.get('/student/attendance/', { params });
    return response.data;
  },

  /** GET /student/attendance/search */
  searchAttendance: async (params: {
    start_date?: string;
    end_date?: string;
    student_name?: string;
  }): Promise<StudentAttendanceOut[]> => {
    const response = await apiClient.get('/student/attendance/search', { params });
    return response.data;
  },

  /** GET /student/attendance/by-date/{date} */
  getAttendanceByDate: async (date: string): Promise<StudentAttendanceOut[]> => {
    const response = await apiClient.get(`/student/attendance/by-date/${date}`);
    return response.data;
  },

  /** PATCH /student/attendance/by-date/{date} — bulk update */
  bulkUpdateAttendanceByDate: async (
    date: string,
    updates: Array<{ student_id: string; status: AttendanceStatus; remarks?: string }>,
  ): Promise<StudentAttendanceOut[]> => {
    const response = await apiClient.patch(`/student/attendance/by-date/${date}`, updates);
    return response.data;
  },

  /** GET /student/attendance/student/{student_id}/filter */
  getStudentAttendanceFilter: async (
    studentId: string,
    params: { start_date: string; end_date: string },
  ): Promise<StudentAttendanceOut[]> => {
    const response = await apiClient.get(
      `/student/attendance/student/${studentId}/filter`,
      { params },
    );
    return response.data;
  },

  /** GET /student/attendance/{id} */
  getAttendanceById: async (id: string): Promise<StudentAttendanceOut> => {
    const response = await apiClient.get(`/student/attendance/${id}`);
    return response.data;
  },

  /** POST /student/attendance/ */
  createAttendance: async (
    data: StudentAttendanceCreate,
  ): Promise<StudentAttendanceOut> => {
    const response = await apiClient.post('/student/attendance/', data);
    return response.data;
  },

  /** PATCH /student/attendance/{id} */
  updateAttendance: async (
    id: string,
    data: StudentAttendanceUpdate,
  ): Promise<StudentAttendanceOut> => {
    const response = await apiClient.patch(`/student/attendance/${id}`, data);
    return response.data;
  },

  /** DELETE /student/attendance/{id} */
  deleteAttendance: async (id: string): Promise<void> => {
    await apiClient.delete(`/student/attendance/${id}`);
  },
};

// ─── Certificates API ─────────────────────────────────────────────────────────

/** Build FormData for certificate upload endpoints */
function buildCertificateFormData(
  data: CertificateCreate | IssuedCertificateCreateRequest | ReceivedDocumentCreateRequest,
  file?: ReactNativeFile | File,
): FormData {
  const formData = new FormData();
  formData.append('student_id', data.student_id);
  formData.append('certificate_type_id', data.certificate_type_id);
  if ('issue_date' in data && data.issue_date) {
    formData.append('issue_date', data.issue_date);
  }
  if (data.remarks) {
    formData.append('remarks', data.remarks);
  }
  const fileToUpload = file ?? ('file' in data ? data.file : undefined);
  if (fileToUpload) {
    if ('uri' in fileToUpload) {
      // React Native file — appended as-is; axios handles it
      formData.append('file', fileToUpload as unknown as Blob);
    } else {
      formData.append('file', fileToUpload);
    }
  }
  return formData;
}

export const studentCertificatesApi = {
  /** GET /certificates/ — admin: all certificates */
  listCertificates: async (params?: {
    student_id?: string;
    certificate_type_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<CertificateRead[]> => {
    const response = await apiClient.get('/certificates/', { params });
    return response.data?.items ?? response.data ?? [];
  },

  /** GET /certificates/received — admin: received (uploaded) documents */
  listReceived: async (params?: {
    student_id?: string;
    certificate_type_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<CertificateRead[]> => {
    const response = await apiClient.get('/certificates/received', { params });
    return response.data;
  },

  /** GET /certificates/issued — admin: issued certificates */
  listIssued: async (params?: {
    student_id?: string;
    certificate_type_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<CertificateRead[]> => {
    const response = await apiClient.get('/certificates/issued', { params });
    return response.data;
  },

  /** GET /certificates/by-student/{student_id} */
  getCertificatesByStudent: async (
    studentId: string,
    params?: { skip?: number; limit?: number },
  ): Promise<CertificateRead[]> => {
    const response = await apiClient.get(`/certificates/by-student/${studentId}`, { params });
    return response.data;
  },

  /** GET /certificates/my — student: own certificates */
  myCertificates: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<CertificateRead[]> => {
    const response = await apiClient.get('/certificates/my', { params });
    return response.data;
  },

  /** GET /certificates/my-child/{student_id} — parent role */
  myChildCertificates: async (
    studentId: string,
    params?: { skip?: number; limit?: number },
  ): Promise<CertificateRead[]> => {
    const response = await apiClient.get(`/certificates/my-child/${studentId}`, { params });
    return response.data;
  },

  /** GET /certificates/selector/classes */
  getSelectorClasses: async (): Promise<CertificateSelectorClass[]> => {
    const response = await apiClient.get('/certificates/selector/classes');
    return response.data;
  },

  /** GET /certificates/selector/sections?class_id=... */
  getSelectorSections: async (classId: string): Promise<CertificateSelectorSection[]> => {
    const response = await apiClient.get('/certificates/selector/sections', {
      params: { class_id: classId },
    });
    return response.data;
  },

  /** GET /certificates/selector/students?class_id=...&section_id=... */
  getSelectorStudents: async (
    classId: string,
    sectionId?: string,
  ): Promise<CertificateSelectorStudent[]> => {
    const response = await apiClient.get('/certificates/selector/students', {
      params: { class_id: classId, section_id: sectionId },
    });
    return response.data;
  },

  /** GET /certificates/{id} */
  getCertificate: async (id: string): Promise<CertificateRead> => {
    const response = await apiClient.get(`/certificates/${id}`);
    return response.data;
  },

  /** GET /certificates/{id}/download — returns presigned S3 URL info */
  downloadCertificate: async (id: string): Promise<CertificateDownloadResponse> => {
    const response = await apiClient.get(`/certificates/${id}/download`);
    return response.data;
  },

  /** POST /certificates/ — general upload */
  createCertificate: async (data: CertificateCreate): Promise<CertificateRead> => {
    const formData = buildCertificateFormData(data);
    const response = await apiClient.post('/certificates/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** POST /certificates/received — admin uploads a received document */
  createReceived: async (data: ReceivedDocumentCreateRequest): Promise<CertificateRead> => {
    const formData = buildCertificateFormData(data);
    const response = await apiClient.post('/certificates/received', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** POST /certificates/issued — school issues a certificate */
  createIssued: async (data: IssuedCertificateCreateRequest): Promise<CertificateRead> => {
    const formData = buildCertificateFormData(data);
    const response = await apiClient.post('/certificates/issued', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** PATCH /certificates/{id} */
  updateCertificate: async (id: string, data: CertificateUpdate): Promise<CertificateRead> => {
    const formData = new FormData();
    if (data.certificate_type_id) formData.append('certificate_type_id', data.certificate_type_id);
    if (data.issue_date) formData.append('issue_date', data.issue_date);
    if (data.remarks) formData.append('remarks', data.remarks);
    if (data.file) {
      if ('uri' in data.file) {
        formData.append('file', data.file as unknown as Blob);
      } else {
        formData.append('file', data.file);
      }
    }
    const response = await apiClient.patch(`/certificates/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** DELETE /certificates/{id} */
  deleteCertificate: async (id: string): Promise<void> => {
    await apiClient.delete(`/certificates/${id}`);
  },
};

// ─── Certificate Types API ────────────────────────────────────────────────────

export const certificateTypesApi = {
  /** GET /certificates/types/ — paginated */
  listCertificateTypes: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<{ items: CertificateTypeRead[]; total_count: number; has_next: boolean }> => {
    const response = await apiClient.get('/certificates/types/', { params });
    return response.data;
  },

  /** GET /certificates/types/{id} */
  getCertificateType: async (id: string): Promise<CertificateTypeRead> => {
    const response = await apiClient.get(`/certificates/types/${id}`);
    return response.data;
  },

  /** GET /certificates/types/search?q=...&limit=... */
  searchCertificateTypes: async (
    q: string,
    limit?: number,
  ): Promise<CertificateTypeRead[]> => {
    const response = await apiClient.get('/certificates/types/search', {
      params: { q, limit },
    });
    return response.data;
  },

  /** GET /certificates/types/dropdown */
  getCertificateTypesDropdown: async (): Promise<CertificateTypeDropdown[]> => {
    const response = await apiClient.get('/certificates/types/dropdown');
    return response.data;
  },

  /** POST /certificates/types/ */
  createCertificateType: async (
    data: CertificateTypeCreate,
  ): Promise<CertificateTypeRead> => {
    const response = await apiClient.post('/certificates/types/', data);
    return response.data;
  },

  /** PUT /certificates/types/{id} */
  updateCertificateType: async (
    id: string,
    data: CertificateTypeUpdate,
  ): Promise<CertificateTypeRead> => {
    const response = await apiClient.put(`/certificates/types/${id}`, data);
    return response.data;
  },

  /** DELETE /certificates/types/{id} */
  deleteCertificateType: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/certificates/types/${id}`);
    return response.data;
  },
};

// ─── Documents API ────────────────────────────────────────────────────────────

export const studentDocumentsApi = {
  /** GET /students/documents/ */
  listDocuments: async (params?: {
    student_id?: string;
    document_type?: string;
    is_verified?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<DocumentOut[]> => {
    const response = await apiClient.get('/students/documents/', { params });
    return response.data;
  },

  /** GET /students/documents/{id} */
  getDocument: async (id: string): Promise<DocumentOut> => {
    const response = await apiClient.get(`/students/documents/${id}`);
    return response.data;
  },

  /** POST /students/documents/ — multipart upload */
  uploadDocument: async (data: DocumentCreate): Promise<DocumentOut> => {
    const formData = new FormData();
    formData.append('student_id', data.student_id);
    formData.append('document_type', data.document_type);

    if ('uri' in data.document_file) {
      // React Native file
      const rnFile = data.document_file as ReactNativeFile;
      const fetchRes = await fetch(rnFile.uri);
      const blob = await fetchRes.blob();
      formData.append('document_file', blob, rnFile.name);
    } else {
      formData.append('document_file', data.document_file as File);
    }

    const response = await apiClient.post('/students/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** PATCH /students/documents/{id} */
  updateDocument: async (id: string, data: DocumentUpdate): Promise<DocumentOut> => {
    const formData = new FormData();
    if (data.document_type) formData.append('document_type', data.document_type);
    if (data.document_file) {
      if ('uri' in data.document_file) {
        const rnFile = data.document_file as ReactNativeFile;
        formData.append('document_file', rnFile as unknown as Blob);
      } else {
        formData.append('document_file', data.document_file as File);
      }
    }
    const response = await apiClient.patch(`/students/documents/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /** GET /students/documents/{id}/download → Blob */
  downloadDocument: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/students/documents/${id}/download`, { responseType: 'blob' });
    return response.data;
  },

  /** POST /students/documents/{id}/verify */
  verifyDocument: async (id: string, data: { remarks?: string; is_verified: boolean }): Promise<DocumentOut> => {
    const response = await apiClient.post(`/students/documents/${id}/verify`, data);
    return response.data;
  },

  /** DELETE /students/documents/{id} */
  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/documents/${id}`);
  },
};

// ─── Document Types API ───────────────────────────────────────────────────────

export interface DocumentTypeRead {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface DocumentTypeCreate {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface DocumentTypeUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const documentTypesApi = {
  /** GET /students/document-types/ */
  list: async (params?: { skip?: number; limit?: number; is_active?: boolean }): Promise<DocumentTypeRead[]> => {
    const response = await apiClient.get('/students/document-types/', { params });
    return response.data.items || response.data;
  },

  /** POST /students/document-types/ */
  create: async (data: DocumentTypeCreate): Promise<DocumentTypeRead> => {
    const response = await apiClient.post('/students/document-types/', data);
    return response.data;
  },

  /** PUT /students/document-types/{id} */
  update: async (id: string, data: DocumentTypeUpdate): Promise<DocumentTypeRead> => {
    const response = await apiClient.put(`/students/document-types/${id}`, data);
    return response.data;
  },

  /** DELETE /students/document-types/{id} */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/document-types/${id}`);
  },
};

// ─── Student Transport API ────────────────────────────────────────────────────

export const studentTransportApi = {
  /** GET /students/student-transport/ */
  listStudentTransport: async (params?: {
    student_id?: string;
    route_id?: string;
    is_active?: boolean;
  }): Promise<StudentTransportOut[]> => {
    const response = await apiClient.get('/students/student-transport/', { params });
    return response.data;
  },

  /** GET /students/student-transport/{id} */
  getStudentTransport: async (id: string): Promise<StudentTransportOut> => {
    const response = await apiClient.get(`/students/student-transport/${id}`);
    return response.data;
  },

  /** GET /students/student-transport/student/{student_id} */
  getTransportByStudent: async (studentId: string): Promise<StudentTransportOut> => {
    const response = await apiClient.get(`/students/student-transport/student/${studentId}`);
    return response.data;
  },

  /** POST /students/student-transport/ */
  createStudentTransport: async (
    data: StudentTransportCreate,
  ): Promise<StudentTransportOut> => {
    const response = await apiClient.post('/students/student-transport/', data);
    return response.data;
  },

  /** PATCH /students/student-transport/{id} */
  updateStudentTransport: async (
    id: string,
    data: StudentTransportUpdate,
  ): Promise<StudentTransportOut> => {
    const response = await apiClient.patch(`/students/student-transport/${id}`, data);
    return response.data;
  },

  /** DELETE /students/student-transport/{id} */
  deleteStudentTransport: async (id: string): Promise<void> => {
    await apiClient.delete(`/students/student-transport/${id}`);
  },
};

// ─── Timetable API ────────────────────────────────────────────────────────────

export const timetableApi = {
  getTimetableBySection: async (sectionId: string): Promise<TimetableSlot[]> => {
    const response = await apiClient.get(`/students/timetable/section/${sectionId}`);
    return response.data.items ?? response.data;
  },

  bulkCreateTimetable: async (data: BulkTimetableCreate): Promise<unknown> => {
    const response = await apiClient.post('/students/timetable/bulk', data);
    return response.data;
  },

  bulkUpdateTimetableSlots: async (data: BulkTimetableUpdate): Promise<unknown> => {
    const response = await apiClient.patch('/students/timetable/slots/bulk', data);
    return response.data;
  },

  createFrontendTimetable: async (data: FrontendTimetableCreate): Promise<void> => {
    await apiClient.post('/students/timetable/frontend', data);
  },

  updateFrontendTimetable: async (
    sectionId: string,
    data: FrontendTimetableCreate,
  ): Promise<void> => {
    await apiClient.put(`/students/timetable/frontend/${sectionId}`, data);
  },

  getFrontendTimetable: async (sectionId: string): Promise<FrontendTimetableRead> => {
    const response = await apiClient.get(`/students/timetable/frontend/${sectionId}`);
    return response.data;
  },
};

// ─── Student Profile ──────────────────────────────────────────────────────────

/** GET /profile/student/me */
export interface StudentProfileOut {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  admission_number: string | null;
  aadhar_number: string | null;
  apaar_number: string | null;
  caste: string | null;
  sub_caste: string | null;
  community: string | null;
  nationality: string | null;
  mother_tongue: string | null;
  identification_marks: string | null;
}

export const studentProfileApi = {
  /** GET /profile/student/me — student's own profile */
  getMyProfile: async (): Promise<StudentProfileOut> => {
    const response = await apiClient.get('/profile/student/me');
    return response.data;
  },
};

// ─── Parent Students API ──────────────────────────────────────────────────────

export const parentStudentsApi = {
  /** GET /student-parent-links/parent/{parentEntityId}/students */
  getChildrenByParentEntityId: async (parentEntityId: string): Promise<ParentStudent[]> => {
    const response = await apiClient.get(`/student-parent-links/parent/${parentEntityId}/students`);
    return response.data ?? [];
  },

  /** GET /student-parent-links/my-children */
  getParentStudents: async (): Promise<ParentStudent[]> => {
    const response = await apiClient.get('/student-parent-links/my-children');
    const students: ParentStudent[] = response.data ?? [];
    return students.map((s) => ({
      id: s.id,
      name: `${s.first_name} ${s.last_name}`,
      first_name: s.first_name,
      last_name: s.last_name,
      admission_number: s.admission_number,
      class_id: s.class_id,
      class_name: s.class_name,
      section_id: s.section_id,
      section_name: s.section_name,
      academic_year: s.academic_year,
      academic_year_id: s.academic_year_id,
      is_active: s.is_active,
      date_of_birth: s.date_of_birth,
      gender: s.gender,
    }));
  },
};
