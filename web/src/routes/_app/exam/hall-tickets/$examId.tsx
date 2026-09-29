import { createFileRoute } from '@tanstack/react-router'
import HallTicketEligibility from '@/pages/exam/HallTicketEligibility'

export const Route = createFileRoute('/_app/exam/hall-tickets/$examId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <HallTicketEligibility />
}
