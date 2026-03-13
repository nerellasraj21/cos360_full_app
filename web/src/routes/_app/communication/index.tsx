import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Send, FileText, ScrollText, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/PageHeader'

export const Route = createFileRoute('/_app/communication/')({
  component: CommunicationDashboard,
})

const sections = [
  {
    name: 'Compose',
    description: 'Send notifications via SMS, WhatsApp, or email',
    path: '/communication/compose',
    icon: Send,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    name: 'Templates',
    description: 'Create and manage message templates',
    path: '/communication/templates',
    icon: FileText,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    name: 'Logs',
    description: 'View sent notification history and delivery status',
    path: '/communication/logs',
    icon: ScrollText,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
]

function CommunicationDashboard() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication"
        subtitle="Send notifications, manage templates, and track delivery across all channels"
        icon={<MessageSquare className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Card
              key={section.name}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate({ to: section.path })}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${section.bg} shrink-0`}>
                    <Icon className={`h-5 w-5 ${section.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{section.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
