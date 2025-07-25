import RouteStopsPage from '@/pages/transport/routeStops'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/routeStops')({
  component: RouteComponent,
})

function RouteComponent() {
  return <RouteStopsPage />
}
