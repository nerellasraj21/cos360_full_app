import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Database } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/lib/authStore'
import { getIconForMenuItem } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app/masters/')({
  component: MastersDashboard,
})

// Color palette for cards — cycles through these
const cardColors = [
  { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { color: 'text-green-500', bg: 'bg-green-500/10' },
  { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { color: 'text-muted-foreground', bg: 'bg-muted' },
  { color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
]

// Description map for known submodules
const descriptionMap: Record<string, string> = {
  'Academic Years': 'Configure and manage academic year cycles',
  'Classes & Sections': 'Manage classes, sections and their configurations',
  'Staff Management': 'Manage staff enrollment and designations',
  'Subject Categories': 'Organize subjects into categories',
  'Subjects': 'Define subjects and subject details',
  'Class Subject Mappings': 'Map subjects to classes and sections',
  'Parents': 'Manage parent and guardian information',
  'Holidays': 'Configure school holidays and calendar events',
  'Timetable Management': 'Manage class timetables and schedules',
  'Routes & Stops': 'Manage transport routes and route stops',
  'Vehicles & Trips': 'Manage fleet vehicles and trip schedules',
  'Roles & Permissions': 'Configure roles and access permissions',
}

function MastersDashboard() {
  const menuItems = useAuthStore((s) => s.menuItems)
  const navigate = useNavigate()

  // Find the "Masters" top-level menu item and get its children
  const mastersMenu = menuItems.find(
    (item) => item.name.toLowerCase() === 'masters'
  )
  const sections = mastersMenu?.children ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Masters Dashboard"
        subtitle="Configure and manage all master data for the school system"
        icon={<Database className="h-5 w-5" />}
      />

      {/* Sections */}
      {sections.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
            Masters Sections
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
