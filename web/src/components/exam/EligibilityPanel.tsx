import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { HallTicketEligibility } from '@/types/exam'
import { useOverrideHallTicket } from '@/api/hooks/exam/useExam'

interface EligibilityPanelProps {
  examId: string
  items: HallTicketEligibility[]
  isLoading?: boolean
  showOverride?: boolean
}

export function EligibilityPanel({ examId, items, isLoading, showOverride }: EligibilityPanelProps) {
  const overrideMutation = useOverrideHallTicket(examId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left font-medium">Student</th>
            <th className="px-3 py-3 text-left font-medium">Adm#</th>
            <th className="px-3 py-3 text-center font-medium">Attendance</th>
            <th className="px-3 py-3 text-center font-medium">Fee</th>
            <th className="px-3 py-3 text-center font-medium">Eligible</th>
            <th className="px-3 py-3 text-left font-medium">Reasons</th>
            {showOverride && <th className="px-3 py-3 text-center font-medium">Override</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.student_id} className="border-b hover:bg-muted/10">
              <td className="px-4 py-2 font-medium">{item.student_name}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{item.admission_number}</td>
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
                    • {String(item.ineligibility_reason).replace(/_/g, ' ')}
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
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
                        disabled={item.attendance_override || overrideMutation.isPending}
                        onClick={() => overrideMutation.mutate({
                          studentId: item.student_id,
                          overrides: { attendance_override: true },
                        })}
                      >
                        Att.
                      </Button>
                    )}
                    {!item.fee_paid && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2"
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
  )
}
