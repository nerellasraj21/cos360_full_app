import { useState, useRef, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Save, Upload, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useMarkEntry,
  useBatchSaveMarks,
  useExamDetail,
  useExamSubjectConfigs,
  useExamClassSections,
  useRemarkGradeSets,
} from '@/api/hooks/exam/useExam'
import { getMarkTemplate, uploadMarks } from '@/api/exam'
import { toast } from 'sonner'

export default function MarkEntryGrid() {
  const { examId, classId, sectionId, subjectConfigId } = useParams({ strict: false }) as {
    examId: string; classId: string; sectionId: string; subjectConfigId: string
  }
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [localValues, setLocalValues] = useState<Record<string, Record<string, string | number | null>>>({})
  const [localAbsent, setLocalAbsent] = useState<Record<string, boolean>>({})
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // sectionId may be the string "null" when there's no section
  const resolvedSectionId = sectionId === 'null' ? '' : sectionId

  const { data: exam } = useExamDetail(examId)
  const { data: classSections = [] } = useExamClassSections(examId)
  const { data: subjectConfigs = [] } = useExamSubjectConfigs(examId)
  const { data: rows = [], isLoading } = useMarkEntry(
    examId, classId, resolvedSectionId, subjectConfigId, page
  )
  const { data: remarkSets = [] } = useRemarkGradeSets()
  const batchSaveMutation = useBatchSaveMarks(examId, subjectConfigId)

  // Resolve names from fetched data
  const classSection = classSections.find(
    (cs) => cs.class_id === classId && cs.section_id === (sectionId === 'null' ? null : sectionId)
  )
  const subjectConfig = subjectConfigs.find((cfg) => cfg.id === subjectConfigId)
  const csLabel = [classSection?.class_name, classSection?.section_name].filter(Boolean).join(' – ') || '—'
  const subjectLabel = subjectConfig?.subject_name ?? '—'

  // Build component name + max marks map
  const componentMap: Record<string, { name: string; maxMarks?: number }> = {}
  subjectConfig?.components.forEach((comp) => {
    componentMap[comp.id] = { name: comp.component_name, maxMarks: comp.max_marks ?? undefined }
  })

  // Build remark set map (for future remark-type components)
  const remarkSetMap: Record<string, { grade_letter: string; label: string }[]> = {}
  remarkSets.forEach((rs) => { remarkSetMap[rs.id] = rs.options })

  const componentIds = rows.length > 0 ? Object.keys(rows[0].marks) : []

  // Dirty count — students with unsaved changes
  const dirtyStudentIds = useMemo(() => {
    const ids = new Set<string>()
    Object.keys(localValues).forEach((id) => {
      if (Object.values(localValues[id] ?? {}).some((v) => v !== null && v !== '')) ids.add(id)
    })
    Object.keys(localAbsent).forEach((id) => ids.add(id))
    return ids
  }, [localValues, localAbsent])

  const getLocalValue = (studentId: string, compId: string) =>
    localValues[studentId]?.[compId] ?? rows.find((r) => r.student_id === studentId)?.marks[compId]?.marks_obtained ?? ''

  const isAbsent = (studentId: string) =>
    localAbsent[studentId] !== undefined
      ? localAbsent[studentId]
      : Object.values(rows.find((r) => r.student_id === studentId)?.marks ?? {}).some((m) => m.is_absent)

  const handleCellChange = (studentId: string, compId: string, value: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), [compId]: value },
    }))
  }

  const handleAbsentChange = (studentId: string, checked: boolean) => {
    setLocalAbsent((prev) => ({ ...prev, [studentId]: checked }))
    if (!checked) {
      setLocalValues((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
    }
  }

  const handleSaveAll = () => {
    const marks: Array<{
      student_id: string
      component_id: string
      marks_obtained: number | null
      is_absent: boolean
      remark_grade?: string | null
    }> = []

    rows.forEach((row) => {
      const absent = isAbsent(row.student_id)
      const hasDirty =
        localAbsent[row.student_id] !== undefined ||
        Object.values(localValues[row.student_id] ?? {}).some((v) => v !== null && v !== '')

      if (!hasDirty) return

      componentIds.forEach((compId) => {
        const localVal = localValues[row.student_id]?.[compId]
        const existingMarks = row.marks[compId]?.marks_obtained

        const marksObtained = absent
          ? null
          : localVal !== undefined && localVal !== '' && localVal !== null
            ? parseFloat(String(localVal))
            : (existingMarks ?? null)

        marks.push({
          student_id: row.student_id,
          component_id: compId,
          marks_obtained: marksObtained,
          is_absent: absent,
        })
      })
    })

    if (marks.length === 0) {
      toast.info('No changes to save')
      return
    }

    batchSaveMutation.mutate(marks, {
      onSuccess: () => {
        setLocalValues({})
        setLocalAbsent({})
      },
    })
  }

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true)
      const blob = await getMarkTemplate({
        exam_id: examId,
        class_id: classId,
        section_id: resolvedSectionId,
        subject_config_id: subjectConfigId,
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `marks-template-${subjectLabel}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Template downloaded')
    } catch {
      toast.error('Failed to download template')
    } finally {
      setIsDownloadingTemplate(false)
    }
  }

  const handleUploadExcel = async () => {
    if (!uploadFile) return
    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('class_id', classId)
      formData.append('section_id', resolvedSectionId)
      formData.append('subject_config_id', subjectConfigId)
      await uploadMarks(examId, formData)
      toast.success('Marks uploaded successfully')
      setUploadDialogOpen(false)
      setUploadFile(null)
    } catch {
      toast.error('Upload failed. Check the file format and try again.')
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/marks/${examId}/summary` as any })}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">
              Mark Entry — {exam?.exam_name ?? '…'}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {csLabel} · {subjectLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
          >
            {isDownloadingTemplate
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <Download className="mr-1.5 h-4 w-4" />}
            Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Upload Excel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAll}
            disabled={batchSaveMutation.isPending || dirtyStudentIds.size === 0}
          >
            {batchSaveMutation.isPending
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <Save className="mr-1.5 h-4 w-4" />}
            Save Marks
            {dirtyStudentIds.size > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                {dirtyStudentIds.size}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {dirtyStudentIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Unsaved changes for {dirtyStudentIds.size} student{dirtyStudentIds.size !== 1 ? 's' : ''}.
          Click <strong className="font-semibold">Save Marks</strong> to save.
        </div>
      )}

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No students found for this class-section.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="sticky left-0 z-10 bg-muted/40 px-4 py-2.5 text-left font-semibold">
                  Student
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                  Adm#
                </th>
                {componentIds.map((compId) => (
                  <th key={compId} className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                    {componentMap[compId]?.name ?? compId.slice(0, 8) + '…'}
                    {componentMap[compId]?.maxMarks != null && (
                      <span className="ml-1 font-normal text-muted-foreground text-xs">
                        /{componentMap[compId].maxMarks}
                      </span>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-center font-semibold">Absent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const absent = isAbsent(row.student_id)
                const isDirty = dirtyStudentIds.has(row.student_id)
                return (
                  <tr
                    key={row.student_id}
                    className={`border-b transition-colors last:border-0 ${
                      absent
                        ? 'bg-orange-50/60 dark:bg-orange-900/10'
                        : isDirty
                          ? 'bg-blue-50/40 dark:bg-blue-900/10'
                          : 'hover:bg-muted/10'
                    }`}
                  >
                    <td className="sticky left-0 z-10 bg-card px-4 py-2.5 font-medium">
                      {row.student_name}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {row.admission_number}
                    </td>
                    {componentIds.map((compId) => {
                      if (absent) {
                        return (
                          <td key={compId} className="px-3 py-2.5 text-center">
                            <Badge variant="secondary" className="text-xs">ABS</Badge>
                          </td>
                        )
                      }
                      return (
                        <td key={compId} className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            className="w-20 rounded border border-border bg-muted/30 px-2 py-1.5 text-center text-sm font-medium transition-colors hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                            value={getLocalValue(row.student_id, compId) as string}
                            placeholder="—"
                            onChange={(e) => handleCellChange(row.student_id, compId, e.target.value)}
                            min={0}
                            max={componentMap[compId]?.maxMarks}
                          />
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={absent}
                        onChange={(e) => handleAbsentChange(row.student_id, e.target.checked)}
                        className="h-4 w-4 cursor-pointer"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {page} · 50 students per page</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      {/* Excel Upload Dialog */}
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
              Download the template first, fill in the marks, then upload the completed file.
            </p>
            <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
              {uploadFile ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600">{uploadFile.name}</p>
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
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
              >
                {isDownloadingTemplate
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Download className="mr-2 h-4 w-4" />}
                Download Template
              </Button>
              <Button onClick={handleUploadExcel} disabled={!uploadFile || isUploading}>
                {isUploading
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
