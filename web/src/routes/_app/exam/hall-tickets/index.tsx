import { createFileRoute } from '@tanstack/react-router'
import HallTicketsExamList from '@/pages/exam/HallTicketsExamList'

export const Route = createFileRoute('/_app/exam/hall-tickets/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <HallTicketsExamList />
}
