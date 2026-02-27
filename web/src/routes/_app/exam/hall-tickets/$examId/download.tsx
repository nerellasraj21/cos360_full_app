import { createFileRoute } from '@tanstack/react-router'
import HallTicketDownload from '@/pages/exam/HallTicketDownload'

export const Route = createFileRoute('/_app/exam/hall-tickets/$examId/download')({
  component: RouteComponent,
})

function RouteComponent() {
  return <HallTicketDownload />
}
