import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Send, Loader2, MessageSquare } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useExamDetail, useSendExamNotification } from '@/api/hooks/exam/useExam'

const notificationSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters'),
  channels: z.array(z.enum(['sms', 'email', 'push'])).min(1, 'Select at least one channel'),
  target: z.enum(['students', 'parents', 'all']),
})

type FormData = z.infer<typeof notificationSchema>

const channelLabels: Record<string, string> = {
  sms: 'SMS',
  email: 'Email',
  push: 'Push Notification',
}

const targetLabels: Record<string, string> = {
  students: 'Students',
  parents: 'Parents',
  all: 'Students and Parents',
}

export default function ExamNotification() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()

  const { data: exam } = useExamDetail(id)
  const sendMutation = useSendExamNotification(id)

  const form = useForm<FormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      message: '',
      channels: ['push'],
      target: 'students',
    },
  })

  const channels = form.watch('channels')

  const toggleChannel = (ch: 'sms' | 'email' | 'push') => {
    const current = form.getValues('channels')
    form.setValue(
      'channels',
      current.includes(ch) ? current.filter(c => c !== ch) : [...current, ch],
      { shouldValidate: true }
    )
  }

  const onSubmit = (data: FormData) => {
    sendMutation.mutate(
      {
        notification_type: 'custom',
        message: data.message,
        target_audience: data.target,
        send_push: data.channels.includes('push'),
        send_sms: data.channels.includes('sms'),
        send_email: data.channels.includes('email'),
      },
      { onSuccess: () => form.reset() }
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Notifications - ${exam?.exam_name ?? ''}`}
        subtitle="Send exam-related notifications"
        icon={<MessageSquare className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: `/exam/exams/${id}` as any })} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(targetLabels) as [FormData['target'], string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => form.setValue('target', val)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    form.watch('target') === val
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(['sms', 'email', 'push'] as const).map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    channels.includes(ch)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {channelLabels[ch]}
                </button>
              ))}
            </div>
            {form.formState.errors.channels && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.channels.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label>Message</Label>
          <Textarea
            {...form.register('message')}
            placeholder="Enter your notification message..."
            rows={5}
            className="resize-none"
          />
          {form.formState.errors.message && (
            <p className="text-xs text-destructive">{form.formState.errors.message.message}</p>
          )}
          <p className="text-xs text-muted-foreground text-right">
            {form.watch('message').length} characters
          </p>
        </div>

        <Button type="submit" disabled={sendMutation.isPending}>
          {sendMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> Send Notification</>
          )}
        </Button>
      </form>

      <div className="max-w-xl rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground flex items-start gap-3">
        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Notifications will be sent based on the selected channels and target audience.
          Ensure student contact information is up-to-date before sending.
        </p>
      </div>
    </div>
  )
}
