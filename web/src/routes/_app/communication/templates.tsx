import { createFileRoute } from '@tanstack/react-router'
import TemplatesTab from '@/pages/Communication/TemplatesTab'

export const Route = createFileRoute('/_app/communication/templates')({
  component: TemplatesPage,
})

function TemplatesPage() {
  return <TemplatesTab />
}
