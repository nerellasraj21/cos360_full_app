import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as examApi from '@/api/exam'
import type {
  ExamStatus,
  ExamNature,
  ExamCreateFull,
  ExamDetailsPayload,
  ExamDatePayload,
  MarkEntryCreate,
  BoardPatternCreate,
  GradeSchemeCreate,
  ExamSettings,
  StudentExamResult,
  TemplateCreate,
  TemplateSaveFromExam,
  TemplateUpdate,
  CopyPatternRequest,
  ApplyTemplateRequest,
  MarkPermissionUpdate,
  ExamNotificationRequest,
} from '@/types/exam'

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------
export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...examKeys.lists(), filters] as const,
  details: () => [...examKeys.all, 'detail'] as const,
  detail: (id: string) => [...examKeys.details(), id] as const,

  settings: ['examSettings'] as const,

  boardPatterns: ['boardPatterns'] as const,
  boardPatternsList: (params?: Record<string, unknown>) => [...examKeys.boardPatterns, params ?? {}] as const,
  boardPattern: (id: string) => [...examKeys.boardPatterns, id] as const,

  examSchemes: ['examGradeSchemes'] as const,
  subjectSchemes: ['subjectGradeSchemes'] as const,
  remarkSets: ['remarkGradeSets'] as const,

  classSections: (examId: string) => [...examKeys.details(), examId, 'class-sections'] as const,
  subjectConfigs: (examId: string) => [...examKeys.details(), examId, 'subject-configs'] as const,

  dates: (examId: string) => ['examDates', examId] as const,

  marks: (examId: string, classId: string, sectionId: string, subjectConfigId: string) =>
    ['marks', examId, classId, sectionId, subjectConfigId] as const,

  permissions: (examId: string) => ['markPermissions', examId] as const,

  eligibility: (examId: string) => ['hallTicketEligibility', examId] as const,

  results: (examId: string, studentId?: string) =>
    studentId ? ['results', examId, studentId] : ['results', examId],

  templates: ['examTemplates'] as const,
  templatesList: (params?: Record<string, unknown>) => [...examKeys.templates, 'list', params ?? {}] as const,
  template: (id: string) => [...examKeys.templates, id] as const,

  audit: (examId: string) => ['examAudit', examId] as const,
}

// ---------------------------------------------------------------------------
// Exam Settings
// ---------------------------------------------------------------------------
export function useExamSettings() {
  return useQuery({
    queryKey: examKeys.settings,
    queryFn: examApi.getExamSettings,
    staleTime: 1000 * 60 * 10,
  })
}

export function useUpdateExamSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ExamSettings>) => examApi.updateExamSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.settings })
      toast.success('Exam settings saved successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings')
    },
  })
}

// ---------------------------------------------------------------------------
// Board Patterns
// ---------------------------------------------------------------------------
export function useBoardPatterns(params?: { board?: string; level?: string }) {
  return useQuery({
    queryKey: examKeys.boardPatternsList(params),
    queryFn: () => examApi.listBoardPatterns(params),
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateBoardPattern() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BoardPatternCreate) => examApi.createBoardPattern(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.boardPatterns })
      toast.success('Board pattern created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create board pattern')
    },
  })
}

export function useUpdateBoardPattern() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BoardPatternCreate> }) =>
      examApi.updateBoardPattern(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.boardPatterns })
      toast.success('Board pattern updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update board pattern')
    },
  })
}

export function useDeleteBoardPattern() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examApi.deleteBoardPattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.boardPatterns })
      toast.success('Board pattern deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete board pattern')
    },
  })
}

// ---------------------------------------------------------------------------
// Exam Grade Schemes
// ---------------------------------------------------------------------------
export function useExamGradeSchemes() {
  return useQuery({
    queryKey: examKeys.examSchemes,
    queryFn: examApi.listExamGradeSchemes,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateExamGradeScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GradeSchemeCreate) => examApi.createExamGradeScheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.examSchemes })
      toast.success('Exam grade scheme created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create grade scheme')
    },
  })
}

export function useUpdateExamGradeScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GradeSchemeCreate> }) =>
      examApi.updateExamGradeScheme(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.examSchemes })
      toast.success('Exam grade scheme updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update grade scheme')
    },
  })
}

