import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Settings } from 'lucide-react'
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
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exam Settings</h1>
          <p className="text-sm text-muted-foreground">Configure school-wide exam defaults</p>
        </div>
      </div>

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

            {/* Grace Marks Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grace Marks Policy</CardTitle>
                <CardDescription>Configure automatic grace mark application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="grace_max_per_subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Grace per Subject</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="2"
                          min={0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grace_max_subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Subjects for Grace</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="3"
                          min={0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="grace_auto_apply"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Auto-apply Grace Marks</FormLabel>
                        <FormDescription>Automatically apply grace marks when computing results</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Reconduct Policy */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reconduct Policy</CardTitle>
                <CardDescription>Settings for supplementary / re-examination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="reconduct_max_failed_subjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Failed Subjects for Reconduct</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                          placeholder="2"
                          min={0}
                        />
                      </FormControl>
                      <FormDescription>Students with more fails than this cannot appear for reconduct</FormDescription>
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
