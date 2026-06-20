import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check, Loader2, Save,
  Plus, Trash2, AlertCircle, Copy, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DatePicker } from '@/components/ui/DatePicker'
import ReactSelect from 'react-select'
import { useSelectStyles } from '@/lib/useSelectStyles'
import { ClassSectionSelector } from '@/components/exam/ClassSectionSelector'
import { SubjectConfigAccordion } from '@/components/exam/SubjectConfigAccordion'
import {
  useCreateExamFull,
  useGradingSchemes,
  useRemarkGradeSets,
} from '@/api/hooks/exam/useExam'
import { useMappingsByClasses } from '@/api/hooks/masters/classsubjectmappings'
import { useExamStore } from '@/lib/examStore'
import { useAcademicYearStore } from '@/lib/academicYearStore'
import { examDetailsSchema, type ExamDetailsFormData } from '@/schemas/examSchemas'
import type { ClassSectionPayload, SubjectConfigPayload, ExamDatePayload } from '@/types/exam'
import CAxios from '@/api/index'
import { toast } from 'sonner'

const BOARDS = ['CBSE', 'ICSE', 'State', 'BTech', 'Custom'] as const
const LEVELS = [
  { value: 'pre_primary', label: 'Pre-Primary' },
  { value: 'primary', label: 'Primary' },
  { value: 'upper_primary', label: 'Upper Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'inter', label: 'Intermediate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'btech', label: 'BTech' },
  { value: 'mtech', label: 'MTech' },
  { value: 'iit', label: 'IIT' },
  { value: 'others', label: 'Others' },
] as const
const NATURES = [
  { value: 'formative', label: 'Formative' },
  { value: 'summative', label: 'Summative' },
  { value: 'cumulative', label: 'Cumulative' },
  { value: 'custom', label: 'Custom' },
] as const

type Section = 1 | 2 | 3 | 4 | 5

