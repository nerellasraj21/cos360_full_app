import { createFileRoute } from '@tanstack/react-router'
import LogsTab from '@/pages/Communication/LogsTab'

export const Route = createFileRoute('/_app/communication/logs')({
  component: LogsPage,
})

function LogsPage() {
  return <LogsTab />
}
