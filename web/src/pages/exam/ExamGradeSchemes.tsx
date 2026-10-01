import { Fragment, useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Loader2, Award, ChevronDown, ChevronRight, Save, Search, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GradeBandEditor } from '@/components/exam/GradeBandEditor'
import {
  useExamGradeSchemes,
  useCreateExamGradeScheme,
  useUpdateExamGradeScheme,
  useDeleteExamGradeScheme,
} from '@/api/hooks/exam/useExam'
import { gradeSchemeSchema, type GradeSchemeFormData } from '@/schemas/examSchemas'
import type { ExamGradeScheme } from '@/types/exam'

export default function ExamGradeSchemes() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<ExamGradeScheme | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-75" />
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
  }

  const { data: schemes = [], isLoading, isError, error } = useExamGradeSchemes()
  const createMutation = useCreateExamGradeScheme()
  const updateMutation = useUpdateExamGradeScheme()
  const deleteMutation = useDeleteExamGradeScheme()

  const filteredSchemes = useMemo(() => {
    let items = schemes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(s => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aVal = sortKey === 'bands' ? String((a.bands ?? []).length) : String((a as any)[sortKey] ?? '')
        const bVal = sortKey === 'bands' ? String((b.bands ?? []).length) : String((b as any)[sortKey] ?? '')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return items
  }, [schemes, searchQuery, sortKey, sortDir])

  const form = useForm<GradeSchemeFormData>({
    resolver: zodResolver(gradeSchemeSchema) as any,
    defaultValues: { name: '', description: '', is_default: false, bands: [] },
  })

  const openCreate = () => {
    form.reset({ name: '', description: '', is_default: false, bands: [] })
    setEditTarget(null)
    setIsDirty(false)
    setShowForm(true)
  }

  const openEdit = (scheme: ExamGradeScheme) => {
    form.reset({
      name: scheme.name,
      description: scheme.description ?? '',
      is_default: scheme.is_default,
      bands: (scheme.bands ?? []).map(b => ({
        from_percent: Number(b.from_percent) || 0,
        to_percent: Number(b.to_percent) || 0,
        from_marks: b.from_marks != null ? Number(b.from_marks) : null,
        to_marks: b.to_marks != null ? Number(b.to_marks) : null,
        grade_label: b.grade_label ?? '',
        gpa: Number(b.gpa) || 0,
        remarks: b.remarks ?? null,
        is_pass: b.is_pass ?? true,
        sort_order: Number(b.sort_order) || 0,
      })),
    })
    setEditTarget(scheme)
    setIsDirty(false)
    setShowForm(true)
  }

  const onSubmit = (data: GradeSchemeFormData) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data },
        { onSuccess: () => { setIsDirty(false); setShowForm(false) } }
      )
    } else {
      createMutation.mutate(data, { onSuccess: () => { setIsDirty(false); setShowForm(false) } })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading grade schemes...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Failed to load grade schemes.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Grade Schemes" icon={<Award className="h-5 w-5" />} subtitle="Map total percentage ranges to grades (A+, A, B...) with GPA and pass/fail" actions={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Scheme</Button>} />

      {schemes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Award className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No grade schemes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a grading scheme to use in exams
            </p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create First Scheme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <FilterBar>
            <div className="relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search schemes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
            </div>
          </FilterBar>
          <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('name')}>Name <SortIcon col="name" /></th>
                <th className="px-4 py-3 text-left font-medium">Default</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('bands')}>Bands <SortIcon col="bands" /></th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchemes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No schemes match your search' : 'No grade schemes'}</td></tr>
              ) : filteredSchemes.map((scheme, idx) => (
                <Fragment key={scheme.id}>
                  <tr
                    className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                    style={{ height: '48px' }}
                    onClick={() => setExpandedId(expandedId === scheme.id ? null : scheme.id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
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
                      <Badge variant="secondary">{(scheme.bands ?? []).length} bands</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Grade Scheme" onClick={() => openEdit(scheme)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                          title="Delete Grade Scheme"
                          onClick={() => setDeleteTarget(scheme.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === scheme.id && (
                    <tr className="bg-muted/10">
                      <td colSpan={5} className="px-8 py-4">
                        <GradeBandEditor bands={scheme.bands} onChange={() => {}} readOnly />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm} guardDirty={isDirty} onDirtyDiscard={() => setIsDirty(false)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Exam Grade Scheme' : 'Create Exam Grade Scheme'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" onChange={() => setIsDirty(true)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Scheme Name *</label>
                <Input {...form.register('name')} placeholder="CBSE Standard" />
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
                id="is_default"
                {...form.register('is_default')}
                className="h-4 w-4"
              />
              <label htmlFor="is_default" className="cursor-pointer text-sm">
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
                onChange={(bands) => { form.setValue('bands', bands); setIsDirty(true) }}
              />
              {form.formState.errors.bands && (
                <p className="text-xs text-destructive">{form.formState.errors.bands.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Grade Scheme?"
        description="This will permanently delete this grade scheme. If it's in use by an exam, deletion will be blocked."
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
      />
    </div>
  )
}
