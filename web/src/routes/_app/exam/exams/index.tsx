import { createFileRoute } from '@tanstack/react-router'
import ExamList from '@/pages/exam/ExamList'

export const Route = createFileRoute('/_app/exam/exams/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamList />
}
