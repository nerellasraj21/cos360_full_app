import apiClient from './client';

// ─── Types: Enums ─────────────────────────────────────────────────────────────

export type ExamStatus = 'draft' | 'active' | 'locked' | 'published' | 'finalized';
export type ExamType = 'unit_test' | 'quarterly' | 'half_yearly' | 'annual' | 'other';
export type ExamNature = 'formative' | 'summative' | 'cumulative' | 'custom';
export type ExamBoard = 'CBSE' | 'ICSE' | 'State' | 'BTech' | 'Custom';
export type ExamLevel = 'pre_primary' | 'primary' | 'upper_primary' | 'secondary' | 'inter' | 'diploma' | 'btech' | 'mtech' | 'iit' | 'others';
export type EntryType = 'marks' | 'remarks';

// ─── Types: Class Section ─────────────────────────────────────────────────────

export interface ExamClassSection {
  id: string;
  exam_id: string;
  class_id: string;
  section_id?: string;
  class_name?: string;
  section_name?: string;
}

// ─── Types: Subject Config + Components ───────────────────────────────────────

export interface ExamSubjectComponent {
  id: string;
  subject_config_id: string;
  component_name: string;
  entry_type: EntryType;
  max_marks?: number;
  min_pass_marks?: number;
  include_in_total: boolean;
  sort_order?: number;
}

export interface ExamSubjectConfig {
  id: string;
  exam_id: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
  subject_name?: string;
  components: ExamSubjectComponent[];
}

// ─── Types: Core Exam ─────────────────────────────────────────────────────────

/** ExamListItem — returned by GET /exams */
export interface ExamListItem {
  id: string;
  exam_name: string;
  board: string;
  level: string;
  exam_type: string;
  nature: ExamNature;
  status: ExamStatus;
  academic_year_id: string;
  academic_year_title?: string;
  mark_entry_deadline?: string;
  subject_config_count?: number;
  created_at: string;
}

/** Exam (detail) — returned by GET /exams/{id} */
export interface Exam extends ExamListItem {
  hall_ticket_published: boolean;
  hall_ticket_published_at?: string;
  cloned_from_exam_id?: string;
  created_by: string;
  updated_at: string;
  class_sections?: ExamClassSection[];
  subject_configs?: ExamSubjectConfig[];
}

/** Legacy alias so existing screens referencing ExamListItem also work */
export type ExamListResponse = {
  items: ExamListItem[];
  total: number;
  page: number;
  size: number;
};

export interface ExamCreateRequest {
  exam_name: string;
  academic_year_id: string;
  board: string;
  level: ExamLevel;
  exam_type: string;
  nature?: ExamNature;
  mark_entry_deadline?: string;
  hall_ticket_min_attendance?: number;
  attendance_from_date?: string;
  attendance_to_date?: string;
  publish_rank?: boolean;
  term?: string;
}

export interface ExamUpdateRequest extends Partial<ExamCreateRequest> {}

// ─── Types: Mark Entry ────────────────────────────────────────────────────────

export interface MarkEntryItem {
  student_id: string;
  student_name?: string;
  admission_number?: string;
  subject_config_id: string;
  component_id: string;
  component_name?: string;
  marks_obtained: number | null;
  remark_grade?: string | null;
  is_absent: boolean;
}

/** Grid returned by GET /exams/{examId}/marks */
export interface MarksGrid {
  exam_id: string;
  students: MarkEntryItem[];
  total: number;
  page: number;
  page_size: number;
}

/** Request body for POST /exams/{examId}/marks */
export interface SaveMarksRequest {
  subject_config_id: string;
  marks: {
    student_id: string;
    component_id: string;
    marks_obtained: number | null;
    remark_grade?: string | null;
    is_absent: boolean;
  }[];
  attempt_number?: number;
}

export interface MarkUploadResponse {
  status: string;
  written: number;
  errors: string[];
  total_rows: number;
}

// ─── Types: Results ───────────────────────────────────────────────────────────

export interface SubjectResult {
  id: string;
  subject_config_id: string;
  subject_name?: string;
  marks_obtained: number | null;
  max_marks: number | null;
  percentage?: number | null;
  grade_label?: string;
  gpa?: number | null;
  remark_grade?: string | null;
  is_absent: boolean;
  is_passed: boolean | null;
}

export interface StudentExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
  total_marks_obtained: number | null;
  total_max_marks: number | null;
  percentage: number | null;
  grade_label?: string;
  gpa?: number | null;
  rank?: number;
  is_passed: boolean | null;
  computed_at?: string;
  subject_results: SubjectResult[];
}

