import { Fragment, useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Loader2, MessageSquare, ChevronDown, ChevronRight, ChevronUp, Save, X, GripVertical, Filter, Search, ChevronsUpDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'name' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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

  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: 'options' })

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="ml-1 inline h-3 w-3 opacity-50" />
    return sortDir === 'asc'
      ? <ChevronUp className="ml-1 inline h-3 w-3" />
      : <ChevronDown className="ml-1 inline h-3 w-3" />
  }

  const filteredSets = useMemo(() => {
    let result = sets.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (sortKey === 'name') {
      result = [...result].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [sets, searchQuery, sortKey, sortDir])

  const handleOptionDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleOptionDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) return
    move(dragIndex, targetIndex)
    setDragIndex(targetIndex)
  }

  const handleOptionDragEnd = () => {
    setDragIndex(null)
    const currentOptions = form.getValues('options')
    currentOptions.forEach((_, i) => {
      form.setValue(`options.${i}.sort_order`, i)
    })
    setIsDirty(true)
  }

  const openCreate = () => {
    form.reset({
      name: '',
      options: [{ grade_letter: 'A', label: 'Excellent', sort_order: 0 }],
    })
    setEditTarget(null)
    setIsDirty(false)
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
    setIsDirty(false)
    setShowForm(true)
  }

  const onSubmit = (data: RemarkGradeSetFormData) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: { name: data.name, options: data.options } },
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Remark Grade Sets" icon={<MessageSquare className="h-5 w-5" />} subtitle="Named sets of remark grades (A=Excellent, B=Good...) for remarks-type mark components" actions={<Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Set</Button>} />

      <FilterBar>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search set name..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </FilterBar>

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
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('name')}>
                  Set Name <SortIcon col="name" />
                </th>
                <th className="px-4 py-3 text-left font-medium">Options</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No sets match your search.
                  </td>
                </tr>
              ) : (
                filteredSets.map((set, idx) => (
                  <Fragment key={set.id}>
                    <tr
                      className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                      style={{ height: '48px' }}
                      onClick={() => setExpandedId(expandedId === set.id ? null : set.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Remark Set" onClick={() => openEdit(set)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            title="Delete Remark Set"
                            onClick={() => setDeleteTarget(set.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === set.id && (
                      <tr className="bg-muted/10">
                        <td colSpan={4} className="px-8 py-4">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm} guardDirty={isDirty} onDirtyDiscard={() => setIsDirty(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Remark Grade Set' : 'Create Remark Grade Set'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" onChange={() => setIsDirty(true)}>
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
                  onClick={() => { append({ grade_letter: '', label: '', sort_order: fields.length }); setIsDirty(true) }}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Option
                </Button>
              </div>
              <div className="space-y-1">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={`flex items-center gap-2 rounded px-1 transition-colors ${dragIndex === index ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                    draggable
                    onDragStart={() => handleOptionDragStart(index)}
                    onDragOver={(e) => handleOptionDragOver(e, index)}
                    onDragEnd={handleOptionDragEnd}
                  >
                    <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground" />
                    {/* Up / Down reorder buttons */}
                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => {
                          move(index, index - 1)
                          const opts = form.getValues('options')
                          opts.forEach((_, i) => form.setValue(`options.${i}.sort_order`, i))
                          setIsDirty(true)
                        }}
                        className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === fields.length - 1}
                        onClick={() => {
                          move(index, index + 1)
                          const opts = form.getValues('options')
                          opts.forEach((_, i) => form.setValue(`options.${i}.sort_order`, i))
                          setIsDirty(true)
                        }}
                        className="flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
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
                      onClick={() => { remove(index); setIsDirty(true) }}
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
