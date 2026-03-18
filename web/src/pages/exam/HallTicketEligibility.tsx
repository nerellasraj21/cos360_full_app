import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, Users, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  useExamDetail,
  useEnrolledStudents,
  useHallTicketEligibility,
  useComputeHallTickets,
  usePublishHallTickets,
} from '@/api/hooks/exam/useExam'
import { EligibilityPanel } from '@/components/exam/EligibilityPanel'
import { toast } from 'sonner'

export default function HallTicketEligibility() {
  const { examId } = useParams({ strict: false }) as { examId: string }
  const navigate = useNavigate()
  const [confirmPublish, setConfirmPublish] = useState(false)

  const { data: exam } = useExamDetail(examId)
  const enrolledQuery = useEnrolledStudents(examId)
  const enrolled = enrolledQuery.data ?? []
  const { eligible: eligibleQuery, ineligible: ineligibleQuery } = useHallTicketEligibility(examId)
  const eligible = eligibleQuery.data ?? []
  const ineligible = ineligibleQuery.data ?? []
  const computeMutation = useComputeHallTickets(examId)
  const publishMutation = usePublishHallTickets(examId)

  const handleCompute = () => {
    computeMutation.mutate(undefined, {
      onSuccess: () => toast.success('Hall ticket eligibility computed'),
    })
  }

  const handlePublish = () => {
    publishMutation.mutate(undefined, {
      onSuccess: () => {
        setConfirmPublish(false)
        toast.success('Hall tickets published')
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/exams/${examId}` as any })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Hall Tickets — {exam?.exam_name ?? '...'}</h1>
            <p className="text-xs text-muted-foreground">Manage eligibility and publish</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCompute}
            disabled={computeMutation.isPending}
          >
            {computeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recompute
          </Button>
          <Button
            size="sm"
            onClick={() => setConfirmPublish(true)}
            disabled={publishMutation.isPending}
          >
            Publish Hall Tickets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/exam/hall-tickets/${examId}/download` as any })}
          >
            Download
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{enrolled.length}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-green-600">{eligible.length}</p>
            <p className="text-xs text-muted-foreground">Eligible</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <XCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-2xl font-bold text-destructive">{ineligible.length}</p>
            <p className="text-xs text-muted-foreground">Ineligible</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            All Students
            <Badge variant="secondary" className="text-xs">{enrolled.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="eligible" className="gap-2">
            Eligible
            <Badge variant="secondary" className="text-xs">{eligible.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="ineligible" className="gap-2">
            Ineligible
            <Badge variant="destructive" className="text-xs">{ineligible.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          {enrolledQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : enrolled.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No students found for this exam's class-sections.</p>
            </div>
          ) : (
            <div className="rounded-lg border divide-y">
              {enrolled.map((s) => (
                <div key={s.student_id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div>
                    <p className="font-medium">{s.student_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{s.admission_number || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="eligible" className="mt-4">
          <EligibilityPanel
            examId={examId}
            items={eligible}
            isLoading={eligibleQuery.isLoading}
            showOverride={false}
          />
        </TabsContent>

        <TabsContent value="ineligible" className="mt-4">
          <EligibilityPanel
            examId={examId}
            items={ineligible}
            isLoading={ineligibleQuery.isLoading}
            showOverride={true}
          />
        </TabsContent>
      </Tabs>

      {/* Confirm Publish */}
      <Dialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Hall Tickets?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will make hall tickets visible to eligible students for{' '}
            <strong>{exam?.exam_name}</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPublish(false)}>Cancel</Button>
            <Button onClick={handlePublish} disabled={publishMutation.isPending}>
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
