import { createFileRoute } from '@tanstack/react-router'
import ExamDates from '@/pages/exam/ExamDates'

export const Route = createFileRoute('/_app/exam/exams/$id/dates')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamDates />
}
