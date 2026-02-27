import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  const { data: exam } = useExamDetail(id)
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...examKeys.detail(id), 'audit', page],
    queryFn: () => getAuditLog(id, { page, page_size: 20 }),
  })

  const entries: AuditEntry[] = Array.isArray(data)
    ? data
    : (data as any)?.results ?? []

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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border bg-muted/20 p-8 text-center">
          <p className="text-muted-foreground">No audit entries found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
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
