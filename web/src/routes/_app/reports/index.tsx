import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/lib/authStore'
import { getIconForMenuItem } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsDashboard,
})

const cardColors = [
  { color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { color: 'text-green-500', bg: 'bg-green-500/10' },
  { color: 'text-red-500', bg: 'bg-red-500/10' },
  { color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
]

const descriptionMap: Record<string, string> = {
  'Student Reports': 'Attendance, performance, and enrollment analytics',
  'Fee Reports': 'Fee collection, outstanding dues, and payment summaries',
  'Academic Reports': 'Exam results, marks, and grade distribution',
  'Expense Reports': 'Expense analysis, budget vs actual, and department-wise reports',
  'Transport Reports': 'Route utilization, vehicle usage, and trip analytics',
  'Staff Reports': 'Staff attendance, performance, and workforce analytics',
  'Export & Downloads': 'Bulk export data in CSV, PDF, and Excel formats',
}

function ReportsDashboard() {
  const menuItems = useAuthStore((s) => s.menuItems)
  const navigate = useNavigate()

  const reportsMenu = menuItems.find(
    (item) => item.name.toLowerCase() === 'reports'
  )
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const menuSections = reportsMenu?.children ?? []
  const fallbackSections = [
    hasPermission('fee_reports', 'read') ? { id: 'fee-reports', name: 'Fee Reports', path: '/fee/reports' } : null,
    hasPermission('expense_reports', 'read') ? { id: 'expense-reports', name: 'Expense Reports', path: '/expense/reports' } : null,
  ].filter((section): section is { id: string; name: string; path: string } => section !== null)
  const sections = menuSections.length > 0 ? menuSections : fallbackSections

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Comprehensive analytics and reporting across all school modules"
        icon={<BarChart2 className="h-5 w-5" />}
      />

      {/* Sections */}
      {sections.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Reports Sections
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sections.map((section, index) => {
              const Icon = getIconForMenuItem(section.name)
              const colors = cardColors[index % cardColors.length]
              const description = descriptionMap[section.name] || `${section.name} analytics and reports`
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