export function useDeleteExamGradeScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examApi.deleteExamGradeScheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.examSchemes })
      toast.success('Grade scheme deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete grade scheme')
    },
  })
}

// ---------------------------------------------------------------------------
// Subject Grade Schemes
// ---------------------------------------------------------------------------
export function useSubjectGradeSchemes() {
  return useQuery({
    queryKey: examKeys.subjectSchemes,
    queryFn: examApi.listSubjectGradeSchemes,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateSubjectGradeScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GradeSchemeCreate) => examApi.createSubjectGradeScheme(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.subjectSchemes })
      toast.success('Subject grade scheme created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create subject grade scheme')
    },
  })
}

export function useUpdateSubjectGradeScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GradeSchemeCreate> }) =>
      examApi.updateSubjectGradeScheme(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.subjectSchemes })
      toast.success('Subject grade scheme updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subject grade scheme')
    },
  })
}

export function useDeleteSubjectGradeScheme() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examApi.deleteSubjectGradeScheme(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.subjectSchemes })
      toast.success('Subject grade scheme deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete subject grade scheme')
    },
  })
}

// ---------------------------------------------------------------------------
// Remark Grade Sets
// ---------------------------------------------------------------------------
export function useRemarkGradeSets() {
  return useQuery({
    queryKey: examKeys.remarkSets,
    queryFn: examApi.listRemarkGradeSets,
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateRemarkGradeSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; options: { grade_letter: string; label: string; sort_order: number }[] }) =>
      examApi.createRemarkGradeSet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.remarkSets })
      toast.success('Remark grade set created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create remark grade set')
    },
  })
}

export function useUpdateRemarkGradeSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; options?: { grade_letter: string; label: string; sort_order: number }[] } }) =>
      examApi.updateRemarkGradeSet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.remarkSets })
      toast.success('Remark grade set updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update remark grade set')
    },
  })
}

export function useDeleteRemarkGradeSet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examApi.deleteRemarkGradeSet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.remarkSets })
      toast.success('Remark grade set deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete remark grade set')
    },
  })
}

// ---------------------------------------------------------------------------
// Exam Class Sections
// ---------------------------------------------------------------------------
export function useExamClassSections(examId: string) {
  return useQuery({
    queryKey: examKeys.classSections(examId),
    queryFn: () => examApi.getExamClassSections(examId),
    enabled: !!examId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAddExamClassSection(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { class_id: string; section_id?: string | null }) =>
      examApi.addExamClassSection(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.classSections(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.subjectConfigs(examId) })
      toast.success('Class-section added')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add class-section')
    },
  })
}

// ---------------------------------------------------------------------------
// Exam Subject Configs
// ---------------------------------------------------------------------------
export function useExamSubjectConfigs(examId: string) {
  return useQuery({
    queryKey: examKeys.subjectConfigs(examId),
    queryFn: () => examApi.getExamSubjectConfigs(examId),
    enabled: !!examId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateExamSubjectConfig(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ configId, data }: { configId: string; data: Record<string, unknown> }) =>
      examApi.updateExamSubjectConfig(examId, configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.subjectConfigs(examId) })
      toast.success('Subject config updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subject config')
    },
  })
}

// ---------------------------------------------------------------------------
// Exam List
// ---------------------------------------------------------------------------
export function useExamList(filters?: { academic_year_id?: string; status?: ExamStatus; nature?: ExamNature }) {
  return useQuery({
    queryKey: examKeys.list(filters ?? {}),
    queryFn: () => examApi.listExams(filters),
    staleTime: 1000 * 60 * 2,
  })
}

// ---------------------------------------------------------------------------
// Exam Detail
// ---------------------------------------------------------------------------
export function useExamDetail(examId: string) {
  return useQuery({
    queryKey: examKeys.detail(examId),
    queryFn: () => examApi.getExam(examId),
    enabled: !!examId,
    staleTime: 1000 * 60,
  })
}

