// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type ExamStatus = 'draft' | 'active' | 'published' | 'locked' | 'finalized'

export type ExamNature = 'formative' | 'summative' | 'cumulative' | 'custom'

export type ExamLevel =
  | 'pre_primary'
  | 'primary'
  | 'upper_primary'
  | 'secondary'
  | 'inter'
  | 'diploma'
  | 'btech'
  | 'mtech'
  | 'iit'
  | 'others'

export type ExamBoard = 'CBSE' | 'ICSE' | 'State' | 'BTech' | 'Custom'

export type EntryType = 'marks' | 'remarks'

export type IneligibilityReason = 'FEE_PENDING' | 'LOW_ATTENDANCE' | 'BOTH'

export type AuditAction =
  | 'mark_entered'
  | 'mark_updated'
  | 'bulk_uploaded'
  | 'exam_published'
  | 'exam_unlocked'
  | 'grace_applied'
  | 'moderation_applied'
  | 'result_withheld'
  | 'result_released'

export type NotificationType = 'hall_ticket_available' | 'results_published' | 'exam_schedule' | 'custom'

export type TargetAudience = 'students' | 'parents' | 'all'

// ---------------------------------------------------------------------------
// Exam Settings
// ---------------------------------------------------------------------------
export interface ExamSettings {
  id: string
  default_board: ExamBoard | null
  custom_board_name: string | null
  hall_ticket_min_attendance: number | null
  hall_ticket_min_fee_paid_pct: number | null
  exam_fee_type_id: string | null
  grace_max_per_subject: number | null
  grace_max_subjects: number | null
  grace_auto_apply: boolean
  reconduct_max_failed_subjects: number
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Board Exam Pattern
// ---------------------------------------------------------------------------
export interface BoardPatternExamType {
  id: string
  pattern_id: string
  exam_type_name: string
  nature: ExamNature
  weightage_percent: number | null
  count_per_year: number | null
  sort_order: number
}

export interface BoardExamPattern {
  id: string
  board: ExamBoard
  custom_board_name: string | null
  level: ExamLevel
  is_active: boolean
  created_at: string
  updated_at: string
  exam_types: BoardPatternExamType[]
}

export interface BoardPatternCreate {
  board: ExamBoard
  custom_board_name?: string
  level: ExamLevel
  exam_types: Omit<BoardPatternExamType, 'id' | 'pattern_id'>[]
}

// ---------------------------------------------------------------------------
// Grading Schemes
// ---------------------------------------------------------------------------
export interface GradeSchemeCreate {
  name: string
  description?: string
  is_default?: boolean
  bands: GradeBandCreate[]
}

export interface GradeBandCreate {
  from_percent: number
  to_percent: number
  from_marks?: number | null
  to_marks?: number | null
  grade_label: string
  gpa: number
  remarks?: string | null
  is_pass: boolean
  sort_order: number
}

export interface ExamGradeBand extends GradeBandCreate {
  id: string
  scheme_id: string
}

export interface ExamGradeScheme {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  bands: ExamGradeBand[]
}

export interface SubjectGradeBand extends GradeBandCreate {
  id: string
  scheme_id: string
}

export interface SubjectGradeScheme {
  id: string
  name: string
  description: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  bands: SubjectGradeBand[]
}

// ---------------------------------------------------------------------------
// Remark Grade Sets
// ---------------------------------------------------------------------------
export interface RemarkGradeOptionCreate {
  grade_letter: string
  label: string
  sort_order: number
}

export interface RemarkGradeOption extends RemarkGradeOptionCreate {
  id: string
  set_id: string
}

export interface RemarkGradeSet {
  id: string
  name: string
  created_at: string
  options: RemarkGradeOption[]
}

// ---------------------------------------------------------------------------
// Exam Core
// ---------------------------------------------------------------------------
export interface ExamDetailsPayload {
  exam_name: string
  board: ExamBoard
  custom_board_name?: string | null
  level: ExamLevel
  exam_type: string
  nature: ExamNature
  is_internal: boolean
  weightage_percent?: number | null
  academic_year_id: string
  exam_grade_scheme_id?: string | null
  subject_grade_scheme_id?: string | null
  status?: ExamStatus
  mark_entry_deadline?: string | null
  publish_rank?: boolean
  hall_ticket_min_attendance?: number | null
  attendance_from_date?: string | null
  attendance_to_date?: string | null
  attendance_mode?: string | null
  term?: string | null
}

export interface ClassSectionPayload {
  class_id: string
  section_id: string | null
}

export interface ComponentPayload {
  component_name: string
  entry_type: EntryType
  max_marks: number | null
  min_pass_marks?: number | null
  include_in_total: boolean
  is_internal?: boolean
  remark_grade_set_id?: string | null
  sort_order?: number
}

export interface SubjectConfigPayload {
  class_id: string
  section_id: string | null
  subject_id: string
  subject_grade_scheme_id?: string | null
  credit_hours?: number | null
  has_internal_external_split?: boolean
  internal_max_marks?: number | null
  internal_min_pass?: number | null
  external_max_marks?: number | null
  external_min_pass?: number | null
  components: ComponentPayload[]
}

export interface ExamDatePayload {
  exam_id?: string
  class_id: string
  section_id: string | null
  subject_id: string
  exam_date: string
  start_time?: string | null
  end_time?: string | null
  venue?: string | null
  notes?: string | null
}

export interface ExamCreateFull {
  exam: ExamDetailsPayload
  class_sections: ClassSectionPayload[]
  subject_configs: SubjectConfigPayload[]
  exam_dates: ExamDatePayload[]
}

export interface ExamCreateFullResponse {
  id: string
  exam_name: string
  status: ExamStatus
  created_at: string
  class_section_count: number
  subject_config_count: number
  exam_date_count: number
}

export interface ExamListItem {
  id: string
  exam_name: string
  board: ExamBoard
  level: ExamLevel
  exam_type: string
  nature: ExamNature
  status: ExamStatus
  academic_year_id: string
  academic_year_title?: string | null
  mark_entry_deadline: string | null
  hall_ticket_min_attendance?: number | null
  attendance_from_date?: string | null
  attendance_to_date?: string | null
  publish_rank?: boolean
  term?: string | null
  created_at: string
  subject_config_count?: number
  class_section_count?: number
  subjects?: string[]
}

export interface Exam extends ExamDetailsPayload {
  id: string
  hall_ticket_published: boolean
  hall_ticket_published_at: string | null
  cloned_from_exam_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Exam Class Sections
// ---------------------------------------------------------------------------
export interface ExamClassSection {
  id: string
  exam_id: string
  class_id: string
  section_id: string | null
  stream_id: string | null
  created_at: string
  class_name?: string
  section_name?: string
}

// ---------------------------------------------------------------------------
// Exam Subject Config and Components
// ---------------------------------------------------------------------------
export interface ExamSubjectComponent {
  id: string
  subject_config_id: string
  component_name: string
  entry_type: EntryType
  max_marks: number | null
  min_pass_marks: number | null
  include_in_total: boolean
  is_internal: boolean
  remark_grade_set_id: string | null
  sort_order: number
}

export interface ExamSubjectConfig {
  id: string
  exam_id: string
  class_id: string
  section_id: string | null
  subject_id: string
  subject_grade_scheme_id: string | null
  credit_hours: number | null
  has_internal_external_split: boolean
  internal_max_marks: number | null
  internal_min_pass: number | null
  external_max_marks: number | null
  external_min_pass: number | null
  sort_order: number | null
  created_at: string
  updated_at: string
  components: ExamSubjectComponent[]
  subject_name?: string
}

// ---------------------------------------------------------------------------
// Exam Dates
// ---------------------------------------------------------------------------
export interface ExamDate {
  id: string
  exam_id: string
  class_id: string
  section_id: string | null
  subject_id: string
  exam_date: string
  start_time: string | null
  end_time: string | null
  venue: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  subject_name?: string
  class_name?: string
  section_name?: string
}

// ---------------------------------------------------------------------------
// Mark Entry
// ---------------------------------------------------------------------------
export interface StudentMark {
  id: string
  exam_id: string
  student_id: string
  subject_config_id: string
  component_id: string
  marks_obtained: number | null
  remark_grade: string | null
  is_absent: boolean
  grace_marks_added: number | null
  attempt_number: number
  entry_source: 'manual' | 'bulk_upload'
  entered_by: string
  entered_at: string
  updated_by: string | null
  updated_at: string | null
}

export interface MarkEntryCreate {
  exam_id: string
  student_id: string
  subject_config_id: string
  component_id: string
  marks_obtained?: number | null
  remark_grade?: string | null
  is_absent?: boolean
}

export interface MarkEntryItem {
  student_id: string
  student_name: string
  admission_number: string
  marks: Record<string, {
    mark_id: string | null
    marks_obtained: number | null
    remark_grade: string | null
    is_absent: boolean
    updated_at: string | null
  }>
}

// ---------------------------------------------------------------------------
// Mark Permissions
// ---------------------------------------------------------------------------
export interface MarkPermission {
  id: string
  exam_id: string
  user_id: string
  granted_by: string
  scope_note: string | null
  is_active: boolean
  created_at: string
  user_display_name?: string
}

export interface MarkPermissionUpdate {
  is_active: boolean
  scope_note?: string | null
}

// ---------------------------------------------------------------------------
// Hall Ticket Eligibility
// ---------------------------------------------------------------------------
export interface HallTicketEligibility {
  id: string
  exam_id: string
  student_id: string
  class_id: string
  section_id: string | null
  attendance_percent: number | null
  attendance_ok: boolean
  fee_paid: boolean
  attendance_override: boolean
  fee_override: boolean
  ineligibility_reason: IneligibilityReason | null
  is_eligible: boolean
  hall_ticket_number: string | null
  computed_at: string | null
  student_name?: string
  admission_number?: string
  // Optional denormalized fields (not in backend schema yet, used by UI with fallback)
  class_name?: string
  section_name?: string
}

export interface EnrolledStudent {
  student_id: string
  class_id: string
  section_id: string | null
  student_name?: string
  admission_number?: string
}

export interface ComputeEligibilityResponse {
  exam_id: string
  total_students: number
  eligible: number
  ineligible: number
}

export interface PublishHallTicketsResponse {
  exam_id: string
  hall_ticket_published: boolean
  hall_ticket_published_at: string | null
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
export interface StudentSubjectResult {
  id: string
  subject_config_id: string
  subject_name?: string
  marks_obtained: number | null
  max_marks: number | null
  percentage: number | null
  grade_label: string | null
  gpa: number | null
  remark_grade: string | null
  is_passed: boolean | null
  is_absent: boolean
}

export interface StudentExamResult {
  id: string
  exam_id: string
  student_id: string
  student_name?: string
  admission_number?: string
  total_marks_obtained: number | null
  total_max_marks: number | null
  percentage: number | null
  grade_label: string | null
  gpa: number | null
  rank: number | null
  is_passed: boolean | null
  computed_at: string | null
  subject_results: StudentSubjectResult[]
}

// ---------------------------------------------------------------------------
// Raw Marks View (student/parent — no compute/publish required)
// ---------------------------------------------------------------------------
export interface MarksComponentView {
  component_name: string
  marks_obtained: number | null
  max_marks: number | null
  is_absent: boolean
  remark_grade: string | null
}

export interface MarksSubjectView {
  subject_config_id: string
  subject_name: string | null
  components: MarksComponentView[]
}

export interface StudentMarksView {
  exam_id: string
  student_id: string
  student_name: string | null
  subjects: MarksSubjectView[]
}

// ---------------------------------------------------------------------------
// Exam Pattern Templates
// ---------------------------------------------------------------------------
export interface TemplateComponentData {
  component_name: string
  entry_type: EntryType
  max_marks: number | null
  min_pass_marks: number | null
  include_in_total: boolean
  is_internal: boolean
  remark_grade_set_id: string | null
  sort_order: number
}

export interface TemplateItemCreate {
  subject_id: string
  subject_grade_scheme_id?: string | null
  credit_hours?: number | null
  has_internal_external_split?: boolean
  internal_max_marks?: number | null
  internal_min_pass?: number | null
  external_max_marks?: number | null
  external_min_pass?: number | null
  sort_order?: number | null
  components: TemplateComponentData[]
}

export interface TemplateItemRead extends TemplateItemCreate {
  id: string
  template_id: string
}

export interface TemplateCreate {
  template_name: string
  description?: string | null
  board?: string | null
  level?: string | null
  items: TemplateItemCreate[]
}

export interface TemplateSaveFromExam {
  template_name: string
  description?: string | null
  exam_id: string
  class_id: string
  section_id?: string | null
}

export interface TemplateRead {
  id: string
  template_name: string
  description: string | null
  board: string | null
  level: string | null
  source_exam_id: string | null
  source_class_id: string | null
  is_active: boolean
  items: TemplateItemRead[]
  created_at: string
}

export interface TemplateListItem {
  id: string
  template_name: string
  description: string | null
  board: string | null
  level: string | null
  item_count: number
  is_active: boolean
  created_at: string
}

export interface TemplateUpdate {
  template_name?: string
  description?: string | null
  board?: string | null
  level?: string | null
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Exam Pattern Copy / Apply / Compare / Auto-detect
// ---------------------------------------------------------------------------
export interface CopyPatternRequest {
  source_class_id: string
  source_section_id?: string | null
  target_class_id: string
  target_section_id?: string | null
  skip_missing_subjects?: boolean
}

export interface ApplyTemplateRequest {
  template_id: string
  target_class_id: string
  target_section_id?: string | null
  skip_missing_subjects?: boolean
}

export interface SubjectComparisonItem {
  subject_id: string
  subject_name: string | null
}

export interface SubjectMismatchResponse {
  common_subjects: SubjectComparisonItem[]
  source_only_subjects: SubjectComparisonItem[]
  target_only_subjects: SubjectComparisonItem[]
  can_copy_all: boolean
  copyable_count: number
}

export interface PatternSuggestion {
  source_class_id: string
  source_section_id: string | null
  source_class_name: string | null
  overlap_subject_count: number
  total_source_configs: number
  total_target_subjects: number
  mismatch: SubjectMismatchResponse
}

export interface AutoDetectResponse {
  suggestions: PatternSuggestion[]
  has_suggestions: boolean
}

export interface AddClassSectionResponse {
  class_section: ExamClassSection
  auto_detect: AutoDetectResponse
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------
export interface AuditLogEntry {
  id: string
  exam_id: string
  student_id: string | null
  subject_id: string | null
  action: AuditAction | string
  old_value: string | null
  new_value: string | null
  reason: string | null
  performed_by: string
  performed_at: string
  metadata_: Record<string, unknown> | null
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export interface ExamNotificationRequest {
  notification_type: NotificationType
  message: string
  target_audience?: TargetAudience
  send_push?: boolean
  send_sms?: boolean
  send_email?: boolean
}

export interface ExamNotificationResponse {
  exam_id: string
  notifications_queued: number
  notification_type: string
}
