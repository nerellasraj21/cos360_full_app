import { createFileRoute } from '@tanstack/react-router'
import VehiclePage from '@/pages/transport/vehicles';

export const Route = createFileRoute('/_app/masters/vehicles')({
  component: RouteComponent,
})

function RouteComponent() {
  return <VehiclePage />
}
