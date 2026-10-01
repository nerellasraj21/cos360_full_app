import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/ui/FilterBar'
import { Loader2, CheckCircle, XCircle, AlertTriangle, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { HallTicketEligibility } from '@/types/exam'
import { useOverrideHallTicket } from '@/api/hooks/exam/useExam'

interface EligibilityPanelProps {
  examId: string
  items: HallTicketEligibility[]
  isLoading?: boolean
  showOverride?: boolean
}

const REASON_LABEL: Record<string, string> = {
  FEE_PENDING: 'Fee payment pending',
  LOW_ATTENDANCE: 'Attendance below requirement',
  BOTH: 'Fee pending and low attendance',
}

export function EligibilityPanel({ examId, items, isLoading, showOverride }: EligibilityPanelProps) {
  const overrideMutation = useOverrideHallTicket(examId)
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
  const filteredItems = useMemo(() => {
    let result = items
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item =>
        (item.student_name ?? '').toLowerCase().includes(q) ||
        (item.admission_number ?? '').toLowerCase().includes(q)
      )
    }
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = String((a as any)[sortKey] ?? '')
        const bVal = String((b as any)[sortKey] ?? '')
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      })
    }
    return result
  }, [items, searchQuery, sortKey, sortDir])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading students...</span>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-center">
        <p className="text-muted-foreground text-sm">No students found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <FilterBar className="mb-0">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search by student name or admission number..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </FilterBar>
      <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-3 py-3 text-left font-medium w-12">S.No.</th>
            <th className="px-4 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('student_name')}>Student <SortIcon col="student_name" /></th>
            <th className="px-3 py-3 text-left font-medium cursor-pointer select-none" onClick={() => handleSort('admission_number')}>Adm# <SortIcon col="admission_number" /></th>
            <th className="px-3 py-3 text-center font-medium">Attendance</th>
            <th className="px-3 py-3 text-center font-medium">Fee</th>
            <th className="px-3 py-3 text-center font-medium cursor-pointer select-none" onClick={() => handleSort('is_eligible')}>Eligible <SortIcon col="is_eligible" /></th>
            <th className="px-3 py-3 text-left font-medium">Reasons</th>
            {showOverride && <th className="px-3 py-3 text-center font-medium">Override</th>}
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr><td colSpan={showOverride ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No students match your search' : 'No students'}</td></tr>
          ) : filteredItems.map((item, idx) => (
            <tr key={item.student_id} className="border-b hover:bg-muted/10" style={{ height: '48px' }}>
              <td className="px-3 py-2 text-muted-foreground text-sm">{idx + 1}</td>
              <td className="px-4 py-2 font-medium">{item.student_name ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{item.admission_number ?? '—'}</td>
              <td className="px-3 py-2 text-center">
                {item.attendance_override ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" /> Override
                  </Badge>
                ) : item.attendance_ok ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mx-auto" />
                )}
              </td>
              <td className="px-3 py-2 text-center">
                {item.fee_override ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" /> Override
                  </Badge>
                ) : item.fee_paid ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mx-auto" />
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <Badge variant={item.is_eligible ? 'default' : 'destructive'}>
                  {item.is_eligible ? 'Eligible' : 'Ineligible'}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {item.ineligibility_reason ? (
                  <p className="text-xs text-destructive">
                    {REASON_LABEL[item.ineligibility_reason] ?? String(item.ineligibility_reason).replace(/_/g, ' ').toLowerCase()}
                  </p>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              {showOverride && (
                <td className="px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {!item.attendance_ok && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        title="Override attendance requirement"
                        disabled={item.attendance_override || overrideMutation.isPending}
                        onClick={() => overrideMutation.mutate({
                          studentId: item.student_id,
                          overrides: { attendance_override: true },
                        })}
                      >
                        Attendance
                      </Button>
                    )}
                    {!item.fee_paid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        title="Override fee requirement"
                        disabled={item.fee_override || overrideMutation.isPending}
                        onClick={() => overrideMutation.mutate({
                          studentId: item.student_id,
                          overrides: { fee_override: true },
                        })}
                      >
                        Fee
                      </Button>
                    )}
                    {item.is_eligible && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
