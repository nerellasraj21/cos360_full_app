import { createFileRoute } from '@tanstack/react-router'
import SchoolSettingsPage from '@/pages/settings/SchoolSettings'

export const Route = createFileRoute('/_app/settings/school')({
  component: SchoolSettingsPage,
})
