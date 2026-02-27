import { useState } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Download, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExamDetail, useStudentResults, useComputeAggregate } from '@/api/hooks/exam/useExam'
import { ResultsTable } from '@/components/exam/ResultsTable'

export default function StudentResults() {
  const { id } = useParams({ strict: false }) as { id: string }
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: exam } = useExamDetail(id)
  const { data: results = [], isLoading } = useStudentResults(id)
  const computeMutation = useComputeAggregate(id)

  const canCompute = exam?.status === 'active' || exam?.status === 'locked'

  const filtered = results.filter(r =>
    !search ||
    r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.admission_number?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: `/exam/results` as any })}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Results — {exam?.exam_name ?? '...'}</h1>
            <p className="text-xs text-muted-foreground">
              {results.length} students · {exam?.status ?? ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canCompute && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => computeMutation.mutate()}
              disabled={computeMutation.isPending}
            >
              {computeMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Computing...</>
                : <><RefreshCw className="h-4 w-4" /> Compute Results</>
              }
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 w-56"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <ResultsTable results={filtered} isLoading={isLoading || computeMutation.isPending} />

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {results.length} students
      </p>
    </div>
  )
}
