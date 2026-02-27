import { createFileRoute } from '@tanstack/react-router'
import ResultsPublish from '@/pages/exam/ResultsPublish'

export const Route = createFileRoute('/_app/exam/exams/$id/results')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ResultsPublish />
}
