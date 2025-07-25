import { createFileRoute } from '@tanstack/react-router'
import VehiclePage from '@/pages/transport/vehicles';

export const Route = createFileRoute('/_app/transport/vehicles')({
  component: RouteComponent,
})

function RouteComponent() {
  return <VehiclePage />
}
