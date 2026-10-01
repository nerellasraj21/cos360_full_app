import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuthStore } from '@/lib/authStore'
import { useMenuData } from '@/lib/menuUtils'
import { getIconForMenuItem, getModuleUrl } from '@/components/ui/sidebar'

export const Route = createFileRoute('/_app/dashboard')({
  component: Dashboard,
})

const cardColors = [
  { color: 'text-chart-1', bg: 'bg-chart-1/10 border-chart-1/20 hover:bg-chart-1/20' },
  { color: 'text-chart-2', bg: 'bg-chart-2/10 border-chart-2/20 hover:bg-chart-2/20' },
  { color: 'text-chart-3', bg: 'bg-chart-3/10 border-chart-3/20 hover:bg-chart-3/20' },
  { color: 'text-chart-4', bg: 'bg-chart-4/10 border-chart-4/20 hover:bg-chart-4/20' },
  { color: 'text-chart-5', bg: 'bg-chart-5/10 border-chart-5/20 hover:bg-chart-5/20' },
]

const descriptionMap: Record<string, string> = {
  masters: 'Academic years, classes, subjects and other master data',
  students: 'Admissions, attendance, documents and student records',
  student: 'Admissions, attendance, documents and student records',
  staff: 'Staff enrollment, designations and attendance',
  'staff management': 'Staff enrollment, designations and attendance',
  'exam management': 'Exams, marks, results and hall tickets',
  exams: 'Exams, marks, results and hall tickets',
  fee: 'Fee collection, receipts and transactions',
  'fee management': 'Fee collection, receipts and transactions',
  fees: 'Fee collection, receipts and transactions',
  expense: 'Expense transactions, approvals and summaries',
  transport: 'Routes, vehicles and trips',
  communication: 'Send notifications and manage templates',
  reports: 'Analytics and reports across modules',
  administration: 'Users, roles and system settings',
}

function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const { data: menuData = [] } = useMenuData()

  const modules = menuData.filter((item) => item.name.toLowerCase() !== 'dashboard')
  const displayName = user?.parent_profile?.name || user?.username

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle={
          displayName
            ? `Welcome back, ${displayName}${role?.name ? ` (${role.name})` : ''}`
            : 'Welcome to COS360 School Management System'
        }
        icon={<LayoutDashboard className="h-5 w-5" />}
      />

      {modules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((item, index) => {
            const Icon = getIconForMenuItem(item.name)
            const colors = cardColors[index % cardColors.length]
            const description =
              descriptionMap[item.name.toLowerCase()] ||
              `Open ${item.name.toLowerCase()}`

            return (
              <Card
                key={`${item.id}-${index}`}
                className={`cursor-pointer transition-colors ${colors.bg}`}
                onClick={() => navigate({ to: getModuleUrl(item.name) })}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-background shrink-0">
                      <Icon className={`h-5 w-5 ${colors.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{item.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
