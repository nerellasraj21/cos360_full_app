import { describe, expect, it } from 'vitest'
import {
  componentSchema,
  examDetailsSchema,
  gradeBandSchema,
  gradeSchemeSchema,
  remarkGradeSetSchema,
} from '@/schemas/examSchemas'
import { isAdminRoleName } from '@/lib/roleUtils'

const baseExam = {
  exam_name: 'QA FA1',
  board: 'CBSE',
  level: 'primary',
  exam_type: 'FA1',
  nature: 'formative',
  academic_year_id: 'ay-1',
}

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => i.message)

describe('exam role gate', () => {
  it('TC-EXM-01-U06 isAdminRoleName matches admin, principal, superadmin case-insensitively', () => {
    expect(isAdminRoleName('Admin')).toBe(true)
    expect(isAdminRoleName('PRINCIPAL')).toBe(true)
    expect(isAdminRoleName('superadmin')).toBe(true)
    expect(isAdminRoleName('Teacher')).toBe(false)
    expect(isAdminRoleName(null)).toBe(false)
  })
})

describe('grade band and scheme schemas', () => {
  const band = {
    from_percent: 0,
    to_percent: 100,
    grade_label: 'A',
    gpa: 4,
    is_pass: true,
    sort_order: 0,
  }

  it('TC-EXM-03-U17 gradeBandSchema rejects from > to and gpa above 10', () => {
    const inverted = gradeBandSchema.safeParse({ ...band, from_percent: 60, to_percent: 50 })
    expect(inverted.success).toBe(false)
    expect(messages(inverted)).toContain('From percent must be <= to percent')
    expect(gradeBandSchema.safeParse({ ...band, gpa: 11 }).success).toBe(false)
    expect(gradeBandSchema.safeParse({ ...band, gpa: 10 }).success).toBe(true)
  })

  it('TC-EXM-03-U18 gradeSchemeSchema requires a name and at least one band', () => {
    const noBands = gradeSchemeSchema.safeParse({ name: 'QA Standard', bands: [] })
    expect(noBands.success).toBe(false)
    expect(messages(noBands)).toContain('At least one grade band required')
    const noName = gradeSchemeSchema.safeParse({ name: '', bands: [band] })
    expect(noName.success).toBe(false)
    expect(messages(noName)).toContain('Name is required')
    expect(gradeSchemeSchema.safeParse({ name: 'QA Standard', bands: [band] }).success).toBe(true)
  })
})

describe('remark grade set schema', () => {
  const option = { grade_letter: 'A', label: 'Excellent', sort_order: 0 }

  it('TC-EXM-05-U06 remarkGradeSetSchema rejects no options and a 101 character label', () => {
    const none = remarkGradeSetSchema.safeParse({ name: 'Behaviour', options: [] })
    expect(none.success).toBe(false)
    expect(messages(none)).toContain('At least one option required')
    const longLabel = remarkGradeSetSchema.safeParse({
      name: 'Behaviour',
      options: [{ ...option, label: 'x'.repeat(101) }],
    })
    expect(longLabel.success).toBe(false)
    expect(
      remarkGradeSetSchema.safeParse({ name: 'Behaviour', options: [{ ...option, label: 'x'.repeat(100) }] }).success,
    ).toBe(true)
  })
})

describe('create exam wizard schemas', () => {
  it('TC-EXM-06-U14 examDetailsSchema requires a custom board name when board is Custom', () => {
    const missing = examDetailsSchema.safeParse({ ...baseExam, board: 'Custom', custom_board_name: '' })
    expect(missing.success).toBe(false)
    expect(messages(missing)).toContain('Custom board name is required when board is Custom')
    expect(examDetailsSchema.safeParse({ ...baseExam, board: 'Custom', custom_board_name: 'My Board' }).success).toBe(
      true,
    )
    expect(examDetailsSchema.safeParse(baseExam).success).toBe(true)
  })

  it('TC-EXM-06-U15 componentSchema requires max marks for marks and a set for remarks', () => {
    const base = { component_name: 'Written', include_in_total: true, is_internal: true, sort_order: 0 }
    const marks = componentSchema.safeParse({ ...base, entry_type: 'marks' })
    expect(marks.success).toBe(false)
    expect(messages(marks)).toContain('Max marks required for marks-type components')
    const remarks = componentSchema.safeParse({ ...base, entry_type: 'remarks' })
    expect(remarks.success).toBe(false)
    expect(messages(remarks)).toContain('Remark grade set required for remarks-type components')
    expect(componentSchema.safeParse({ ...base, entry_type: 'marks', max_marks: 80 }).success).toBe(true)
    expect(componentSchema.safeParse({ ...base, entry_type: 'remarks', remark_grade_set_id: 'set-1' }).success).toBe(
      true,
    )
  })

  it('TC-EXM-06-U16 examDetailsSchema requires an exam name of at least 2 characters', () => {
    const short = examDetailsSchema.safeParse({ ...baseExam, exam_name: 'A' })
    expect(short.success).toBe(false)
    expect(messages(short)).toContain('Exam name must be at least 2 characters')
    expect(examDetailsSchema.safeParse({ ...baseExam, exam_name: 'AB' }).success).toBe(true)
  })
})
