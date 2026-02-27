import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/exam/hall-tickets')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
