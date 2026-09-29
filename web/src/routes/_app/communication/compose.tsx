import { createFileRoute, useNavigate } from '@tanstack/react-router'
import SendMessagePanel from '@/pages/Communication/SendMessagePanel'

export const Route = createFileRoute('/_app/communication/compose')({
  component: ComposePage,
})

function ComposePage() {
  const navigate = useNavigate()

  return (
    <SendMessagePanel
      onSendSuccess={() => navigate({ to: '/communication/logs' })}
    />
  )
}
