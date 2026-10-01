import { useState, useMemo } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, ChevronLeft, ChevronRight, Search, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/PageHeader'
import { FilterBar } from '@/components/ui/FilterBar'
import type { AuditLogEntry } from '@/types/exam'
import { useExamDetail } from '@/api/hooks/exam/useExam'
import { useQuery } from '@tanstack/react-query'
import { getAuditLog } from '@/api/exam'
import { examKeys } from '@/api/hooks/exam/useExam'

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
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: [...examKeys.detail(id), 'audit', page],
    queryFn: () => getAuditLog(id, { page, page_size: 20 }),
  })

  const entries: AuditLogEntry[] = Array.isArray(data) ? data : []

  const filteredEntries = useMemo(() => {
    const q = searchQuery.toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      (e.action ?? '').toLowerCase().includes(q) ||
      (e.reason ?? '').toLowerCase().includes(q) ||
      (e.old_value ?? '').toLowerCase().includes(q) ||
      (e.new_value ?? '').toLowerCase().includes(q)
    )
  }, [entries, searchQuery])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Audit Log - ${exam?.exam_name ?? ''}`}
        subtitle="Activity history for this exam"
        icon={<History className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate({ to: `/exam/exams/${id}` as any })} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <FilterBar>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search action, reason, value..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </FilterBar>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading audit log...</span>
        </div>
      ) : isError ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">{error instanceof Error ? error.message : 'Failed to load audit log.'}</p>
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
                  <div className="space-y-0.5">
                    {(!!entry.old_value || !!entry.new_value) && (
                      <p className="text-sm font-medium">
                        {entry.old_value || '-'} to {entry.new_value || '-'}
                      </p>
                    )}
                    {!!entry.reason && (
                      <p className="text-xs text-muted-foreground">{entry.reason}</p>
                    )}
                  </div>
                </div>
                <time className="text-xs text-muted-foreground shrink-0">
                  {entry.performed_at ? new Date(entry.performed_at).toLocaleString() : ''}
                </time>
              </div>
            </div>
          ))}
        </div>
      )}

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
