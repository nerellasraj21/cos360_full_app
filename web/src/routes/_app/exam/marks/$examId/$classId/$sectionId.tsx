import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/exam/marks/$examId/$classId/$sectionId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
