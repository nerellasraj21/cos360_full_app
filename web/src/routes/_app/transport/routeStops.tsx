import RouteStopsPage from '@/pages/transport/routeStops'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/transport/routeStops')({
  component: RouteComponent,
})

function RouteComponent() {
  return <RouteStopsPage />
}
