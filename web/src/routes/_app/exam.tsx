import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/exam')({
  component: ExamLayout,
})

function ExamLayout() {
  return (
    <div className="exam-layout">
      <Outlet />
    </div>
  )
}
