import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from '@tanstack/react-router';

interface NavigationItem {
    title: string;
    description: string;
    path: string;
    icon: string;
    color: string;
}

const navigationItems: NavigationItem[] = [
    {
        title: 'Fee Categories',
        description: 'Manage fee categories and their associated fee types',
        path: '/fee/categories',
        icon: '📁',
        color: 'bg-chart-1/10 border-chart-1/20',
    },
    {
        title: 'Fee Types',
        description: 'Manage individual fee types and their properties',
        path: '/fee/types',
        icon: '🏷️',
        color: 'bg-chart-2/10 border-chart-2/20',
    },
    {
        title: 'Fee Terms',
        description: 'Configure fee terms and payment schedules',
        path: '/fee/terms',
        icon: '📅',
        color: 'bg-chart-3/10 border-chart-3/20',
    },
    {
        title: 'Fee Mappings',
        description: 'Configure fee mappings for classes and term amounts',
        path: '/fee/mappings',
        icon: '🔗',
        color: 'bg-chart-4/10 border-chart-4/20',
    },
    {
        title: 'Fee Term Amounts',
        description: 'Manage fee term amount configurations',
        path: '/fee/termamounts',
        icon: '💰',
        color: 'bg-chart-5/10 border-chart-5/20',
    },
    {
        title: 'Fee Collection',
        description: 'Collect and manage fee payments from students',
        path: '/fee/collection',
        icon: '💳',
        color: 'bg-chart-6/10 border-chart-6/20',
    },
    {
        title: 'Fee Receipts',
        description: 'View and manage fee payment receipts',
        path: '/fee/receipts',
        icon: '🧾',
        color: 'bg-chart-7/10 border-chart-7/20',
    },
    {
        title: 'Fee Refunds',
        description: 'Process and manage fee refunds for students',
        path: '/fee/refunds',
        icon: '↩️',
        color: 'bg-chart-1/10 border-chart-1/20',
    },
];

export function FeeNavigation() {
    const navigate = useNavigate();

    const handleNavigate = (path: string) => {
        navigate({ to: path });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fee Management Sections</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {navigationItems.map((item) => (
                    <Card key={item.path} className={`cursor-pointer transition-all hover:shadow-md ${item.color}`}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{item.icon}</span>
                                <div>
                                    <CardTitle className="text-base">{item.title}</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <CardDescription className="text-sm mb-3">
                                {item.description}
                            </CardDescription>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleNavigate(item.path)}
                            >
                                Manage
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}