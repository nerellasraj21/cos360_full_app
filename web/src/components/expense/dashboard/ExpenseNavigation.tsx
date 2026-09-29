import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, FileText, Settings, BarChart3, FolderOpen, Receipt } from 'lucide-react';

interface ExpenseNavigationProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export function ExpenseNavigation({ activeTab, onTabChange }: ExpenseNavigationProps) {
    const tabs = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: BarChart3,
            description: 'Overview and analytics'
        },
        {
            id: 'categories',
            label: 'Categories',
            icon: FolderOpen,
            description: 'Manage expense categories'
        },
        {
            id: 'types',
            label: 'Types',
            icon: FileText,
            description: 'Configure expense types'
        },
        {
            id: 'transactions',
            label: 'Transactions',
            icon: Receipt,
            description: 'Record and manage expenses'
        },
        {
            id: 'reports',
            label: 'Reports',
            icon: BarChart3,
            description: 'Generate expense reports'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: Settings,
            description: 'Configure expense settings'
        }
    ];

    return (
        <Card>
            <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className="flex flex-col items-center gap-2 p-3 h-auto"
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="text-xs font-medium">{tab.label}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>

                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            {(() => {
                                const activeTabData = tabs.find(tab => tab.id === activeTab);
                                if (!activeTabData) return null;
                                const Icon = activeTabData.icon;
                                return (
                                    <>
                                        <Icon className="h-5 w-5" />
                                        <div>
                                            <h3 className="font-medium">
                                                {activeTabData.label}
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {activeTabData.description}
                                            </p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}