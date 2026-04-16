import { z } from 'zod'

// ---------------------------------------------------------------------------
// Step 1: Exam Details
// ---------------------------------------------------------------------------
export const examDetailsSchema = z.object({
  exam_name: z.string().min(2, 'Exam name must be at least 2 characters').max(150),
  board: z.enum(['CBSE', 'ICSE', 'State', 'BTech', 'Custom']),
  custom_board_name: z.string().max(100).optional().nullable(),
  level: z.enum([
    'pre_primary', 'primary', 'upper_primary', 'secondary',
    'inter', 'diploma', 'btech', 'mtech', 'iit', 'others',
  ]),
  exam_type: z.string().min(1, 'Exam type is required').max(50),
  nature: z.enum(['formative', 'summative', 'cumulative', 'custom']),
  is_internal: z.boolean().default(true),
  weightage_percent: z.number().min(0).max(100).optional().nullable(),
  academic_year_id: z.string().min(1, 'Academic year is required'),
  exam_grade_scheme_id: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'published', 'locked', 'finalized']).default('draft'),
  mark_entry_deadline: z
    .preprocess(
      (v) => (v === '' ? null : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-MM-dd').optional().nullable()
    ),
  publish_rank: z.boolean().default(false),
  hall_ticket_min_attendance: z
    .preprocess(
      (v) => (v === '' || v == null ? null : Number(v)),
      z.number().min(0).max(100).optional().nullable()
    ),
  attendance_from_date: z
    .preprocess(
      (v) => (v === '' ? null : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
    ),
  attendance_to_date: z
    .preprocess(
      (v) => (v === '' ? null : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()
    ),
}).refine(
  (data) => data.board !== 'Custom' || !!data.custom_board_name,
  { message: 'Custom board name is required when board is Custom', path: ['custom_board_name'] }
)

// ---------------------------------------------------------------------------
// Step 2: Class Sections
// ---------------------------------------------------------------------------
export const classSectionItemSchema = z.object({
  class_id: z.string().min(1, 'Class ID is required'),
  section_id: z.string().nullable(),
})

export const classSectionSchema = z.object({
  class_sections: z
    .array(classSectionItemSchema)
    .min(1, 'Select at least one class-section'),
})

// ---------------------------------------------------------------------------
// Step 3: Subject Config
// ---------------------------------------------------------------------------
export const componentSchema = z.object({
  component_name: z.string().min(1, 'Component name required').max(100),
  entry_type: z.enum(['marks', 'remarks']),
  max_marks: z.number().min(0).max(9999.99).optional().nullable(),
  min_pass_marks: z.number().min(0).optional().nullable(),
  include_in_total: z.boolean().default(true),
  is_internal: z.boolean().default(true),
  remark_grade_set_id: z.string().optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
}).refine(
  (data) => data.entry_type !== 'marks' || data.max_marks != null,
  { message: 'Max marks required for marks-type components', path: ['max_marks'] }
).refine(
  (data) => data.entry_type !== 'remarks' || !!data.remark_grade_set_id,
  { message: 'Remark grade set required for remarks-type components', path: ['remark_grade_set_id'] }
)

export const subjectConfigItemSchema = z.object({
  class_id: z.string().min(1),
  section_id: z.string().nullable(),
  subject_id: z.string().min(1),
  subject_grade_scheme_id: z.string().optional().nullable(),
  credit_hours: z.number().int().min(0).optional().nullable(),
  has_internal_external_split: z.boolean().default(false),
  internal_max_marks: z.number().min(0).optional().nullable(),
  internal_min_pass: z.number().min(0).optional().nullable(),
  external_max_marks: z.number().min(0).optional().nullable(),
  external_min_pass: z.number().min(0).optional().nullable(),
  components: z.array(componentSchema).min(1, 'At least one component required'),
})

export const subjectConfigSchema = z.object({
  subject_configs: z
    .array(subjectConfigItemSchema)
    .min(1, 'At least one subject configuration required'),
})

// ---------------------------------------------------------------------------
// Step 4: Exam Dates
// ---------------------------------------------------------------------------
export const examDateItemSchema = z.object({
  class_id: z.string().min(1),
  section_id: z.string().nullable(),
  subject_id: z.string().min(1),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be yyyy-MM-dd'),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .optional()
    .nullable(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be HH:mm')
    .optional()
    .nullable(),
  venue: z.string().max(100).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
})

export const examDateSchema = z.object({
  exam_dates: z.array(examDateItemSchema),
})

// ---------------------------------------------------------------------------
// Combined wizard schema
// ---------------------------------------------------------------------------
export const examCreateFullSchema = examDetailsSchema
  .and(classSectionSchema)
  .and(subjectConfigSchema)
  .and(examDateSchema)

// ---------------------------------------------------------------------------
// Mark Entry
// ---------------------------------------------------------------------------
export const markEntrySchema = z.object({
  exam_id: z.string().min(1),
  student_id: z.string().min(1),
  subject_config_id: z.string().min(1),
  component_id: z.string().min(1),
  marks_obtained: z.number().min(0).optional().nullable(),
  remark_grade: z.string().max(5).optional().nullable(),
  is_absent: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Grade Band
// ---------------------------------------------------------------------------
export const gradeBandSchema = z.object({
  from_percent: z.number().min(0).max(100),
  to_percent: z.number().min(0).max(100),
  from_marks: z.number().min(0).optional().nullable(),
  to_marks: z.number().min(0).optional().nullable(),
  grade_label: z.string().min(1).max(10),
  gpa: z.number().min(0).max(10).default(0),
  remarks: z.string().max(100).optional().nullable(),
  is_pass: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
}).refine(
  (data) => data.from_percent <= data.to_percent,
  { message: 'From percent must be <= to percent', path: ['from_percent'] }
)

// ---------------------------------------------------------------------------
// Grade Scheme
// ---------------------------------------------------------------------------
export const gradeSchemeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(300).optional(),
  is_default: z.boolean().default(false),
  bands: z.array(gradeBandSchema).min(1, 'At least one grade band required'),
})

// ---------------------------------------------------------------------------
// Remark Grade Option
// ---------------------------------------------------------------------------
export const remarkGradeOptionSchema = z.object({
  grade_letter: z.string().min(1).max(5),
  label: z.string().min(1).max(100),
  sort_order: z.number().int().min(0).default(0),
})

export const remarkGradeSetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  options: z.array(remarkGradeOptionSchema).min(1, 'At least one option required'),
})

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------
export type ExamDetailsFormData = z.infer<typeof examDetailsSchema>
export type ClassSectionFormData = z.infer<typeof classSectionSchema>
export type SubjectConfigFormData = z.infer<typeof subjectConfigSchema>
export type ExamDateFormData = z.infer<typeof examDateSchema>
export type ExamCreateFullFormData = z.infer<typeof examCreateFullSchema>
export type MarkEntryFormData = z.infer<typeof markEntrySchema>
export type GradeBandFormData = z.infer<typeof gradeBandSchema>
export type GradeSchemeFormData = z.infer<typeof gradeSchemeSchema>
export type RemarkGradeSetFormData = z.infer<typeof remarkGradeSetSchema>
