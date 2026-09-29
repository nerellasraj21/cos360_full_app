import RoutesPage from '@/pages/transport/routes'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/masters/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <RoutesPage />
}
