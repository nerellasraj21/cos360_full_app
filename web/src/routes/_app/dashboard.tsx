import { createFileRoute } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'

export const Route = createFileRoute('/_app/dashboard')({
  component: () => (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to COS360 School Management System"
        icon={<LayoutDashboard className="h-5 w-5" />}
      />
    </div>
  ),
})