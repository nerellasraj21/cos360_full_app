import StudentTripsPage from '@/pages/transport/studentTrips'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/transport/studentTrips')({
  component: RouteComponent,
})

function RouteComponent() {
  return <StudentTripsPage />
}