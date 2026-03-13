import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Clock, Truck, Bus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/lib/authStore'
import { getIconForMenuItem } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app/transport/')({
  component: TransportDashboard,
})

const cardColors = [
  { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { color: 'text-green-500', bg: 'bg-green-500/10' },
  { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
]

const descriptionMap: Record<string, string> = {
  'Routes': 'Manage transport routes and their configurations',
  'Route Stops': 'Configure pickup and drop-off stops along routes',
  'Vehicles': 'Manage the school vehicle fleet and details',
  'Trips': 'Schedule and track vehicle trips',
  'Transport Trips': 'Schedule and track vehicle trips',
  'Pricing': 'Configure transport pricing plans and billing cycles',
  'Transport Pricing': 'Configure transport pricing plans and billing cycles',
  'Student Transport': 'Assign and manage student transport allocations',
  'Student Trips': 'Track student trip assignments and history',
}

function TransportDashboard() {
  const menuItems = useAuthStore((s) => s.menuItems)
  const navigate = useNavigate()

  const transportMenu = menuItems.find(
    (item) => item.name.toLowerCase() === 'transport'
  )
  const sections = transportMenu?.children ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Dashboard"
        subtitle="Manage school transport, routes, vehicles, and student allocations"
        icon={<Bus className="h-5 w-5" />}
        actions={
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </Badge>
        }
      />

      {/* Coming Soon Banner */}
      <div className="rounded-xl border-2 border-dashed border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20 p-8 text-center">
        <Truck className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-400">
          Transport Dashboard — Coming Soon
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          A unified transport overview with live tracking and stats is being built. Use the sidebar menu to navigate individual transport sections.
        </p>
      </div>

      {/* Sections */}
      {sections.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Transport Sections
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
