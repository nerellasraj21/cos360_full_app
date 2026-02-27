import CAxios from '@/api/index'
import type {
  ExamSettings,
  BoardExamPattern,
  BoardPatternCreate,
  ExamGradeScheme,
  SubjectGradeScheme,
  GradeSchemeCreate,
  RemarkGradeSet,
  RemarkGradeOptionCreate,
  ExamCreateFull,
  ExamCreateFullResponse,
  ExamListItem,
  Exam,
  ExamDetailsPayload,
  ExamDate,
  ExamDatePayload,
  MarkEntryCreate,
  MarkEntryItem,
  StudentMark,
  MarkPermission,
  HallTicketEligibility,
  StudentExamResult,
  ExamStatus,
  ExamNature,
} from '@/types/exam'

// ---------------------------------------------------------------------------
// Exam Settings
// Backend: GET/PUT /exam-settings
// ---------------------------------------------------------------------------
export const getExamSettings = async (): Promise<ExamSettings> => {
  const response = await CAxios.get('/exam-settings')
  return response.data
}

export const updateExamSettings = async (data: Partial<ExamSettings>): Promise<ExamSettings> => {
  const response = await CAxios.put('/exam-settings', data)
  return response.data
}

// ---------------------------------------------------------------------------
// Board Patterns
// Backend: /board-patterns
// ---------------------------------------------------------------------------
export const createBoardPattern = async (data: BoardPatternCreate): Promise<BoardExamPattern> => {
  const response = await CAxios.post('/board-patterns', data)
  return response.data
}

export const listBoardPatterns = async (params?: { board?: string; level?: string }): Promise<BoardExamPattern[]> => {
  const response = await CAxios.get('/board-patterns', { params })
  return response.data
}

export const getBoardPattern = async (id: string): Promise<BoardExamPattern> => {
  const response = await CAxios.get(`/board-patterns/${id}`)
  return response.data
}

export const updateBoardPattern = async (id: string, data: Partial<BoardPatternCreate>): Promise<BoardExamPattern> => {
  const response = await CAxios.put(`/board-patterns/${id}`, data)
  return response.data
}

export const deleteBoardPattern = async (id: string): Promise<void> => {
  await CAxios.delete(`/board-patterns/${id}`)
}

// ---------------------------------------------------------------------------
// Exam Grade Schemes
// Backend: /grade-schemes/exam  (NOT /exam/grading/exam-schemes/)
// Note: Grade bands are embedded in GradeSchemeCreate.bands — no separate band endpoints
// ---------------------------------------------------------------------------
export const createExamGradeScheme = async (data: GradeSchemeCreate): Promise<ExamGradeScheme> => {
  const response = await CAxios.post('/grade-schemes/exam', data)
  return response.data
}

export const listExamGradeSchemes = async (): Promise<ExamGradeScheme[]> => {
  const response = await CAxios.get('/grade-schemes/exam')
  return response.data
}

export const getExamGradeScheme = async (id: string): Promise<ExamGradeScheme> => {
  const response = await CAxios.get(`/grade-schemes/exam/${id}`)
  return response.data
}

export const updateExamGradeScheme = async (id: string, data: Partial<GradeSchemeCreate>): Promise<ExamGradeScheme> => {
  const response = await CAxios.put(`/grade-schemes/exam/${id}`, data)
  return response.data
}

export const deleteExamGradeScheme = async (id: string): Promise<void> => {
  await CAxios.delete(`/grade-schemes/exam/${id}`)
}

// ---------------------------------------------------------------------------
// Subject Grade Schemes
// Backend: /grade-schemes/subject
// ---------------------------------------------------------------------------
export const createSubjectGradeScheme = async (data: GradeSchemeCreate): Promise<SubjectGradeScheme> => {
  const response = await CAxios.post('/grade-schemes/subject', data)
  return response.data
}

