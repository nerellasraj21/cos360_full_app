import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Plus, Edit, Trash2, Loader2, Calendar, ArrowLeft, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
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

  const { data: exam } = useExamDetail(id)
  const { data: dates = [], isLoading } = useExamDates(id)
  const createMutation = useCreateExamDate()
  const updateMutation = useUpdateExamDate()
  const deleteMutation = useDeleteExamDate()

  const openCreate = () => {
    setFormData({ exam_id: id, exam_date: '', start_time: null, end_time: null, venue: null, notes: null })
    setEditTarget(null)
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
    setShowForm(true)
  }

  const handleSave = () => {
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: formData }, { onSuccess: () => setShowForm(false) })
    } else {
      createMutation.mutate(formData as ExamDatePayload, { onSuccess: () => setShowForm(false) })
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
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Section</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Start</th>
                <th className="px-4 py-3 text-left font-medium">End</th>
                <th className="px-4 py-3 text-left font-medium">Venue</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date.id} className="border-b transition-colors hover:bg-muted/20">
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
      )}

      {/* Add/Edit Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Exam Date' : 'Add Exam Date'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
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
                <Input type="time" value={formData.start_time ?? ''} onChange={(e) => setFormData(p => ({ ...p, start_time: e.target.value || null }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End Time</label>
                <Input type="time" value={formData.end_time ?? ''} onChange={(e) => setFormData(p => ({ ...p, end_time: e.target.value || null }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-sm font-medium">Venue</label>
                <Input value={formData.venue ?? ''} onChange={(e) => setFormData(p => ({ ...p, venue: e.target.value || null }))} placeholder="Hall A" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
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
