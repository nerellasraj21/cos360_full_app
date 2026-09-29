import { createFileRoute } from '@tanstack/react-router'
import MarkEntrySummary from '@/pages/exam/MarkEntrySummary'

export const Route = createFileRoute('/_app/exam/marks/$examId/summary')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MarkEntrySummary />
}
