import { createFileRoute } from '@tanstack/react-router'
import ResultsExamList from '@/pages/exam/ResultsExamList'

export const Route = createFileRoute('/_app/exam/results/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ResultsExamList />
}
