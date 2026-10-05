import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATES } from '@/lib/defaultCertificateTemplates'

describe('default certificate templates', () => {
  it('TC-CER-02-U05 has six entries with the documented names and themes', () => {
    expect(DEFAULT_TEMPLATES.map((t) => [t.name, t.color_theme])).toEqual([
      ['Bonafide Certificate (Class I–X)', 'blue'],
      ['Permanent Bonafide Certificate (After Class X)', 'green'],
      ['Conduct Certificate (Class I–X)', 'green'],
      ['Conduct Certificate – Permanent (After Class X)', 'green'],
      ['Transfer Certificate (Before Class X)', 'orange'],
      ['Transfer Certificate – Permanent (After Class X)', 'red'],
    ])
  })

  it('TC-CER-02-U05 every html_template is non-empty and uses placeholders', () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(t.html_template.trim().length).toBeGreaterThan(0)
      expect(t.html_template).toContain('{{student_name}}')
    }
  })

  it('TC-CER-02-U05 themes are within the backend color set', () => {
    const allowed = ['blue', 'green', 'red', 'orange']
    for (const t of DEFAULT_TEMPLATES) expect(allowed).toContain(t.color_theme)
  })
})
