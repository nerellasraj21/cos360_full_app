import { createFileRoute } from '@tanstack/react-router'
import { Clock, GraduationCap, UserCheck, FileText, Award, BookOpen, FolderOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'

export const Route = createFileRoute('/_app/students/')({
  component: StudentsDashboard,
})

const sections = [
  {
    icon: GraduationCap,
    title: 'Admission',
    description: 'Manage student admissions and enrollment records',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: UserCheck,
    title: 'Attendance',
    description: 'Track and manage daily student attendance',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: FileText,
    title: 'Documents',
    description: 'Upload and manage student documents',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Award,
    title: 'Certificates',
    description: 'Issue and manage student certificates',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: BookOpen,
    title: 'Profile',
    description: 'View and update student profile details',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: FolderOpen,
    title: 'Reports',
    description: 'Generate and export student reports',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
]

function StudentsDashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Students Dashboard"
        subtitle="Comprehensive management of student data, admissions, and records"
        icon={<GraduationCap className="h-5 w-5" />}
        actions={
          <Badge variant="secondary" className="flex items-center gap-1.5 px-3 py-1.5 text-sm">
            <Clock className="h-3.5 w-3.5" />
            Coming Soon
          </Badge>
        }
      />

      {/* Coming Soon Banner */}
      <div className="rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-8 text-center">
        <GraduationCap className="h-12 w-12 text-blue-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
          Students Dashboard — Coming Soon
        </h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          A unified dashboard with quick stats and shortcuts is being built. Use the sidebar menu to navigate individual sections.
        </p>
      </div>

      {/* Sections */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-muted-foreground uppercase tracking-wide text-xs">
          Students Sections
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
