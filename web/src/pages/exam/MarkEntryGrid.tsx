import { Fragment, useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Save, Upload, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useMarksForSubjects,
  useSaveMarksForSubject,
  useExamDetail,
  useExamSubjectConfigs,
  useExamClassSections,
} from '@/api/hooks/exam/useExam'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections'
import { QuickSendButton } from '@/components/communication/QuickSendButton'
import { useExamStore } from '@/lib/examStore'
import { useAuthStore } from '@/lib/authStore'
import { toast } from 'sonner'
import type { ExamSubjectConfig, MarkEntryItem } from '@/types/exam'

type LocalValues = Record<string, Record<string, Record<string, string>>>

type ExcelColumn =
  | { kind: 'admno' }
  | { kind: 'name' }
  | { kind: 'mark'; subjectConfigId: string; componentId: string }
  | { kind: 'total'; subjectConfigId: string }
  | { kind: 'grandtotal' }

const fmtMax = (n: number | string | null | undefined): string => {
  if (n === null || n === undefined) return ''
  const v = Number(n)
  return Number.isFinite(v) ? String(v) : String(n)
}

export default function MarkEntryGrid() {
  const { examId, classId, sectionId } = useParams({ strict: false }) as {
    examId: string; classId: string; sectionId: string
  }
  const navigate = useNavigate()
  const [localValues, setLocalValues] = useState<LocalValues>({})
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resolvedSectionId = sectionId === 'null' ? '' : sectionId

  const { data: exam } = useExamDetail(examId)
  const { data: classSections = [] } = useExamClassSections(examId)
  const { data: allSubjectConfigs = [] } = useExamSubjectConfigs(examId)
  const { data: subjectsList = [] } = useSubjectsDropdown({ active_only: false })
  const subjectNameMap = useMemo(
    () => Object.fromEntries(subjectsList.map((s) => [s.id, s.name])),
    [subjectsList],
  )
  const getSubjectName = (cfg: ExamSubjectConfig) =>
    cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? 'Unknown subject'

  const classSection = classSections.find(
    (cs) => cs.class_id === classId && cs.section_id === (sectionId === 'null' ? null : sectionId)
  )

  const { data: classesList = [] } = useClassSectionsDropdown()
  const classNameMap = useMemo(() => Object.fromEntries(classesList.map((c) => [c.id, c.name])), [classesList])
  const sectionNameMap = useMemo(
    () => Object.fromEntries(classesList.flatMap((c) => c.sections.map((s) => [s.id, s.name]))),
    [classesList],
  )
  const resolvedClassName = classSection?.class_name ?? classNameMap[classId]
  const resolvedSectionName = classSection?.section_name ?? (sectionId !== 'null' ? sectionNameMap[sectionId] : null)

  const csLabel = [resolvedClassName, resolvedSectionName].filter(Boolean).join(' – ') || '—'

  const excelBaseName = [exam?.exam_name, resolvedClassName, resolvedSectionName]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Marks'

  const excelSheetName = excelBaseName.replace(/[\\/?*[\]:]/g, '-').slice(0, 31)

  const excelFileName = `${excelBaseName.replace(/[\\/?*:"<>|]/g, '-')}.xlsx`

  const subjectConfigs = useMemo(
    () =>
      allSubjectConfigs
        .filter((cfg) => cfg.class_id === classId && cfg.section_id === (sectionId === 'null' ? null : sectionId))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [allSubjectConfigs, classId, sectionId],
  )
  const subjectConfigIds = useMemo(() => subjectConfigs.map((c) => c.id), [subjectConfigs])

  const marksQueries = useMarksForSubjects(examId, classId, resolvedSectionId, subjectConfigIds)
  const isLoading = marksQueries.some((q) => q.isLoading)
  const marksError = marksQueries.find((q) => q.isError)?.error
  const canEnterMarks = useAuthStore(s =>
    s.hasPermission('exams', 'update') || s.hasPermission('exam_marks', 'create')
  )
  const saveMutation = useSaveMarksForSubject(examId)

  const rowsBySubject: Record<string, MarkEntryItem[]> = {}
  subjectConfigs.forEach((cfg, i) => {
    rowsBySubject[cfg.id] = marksQueries[i]?.data ?? []
  })

  const markEntryFilter = useExamStore((s) => s.markEntryFilter)
  const selectedStudentIds =
    markEntryFilter.examId === examId &&
    markEntryFilter.classId === classId &&
    markEntryFilter.sectionId === sectionId &&
    markEntryFilter.studentIds
      ? new Set(markEntryFilter.studentIds)
      : null

  const students = useMemo(() => {
    const byId = new Map<string, { student_id: string; student_name: string; admission_number: string }>()
    subjectConfigs.forEach((cfg) => {
      rowsBySubject[cfg.id]?.forEach((row) => {
        if (!byId.has(row.student_id)) {
          byId.set(row.student_id, {
            student_id: row.student_id,
            student_name: row.student_name,
            admission_number: row.admission_number,
          })
        }
      })
    })
    const all = Array.from(byId.values())
    return selectedStudentIds ? all.filter((s) => selectedStudentIds.has(s.student_id)) : all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectConfigs, marksQueries.map((q) => q.dataUpdatedAt).join(','), markEntryFilter])

  const componentMap: Record<string, { name: string; maxMarks?: number }> = {}
  subjectConfigs.forEach((cfg) => {
    cfg.components.forEach((comp) => {
      componentMap[comp.id] = { name: comp.component_name, maxMarks: comp.max_marks != null ? Number(comp.max_marks) : undefined }
    })
  })

  const getRow = (subjectConfigId: string, studentId: string) =>
    rowsBySubject[subjectConfigId]?.find((r) => r.student_id === studentId)

  const getLocalValue = (studentId: string, subjectConfigId: string, compId: string) =>
    localValues[studentId]?.[subjectConfigId]?.[compId] ??
    getRow(subjectConfigId, studentId)?.marks[compId]?.marks_obtained ??
    ''

  const isAbsent = (studentId: string, subjectConfigId: string) =>
    Object.values(getRow(subjectConfigId, studentId)?.marks ?? {}).some((m) => m.is_absent)

  const getSubjectMax = (cfg: ExamSubjectConfig) =>
    cfg.components
      .filter((c) => c.entry_type === 'marks' && c.include_in_total)
      .reduce((sum, c) => sum + Number(c.max_marks ?? 0), 0)

  const getSubjectTotal = (studentId: string, cfg: ExamSubjectConfig) => {
    const eligible = cfg.components.filter((c) => c.entry_type === 'marks' && c.include_in_total)
    const max = getSubjectMax(cfg)
    const absent = isAbsent(studentId, cfg.id)
    if (absent) return { obtained: null as number | null, max, absent: true }

    let obtained = 0
    let anyEntered = false
    eligible.forEach((c) => {
      const raw = getLocalValue(studentId, cfg.id, c.id)
      if (raw !== '' && raw !== null) {
        obtained += parseFloat(String(raw))
        anyEntered = true
      }
    })
    return { obtained: anyEntered ? obtained : null, max, absent: false }
  }

  const getGrandTotal = (studentId: string) => {
    let obtained = 0
    let max = 0
    let anyEntered = false
    subjectConfigs.forEach((cfg) => {
      const t = getSubjectTotal(studentId, cfg)
      max += t.max
      if (!t.absent && t.obtained !== null) {
        obtained += t.obtained
        anyEntered = true
      }
    })
    return { obtained, max, anyEntered }
  }

  const grandMax = useMemo(
    () => subjectConfigs.reduce((sum, cfg) => sum + getSubjectMax(cfg), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [subjectConfigs],
  )

  const handleCellChange = (studentId: string, subjectConfigId: string, compId: string, value: string) => {
    const max = componentMap[compId]?.maxMarks
    if (max !== undefined && value !== '' && parseFloat(value) > max) {
      toast.warning(`Cannot exceed max marks (${max}) for ${componentMap[compId]?.name}`)
      return
    }
    setLocalValues((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [subjectConfigId]: { ...(prev[studentId]?.[subjectConfigId] ?? {}), [compId]: value },
      },
    }))
  }

  const dirtyStudentIds = useMemo(() => {
    const ids = new Set<string>()
    Object.entries(localValues).forEach(([studentId, bySubject]) => {
      const hasValue = Object.values(bySubject).some((byComp) =>
        Object.values(byComp).some((v) => v !== null && v !== ''),
      )
      if (hasValue) ids.add(studentId)
    })
    return ids
  }, [localValues])

  const handleSaveAll = async () => {
    let anySaved = false
    let anyFailed = false

    for (const cfg of subjectConfigs) {
      const componentIds = cfg.components.map((c) => c.id)
      const marks: Array<{
        student_id: string
        component_id: string
        marks_obtained: number | null
        is_absent: boolean
      }> = []

      students.forEach(({ student_id }) => {
        const absent = isAbsent(student_id, cfg.id)
        const hasDirty = Object.values(localValues[student_id]?.[cfg.id] ?? {}).some(
          (v) => v !== null && v !== '',
        )

        if (!hasDirty) return

        const row = getRow(cfg.id, student_id)
        componentIds.forEach((compId) => {
          const localVal = localValues[student_id]?.[cfg.id]?.[compId]
          const existingMarks = row?.marks[compId]?.marks_obtained

          const marksObtained = absent
            ? null
            : localVal !== undefined && localVal !== ''
              ? parseFloat(String(localVal))
              : (existingMarks ?? null)

          marks.push({ student_id, component_id: compId, marks_obtained: marksObtained, is_absent: absent })
        })
      })

      if (marks.length === 0) continue

      try {
        await saveMutation.mutateAsync({ subjectConfigId: cfg.id, marks })
        anySaved = true
      } catch {
        anyFailed = true
      }
    }

    if (!anySaved && !anyFailed) {
      toast.info('No changes to save')
      return
    }
    if (anySaved) {
      toast.success(anyFailed ? 'Some subjects could not be saved' : 'Marks saved successfully')
      setLocalValues({})
    }
  }

  const getExcelColumns = (): ExcelColumn[] => {
    const cols: ExcelColumn[] = [{ kind: 'admno' }, { kind: 'name' }]
    subjectConfigs.forEach((cfg) => {
      cfg.components.forEach((comp) => {
        cols.push({ kind: 'mark', subjectConfigId: cfg.id, componentId: comp.id })
      })
      cols.push({ kind: 'total', subjectConfigId: cfg.id })
    })
    cols.push({ kind: 'grandtotal' })
    return cols
  }

  const formatTotal = (t: { obtained: number | null; max: number; absent?: boolean }) =>
    t.absent ? 'ABS' : t.obtained !== null ? `${t.obtained}` : ''

  const excelBaseLabelFor = (c: ExcelColumn): string => {
    if (c.kind === 'admno') return 'Adm#'
    if (c.kind === 'name') return 'Student Name'
    if (c.kind === 'grandtotal') return 'Grand Total'
    const cfg = subjectConfigs.find((s) => s.id === c.subjectConfigId)
    const subjectName = cfg ? getSubjectName(cfg) : ''
    if (c.kind === 'total') return `${subjectName} Total`
    const comp = componentMap[c.componentId]
    return `${subjectName} ${comp?.name ?? ''}`
  }

  const excelHeaderFor = (c: ExcelColumn): string => {
    const base = excelBaseLabelFor(c)
    if (c.kind === 'mark') {
      const comp = componentMap[c.componentId]
      return comp?.maxMarks != null ? `${base}[${fmtMax(comp.maxMarks)}]` : base
    }
    if (c.kind === 'total') {
      const cfg = subjectConfigs.find((s) => s.id === c.subjectConfigId)!
      return `${base}[${fmtMax(getSubjectMax(cfg))}]`
    }
    if (c.kind === 'grandtotal') return `${base}[${fmtMax(grandMax)}]`
    return base
  }

  const handleExportExcel = () => {
    const columns = getExcelColumns()
    const headerRow = columns.map(excelHeaderFor)

    const dataRows = students.map((student) => columns.map((c) => {
      if (c.kind === 'admno') return student.admission_number
      if (c.kind === 'name') return student.student_name
      if (c.kind === 'grandtotal') {
        const grand = getGrandTotal(student.student_id)
        return grand.anyEntered ? `${grand.obtained}` : ''
      }
      const cfg = subjectConfigs.find((s) => s.id === c.subjectConfigId)!
      if (c.kind === 'total') return formatTotal(getSubjectTotal(student.student_id, cfg))
      const absent = isAbsent(student.student_id, cfg.id)
      if (absent) return ''
      const v = getLocalValue(student.student_id, cfg.id, c.componentId)
      return v === '' ? '' : Number(v)
    }))

    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, excelSheetName)
    XLSX.writeFile(wb, excelFileName)
    toast.success('Excel downloaded')
  }

  const handleImportExcel = async () => {
    if (!uploadFile) return
    setIsImporting(true)
    try {
      const buffer = await uploadFile.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as (string | number)[][]

      if (rows.length < 2) {
        toast.error('This file has no data rows to import.')
        return
      }

      type ParsedColumn =
        | { kind: 'skip' }
        | { kind: 'admno' }
        | { kind: 'mark'; subjectConfigId: string; componentId: string }

      const colsByBaseLabel = new Map(getExcelColumns().map((c) => [excelBaseLabelFor(c), c]))

      const parsedColumns: ParsedColumn[] = rows[0].map((h, idx) => {
        const text = String(h ?? '').trim()
        if (idx === 0 || text === 'Adm#') return { kind: 'admno' }
        const baseLabel = text.replace(/\s*\[[^\]]*\]\s*$/, '').trim()
        const col = colsByBaseLabel.get(baseLabel)
        return col && col.kind === 'mark'
          ? { kind: 'mark', subjectConfigId: col.subjectConfigId, componentId: col.componentId }
          : { kind: 'skip' }
      })

      if (!parsedColumns.some((c) => c.kind === 'admno')) {
        toast.error('Couldn’t find an "Adm#" column — check the file matches this class-section.')
        return
      }

      const dataRows = rows.slice(1)
      const admNoToStudent = new Map(students.map((s) => [s.admission_number.trim(), s]))
      const admNoColIdx = parsedColumns.findIndex((c) => c.kind === 'admno')

      const nextValues: LocalValues = JSON.parse(JSON.stringify(localValues))
      let matchedRows = 0
      let skippedCells = 0

      dataRows.forEach((row) => {
        const admNo = String(row[admNoColIdx] ?? '').trim()
        if (!admNo) return
        const student = admNoToStudent.get(admNo)
        if (!student) return
        matchedRows++

        parsedColumns.forEach((col, colIdx) => {
          if (col.kind !== 'mark') return
          const raw = row[colIdx]
          if (raw === '' || raw === undefined || raw === null) return
          const num = Number(raw)
          const max = componentMap[col.componentId]?.maxMarks
          if (Number.isNaN(num) || (max !== undefined && num > max)) {
            skippedCells++
            return
          }
          nextValues[student.student_id] = {
            ...(nextValues[student.student_id] ?? {}),
            [col.subjectConfigId]: {
              ...(nextValues[student.student_id]?.[col.subjectConfigId] ?? {}),
              [col.componentId]: String(num),
            },
          }
        })
      })

      if (matchedRows === 0) {
        toast.error('No rows matched a student in this class-section by Adm#.')
        return
      }

      setLocalValues(nextValues)
      toast.success(
        `Imported ${matchedRows} student row${matchedRows !== 1 ? 's' : ''}` +
        (skippedCells > 0 ? ` — ${skippedCells} cell(s) skipped (invalid or over max marks)` : '') +
        '. Review and click Save Marks.',
      )
      setUploadDialogOpen(false)
      setUploadFile(null)
    } catch {
      toast.error('Could not read this file. Make sure it’s a valid .xlsx file.')
    } finally {
      setIsImporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading marks...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Mark Entry - ${exam?.exam_name ?? ''}`}
        subtitle={`${csLabel}${selectedStudentIds ? ` · ${students.length} selected student${students.length !== 1 ? 's' : ''}` : ''}`}
        icon={<Save className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: `/exam/marks/${examId}/summary` as any })} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
              <QuickSendButton
                templateName="Mark Entry"
                targetType="class_section_parents"
                targetRef={{ class_id: classId, section_id: resolvedSectionId }}
                recipientLabel={`Parents of ${csLabel}`}
                variant="button"
                label="Send Marks"
                variables={{ exam_name: exam?.exam_name ?? '' }}
                title="Send Mark Entry Message to parents"
              />
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={students.length === 0}>
                <Download className="mr-1.5 h-4 w-4" />
                Template
              </Button>
              {canEnterMarks && <Button variant="outline" size="sm" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                Upload Excel
              </Button>}
              {canEnterMarks && <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={saveMutation.isPending || dirtyStudentIds.size === 0}
              >
                {saveMutation.isPending
                  ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  : <Save className="mr-1.5 h-4 w-4" />}
                Save Marks
                {dirtyStudentIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                    {dirtyStudentIds.size}
                  </Badge>
                )}
              </Button>}
          </div>
        }
      />

      {dirtyStudentIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Unsaved changes for {dirtyStudentIds.size} student{dirtyStudentIds.size !== 1 ? 's' : ''}.
          Click <strong className="font-semibold">Save Marks</strong> to save.
        </div>
      )}

      {marksError ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">{marksError instanceof Error ? marksError.message : 'Failed to load marks.'}</p>
        </div>
      ) : subjectConfigs.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No subjects configured for this class-section.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No students found for this class-section.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th rowSpan={2} className="sticky left-0 z-10 w-20 min-w-20 max-w-20 overflow-hidden bg-muted/40 px-3 py-2 text-left align-bottom font-semibold whitespace-nowrap text-ellipsis">
                  Adm#
                </th>
                <th rowSpan={2} className="sticky left-20 z-10 bg-muted/40 px-3 py-2 text-left align-bottom font-semibold whitespace-nowrap">
                  Student Name
                </th>
                {subjectConfigs.map((cfg) => (
                  <th
                    key={cfg.id}
                    colSpan={cfg.components.length + 1}
                    className="border-l px-3 py-1.5 text-center font-semibold whitespace-nowrap"
                  >
                    {getSubjectName(cfg)}
                  </th>
                ))}
                <th rowSpan={2} className="border-l px-3 py-2 text-center align-bottom font-semibold whitespace-nowrap">
                  Grand Total[{fmtMax(grandMax)}]
                </th>
              </tr>
              <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                {subjectConfigs.map((cfg) => (
                  <Fragment key={cfg.id}>
                    {cfg.components.map((comp) => (
                      <th key={comp.id} className="border-l px-2 py-1.5 text-center font-medium whitespace-nowrap">
                        {comp.component_name}
                        {comp.max_marks != null && <span>[{fmtMax(comp.max_marks)}]</span>}
                      </th>
                    ))}
                    <th className="border-l px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                      Total[{fmtMax(getSubjectMax(cfg))}]
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id} className="border-b transition-colors last:border-0 hover:bg-muted/10">
                  <td className="sticky left-0 z-10 w-20 min-w-20 max-w-20 overflow-hidden bg-card px-3 py-2 text-xs whitespace-nowrap text-ellipsis" title={student.admission_number}>
                    {student.admission_number}
                  </td>
                  <td className="sticky left-20 z-10 bg-card px-3 py-2 font-medium whitespace-nowrap">
                    {student.student_name}
                  </td>
                  {subjectConfigs.map((cfg) => {
                    const absent = isAbsent(student.student_id, cfg.id)
                    const isDirty = Object.values(localValues[student.student_id]?.[cfg.id] ?? {}).some(
                      (v) => v !== null && v !== '',
                    )
                    const subjectTotal = getSubjectTotal(student.student_id, cfg)
                    return (
                      <Fragment key={cfg.id}>
                        {cfg.components.map((comp) => (
                          <td
                            key={comp.id}
                            className={`border-l px-2 py-1.5 text-center ${
                              absent ? 'bg-orange-50/60 dark:bg-orange-900/10' : isDirty ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                            }`}
                          >
                            {absent ? (
                              <Badge variant="secondary" className="text-xs">ABS</Badge>
                            ) : (
                              <input
                                type="number"
                                className="w-16 rounded border border-border bg-muted/30 px-1.5 py-1 text-center text-sm font-medium transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                                value={getLocalValue(student.student_id, cfg.id, comp.id) as string}
                                placeholder="—"
                                onChange={(e) => handleCellChange(student.student_id, cfg.id, comp.id, e.target.value)}
                                min={0}
                                readOnly={!canEnterMarks}
                                max={comp.max_marks ?? undefined}
                              />
                            )}
                          </td>
                        ))}
                        <td className="border-l px-2 py-1.5 text-center font-semibold whitespace-nowrap">
                          {subjectTotal.absent
                            ? <Badge variant="secondary" className="text-xs">ABS</Badge>
                            : subjectTotal.obtained !== null
                              ? subjectTotal.obtained
                              : <span className="text-muted-foreground">—</span>}
                        </td>
                      </Fragment>
                    )
                  })}
                  {(() => {
                    const grand = getGrandTotal(student.student_id)
                    return (
                      <td className="border-l bg-muted/10 px-3 py-1.5 text-center font-bold whitespace-nowrap">
                        {grand.anyEntered
                          ? grand.obtained
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                    )
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={uploadDialogOpen}
        onOpenChange={(open) => { setUploadDialogOpen(open); if (!open) setUploadFile(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Marks via Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Download the template (or build a sheet with the same column headers, e.g. "Telugu Written[10]"),
              fill in the marks, then upload the file. Imported marks land as unsaved edits for you to review
              before saving.
            </p>
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              {uploadFile ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  <Button variant="outline" size="sm" onClick={() => setUploadFile(null)}>Remove</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select Excel file (.xlsx)</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Browse File
                  </Button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setUploadDialogOpen(false); setUploadFile(null) }}
              >
                Cancel
              </Button>
              <Button onClick={handleImportExcel} disabled={!uploadFile || isImporting}>
                {isImporting
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Upload className="mr-2 h-4 w-4" />}
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