// ---------------------------------------------------------------------------
// Create Exam (full wizard)
// ---------------------------------------------------------------------------
export function useCreateExamFull() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ExamCreateFull) => examApi.createExamFull(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.all })
      toast.success('Exam created successfully')
    },
    onError: (error: any) => {
      const responseData = error?.response?.data
      console.error('[CreateExam] API error →', error?.response?.status, responseData)
      if (responseData?.details) {
        console.error('[CreateExam] Error details →\n' + JSON.stringify(responseData.details, null, 2))
      }
      const detail = responseData?.detail
      if (Array.isArray(detail)) {
        const msg = detail.map((d: any) => {
          const field = d.loc?.[d.loc.length - 1] ?? 'field'
          return `${field}: ${d.msg}`
        }).join(' | ')
        toast.error(`Validation error — ${msg}`)
      } else if (typeof detail === 'string') {
        toast.error(detail)
      } else if (error?.response?.status === 500) {
        const serverMsg = responseData?.message ?? responseData?.error
        toast.error(`Server error — ${serverMsg ?? 'see browser console (F12) for details'}`)
      } else {
        toast.error(error.message || 'Failed to create exam')
      }
    },
  })
}

// ---------------------------------------------------------------------------
// Update Exam
// ---------------------------------------------------------------------------
export function useUpdateExam(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ExamDetailsPayload>) => examApi.updateExam(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
      toast.success('Exam updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update exam')
    },
  })
}

// ---------------------------------------------------------------------------
// Delete Exam
// ---------------------------------------------------------------------------
export function useDeleteExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examId: string) => examApi.deleteExam(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
      toast.success('Exam deleted')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete exam')
    },
  })
}

// ---------------------------------------------------------------------------
// Clone Exam
// ---------------------------------------------------------------------------
export function useCloneExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, data }: { examId: string; data?: { new_name?: string; academic_year_id?: string } }) =>
      examApi.cloneExam(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
      toast.success('Exam cloned successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone exam')
    },
  })
}

// ---------------------------------------------------------------------------
// Publish / Compute / Unlock
// ---------------------------------------------------------------------------
export function useComputeAggregate(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => examApi.computeAggregate(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.results(examId) })
      toast.success('Aggregates computed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to compute aggregates')
    },
  })
}

export function usePublishResults(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => examApi.publishResults(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.results(examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
      toast.success('Results published successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish results')
    },
  })
}

export function useUnlockExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, reason }: { examId: string; reason: string }) =>
      examApi.unlockExam(examId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(variables.examId) })
      queryClient.invalidateQueries({ queryKey: examKeys.lists() })
      toast.success('Exam unlocked')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unlock exam')
    },
  })
}

// ---------------------------------------------------------------------------
// Exam Dates
// ---------------------------------------------------------------------------
export function useExamDates(examId: string, classId?: string, sectionId?: string) {
  return useQuery({
    queryKey: [...examKeys.dates(examId), classId, sectionId],
    queryFn: () => examApi.getExamDates(examId, { class_id: classId, section_id: sectionId }),
    enabled: !!examId,
    staleTime: 60_000,
  })
}

export function useCreateExamDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ExamDatePayload) => {
      const { exam_id = '', ...rest } = data
      return examApi.createExamDate(exam_id, rest)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.dates(variables.exam_id ?? '') })
      toast.success('Exam date added')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add exam date')
    },
  })
}

export function useBulkCreateExamDates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dates: ExamDatePayload[]) => {
      const examId = dates[0]?.exam_id ?? ''
      const rest = dates.map(({ exam_id: _, ...d }) => d)
      return examApi.bulkCreateExamDates(examId, rest)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examDates'] })
      toast.success('Exam dates added successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add exam dates')
    },
  })
}

export function useUpdateExamDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamDatePayload> }) => {
      const { exam_id = '', ...rest } = data
      return examApi.updateExamDate(exam_id, id, rest)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.dates(variables.data.exam_id ?? '') })
      toast.success('Exam date updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update exam date')
    },
  })
}

export function useDeleteExamDate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ examId, dateId }: { examId: string; dateId: string }) =>
      examApi.deleteExamDate(examId, dateId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: examKeys.dates(variables.examId) })
      toast.success('Exam date removed')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove exam date')
    },
  })
}

