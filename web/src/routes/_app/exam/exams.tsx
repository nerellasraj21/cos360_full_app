import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/exam/exams')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
