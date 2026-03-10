import { createFileRoute } from '@tanstack/react-router'
import { Clock, BarChart2, FileText, TrendingUp, PieChart, Download, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsDashboard,
})

const sections = [
  {
    icon: Users,
    title: 'Student Reports',
    description: 'Attendance, performance, and enrollment analytics',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: TrendingUp,
    title: 'Fee Reports',
    description: 'Fee collection, outstanding dues, and payment summaries',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: BarChart2,
    title: 'Academic Reports',
    description: 'Exam results, marks, and grade distribution',
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  {
    icon: FileText,
    title: 'Expense Reports',
    description: 'Expense analysis, budget vs actual, and department-wise reports',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: PieChart,
    title: 'Transport Reports',
    description: 'Route utilization, vehicle usage, and trip analytics',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: Download,
    title: 'Export & Downloads',
    description: 'Bulk export data in CSV, PDF, and Excel formats',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
]

function ReportsDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Comprehensive analytics and reporting across all school modules"
        icon={<BarChart2 className="h-5 w-5" />}
        actions={
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </Badge>
        }
      />

      {/* Coming Soon Banner */}
      <div className="rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-8 text-center">
        <BarChart2 className="h-12 w-12 text-indigo-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-indigo-700 dark:text-indigo-400">
          Reports Dashboard — Coming Soon
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          A unified reporting hub with charts, filters, and export options is being built. Module-specific reports are already available in each module section.
        </p>
      </div>

      {/* Sections */}
      <div>
        <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Reports Sections
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
