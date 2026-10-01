import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Plus, Edit, Trash2, Loader2, Calendar, ArrowLeft, Save, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/DatePicker'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections'
import { TimePicker } from '@/components/ui/TimePicker'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useExamDates, useCreateExamDate, useUpdateExamDate, useDeleteExamDate, useExamDetail } from '@/api/hooks/exam/useExam'
import type { ExamDate, ExamDatePayload } from '@/types/exam'
import { useAuthStore } from '@/lib/authStore'

export default function ExamDates() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const isParent = useAuthStore(s => s.role?.name?.toLowerCase() === 'parent')

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ExamDate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<ExamDatePayload>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: exam } = useExamDetail(id)
  const { data: dates = [], isLoading, isError, error } = useExamDates(id)
  const { data: classesList = [] } = useClassSectionsDropdown()
  const { data: subjectsList = [] } = useSubjectsDropdown({ active_only: false })
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))
  const classNameMap = Object.fromEntries(classesList.map(c => [c.id, c.name]))
  const sectionNameMap = Object.fromEntries(classesList.flatMap(c => c.sections.map(sec => [sec.id, sec.name])))
  const formSections = classesList.find(c => c.id === formData.class_id)?.sections ?? []
  const canSave = !!formData.class_id && !!formData.subject_id && !!formData.exam_date
  const createMutation = useCreateExamDate()
  const updateMutation = useUpdateExamDate()
  const deleteMutation = useDeleteExamDate()

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-75" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
  }
  const filteredDates = useMemo(() => {
    let items = dates
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(d =>
        (subjectNameMap[d.subject_id] ?? '').toLowerCase().includes(q) ||
        (classNameMap[d.class_id] ?? '').toLowerCase().includes(q) ||
        (d.venue ?? '').toLowerCase().includes(q)
      )
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aVal = String((a as any)[sortKey] ?? '')
        const bVal = String((b as any)[sortKey] ?? '')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return items
  }, [dates, searchQuery, sortKey, sortDir])

  const openCreate = () => {
    setFormData({ exam_id: id, exam_date: '', start_time: null, end_time: null, venue: null, notes: null })
    setEditTarget(null)
    setIsDirty(false)
    setShowForm(true)
  }

  const openEdit = (date: ExamDate) => {
    setFormData({
      exam_id: date.exam_id,
      class_id: date.class_id,
      section_id: date.section_id,
      subject_id: date.subject_id,
      exam_date: date.exam_date,
      start_time: date.start_time,
      end_time: date.end_time,
      venue: date.venue,
      notes: date.notes,
    })
    setEditTarget(date)
    setIsDirty(false)
    setShowForm(true)
  }

  const handleSave = () => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: formData }, { onSuccess: () => { setIsDirty(false); setShowForm(false) } })
    } else {
      createMutation.mutate(formData as ExamDatePayload, { onSuccess: () => { setIsDirty(false); setShowForm(false) } })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading exam dates...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Failed to load exam dates.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exam Dates"
        subtitle={exam?.exam_name}
        icon={<Calendar className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: `/exam/exams/${id}` as any })} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {!isParent && (
              <Button onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Date
              </Button>
            )}
          </div>
        }
      />

      {dates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No exam dates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add date, time, and venue for each subject</p>
            {!isParent && (
              <Button onClick={openCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add First Date
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
        <FilterBar className="mb-0">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by subject, class or venue..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </FilterBar>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('subject_name')}>Subject <SortIcon col="subject_name" /></th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('class_name')}>Class <SortIcon col="class_name" /></th>
                <th className="px-4 py-3 text-left font-medium">Section</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('exam_date')}>Date <SortIcon col="exam_date" /></th>
                <th className="px-4 py-3 text-left font-medium">Start</th>
                <th className="px-4 py-3 text-left font-medium">End</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('venue')}>Venue <SortIcon col="venue" /></th>
                {!isParent && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredDates.length === 0 ? (
                <tr><td colSpan={isParent ? 8 : 9} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No dates match your search' : 'No exam dates'}</td></tr>
              ) : filteredDates.map((date, idx) => (
                <tr key={date.id} className="border-b transition-colors hover:bg-muted/20" style={{ height: '48px' }}>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{subjectNameMap[date.subject_id] ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{classNameMap[date.class_id] ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(date.section_id && sectionNameMap[date.section_id]) || '—'}</td>
                  <td className="px-4 py-3">{date.exam_date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.start_time ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.end_time ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.venue ?? '—'}</td>
                  {!isParent && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(date)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete"
                          onClick={() => setDeleteTarget(date.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm} guardDirty={isDirty} onDirtyDiscard={() => setIsDirty(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Exam Date' : 'Add Exam Date'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3" onChange={() => setIsDirty(true)}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Class *</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-75"
                  value={formData.class_id ?? ''}
                  disabled={!!editTarget}
                  onChange={(e) => setFormData(p => ({ ...p, class_id: e.target.value, section_id: null }))}
                >
                  <option value="">Select class</option>
                  {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Section</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-75"
                  value={formData.section_id ?? ''}
                  disabled={!!editTarget || !formData.class_id}
                  onChange={(e) => setFormData(p => ({ ...p, section_id: e.target.value || null }))}
                >
                  <option value="">All sections</option>
                  {formSections.map(sec => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Subject *</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-75"
                  value={formData.subject_id ?? ''}
                  disabled={!!editTarget}
                  onChange={(e) => setFormData(p => ({ ...p, subject_id: e.target.value }))}
                >
                  <option value="">Select subject</option>
                  {subjectsList.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                </select>
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Exam Date *</label>
                <DatePicker value={formData.exam_date ?? ''} onChange={(val) => { setFormData(p => ({ ...p, exam_date: val })); setIsDirty(true) }} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Time</label>
                <TimePicker value={formData.start_time ?? ''} onChange={(val) => setFormData(p => ({ ...p, start_time: val || null }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End Time</label>
                <TimePicker value={formData.end_time ?? ''} onChange={(val) => setFormData(p => ({ ...p, end_time: val || null }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Venue</label>
                <Input value={formData.venue ?? ''} onChange={(e) => setFormData(p => ({ ...p, venue: e.target.value || null }))} placeholder="Hall A" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending || !canSave}
                className="gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Remove Exam Date?"
        description="This exam date will be permanently removed."
        confirmLabel="Remove"
        pendingLabel="Removing..."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate({ examId: id, dateId: deleteTarget }, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  )
}
