import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type {
  ClassSectionPayload,
  SubjectConfigPayload,
  ComponentPayload,
  SubjectGradeScheme,
  RemarkGradeSet,
} from '@/types/exam'

interface SubjectInfo {
  id: string
  name: string
}

interface SubjectConfigAccordionProps {
  classSection: ClassSectionPayload & { class_name?: string; section_name?: string }
  subjects: SubjectInfo[]
  value: SubjectConfigPayload[]
  onChange: (configs: SubjectConfigPayload[]) => void
  remarkSets: RemarkGradeSet[]
  subjectSchemes: SubjectGradeScheme[]
}

const defaultComponent = (index: number): ComponentPayload => ({
  component_name: '',
  entry_type: 'marks',
  max_marks: null,
  min_pass_marks: null,
  include_in_total: true,
  is_internal: false,
  remark_grade_set_id: null,
  sort_order: index,
})

export function SubjectConfigAccordion({
  classSection,
  subjects,
  value,
  onChange,
  remarkSets,
  subjectSchemes,
}: SubjectConfigAccordionProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())

  const getConfig = (subjectId: string) =>
    value.find(c => c.class_id === classSection.class_id && c.section_id === classSection.section_id && c.subject_id === subjectId)

  const upsertConfig = (subjectId: string, update: Partial<SubjectConfigPayload>) => {
    const existing = getConfig(subjectId)
    if (existing) {
      onChange(value.map(c =>
        c.class_id === classSection.class_id && c.section_id === classSection.section_id && c.subject_id === subjectId
          ? { ...c, ...update }
          : c
      ))
    } else {
      onChange([...value, {
        class_id: classSection.class_id,
        section_id: classSection.section_id,
        subject_id: subjectId,
        components: [defaultComponent(0)],
        has_internal_external_split: false,
        credit_hours: null,
        subject_grade_scheme_id: null,
        internal_max_marks: null,
        internal_min_pass: null,
        external_max_marks: null,
        external_min_pass: null,
        ...update,
      }])
    }
  }

  const updateComponent = (subjectId: string, compIndex: number, field: keyof ComponentPayload, val: unknown) => {
    const config = getConfig(subjectId)
    if (!config) return
    const newComponents = config.components.map((c, i) =>
      i === compIndex ? { ...c, [field]: val } : c
    )
    upsertConfig(subjectId, { components: newComponents })
  }

  const addComponent = (subjectId: string) => {
    const config = getConfig(subjectId)
    const comps = config?.components ?? []
    upsertConfig(subjectId, { components: [...comps, defaultComponent(comps.length)] })
  }

  const removeComponent = (subjectId: string, compIndex: number) => {
    const config = getConfig(subjectId)
    if (!config) return
    upsertConfig(subjectId, { components: config.components.filter((_, i) => i !== compIndex) })
  }

  const toggleSubject = (subjectId: string) => {
    const next = new Set(expandedSubjects)
    if (next.has(subjectId)) next.delete(subjectId)
    else next.add(subjectId)
    setExpandedSubjects(next)
  }

  const label = classSection.section_name
    ? `${classSection.class_name ?? classSection.class_id} — Section ${classSection.section_name}`
    : (classSection.class_name ?? classSection.class_id)

  return (
    <div className="rounded-lg border">
      <div className="border-b bg-muted/20 px-4 py-2.5">
        <span className="font-medium text-sm">{label}</span>
        <Badge variant="secondary" className="ml-2 text-xs">
          {subjects.length} subjects
        </Badge>
      </div>
      <div className="divide-y">
        {subjects.map((subject) => {
          const config = getConfig(subject.id)
          const isExpanded = expandedSubjects.has(subject.id)
          const includedTotal = (config?.components ?? [])
            .filter(c => c.include_in_total && c.entry_type === 'marks')
            .reduce((sum, c) => sum + (c.max_marks ?? 0), 0)

          return (
            <div key={subject.id}>
              <div
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/10"
                onClick={() => toggleSubject(subject.id)}
              >
                {isExpanded
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                }
                <span className="flex-1 text-sm font-medium">{subject.name}</span>
                {config && (
                  <Badge variant="secondary" className="text-xs">
                    {config.components.length} component{config.components.length !== 1 ? 's' : ''}
                    {includedTotal > 0 && <span className="ml-1 font-semibold">· {includedTotal} marks</span>}
                  </Badge>
                )}
              </div>

              {isExpanded && (
                <div className="bg-muted/5 px-6 pb-4 pt-2 space-y-3">
                  {/* Subject-level settings */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Grade Scheme</label>
                      <select
                        value={config?.subject_grade_scheme_id ?? '__default__'}
                        onChange={(e) => upsertConfig(subject.id, { subject_grade_scheme_id: e.target.value === '__default__' ? null : e.target.value })}
                        className="h-8 w-full rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="__default__">Default</option>
                        {subjectSchemes.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Credit Hours</label>
                      <Input
                        type="number"
                        value={config?.credit_hours ?? ''}
                        onChange={(e) => upsertConfig(subject.id, { credit_hours: e.target.value ? parseInt(e.target.value) : null })}
                        className="h-8 text-xs"
                        min={0}
                        placeholder="—"
                      />
                    </div>
                  </div>

                  {/* Components table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium">Mark Components</label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addComponent(subject.id)}
                        className="h-7 gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Add Component
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="px-2 py-1.5 text-left">Component</th>
                            <th className="px-2 py-1.5 text-left">Type</th>
                            <th className="px-2 py-1.5 text-left">Max Marks</th>
                            <th className="px-2 py-1.5 text-left">Min Pass</th>
                            <th className="px-2 py-1.5 text-left">In Total</th>
                            <th className="w-8 px-2 py-1.5" />
                          </tr>
                        </thead>
                        <tbody>
                          {(config?.components ?? []).map((comp, ci) => (
                            <tr key={ci} className="border-b">
                              <td className="px-2 py-1">
                                <Input
                                  value={comp.component_name}
                                  onChange={(e) => updateComponent(subject.id, ci, 'component_name', e.target.value)}
                                  className="h-7 text-xs"
                                  placeholder="Written"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <select
                                  value={comp.entry_type}
                                  onChange={(e) => updateComponent(subject.id, ci, 'entry_type', e.target.value)}
                                  className="h-7 w-24 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                  <option value="marks">Marks</option>
                                  <option value="remarks">Remarks</option>
                                </select>
                              </td>
                              <td className="px-2 py-1">
                                {comp.entry_type === 'marks' ? (
                                  <Input
                                    type="number"
                                    value={comp.max_marks ?? ''}
                                    onChange={(e) => updateComponent(subject.id, ci, 'max_marks', e.target.value ? parseFloat(e.target.value) : null)}
                                    className="h-7 w-20 text-xs"
                                    placeholder="100"
                                    min={0}
                                  />
                                ) : (
                                  <select
                                    value={comp.remark_grade_set_id ?? ''}
                                    onChange={(e) => updateComponent(subject.id, ci, 'remark_grade_set_id', e.target.value || null)}
                                    className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                  >
                                    <option value="">Select set…</option>
                                    {remarkSets.map(rs => (
                                      <option key={rs.id} value={rs.id}>{rs.name}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td className="px-2 py-1">
                                {comp.entry_type === 'marks' && (
                                  <Input
                                    type="number"
                                    value={comp.min_pass_marks ?? ''}
                                    onChange={(e) => updateComponent(subject.id, ci, 'min_pass_marks', e.target.value ? parseFloat(e.target.value) : null)}
                                    className="h-7 w-20 text-xs"
                                    placeholder="35"
                                    min={0}
                                  />
                                )}
                              </td>
                              <td className="px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={comp.include_in_total}
                                  onChange={(e) => updateComponent(subject.id, ci, 'include_in_total', e.target.checked)}
                                  className="h-4 w-4"
                                />
                              </td>
                              <td className="px-2 py-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeComponent(subject.id, ci)}
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {(config?.components ?? []).length > 0 && (
                            <tr className="border-t bg-muted/30">
                              <td className="px-2 py-1.5 text-xs font-semibold text-muted-foreground" colSpan={2}>
                                Subject Total (included)
                              </td>
                              <td className="px-2 py-1.5 text-xs font-bold text-foreground">
                                {includedTotal > 0 ? includedTotal : '—'}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-muted-foreground">
                                {(config?.components ?? [])
                                  .filter(c => c.include_in_total && c.entry_type === 'marks' && c.min_pass_marks)
                                  .reduce((s, c) => s + (c.min_pass_marks ?? 0), 0) > 0
                                  ? (config?.components ?? [])
                                      .filter(c => c.include_in_total && c.entry_type === 'marks' && c.min_pass_marks)
                                      .reduce((s, c) => s + (c.min_pass_marks ?? 0), 0)
                                  : '—'}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
