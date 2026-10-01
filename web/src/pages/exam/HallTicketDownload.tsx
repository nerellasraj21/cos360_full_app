import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, Loader2, Eye, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections'
import {
  useExamDetail,
  useHallTicketEligibility,
  useExamDates,
} from '@/api/hooks/exam/useExam'
import { HallTicketCard } from '@/components/exam/HallTicketCard'
import { downloadAllHallTickets, downloadHallTicket } from '@/api/exam'
import { toast } from 'sonner'
import type { HallTicketEligibility } from '@/types/exam'

export default function HallTicketDownload() {
  const { examId } = useParams({ strict: false }) as { examId: string }
  const navigate = useNavigate()
  const [previewStudent, setPreviewStudent] = useState<HallTicketEligibility | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-75" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
  }
  const { data: exam } = useExamDetail(examId)
  const { eligible: eligibleQuery } = useHallTicketEligibility(examId)
  const eligible = eligibleQuery.data ?? []
  const isLoading = eligibleQuery.isLoading
  const { data: examDates = [] } = useExamDates(examId)
  const { data: classesList = [] } = useClassSectionsDropdown()
  const classNameMap = Object.fromEntries(classesList.map(c => [c.id, c.name]))
  const sectionNameMap = Object.fromEntries(classesList.flatMap(c => c.sections.map(sec => [sec.id, sec.name])))

  const filteredEligible = useMemo(() => {
    let items = eligible
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(s =>
        (s.student_name ?? '').toLowerCase().includes(q) ||
        (s.admission_number ?? '').toLowerCase().includes(q) ||
        (classNameMap[s.class_id] ?? '').toLowerCase().includes(q)
      )
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aVal = sortKey === 'class_name' ? (classNameMap[a.class_id] ?? '') : String((a as any)[sortKey] ?? '')
        const bVal = sortKey === 'class_name' ? (classNameMap[b.class_id] ?? '') : String((b as any)[sortKey] ?? '')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return items
  }, [eligible, searchQuery, sortKey, sortDir])

  const handleDownloadAll = async () => {
    try {
      setDownloading('all')
      const blob = await downloadAllHallTickets(examId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hall-tickets-${exam?.exam_name ?? 'exam'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Hall tickets downloaded')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  const handleDownloadOne = async (studentId: string) => {
    try {
      setDownloading(studentId)
      const blob = await downloadHallTicket(examId, studentId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `hall-ticket-${eligible.find(e => e.student_id === studentId)?.admission_number ?? 'student'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Downloaded')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Download Hall Tickets - ${exam?.exam_name ?? ''}`}
        subtitle={`${eligible.length} eligible students`}
        icon={<Download className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: `/exam/hall-tickets/${examId}` as any })} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleDownloadAll} disabled={downloading === 'all' || eligible.length === 0}>
              {downloading === 'all' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading students...</span>
        </div>
      ) : eligibleQuery.isError ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">{eligibleQuery.error instanceof Error ? eligibleQuery.error.message : 'Failed to load eligible students.'}</p>
        </div>
      ) : eligible.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No eligible students found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <FilterBar className="mb-0">
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search by student name or admission number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </FilterBar>
          <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('student_name')}>Student <SortIcon col="student_name" /></th>
                <th className="px-3 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('admission_number')}>Adm# <SortIcon col="admission_number" /></th>
                <th className="px-3 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('class_name')}>Class / Section <SortIcon col="class_name" /></th>
                <th className="px-3 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEligible.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No students match your search' : 'No eligible students'}</td></tr>
              ) : filteredEligible.map((student, idx) => (
                <tr key={student.student_id} className="border-b hover:bg-muted/10" style={{ height: '48px' }}>
                  <td className="px-4 py-2 text-muted-foreground text-sm">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium">{student.student_name ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{student.admission_number ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {classNameMap[student.class_id] ?? '—'}{student.section_id && sectionNameMap[student.section_id] ? ` / ${sectionNameMap[student.section_id]}` : ''}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        title="Preview hall ticket"
                        onClick={() => setPreviewStudent(student)}
                      >
                        <Eye className="h-3 w-3" />
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        disabled={downloading === student.student_id}
                        onClick={() => handleDownloadOne(student.student_id)}
                      >
                        {downloading === student.student_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <Dialog open={!!previewStudent} onOpenChange={() => setPreviewStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Hall Ticket Preview</DialogTitle>
          </DialogHeader>
          {previewStudent && (
            <HallTicketCard
              eligibility={previewStudent}
              examName={exam?.exam_name ?? ''}
              examDates={examDates}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
