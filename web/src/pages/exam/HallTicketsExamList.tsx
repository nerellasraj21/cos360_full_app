import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Ticket, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears()
  }, [academicYears.length, fetchAndSetAcademicYears])

  const { data: exams = [], isLoading } = useExamList(
    selectedAcademicYearId ? { academic_year_id: selectedAcademicYearId } : {}
  )

  // Show exams that are active or beyond — hall tickets relevant for non-draft exams
  const ticketExams = exams.filter(e => e.status !== 'draft')

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
                <th className="px-4 py-3 text-left font-medium">Exam Name</th>
                <th className="px-4 py-3 text-left font-medium">Board</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Nature</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {ticketExams.map((exam) => (
                <tr
                  key={exam.id}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                  onClick={() => navigate({ to: `/exam/hall-tickets/${exam.id}` as any })}
                >
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
