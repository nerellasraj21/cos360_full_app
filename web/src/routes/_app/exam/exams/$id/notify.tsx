import { createFileRoute } from '@tanstack/react-router'
import ExamNotification from '@/pages/exam/ExamNotification'

export const Route = createFileRoute('/_app/exam/exams/$id/notify')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamNotification />
}
