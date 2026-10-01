import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Upload, School, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/badge'
import {
  useSchoolSettings,
  useUpdateSchoolSettings,
  useUploadSchoolImage,
  useUploadSchoolSignature,
} from '@/api/hooks/schoolSettings'
import { config } from '@/lib/config'

const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IGCSE', 'IB', 'Custom']

const mediaBase = config.api.baseURL.replace(/\/api\/v\d+$/, '')

const schema = z.object({
  school_name: z.string().optional(),
  contact_no: z
    .string()
    .refine(v => !v || /^\d{10}$/.test(v), { message: 'Must be exactly 10 digits' })
    .optional(),
  alt_contact_no: z
    .string()
    .refine(v => !v || /^\d{10}$/.test(v), { message: 'Must be exactly 10 digits' })
    .optional(),
  school_email: z
    .string()
    .refine(v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: 'Invalid email address' })
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  pin_code: z
    .string()
    .refine(v => !v || /^\d{6}$/.test(v), { message: 'Must be exactly 6 digits' })
    .optional(),
  country: z.string().optional(),
  academic_year: z.string().optional(),
  installation_date: z.string().optional(),
  school_board: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

function ImageUploadBox({
  label,
  currentUrl,
  onUpload,
  isPending,
}: {
  label: string
  currentUrl: string | null
  onUpload: (file: File) => void
  isPending: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fullUrl = currentUrl ? `${mediaBase}${currentUrl}` : null

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border bg-muted overflow-hidden">
          {fullUrl ? (
            <img src={fullUrl} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {isPending ? 'Uploading…' : 'Upload'}
          </Button>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP · Max 2 MB</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            onUpload(file)
            e.target.value = ''
          }
        }}
      />
    </div>
  )
}

export default function SchoolSettingsPage() {
  const { data: settings, isLoading } = useSchoolSettings()
  const updateMutation = useUpdateSchoolSettings()
  const uploadImageMutation = useUploadSchoolImage()
  const uploadSignatureMutation = useUploadSchoolSignature()

  const [customBoard, setCustomBoard] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      school_name: '',
      contact_no: '',
      alt_contact_no: '',
      school_email: '',
      address: '',
      city: '',
      state: '',
      district: '',
      pin_code: '',
      country: 'India',
      academic_year: '',
      installation_date: '',
      school_board: '',
    },
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = form
  const schoolBoard = watch('school_board')
  const isCustomBoard =
    schoolBoard === 'Custom' || (!!schoolBoard && !SCHOOL_BOARDS.includes(schoolBoard))

  useEffect(() => {
    if (settings) {
      const board = settings.school_board ?? ''
      const isKnown = SCHOOL_BOARDS.includes(board)
      reset({
        school_name: settings.school_name ?? '',
        contact_no: settings.contact_no ?? '',
        alt_contact_no: settings.alt_contact_no ?? '',
        school_email: settings.school_email ?? '',
        address: settings.address ?? '',
        city: settings.city ?? '',
        state: settings.state ?? '',
        district: settings.district ?? '',
        pin_code: settings.pin_code ?? '',
        country: settings.country ?? 'India',
        academic_year: settings.academic_year ?? '',
        installation_date: settings.installation_date ?? '',
        school_board: isKnown ? board : board ? 'Custom' : '',
      })
      if (!isKnown && board) setCustomBoard(board)
    }
  }, [settings, reset])

  const onSubmit = (values: FormValues) => {
    const boardValue = values.school_board === 'Custom' ? customBoard : (values.school_board ?? '')
    updateMutation.mutate({
      school_name: values.school_name || null,
      contact_no: values.contact_no || null,
      alt_contact_no: values.alt_contact_no || null,
      school_email: values.school_email || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      district: values.district || null,
      pin_code: values.pin_code || null,
      country: values.country || null,
      academic_year: values.academic_year || null,
      installation_date: values.installation_date || null,
      school_board: boardValue || null,
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
      <PageHeader
        title="School Settings"
        subtitle="Manage school registration and identity information"
        icon={<School className="h-5 w-5" />}
        actions={
          !settings && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Not configured yet
            </Badge>
          )
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: form fields */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Info */}
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium">School Name</label>
                  <Input {...register('school_name')} placeholder="e.g. Greenfield High School" />
                  <FieldError message={errors.school_name?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Contact No.</label>
                  <Input {...register('contact_no')} placeholder="9900099000" maxLength={10} />
                  <FieldError message={errors.contact_no?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Alt. Contact No.</label>
                  <Input {...register('alt_contact_no')} placeholder="9999900000" maxLength={10} />
                  <FieldError message={errors.alt_contact_no?.message} />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium">School Email</label>
                  <Input type="email" {...register('school_email')} placeholder="school@example.com" />
                  <FieldError message={errors.school_email?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">School Board</label>
                  <select
                    {...register('school_board')}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— Select Board —</option>
                    {SCHOOL_BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <FieldError message={errors.school_board?.message} />
                </div>
                {isCustomBoard && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Custom Board Name</label>
                    <Input
                      value={customBoard}
                      onChange={e => setCustomBoard(e.target.value)}
                      placeholder="Enter board name"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-sm font-medium">Academic Year</label>
                  <Input {...register('academic_year')} placeholder="2026-27" />
                  <FieldError message={errors.academic_year?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Installation Date</label>
                  <Input type="date" {...register('installation_date')} />
                  <FieldError message={errors.installation_date?.message} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Address</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-sm font-medium">Street Address</label>
                  <Input {...register('address')} placeholder="Akshara Nagar" />
                  <FieldError message={errors.address?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">City</label>
                  <Input {...register('city')} placeholder="Nizamabad" />
                  <FieldError message={errors.city?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">District</label>
                  <Input {...register('district')} placeholder="Nizamabad" />
                  <FieldError message={errors.district?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">State</label>
                  <Input {...register('state')} placeholder="Telangana" />
                  <FieldError message={errors.state?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">PIN Code</label>
                  <Input {...register('pin_code')} placeholder="503001" maxLength={6} />
                  <FieldError message={errors.pin_code?.message} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Country</label>
                  <Input {...register('country')} placeholder="India" />
                  <FieldError message={errors.country?.message} />
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} className="gap-2 min-w-32">
                {updateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                ) : (
                  <><Save className="h-4 w-4" />Save Settings</>
                )}
              </Button>
            </div>
          </div>

          {/* Right: images */}
          <div className="space-y-4">
            <ImageUploadBox
              label="School Logo"
              currentUrl={settings?.image_url ?? null}
              onUpload={(file) => uploadImageMutation.mutate(file)}
              isPending={uploadImageMutation.isPending}
            />
            <ImageUploadBox
              label="Principal Signature"
              currentUrl={settings?.principal_signature_url ?? null}
              onUpload={(file) => uploadSignatureMutation.mutate(file)}
              isPending={uploadSignatureMutation.isPending}
            />
          </div>
        </div>
      </form>
    </div>
  )
}