export default function CreateExam() {
  const navigate = useNavigate()
  const selectStyles = useSelectStyles()
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()
  const { wizardData, updateWizardData, resetWizard } = useExamStore()

  const [activeSection, setActiveSection] = useState<Section>(1)
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set())
  const [activeClassTab, setActiveClassTab] = useState<string>('')

  const [classSections, setClassSections] = useState<ClassSectionPayload[]>(
    wizardData.class_sections ?? []
  )
  const [subjectConfigs, setSubjectConfigs] = useState<SubjectConfigPayload[]>(
    wizardData.subject_configs ?? []
  )
  const [examDates, setExamDates] = useState<ExamDatePayload[]>(
    wizardData.exam_dates ?? []
  )
  const [newDate, setNewDate] = useState({
    class_section_keys: [] as string[],
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    venue: '',
  })

  // E1: copy config panel state
  const [showCopyPanel, setShowCopyPanel] = useState(false)
  const [copyTargetKeys, setCopyTargetKeys] = useState<Set<string>>(new Set())

  // Available classes from backend
  const [availableClasses, setAvailableClasses] = useState<any[]>([])

  const createMutation = useCreateExamFull()
  const { examSchemes, subjectSchemes } = useGradingSchemes()
  const { data: remarkSets = [] } = useRemarkGradeSets()

  const form = useForm<ExamDetailsFormData>({
    resolver: zodResolver(examDetailsSchema) as any,
    defaultValues: {
      exam_name: (wizardData.exam?.exam_name as string) ?? '',
      board: (wizardData.exam?.board as any) ?? 'CBSE',
      level: (wizardData.exam?.level as any) ?? 'primary',
      exam_type: (wizardData.exam?.exam_type as string) ?? '',
      nature: (wizardData.exam?.nature as any) ?? 'formative',
      is_internal: (wizardData.exam?.is_internal as boolean) ?? true,
      academic_year_id: selectedAcademicYearId ?? '',
      status: 'draft',
      publish_rank: false,
    },
  })

  // Ensure academic years are loaded into the store
  useEffect(() => {
    if (academicYears.length === 0) {
      fetchAndSetAcademicYears()
    }
  }, [academicYears.length, fetchAndSetAcademicYears])

  // Load available classes — correct endpoint: /masters/class_sections/read_all
  useEffect(() => {
    CAxios.get('/masters/class_sections/read_all').then(r => {
      setAvailableClasses(r.data ?? [])
    }).catch(() => {})
  }, [])

  // Bulk-fetch subjects for all selected classes via /by-classes
  const selectedClassIds = useMemo(
    () => [...new Set(classSections.map(cs => cs.class_id))],
    [classSections]
  )
  const academicYearIdForSubjects = form.watch('academic_year_id') || undefined
  const { data: byClassesData } = useMappingsByClasses(selectedClassIds, academicYearIdForSubjects)

  const subjectsByClass = useMemo<Record<string, { id: string; name: string }[]>>(() => {
    if (!byClassesData) return {}
    const result: Record<string, { id: string; name: string }[]> = {}
    for (const [classId, mappings] of Object.entries(byClassesData)) {
      result[classId] = mappings
        .filter(m => !m.exclude_marks)
        .sort((a, b) => a.order - b.order)
        .map(m => ({ id: m.subject_id, name: m.subject_name }))
    }
    return result
  }, [byClassesData])

  // Auto-sync hidden exam_type with exam_name
  const watchedExamName = form.watch('exam_name')
  useEffect(() => {
    form.setValue('exam_type', watchedExamName || '', { shouldValidate: false })
  }, [watchedExamName])

  const markComplete = (s: Section) => {
    setCompletedSections(prev => new Set([...prev, s]))
  }

  const editSection = (num: Section) => {
    setActiveSection(num)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addExamDate = () => {
    if (newDate.class_section_keys.length === 0 || !newDate.subject_id || !newDate.exam_date) return
    const newEntries: ExamDatePayload[] = newDate.class_section_keys.map(key => {
      const [cid, sid] = key.split('|')
      return {
        class_id: cid,
        section_id: sid || null,
        subject_id: newDate.subject_id,
        exam_date: newDate.exam_date,
        start_time: newDate.start_time || null,
        end_time: newDate.end_time || null,
        venue: newDate.venue || null,
      }
    })
    setExamDates(prev => [...prev, ...newEntries])
    setNewDate(prev => ({ ...prev, subject_id: '', exam_date: '', start_time: '', end_time: '', venue: '' }))
  }

  // E1: copy subject configs from active class-section to selected targets
  const copyConfigToTargets = () => {
    const [srcClassId, srcSectionId] = validActiveTab.split('|')
    const srcConfigs = subjectConfigs.filter(
      cfg => cfg.class_id === srcClassId && (cfg.section_id ?? '') === srcSectionId
    )
    if (srcConfigs.length === 0) return
    let newConfigs = [...subjectConfigs]
    for (const targetKey of copyTargetKeys) {
      const [tClassId, tSectionId] = targetKey.split('|')
      const targetSubjects = subjectsByClass[tClassId] ?? []
      for (const srcCfg of srcConfigs) {
        const srcSubjectName = (subjectsByClass[srcClassId] ?? []).find(s => s.id === srcCfg.subject_id)?.name
        const matchSub = targetSubjects.find(s => s.id === srcCfg.subject_id || s.name === srcSubjectName)
        if (!matchSub) continue
        const cloned = srcCfg.components.map(c => ({ ...c }))
        const existIdx = newConfigs.findIndex(
          c => c.class_id === tClassId && (c.section_id ?? '') === tSectionId && c.subject_id === matchSub.id
        )
        if (existIdx >= 0) {
          newConfigs[existIdx] = { ...newConfigs[existIdx], components: cloned }
        } else {
          newConfigs.push({ ...srcCfg, class_id: tClassId, section_id: tSectionId || null, subject_id: matchSub.id, components: cloned })
        }
      }
    }
    setSubjectConfigs(newConfigs)
    updateWizardData('subject_configs', newConfigs)
    setShowCopyPanel(false)
    setCopyTargetKeys(new Set())
    toast.success(`Config copied to ${copyTargetKeys.size} class-section(s)`)
  }

  // Active tab: fall back to first class-section if current tab was removed
  const validActiveTab = classSections.find(
    cs => `${cs.class_id}|${cs.section_id ?? ''}` === activeClassTab
  )
    ? activeClassTab
    : classSections.length > 0
      ? `${classSections[0].class_id}|${classSections[0].section_id ?? ''}`
      : ''

  // Only count configs for currently selected class-sections (ignore stale wizard data)
  const selectedCsKeys = new Set(classSections.map(cs => `${cs.class_id}|${cs.section_id ?? ''}`))
  const activeConfigs = subjectConfigs.filter(cfg => selectedCsKeys.has(`${cfg.class_id}|${cfg.section_id ?? ''}`))

  const grandTotal = activeConfigs.reduce((sum, cfg) => {
    const t = cfg.components
      .filter(c => c.include_in_total && c.entry_type === 'marks')
      .reduce((s, c) => s + (c.max_marks ?? 0), 0)
    return sum + t
  }, 0)

  const missingItems = [
    !form.watch('exam_name') && 'Exam Name (Section 1)',
    !form.watch('academic_year_id') && 'Academic Year (Section 1)',
    classSections.length === 0 && 'Class & Sections — select at least one (Section 2)',
    activeConfigs.length === 0 && 'Subject Configuration — configure at least one subject (Section 3)',
  ].filter(Boolean) as string[]

  const handleSubmit = async () => {
    const detailsValid = await form.trigger()
    if (!detailsValid) {
      setActiveSection(1)
      const firstError = Object.values(form.formState.errors)[0]
      const msg = (firstError as any)?.message
      toast.error(msg ? `Exam Details: ${msg}` : 'Please fix the errors in Exam Details (Section 1).')
      return
    }
    if (classSections.length === 0) {
      setActiveSection(2)
      return
    }
    // Filter out blank/unconfigured subject configs AND stale configs for deselected class-sections
    const isBlankConfig = (cfg: SubjectConfigPayload) =>
      cfg.components.length === 1 &&
      !cfg.components[0].component_name?.trim() &&
      cfg.components[0].max_marks == null &&
      cfg.subject_grade_scheme_id == null &&
      cfg.credit_hours == null
    const selectedKeys = new Set(classSections.map(cs => `${cs.class_id}|${cs.section_id ?? ''}`))
    const configsToSend = subjectConfigs.filter(cfg =>
      !isBlankConfig(cfg) && selectedKeys.has(`${cfg.class_id}|${cfg.section_id ?? ''}`)
    )

    if (configsToSend.length === 0) {
      setActiveSection(3)
      toast.error('No subjects are fully configured. Fill in component names and marks.')
      return
    }

    // Validate the remaining (non-blank) configs
    for (const cfg of configsToSend) {
      for (const comp of cfg.components) {
        if (!comp.component_name?.trim()) {
          setActiveSection(3)
          toast.error('All components must have a name. Please check Subject Configuration.')
          return
        }
        if (comp.entry_type === 'marks' && (comp.max_marks == null || comp.max_marks <= 0)) {
          setActiveSection(3)
          toast.error('All marks-type components need a max marks value > 0. Please check Subject Configuration.')
          return
        }
      }
    }

    // Sanitize: empty strings → null, string numbers → number
    const raw = form.getValues()
    const details = {
      ...raw,
      mark_entry_deadline: raw.mark_entry_deadline || null,
      attendance_from_date: raw.attendance_from_date || null,
      attendance_to_date: raw.attendance_to_date || null,
      hall_ticket_min_attendance:
        raw.hall_ticket_min_attendance != null
          ? Number(raw.hall_ticket_min_attendance)
          : null,
      exam_grade_scheme_id: raw.exam_grade_scheme_id || null,
      subject_grade_scheme_id: raw.subject_grade_scheme_id || null,
    }

    createMutation.mutate(
      {
        exam: details,
        class_sections: classSections,
        subject_configs: configsToSend,
        exam_dates: examDates,
      },
      {
        onSuccess: () => {
          resetWizard()
          navigate({ to: '/exam/exams' as any })
        },
      }
    )
  }

  const WIZARD_TABS: { num: Section; label: string }[] = [
    { num: 1, label: 'Exam Details' },
    { num: 2, label: 'Class & Sections' },
    { num: 3, label: 'Subject Configuration' },
    { num: 4, label: 'Exam Dates' },
    { num: 5, label: 'Review & Submit' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Create Exam</h1>

      <div className="rounded-lg border bg-card">
        {/* Wizard tab bar */}
        <div className="flex overflow-x-auto border-b">
          {WIZARD_TABS.map(({ num, label }) => {
            const isActive = activeSection === num
            const isDone = completedSections.has(num)
            return (
              <button
                key={num}
                type="button"
                onClick={() => setActiveSection(num)}
                className={`flex shrink-0 items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}>
                  {isDone ? <Check className="h-3 w-3" /> : num}
                </span>
                {label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="px-5 py-4">

          {/* Section 1: Exam Details */}
          {activeSection === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Exam Name *</label>
                <Input {...form.register('exam_name')} placeholder="FA1 2024-25" />
                {form.formState.errors.exam_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.exam_name.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Board *</label>
                <ReactSelect
                  options={BOARDS.map(b => ({ value: b, label: b }))}
                  value={form.watch('board') ? { value: form.watch('board'), label: form.watch('board') } : null}
                  onChange={opt => form.setValue('board', opt?.value as any)}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={selectStyles}
                />
              </div>

              {form.watch('board') === 'Custom' && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Custom Board Name *</label>
                  <Input {...form.register('custom_board_name')} placeholder="e.g. IIT, State Board" />
                  {form.formState.errors.custom_board_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.custom_board_name.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium">Nature *</label>
                <ReactSelect
                  options={NATURES.map(n => ({ value: n.value, label: n.label }))}
                  value={NATURES.find(n => n.value === form.watch('nature')) ? { value: form.watch('nature'), label: NATURES.find(n => n.value === form.watch('nature'))!.label } : null}
                  onChange={opt => form.setValue('nature', opt?.value as any)}
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={selectStyles}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Academic Year *</label>
                <ReactSelect
                  options={academicYears.map(ay => ({ value: String(ay.id), label: ay.title ?? String(ay.id) }))}
                  value={form.watch('academic_year_id') ? { value: form.watch('academic_year_id'), label: academicYears.find(ay => String(ay.id) === form.watch('academic_year_id'))?.title ?? form.watch('academic_year_id') } : null}
                  onChange={opt => form.setValue('academic_year_id', opt?.value ?? '')}
                  placeholder="Select year"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={selectStyles}
                />
                {form.formState.errors.academic_year_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.academic_year_id.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Exam Grade Scheme</label>
                <ReactSelect
                  options={[{ value: '__none__', label: '— None —' }, ...(examSchemes.data ?? []).map(s => ({ value: s.id, label: s.name }))]}
                  value={(() => { const v = form.watch('exam_grade_scheme_id'); if (!v) return { value: '__none__', label: '— None —' }; const s = (examSchemes.data ?? []).find(s => s.id === v); return s ? { value: s.id, label: s.name } : { value: '__none__', label: '— None —' }; })()}
                  onChange={opt => form.setValue('exam_grade_scheme_id', (!opt || opt.value === '__none__') ? null : opt.value)}
                  placeholder="Select scheme"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={selectStyles}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Subject Grade Scheme</label>
                <ReactSelect
                  options={[{ value: '__none__', label: '— None —' }, ...(subjectSchemes.data ?? []).map(s => ({ value: s.id, label: s.name }))]}
                  value={(() => { const v = form.watch('subject_grade_scheme_id'); if (!v) return { value: '__none__', label: '— None —' }; const s = (subjectSchemes.data ?? []).find(s => s.id === v); return s ? { value: s.id, label: s.name } : { value: '__none__', label: '— None —' }; })()}
                  onChange={opt => form.setValue('subject_grade_scheme_id', (!opt || opt.value === '__none__') ? null : opt.value)}
                  placeholder="Select scheme"
                  menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                  styles={selectStyles}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Mark Entry Deadline</label>
                <DatePicker value={form.watch('mark_entry_deadline') ?? ''} onChange={v => form.setValue('mark_entry_deadline', v)} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Min Attendance %</label>
                <Input type="number" {...form.register('hall_ticket_min_attendance')} placeholder="75" min={0} max={100} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Attendance From</label>
                <DatePicker value={form.watch('attendance_from_date') ?? ''} onChange={v => form.setValue('attendance_from_date', v)} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Attendance To</label>
                <DatePicker value={form.watch('attendance_to_date') ?? ''} onChange={v => form.setValue('attendance_to_date', v)} />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="button" onClick={async () => {
                  const ok = await form.trigger()
                  if (ok) { markComplete(1); setActiveSection(2) }
                }} size="sm">
                  Next: Class & Sections
                </Button>
              </div>
            </div>
          )}

          {/* Section 2: Class & Sections */}
          {activeSection === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select which class-section combinations this exam applies to</p>
              <ClassSectionSelector
                value={classSections}
                onChange={(cs) => {
                  setClassSections(cs)
                  updateWizardData('class_sections', cs)
                }}
                availableClasses={availableClasses}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={classSections.length === 0}
                  onClick={() => { markComplete(2); setActiveSection(3) }}
                  size="sm"
                >
                  Next: Subject Config
                </Button>
              </div>
            </div>
          )}

          {/* Section 3: Subject Configuration */}
          {activeSection === 3 && (
            <div className="space-y-3">
              {classSections.length === 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  Please select class-sections first (go to the <button type="button" className="underline" onClick={() => setActiveSection(2)}>Class & Sections</button> tab).
                </div>
              ) : (
                <>
                  {/* Class-section tabs */}
                  <div className="flex flex-wrap gap-0 border-b">
                    {classSections.map((cs) => {
                      const classInfo = availableClasses.find(c => c.id === cs.class_id)
                      const sectionInfo = classInfo?.sections?.find((s: any) => s.id === cs.section_id)
                      const tabKey = `${cs.class_id}|${cs.section_id ?? ''}`
                      const tabLabel = classInfo
                        ? (sectionInfo ? `${classInfo.name} – ${sectionInfo.name}` : classInfo.name)
                        : cs.class_id
                      const isActive = validActiveTab === tabKey
                      const configuredCount = subjectConfigs.filter(
                        c => c.class_id === cs.class_id && c.section_id === cs.section_id
                      ).length
                      return (
                        <button
                          key={tabKey}
                          type="button"
                          onClick={() => setActiveClassTab(tabKey)}
                          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            isActive
                              ? 'border-primary text-primary'
                              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                          }`}
                        >
                          {tabLabel}
                          {configuredCount > 0 && (
                            <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                              {configuredCount}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* E1: Copy config to other classes */}
                  {classSections.length > 1 && validActiveTab && (
                    <div className="flex items-center justify-end gap-2">
                      {showCopyPanel ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/10 px-3 py-2 text-xs w-full">
                          <span className="font-medium text-sm shrink-0">Copy config to:</span>
                          {classSections
                            .filter(cs => `${cs.class_id}|${cs.section_id ?? ''}` !== validActiveTab)
                            .map(cs => {
                              const ci = availableClasses.find(c => c.id === cs.class_id)
                              const si = ci?.sections?.find((s: any) => s.id === cs.section_id)
                              const lbl = ci ? (si ? `${ci.name} – ${si.name}` : ci.name) : cs.class_id
                              const k = `${cs.class_id}|${cs.section_id ?? ''}`
                              return (
                                <label key={k} className="flex items-center gap-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={copyTargetKeys.has(k)}
                                    onChange={e => {
                                      setCopyTargetKeys(prev => {
                                        const s = new Set(prev)
                                        e.target.checked ? s.add(k) : s.delete(k)
                                        return s
                                      })
                                    }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <span>{lbl}</span>
                                </label>
                              )
                            })}
                          <Button type="button" size="sm" className="h-6 text-xs px-2 ml-auto"
                            disabled={copyTargetKeys.size === 0}
                            onClick={copyConfigToTargets}>
                            <Copy className="h-3 w-3 mr-1" />Copy
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-6 text-xs px-1"
                            onClick={() => { setShowCopyPanel(false); setCopyTargetKeys(new Set()) }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-xs"
                          onClick={() => setShowCopyPanel(true)}>
                          <Copy className="h-3 w-3" />
                          Copy this config to other class(es)
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Active class-section accordion */}
                  {classSections
                    .filter(cs => `${cs.class_id}|${cs.section_id ?? ''}` === validActiveTab)
                    .map((cs) => {
                      const classInfo = availableClasses.find(c => c.id === cs.class_id)
                      const sectionInfo = classInfo?.sections?.find((s: any) => s.id === cs.section_id)
                      const subjects = subjectsByClass[cs.class_id] ?? []
                      return (
                        <SubjectConfigAccordion
                          key={`${cs.class_id}-${cs.section_id}`}
                          classSection={{
                            ...cs,
                            class_name: classInfo?.name,
                            section_name: sectionInfo?.name,
                          }}
                          subjects={subjects}
                          value={subjectConfigs}
                          onChange={(configs) => {
                            setSubjectConfigs(configs)
                            updateWizardData('subject_configs', configs)
                          }}
                          remarkSets={remarkSets}
                          subjectSchemes={subjectSchemes.data ?? []}
                        />
                      )
                    })}
                </>
              )}
              {grandTotal > 0 && (
                <div className="flex items-center justify-end gap-2 rounded-md border bg-muted/20 px-4 py-2">
                  <span className="text-sm text-muted-foreground">Grand Total Marks:</span>
                  <span className="text-lg font-bold text-primary">{grandTotal}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button type="button" onClick={() => { markComplete(3); setActiveSection(4) }} size="sm">
                  Next: Exam Dates (Optional)
                </Button>
              </div>
            </div>
          )}

          {/* Section 4: Exam Dates */}
          {activeSection === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Add exam dates now or later from the exam detail page</p>

              {classSections.length > 0 ? (
                <div className="rounded-md border border-dashed p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">Add Exam Date</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1 min-w-[200px]">
                      <label className="text-[10px] text-muted-foreground">Class-Section(s) *</label>
                      <div className="rounded border border-input bg-background px-2 py-1 text-xs max-h-28 overflow-y-auto space-y-0.5">
                        {classSections.map(cs => {
                          const classInfo = availableClasses.find(c => c.id === cs.class_id)
                          const sectionInfo = classInfo?.sections?.find((s: any) => s.id === cs.section_id)
                          const label = classInfo
                            ? (sectionInfo ? `${classInfo.name} – ${sectionInfo.name}` : classInfo.name)
                            : cs.class_id
                          const k = `${cs.class_id}|${cs.section_id ?? ''}`
                          return (
                            <label key={k} className="flex items-center gap-1.5 cursor-pointer py-0.5">
                              <input
                                type="checkbox"
                                checked={newDate.class_section_keys.includes(k)}
                                onChange={e => {
                                  setNewDate(prev => ({
                                    ...prev,
                                    class_section_keys: e.target.checked
                                      ? [...prev.class_section_keys, k]
                                      : prev.class_section_keys.filter(x => x !== k),
                                    subject_id: '',
                                  }))
                                }}
                                className="h-3.5 w-3.5"
                              />
                              {label}
                            </label>
                          )
                        })}
                      </div>
                      {newDate.class_section_keys.length > 0 && (
                        <span className="text-[10px] text-primary">{newDate.class_section_keys.length} selected</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Subject *</label>
                      <select
                        value={newDate.subject_id}
                        onChange={(e) => setNewDate(prev => ({ ...prev, subject_id: e.target.value }))}
                        disabled={newDate.class_section_keys.length === 0}
                        className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      >
                        <option value="">Select…</option>
                        {(subjectsByClass[newDate.class_section_keys[0]?.split('|')[0] ?? ''] ?? []).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Date *</label>
                      <Input
                        type="date"
                        value={newDate.exam_date}
                        onChange={(e) => setNewDate(prev => ({ ...prev, exam_date: e.target.value }))}
                        className="h-7 w-36 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">Start Time</label>
                      <Input
                        type="time"
                        value={newDate.start_time}
                        onChange={(e) => setNewDate(prev => ({ ...prev, start_time: e.target.value }))}
                        className="h-7 w-28 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-muted-foreground">End Time</label>
                      <Input
                        type="time"
                        value={newDate.end_time}
                        onChange={(e) => setNewDate(prev => ({ ...prev, end_time: e.target.value }))}
                        className="h-7 w-28 text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 gap-1 self-end text-xs"
                      onClick={addExamDate}
                      disabled={newDate.class_section_keys.length === 0 || !newDate.subject_id || !newDate.exam_date}
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600">Select class-sections first (go to the <button type="button" className="underline" onClick={() => setActiveSection(2)}>Class & Sections</button> tab).</p>
              )}

              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-2 py-2 text-left">Subject</th>
                      <th className="px-2 py-2 text-left">Class-Section</th>
                      <th className="px-2 py-2 text-left">Date</th>
                      <th className="px-2 py-2 text-left">Start</th>
                      <th className="px-2 py-2 text-left">End</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {examDates.map((ed, i) => {
                      const classInfo = availableClasses.find(c => c.id === ed.class_id)
                      const sectionInfo = classInfo?.sections?.find((s: any) => s.id === ed.section_id)
                      const csLabel = classInfo
                        ? (sectionInfo ? `${classInfo.name} – ${sectionInfo.name}` : classInfo.name)
                        : ed.class_id
                      const subjectName = (subjectsByClass[ed.class_id] ?? []).find(s => s.id === ed.subject_id)?.name ?? ed.subject_id
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-2 py-1">{subjectName}</td>
                          <td className="px-2 py-1">{csLabel}</td>
                          <td className="px-2 py-1">{ed.exam_date}</td>
                          <td className="px-2 py-1">{ed.start_time ?? '—'}</td>
                          <td className="px-2 py-1">{ed.end_time ?? '—'}</td>
                          <td className="px-2 py-1">
                            <Button
                              type="button" variant="ghost" size="sm"
                              onClick={() => setExamDates(examDates.filter((_, j) => j !== i))}
                              className="h-6 w-6 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                    {examDates.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                          No dates added yet. Use the form above to add dates, or skip and add later.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => { markComplete(4); setActiveSection(5) }} size="sm">
                  Review & Submit
                </Button>
              </div>
            </div>
          )}

          {/* Section 5: Review & Submit */}
          {activeSection === 5 && (
            <div className="space-y-4">
              {missingItems.length > 0 && (
                <div className="flex gap-3 rounded-md border border-red-300 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-950">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Missing required information</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {missingItems.map(m => (
                        <li key={m} className="text-xs text-red-600 dark:text-red-400">{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                  <span className="text-sm font-semibold">1 · Exam Details</span>
                  <Button variant="ghost" size="sm" onClick={() => editSection(1)} className="h-6 px-2 text-xs">Edit</Button>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-3">
                  {([
                    { label: 'Exam Name', value: form.watch('exam_name'), required: true },
                    { label: 'Board', value: form.watch('board') === 'Custom' && form.watch('custom_board_name') ? `Custom (${form.watch('custom_board_name')})` : form.watch('board'), required: true },
                    { label: 'Nature', value: NATURES.find(n => n.value === form.watch('nature'))?.label, required: true },
                    { label: 'Academic Year', value: academicYears.find(y => String(y.id) === String(form.watch('academic_year_id')))?.title, required: true },
                    { label: 'Exam Grade Scheme', value: (examSchemes.data ?? []).find(s => s.id === form.watch('exam_grade_scheme_id'))?.name },
                    { label: 'Subject Grade Scheme', value: (subjectSchemes.data ?? []).find(s => s.id === form.watch('subject_grade_scheme_id'))?.name },
                    { label: 'Mark Entry Deadline', value: form.watch('mark_entry_deadline') || undefined },
                    { label: 'Min Attendance %', value: form.watch('hall_ticket_min_attendance') ? `${form.watch('hall_ticket_min_attendance')}%` : undefined },
                    { label: 'Attendance From', value: form.watch('attendance_from_date') || undefined },
                    { label: 'Attendance To', value: form.watch('attendance_to_date') || undefined },
                  ] as { label: string; value?: string | null; required?: boolean }[]).map(({ label, value, required }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}{required && <span className="ml-0.5 text-red-500">*</span>}</p>
                      <p className={`mt-0.5 text-sm font-medium ${!value ? (required ? 'italic text-red-500' : 'text-muted-foreground') : ''}`}>
                        {value ?? (required ? '⚠ Required' : '—')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                  <span className="text-sm font-semibold">2 · Class & Sections</span>
                  <div className="flex items-center gap-2">
                    {classSections.length > 0
                      ? <Badge variant="secondary" className="text-xs">{classSections.length} selected</Badge>
                      : <Badge variant="destructive" className="text-xs">None selected</Badge>
                    }
                    <Button variant="ghost" size="sm" onClick={() => editSection(2)} className="h-6 px-2 text-xs">Edit</Button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  {classSections.length === 0 ? (
                    <p className="text-sm italic text-red-500">⚠ No class-sections selected — required.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {classSections.map(cs => {
                        const classInfo = availableClasses.find(c => c.id === cs.class_id)
                        const sectionInfo = classInfo?.sections?.find((s: any) => s.id === cs.section_id)
                        const label = classInfo
                          ? (sectionInfo ? `${classInfo.name} – ${sectionInfo.name}` : classInfo.name)
                          : cs.class_id
                        return (
                          <Badge key={`${cs.class_id}-${cs.section_id}`} variant="outline" className="text-xs">{label}</Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                  <span className="text-sm font-semibold">3 · Subject Configuration</span>
                  <div className="flex items-center gap-2">
                    {activeConfigs.length > 0
                      ? <Badge variant="secondary" className="text-xs">{activeConfigs.length} subjects · {grandTotal} marks total</Badge>
                      : <Badge variant="destructive" className="text-xs">None configured</Badge>
                    }
                    <Button variant="ghost" size="sm" onClick={() => editSection(3)} className="h-6 px-2 text-xs">Edit</Button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  {subjectConfigs.length === 0 ? (
                    <p className="text-sm italic text-red-500">⚠ No subjects configured — required.</p>
                  ) : (
                    <div className="space-y-2">
                      {classSections.map(cs => {
                        const configs = subjectConfigs.filter(c => c.class_id === cs.class_id && c.section_id === cs.section_id)
                        const classInfo = availableClasses.find(c => c.id === cs.class_id)
                        const sectionInfo = classInfo?.sections?.find((s: any) => s.id === cs.section_id)
                        const csLabel = classInfo ? (sectionInfo ? `${classInfo.name} – ${sectionInfo.name}` : classInfo.name) : cs.class_id
                        const totalSubjects = (subjectsByClass[cs.class_id] ?? []).length
                        const csTotal = configs.reduce((sum, cfg) => {
                          return sum + cfg.components.filter(c => c.include_in_total && c.entry_type === 'marks').reduce((s, c) => s + (c.max_marks ?? 0), 0)
                        }, 0)
                        return (
                          <div key={`${cs.class_id}-${cs.section_id}`} className="rounded-md border px-3 py-2">
                            <div className="mb-1.5 flex items-center justify-between">
                              <span className="text-sm font-medium">{csLabel}</span>
                              <span className="text-xs text-muted-foreground">
                                {configs.length}{totalSubjects > 0 ? `/${totalSubjects}` : ''} subjects
                                {csTotal > 0 && <span className="ml-2 font-semibold text-primary">{csTotal} marks</span>}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {configs.map(cfg => {
                                const subjectName = (subjectsByClass[cfg.class_id] ?? []).find(s => s.id === cfg.subject_id)?.name ?? cfg.subject_id
                                const sTotal = cfg.components.filter(c => c.include_in_total && c.entry_type === 'marks').reduce((s, c) => s + (c.max_marks ?? 0), 0)
                                return (
                                  <span key={cfg.subject_id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
                                    {subjectName}
                                    {sTotal > 0 && <span className="font-bold text-primary">{sTotal}</span>}
                                    <span className="text-muted-foreground">({cfg.components.length} comp)</span>
                                  </span>
                                )
                              })}
                              {configs.length === 0 && <span className="text-xs italic text-amber-600">No subjects configured for this class</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                  <span className="text-sm font-semibold">4 · Exam Dates</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{examDates.length} date{examDates.length !== 1 ? 's' : ''}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => editSection(4)} className="h-6 px-2 text-xs">Edit</Button>
                  </div>
                </div>
                <div className="px-4 py-3">
                  {examDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No exam dates added — can be added after creation.</p>
                  ) : (
                    <div className="overflow-hidden rounded border text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30 text-muted-foreground">
                            <th className="px-3 py-1.5 text-left">Subject</th>
                            <th className="px-3 py-1.5 text-left">Class</th>
                            <th className="px-3 py-1.5 text-left">Date</th>
                            <th className="px-3 py-1.5 text-left">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examDates.map((ed, i) => {
                            const classInfo = availableClasses.find(c => c.id === ed.class_id)
                            const sectionInfo = classInfo?.sections?.find((s: any) => s.id === ed.section_id)
                            const csLabel = classInfo ? (sectionInfo ? `${classInfo.name}–${sectionInfo.name}` : classInfo.name) : ed.class_id
                            const subjectName = (subjectsByClass[ed.class_id] ?? []).find(s => s.id === ed.subject_id)?.name ?? ed.subject_id
                            return (
                              <tr key={i} className="border-b last:border-0">
                                <td className="px-3 py-1.5">{subjectName}</td>
                                <td className="px-3 py-1.5">{csLabel}</td>
                                <td className="px-3 py-1.5">{ed.exam_date}</td>
                                <td className="px-3 py-1.5">
                                  {ed.start_time ? `${ed.start_time}${ed.end_time ? ` – ${ed.end_time}` : ''}` : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-5 py-4">
        <Button
          variant="outline"
          onClick={() => {
            resetWizard()
            navigate({ to: '/exam/exams' as any })
          }}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {missingItems.length > 0 && (
            <p className="text-xs text-amber-600">
              Fix {missingItems.length} issue{missingItems.length !== 1 ? 's' : ''} before submitting
            </p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || missingItems.length > 0}
            className="gap-2 min-w-36"
            size="lg"
          >
            {createMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
              : <><Save className="h-4 w-4" />Create Exam</>
            }
          </Button>
        </div>
      </div>

      {createMutation.isPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-8 shadow-lg">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium">Creating exam...</p>
            <p className="text-sm text-muted-foreground">This is an atomic operation — please wait</p>
          </div>
        </div>
      )}
    </div>
  )
}