export const listSubjectGradeSchemes = async (): Promise<SubjectGradeScheme[]> => {
  const response = await CAxios.get('/grade-schemes/subject')
  return response.data
}

export const getSubjectGradeScheme = async (id: string): Promise<SubjectGradeScheme> => {
  const response = await CAxios.get(`/grade-schemes/subject/${id}`)
  return response.data
}

export const updateSubjectGradeScheme = async (id: string, data: Partial<GradeSchemeCreate>): Promise<SubjectGradeScheme> => {
  const response = await CAxios.put(`/grade-schemes/subject/${id}`, data)
  return response.data
}

export const deleteSubjectGradeScheme = async (id: string): Promise<void> => {
  await CAxios.delete(`/grade-schemes/subject/${id}`)
}

// ---------------------------------------------------------------------------
// Remark Grade Sets
// Backend: /remark-grades  (NOT /remark-grade-sets)
// ---------------------------------------------------------------------------
export const createRemarkGradeSet = async (data: { name: string; options: RemarkGradeOptionCreate[] }): Promise<RemarkGradeSet> => {
  const response = await CAxios.post('/remark-grades', data)
  return response.data
}

export const listRemarkGradeSets = async (): Promise<RemarkGradeSet[]> => {
  const response = await CAxios.get('/remark-grades')
  return response.data
}

export const getRemarkGradeSet = async (id: string): Promise<RemarkGradeSet> => {
  const response = await CAxios.get(`/remark-grades/${id}`)
  return response.data
}

export const updateRemarkGradeSet = async (
  id: string,
  data: { name: string; options?: RemarkGradeOptionCreate[] },
): Promise<RemarkGradeSet> => {
  const response = await CAxios.put(`/remark-grades/${id}`, data)
  return response.data
}

export const deleteRemarkGradeSet = async (id: string): Promise<void> => {
  await CAxios.delete(`/remark-grades/${id}`)
}

// ---------------------------------------------------------------------------
// Exam Class Sections & Subject Configs
// Backend: /exams/{exam_id}/class-sections  and  /exams/{exam_id}/subject-configs
// ---------------------------------------------------------------------------
export const getExamClassSections = async (examId: string) => {
  const response = await CAxios.get(`/exams/${examId}/class-sections`)
  return response.data as import('@/types/exam').ExamClassSection[]
}

export const getExamSubjectConfigs = async (examId: string) => {
  const response = await CAxios.get(`/exams/${examId}/subject-configs`)
  return response.data as import('@/types/exam').ExamSubjectConfig[]
}

// ---------------------------------------------------------------------------
// Exams — Core CRUD
// Backend: /exams  (NOT /exam/exams)
// ---------------------------------------------------------------------------
export const createExamFull = async (data: ExamCreateFull): Promise<ExamCreateFullResponse> => {
  // Backend: POST /exams  (not /exam/exams/create-full/)
  const response = await CAxios.post('/exams', data)
  return response.data
}

export const listExams = async (params?: { academic_year_id?: string; status?: ExamStatus; nature?: ExamNature }): Promise<ExamListItem[]> => {
  // Backend query param is exam_status (not status)
  const { status, ...rest } = params ?? {}
  const queryParams = { ...rest, ...(status ? { exam_status: status } : {}) }
  const response = await CAxios.get('/exams', { params: queryParams })
  return response.data
}

export const getExam = async (id: string): Promise<Exam> => {
  const response = await CAxios.get(`/exams/${id}`)
  return response.data
}

export const updateExam = async (id: string, data: Partial<ExamDetailsPayload>): Promise<Exam> => {
  const response = await CAxios.put(`/exams/${id}`, data)
  return response.data
}

export const deleteExam = async (id: string): Promise<void> => {
  await CAxios.delete(`/exams/${id}`)
}

export const cloneExam = async (id: string, data?: { new_name?: string; academic_year_id?: string }): Promise<ExamCreateFullResponse> => {
  const response = await CAxios.post(`/exams/${id}/clone`, data ?? {})
  return response.data
}