// ---------------------------------------------------------------------------
// Mark Entry
// ---------------------------------------------------------------------------
export function useMarkEntry(
  examId: string,
  classId: string,
  sectionId: string,
  subjectConfigId: string,
  page = 1,
) {
  return useQuery({
    queryKey: [...examKeys.marks(examId, classId, sectionId, subjectConfigId), page],
    queryFn: () => examApi.getMarks({ exam_id: examId, class_id: classId, section_id: sectionId, subject_config_id: subjectConfigId, page, page_size: 50 }),
    enabled: !!examId && !!classId && !!sectionId && !!subjectConfigId,
    staleTime: 30_000,
  })
}

export function useUpsertMarks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MarkEntryCreate) => {
      const { exam_id, ...rest } = data
      return examApi.upsertMarks(exam_id, rest)
    },
    onMutate: async (newMark) => {
      await queryClient.cancelQueries({ queryKey: ['marks', newMark.exam_id] })
      const snapshot = queryClient.getQueriesData({ queryKey: ['marks', newMark.exam_id] })
      return { snapshot }
    },
    onError: (_err, _variables, context) => {
      if (context?.snapshot) {
        context.snapshot.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
      toast.error('Failed to save marks')
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['marks', variables.exam_id] })
    },
  })
}

export function useBatchSaveMarks(examId: string, subjectConfigId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (marks: Array<{
      student_id: string
      component_id: string
      marks_obtained: number | null
      is_absent: boolean
      remark_grade?: string | null
    }>) => examApi.batchSaveMarks(examId, subjectConfigId, marks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marks', examId] })
      toast.success('Marks saved successfully')
    },
    onError: () => {
      toast.error('Failed to save marks')
    },
  })
}

// ---------------------------------------------------------------------------
// Mark Permissions
// ---------------------------------------------------------------------------
export function useMarkPermissions(examId: string) {
  return useQuery({
    queryKey: examKeys.permissions(examId),
    queryFn: () => examApi.listMarkPermissions(examId),
    enabled: !!examId,
    staleTime: 60_000,
  })
}

export function useGrantMarkPermission(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, scopeNote }: { userId: string; scopeNote?: string }) =>
      examApi.grantMarkPermission(examId, userId, scopeNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.permissions(examId) })
      toast.success('Access granted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to grant access')
    },
  })
}

export function useUpdateMarkPermission(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ permId, data }: { permId: string; data: MarkPermissionUpdate }) =>
      examApi.updateMarkPermission(examId, permId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.permissions(examId) })
      toast.success('Permission updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update permission')
    },
  })
}

export function useRevokeMarkPermission(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (permId: string) => examApi.revokeMarkPermission(examId, permId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.permissions(examId) })
      toast.success('Access revoked')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke access')
    },
  })
}

// ---------------------------------------------------------------------------
// Hall Ticket Eligibility
// ---------------------------------------------------------------------------
export function useEnrolledStudents(examId: string) {
  return useQuery({
    queryKey: [...examKeys.eligibility(examId), 'enrolled'],
    queryFn: () => examApi.getEnrolledStudents(examId),
    enabled: !!examId,
    staleTime: 60_000,
  })
}

export function useHallTicketEligibility(examId: string) {
  const eligible = useQuery({
    queryKey: [...examKeys.eligibility(examId), 'eligible'],
    queryFn: () => examApi.getEligibleStudents(examId),
    enabled: !!examId,
    staleTime: 60_000,
  })
  const ineligible = useQuery({
    queryKey: [...examKeys.eligibility(examId), 'ineligible'],
    queryFn: () => examApi.getIneligibleStudents(examId),
    enabled: !!examId,
    staleTime: 60_000,
  })
  return { eligible, ineligible }
}

export function useComputeHallTickets(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => examApi.computeHallTicketEligibility(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.eligibility(examId) })
      toast.success('Eligibility computed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to compute eligibility')
    },
  })
}

export function usePublishHallTickets(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => examApi.publishHallTickets(examId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) })
      toast.success('Hall tickets published successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish hall tickets')
    },
  })
}

export function useOverrideHallTicket(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, overrides }: { studentId: string; overrides: { attendance_override?: boolean; fee_override?: boolean } }) =>
      examApi.overrideHallTicketEligibility(examId, studentId, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.eligibility(examId) })
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to override eligibility')
    },
  })
}

