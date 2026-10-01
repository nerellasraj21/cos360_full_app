import { Badge } from '@/components/ui/badge'
import type { HallTicketEligibility, ExamDate } from '@/types/exam'
import { useSubjectsDropdown } from '@/api/hooks/masters/subjects'
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections'

interface HallTicketCardProps {
  eligibility: HallTicketEligibility
  examName: string
  examDates?: ExamDate[]
  schoolName?: string
}

export function HallTicketCard({ eligibility, examName, examDates = [], schoolName }: HallTicketCardProps) {
  const { data: subjectsList = [] } = useSubjectsDropdown({ active_only: false })
  const { data: classesList = [] } = useClassSectionsDropdown()
  const subjectNameMap = Object.fromEntries(subjectsList.map(s => [s.id, s.name]))
  const classInfo = classesList.find(c => c.id === eligibility.class_id)
  const sectionName = eligibility.section_id ? classInfo?.sections.find(sec => sec.id === eligibility.section_id)?.name : undefined
  const studentDates = examDates.filter(d =>
    d.class_id === eligibility.class_id && (!d.section_id || d.section_id === eligibility.section_id)
  )

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4 print:border-2 print:border-black print:p-8">
      <div className="text-center space-y-1 border-b pb-4">
        <h2 className="text-lg font-bold uppercase tracking-wide">
          {schoolName ?? 'School Management System'}
        </h2>
        <h3 className="text-base font-semibold">{examName}</h3>
        <p className="text-sm text-muted-foreground">Hall Admission Ticket</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Student Name</span>
          <p className="font-semibold">{eligibility.student_name ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Admission No.</span>
          <p className="font-semibold">{eligibility.admission_number ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Class</span>
          <p className="font-semibold">{classInfo?.name ?? '—'}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Section</span>
          <p className="font-semibold">{sectionName ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Status</span>
          <div className="mt-1">
            <Badge variant={eligibility.is_eligible ? 'default' : 'destructive'}>
              {eligibility.is_eligible ? 'Eligible' : 'Not Eligible'}
            </Badge>
          </div>
        </div>
      </div>

      {studentDates.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Exam Schedule</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left text-muted-foreground font-medium">Subject</th>
                <th className="py-1 text-left text-muted-foreground font-medium">Date</th>
                <th className="py-1 text-left text-muted-foreground font-medium">Time</th>
                <th className="py-1 text-left text-muted-foreground font-medium">Venue</th>
              </tr>
            </thead>
            <tbody>
              {studentDates.map(d => (
                <tr key={d.id} className="border-b">
                  <td className="py-1">{subjectNameMap[d.subject_id] ?? '—'}</td>
                  <td className="py-1">{d.exam_date}</td>
                  <td className="py-1">
                    {d.start_time && d.end_time
                      ? `${d.start_time} – ${d.end_time}`
                      : d.start_time ?? '—'}
                  </td>
                  <td className="py-1">{d.venue ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Generated: {new Date().toLocaleDateString()}</span>
        <span>Signature: _______________</span>
      </div>
    </div>
  )
}
