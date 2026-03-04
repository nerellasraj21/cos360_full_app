import { Fragment, useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Loader2, Layout, ChevronDown, ChevronRight, ChevronUp, Save, X, Filter, Search, ChevronsUpDown } from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Note: nature dropdown uses native <select> to avoid Dialog overflow clipping
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useBoardPatterns,
  useCreateBoardPattern,
  useUpdateBoardPattern,
  useDeleteBoardPattern,
} from '@/api/hooks/exam/useExam'
import type { BoardExamPattern } from '@/types/exam'

const BOARDS = ['CBSE', 'ICSE', 'State', 'BTech', 'Custom'] as const
const LEVELS = [
  { value: 'pre_primary', label: 'Pre-Primary' },
  { value: 'primary', label: 'Primary' },
  { value: 'upper_primary', label: 'Upper Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'inter', label: 'Intermediate' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'btech', label: 'BTech' },
  { value: 'mtech', label: 'MTech' },
  { value: 'iit', label: 'IIT' },
  { value: 'others', label: 'Others' },
] as const
const NATURES = ['formative', 'summative', 'cumulative', 'custom'] as const

const patternSchema = z.object({
  board: z.enum(['CBSE', 'ICSE', 'State', 'BTech', 'Custom']),
  custom_board_name: z.string().max(100).optional(),
  level: z.enum(['pre_primary', 'primary', 'upper_primary', 'secondary', 'inter', 'diploma', 'btech', 'mtech', 'iit', 'others']),
  exam_types: z.array(z.object({
    exam_type_name: z.string().min(1, 'Name required'),
    nature: z.enum(['formative', 'summative', 'cumulative', 'custom']),
    weightage_percent: z.coerce.number().min(0).max(100).nullable().optional(),
    count_per_year: z.coerce.number().int().min(1).nullable().optional(),
    sort_order: z.coerce.number().int().min(0).default(0),
  })).min(1, 'At least one exam type required'),
})

type PatternForm = z.infer<typeof patternSchema>

export default function BoardPatternSetup() {
  const [editTarget, setEditTarget] = useState<BoardExamPattern | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'board' | 'level' | 'is_active' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data: patterns = [], isLoading } = useBoardPatterns()
  const createMutation = useCreateBoardPattern()
  const updateMutation = useUpdateBoardPattern()
  const deleteMutation = useDeleteBoardPattern()

  const form = useForm<PatternForm>({
    resolver: zodResolver(patternSchema) as any,
    defaultValues: {
      board: 'CBSE',
      level: 'primary',
      exam_types: [{ exam_type_name: '', nature: 'formative', weightage_percent: null, count_per_year: null, sort_order: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'exam_types' })

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

  const filteredPatterns = useMemo(() => {
    let result = patterns.filter(p => {
      const boardName = p.board === 'Custom' ? (p.custom_board_name ?? '') : p.board
      const levelLabel = LEVELS.find(l => l.value === p.level)?.label ?? p.level
      const q = searchQuery.toLowerCase()
      return boardName.toLowerCase().includes(q) || levelLabel.toLowerCase().includes(q)
    })
    if (sortKey) {
      result = [...result].sort((a, b) => {
        let av: string | boolean = ''
        let bv: string | boolean = ''
        if (sortKey === 'board') {
          av = a.board === 'Custom' ? (a.custom_board_name ?? '') : a.board
          bv = b.board === 'Custom' ? (b.custom_board_name ?? '') : b.board
        } else if (sortKey === 'level') {
          av = LEVELS.find(l => l.value === a.level)?.label ?? a.level
          bv = LEVELS.find(l => l.value === b.level)?.label ?? b.level
        } else if (sortKey === 'is_active') {
          av = a.is_active ? 'Active' : 'Inactive'
          bv = b.is_active ? 'Active' : 'Inactive'
        }
        const cmp = String(av).localeCompare(String(bv))
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return result
  }, [patterns, searchQuery, sortKey, sortDir])

  const openCreate = () => {
    form.reset({
      board: 'CBSE',
      level: 'primary',
      exam_types: [{ exam_type_name: '', nature: 'formative', weightage_percent: null, count_per_year: null, sort_order: 0 }],
    })
    setEditTarget(null)
    setIsDirty(false)
    setShowForm(true)
  }

  const openEdit = (pattern: BoardExamPattern) => {
    form.reset({
      board: pattern.board,
      custom_board_name: pattern.custom_board_name ?? undefined,
      level: pattern.level,
      exam_types: pattern.exam_types.map(et => ({
        exam_type_name: et.exam_type_name,
        nature: et.nature,
        weightage_percent: et.weightage_percent ?? null,
        count_per_year: et.count_per_year ?? null,
        sort_order: et.sort_order,
      })),
    })
    setEditTarget(pattern)
    setIsDirty(false)
    setShowForm(true)
  }

  const onSubmit = (data: PatternForm) => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, data: data as any },
        { onSuccess: () => { setIsDirty(false); setShowForm(false) } }
      )
    } else {
      createMutation.mutate(data as any, { onSuccess: () => { setIsDirty(false); setShowForm(false) } })
    }
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, { onSuccess: () => setDeleteTarget(null) })
  }

  const getLevelLabel = (value: string) => LEVELS.find(l => l.value === value)?.label ?? value

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
          <Layout className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Board Patterns</h1>
            <p className="text-sm text-muted-foreground">Define exam type patterns per board and education level</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New Pattern
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">Filters</span>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search board or level..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {patterns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Layout className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No board patterns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a board pattern to define exam types per board</p>
            <Button onClick={openCreate} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create First Pattern
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium w-12">S.No.</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('board')}>
                  Board <SortIcon col="board" />
                </th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('level')}>
                  Level <SortIcon col="level" />
                </th>
                <th className="px-4 py-3 text-left font-medium">Exam Types</th>
                <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('is_active')}>
                  Status <SortIcon col="is_active" />
                </th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatterns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No patterns match your search.
                  </td>
                </tr>
              ) : (
                filteredPatterns.map((pattern, idx) => (
                  <Fragment key={pattern.id}>
                    <tr
                      className="cursor-pointer border-b transition-colors hover:bg-muted/20"
                      style={{ height: '48px' }}
                      onClick={() => setExpandedId(expandedId === pattern.id ? null : pattern.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground text-sm">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {expandedId === pattern.id
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                          <span className="font-medium">
                            {pattern.board === 'Custom' ? pattern.custom_board_name : pattern.board}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{getLevelLabel(pattern.level)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{pattern.exam_types.length} types</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={pattern.is_active ? 'default' : 'secondary'}>
                          {pattern.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(pattern)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(pattern.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === pattern.id && (
                      <tr key={`${pattern.id}-expand`} className="bg-muted/10">
                        <td colSpan={6} className="px-8 py-3">
                          <div className="overflow-hidden rounded border">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-muted/30">
                                  <th className="px-3 py-2 text-left">Type Name</th>
                                  <th className="px-3 py-2 text-left">Nature</th>
                                  <th className="px-3 py-2 text-left">Weightage %</th>
                                  <th className="px-3 py-2 text-left">Count/Year</th>
                                  <th className="px-3 py-2 text-left">Order</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pattern.exam_types.map((et) => (
                                  <tr key={et.id} className="border-b last:border-0">
                                    <td className="px-3 py-2 font-medium">{et.exam_type_name}</td>
                                    <td className="px-3 py-2 capitalize text-muted-foreground">{et.nature}</td>
                                    <td className="px-3 py-2">{et.weightage_percent ?? '—'}</td>
                                    <td className="px-3 py-2">{et.count_per_year ?? '—'}</td>
                                    <td className="px-3 py-2">{et.sort_order}</td>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Board Pattern' : 'Create Board Pattern'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" onChange={() => setIsDirty(true)}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Board</label>
                <Select
                  value={form.watch('board')}
                  onValueChange={(v) => { form.setValue('board', v as any); setIsDirty(true) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.board && (
                  <p className="text-xs text-destructive">{form.formState.errors.board.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Level</label>
                <Select
                  value={form.watch('level')}
                  onValueChange={(v) => { form.setValue('level', v as any); setIsDirty(true) }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.watch('board') === 'Custom' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Custom Board Name</label>
                <Input {...form.register('custom_board_name')} placeholder="Enter board name" />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exam Types</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { append({ exam_type_name: '', nature: 'formative', weightage_percent: null, count_per_year: null, sort_order: fields.length }); setIsDirty(true) }}
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Type
                </Button>
              </div>
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-2 py-2 text-left">Type Name</th>
                      <th className="px-2 py-2 text-left">Nature</th>
                      <th className="px-2 py-2 text-left">Weightage %</th>
                      <th className="px-2 py-2 text-left">Count/Yr</th>
                      <th className="w-8 px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b last:border-0">
                        <td className="px-2 py-1.5">
                          <Input
                            {...form.register(`exam_types.${index}.exam_type_name`)}
                            className="h-7 text-xs"
                            placeholder="FA1"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select
                            value={form.watch(`exam_types.${index}.nature`)}
                            onChange={(e) => form.setValue(`exam_types.${index}.nature`, e.target.value as any)}
                            className="h-7 w-full rounded border border-input bg-background px-2 text-xs capitalize focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            {...form.register(`exam_types.${index}.weightage_percent`)}
                            className="h-7 w-16 text-xs"
                            placeholder="10"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            {...form.register(`exam_types.${index}.count_per_year`)}
                            className="h-7 w-14 text-xs"
                            placeholder="2"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => { remove(index); setIsDirty(true) }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <Save className="h-4 w-4" />
                Save Pattern
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Board Pattern?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete this board pattern. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
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
