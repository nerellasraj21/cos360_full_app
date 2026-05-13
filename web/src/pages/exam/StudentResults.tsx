import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Download, Search, RefreshCw, ChevronDown, Award, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  useExamDetail,
  useStudentResults,
  useComputeAggregate,
  useMyResult,
  useChildResult,
} from '@/api/hooks/exam/useExam'
import { ResultsTable } from '@/components/exam/ResultsTable'
import { useAuthStore } from '@/lib/authStore'
import * as XLSX from 'xlsx'
import type { StudentExamResult } from '@/types/exam'

// ---------------------------------------------------------------------------
// Shared result card — used by both StudentResultView and ParentResultView
// ---------------------------------------------------------------------------
function ResultSummaryCard({ result }: { result: StudentExamResult }) {
  return (
    <div className="space-y-4">
      {/* Overall result */}
      <div className={`rounded-lg border p-6 ${
        result.is_passed
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      }`}>
        <div className="flex items-center gap-4">
          {result.is_passed
            ? <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
            : <XCircle className="h-10 w-10 text-destructive shrink-0" />}
          <div>
            <p className={`text-lg font-semibold ${result.is_passed ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
              {result.is_passed ? 'Pass' : 'Fail'}
            </p>
            {result.grade_label && (
              <p className="text-sm text-muted-foreground">Grade: <strong>{result.grade_label}</strong></p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Marks</p>
          <p className="text-xl font-bold">
            {result.total_marks_obtained != null ? Number(result.total_marks_obtained).toFixed(1) : '—'}
            <span className="text-sm text-muted-foreground font-normal"> / {result.total_max_marks ?? '—'}</span>
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Percentage</p>
          <p className="text-xl font-bold">
            {result.percentage != null ? `${Number(result.percentage).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">GPA</p>
          <p className="text-xl font-bold">
            {result.gpa != null ? Number(result.gpa).toFixed(2) : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Rank</p>
          <p className="text-xl font-bold">
            {result.rank != null ? `#${result.rank}` : '—'}
          </p>
        </div>
      </div>

      {/* Subject breakdown */}
      {result.subject_results && result.subject_results.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Marks</th>
                <th className="px-4 py-3 text-left font-medium">%</th>
                <th className="px-4 py-3 text-left font-medium">Grade</th>
                <th className="px-4 py-3 text-left font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {result.subject_results.map((sr) => (
                <tr key={sr.subject_config_id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{sr.subject_name ?? '—'}</td>
                  <td className="px-4 py-2">
                    {sr.is_absent ? (
                      <Badge variant="destructive" className="text-xs">Absent</Badge>
                    ) : (
                      `${sr.marks_obtained != null ? Number(sr.marks_obtained).toFixed(1) : '—'} / ${sr.max_marks ?? '—'}`
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {sr.percentage != null ? `${Number(sr.percentage).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-2">{sr.grade_label ?? '—'}</td>
                  <td className="px-4 py-2">
                    {sr.is_passed != null ? (
                      <span className={sr.is_passed ? 'text-green-600' : 'text-destructive'}>
                        {sr.is_passed ? 'Pass' : 'Fail'}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Student view — own result (exam_results: read_own)
// ---------------------------------------------------------------------------
function StudentResultView({ examId }: { examId: string }) {
  const navigate = useNavigate()
  const { data: exam } = useExamDetail(examId)
  const { data: result, isLoading, error } = useMyResult(examId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/exam/results' as any })} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Results — {exam?.exam_name ?? '...'}</h1>
          <p className="text-xs text-muted-foreground">Your exam result</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Results have not been published yet. Check back later.</p>
        </div>
      ) : !result ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No result found for this exam.</p>
        </div>
      ) : (
        <ResultSummaryCard result={result} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parent view — child's result
// ---------------------------------------------------------------------------
function ParentResultView({ examId }: { examId: string }) {
  const navigate = useNavigate()
  const { data: exam } = useExamDetail(examId)
  const selectedStudent = useAuthStore(s => s.selectedStudent)
  const { data: result, isLoading, error } = useChildResult(examId, selectedStudent?.id ?? null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/exam/results' as any })} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Results — {exam?.exam_name ?? '...'}</h1>
          {selectedStudent && <p className="text-xs text-muted-foreground">{selectedStudent.name}</p>}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Results have not been published yet. Check back later.</p>
        </div>
      ) : !result ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No result found for this exam.</p>
        </div>
      ) : (
        <ResultSummaryCard result={result} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin view — all students (existing behaviour, unchanged)
// ---------------------------------------------------------------------------
function AdminResultView({ examId }: { examId: string }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const { data: exam } = useExamDetail(examId)
  const { data: results = [], isLoading } = useStudentResults(examId)
  const computeMutation = useComputeAggregate(examId)

  const canCompute = exam?.status === 'active' || exam?.status === 'locked'

  const filtered = results.filter(r =>
    !search ||
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.admission_number?.toLowerCase().includes(search.toLowerCase())
  )

  const subjectHeaders = results[0]?.subject_results?.map(sr => ({
    id: sr.subject_config_id,
    name: sr.subject_name,
  })) ?? []

  const buildRows = () =>
    filtered.map((row, idx) => {
      const base: Record<string, string> = {
        'S.No.': String(idx + 1),
        'Student': row.student_name ?? '',
        'Adm#': row.admission_number ?? '',
      }
      subjectHeaders.forEach(s => {
        const sr = row.subject_results?.find(r => r.subject_config_id === s.id)
        base[s.name ?? s.id] = sr
          ? sr.is_absent
            ? 'ABS'
            : sr.marks_obtained != null ? String(Number(sr.marks_obtained)) : '—'
          : '—'
      })
      base['Total'] = row.total_marks_obtained != null ? Number(row.total_marks_obtained).toFixed(1) : '—'
      base['%'] = row.percentage != null ? `${Number(row.percentage).toFixed(1)}%` : '—'
      base['Grade'] = row.grade_label ?? '—'
      base['GPA'] = row.gpa != null ? Number(row.gpa).toFixed(2) : '—'
      base['Rank'] = row.rank != null ? String(row.rank) : '—'
      base['Result'] = row.is_passed != null ? (row.is_passed ? 'Pass' : 'Fail') : '—'
      return base
    })

  const handleExportCSV = () => {
    const rows = buildRows()
    if (rows.length === 0) return
    const headers = Object.keys(rows[0]).join(',')
    const body = rows.map(row =>
      Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob([`${headers}\n${body}`], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `${exam?.exam_name ?? 'results'}_results.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setExportMenuOpen(false)
  }

  const handleExportExcel = () => {
    const rows = buildRows()
    if (rows.length === 0) return
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results')
    XLSX.writeFile(workbook, `${exam?.exam_name ?? 'results'}_results.xlsx`)
    setExportMenuOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/results` as any })}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Results — {exam?.exam_name ?? '...'}</h1>
            <p className="text-xs text-muted-foreground">
              {results.length} students · {exam?.status ?? ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCompute && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => computeMutation.mutate()}
              disabled={computeMutation.isPending}
            >
              {computeMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Computing...</>
                : <><RefreshCw className="h-4 w-4" /> Compute Results</>
              }
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 w-56"
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setExportMenuOpen(prev => !prev)}
              disabled={filtered.length === 0}
            >
              <Download className="h-4 w-4" />
              Export
              <ChevronDown className="h-3 w-3" />
            </Button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1 w-40 rounded-md border bg-popover shadow-md z-50">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground rounded-t-md"
                  onClick={handleExportCSV}
                >
                  Export to CSV
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground rounded-b-md"
                  onClick={handleExportExcel}
                >
                  Export to Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ResultsTable results={filtered} isLoading={isLoading || computeMutation.isPending} />

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {results.length} students
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Router — picks view based on role
// ---------------------------------------------------------------------------
export default function StudentResults() {
  const { id } = useParams({ strict: false }) as { id: string }
  const role = useAuthStore(s => s.role?.name?.toLowerCase() ?? '')

  if (role === 'student') return <StudentResultView examId={id} />
  if (role === 'parent') return <ParentResultView examId={id} />
  return <AdminResultView examId={id} />
}
