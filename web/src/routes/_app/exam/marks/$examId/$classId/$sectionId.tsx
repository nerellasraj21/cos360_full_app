import { createFileRoute } from '@tanstack/react-router'
import MarkEntryGrid from '@/pages/exam/MarkEntryGrid'

export const Route = createFileRoute('/_app/exam/marks/$examId/$classId/$sectionId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <MarkEntryGrid />
}