export interface ResultsListResponse {
  exam_id: string;
  exam_title?: string;
  items: StudentExamResult[];
  total: number;
  page: number;
  size: number;
}

// ─── Types: Raw Marks View (student/parent) ───────────────────────────────────

export interface ComponentMarkView {
  component_name: string;
  marks_obtained: number | null;
  max_marks: number | null;
  is_absent: boolean;
  remark_grade?: string | null;
}

export interface MarksSubjectView {
  subject_config_id: string;
  subject_name?: string;
  components: ComponentMarkView[];
}

export interface StudentMarksView {
  exam_id: string;
  student_id: string;
  student_name?: string;
  subjects: MarksSubjectView[];
}

// ─── Types: Hall Tickets ──────────────────────────────────────────────────────

export interface HallTicketEligibility {
  id: string;
  exam_id: string;
  student_id: string;
  class_id: string;
  section_id?: string;
  student_name?: string;
  admission_number?: string;
  attendance_percent?: number;
  attendance_ok: boolean;
  fee_paid: boolean;
  attendance_override: boolean;
  fee_override: boolean;
  ineligibility_reason?: string;
  is_eligible: boolean;
  hall_ticket_number?: string;
}

export interface HallTicketsListResponse {
  exam_id: string;
  items: HallTicketEligibility[];
  total: number;
}

// ─── Types: Exam Dates ────────────────────────────────────────────────────────

export interface ExamDate {
  id: string;
  exam_id: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
  subject_name?: string;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
}

export interface ExamDateCreateRequest {
  class_id: string;
  section_id?: string;
  subject_id: string;
  exam_date: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
}

// ─── Types: Audit ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  exam_id: string;
  action: string;
  performed_by: string;
  student_id?: string;
  reason?: string;
  old_value?: unknown;
  new_value?: unknown;
  performed_at: string;
}

// ─── Types: Board Patterns ────────────────────────────────────────────────────

