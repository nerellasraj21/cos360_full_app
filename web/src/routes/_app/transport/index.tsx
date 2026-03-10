import { createFileRoute } from '@tanstack/react-router'
import { Clock, Truck, MapPin, RouteIcon, Users, Navigation, Bus, IndianRupee } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'

export const Route = createFileRoute('/_app/transport/')({
  component: TransportDashboard,
})

const sections = [
  {
    icon: RouteIcon,
    title: 'Routes',
    description: 'Manage transport routes and their configurations',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: MapPin,
    title: 'Route Stops',
    description: 'Configure pickup and drop-off stops along routes',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Truck,
    title: 'Vehicles',
    description: 'Manage the school vehicle fleet and details',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Navigation,
    title: 'Trips',
    description: 'Schedule and track vehicle trips',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: IndianRupee,
    title: 'Pricing',
    description: 'Configure transport pricing plans and billing cycles',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Users,
    title: 'Student Transport',
    description: 'Assign and manage student transport allocations',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Navigation,
    title: 'Student Trips',
    description: 'Track student trip assignments and history',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
]

function TransportDashboard() {
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
      <div>
        <h3 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
          Transport Sections
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
