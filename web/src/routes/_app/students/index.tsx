import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/lib/authStore'
import { getIconForMenuItem } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app/students/')({
  component: StudentsDashboard,
})

const cardColors = [
  { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { color: 'text-green-500', bg: 'bg-green-500/10' },
  { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { color: 'text-rose-500', bg: 'bg-rose-500/10' },
  { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { color: 'text-teal-500', bg: 'bg-teal-500/10' },
  { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { color: 'text-pink-500', bg: 'bg-pink-500/10' },
]

const descriptionMap: Record<string, string> = {
  'Admission': 'Manage student admissions and enrollment records',
  'Student Admission': 'Manage student admissions and enrollment records',
  'Attendance': 'Track and manage daily student attendance',
  'Student Attendance': 'Track and manage daily student attendance',
  'Documents': 'Upload and manage student documents',
  'Student Documents': 'Upload and manage student documents',
  'Certificates': 'Issue and manage student certificates',
  'Student Certificates': 'Issue and manage student certificates',
  'My Certificates': 'View your certificates',
  'My Documents': 'View your documents',
  'Profile': 'View and update student profile details',
  'Reports': 'Generate and export student reports',
  'Student Transport': 'View student transport assignments',
}

function StudentsDashboard() {
  const menuItems = useAuthStore((s) => s.menuItems)
  const navigate = useNavigate()

  const studentsMenu = menuItems.find(
    (item) => item.name.toLowerCase() === 'students'
  )
  const HIDDEN = new Set(['student transport'])
  const sections = (studentsMenu?.children ?? []).filter(
    (c) => !HIDDEN.has(c.name.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students Dashboard"
        subtitle="Comprehensive management of student data, admissions, and records"
        icon={<GraduationCap className="h-5 w-5" />}
      />

      {sections.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Students Sections
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
