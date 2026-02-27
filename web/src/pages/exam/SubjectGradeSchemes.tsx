import { Fragment, useState } from 'react'
import { Plus, Edit, Trash2, Loader2, BookOpen, ChevronDown, ChevronRight, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
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
import { GradeBandEditor } from '@/components/exam/GradeBandEditor'
import {
  useSubjectGradeSchemes,
  useCreateSubjectGradeScheme,
  useUpdateSubjectGradeScheme,
  useDeleteSubjectGradeScheme,
} from '@/api/hooks/exam/useExam'
import { gradeSchemeSchema, type GradeSchemeFormData } from '@/schemas/examSchemas'
import type { SubjectGradeScheme } from '@/types/exam'

export default function SubjectGradeSchemes() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<SubjectGradeScheme | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data: schemes = [], isLoading } = useSubjectGradeSchemes()
  const createMutation = useCreateSubjectGradeScheme()
  const updateMutation = useUpdateSubjectGradeScheme()
  const deleteMutation = useDeleteSubjectGradeScheme()

  const form = useForm<GradeSchemeFormData>({
    resolver: zodResolver(gradeSchemeSchema) as any,
    defaultValues: { name: '', description: '', is_default: false, bands: [] },
  })

  const openCreate = () => {
    form.reset({ name: '', description: '', is_default: false, bands: [] })
    setEditTarget(null)
    setShowForm(true)
  }

  const openEdit = (scheme: SubjectGradeScheme) => {
    form.reset({
      name: scheme.name,
      description: scheme.description ?? '',
      is_default: scheme.is_default,
      bands: (scheme.bands ?? []).map(b => ({
        from_percent: b.from_percent ?? 0,
        to_percent: b.to_percent ?? 100,
        from_marks: b.from_marks ?? null,
        to_marks: b.to_marks ?? null,
        grade_label: b.grade_label ?? '',
        gpa: b.gpa ?? 0,
        remarks: b.remarks ?? null,
        is_pass: b.is_pass ?? true,
        sort_order: b.sort_order ?? 0,
      })),
    })
    setEditTarget(scheme)
    setShowForm(true)
  }

  const onSubmit = (data: GradeSchemeFormData) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data },
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
          <BookOpen className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subject Grade Schemes</h1>
            <p className="text-sm text-muted-foreground">
              Per-subject grade calculation with pass thresholds
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Scheme
        </Button>
      </div>

      {schemes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No subject grade schemes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a subject grading scheme to assign to exam subjects
            </p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create First Scheme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Default</th>
                <th className="px-4 py-3 text-left font-medium">Bands</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schemes.map((scheme) => (
                <Fragment key={scheme.id}>
                  <tr
                    className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                    onClick={() => setExpandedId(expandedId === scheme.id ? null : scheme.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expandedId === scheme.id
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                        <span className="font-medium">{scheme.name}</span>
                        {scheme.description && (
                          <span className="text-xs text-muted-foreground">— {scheme.description}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {scheme.is_default && (
                        <Badge variant="default" className="text-xs">Default</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{scheme.bands.length} bands</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(scheme)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(scheme.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === scheme.id && (
                    <tr className="bg-muted/10">
                      <td colSpan={4} className="px-8 py-4">
                        <GradeBandEditor bands={scheme.bands} onChange={() => {}} readOnly />
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Subject Grade Scheme' : 'Create Subject Grade Scheme'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Scheme Name *</label>
                <Input {...form.register('name')} placeholder="Science Grading" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <Input {...form.register('description')} placeholder="Optional description" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default_subj"
                {...form.register('is_default')}
                className="h-4 w-4"
              />
              <label htmlFor="is_default_subj" className="cursor-pointer text-sm">
                Set as default scheme
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Grade Bands *</label>
              <p className="text-xs text-muted-foreground">
                Define percentage ranges and their corresponding grades
              </p>
              <GradeBandEditor
                bands={form.watch('bands')}
                onChange={(bands) => form.setValue('bands', bands)}
              />
              {form.formState.errors.bands && (
                <p className="text-xs text-destructive">{form.formState.errors.bands.message}</p>
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
                Save Scheme
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subject Grade Scheme?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this grade scheme. Deletion is blocked if it's in use by an exam.
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
