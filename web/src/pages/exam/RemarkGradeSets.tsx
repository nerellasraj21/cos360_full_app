import { Fragment, useState } from 'react'
import { Plus, Edit, Trash2, Loader2, MessageSquare, ChevronDown, ChevronRight, Save, X } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useRemarkGradeSets,
  useCreateRemarkGradeSet,
  useUpdateRemarkGradeSet,
  useDeleteRemarkGradeSet,
} from '@/api/hooks/exam/useExam'
import { remarkGradeSetSchema, type RemarkGradeSetFormData } from '@/schemas/examSchemas'
import type { RemarkGradeSet } from '@/types/exam'

export default function RemarkGradeSets() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<RemarkGradeSet | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: sets = [], isLoading } = useRemarkGradeSets()
  const createMutation = useCreateRemarkGradeSet()
  const updateMutation = useUpdateRemarkGradeSet()
  const deleteMutation = useDeleteRemarkGradeSet()

  const form = useForm<RemarkGradeSetFormData>({
    resolver: zodResolver(remarkGradeSetSchema) as any,
    defaultValues: {
      name: '',
      options: [{ grade_letter: 'A', label: 'Excellent', sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' })

  const openCreate = () => {
    form.reset({
      name: '',
      options: [{ grade_letter: 'A', label: 'Excellent', sort_order: 0 }],
    })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (set: RemarkGradeSet) => {
    form.reset({
      name: set.name,
      options: set.options.map(o => ({
        grade_letter: o.grade_letter,
        label: o.label,
        sort_order: o.sort_order,
      })),
    })
    setEditTarget(set)
    setShowForm(true)
  }

  const onSubmit = (data: RemarkGradeSetFormData) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: { name: data.name, options: data.options } },
        { onSuccess: () => setShowForm(false) }
      )
    } else {
      createMutation.mutate(data, { onSuccess: () => setShowForm(false) })
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
          <MessageSquare className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Remark Grade Sets</h1>
            <p className="text-sm text-muted-foreground">
              Named sets of remark grades (A=Excellent, B=Good...) for remarks-type mark components
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Set
        </Button>
      </div>

      {sets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No remark grade sets yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a remark set to use in remarks-type exam components
            </p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create First Set
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Set Name</th>
                <th className="px-4 py-3 text-left font-medium">Options</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <Fragment key={set.id}>
                  <tr
                    className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                    onClick={() => setExpandedId(expandedId === set.id ? null : set.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expandedId === set.id
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                        <span className="font-medium">{set.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {set.options.slice(0, 4).map((opt) => (
                          <Badge key={opt.id} variant="outline" className="text-xs">
                            {opt.grade_letter}: {opt.label}
                          </Badge>
                        ))}
                        {set.options.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{set.options.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(set)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(set.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === set.id && (
                    <tr className="bg-muted/10">
                      <td colSpan={3} className="px-8 py-4">
                        <div className="overflow-hidden rounded border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b bg-muted/30">
                                <th className="px-3 py-2 text-left">Grade Letter</th>
                                <th className="px-3 py-2 text-left">Label</th>
                                <th className="px-3 py-2 text-left">Order</th>
                              </tr>
                            </thead>
                            <tbody>
                              {set.options.map((opt) => (
                                <tr key={opt.id} className="border-b last:border-0">
                                  <td className="px-3 py-2">
                                    <Badge variant="outline">{opt.grade_letter}</Badge>
                                  </td>
                                  <td className="px-3 py-2">{opt.label}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{opt.sort_order}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Remark Grade Set' : 'Create Remark Grade Set'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Set Name *</label>
              <Input {...form.register('name')} placeholder="Primary Remarks Set" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Grade Options *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ grade_letter: '', label: '', sort_order: fields.length })}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Input
                      {...form.register(`options.${index}.grade_letter`)}
                      className="w-16 text-center"
                      placeholder="A"
                      maxLength={5}
                    />
                    <Input
                      {...form.register(`options.${index}.label`)}
                      placeholder="Excellent"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              {form.formState.errors.options && (
                <p className="text-xs text-destructive">{form.formState.errors.options.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Save className="h-4 w-4" />
                Save Set
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Remark Grade Set?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this remark grade set.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
