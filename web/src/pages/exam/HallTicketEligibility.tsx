import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, Users, CheckCircle, XCircle, Download, Ticket } from 'lucide-react'
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
import { downloadHallTicket } from '@/api/exam'
import { useAuthStore } from '@/lib/authStore'
import { EligibilityPanel } from '@/components/exam/EligibilityPanel'
import { toast } from 'sonner'
import type { IneligibilityReason } from '@/types/exam'

// ---------------------------------------------------------------------------
// Student view — own hall ticket only (exam_hall_tickets: read_own / list_own)
// Backend filters /eligible and /ineligible by JWT identity for student role,
// returning only that student's own record.
// ---------------------------------------------------------------------------
function StudentHallTicketView({ examId }: { examId: string }) {
  const navigate = useNavigate()
  const { data: exam } = useExamDetail(examId)
  const { eligible: eligibleQuery, ineligible: ineligibleQuery } = useHallTicketEligibility(examId)
  const eligible = eligibleQuery.data ?? []
  const ineligible = ineligibleQuery.data ?? []
  const isLoading = eligibleQuery.isLoading || ineligibleQuery.isLoading
  // Backend returns at most one record per student (their own)
  const ticket = eligible[0] ?? ineligible[0] ?? null
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!ticket) return
    try {
      setDownloading(true)
      const blob = await downloadHallTicket(examId, ticket.student_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hall-ticket.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Hall ticket downloaded')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const ineligibilityText = (reason: IneligibilityReason | null) => {
    if (reason === 'FEE_PENDING') return 'Fee payment pending'
    if (reason === 'LOW_ATTENDANCE') return 'Attendance below required percentage'
    if (reason === 'BOTH') return 'Fee payment pending and attendance below requirement'
    return 'Contact your administrator for details'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/exam/hall-tickets' as any })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Hall Ticket — {exam?.exam_name ?? '...'}</h1>
          <p className="text-xs text-muted-foreground">Your hall ticket eligibility status</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !ticket ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Ticket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">You are not enrolled in this exam.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status card */}
          <div className={`rounded-lg border p-6 ${
            ticket.is_eligible
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center gap-4">
              {ticket.is_eligible
                ? <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
                : <XCircle className="h-10 w-10 text-destructive shrink-0" />}
              <div>
                <p className={`text-lg font-semibold ${
                  ticket.is_eligible ? 'text-green-700 dark:text-green-400' : 'text-destructive'
                }`}>
                  {ticket.is_eligible
                    ? 'You are eligible for the hall ticket'
                    : 'You are not eligible for the hall ticket'}
                </p>
                {ticket.is_eligible && ticket.hall_ticket_number && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Hall Ticket No: <strong>{ticket.hall_ticket_number}</strong>
                  </p>
                )}
                {!ticket.is_eligible && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {ineligibilityText(ticket.ineligibility_reason)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Attendance & Fee details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Attendance</p>
              <p className="text-2xl font-bold">
                {ticket.attendance_percent != null ? `${Number(ticket.attendance_percent).toFixed(1)}%` : '—'}
              </p>
              <p className={`text-xs mt-1 ${ticket.attendance_ok ? 'text-green-600' : 'text-destructive'}`}>
                {ticket.attendance_ok ? 'Meets requirement' : 'Below requirement'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Fee Status</p>
              <p className="text-2xl font-bold">{ticket.fee_paid ? 'Paid' : 'Pending'}</p>
              <p className={`text-xs mt-1 ${ticket.fee_paid ? 'text-green-600' : 'text-destructive'}`}>
                {ticket.fee_paid ? 'All fees cleared' : 'Payment required'}
              </p>
            </div>
          </div>

          {ticket.is_eligible && exam?.hall_ticket_published && (
            <Button className="gap-2" onClick={handleDownload} disabled={downloading}>
              {downloading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              Download Hall Ticket
            </Button>
          )}
          {ticket.is_eligible && !exam?.hall_ticket_published && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Hall tickets have not been published yet. Check back later.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Parent view — filtered to the selected child only (client-side filter)
// ---------------------------------------------------------------------------
function ParentHallTicketView({ examId }: { examId: string }) {
  const navigate = useNavigate()
  const { data: exam } = useExamDetail(examId)
  const selectedStudent = useAuthStore(s => s.selectedStudent)
  const { eligible: eligibleQuery, ineligible: ineligibleQuery } = useHallTicketEligibility(examId)
  const eligible = eligibleQuery.data ?? []
  const ineligible = ineligibleQuery.data ?? []
  const isLoading = eligibleQuery.isLoading || ineligibleQuery.isLoading
  const [downloading, setDownloading] = useState(false)

  // Filter to only the selected child's record
  const childId = selectedStudent?.id
  const ticket =
    eligible.find(t => t.student_id === childId) ??
    ineligible.find(t => t.student_id === childId) ??
    null

  const handleDownload = async () => {
    if (!ticket) return
    try {
      setDownloading(true)
      const blob = await downloadHallTicket(examId, ticket.student_id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'hall-ticket.pdf'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Hall ticket downloaded')
    } catch {
      toast.error('Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const ineligibilityText = (reason: IneligibilityReason | null) => {
    if (reason === 'FEE_PENDING') return 'Fee payment pending'
    if (reason === 'LOW_ATTENDANCE') return 'Attendance below required percentage'
    if (reason === 'BOTH') return 'Fee payment pending and attendance below requirement'
    return 'Contact your administrator for details'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/exam/hall-tickets' as any })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Hall Ticket — {exam?.exam_name ?? '...'}</h1>
          <p className="text-xs text-muted-foreground">
            {selectedStudent?.name ? `Showing hall ticket for ${selectedStudent.name}` : 'Hall ticket eligibility status'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !ticket ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Ticket className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            {selectedStudent?.name
              ? `${selectedStudent.name} is not enrolled in this exam.`
              : 'Student is not enrolled in this exam.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-lg border p-6 ${
            ticket.is_eligible
              ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
          }`}>
            <div className="flex items-center gap-4">
              {ticket.is_eligible
                ? <CheckCircle className="h-10 w-10 text-green-500 shrink-0" />
                : <XCircle className="h-10 w-10 text-destructive shrink-0" />}
              <div>
                <p className={`text-lg font-semibold ${
                  ticket.is_eligible ? 'text-green-700 dark:text-green-400' : 'text-destructive'
                }`}>
                  {ticket.is_eligible
                    ? `${selectedStudent?.name ?? 'Your child'} is eligible for the hall ticket`
                    : `${selectedStudent?.name ?? 'Your child'} is not eligible for the hall ticket`}
                </p>
                {ticket.is_eligible && ticket.hall_ticket_number && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Hall Ticket No: <strong>{ticket.hall_ticket_number}</strong>
                  </p>
                )}
                {!ticket.is_eligible && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {ineligibilityText(ticket.ineligibility_reason)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Attendance</p>
              <p className="text-2xl font-bold">
                {ticket.attendance_percent != null ? `${Number(ticket.attendance_percent).toFixed(1)}%` : '—'}
              </p>
              <p className={`text-xs mt-1 ${ticket.attendance_ok ? 'text-green-600' : 'text-destructive'}`}>
                {ticket.attendance_ok ? 'Meets requirement' : 'Below requirement'}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Fee Status</p>
              <p className="text-2xl font-bold">{ticket.fee_paid ? 'Paid' : 'Pending'}</p>
              <p className={`text-xs mt-1 ${ticket.fee_paid ? 'text-green-600' : 'text-destructive'}`}>
                {ticket.fee_paid ? 'All fees cleared' : 'Payment required'}
              </p>
            </div>
          </div>

          {ticket.is_eligible && exam?.hall_ticket_published && (
            <Button className="gap-2" onClick={handleDownload} disabled={downloading}>
              {downloading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              Download Hall Ticket
            </Button>
          )}
          {ticket.is_eligible && !exam?.hall_ticket_published && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Hall tickets have not been published yet. Check back later.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Admin view — all students (existing behaviour, unchanged)
// ---------------------------------------------------------------------------
function AdminHallTicketView({ examId }: { examId: string }) {
  const navigate = useNavigate()
  const [confirmPublish, setConfirmPublish] = useState(false)
  const canManage = useAuthStore(s => s.hasPermission('exams', 'update'))

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
          {canManage && (
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
          )}
          {canManage && (
            <Button
              size="sm"
              onClick={() => setConfirmPublish(true)}
              disabled={publishMutation.isPending}
            >
              Publish Hall Tickets
            </Button>
          )}
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

// ---------------------------------------------------------------------------
// Router — picks the correct view based on role
// ---------------------------------------------------------------------------
export default function HallTicketEligibility() {
  const { examId } = useParams({ strict: false }) as { examId: string }
  const roleName = useAuthStore(s => s.role?.name?.toLowerCase() ?? '')

  if (roleName === 'student') return <StudentHallTicketView examId={examId} />
  if (roleName === 'parent') return <ParentHallTicketView examId={examId} />
  return <AdminHallTicketView examId={examId} />
}
