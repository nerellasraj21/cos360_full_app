import { createFileRoute } from '@tanstack/react-router'
import ExamDetail from '@/pages/exam/ExamDetail'

export const Route = createFileRoute('/_app/exam/exams/$id/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamDetail />
}
