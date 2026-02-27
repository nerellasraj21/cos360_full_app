import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Send, Loader2, MessageSquare } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useExamDetail } from '@/api/hooks/exam/useExam'
import { sendExamNotification } from '@/api/exam'
import { toast } from 'sonner'

const notificationSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters'),
  channels: z.array(z.enum(['sms', 'whatsapp', 'push'])).min(1, 'Select at least one channel'),
  target: z.enum(['all', 'failed', 'eligible', 'ineligible']),
})

type FormData = z.infer<typeof notificationSchema>

const channelLabels: Record<string, string> = {
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  push: 'Push Notification',
}

const targetLabels: Record<string, string> = {
  all: 'All Students',
  failed: 'Failed Students',
  eligible: 'Hall Ticket Eligible',
  ineligible: 'Hall Ticket Ineligible',
}

export default function ExamNotification() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const [sending, setSending] = useState(false)

  const { data: exam } = useExamDetail(id)

  const form = useForm<FormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      message: '',
      channels: ['push'],
      target: 'all',
    },
  })

  const channels = form.watch('channels')

  const toggleChannel = (ch: 'sms' | 'whatsapp' | 'push') => {
    const current = form.getValues('channels')
    form.setValue(
      'channels',
      current.includes(ch) ? current.filter(c => c !== ch) : [...current, ch],
      { shouldValidate: true }
    )
  }

  const onSubmit = async (data: FormData) => {
    try {
      setSending(true)
      await sendExamNotification(id, data)
      toast.success('Notification sent successfully')
      form.reset()
    } catch {
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: `/exam/exams/${id}` as any })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Notifications — {exam?.exam_name ?? '...'}</h1>
          <p className="text-xs text-muted-foreground">Send exam-related notifications</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
        {/* Target */}
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

        {/* Channels */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(['sms', 'whatsapp', 'push'] as const).map(ch => (
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

        {/* Message */}
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

        <Button type="submit" disabled={sending}>
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> Send Notification</>
          )}
        </Button>
      </form>

      {/* Info */}
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
