import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, Send, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useExamDetail, useComputeAggregate, usePublishResults } from '@/api/hooks/exam/useExam'

export default function ResultsPublish() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const [confirmPublish, setConfirmPublish] = useState(false)

  const { data: exam, isLoading } = useExamDetail(id)
  const computeMutation = useComputeAggregate(id)
  const publishMutation = usePublishResults(id)

  const isPublished = exam?.status === 'published' || exam?.status === 'finalized'
  const canCompute = exam?.status === 'active' || exam?.status === 'locked'
  const canPublish = exam?.status === 'locked'

  const handleCompute = () => {
    computeMutation.mutate()
  }

  const handlePublish = () => {
    publishMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmPublish(false)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading exam...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Results - ${exam?.exam_name ?? ''}`}
        subtitle="Compute aggregates and publish results"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={isPublished ? 'default' : 'secondary'} className="capitalize">
              {exam?.status ?? '—'}
            </Badge>
            <Button variant="outline" onClick={() => navigate({ to: `/exam/exams/${id}` as any })} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Step 1 — Compute Aggregates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Recalculate total marks, percentages, grades, ranks, and GPA for all students.
            Run this after all marks have been entered and verified.
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCompute}
              disabled={!canCompute || computeMutation.isPending}
            >
              {computeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Computing...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Run Compute</>
              )}
            </Button>
            {computeMutation.isSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" /> Done
              </span>
            )}
            {!canCompute && !isPublished && (
              <span className="text-xs text-muted-foreground">
                Exam must be in Active or Locked status to compute.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Step 2 — Publish Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Publishing makes results visible to students and parents. This action cannot be undone
            without unlocking the exam.
          </p>

          {isPublished ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Results have been published.
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="default"
                onClick={() => setConfirmPublish(true)}
                disabled={!canPublish || publishMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                Publish Results
              </Button>
              {!canPublish && (
                <span className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  Exam must be in Locked status to publish.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">View Results</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => navigate({ to: `/exam/results/${id}` as any })}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Open Results View
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish Results?"
        description={`This will make results visible to all students and parents for ${exam?.exam_name ?? 'this exam'}. This action cannot be undone without unlocking the exam.`}
        confirmLabel="Publish"
        pendingLabel="Publishing..."
        isPending={publishMutation.isPending}
        isDestructive={false}
        onConfirm={handlePublish}
      />
    </div>
  )
}
