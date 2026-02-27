import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, BarChart3, Send, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useExamDetail, useComputeAggregate, usePublishResults } from '@/api/hooks/exam/useExam'
import { toast } from 'sonner'

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
    computeMutation.mutate(undefined, {
      onSuccess: () => toast.success('Aggregates computed successfully'),
    })
  }

  const handlePublish = () => {
    publishMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmPublish(false)
        toast.success('Results published successfully')
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/exams/${id}` as any })}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Results — {exam?.exam_name ?? '...'}</h1>
            <p className="text-xs text-muted-foreground">Compute aggregates and publish results</p>
          </div>
        </div>
        <Badge
          variant={isPublished ? 'default' : 'secondary'}
          className="capitalize"
        >
          {exam?.status ?? '—'}
        </Badge>
      </div>

      {/* Step 1: Compute */}
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
              <span className="flex items-center gap-1 text-sm text-green-600">
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

      {/* Step 2: Publish */}
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

      {/* View Results */}
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

      {/* Confirm Publish Dialog */}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Results?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will make results visible to all students and parents for{' '}
            <strong>{exam?.exam_name}</strong>. This action cannot be undone without unlocking the exam.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPublish(false)}>Cancel</Button>
            <Button
              variant="default"
              onClick={handlePublish}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Publishing...</>
              ) : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
