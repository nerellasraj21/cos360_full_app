import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Loader2, BookOpen, ClipboardList, Award, Ticket, Settings, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useExamList } from '@/api/hooks/exam/useExam'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useAcademicYearStore } from '@/lib/academicYearStore'
import type { ExamListItem } from '@/types/exam'

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  locked: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  finalized: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function ExamCard({ exam, subjectNameMap }: { exam: ExamListItem; subjectNameMap: Record<string, string> }) {
  const navigate = useNavigate()
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate({ to: `/exam/exams/${exam.id}` as any })}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{exam.exam_name}</CardTitle>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[exam.status] ?? ''}`}>
            {exam.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">{exam.board}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{exam.nature}</Badge>
          {exam.exam_type && (
            <Badge variant="outline" className="text-xs">{exam.exam_type}</Badge>
          )}
        </div>
        {exam.subjects && exam.subjects.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {exam.subjects.slice(0, 4).map((s) => (
              <Badge key={s} variant="secondary" className="text-xs">
                {subjectNameMap[s] ?? s}
              </Badge>
            ))}
            {exam.subjects.length > 4 && (
              <Badge variant="outline" className="text-xs">+{exam.subjects.length - 4} more</Badge>
            )}
          </div>
        ) : (exam.subject_config_count ?? 0) > 0 ? (
          <p className="text-xs text-muted-foreground">
            {exam.subject_config_count} subject{exam.subject_config_count !== 1 ? 's' : ''} configured
          </p>
        ) : null}
        {exam.mark_entry_deadline && (
          <p className="text-xs text-muted-foreground">
            Deadline: {exam.mark_entry_deadline}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function ExamDashboard() {
  const navigate = useNavigate()
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears()
  }, [academicYears.length, fetchAndSetAcademicYears])

  const selectedYear = academicYears.find(y => String(y.id) === String(selectedAcademicYearId))
  const { data: exams = [], isLoading } = useExamList({ academic_year_id: selectedAcademicYearId || undefined })
  const { data: subjectsList = [] } = useSubjectsDropdown()
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))

  const byStatus = (status: string) => exams.filter(e => e.status === status)

  const quickLinks = [
    { label: 'All Exams', icon: BookOpen, to: '/exam/exams' },
    { label: 'Mark Entry', icon: ClipboardList, to: '/exam/marks' },
    { label: 'Results', icon: Award, to: '/exam/results' },
    { label: 'Hall Tickets', icon: Ticket, to: '/exam/hall-tickets' },
    { label: 'Settings', icon: Settings, to: '/exam/settings' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Management"
        subtitle={selectedYear ? `Academic Year: ${selectedYear.title}` : 'All academic years'}
        icon={<ClipboardList className="h-5 w-5" />}
        actions={
          <Button onClick={() => navigate({ to: '/exam/exams/create' as any })} className="gap-2">
            <Plus className="h-4 w-4" />
            New Exam
          </Button>
        }
      />

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {quickLinks.map(link => (
          <button
            key={link.label}
            onClick={() => navigate({ to: link.to as any })}
            className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
          >
            <link.icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-center">{link.label}</span>
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['draft', 'active', 'locked', 'published'] as const).map(status => (
          <div key={status} className="rounded-lg border bg-card p-4">
            <p className="text-2xl font-bold">{byStatus(status).length}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{status}</p>
          </div>
        ))}
      </div>

      {/* Active Exams */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {byStatus('active').length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Active Exams
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byStatus('active').map(e => <ExamCard key={e.id} exam={e} subjectNameMap={subjectNameMap} />)}
              </div>
            </section>
          )}

          {byStatus('draft').length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Draft Exams
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byStatus('draft').map(e => <ExamCard key={e.id} exam={e} subjectNameMap={subjectNameMap} />)}
              </div>
            </section>
          )}

          {exams.length === 0 && (
            <div className="rounded-lg border bg-muted/20 p-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No exams found for this academic year.</p>
              <Button
                className="mt-4"
                onClick={() => navigate({ to: '/exam/exams/create' as any })}
              >
                Create First Exam
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