// ---------------------------------------------------------------------------
// Exam action endpoints (not yet on backend — will 404 until implemented)
// ---------------------------------------------------------------------------
export const computeAggregate = async (examId: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/compute`, null, { params: { force: true } })
}

export const publishResults = async (examId: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/publish`)
}

export const unlockExam = async (examId: string, reason: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/unlock`, { reason })
}

// ---------------------------------------------------------------------------
// Exam Dates
// Backend: /exams/{exam_id}/dates  (exam_id IN PATH, not query param)
// ---------------------------------------------------------------------------
export const createExamDate = async (examId: string, data: Omit<ExamDatePayload, 'exam_id'>): Promise<ExamDate> => {
  const response = await CAxios.post(`/exams/${examId}/dates`, data)
  return response.data
}

export const bulkCreateExamDates = async (examId: string, dates: Omit<ExamDatePayload, 'exam_id'>[]): Promise<ExamDate[]> => {
  const response = await CAxios.post(`/exams/${examId}/dates/bulk`, { dates })
  return response.data
}

export const getExamDates = async (examId: string, params?: { class_id?: string; section_id?: string }): Promise<ExamDate[]> => {
  const response = await CAxios.get(`/exams/${examId}/dates`, { params })
  return response.data
}

export const updateExamDate = async (examId: string, dateId: string, data: Partial<Omit<ExamDatePayload, 'exam_id'>>): Promise<ExamDate> => {
  const response = await CAxios.put(`/exams/${examId}/dates/${dateId}`, data)
  return response.data
}

export const deleteExamDate = async (examId: string, dateId: string): Promise<void> => {
  await CAxios.delete(`/exams/${examId}/dates/${dateId}`)
}

// ---------------------------------------------------------------------------
// Mark Entry
// Backend: /exams/{exam_id}/marks  (exam_id IN PATH)
// ---------------------------------------------------------------------------
export const getMarks = async (params: {
  exam_id: string
  class_id: string
  section_id: string
  subject_config_id: string
  page?: number
  page_size?: number
}): Promise<MarkEntryItem[]> => {
  const { exam_id, ...rest } = params
  const response = await CAxios.get(`/exams/${exam_id}/marks`, { params: rest })
  return response.data
}

export const upsertMarks = async (examId: string, data: Omit<MarkEntryCreate, 'exam_id'>): Promise<unknown> => {
  const { subject_config_id, student_id, component_id, marks_obtained, is_absent, remark_grade } = data
  const response = await CAxios.post(`/exams/${examId}/marks`, {
    exam_id: examId,
    subject_config_id,
    marks: [{
      student_id,
      component_id,
      marks_obtained: marks_obtained ?? null,
      is_absent: is_absent ?? false,
      remark_grade: remark_grade ?? null,
    }],
    attempt_number: 1,
  })
  return response.data
}

export const batchSaveMarks = async (
  examId: string,
  subjectConfigId: string,
  marks: Array<{
    student_id: string
    component_id: string
    marks_obtained: number | null
    is_absent: boolean
    remark_grade?: string | null
  }>,
): Promise<unknown> => {
  const response = await CAxios.post(`/exams/${examId}/marks`, {
    exam_id: examId,
    subject_config_id: subjectConfigId,
    marks,
    attempt_number: 1,
  })
  return response.data
}

export const getMarkTemplate = async (params: {
  exam_id: string
  class_id: string
  section_id: string
  subject_config_id: string
}): Promise<Blob> => {
  const { exam_id, ...rest } = params
  const response = await CAxios.get(`/exams/${exam_id}/marks/template`, {
    params: rest,
    responseType: 'blob',
  })
  return response.data
}

export const uploadMarks = async (examId: string, formData: FormData): Promise<unknown> => {
  const response = await CAxios.post(`/exams/${examId}/marks/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

// ---------------------------------------------------------------------------
// Mark Entry Permissions
// Backend: /exams/{exam_id}/mark-permissions  (NOT /exam/exams/{id}/permissions)
// ---------------------------------------------------------------------------
export const listMarkPermissions = async (examId: string): Promise<MarkPermission[]> => {
  const response = await CAxios.get(`/exams/${examId}/mark-permissions`)
  return response.data
}

export const grantMarkPermission = async (examId: string, userId: string): Promise<MarkPermission> => {
  const response = await CAxios.post(`/exams/${examId}/mark-permissions`, { user_id: userId })
  return response.data
}

export const revokeMarkPermission = async (examId: string, permId: string): Promise<void> => {
  await CAxios.delete(`/exams/${examId}/mark-permissions/${permId}`)
}

// ---------------------------------------------------------------------------
// Hall Tickets (not yet on backend — will 404 until backend adds these)
// ---------------------------------------------------------------------------
export const computeHallTicketEligibility = async (examId: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/hall-tickets/generate`)
}

export const publishHallTickets = async (examId: string): Promise<void> => {
  await CAxios.post(`/exams/${examId}/hall-tickets/publish`)
}

export const getEligibleStudents = async (examId: string): Promise<HallTicketEligibility[]> => {
  const response = await CAxios.get(`/exams/${examId}/hall-tickets/eligible`)
  return response.data
}

export const getIneligibleStudents = async (examId: string): Promise<HallTicketEligibility[]> => {
  const response = await CAxios.get(`/exams/${examId}/hall-tickets/ineligible`)
  return response.data
}

export const overrideHallTicketEligibility = async (examId: string, studentId: string, overrides: {
  attendance_override?: boolean
  fee_override?: boolean
}): Promise<HallTicketEligibility> => {
  const response = await CAxios.put(`/exams/${examId}/hall-tickets/${studentId}/override`, overrides)
  return response.data
}

export const downloadHallTicket = async (examId: string, studentId: string): Promise<Blob> => {
  const response = await CAxios.get(`/exams/${examId}/hall-tickets/download`, {
    params: { student_id: studentId },
    responseType: 'blob',
  })
  return response.data
}

export const downloadAllHallTickets = async (examId: string): Promise<Blob> => {
  const response = await CAxios.get(`/exams/${examId}/hall-tickets/download-all`, { responseType: 'blob' })
  return response.data
}

// ---------------------------------------------------------------------------
// Results (not yet on backend)
// ---------------------------------------------------------------------------
export const getStudentResults = async (examId: string, params?: { student_id?: string; class_id?: string; section_id?: string }): Promise<StudentExamResult[]> => {
  const response = await CAxios.get(`/exams/${examId}/results`, { params })
  return response.data
}

export const getStudentResult = async (examId: string, studentId: string): Promise<StudentExamResult> => {
  const response = await CAxios.get(`/exams/${examId}/results/${studentId}`)
  return response.data
}

// ---------------------------------------------------------------------------
// Notifications (not yet on backend)
// ---------------------------------------------------------------------------
export const sendExamNotification = async (examId: string, data: {
  notification_type: 'hall_ticket_available' | 'results_published' | 'exam_schedule' | 'custom'
  message: string
  target_audience?: 'students' | 'parents' | 'all'
  send_push?: boolean
  send_sms?: boolean
  send_email?: boolean
}): Promise<{ notifications_queued: number; notification_type: string }> => {
  const response = await CAxios.post(`/exams/${examId}/notify`, data)
  return response.data
}

// ---------------------------------------------------------------------------
// Audit Log (not yet on backend)
// ---------------------------------------------------------------------------
export const getAuditLog = async (examId: string, params?: { page?: number; page_size?: number }): Promise<unknown> => {
  const response = await CAxios.get('/exam/audit', { params: { exam_id: examId, ...params } })
  return response.data
}
