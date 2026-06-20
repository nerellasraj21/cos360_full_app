import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Loader2, BookOpen, ClipboardList, Award, Ticket, Settings, Plus, Filter, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/PageHeader'
import { Input } from '@/components/ui/input'
import { useExamList } from '@/api/hooks/exam/useExam'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useAcademicYearStore } from '@/lib/academicYearStore'
import { useAuthStore } from '@/lib/authStore'
import type { ExamListItem } from '@/types/exam'

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  locked: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  finalized: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

function ExamTable({ exams, subjectNameMap, sectionLabel }: { exams: ExamListItem[]; subjectNameMap: Record<string, string>; sectionLabel: string }) {
  const navigate = useNavigate()
  if (exams.length === 0) return null
  return (
    <section>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {sectionLabel}
      </h2>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Exam Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Board</th>
              <th className="px-4 py-2.5 text-left font-medium">Nature</th>
              <th className="px-4 py-2.5 text-left font-medium">Subjects</th>
              <th className="px-4 py-2.5 text-left font-medium">Deadline</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-center font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam, i) => (
              <tr key={exam.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">{exam.exam_name}</td>
                <td className="px-4 py-2.5">
                  <Badge variant="secondary" className="text-xs">{exam.board}</Badge>
                </td>
                <td className="px-4 py-2.5 capitalize text-muted-foreground">{exam.nature}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {(exam.subject_config_count ?? 0) > 0
                    ? `${exam.subject_config_count} subject${exam.subject_config_count !== 1 ? 's' : ''}`
                    : '—'}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{exam.mark_entry_deadline ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColor[exam.status] ?? ''}`}>
                    {exam.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => navigate({ to: `/exam/exams/${exam.id}` as any })}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default function ExamDashboard() {
  const navigate = useNavigate()
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears()
  }, [academicYears.length, fetchAndSetAcademicYears])

  const isAdmin = useAuthStore(s => {
    const roleName = s.role?.name?.toLowerCase() ?? ''
    return roleName === 'admin' || roleName === 'superadmin' || roleName === 'principal'
  })

  const [searchQuery, setSearchQuery] = useState('')

  const selectedYear = academicYears.find(y => String(y.id) === String(selectedAcademicYearId))
  const { data: exams = [], isLoading } = useExamList({ academic_year_id: selectedAcademicYearId || undefined })
  const { data: subjectsList = [] } = useSubjectsDropdown()
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))

  const filteredExams = useMemo(() =>
    searchQuery.trim() === ''
      ? exams
      : exams.filter(e => e.exam_name.toLowerCase().includes(searchQuery.toLowerCase())),
    [exams, searchQuery]
  )

  const byStatus = (status: string) => filteredExams.filter(e => e.status === status)

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
        actions={isAdmin ? (
          <Button onClick={() => navigate({ to: '/exam/exams/create' as any })} className="gap-2">
            <Plus className="h-4 w-4" />
            New Exam
          </Button>
        ) : null}
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

      {/* Filter Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>
        <div className="relative max-w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
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

      {/* Exam Tables */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <ExamTable exams={byStatus('active')} subjectNameMap={subjectNameMap} sectionLabel="Active Exams" />
          <ExamTable exams={byStatus('draft')} subjectNameMap={subjectNameMap} sectionLabel="Draft Exams" />
          <ExamTable exams={byStatus('locked')} subjectNameMap={subjectNameMap} sectionLabel="Locked Exams" />
          <ExamTable exams={byStatus('published')} subjectNameMap={subjectNameMap} sectionLabel="Published Exams" />

          {filteredExams.length === 0 && (
            <div className="rounded-lg border bg-muted/20 p-8 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {exams.length === 0
                  ? 'No exams found for this academic year.'
                  : 'No exams match your search.'}
              </p>
              {isAdmin && exams.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate({ to: '/exam/exams/create' as any })}
                >
                  Create First Exam
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
