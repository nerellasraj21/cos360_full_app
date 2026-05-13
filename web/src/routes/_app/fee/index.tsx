import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/lib/authStore'
import FeeDashboard from '@/pages/fee/FeeDashboard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Banknote, IndianRupee, Receipt } from 'lucide-react'

export const Route = createFileRoute('/_app/fee/')({
    component: FeeIndexPage,
})

const cardColors = [
    { color: 'text-blue-500',  bg: 'bg-blue-500/10' },
    { color: 'text-green-500', bg: 'bg-green-500/10' },
]

const STUDENT_FEE_SECTIONS = [
    { name: 'My Fees',     path: '/fee/my-fees',    icon: IndianRupee, description: 'View your fee summary and due amounts' },
    { name: 'My Receipts', path: '/fee/my-receipts', icon: Receipt,     description: 'View your fee payment receipts' },
]

function FeeIndexPage() {
    const permissionsMap = useAuthStore((s) => s.permissionsMap) ?? {}
    const navigate = useNavigate()

    const hasAdminFeeAccess = ['fee_categories', 'fee_types', 'fee_terms'].some(
        r => permissionsMap[r]?.includes('list')
    )

    if (hasAdminFeeAccess) return <FeeDashboard />

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fee"
                subtitle="View your fees and receipts"
                icon={<Banknote className="h-5 w-5" />}
            />
            <div>
                <h3 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                    Fee Sections
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {STUDENT_FEE_SECTIONS.map((section, index) => {
                        const Icon = section.icon
                        const colors = cardColors[index % cardColors.length]
                        return (
                            <Card
                                key={section.path}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => navigate({ to: section.path })}
                            >
                                <CardContent className="pt-5 pb-4">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${colors.bg} shrink-0`}>
                                            <Icon className={`h-5 w-5 ${colors.color}`} />
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
        </div>
    )
}