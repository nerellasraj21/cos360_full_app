import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, BookOpen, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExamDetail, useMyMarks, useChildMarks } from '@/api/hooks/exam/useExam'
import { useAuthStore } from '@/lib/authStore'
import type { MarksSubjectView } from '@/types/exam'

function SubjectMarksCard({ subject }: { subject: MarksSubjectView }) {
  const totalObtained = subject.components.reduce((sum, c) => {
    if (c.is_absent) return sum
    return sum + (c.marks_obtained ?? 0)
  }, 0)
  const totalMax = subject.components.reduce((sum, c) => sum + (c.max_marks ?? 0), 0)

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Subject header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
        <span className="font-medium text-sm">{subject.subject_name ?? 'Unknown Subject'}</span>
        <span className="text-sm font-semibold tabular-nums">
          {totalMax > 0 ? (
            <span className={totalObtained / totalMax >= 0.35 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {totalObtained} / {totalMax}
            </span>
          ) : '—'}
        </span>
      </div>

      {/* Component rows */}
      <div className="divide-y">
        {subject.components.map((comp, idx) => (
          <div key={idx} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">{comp.component_name}</span>
            <div className="flex items-center gap-3">
              {comp.is_absent ? (
                <Badge variant="destructive" className="text-xs py-0">Absent</Badge>
              ) : comp.marks_obtained === null ? (
                <span className="text-muted-foreground text-xs">Not entered</span>
              ) : (
                <span className="tabular-nums font-medium">
                  {Number(comp.marks_obtained).toFixed(0)}
                  <span className="text-muted-foreground font-normal"> / {comp.max_marks ?? '—'}</span>
                </span>
              )}
              {comp.remark_grade && (
                <Badge variant="outline" className="text-xs py-0">{comp.remark_grade}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MyMarksPage() {
  const { examId } = useParams({ strict: false }) as { examId: string }
  const navigate = useNavigate()
  const { role, selectedStudent } = useAuthStore()

  const roleName = role?.name?.toLowerCase() ?? ''
  const isParent = roleName === 'parent'
  const isStudent = roleName === 'student'
  const childStudentId = selectedStudent?.id ?? null

  const { data: exam } = useExamDetail(examId)

  const studentQuery = useMyMarks(isStudent ? examId : '')
  const parentQuery = useChildMarks(isParent ? examId : '', isParent ? childStudentId : null)

  const { data: marks, isLoading, error } = isParent ? parentQuery : studentQuery

  const studentName = marks?.student_name ?? (isParent ? selectedStudent?.name : null)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/exam/results' as any })}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            {exam?.exam_name ?? 'My Marks'}
          </h1>
          {studentName && (
            <p className="text-xs text-muted-foreground mt-0.5">{studentName}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {(error as any)?.response?.data?.detail ?? 'Unable to load marks. Please try again.'}
          </p>
        </div>
      ) : !marks || marks.subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">No marks entered yet</p>
          <p className="text-sm text-muted-foreground">Marks will appear here once the teacher saves them.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {marks.subjects.map(subject => (
            <SubjectMarksCard key={subject.subject_config_id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  )
}
