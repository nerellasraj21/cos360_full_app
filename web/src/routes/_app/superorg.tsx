import { createFileRoute } from '@tanstack/react-router'
import SuperOrgPage from '@/pages/superorg/SuperOrgPage'

export const Route = createFileRoute('/_app/superorg')({
  component: SuperOrgPage,
})