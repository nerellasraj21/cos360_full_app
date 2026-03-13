import { createFileRoute, useNavigate } from '@tanstack/react-router'
import ComposeTab from '@/pages/Communication/ComposeTab'

export const Route = createFileRoute('/_app/communication/compose')({
  component: ComposePage,
})

function ComposePage() {
  const navigate = useNavigate()

  return (
    <ComposeTab
      onSendSuccess={() => navigate({ to: '/communication/logs' })}
    />
  )
}
