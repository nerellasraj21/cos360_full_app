import { createFileRoute } from '@tanstack/react-router'
import StudentResults from '@/pages/exam/StudentResults'

export const Route = createFileRoute('/_app/exam/results/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  return <StudentResults />
}
