import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, BarChart3, ChevronRight, AlertCircle, ServerCrash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExamDetail, useExamClassSections, useExamSubjectConfigs } from '@/api/hooks/exam/useExam'
import type { ExamClassSection, ExamSubjectConfig } from '@/types/exam'

export default function MarkEntrySummary() {
  const { examId } = useParams({ strict: false }) as { examId: string }
  const navigate = useNavigate()

  const { data: exam, isLoading: examLoading } = useExamDetail(examId)
  const {
    data: classSections = [],
    isLoading: sectionsLoading,
    isError: sectionsError,
  } = useExamClassSections(examId)
  const {
    data: subjectConfigs = [],
    isLoading: configsLoading,
    isError: configsError,
  } = useExamSubjectConfigs(examId)

  const isLoading = examLoading || sectionsLoading || configsLoading
  const isBackendError = sectionsError || configsError

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const goToGrid = (cs: ExamClassSection, config: ExamSubjectConfig) => {
    const sectionId = cs.section_id ?? 'null'
    navigate({
      to: `/exam/marks/${examId}/${cs.class_id}/${sectionId}/${config.id}` as any,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: `/exam/exams/${examId}` as any })}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold">Mark Entry</h1>
          {exam && (
            <p className="text-sm text-muted-foreground">
              {exam.exam_name} · {exam.board} · {exam.exam_type}
            </p>
          )}
        </div>
      </div>

      {/* Backend endpoints not yet implemented */}
      {isBackendError && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-900/20">
          <ServerCrash className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Backend endpoints not yet available
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The mark entry subject list requires two endpoints that are not yet implemented on the backend:
            </p>
            <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-700 dark:text-amber-400">
              <li><code>GET /exams/{'{exam_id}'}/class-sections</code></li>
              <li><code>GET /exams/{'{exam_id}'}/subject-configs</code></li>
            </ul>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Please ask the backend developer to add these endpoints. They should return the{' '}
              <code>ExamClassSection[]</code> and <code>ExamSubjectConfig[]</code> records linked to this exam.
            </p>
          </div>
        </div>
      )}

      {/* Empty state — no backend error but no data */}
      {!isBackendError && classSections.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/20 py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No class-sections assigned to this exam.</p>
          <p className="text-sm text-muted-foreground">Go back to the exam and configure class-sections first.</p>
        </div>
      )}

      {/* Class-section groups */}
      {!isBackendError && classSections.map((cs) => {
        const csLabel = [cs.class_name, cs.section_name].filter(Boolean).join(' – ') || cs.class_id
        const configs = subjectConfigs.filter(
          (cfg) => cfg.class_id === cs.class_id && cfg.section_id === cs.section_id,
        )

        return (
          <div key={cs.id} className="overflow-hidden rounded-lg border">
            {/* Class-section header */}
            <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
              <span className="font-semibold">{csLabel}</span>
              <Badge variant="secondary" className="text-xs">
                {configs.length} subject{configs.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {configs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No subjects configured for this class-section.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/10 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Components</th>
                    <th className="px-4 py-2 text-left">Max Marks</th>
                    <th className="px-4 py-2 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {configs.map((cfg) => {
                    const totalMarks = cfg.components
                      .filter((c) => c.include_in_total && c.entry_type === 'marks')
                      .reduce((sum, c) => sum + (c.max_marks ?? 0), 0)

                    return (
                      <tr
                        key={cfg.id}
                        className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/20"
                        onClick={() => goToGrid(cs, cfg)}
                      >
                        <td className="px-4 py-3 font-medium">
                          {cfg.subject_name ?? cfg.subject_id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {cfg.components.map((comp) => (
                              <Badge key={comp.id} variant="outline" className="text-xs">
                                {comp.component_name}
                                {comp.entry_type === 'marks' && comp.max_marks != null && (
                                  <span className="ml-1 text-muted-foreground">/{comp.max_marks}</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {totalMarks > 0 ? (
                            <span className="font-semibold text-primary">{totalMarks}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs">
                            Enter Marks
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  )
}
