import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Settings } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useExamSettings, useUpdateExamSettings } from '@/api/hooks/exam/useExam'

const settingsSchema = z.object({
  default_board: z.enum(['CBSE', 'ICSE', 'State', 'BTech', 'Custom']).nullable().optional(),
  custom_board_name: z.string().max(100).nullable().optional(),
  hall_ticket_min_attendance: z.coerce.number().min(0).max(100).nullable().optional(),
  hall_ticket_min_fee_paid_pct: z.coerce.number().min(0).max(100).nullable().optional(),
  grace_max_per_subject: z.coerce.number().int().min(0).nullable().optional(),
  grace_max_subjects: z.coerce.number().int().min(0).nullable().optional(),
  grace_auto_apply: z.boolean().default(false),
  reconduct_max_failed_subjects: z.coerce.number().int().min(0).default(2),
})

type SettingsForm = z.infer<typeof settingsSchema>

export default function ExamSettingsPage() {
  const { data: settings, isLoading } = useExamSettings()
  const updateMutation = useUpdateExamSettings()

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      default_board: null,
      custom_board_name: null,
      hall_ticket_min_attendance: 75,
      hall_ticket_min_fee_paid_pct: null,
      grace_max_per_subject: 2,
      grace_max_subjects: 3,
      grace_auto_apply: false,
      reconduct_max_failed_subjects: 2,
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        default_board: settings.default_board ?? null,
        custom_board_name: settings.custom_board_name ?? null,
        hall_ticket_min_attendance: settings.hall_ticket_min_attendance ?? 75,
        hall_ticket_min_fee_paid_pct: settings.hall_ticket_min_fee_paid_pct ?? null,
        grace_max_per_subject: settings.grace_max_per_subject ?? 2,
        grace_max_subjects: settings.grace_max_subjects ?? 3,
        grace_auto_apply: settings.grace_auto_apply ?? false,
        reconduct_max_failed_subjects: settings.reconduct_max_failed_subjects ?? 2,
      })
    }
  }, [settings, form])

  const onSubmit = (data: SettingsForm) => {
    updateMutation.mutate(data)
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
      <PageHeader title="Exam Settings" icon={<Settings className="h-5 w-5" />} subtitle="Configure school-wide exam defaults" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Board Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Board Configuration</CardTitle>
                <CardDescription>Default examination board settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="default_board"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Board</FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(v) => field.onChange(v || null)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select default board" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CBSE">CBSE</SelectItem>
                          <SelectItem value="ICSE">ICSE</SelectItem>
                          <SelectItem value="State">State Board</SelectItem>
                          <SelectItem value="BTech">BTech</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('default_board') === 'Custom' && (
                  <FormField
                    control={form.control}
                    name="custom_board_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Board Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} placeholder="Enter custom board name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Hall Ticket Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hall Ticket Settings</CardTitle>
                <CardDescription>Attendance threshold for hall ticket eligibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="hall_ticket_min_attendance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Attendance %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="75"
                          min={0}
                          max={100}
                        />
                      </FormControl>
                      <FormDescription>Students below this threshold are ineligible</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Fee Payment Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fee Payment Policy</CardTitle>
                <CardDescription>Minimum fee payment required as of exam date</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="hall_ticket_min_fee_paid_pct"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Fee Paid %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                          placeholder="50"
                          min={0}
                          max={100}
                        />
                      </FormControl>
                      <FormDescription>Students below this fee payment % cannot appear for exam</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
