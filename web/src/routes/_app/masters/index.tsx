import { createFileRoute } from '@tanstack/react-router'
import { Clock, Settings, BookOpen, Users, Calendar, Tag, Link2, MapPin, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/_app/masters/')({
  component: MastersDashboard,
})

const sections = [
  {
    icon: BookOpen,
    title: 'Academic Years',
    description: 'Configure and manage academic year cycles',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Tag,
    title: 'Classes & Sections',
    description: 'Manage classes, sections and their configurations',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: BookOpen,
    title: 'Subjects',
    description: 'Define subjects and subject categories',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Link2,
    title: 'Class Subject Mappings',
    description: 'Map subjects to classes and sections',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Users,
    title: 'Parents',
    description: 'Manage parent and guardian information',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Calendar,
    title: 'Holidays',
    description: 'Configure school holidays and calendar events',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
  {
    icon: MapPin,
    title: 'Routes & Stops',
    description: 'Manage transport routes and route stops',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Truck,
    title: 'Vehicles & Trips',
    description: 'Manage fleet vehicles and trip schedules',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
  },
  {
    icon: Settings,
    title: 'Roles & Permissions',
    description: 'Configure roles and access permissions',
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
  },
]

function MastersDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Masters Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Configure and manage all master data for the school system
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
          <Clock className="h-3.5 w-3.5" />
          Coming Soon
        </Badge>
      </div>

      {/* Coming Soon Banner */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-950/20 p-8 text-center">
        <Settings className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-400">
          Masters Dashboard — Coming Soon
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          A unified overview and quick-access dashboard is being built. Use the sidebar menu to navigate individual master data sections.
        </p>
      </div>

      {/* Sections */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
          Masters Sections
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