// ---------------------------------------------------------------------------
// Student Results
// ---------------------------------------------------------------------------
export function useStudentResults(examId: string, params?: { student_id?: string; class_id?: string; section_id?: string }) {
  return useQuery<StudentExamResult[]>({
    queryKey: examKeys.results(examId, params?.student_id),
    queryFn: async (): Promise<StudentExamResult[]> => {
      if (params?.student_id) {
        const single = await examApi.getStudentResult(examId, params.student_id)
        return [single]
      }
      return examApi.getStudentResults(examId, params)
    },
    enabled: !!examId,
    staleTime: 1000 * 60 * 2,
  })
}

// ---------------------------------------------------------------------------
// Raw Marks View (student/parent)
// ---------------------------------------------------------------------------
export function useMyMarks(examId: string) {
  return useQuery({
    queryKey: ['myMarks', examId],
    queryFn: () => examApi.getMyMarks(examId),
    enabled: !!examId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useChildMarks(examId: string, studentId: string | null | undefined) {
  return useQuery({
    queryKey: ['childMarks', examId, studentId],
    queryFn: () => examApi.getChildMarks(examId, studentId!),
    enabled: !!examId && !!studentId,
    staleTime: 1000 * 60 * 2,
  })
}

// ---------------------------------------------------------------------------
// Combined grading schemes for wizard dropdowns
// ---------------------------------------------------------------------------
export function useGradingSchemes() {
  const examSchemes = useExamGradeSchemes()
  const subjectSchemes = useSubjectGradeSchemes()
  return { examSchemes, subjectSchemes }
}

// ---------------------------------------------------------------------------
// Exam Pattern Templates
// ---------------------------------------------------------------------------
export function useTemplates(params?: { board?: string; level?: string }) {
  return useQuery({
    queryKey: examKeys.templatesList(params),
    queryFn: () => examApi.listTemplates(params),
    staleTime: 1000 * 60 * 5,
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: examKeys.template(id),
    queryFn: () => examApi.getTemplate(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TemplateCreate) => examApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.templates })
      toast.success('Template created successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template')
    },
  })
}

export function useSaveTemplateFromExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TemplateSaveFromExam) => examApi.saveTemplateFromExam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.templates })
      toast.success('Template saved from exam')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save template')
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TemplateUpdate }) =>
      examApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.templates })
      toast.success('Template updated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template')
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => examApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.templates })
      toast.success('Template deactivated')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template')
    },
  })
}

// ---------------------------------------------------------------------------
// Pattern Copy / Apply / Compare / Auto-detect
// ---------------------------------------------------------------------------
export function useCopyPattern(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CopyPatternRequest) => examApi.copyPattern(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.subjectConfigs(examId) })
      toast.success('Pattern copied successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to copy pattern')
    },
  })
}

export function useApplyTemplate(examId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ApplyTemplateRequest) => examApi.applyTemplate(examId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: examKeys.subjectConfigs(examId) })
      toast.success('Template applied successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply template')
    },
  })
}

export function useCompareSubjects(
  examId: string,
  params: {
    source_class_id: string
    source_section_id?: string | null
    target_class_id: string
    target_section_id?: string | null
  },
) {
  return useQuery({
    queryKey: ['examPatternCompare', examId, params],
    queryFn: () => examApi.compareSubjects(examId, params),
    enabled: !!examId && !!params.source_class_id && !!params.target_class_id,
    staleTime: 30_000,
  })
}

export function useAutoDetectPatterns(
  examId: string,
  params: {
    target_class_id: string
    target_section_id?: string | null
  },
) {
  return useQuery({
    queryKey: ['examPatternAutoDetect', examId, params],
    queryFn: () => examApi.autoDetectPatterns(examId, params),
    enabled: !!examId && !!params.target_class_id,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export function useAuditLog(examId: string, params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: [...examKeys.audit(examId), params],
    queryFn: () => examApi.getAuditLog(examId, params),
    enabled: !!examId,
    staleTime: 30_000,
  })
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export function useSendExamNotification(examId: string) {
  return useMutation({
    mutationFn: (data: ExamNotificationRequest) => examApi.sendExamNotification(examId, data),
    onSuccess: (data) => {
      toast.success(`${data.notifications_queued} notification(s) queued`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send notification')
    },
  })
}
