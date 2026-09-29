import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useExamDetail } from '@/api/hooks/exam/useExam'
import { useQuery } from '@tanstack/react-query'
import { getAuditLog } from '@/api/exam'
import { examKeys } from '@/api/hooks/exam/useExam'

interface AuditEntry {
  id: string
  action: string
  actor_name: string
  actor_role: string
  description: string
  created_at: string
  metadata?: Record<string, unknown>
}

const actionVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (action.includes('delete') || action.includes('unlock')) return 'destructive'
  if (action.includes('publish') || action.includes('compute')) return 'default'
  return 'secondary'
}

export default function AuditLog() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: exam } = useExamDetail(id)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...examKeys.detail(id), 'audit', page],
    queryFn: () => getAuditLog(id, { page, page_size: 20 }),
  })

  const entries: AuditEntry[] = Array.isArray(data)
    ? data
    : (data as any)?.results ?? []

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      e.description.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      e.actor_name.toLowerCase().includes(q) ||
      e.actor_role.toLowerCase().includes(q)
    )
  }, [entries, searchQuery])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/exams/${id}` as any })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Audit Log — {exam?.exam_name ?? '...'}</h1>
            <p className="text-xs text-muted-foreground">Activity history for this exam</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
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
            placeholder="Search action, actor, description..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No audit entries found.</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No entries match your search.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Badge variant={actionVariant(entry.action)} className="mt-0.5 shrink-0 text-xs">
                    {entry.action.replace(/_/g, ' ')}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{entry.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      by {entry.actor_name}
                      {entry.actor_role && ` (${entry.actor_role})`}
                    </p>
                  </div>
                </div>
                <time className="text-xs text-muted-foreground shrink-0">
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {page}</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={entries.length < 20}
            onClick={() => setPage(p => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
