import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/communication')({
  component: CommunicationLayout,
})

function CommunicationLayout() {
  return (
    <div className="communication-layout">
      <Outlet />
    </div>
  )
}
