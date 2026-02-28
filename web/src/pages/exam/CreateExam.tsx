import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ChevronDown, ChevronRight, Check, Loader2, Save, ArrowLeft,
  Plus, Trash2, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClassSectionSelector } from '@/components/exam/ClassSectionSelector'
import { SubjectConfigAccordion } from '@/components/exam/SubjectConfigAccordion'
import {
  useCreateExamFull,
  useGradingSchemes,
  useRemarkGradeSets,
} from '@/api/hooks/exam/useExam'
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
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()
  const { wizardData, updateWizardData, resetWizard } = useExamStore()

  const [openSections, setOpenSections] = useState<Set<Section>>(new Set([1]))
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set())

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
    class_id: '',
    section_id: null as string | null,
    subject_id: '',
    exam_date: '',
    start_time: '',
    end_time: '',
    venue: '',
  })

  // Available classes from backend
  const [availableClasses, setAvailableClasses] = useState<any[]>([])
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, any[]>>({})

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

  // Load subjects for selected classes
  useEffect(() => {
    const classIds = [...new Set(classSections.map(cs => cs.class_id))]
    classIds.forEach(classId => {
      if (!subjectsByClass[classId]) {
        CAxios.get(`/masters/class-subject-mappings/by-class/${classId}`).then(r => {
          setSubjectsByClass(prev => ({
            ...prev,
            [classId]: Array.from(
              new Map(
                (r.data ?? [])
                  .filter((m: any) => !m.exclude_marks)
                  .map((m: any) => [m.subject_id, { id: m.subject_id, name: m.subject_name }])
              ).values()
            ),
          }))
        }).catch(() => {})
      }
    })
  }, [classSections])

  const toggleSection = (s: Section) => {
    const next = new Set(openSections)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setOpenSections(next)
  }

  const markComplete = (s: Section) => {
    setCompletedSections(prev => new Set([...prev, s]))
  }

  const editSection = (num: Section) => {
    setOpenSections(new Set([num]))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const addExamDate = () => {
    if (!newDate.class_id || !newDate.subject_id || !newDate.exam_date) return
    setExamDates(prev => [...prev, {
      class_id: newDate.class_id,
      section_id: newDate.section_id,
      subject_id: newDate.subject_id,
      exam_date: newDate.exam_date,
      start_time: newDate.start_time || null,
      end_time: newDate.end_time || null,
      venue: newDate.venue || null,
    }])
    setNewDate(prev => ({ ...prev, subject_id: '', exam_date: '', start_time: '', end_time: '', venue: '' }))
  }

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
    !form.watch('exam_type') && 'Exam Type (Section 1)',
    classSections.length === 0 && 'Class & Sections — select at least one (Section 2)',
    activeConfigs.length === 0 && 'Subject Configuration — configure at least one subject (Section 3)',
  ].filter(Boolean) as string[]

  const handleSubmit = async () => {
    const detailsValid = await form.trigger()
    if (!detailsValid) {
      setOpenSections(prev => new Set([...prev, 1]))
      const firstError = Object.values(form.formState.errors)[0]
      const msg = (firstError as any)?.message
      toast.error(msg ? `Exam Details: ${msg}` : 'Please fix the errors in Exam Details (Section 1).')
      return
    }
    if (classSections.length === 0) {
      setOpenSections(prev => new Set([...prev, 2]))
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
      setOpenSections(new Set([3]))
      toast.error('No subjects are fully configured. Fill in component names and marks.')
      return
    }

    // Validate the remaining (non-blank) configs
    for (const cfg of configsToSend) {
      for (const comp of cfg.components) {
        if (!comp.component_name?.trim()) {
          setOpenSections(new Set([3]))
          toast.error('All components must have a name. Please check Subject Configuration.')
          return
        }
        if (comp.entry_type === 'marks' && (comp.max_marks == null || comp.max_marks <= 0)) {
          setOpenSections(new Set([3]))
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
        raw.hall_ticket_min_attendance !== '' && raw.hall_ticket_min_attendance != null
          ? Number(raw.hall_ticket_min_attendance)
          : null,
      exam_grade_scheme_id: raw.exam_grade_scheme_id || null,
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

  const SectionHeader = ({
    num, title, completed, open,
  }: { num: Section; title: string; completed: boolean; open: boolean }) => (
    <button
      type="button"
      onClick={() => toggleSection(num)}
      className={`flex w-full items-center gap-3 border-b px-5 py-4 text-left transition-colors hover:bg-muted/20 ${open ? 'border-l-2 border-l-blue-500' : ''}`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
        {completed ? <Check className="h-4 w-4" /> : num}
      </span>
      <span className="flex-1 font-medium">{title}</span>
      {completed && !open && (
        <Badge variant="outline" className="text-xs text-green-600">Complete</Badge>
      )}
      {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/exam/exams' as any })} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Button>
        <h1 className="text-xl font-bold">Create Exam</h1>
      </div>

      <div className="rounded-lg border bg-card">
        {/* Section 1: Exam Details */}
        <SectionHeader
          num={1}
          title="Exam Details"
          completed={completedSections.has(1)}
          open={openSections.has(1)}
        />
        {openSections.has(1) && (
          <div className="px-5 py-4">
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
                <Select value={form.watch('board')} onValueChange={(v) => form.setValue('board', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
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
                <label className="text-sm font-medium">Level *</label>
                <Select value={form.watch('level')} onValueChange={(v) => form.setValue('level', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Exam Type *</label>
                <Input {...form.register('exam_type')} placeholder="FA1" />
                {form.formState.errors.exam_type && (
                  <p className="text-xs text-destructive">{form.formState.errors.exam_type.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Nature *</label>
                <Select value={form.watch('nature')} onValueChange={(v) => form.setValue('nature', v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NATURES.map(n => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Academic Year *</label>
                <Select value={form.watch('academic_year_id')} onValueChange={(v) => form.setValue('academic_year_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map(ay => (
                      <SelectItem key={ay.id} value={String(ay.id)}>{ay.title ?? ay.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.academic_year_id && (
                  <p className="text-xs text-destructive">{form.formState.errors.academic_year_id.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Grade Scheme</label>
                <Select
                  value={form.watch('exam_grade_scheme_id') ?? '__none__'}
                  onValueChange={(v) => form.setValue('exam_grade_scheme_id', v === '__none__' ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Select scheme" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(examSchemes.data ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Mark Entry Deadline</label>
                <Input type="date" {...form.register('mark_entry_deadline')} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Min Attendance %</label>
                <Input type="number" {...form.register('hall_ticket_min_attendance')} placeholder="75" min={0} max={100} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Attendance From</label>
                <Input type="date" {...form.register('attendance_from_date')} />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Attendance To</label>
                <Input type="date" {...form.register('attendance_to_date')} />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="publish_rank" {...form.register('publish_rank')} className="h-4 w-4" />
                <label htmlFor="publish_rank" className="cursor-pointer text-sm">Publish Rank</label>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_internal" {...form.register('is_internal')} className="h-4 w-4" />
                <label htmlFor="is_internal" className="cursor-pointer text-sm">Internal Exam</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={async () => {
                const ok = await form.trigger()
                if (ok) { markComplete(1); setOpenSections(prev => new Set([...prev, 2])) }
              }} size="sm">
                Next: Class & Sections
              </Button>
            </div>
          </div>
        )}

        {/* Section 2: Class & Sections */}
        <SectionHeader num={2} title="Class & Sections" completed={completedSections.has(2)} open={openSections.has(2)} />
        {openSections.has(2) && (
          <div className="px-5 py-4">
            <p className="mb-3 text-sm text-muted-foreground">Select which class-section combinations this exam applies to</p>
            <ClassSectionSelector
              value={classSections}
              onChange={(cs) => {
                setClassSections(cs)
                updateWizardData('class_sections', cs)
              }}
              availableClasses={availableClasses}
            />
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                disabled={classSections.length === 0}
                onClick={() => { markComplete(2); setOpenSections(prev => new Set([...prev, 3])) }}
                size="sm"
              >
                Next: Subject Config
              </Button>
            </div>
          </div>
        )}

        {/* Section 3: Subject Config */}
        <SectionHeader num={3} title="Subject Configuration" completed={completedSections.has(3)} open={openSections.has(3)} />
        {openSections.has(3) && (
          <div className="px-5 py-4">
            {classSections.length === 0 ? (
              <p className="text-sm text-muted-foreground">Please select class-sections first.</p>
            ) : (
              <div className="space-y-4">
                {classSections.map((cs) => {
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
              </div>
            )}
            {grandTotal > 0 && (
              <div className="mt-3 flex items-center justify-end gap-2 rounded-md border bg-muted/20 px-4 py-2">
                <span className="text-sm text-muted-foreground">Grand Total Marks:</span>
                <span className="text-lg font-bold text-primary">{grandTotal}</span>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={() => { markComplete(3); setOpenSections(prev => new Set([...prev, 4])) }}
                size="sm"
              >
                Next: Exam Dates (Optional)
              </Button>
            </div>
          </div>
        )}

        {/* Section 4: Exam Dates */}
        <SectionHeader num={4} title="Exam Dates (Optional)" completed={completedSections.has(4)} open={openSections.has(4)} />
        {openSections.has(4) && (
          <div className="px-5 py-4">
            <p className="mb-3 text-sm text-muted-foreground">Add exam dates now or later from the exam detail page</p>

            {/* Add Date Inline Form */}
            {classSections.length > 0 ? (
              <div className="mb-3 rounded-md border border-dashed p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Add Exam Date</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground">Class-Section *</label>
                    <select
                      value={`${newDate.class_id}|${newDate.section_id ?? ''}`}
                      onChange={(e) => {
                        const [cid, sid] = e.target.value.split('|')
                        setNewDate(prev => ({ ...prev, class_id: cid, section_id: sid || null, subject_id: '' }))
                      }}
                      className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="|">Select…</option>
                      {classSections.map(cs => {
                        const classInfo = availableClasses.find(c => c.id === cs.class_id)
                        const sectionInfo = classInfo?.sections?.find((s: any) => s.id === cs.section_id)
                        const label = classInfo
                          ? (sectionInfo ? `${classInfo.name} – ${sectionInfo.name}` : classInfo.name)
                          : cs.class_id
                        return (
                          <option key={`${cs.class_id}-${cs.section_id}`} value={`${cs.class_id}|${cs.section_id ?? ''}`}>
                            {label}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground">Subject *</label>
                    <select
                      value={newDate.subject_id}
                      onChange={(e) => setNewDate(prev => ({ ...prev, subject_id: e.target.value }))}
                      disabled={!newDate.class_id}
                      className="h-7 rounded border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    >
                      <option value="">Select…</option>
                      {(subjectsByClass[newDate.class_id] ?? []).map(s => (
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
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-muted-foreground">Venue</label>
                    <Input
                      value={newDate.venue}
                      onChange={(e) => setNewDate(prev => ({ ...prev, venue: e.target.value }))}
                      className="h-7 w-28 text-xs"
                      placeholder="Room / Hall"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 gap-1 self-end text-xs"
                    onClick={addExamDate}
                    disabled={!newDate.class_id || !newDate.subject_id || !newDate.exam_date}
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mb-3 text-xs text-amber-600">Select class-sections first (Section 2) to add exam dates here.</p>
            )}

            {/* Dates Table */}
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-2 py-2 text-left">Subject</th>
                    <th className="px-2 py-2 text-left">Class-Section</th>
                    <th className="px-2 py-2 text-left">Date</th>
                    <th className="px-2 py-2 text-left">Start</th>
                    <th className="px-2 py-2 text-left">End</th>
                    <th className="px-2 py-2 text-left">Venue</th>
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
                        <td className="px-2 py-1">{ed.venue ?? '—'}</td>
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
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                onClick={() => { markComplete(4); setOpenSections(prev => new Set([...prev, 5])) }}
                size="sm"
              >
                Review & Submit
              </Button>
            </div>
          </div>
        )}

        {/* Section 5: Review & Submit */}
        <SectionHeader num={5} title="Review & Submit" completed={false} open={openSections.has(5)} />
        {openSections.has(5) && (
          <div className="px-5 py-4 space-y-4">

            {/* Missing fields alert */}
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

            {/* Exam Details summary */}
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2">
                <span className="text-sm font-semibold">1 · Exam Details</span>
                <Button variant="ghost" size="sm" onClick={() => editSection(1)} className="h-6 px-2 text-xs">Edit</Button>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3 md:grid-cols-3">
                {([
                  { label: 'Exam Name', value: form.watch('exam_name'), required: true },
                  { label: 'Board', value: form.watch('board') === 'Custom' && form.watch('custom_board_name') ? `Custom (${form.watch('custom_board_name')})` : form.watch('board'), required: true },
                  { label: 'Level', value: LEVELS.find(l => l.value === form.watch('level'))?.label, required: true },
                  { label: 'Exam Type', value: form.watch('exam_type'), required: true },
                  { label: 'Nature', value: NATURES.find(n => n.value === form.watch('nature'))?.label, required: true },
                  { label: 'Academic Year', value: academicYears.find(y => String(y.id) === String(form.watch('academic_year_id')))?.title, required: true },
                  { label: 'Grade Scheme', value: (examSchemes.data ?? []).find(s => s.id === form.watch('exam_grade_scheme_id'))?.name },
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
                <div>
                  <p className="text-xs text-muted-foreground">Options</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {form.watch('is_internal') && <Badge variant="secondary" className="text-xs">Internal</Badge>}
                    {form.watch('publish_rank') && <Badge variant="secondary" className="text-xs">Publish Rank</Badge>}
                    {!form.watch('is_internal') && !form.watch('publish_rank') && <span className="text-sm text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Class & Sections summary */}
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

            {/* Subject Configuration summary */}
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

            {/* Exam Dates summary */}
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
                          <th className="px-3 py-1.5 text-left">Venue</th>
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
                              <td className="px-3 py-1.5">{ed.venue ?? '—'}</td>
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
              Fix {missingItems.length} issue{missingItems.length !== 1 ? 's' : ''} in Review section
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

      {/* Full-page overlay while saving */}
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
