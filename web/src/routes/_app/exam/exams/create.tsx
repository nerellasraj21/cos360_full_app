import { createFileRoute } from '@tanstack/react-router'
import CreateExam from '@/pages/exam/CreateExam'

export const Route = createFileRoute('/_app/exam/exams/create')({
  component: RouteComponent,
})

function RouteComponent() {
  return <CreateExam />
}
