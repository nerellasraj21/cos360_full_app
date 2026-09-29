import { createFileRoute } from '@tanstack/react-router'
import MarkEntryExamList from '@/pages/exam/MarkEntryExamList'

export const Route = createFileRoute('/_app/exam/marks/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MarkEntryExamList />
}
