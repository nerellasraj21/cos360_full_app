import { createFileRoute } from '@tanstack/react-router'
import ExamSettings from '@/pages/exam/ExamSettings'

export const Route = createFileRoute('/_app/exam/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ExamSettings />
}