export interface BoardPattern {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardPatternCreate {
  name: string;
  description?: string;
}

export interface BoardPatternUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// ─── Types: Exam Templates ────────────────────────────────────────────────────

export interface TemplateItem {
  subject_id: string;
  subject_name?: string;
  max_marks: number;
  pass_marks: number;
  grade_scheme_id?: string;
}

export interface ExamTemplate {
  id: string;
  name: string;
  description?: string;
  board?: string;
  level?: string;
  is_active: boolean;
  items: TemplateItem[];
  created_by: string;
  created_at: string;
}

export interface ExamTemplateListItem {
  id: string;
  name: string;
  description?: string;
  board?: string;
  level?: string;
  is_active: boolean;
  item_count?: number;
}

export interface TemplateCreate {
  name: string;
  description?: string;
  board?: string;
  level?: string;
  items: TemplateItem[];
}

export interface CopyPatternRequest {
  source_class_id: string;
  source_section_id?: string;
  target_class_id: string;
  target_section_id?: string;
}

export interface ApplyTemplateRequest {
  template_id: string;
  class_id: string;
  section_id?: string;
}

// ─── Types: Create Exam Full (wizard) ────────────────────────────────────────

export interface ClassSectionPayload {
  class_id: string;
  section_id: string | null;
}

export interface ComponentPayload {
  component_name: string;
  entry_type: EntryType;
  max_marks: number | null;
  min_pass_marks?: number | null;
  include_in_total: boolean;
  sort_order?: number;
}

export interface SubjectConfigPayload {
  class_id: string;
  section_id: string | null;
  subject_id: string;
  subject_grade_scheme_id?: string | null;
  credit_hours?: number | null;
  components: ComponentPayload[];
}

export interface ExamDatePayload {
  class_id: string;
  section_id: string | null;
  subject_id: string;
  exam_date: string;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
}

export interface ExamCreateFull {
  exam: ExamCreateRequest & {
    is_internal?: boolean;
    hall_ticket_min_attendance?: number | null;
    exam_grade_scheme_id?: string | null;
  };
  class_sections: ClassSectionPayload[];
  subject_configs: SubjectConfigPayload[];
  exam_dates: ExamDatePayload[];
}

export interface ExamCreateFullResponse {
  id: string;
  exam_name: string;
  status: ExamStatus;
  created_at: string;
  class_section_count: number;
  subject_config_count: number;
  exam_date_count: number;
}

// ─── Types: Exam Settings ─────────────────────────────────────────────────────

export interface ExamSettings {
  id?: string;
  default_board?: string;
  custom_board_name?: string;
  hall_ticket_min_attendance?: number;
  grace_max_per_subject?: number;
  grace_max_subjects?: number;
  grace_auto_apply?: boolean;
  reconduct_max_failed_subjects?: number;
  updated_at?: string;
}

export interface ExamSettingsUpdate extends Partial<ExamSettings> {}

// ─── Types: Grade Schemes ─────────────────────────────────────────────────────

export interface GradeBand {
  from_percent: number;
  to_percent: number;
  from_marks?: number;
  to_marks?: number;
  grade_label: string;
  gpa?: number;
  remarks?: string;
  is_pass: boolean;
  sort_order?: number;
}

export interface ExamGradeScheme {
  id: string;
  name: string;
  description?: string;
  bands: GradeBand[];
  is_default: boolean;
  created_at: string;
}

export interface ExamGradeSchemeCreate {
  name: string;
  description?: string;
  bands: GradeBand[];
  is_default?: boolean;
}

export interface ExamGradeSchemeUpdate extends Partial<ExamGradeSchemeCreate> {}

export type SubjectGradeScheme = ExamGradeScheme;
export type SubjectGradeSchemeCreate = ExamGradeSchemeCreate;
export type SubjectGradeSchemeUpdate = ExamGradeSchemeUpdate;

// ─── Types: Mark Permissions ──────────────────────────────────────────────────

export interface MarkPermission {
  id: string;
  exam_id: string;
  teacher_id: string;
  subject_config_id: string;
  class_id: string;
  section_id?: string;
  is_active: boolean;
  granted_by: string;
  created_at: string;
}

export interface MarkPermissionCreate {
  user_id: string;
  scope_note?: string;
  teacher_id?: string;
  subject_config_id?: string;
  class_id?: string;
  section_id?: string;
}

export interface MarkPermissionUpdate {
  is_active?: boolean;
}

// ─── Types: Notifications ─────────────────────────────────────────────────────

export interface NotificationRequest {
  notification_type: string;
  message: string;
  target_audience: 'students' | 'parents' | 'both';
  send_push?: boolean;
  send_sms?: boolean;
  send_email?: boolean;
}

export interface NotificationResponse {
  exam_id: string;
  notifications_queued: number;
  notification_type: string;
}

// ─── Types: Remark Grades ─────────────────────────────────────────────────────

export interface RemarkGradeItem {
  min_marks?: number;
  max_marks?: number;
  remark: string;
  description?: string;
}

export interface RemarkGradeSet {
  id: string;
  name: string;
  description?: string;
  items: RemarkGradeItem[];
  is_active: boolean;
  created_at: string;
}

export interface RemarkGradeSetCreate {
  name: string;
  description?: string;
  items: RemarkGradeItem[];
}

export interface RemarkGradeSetUpdate extends Partial<RemarkGradeSetCreate> {
  is_active?: boolean;
}

// ─── API: Exams CRUD ──────────────────────────────────────────────────────────

export const examsApi = {
  list: (params?: { academic_year_id?: string; exam_status?: ExamStatus; nature?: ExamNature; page?: number; size?: number }) =>
    apiClient.get<ExamListItem[]>('/exams', { params }).then(r => r.data),

  create: (data: ExamCreateRequest) =>
    apiClient.post<Exam>('/exams', data).then(r => r.data),

  createFull: (data: ExamCreateFull) =>
    apiClient.post<ExamCreateFullResponse>('/exams', data).then(r => r.data),

  getById: (examId: string) =>
    apiClient.get<Exam>(`/exams/${examId}`).then(r => r.data),

  update: (examId: string, data: ExamUpdateRequest) =>
    apiClient.put<Exam>(`/exams/${examId}`, data).then(r => r.data),

  delete: (examId: string) =>
    apiClient.delete(`/exams/${examId}`).then(r => r.data),

  clone: (examId: string, data?: { new_name?: string; academic_year_id?: string }) =>
    apiClient.post<Exam>(`/exams/${examId}/clone`, data).then(r => r.data),

  unlock: (examId: string, reason?: string) =>
    apiClient.post<Exam>(`/exams/${examId}/unlock`, { reason }).then(r => r.data),

  // Class sections
  getClassSections: (examId: string) =>
    apiClient.get<ExamClassSection[]>(`/exams/${examId}/class-sections`).then(r => r.data),

  addClassSection: (examId: string, data: { class_id: string; section_id?: string }) =>
    apiClient.post<ExamClassSection>(`/exams/${examId}/class-sections`, data).then(r => r.data),

  // Subject configs
  getSubjectConfigs: (examId: string) =>
    apiClient.get<ExamSubjectConfig[]>(`/exams/${examId}/subject-configs`).then(r => r.data),

  getSubjectConfig: (examId: string, configId: string) =>
    apiClient.get<ExamSubjectConfig>(`/exams/${examId}/subject-configs/${configId}`).then(r => r.data),

  updateSubjectConfig: (examId: string, configId: string, data: Partial<ExamSubjectConfig>) =>
    apiClient.put<ExamSubjectConfig>(`/exams/${examId}/subject-configs/${configId}`, data).then(r => r.data),
};

// ─── API: Mark Entry ──────────────────────────────────────────────────────────

export const examMarksApi = {
  getMarksGrid: (examId: string, params?: { class_id?: string; section_id?: string; subject_config_id?: string; page?: number; page_size?: number }) =>
    apiClient.get<MarksGrid>(`/exams/${examId}/marks`, { params }).then(r => r.data),

  saveMarks: (examId: string, data: SaveMarksRequest) =>
    apiClient.post(`/exams/${examId}/marks`, data).then(r => r.data),

  downloadTemplateUrl: (examId: string, classId: string, sectionId: string, subjectConfigId: string) =>
    `/exams/${examId}/marks/template?class_id=${classId}&section_id=${sectionId}&subject_config_id=${subjectConfigId}`,

  uploadMarks: (examId: string, params: { class_id: string; section_id: string; subject_config_id: string }, file: Blob) => {
    const form = new FormData();
    form.append('file', file as unknown as string);
    return apiClient.post<MarkUploadResponse>(
      `/exams/${examId}/marks/upload`,
      form,
      { params, headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data);
  },
};

// ─── API: Results ─────────────────────────────────────────────────────────────

export const examResultsApi = {
  compute: (examId: string, force?: boolean) =>
    apiClient.post(`/exams/${examId}/compute`, null, { params: { force } }).then(r => r.data),

  publish: (examId: string) =>
    apiClient.post(`/exams/${examId}/publish`).then(r => r.data),

  list: (examId: string, params?: { class_id?: string; section_id?: string; student_id?: string; page?: number; size?: number }) =>
    apiClient.get<StudentExamResult[]>(`/exams/${examId}/results`, { params }).then(r => r.data),

  getStudentResult: (examId: string, studentId: string) =>
    apiClient.get<StudentExamResult>(`/exams/${examId}/results/${studentId}`).then(r => r.data),

  /** Student: computed result (only after exam is published/finalized) */
  getMyResult: (examId: string) =>
    apiClient.get<StudentExamResult>(`/exams/${examId}/my-result`).then(r => r.data),

  /** Parent: child's computed result (only after exam is published/finalized) */
  getChildResult: (examId: string, studentId: string) =>
    apiClient.get<StudentExamResult>(`/exams/${examId}/child-result/${studentId}`).then(r => r.data),

  /** Student: raw marks (visible as soon as teacher enters marks) */
  getMyRawMarks: (examId: string) =>
    apiClient.get<StudentMarksView>(`/exams/${examId}/my-marks`).then(r => r.data),

  /** Parent: child's raw marks (visible as soon as teacher enters marks) */
  getChildRawMarks: (examId: string, studentId: string) =>
    apiClient.get<StudentMarksView>(`/exams/${examId}/child-marks/${studentId}`).then(r => r.data),

  /** Alias for getMyRawMarks — used in my-marks screen */
  getMyMarks: (examId: string) =>
    apiClient.get<any>(`/exams/${examId}/my-marks`).then(r => r.data),

  /** Alias for getChildRawMarks — used in my-marks screen */
  getChildMarks: (examId: string, studentId: string) =>
    apiClient.get<any>(`/exams/${examId}/child-marks/${studentId}`).then(r => r.data),
};

// ─── API: Hall Tickets ────────────────────────────────────────────────────────

export const examHallTicketsApi = {
  getEnrolledStudents: (examId: string) =>
    apiClient.get<HallTicketsListResponse>(`/exams/${examId}/hall-tickets/enrolled-students`).then(r => r.data),

  computeEligibility: (examId: string) =>
    apiClient.post(`/exams/${examId}/hall-tickets/compute`).then(r => r.data),

  getEligible: (examId: string) =>
    apiClient.get<HallTicketEligibility[]>(`/exams/${examId}/hall-tickets/eligible`).then(r => r.data),

  getIneligible: (examId: string) =>
    apiClient.get<HallTicketEligibility[]>(`/exams/${examId}/hall-tickets/ineligible`).then(r => r.data),

  overrideEligibility: (examId: string, studentId: string, data: { attendance_override?: boolean; fee_override?: boolean }) =>
    apiClient.put(`/exams/${examId}/hall-tickets/${studentId}/override`, data).then(r => r.data),

  publish: (examId: string) =>
    apiClient.post(`/exams/${examId}/hall-tickets/publish`).then(r => r.data),

  downloadUrl: (examId: string, studentId: string) =>
    `/exams/${examId}/hall-tickets/download?student_id=${studentId}`,

  downloadAllUrl: (examId: string) =>
    `/exams/${examId}/hall-tickets/download-all`,

  downloadPdf: (examId: string, studentId: string) =>
    apiClient.get(`/exams/${examId}/hall-tickets/download`, {
      params: { student_id: studentId },
      responseType: 'blob',
    }).then(r => r.data),

  downloadAllZip: (examId: string) =>
    apiClient.get(`/exams/${examId}/hall-tickets/download-all`, {
      responseType: 'blob',
    }).then(r => r.data),
};

// ─── API: Exam Dates ──────────────────────────────────────────────────────────

export const examDatesApi = {
  list: (examId: string, params?: { class_id?: string; section_id?: string }) =>
    apiClient.get<ExamDate[]>(`/exams/${examId}/dates`, { params }).then(r => r.data),

  create: (examId: string, data: ExamDateCreateRequest) =>
    apiClient.post<ExamDate>(`/exams/${examId}/dates`, data).then(r => r.data),

  bulkCreate: (examId: string, data: ExamDateCreateRequest[]) =>
    apiClient.post<ExamDate[]>(`/exams/${examId}/dates/bulk`, { dates: data }).then(r => r.data),

  update: (examId: string, dateId: string, data: Partial<ExamDateCreateRequest>) =>
    apiClient.put<ExamDate>(`/exams/${examId}/dates/${dateId}`, data).then(r => r.data),

  delete: (examId: string, dateId: string) =>
    apiClient.delete(`/exams/${examId}/dates/${dateId}`).then(r => r.data),
};

// ─── API: Audit ───────────────────────────────────────────────────────────────

export const examAuditApi = {
  getLog: (examId: string, params?: { page?: number; page_size?: number }) =>
    apiClient.get<AuditLog[]>(`/exams/${examId}/audit`, { params }).then(r => r.data),
};

// ─── API: Board Patterns ──────────────────────────────────────────────────────

export const boardPatternsApi = {
  list: () =>
    apiClient.get<BoardPattern[]>('/board-patterns').then(r => r.data),

  create: (data: BoardPatternCreate) =>
    apiClient.post<BoardPattern>('/board-patterns', data).then(r => r.data),

  getById: (patternId: string) =>
    apiClient.get<BoardPattern>(`/board-patterns/${patternId}`).then(r => r.data),

  update: (patternId: string, data: BoardPatternUpdate) =>
    apiClient.put<BoardPattern>(`/board-patterns/${patternId}`, data).then(r => r.data),

  delete: (patternId: string) =>
    apiClient.delete(`/board-patterns/${patternId}`).then(r => r.data),
};

// ─── API: Exam Patterns (Templates) ──────────────────────────────────────────

export const examPatternsApi = {
  listTemplates: (params?: { board?: string; level?: string }) =>
    apiClient.get<ExamTemplateListItem[]>('/exam-patterns/templates', { params }).then(r => r.data),

  createTemplate: (data: TemplateCreate) =>
    apiClient.post<ExamTemplate>('/exam-patterns/templates', data).then(r => r.data),

  getTemplate: (templateId: string) =>
    apiClient.get<ExamTemplate>(`/exam-patterns/templates/${templateId}`).then(r => r.data),

  updateTemplate: (templateId: string, data: Partial<TemplateCreate>) =>
    apiClient.put<ExamTemplate>(`/exam-patterns/templates/${templateId}`, data).then(r => r.data),

  deleteTemplate: (templateId: string) =>
    apiClient.delete(`/exam-patterns/templates/${templateId}`).then(r => r.data),

  saveFromExam: (examId: string, data: { name: string; description?: string }) =>
    apiClient.post<ExamTemplate>('/exam-patterns/templates/from-exam', { exam_id: examId, ...data }).then(r => r.data),

  copyPattern: (examId: string, data: CopyPatternRequest) =>
    apiClient.post(`/exam-patterns/${examId}/copy`, data).then(r => r.data),

  applyTemplate: (examId: string, data: ApplyTemplateRequest) =>
    apiClient.post(`/exam-patterns/${examId}/apply-template`, data).then(r => r.data),
};

// ─── API: Exam Settings ───────────────────────────────────────────────────────

export const examSettingsApi = {
  get: () =>
    apiClient.get<ExamSettings>('/exam-settings').then(r => r.data),

  update: (data: ExamSettingsUpdate) =>
    apiClient.put<ExamSettings>('/exam-settings', data).then(r => r.data),
};

// ─── API: Grade Schemes ───────────────────────────────────────────────────────

export const gradeSchemeApi = {
  listExamSchemes: () =>
    apiClient.get<ExamGradeScheme[]>('/grade-schemes/exam').then(r => r.data),

  createExamScheme: (data: ExamGradeSchemeCreate) =>
    apiClient.post<ExamGradeScheme>('/grade-schemes/exam', data).then(r => r.data),

  getExamScheme: (schemeId: string) =>
    apiClient.get<ExamGradeScheme>(`/grade-schemes/exam/${schemeId}`).then(r => r.data),

  updateExamScheme: (schemeId: string, data: ExamGradeSchemeUpdate) =>
    apiClient.put<ExamGradeScheme>(`/grade-schemes/exam/${schemeId}`, data).then(r => r.data),

  deleteExamScheme: (schemeId: string) =>
    apiClient.delete(`/grade-schemes/exam/${schemeId}`).then(r => r.data),

  listSubjectSchemes: () =>
    apiClient.get<SubjectGradeScheme[]>('/grade-schemes/subject').then(r => r.data),

  createSubjectScheme: (data: SubjectGradeSchemeCreate) =>
    apiClient.post<SubjectGradeScheme>('/grade-schemes/subject', data).then(r => r.data),

  getSubjectScheme: (schemeId: string) =>
    apiClient.get<SubjectGradeScheme>(`/grade-schemes/subject/${schemeId}`).then(r => r.data),

  updateSubjectScheme: (schemeId: string, data: SubjectGradeSchemeUpdate) =>
    apiClient.put<SubjectGradeScheme>(`/grade-schemes/subject/${schemeId}`, data).then(r => r.data),

  deleteSubjectScheme: (schemeId: string) =>
    apiClient.delete(`/grade-schemes/subject/${schemeId}`).then(r => r.data),
};

// ─── API: Mark Permissions ────────────────────────────────────────────────────

export const markPermissionsApi = {
  list: (examId: string) =>
    apiClient.get<MarkPermission[]>(`/exams/${examId}/mark-permissions`).then(r => r.data),

  grant: (examId: string, data: MarkPermissionCreate) =>
    apiClient.post<MarkPermission>(`/exams/${examId}/mark-permissions`, data).then(r => r.data),

  update: (examId: string, permissionId: string, data: MarkPermissionUpdate) =>
    apiClient.put<MarkPermission>(`/exams/${examId}/mark-permissions/${permissionId}`, data).then(r => r.data),

  revoke: (examId: string, permissionId: string) =>
    apiClient.delete(`/exams/${examId}/mark-permissions/${permissionId}`).then(r => r.data),
};

// ─── API: Notifications ───────────────────────────────────────────────────────

export const examNotificationsApi = {
  send: (examId: string, data: NotificationRequest) =>
    apiClient.post<NotificationResponse>(`/exams/${examId}/notify`, data).then(r => r.data),
};

// ─── API: Remark Grades ───────────────────────────────────────────────────────

export const remarkGradesApi = {
  list: () =>
    apiClient.get<RemarkGradeSet[]>('/remark-grades').then(r => r.data),

  create: (data: RemarkGradeSetCreate) =>
    apiClient.post<RemarkGradeSet>('/remark-grades', data).then(r => r.data),

  getById: (setId: string) =>
    apiClient.get<RemarkGradeSet>(`/remark-grades/${setId}`).then(r => r.data),

  update: (setId: string, data: RemarkGradeSetUpdate) =>
    apiClient.put<RemarkGradeSet>(`/remark-grades/${setId}`, data).then(r => r.data),

  delete: (setId: string) =>
    apiClient.delete(`/remark-grades/${setId}`).then(r => r.data),
};
