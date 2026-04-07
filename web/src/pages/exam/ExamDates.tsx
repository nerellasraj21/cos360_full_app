import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Plus, Edit, Trash2, Loader2, Calendar, ArrowLeft, Save, X, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function ExamDates() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()

  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<ExamDate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<ExamDatePayload>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: exam } = useExamDetail(id)
  const { data: dates = [], isLoading } = useExamDates(id)
  const createMutation = useCreateExamDate()
  const updateMutation = useUpdateExamDate()
  const deleteMutation = useDeleteExamDate()

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
  }
  const filteredDates = useMemo(() => {
    let items = dates
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(d =>
        (d.subject_name ?? '').toLowerCase().includes(q) ||
        (d.class_name ?? '').toLowerCase().includes(q) ||
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: `/exam/exams/${id}` as any })} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-bold">Exam Dates</h1>
            {exam && <p className="text-sm text-muted-foreground">{exam.exam_name}</p>}
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Date
        </Button>
      </div>

      {dates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No exam dates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add date, time, and venue for each subject</p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Add First Date
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search by subject, class or venue..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border">
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
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDates.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No dates match your search' : 'No exam dates'}</td></tr>
              ) : filteredDates.map((date, idx) => (
                <tr key={date.id} className="border-b transition-colors hover:bg-muted/20" style={{ height: '48px' }}>
                  <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{date.subject_name ?? date.subject_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.class_name ?? date.class_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.section_name ?? date.section_id ?? '—'}</td>
                  <td className="px-4 py-3">{date.exam_date}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.start_time ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.end_time ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{date.venue ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(date)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(date.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Add/Edit Form */}
      <Dialog open={showForm} onOpenChange={setShowForm} guardDirty={isDirty} onDirtyDiscard={() => setIsDirty(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Exam Date' : 'Add Exam Date'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3" onChange={() => setIsDirty(true)}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Class ID</label>
                <Input value={formData.class_id ?? ''} onChange={(e) => setFormData(p => ({ ...p, class_id: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Section ID</label>
                <Input value={formData.section_id ?? ''} onChange={(e) => setFormData(p => ({ ...p, section_id: e.target.value || null }))} placeholder="Optional" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Subject ID</label>
                <Input value={formData.subject_id ?? ''} onChange={(e) => setFormData(p => ({ ...p, subject_id: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Exam Date *</label>
                <Input type="date" value={formData.exam_date ?? ''} onChange={(e) => setFormData(p => ({ ...p, exam_date: e.target.value }))} />
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
                disabled={createMutation.isPending || updateMutation.isPending}
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Exam Date?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This exam date will be permanently removed.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate({ examId: id, dateId: deleteTarget }, { onSuccess: () => setDeleteTarget(null) })}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
