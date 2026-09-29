import { createFileRoute } from '@tanstack/react-router'
import ExamDashboard from '@/pages/exam/ExamDashboard'

export const Route = createFileRoute('/_app/exam/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamDashboard />
}
