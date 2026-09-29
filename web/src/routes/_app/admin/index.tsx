import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Clock, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/lib/authStore'
import { getIconForMenuItem } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
})

const cardColors = [
  { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { color: 'text-green-500', bg: 'bg-green-500/10' },
  { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { color: 'text-red-500', bg: 'bg-red-500/10' },
  { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { color: 'text-gray-500', bg: 'bg-gray-500/10' },
  { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
]

const descriptionMap: Record<string, string> = {
  'User Management': 'Manage user accounts and access across the organization',
  'Roles & Permissions': 'Configure roles and fine-grained access control',
  'Role Management': 'Configure roles and fine-grained access control',
  'Permission Management': 'Manage granular permissions for each role',
  'Menu Management': 'Configure sidebar menu items and visibility',
  'API Keys': 'Manage API keys and third-party integrations',
  'Audit Logs': 'View system activity and security audit trails',
  'Audit Log': 'View system activity and security audit trails',
  'Profile Settings': 'Organization profile and administrator settings',
  'Notifications': 'Configure system notifications and alerts',
  'System Settings': 'Global system configuration and preferences',
  'Settings': 'Global system configuration and preferences',
}

function AdminDashboard() {
  const menuItems = useAuthStore((s) => s.menuItems)
  const navigate = useNavigate()

  const adminMenu = menuItems.find(
    (item) => ['admin', 'administration'].includes(item.name.toLowerCase())
  )
  const sections = adminMenu?.children ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        subtitle="Manage system settings, users, roles, and organization-wide configurations"
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </Badge>
        }
      />

      {/* Coming Soon Banner */}
      <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 p-8 text-center">
        <ShieldCheck className="h-12 w-12 text-slate-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-400">
          Administration Dashboard — Coming Soon
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          A centralized administration panel with system health, user stats, and quick actions is being built. Use the sidebar to access available admin sections.
        </p>
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Administration Sections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section, index) => {
              const Icon = getIconForMenuItem(section.name)
              const colors = cardColors[index % cardColors.length]
              const description = descriptionMap[section.name] || `Manage ${section.name.toLowerCase()}`
              const hasPath = !!section.path

              return (
                <Card
                  key={section.id}
                  className={hasPath ? 'cursor-pointer hover:shadow-md transition-shadow' : 'opacity-70'}
                  onClick={() => {
                    if (hasPath) {
                      navigate({ to: section.path! })
                    }
                  }}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colors.bg} shrink-0`}>
                        <Icon className={`h-5 w-5 ${colors.color}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{section.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
