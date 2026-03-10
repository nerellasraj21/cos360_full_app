import { createFileRoute } from '@tanstack/react-router'
import { Clock, ShieldCheck, Users, Key, Activity, Settings, UserCog, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'

export const Route = createFileRoute('/_app/admin/')({
  component: AdminDashboard,
})

const sections = [
  {
    icon: Users,
    title: 'User Management',
    description: 'Manage user accounts and access across the organization',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Roles & Permissions',
    description: 'Configure roles and fine-grained access control',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: Key,
    title: 'API Keys',
    description: 'Manage API keys and third-party integrations',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Activity,
    title: 'Audit Logs',
    description: 'View system activity and security audit trails',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: UserCog,
    title: 'Profile Settings',
    description: 'Organization profile and administrator settings',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configure system notifications and alerts',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Settings,
    title: 'System Settings',
    description: 'Global system configuration and preferences',
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
  },
]

function AdminDashboard() {
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
      <div>
        <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Administration Sections
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title} className="opacity-70">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${section.bg} shrink-0`}>
                      <Icon className={`h-5 w-5 ${section.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{section.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  )
}
