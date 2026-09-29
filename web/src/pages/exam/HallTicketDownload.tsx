import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Download, Loader2, Eye, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
  }
  const { data: exam } = useExamDetail(examId)
  const { eligible: eligibleQuery } = useHallTicketEligibility(examId)
  const eligible = eligibleQuery.data ?? []
  const isLoading = eligibleQuery.isLoading
  const { data: examDates = [] } = useExamDates(examId)

  const filteredEligible = useMemo(() => {
    let items = eligible
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(s =>
        (s.student_name ?? '').toLowerCase().includes(q) ||
        (s.admission_number ?? '').toLowerCase().includes(q) ||
        (s.class_name ?? '').toLowerCase().includes(q)
      )
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aVal = String((a as any)[sortKey] ?? '')
        const bVal = String((b as any)[sortKey] ?? '')
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
      a.download = `hall-tickets-${examId}.pdf`
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
      a.download = `hall-ticket-${studentId}.pdf`
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/hall-tickets/${examId}` as any })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Download Hall Tickets — {exam?.exam_name ?? '...'}</h1>
            <p className="text-xs text-muted-foreground">{eligible.length} eligible students</p>
          </div>
        </div>
        <Button
          onClick={handleDownloadAll}
          disabled={downloading === 'all' || eligible.length === 0}
        >
          {downloading === 'all' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download All
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : eligible.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No eligible students found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </div>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search by student name or admission number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </div>
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
                  <td className="px-4 py-2 font-medium">{student.student_name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{student.admission_number}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {student.class_name ?? '—'} {student.section_name ? `/ ${student.section_name}` : ''}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
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

      {/* Preview Dialog */}
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
