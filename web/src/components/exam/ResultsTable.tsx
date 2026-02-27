import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import type { StudentExamResult } from '@/types/exam'

interface ResultsTableProps {
  results: StudentExamResult[]
  isLoading?: boolean
}

export function ResultsTable({ results, isLoading }: ResultsTableProps) {
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
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="sticky left-0 bg-muted/40 px-4 py-3 text-left font-medium">Student</th>
            <th className="px-3 py-3 text-left font-medium">Adm#</th>
            {subjectHeaders.map(s => (
              <th key={s.id} className="px-3 py-3 text-center font-medium min-w-24">
                {s.name}
              </th>
            ))}
            <th className="px-3 py-3 text-center font-medium">Total</th>
            <th className="px-3 py-3 text-center font-medium">%</th>
            <th className="px-3 py-3 text-center font-medium">Grade</th>
            <th className="px-3 py-3 text-center font-medium">GPA</th>
            <th className="px-3 py-3 text-center font-medium">Rank</th>
            <th className="px-3 py-3 text-center font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => (
            <tr key={row.student_id} className="border-b hover:bg-muted/10">
              <td className="sticky left-0 bg-card px-4 py-2 font-medium">{row.student_name}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{row.admission_number}</td>
              {subjectHeaders.map(s => {
                const sr = row.subject_results?.find(r => r.subject_config_id === s.id)
                return (
                  <td key={s.id} className="px-3 py-2 text-center">
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
              <td className="px-3 py-2 text-center font-medium">
                {row.total_marks_obtained != null ? Number(row.total_marks_obtained).toFixed(1) : '—'}
              </td>
              <td className="px-3 py-2 text-center">
                {row.percentage != null ? `${Number(row.percentage).toFixed(1)}%` : '—'}
              </td>
              <td className="px-3 py-2 text-center">
                {row.grade_label ? (
                  <Badge variant="outline">{row.grade_label}</Badge>
                ) : '—'}
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground">
                {row.gpa != null ? Number(row.gpa).toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2 text-center text-muted-foreground">
                {row.rank ?? '—'}
              </td>
              <td className="px-3 py-2 text-center">
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
  )
}
