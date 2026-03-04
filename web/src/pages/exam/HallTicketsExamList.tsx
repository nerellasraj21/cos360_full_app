import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Ticket, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useExamList } from '@/api/hooks/exam/useExam'
import { useAcademicYearStore } from '@/lib/academicYearStore'
import type { ExamStatus } from '@/types/exam'

const STATUS_BADGE: Record<ExamStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  published: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  locked: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  finalized: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

export default function HallTicketsExamList() {
  const navigate = useNavigate()
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'exam_name' | 'board' | 'status' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears()
  }, [academicYears.length, fetchAndSetAcademicYears])

  const { data: exams = [], isLoading } = useExamList(
    selectedAcademicYearId ? { academic_year_id: selectedAcademicYearId } : {}
  )

  // Show exams that are active or beyond — hall tickets relevant for non-draft exams
  const ticketExams = exams.filter(e => e.status !== 'draft')

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-50" />
    return sortDir === 'asc'
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />
  }

  const filteredExams = useMemo(() => {
    const q = searchQuery.toLowerCase()
    let result = ticketExams.filter(e =>
      e.exam_name.toLowerCase().includes(q) ||
      e.board.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    )
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        const cmp = av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [ticketExams, searchQuery, sortKey, sortDir])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Ticket className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hall Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Manage eligibility and download hall tickets for each exam
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filters</span>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search exam, board, status..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : ticketExams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Ticket className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No exams available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {exams.length === 0
                ? 'No exams found for this academic year.'
                : 'No exams are in an active state for hall ticket management.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate({ to: '/exam/exams' as any })}
            >
              View All Exams
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('exam_name')}>
                  Exam Name <SortIcon col="exam_name" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('board')}>
                  Board <SortIcon col="board" />
                </th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Nature</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No exams match your search.
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam, idx) => (
                  <tr
                    key={exam.id}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                    style={{ height: '48px' }}
                    onClick={() => navigate({ to: `/exam/hall-tickets/${exam.id}` as any })}
                  >
                    <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{exam.exam_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exam.board}</td>
                    <td className="px-4 py-3 text-muted-foreground">{exam.exam_type}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">{exam.nature}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[exam.status]}`}>
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <Ticket className="h-3 w-3" />
                        Manage
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
