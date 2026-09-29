import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Filter, Search } from 'lucide-react'
import type { StudentExamResult } from '@/types/exam'

interface ResultsTableProps {
  results: StudentExamResult[]
  isLoading?: boolean
}

export function ResultsTable({ results, isLoading }: ResultsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-50" />;
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1" />
      : <ChevronDown className="inline h-3 w-3 ml-1" />;
  };

  const displayResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = q
      ? results.filter(r => (r.student_name ?? '').toLowerCase().includes(q) || (r.admission_number || '').toLowerCase().includes(q))
      : results;
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        if (sortKey === 'name') {
          return sortDir === 'asc' ? (a.student_name ?? '').localeCompare(b.student_name ?? '') : (b.student_name ?? '').localeCompare(a.student_name ?? '');
        }
        if (sortKey === 'total') {
          const diff = (a.total_marks_obtained ?? 0) - (b.total_marks_obtained ?? 0);
          return sortDir === 'asc' ? diff : -diff;
        }
        if (sortKey === 'percent') {
          const diff = (a.percentage ?? 0) - (b.percentage ?? 0);
          return sortDir === 'asc' ? diff : -diff;
        }
        if (sortKey === 'rank') {
          const diff = (a.rank ?? 999) - (b.rank ?? 999);
          return sortDir === 'asc' ? diff : -diff;
        }
        return 0;
      });
    }
    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, searchQuery, sortKey, sortDir]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-8 text-center">
        <p className="text-muted-foreground">No results available.</p>
      </div>
    )
  }

  // Collect all unique subjects from first result for headers
  const subjectHeaders = results[0]?.subject_results?.map(sr => ({
    id: sr.subject_config_id,
    name: sr.subject_name,
  })) ?? []

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters</span>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by student name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-3 text-left font-medium w-12">S.No.</th>
            <th className="sticky left-0 bg-muted/40 px-4 py-3 text-left font-medium cursor-pointer select-none hover:bg-muted/60" onClick={() => handleSort('name')}>Student {<SortIcon colKey="name" />}</th>
            <th className="px-3 py-3 text-left font-medium">Adm#</th>
            {subjectHeaders.map(s => (
              <th key={s.id} className="px-3 py-3 text-center font-medium min-w-24">
                {s.name}
              </th>
            ))}
            <th className="px-3 py-3 text-center font-medium cursor-pointer select-none" onClick={() => handleSort('total')}>Total {<SortIcon colKey="total" />}</th>
            <th className="px-3 py-3 text-center font-medium cursor-pointer select-none" onClick={() => handleSort('percent')}>% {<SortIcon colKey="percent" />}</th>
            <th className="px-3 py-3 text-center font-medium">Grade</th>
            <th className="px-3 py-3 text-center font-medium">GPA</th>
            <th className="px-3 py-3 text-center font-medium cursor-pointer select-none" onClick={() => handleSort('rank')}>Rank {<SortIcon colKey="rank" />}</th>
            <th className="px-3 py-3 text-center font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {displayResults.map((row, idx) => (
            <tr key={row.student_id} className="border-b hover:bg-muted/10" style={{ height: "48px" }}>
              <td className="px-3 py-2 text-muted-foreground align-middle">{idx + 1}</td>
              <td className="sticky left-0 bg-card px-4 py-2 font-medium align-middle">{row.student_name}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground align-middle">{row.admission_number}</td>
              {subjectHeaders.map(s => {
                const sr = row.subject_results?.find(r => r.subject_config_id === s.id)
                return (
                  <td key={s.id} className="px-3 py-2 text-center align-middle">
                    {sr ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-medium">{sr.marks_obtained != null ? Number(sr.marks_obtained) : '—'}</span>
                        {sr.grade_label && (
                          <span className="text-xs text-muted-foreground">{sr.grade_label}</span>
                        )}
                        {sr.is_absent && (
                          <Badge variant="secondary" className="text-xs">ABS</Badge>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-center font-medium align-middle">
                {row.total_marks_obtained != null ? Number(row.total_marks_obtained).toFixed(1) : '—'}
              </td>
              <td className="px-3 py-2 text-center align-middle">
                {row.percentage != null ? `${Number(row.percentage).toFixed(1)}%` : '—'}
              </td>
              <td className="px-3 py-2 text-center align-middle">
                {row.grade_label ? (
                  <Badge variant="outline">{row.grade_label}</Badge>
                ) : '—'}
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground align-middle">
                {row.gpa != null ? Number(row.gpa).toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground align-middle">
                {row.rank ?? '—'}
              </td>
              <td className="px-3 py-2 text-center align-middle">
                {row.is_passed != null ? (
                  <Badge variant={row.is_passed ? 'default' : 'destructive'}>
                    {row.is_passed ? 'Pass' : 'Fail'}
                  </Badge>
                ) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}
