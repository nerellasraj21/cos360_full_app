import StudentTransportPage from '@/pages/transport/studentTransport'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/transport/studentTransport')({
  component: RouteComponent,
})

function RouteComponent() {
  return <StudentTransportPage />
}