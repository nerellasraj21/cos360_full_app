import { useState, useEffect, useMemo } from 'react'
import { Plus, Eye, Copy, Trash2, Loader2, ClipboardList, MoreHorizontal, Edit, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useExamList, useDeleteExam, useCloneExam, useExamGradeSchemes, useUpdateExam } from '@/api/hooks/exam/useExam'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useAcademicYearStore } from '@/lib/academicYearStore'
import { useAuthStore } from '@/lib/authStore'
import type { ExamListItem, ExamStatus, ExamNature, ExamBoard, ExamLevel } from '@/types/exam'

// ---------------------------------------------------------------------------
// Edit Exam Dialog (subcomponent)
// ---------------------------------------------------------------------------
interface EditExamDialogProps {
  exam: ExamListItem
  onClose: () => void
}

function EditExamDialog({ exam, onClose }: EditExamDialogProps) {
  const updateMutation = useUpdateExam(exam.id)
  const [form, setForm] = useState({
    exam_name: exam.exam_name,
    mark_entry_deadline: exam.mark_entry_deadline ?? '',
    hall_ticket_min_attendance: exam.hall_ticket_min_attendance != null ? String(exam.hall_ticket_min_attendance) : '',
    attendance_from_date: exam.attendance_from_date ?? '',
    attendance_to_date: exam.attendance_to_date ?? '',
    publish_rank: !!(exam as any).publish_rank,
    term: (exam as any).term ?? '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(
      {
        exam_name: form.exam_name || undefined,
        mark_entry_deadline: form.mark_entry_deadline || undefined,
        hall_ticket_min_attendance: form.hall_ticket_min_attendance !== '' ? Number(form.hall_ticket_min_attendance) : undefined,
        attendance_from_date: form.attendance_from_date || undefined,
        attendance_to_date: form.attendance_to_date || undefined,
        publish_rank: form.publish_rank,
        term: form.term || undefined,
      },
      { onSuccess: () => onClose() }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Board, level, nature, and academic year cannot be changed after creation.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-sm font-medium">Exam Name</label>
          <Input
            value={form.exam_name}
            onChange={(e) => setForm(p => ({ ...p, exam_name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Mark Entry Deadline</label>
          <Input
            type="date"
            value={form.mark_entry_deadline}
            onChange={(e) => setForm(p => ({ ...p, mark_entry_deadline: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Min Attendance %</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.hall_ticket_min_attendance}
            onChange={(e) => setForm(p => ({ ...p, hall_ticket_min_attendance: e.target.value }))}
            placeholder="e.g. 75"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Attendance From</label>
          <Input
            type="date"
            value={form.attendance_from_date}
            onChange={(e) => setForm(p => ({ ...p, attendance_from_date: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Attendance To</label>
          <Input
            type="date"
            value={form.attendance_to_date}
            onChange={(e) => setForm(p => ({ ...p, attendance_to_date: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Term</label>
          <Input
            value={form.term}
            onChange={(e) => setForm(p => ({ ...p, term: e.target.value }))}
            placeholder="e.g. Term 1"
            maxLength={20}
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            id="list_edit_publish_rank"
            checked={form.publish_rank}
            onChange={(e) => setForm(p => ({ ...p, publish_rank: e.target.checked }))}
            className="h-4 w-4"
          />
          <label htmlFor="list_edit_publish_rank" className="cursor-pointer text-sm">Publish Rank</label>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={updateMutation.isPending || !form.exam_name.trim()}>
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<ExamStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  published: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  locked: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  finalized: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
}

const NATURE_LABEL: Record<ExamNature, string> = {
  formative: 'Formative',
  summative: 'Summative',
  cumulative: 'Cumulative',
  custom: 'Custom',
}

export default function ExamList() {
  const navigate = useNavigate()
  const { selectedAcademicYearId, academicYears, fetchAndSetAcademicYears } = useAcademicYearStore()

  useEffect(() => {
    if (academicYears.length === 0) fetchAndSetAcademicYears()
  }, [academicYears.length, fetchAndSetAcademicYears])
  const isAdmin = useAuthStore(s => {
    const roleName = s.user?.role?.name?.toLowerCase() ?? ''
    return roleName === 'admin' || roleName === 'superadmin' || roleName === 'principal'
  })

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [natureFilter, setNatureFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [cloneTarget, setCloneTarget] = useState<ExamListItem | null>(null)
  const [cloneName, setCloneName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ExamListItem | null>(null)
  const [editTarget, setEditTarget] = useState<ExamListItem | null>(null)
  const [isEditDirty, setIsEditDirty] = useState(false)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
  }

  const { data: exams = [], isLoading } = useExamList(
    selectedAcademicYearId
      ? {
          academic_year_id: selectedAcademicYearId,
          ...(statusFilter !== 'all' ? { status: statusFilter as ExamStatus } : {}),
          ...(natureFilter !== 'all' ? { nature: natureFilter as ExamNature } : {}),
        }
      : {}
  )

  const deleteMutation = useDeleteExam()
  const cloneMutation = useCloneExam()
  const { data: gradeSchemes = [] } = useExamGradeSchemes()
  const { data: subjectsList = [] } = useSubjectsDropdown()
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))

  const filtered = useMemo(() => {
    let items = exams.filter(e =>
      searchQuery === '' || e.exam_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aVal = String((a as any)[sortKey] ?? '')
        const bVal = String((b as any)[sortKey] ?? '')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return items
  }, [exams, searchQuery, sortKey, sortDir])

  const hasGradingSetup = gradeSchemes.length > 0

  const handleClone = () => {
    if (!cloneTarget) return
    cloneMutation.mutate(
      { examId: cloneTarget.id, data: { new_name: cloneName } },
      {
        onSuccess: (data) => {
          setCloneTarget(null)
          navigate({ to: `/exam/exams/${data.id}` as any })
        },
      }
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Exam Management</h1>
            <p className="text-sm text-muted-foreground">Manage all examinations for the academic year</p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => navigate({ to: '/exam/exams/create' as any })}
            disabled={!hasGradingSetup}
            title={!hasGradingSetup ? 'Set up grading schemes before creating an exam' : ''}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Exam
          </Button>
        )}
      </div>

      {/* Grading warning */}
      {isAdmin && !hasGradingSetup && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Setup required:</strong> Configure at least one Exam Grade Scheme before creating exams.{' '}
            <button
              onClick={() => navigate({ to: '/exam/grading/exam-schemes' as any })}
              className="underline hover:no-underline"
            >
              Go to Grade Schemes
            </button>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span>Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search exams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="locked">Locked</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
          </SelectContent>
        </Select>
        <Select value={natureFilter} onValueChange={setNatureFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Nature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Nature</SelectItem>
            <SelectItem value="formative">Formative</SelectItem>
            <SelectItem value="summative">Summative</SelectItem>
            <SelectItem value="cumulative">Cumulative</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No exams found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {exams.length === 0
                ? 'Create your first exam to get started.'
                : 'No exams match your current filters.'}
            </p>
            {isAdmin && exams.length === 0 && (
              <Button
                onClick={() => navigate({ to: '/exam/exams/create' as any })}
                className="mt-4 gap-2"
                disabled={!hasGradingSetup}
              >
                <Plus className="h-4 w-4" />
                Create First Exam
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('exam_name')}>Exam Name <SortIcon col="exam_name" /></th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('board')}>Board <SortIcon col="board" /></th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('exam_type')}>Type <SortIcon col="exam_type" /></th>
                <th className="px-4 py-3 text-left font-medium">Subjects</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('level')}>Level <SortIcon col="level" /></th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('nature')}>Nature <SortIcon col="nature" /></th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('status')}>Status <SortIcon col="status" /></th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('mark_entry_deadline')}>Deadline <SortIcon col="mark_entry_deadline" /></th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((exam, idx) => (
                <tr
                  key={exam.id}
                  className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                  style={{ height: '48px' }}
                  onClick={() => navigate({ to: `/exam/exams/${exam.id}` as any })}
                >
                  <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{exam.exam_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exam.board}</td>
                  <td className="px-4 py-3 text-muted-foreground">{exam.exam_type}</td>
                  <td className="px-4 py-3">
                    {exam.subjects && exam.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {exam.subjects.slice(0, 3).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {subjectNameMap[s] ?? s}
                          </Badge>
                        ))}
                        {exam.subjects.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{exam.subjects.length - 3}</Badge>
                        )}
                      </div>
                    ) : (exam.subject_config_count ?? 0) > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {exam.subject_config_count} subject{exam.subject_config_count !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{exam.level.replace('_', ' ')}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs capitalize">{NATURE_LABEL[exam.nature]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[exam.status]}`}>
                      {exam.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {exam.mark_entry_deadline ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate({ to: `/exam/exams/${exam.id}` as any })}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => { setIsEditDirty(false); setEditTarget(exam); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Exam
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setCloneTarget(exam)
                                setCloneName(`${exam.exam_name} (Copy)`)
                              }}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Clone Exam
                            </DropdownMenuItem>
                            {exam.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteTarget(exam)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null); }} guardDirty={isEditDirty} onDirtyDiscard={() => setIsEditDirty(false)}>
        <DialogContent className="max-w-lg" onChange={() => setIsEditDirty(true)}>
          <DialogHeader>
            <DialogTitle>Edit Exam</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <EditExamDialog exam={editTarget} onClose={() => { setIsEditDirty(false); setEditTarget(null); }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={!!cloneTarget} onOpenChange={() => setCloneTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Exam</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A copy of <strong>{cloneTarget?.exam_name}</strong> will be created without marks. Continue?
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium">New Exam Name</label>
            <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCloneTarget(null)}>Cancel</Button>
            <Button disabled={cloneMutation.isPending} onClick={handleClone}>
              {cloneMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clone
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete <strong>{deleteTarget?.exam_name}</strong> and all its dates. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
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
