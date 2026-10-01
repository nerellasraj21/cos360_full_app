import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Building2,
    Users,
    Activity,
    FileText,
    Settings,
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Database,
    Server,
    Clock
} from 'lucide-react';
import {
    useTenants,
    useSystemHealth,
    useSystemLogs,
    usePlans,
    useCreateTenant,
    useUpdateTenant,
    useDeleteTenant
} from '@/api/superadmin';
import type { TenantRead, SystemHealth, SystemLog, PlanRead } from '@/types/superadmin';

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('tenants');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateTenantOpen, setIsCreateTenantOpen] = useState(false);

    // API hooks
    const { data: tenantsData, isLoading: tenantsLoading } = useTenants({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50
    });
    const { data: systemHealth, isLoading: healthLoading } = useSystemHealth();
    const { data: systemLogs, isLoading: logsLoading } = useSystemLogs({ limit: 100 });
    const { data: plansData, isLoading: plansLoading } = usePlans();

    const createTenantMutation = useCreateTenant();
    const updateTenantMutation = useUpdateTenant();
    const deleteTenantMutation = useDeleteTenant();

    const tenants = tenantsData?.items || [];
    const plans = plansData?.items || [];
    const logs = systemLogs?.items || [];

    const filteredTenants = tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );


    const getHealthStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-600';
            case 'warning': return 'text-yellow-600';
            case 'unhealthy': return 'text-red-600';
            default: return 'text-muted-foreground';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <PageHeader
                title="Super Admin Dashboard"
                subtitle="Manage tenants, monitor system health, and oversee platform operations"
                icon={<Settings className="h-5 w-5" />}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="tenants" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Tenants ({tenants.length})
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        System Health
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        System Logs
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Plans ({plans.length})
                    </TabsTrigger>
                </TabsList>

                {/* Tenants Tab */}
                <TabsContent value="tenants" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Tenant Management</CardTitle>
                                    <CardDescription>
                                        Manage all tenants across the platform
                                    </CardDescription>
                                </div>
                                <Dialog open={isCreateTenantOpen} onOpenChange={setIsCreateTenantOpen}>
                                    <DialogTrigger asChild>
                                        <Button className="flex items-center gap-2">
                                            <Plus className="w-4 h-4" />
                                            Create Tenant
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create New Tenant</DialogTitle>
                                            <DialogDescription>
                                                Add a new tenant to the platform
                                            </DialogDescription>
                                        </DialogHeader>
                                        {/* Tenant creation form would go here */}
                                        <div className="text-center py-4">
                                            <p className="text-muted-foreground">Tenant creation form coming soon...</p>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tenants..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="suspended">Suspended</SelectItem>
                                        <SelectItem value="terminated">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Tenant</TableHead>
                                            <TableHead>Domain</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Plan</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {tenantsLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    Loading tenants...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredTenants.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    No tenants found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredTenants.map((tenant) => (
                                                <TableRow key={tenant.id}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{tenant.name}</div>
                                                            <div className="text-sm text-muted-foreground">
                                                                {tenant.admin_email}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-sm">{tenant.domain}</code>
                                                    </TableCell>
                                                    <TableCell><StatusBadge status={tenant.status} /></TableCell>
                                                    <TableCell>
                                                        {plans.find(p => p.id === tenant.plan_id)?.name || tenant.plan_id}
                                                    </TableCell>
                                                    <TableCell>{formatDate(tenant.created_at)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm">
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" className="text-destructive">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Health Tab */}
                <TabsContent value="health" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Overall Status</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${getHealthStatusColor(systemHealth?.status || 'unknown')}`}>
                                    {systemHealth?.status || 'Unknown'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Last updated: {systemHealth ? formatDate(systemHealth.timestamp) : 'Never'}
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Database</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${
                                    systemHealth?.database === 'connected' ? 'text-green-600' :
                                    systemHealth?.database === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                    {systemHealth?.database || 'Unknown'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Redis</CardTitle>
                                <Server className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${
                                    systemHealth?.redis === 'connected' ? 'text-green-600' :
                                    systemHealth?.redis === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                    {systemHealth?.redis || 'Unknown'}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {systemHealth?.memory_usage ?
                                        `${Math.round(systemHealth.memory_usage.percentage)}%` :
                                        'N/A'
                                    }
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {systemHealth?.memory_usage ?
                                        `${Math.round(systemHealth.memory_usage.used / 1024 / 1024)}MB used` :
                                        'Memory info unavailable'
                                    }
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* System Logs Tab */}
                <TabsContent value="logs" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Logs</CardTitle>
                            <CardDescription>
                                Recent system activity and error logs
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {logsLoading ? (
                                    <div className="text-center py-8">Loading logs...</div>
                                ) : logs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">No logs available</div>
                                ) : (
                                    logs.slice(0, 50).map((log, index) => (
                                        <div key={index} className="flex items-start gap-4 p-4 border rounded-lg">
                                            <div className={`w-2 h-2 rounded-full mt-2 ${
                                                log.level === 'ERROR' ? 'bg-red-500' :
                                                log.level === 'WARNING' ? 'bg-yellow-500' :
                                                log.level === 'INFO' ? 'bg-blue-500' : 'bg-gray-500'
                                            }`} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant={
                                                        log.level === 'ERROR' ? 'destructive' :
                                                        log.level === 'WARNING' ? 'secondary' : 'outline'
                                                    }>
                                                        {log.level}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground">
                                                        {log.module}
                                                    </span>
                                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {formatDate(log.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-sm">{log.message}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Plans Tab */}
                <TabsContent value="plans" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Plan Management</CardTitle>
                            <CardDescription>
                                Manage subscription plans and pricing
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {plansLoading ? (
                                    <div className="col-span-full text-center py-8">Loading plans...</div>
                                ) : plans.length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-muted-foreground">No plans available</div>
                                ) : (
                                    plans.map((plan) => (
                                        <Card key={plan.id} className="relative">
                                            <CardHeader>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                                                        <CardDescription>{plan.description}</CardDescription>
                                                    </div>
                                                    <StatusBadge status={plan.is_active} />
                                                </div>
                                                <div className="text-3xl font-bold text-primary">
                                                    ${plan.price}
                                                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {plan.features.map((feature, index) => (
                                                        <li key={index} className="flex items-center gap-2 text-sm">
                                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default SuperAdminDashboard;