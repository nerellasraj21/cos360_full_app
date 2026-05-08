import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Download, Search, RefreshCw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExamDetail, useStudentResults, useComputeAggregate } from '@/api/hooks/exam/useExam'
import { ResultsTable } from '@/components/exam/ResultsTable'
import * as XLSX from 'xlsx'

export default function StudentResults() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const { data: exam } = useExamDetail(id)
  const { data: results = [], isLoading } = useStudentResults(id)
  const computeMutation = useComputeAggregate(id)

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
