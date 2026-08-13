import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import {
  Edit, Copy, Trash2, Loader2, Calendar, Lock,
  CheckCircle, BarChart3, Users, FileText, Clock, ClipboardList, Plus, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import ReactSelect from 'react-select'
import {
  useExamDetail,
  useDeleteExam,
  useCloneExam,
  useUpdateExam,
  useActivateExam,
  useDeactivateExam,
  useExamClassSections,
  useExamSubjectConfigs,
  useExamDates,
  useGradingSchemes,
} from '@/api/hooks/exam/useExam'
import { QuickSendButton } from '@/components/communication/QuickSendButton'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections'
import { useAuthStore } from '@/lib/authStore'
import { useAcademicYearStore } from '@/lib/academicYearStore'
import { useExamStore } from '@/lib/examStore'
import { useSelectStyles } from '@/lib/useSelectStyles'
import type { ExamStatus } from '@/types/exam'

const STATUS_BADGE: Record<ExamStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  published: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  locked: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  finalized: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

export default function ExamDetail() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const isAdmin = useAuthStore(s => {
    const roleName = s.role?.name?.toLowerCase() ?? ''
    return roleName === 'admin' || roleName === 'superadmin' || roleName === 'principal'
  })
  const { setActiveExam } = useExamStore()
  const { academicYears } = useAcademicYearStore()

  const [showClone, setShowClone] = useState(false)
  const [cloneName, setCloneName] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [showActivate, setShowActivate] = useState(false)
  const [showDeactivate, setShowDeactivate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [isEditDirty, setIsEditDirty] = useState(false)
  const [isCloneDirty, setIsCloneDirty] = useState(false)
  const [editForm, setEditForm] = useState({
    exam_name: '',
    exam_grade_scheme_id: null as string | null,
    subject_grade_scheme_id: null as string | null,
    mark_entry_deadline: '',
    hall_ticket_min_attendance: '',
    attendance_from_date: '',
    attendance_to_date: '',
    term: '',
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'dates' | 'marks' | 'permissions' | 'audit'>('overview')

  const selectStyles = useSelectStyles()
  const { examSchemes, subjectSchemes } = useGradingSchemes()

  const { data: exam, isLoading } = useExamDetail(id)
  const deleteMutation = useDeleteExam()
  const cloneMutation = useCloneExam()
  const updateMutation = useUpdateExam(id)
  const activateMutation = useActivateExam(id)
  const deactivateMutation = useDeactivateExam(id)
  const { data: classSections = [], isError: sectionsError } = useExamClassSections(id)
  const { data: subjectConfigs = [], isError: configsError } = useExamSubjectConfigs(id)
  const { data: examDates = [] } = useExamDates(id)
  const { data: subjectsList = [] } = useSubjectsDropdown({ active_only: false })
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))
  const { data: classesList = [] } = useClassSectionsDropdown()
  const classNameMap = Object.fromEntries(classesList.map(c => [c.id, c.name]))
  const sectionNameMap = Object.fromEntries(classesList.flatMap(c => c.sections.map(s => [s.id, s.name])))

  // Must be before early returns — Rules of Hooks: hooks cannot be called conditionally
  useEffect(() => {
    if (exam) setActiveExam(exam.id, exam.exam_name)
  }, [exam?.id, exam?.exam_name])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium">Exam not found</p>
        <Button variant="ghost" onClick={() => navigate({ to: '/exam/exams' as any })} className="mt-4">
          Back to Exams
        </Button>
      </div>
    )
  }

  const handleDelete = () => {
    deleteMutation.mutate(exam.id, {
      onSuccess: () => navigate({ to: '/exam/exams' as any }),
    })
  }

  const handleClone = () => {
    cloneMutation.mutate(
      { examId: exam.id, data: { new_name: cloneName } },
      {
        onSuccess: (data) => {
          setIsCloneDirty(false)
          setShowClone(false)
          navigate({ to: `/exam/exams/${data.id}` as any })
        },
      }
    )
  }

  const openEdit = () => {
    setEditForm({
      exam_name: exam.exam_name ?? '',
      exam_grade_scheme_id: (exam as any).exam_grade_scheme_id ?? null,
      subject_grade_scheme_id: (exam as any).subject_grade_scheme_id ?? null,
      mark_entry_deadline: exam.mark_entry_deadline ?? '',
      hall_ticket_min_attendance: exam.hall_ticket_min_attendance != null ? String(exam.hall_ticket_min_attendance) : '',
      attendance_from_date: exam.attendance_from_date ?? '',
      attendance_to_date: exam.attendance_to_date ?? '',
      term: (exam as any).term ?? '',
    })
    setIsEditDirty(false)
    setShowEdit(true)
  }

  const handleEdit = () => {
    updateMutation.mutate(
      {
        exam_name: editForm.exam_name || undefined,
        exam_grade_scheme_id: editForm.exam_grade_scheme_id ?? null,
        subject_grade_scheme_id: editForm.subject_grade_scheme_id ?? null,
        mark_entry_deadline: editForm.mark_entry_deadline || null,
        hall_ticket_min_attendance: editForm.hall_ticket_min_attendance !== '' ? Number(editForm.hall_ticket_min_attendance) : null,
        attendance_from_date: editForm.attendance_from_date || null,
        attendance_to_date: editForm.attendance_to_date || null,
        term: editForm.term || null,
      } as any,
      { onSuccess: () => { setIsEditDirty(false); setShowEdit(false) } }
    )
  }

  const TABS = [
    { key: 'overview', label: 'Overview', icon: ClipboardList },
    { key: 'dates', label: 'Dates', icon: Calendar },
    { key: 'marks', label: 'Marks', icon: BarChart3 },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{exam.exam_name}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[exam.status ?? 'draft']}`}>
              {exam.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {exam.board} · {exam.level?.replace('_', ' ')} · {exam.exam_type} · {exam.nature}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            {(exam.status === 'draft' || exam.status === 'active') && (
              <Button
                variant="outline"
                size="sm"
                onClick={openEdit}
                className="gap-1"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setCloneName(`${exam.exam_name} (Copy)`); setIsCloneDirty(false); setShowClone(true) }}
              className="gap-1"
            >
              <Copy className="h-4 w-4" />
              Clone
            </Button>
            {exam.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-blue-600 hover:text-blue-600"
                onClick={() => setShowActivate(true)}
              >
                <CheckCircle className="h-4 w-4" />
                Activate
              </Button>
            )}
            {exam.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-amber-600 hover:text-amber-600"
                onClick={() => setShowDeactivate(true)}
              >
                <Lock className="h-4 w-4" />
                Deactivate
              </Button>
            )}
            {exam.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-destructive hover:text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-4">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Academic Year</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {academicYears.find(y => String(y.id) === String(exam.academic_year_id))?.title ?? exam.academic_year_id}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Mark Entry Deadline</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">{exam.mark_entry_deadline ?? 'Not set'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Hall Ticket Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">
                  {exam.hall_ticket_min_attendance != null
                    ? `${exam.hall_ticket_min_attendance}% minimum`
                    : 'Not set'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Attendance Period</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">
                  {exam.attendance_from_date && exam.attendance_to_date
                    ? `${exam.attendance_from_date} → ${exam.attendance_to_date}`
                    : 'Not set'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Hall Ticket Status</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                {exam.hall_ticket_published ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <p className="font-semibold text-green-600">Published</p>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold text-muted-foreground">Not Published</p>
                  </>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Configured Subjects */}
          <div className="overflow-hidden rounded-lg border">
            <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
              <h3 className="text-sm font-semibold">Configured Subjects</h3>
              {!configsError && (
                <span className="text-xs text-muted-foreground">
                  {subjectConfigs.length} subject{subjectConfigs.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {configsError || sectionsError ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">
                Subject list requires backend endpoints{' '}
                <code>GET /exams/&#123;id&#125;/class-sections</code> and{' '}
                <code>GET /exams/&#123;id&#125;/subject-configs</code> (not yet implemented).
              </div>
            ) : subjectConfigs.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">No subjects configured for this exam.</div>
            ) : classSections.length > 0 ? (
              classSections.map((cs) => {
                const configs = subjectConfigs.filter(
                  (cfg) => cfg.class_id === cs.class_id && cfg.section_id === cs.section_id,
                )
                if (configs.length === 0) return null
                const csLabel = [
                  cs.class_name ?? classNameMap[cs.class_id],
                  cs.section_name ?? (cs.section_id ? sectionNameMap[cs.section_id] : null),
                ].filter(Boolean).join(' – ') || cs.class_id
                return (
                  <div key={cs.id} className="border-b px-4 py-3 last:border-0">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">{csLabel}</p>
                      <QuickSendButton
                        templateName="Exam Schedule"
                        targetType="class_section_parents"
                        targetRef={{ class_id: cs.class_id, section_id: cs.section_id ?? '' }}
                        recipientLabel={`Parents of ${csLabel}`}
                        variables={{
                          exam_name: exam.exam_name,
                          class_name: cs.class_name ?? classNameMap[cs.class_id],
                          section_name: cs.section_name ?? (cs.section_id ? sectionNameMap[cs.section_id] : ''),
                        }}
                        title="Send Exam Schedule Message"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {configs.map((cfg) => (
                        <Badge key={cfg.id} variant="secondary" className="text-xs">
                          {cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? cfg.subject_id}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {subjectConfigs.map((cfg) => (
                    <Badge key={cfg.id} variant="secondary" className="text-xs">
                      {cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? cfg.subject_id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Exam Dates</h3>
            <Button
              size="sm"
              onClick={() => navigate({ to: `/exam/exams/${exam.id}/dates` as any })}
              className="gap-1"
            >
              {isAdmin ? (
                <>
                  <Edit className="h-4 w-4" />
                  Manage Dates
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  View All Dates
                </>
              )}
            </Button>
          </div>
          {examDates.length === 0 ? (
            <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p>No exam dates scheduled yet.</p>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1"
                  onClick={() => navigate({ to: `/exam/exams/${exam.id}/dates` as any })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Dates
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                    <th className="px-4 py-2.5 text-left font-medium">Class</th>
                    <th className="px-4 py-2.5 text-left font-medium">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium">Time</th>
                    <th className="px-4 py-2.5 text-left font-medium">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {examDates.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">
                        {d.subject_name ?? subjectNameMap[d.subject_id] ?? d.subject_id}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {d.class_name ?? classNameMap[d.class_id] ?? d.class_id}
                        {(d.section_name ?? (d.section_id ? sectionNameMap[d.section_id] : null)) &&
                          ` – ${d.section_name ?? sectionNameMap[d.section_id!] ?? d.section_id}`}
                      </td>
                      <td className="px-4 py-2.5">{d.exam_date}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {d.start_time && d.end_time
                          ? `${d.start_time} – ${d.end_time}`
                          : d.start_time ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.venue ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'marks' && (
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Mark Entry</h3>
            <Button
              size="sm"
              onClick={() => navigate({ to: `/exam/marks/${exam.id}/summary` as any })}
              className="gap-1"
            >
              <BarChart3 className="h-4 w-4" />
              View Summary
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Click "View Summary" to see mark entry completion status across all classes and subjects.
          </p>
        </div>
      )}

      {activeTab === 'permissions' && isAdmin && (
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Mark Entry Permissions</h3>
            <Button
              size="sm"
              onClick={() => navigate({ to: `/exam/exams/${exam.id}/permissions` as any })}
              className="gap-1"
            >
              <Users className="h-4 w-4" />
              Manage Permissions
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Delegate mark-entry access to Clerk/CA staff for this exam.
          </p>
        </div>
      )}

      {activeTab === 'audit' && isAdmin && (
        <div className="rounded-lg border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">Audit Log</h3>
            <Button
              size="sm"
              onClick={() => navigate({ to: `/exam/exams/${exam.id}/audit` as any })}
              className="gap-1"
            >
              <FileText className="h-4 w-4" />
              View Audit Log
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Immutable audit trail of all exam-related actions.
          </p>
        </div>
      )}


      {/* Activate Dialog */}
      <Dialog open={showActivate} onOpenChange={setShowActivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Activating <strong>{exam.exam_name}</strong> will allow mark entry and hall ticket processing.
            You can still edit the exam after activation.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowActivate(false)}>Cancel</Button>
            <Button
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate(undefined, { onSuccess: () => setShowActivate(false) })}
              className="gap-2"
            >
              {activateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Activate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={showDeactivate} onOpenChange={setShowDeactivate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will move <strong>{exam.exam_name}</strong> back to Draft. Mark entry and hall ticket processing will be paused.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeactivate(false)}>Cancel</Button>
            <Button
              variant="outline"
              className="text-amber-600 hover:text-amber-600"
              disabled={deactivateMutation.isPending}
              onClick={() => deactivateMutation.mutate(undefined, { onSuccess: () => { setShowDeactivate(false); navigate({ to: '/exam/exams' as any }) } })}
            >
              {deactivateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Deactivate
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit} modal={false} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Board, level, nature, and academic year cannot be changed after creation.
          </p>
          <div className="grid gap-3 py-1 md:grid-cols-2" onChange={() => setIsEditDirty(true)}>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium">Exam Name</label>
              <Input
                value={editForm.exam_name}
                onChange={(e) => setEditForm(p => ({ ...p, exam_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Exam Grade Scheme</label>
              <ReactSelect
                options={[{ value: '__none__', label: '— None —' }, ...(examSchemes.data ?? []).map(s => ({ value: s.id, label: s.name }))]}
                value={(() => { const v = editForm.exam_grade_scheme_id; if (!v) return { value: '__none__', label: '— None —' }; const s = (examSchemes.data ?? []).find(s => s.id === v); return s ? { value: s.id, label: s.name } : { value: '__none__', label: '— None —' }; })()}
                onChange={opt => { setEditForm(p => ({ ...p, exam_grade_scheme_id: (!opt || opt.value === '__none__') ? null : opt.value })); setIsEditDirty(true) }}
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }), menu: base => ({ ...base, pointerEvents: 'auto' }) }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Subject Grade Scheme</label>
              <ReactSelect
                options={[{ value: '__none__', label: '— None —' }, ...(subjectSchemes.data ?? []).map(s => ({ value: s.id, label: s.name }))]}
                value={(() => { const v = editForm.subject_grade_scheme_id; if (!v) return { value: '__none__', label: '— None —' }; const s = (subjectSchemes.data ?? []).find(s => s.id === v); return s ? { value: s.id, label: s.name } : { value: '__none__', label: '— None —' }; })()}
                onChange={opt => { setEditForm(p => ({ ...p, subject_grade_scheme_id: (!opt || opt.value === '__none__') ? null : opt.value })); setIsEditDirty(true) }}
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                styles={{ ...selectStyles, menuPortal: base => ({ ...base, zIndex: 9999, pointerEvents: 'auto' }), menu: base => ({ ...base, pointerEvents: 'auto' }) }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Mark Entry Deadline</label>
              <Input
                type="date"
                value={editForm.mark_entry_deadline}
                onChange={(e) => setEditForm(p => ({ ...p, mark_entry_deadline: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Min Attendance %</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editForm.hall_ticket_min_attendance}
                onChange={(e) => setEditForm(p => ({ ...p, hall_ticket_min_attendance: e.target.value }))}
                placeholder="e.g. 75"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Attendance From</label>
              <Input
                type="date"
                value={editForm.attendance_from_date}
                onChange={(e) => setEditForm(p => ({ ...p, attendance_from_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Attendance To</label>
              <Input
                type="date"
                value={editForm.attendance_to_date}
                onChange={(e) => setEditForm(p => ({ ...p, attendance_to_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Term</label>
              <Input
                value={editForm.term}
                onChange={(e) => setEditForm(p => ({ ...p, term: e.target.value }))}
                placeholder="e.g. Term 1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={updateMutation.isPending || !editForm.exam_name.trim()}
              onClick={handleEdit}
              className="gap-2"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={showClone} onOpenChange={setShowClone} guardDirty={isCloneDirty} onDirtyDiscard={() => setIsCloneDirty(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Exam</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A copy of <strong>{exam.exam_name}</strong> will be created without marks.
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium">New Exam Name</label>
            <Input value={cloneName} onChange={(e) => { setCloneName(e.target.value); setIsCloneDirty(true) }} />
          </div>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={cloneMutation.isPending} onClick={handleClone}>
              {cloneMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{exam.exam_name}</strong> and all its dates. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={handleDelete}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
