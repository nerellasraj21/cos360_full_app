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

// ---------------------------------------------------------------------------
// Exam Settings
// ---------------------------------------------------------------------------
export interface ExamSettings {
  id: string
  default_board: ExamBoard | null
  custom_board_name: string | null
  hall_ticket_min_attendance: number | null
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
  academic_year_title: string
  mark_entry_deadline: string | null
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
  granted_at: string
  is_active: boolean
  user_display_name?: string
}

// ---------------------------------------------------------------------------
// Hall Ticket Eligibility
// ---------------------------------------------------------------------------
export interface HallTicketEligibility {
  id: string
  exam_id: string
  student_id: string
  attendance_percent: number | null
  attendance_ok: boolean | null
  fee_paid: boolean | null
  is_eligible: boolean
  attendance_override: boolean
  fee_override: boolean
  ineligibility_reason: IneligibilityReason | null
  generated_at: string | null
  overridden_by: string | null
  student_name?: string
  admission_number?: string
  class_name?: string
  section_name?: string
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
