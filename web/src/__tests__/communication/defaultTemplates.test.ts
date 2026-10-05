import { describe, expect, it } from 'vitest'
import { DEFAULT_COMMUNICATION_TEMPLATES } from '@/lib/defaultCommunicationTemplates'

describe('DEFAULT_COMMUNICATION_TEMPLATES', () => {
  it('TC-COM-01-U12 holds nine sms entries with unique names', () => {
    expect(DEFAULT_COMMUNICATION_TEMPLATES).toHaveLength(9)
    expect(DEFAULT_COMMUNICATION_TEMPLATES.every((t) => t.channel === 'sms')).toBe(true)
    const names = DEFAULT_COMMUNICATION_TEMPLATES.map((t) => t.name)
    expect(new Set(names).size).toBe(9)
  })

  it('TC-COM-01-U12 contains the nine documented template names', () => {
    const names = DEFAULT_COMMUNICATION_TEMPLATES.map((t) => t.name).sort()
    expect(names).toEqual(
      [
        'Welcome',
        'Student Absentees',
        'Staff Recruiting',
        'Staff Attendance',
        'Fee Collection',
        'Exam Schedule',
        'Mark Entry',
        'Holiday',
        'Homework Diary',
      ].sort(),
    )
  })

  it('TC-COM-01-U12 every entry has a non-empty body', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      expect(template.body.trim().length).toBeGreaterThan(0)
    }
  })

  it('TC-COM-01-U12 bodies stay inside the 480 character sms limit enforced by the backend', () => {
    for (const template of DEFAULT_COMMUNICATION_TEMPLATES) {
      expect(template.body.length).toBeLessThanOrEqual(480)
    }
  })

  it('trimmed lower-case matching of two existing names leaves seven defaults to create', () => {
    const existing = new Set([' welcome ', 'HOLIDAY'].map((n) => n.trim().toLowerCase()))
    const missing = DEFAULT_COMMUNICATION_TEMPLATES.filter((t) => !existing.has(t.name.trim().toLowerCase()))
    expect(missing).toHaveLength(7)
    expect(missing.map((t) => t.name)).not.toContain('Welcome')
    expect(missing.map((t) => t.name)).not.toContain('Holiday')
  })
})
