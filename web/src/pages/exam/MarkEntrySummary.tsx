import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, BarChart3, PenLine, AlertCircle, ServerCrash, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExamDetail, useExamClassSections, useExamSubjectConfigs } from '@/api/hooks/exam/useExam'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useClassSectionsDropdown, useStudentsByClassSection } from '@/api/hooks/masters/classesandsections'
import { useAuthStore } from '@/lib/authStore'
import { useExamStore } from '@/lib/examStore'

export default function MarkEntrySummary() {
  const { examId } = useParams({ strict: false }) as { examId: string }
  const navigate = useNavigate()
  const setMarkEntryFilter = useExamStore((s) => s.setMarkEntryFilter)

  const { data: exam, isLoading: examLoading } = useExamDetail(examId)
  const {
    data: classSections = [],
    isLoading: sectionsLoading,
    isError: sectionsError,
  } = useExamClassSections(examId)
  const {
    data: subjectConfigs = [],
    isLoading: configsLoading,
    isError: configsError,
  } = useExamSubjectConfigs(examId)

  const { data: subjectsList = [] } = useSubjectsDropdown({ active_only: false })
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))
  const { data: classesList = [] } = useClassSectionsDropdown()
  const classNameMap = Object.fromEntries(classesList.map(c => [c.id, c.name]))
  const sectionNameMap = Object.fromEntries(classesList.flatMap(c => c.sections.map(s => [s.id, s.name])))

  const canEnterMarks = useAuthStore(s =>
    s.hasPermission('exams', 'update') || s.hasPermission('exam_marks', 'create')
  )

  // Which of the exam's class-sections is currently selected in the filter.
  const [selectedCsId, setSelectedCsId] = useState<string>('')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())

  // Default to the first class-section once the list loads.
  useEffect(() => {
    if (!selectedCsId && classSections.length > 0) {
      setSelectedCsId(classSections[0].id)
    }
  }, [classSections, selectedCsId])

  const selectedCs = classSections.find((cs) => cs.id === selectedCsId)
  const csLabel = (cs: typeof classSections[number]) => [
    cs.class_name ?? classNameMap[cs.class_id],
    cs.section_name ?? (cs.section_id ? sectionNameMap[cs.section_id] : null),
  ].filter(Boolean).join(' – ') || cs.class_id

  const configs = useMemo(
    () => subjectConfigs.filter(
      (cfg) => selectedCs && cfg.class_id === selectedCs.class_id && cfg.section_id === selectedCs.section_id,
    ),
    [subjectConfigs, selectedCs],
  )

  const { data: studentsData = [], isLoading: studentsLoading } = useStudentsByClassSection(
    selectedCs?.class_id ?? '',
    selectedCs?.section_id ?? '',
  )

  const students = useMemo(
    () => studentsData
      .filter((s) => !!s.student?.id)
      .map((s) => ({
        id: s.student!.id,
        name: `${s.student!.first_name ?? ''} ${s.student!.last_name ?? ''}`.trim() || 'Unknown Student',
        admissionNumber: s.admission_number ?? '',
      })),
    [studentsData],
  )

  // Default to "everyone selected" whenever the student list for the chosen class-section changes.
  useEffect(() => {
    setSelectedStudentIds(new Set(students.map((s) => s.id)))
  }, [students])

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q))
  }, [students, studentSearch])

  const allSelected = students.length > 0 && selectedStudentIds.size === students.length
  const toggleAll = (checked: boolean) => {
    setSelectedStudentIds(checked ? new Set(students.map((s) => s.id)) : new Set())
  }
  const toggleStudent = (studentId: string, checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(studentId)
      else next.delete(studentId)
      return next
    })
  }

  const isLoading = examLoading || sectionsLoading || configsLoading
  const isBackendError = sectionsError || configsError

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const goToGrid = () => {
    if (!selectedCs) return
    const sectionId = selectedCs.section_id ?? 'null'
    setMarkEntryFilter({
      examId,
      classId: selectedCs.class_id,
      sectionId,
      studentIds: Array.from(selectedStudentIds),
    })
    navigate({
      to: `/exam/marks/${examId}/${selectedCs.class_id}/${sectionId}` as any,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: `/exam/exams/${examId}` as any })}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Mark Entry</h1>
          {exam && (
            <p className="text-sm text-muted-foreground">
              {exam.exam_name} · {exam.board} · {exam.exam_type}
            </p>
          )}
        </div>
      </div>

      {/* Backend endpoints not yet implemented */}
      {isBackendError && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-900/20">
          <ServerCrash className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Backend endpoints not yet available
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The mark entry subject list requires two endpoints that are not yet implemented on the backend:
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              <li><code>GET /exams/{'{exam_id}'}/class-sections</code></li>
              <li><code>GET /exams/{'{exam_id}'}/subject-configs</code></li>
            </ul>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Please ask the backend developer to add these endpoints. They should return the{' '}
              <code>ExamClassSection[]</code> and <code>ExamSubjectConfig[]</code> records linked to this exam.
            </p>
          </div>
        </div>
      )}

      {/* Empty state — no backend error but no data */}
      {!isBackendError && classSections.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/20 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No class-sections assigned to this exam.</p>
          <p className="text-sm text-muted-foreground">Go back to the exam and configure class-sections first.</p>
        </div>
      )}

      {/* Class-section filter */}
      {!isBackendError && classSections.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Class – Section</span>
          <Select value={selectedCsId} onValueChange={setSelectedCsId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select class-section" />
            </SelectTrigger>
            <SelectContent>
              {classSections.map((cs) => (
                <SelectItem key={cs.id} value={cs.id}>{csLabel(cs)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCs && (
            <Badge variant="secondary" className="text-xs">
              {configs.length} subject{configs.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Students (left) + Subjects (right) */}
      {!isBackendError && selectedCs && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
          {/* Students panel */}
          <div className="flex flex-col overflow-hidden rounded-lg border">
            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Students</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {selectedStudentIds.size}/{students.length}
              </Badge>
            </div>
            <div className="border-b px-3 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search name or admission #"
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => toggleAll(checked === true)}
                disabled={students.length === 0}
              />
              <span className="text-xs font-medium text-muted-foreground">Select all</span>
            </div>
            <div className="max-h-[28rem] overflow-y-auto">
              {studentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {studentSearch ? `No students match "${studentSearch}".` : 'No students in this class-section.'}
                </p>
              ) : (
                filteredStudents.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 last:border-0 hover:bg-muted/20"
                  >
                    <Checkbox
                      checked={selectedStudentIds.has(s.id)}
                      onCheckedChange={(checked) => toggleStudent(s.id, checked === true)}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.admissionNumber || '—'}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Subjects panel */}
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <span className="font-semibold">{csLabel(selectedCs)}</span>
              {canEnterMarks && configs.length > 0 && (
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={goToGrid}
                  disabled={selectedStudentIds.size === 0}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  Enter Marks
                  {selectedStudentIds.size > 0 && selectedStudentIds.size < students.length && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                      {selectedStudentIds.size}
                    </Badge>
                  )}
                </Button>
              )}
            </div>

            {configs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No subjects configured for this class-section.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Components</th>
                    <th className="px-4 py-2 text-left">Max Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((cfg) => {
                    const totalMarks = cfg.components
                      .filter((c) => c.include_in_total && c.entry_type === 'marks')
                      .reduce((sum, c) => sum + Number(c.max_marks ?? 0), 0)

                    return (
                      <tr key={cfg.id} className="border-b transition-colors last:border-0">
                        <td className="px-4 py-3 font-medium">
                          {cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? cfg.subject_id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cfg.components.map((comp) => (
                              <Badge key={comp.id} variant="outline" className="text-xs">
                                {comp.component_name}
                                {comp.entry_type === 'marks' && comp.max_marks != null && (
                                  <span className="ml-1 text-muted-foreground">[{comp.max_marks}]</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {totalMarks > 0 ? (
                            <span className="font-semibold text-primary">{totalMarks}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
