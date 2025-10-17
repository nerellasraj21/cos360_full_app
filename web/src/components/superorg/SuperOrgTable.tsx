import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreHorizontal,
    Search,
    Edit,
    Trash2,
    Eye,
    Globe,
    Database,
    Building2,
    Loader2
} from 'lucide-react';
import { useOrganizations, useDeleteOrganization, useDeactivateOrganization } from '@/api/organizations';
import type { OrganizationRead } from '@/types/organization';

const planNames = {
    1: 'Starter',
    2: 'Professional',
    3: 'Enterprise'
};

interface SuperOrgTableProps {
    onRefresh?: () => void;
    newOrganization?: OrganizationRead | null;
}

const SuperOrgTable: React.FC<SuperOrgTableProps> = ({ onRefresh, newOrganization }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Use the API hooks
    const { data: organizations = [], isLoading, error, refetch } = useOrganizations();
    const deleteOrganizationMutation = useDeleteOrganization();
    const deactivateOrganizationMutation = useDeactivateOrganization();

    // Refresh data when requested
    React.useEffect(() => {
        if (onRefresh) {
            refetch();
        }
    }, [onRefresh, refetch]);

    // Auto-refresh when new organization is created
    React.useEffect(() => {
        if (newOrganization) {
            refetch();
        }
    }, [newOrganization, refetch]);

    const filteredOrganizations = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (org: OrganizationRead) => {
        console.log('Edit organization:', org);
        // TODO: Implement edit functionality - open edit modal/form
    };

    const handleDelete = async (org: OrganizationRead) => {
        if (window.confirm(`Are you sure you want to delete "${org.name}"? This action cannot be undone.`)) {
            try {
                await deleteOrganizationMutation.mutateAsync(org.id);
            } catch (error) {
                console.error('Failed to delete organization:', error);
            }
        }
    };

    const handleDeactivate = async (org: OrganizationRead) => {
        if (window.confirm(`Are you sure you want to deactivate "${org.name}"?`)) {
            try {
                await deactivateOrganizationMutation.mutateAsync(org.id);
            } catch (error) {
                console.error('Failed to deactivate organization:', error);
            }
        }
    };

    const handleView = (org: OrganizationRead) => {
        console.log('View organization:', org);
        // TODO: Implement view functionality - open details modal
    };

    if (error) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Failed to load organizations</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="mt-2"
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">Organizations</h3>
                    <Badge variant="secondary">{filteredOrganizations.length}</Badge>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search organizations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-64"
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organization</TableHead>
                            <TableHead>Subdomain</TableHead>
                            <TableHead>Schema</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                                        <p className="text-muted-foreground">Loading organizations...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredOrganizations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <Building2 className="w-8 h-8 text-muted-foreground" />
                                        <p className="text-muted-foreground">
                                            {searchTerm ? 'No organizations found matching your search.' : 'No organizations created yet.'}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrganizations.map((org) => (
                                <TableRow key={org.id}>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{org.name}</div>
                                            <div className="text-sm text-muted-foreground line-clamp-1">
                                                {org.description}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-mono text-sm">{org.subdomain}.yourapp.com</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Database className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-mono text-sm">{org.schema_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {planNames[org.plan_id as keyof typeof planNames] || 'Unknown'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={org.is_active ? 'default' : 'secondary'}>
                                            {org.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleView(org)}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(org)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                {org.is_active && (
                                                    <DropdownMenuItem
                                                        onClick={() => handleDeactivate(org)}
                                                        className="text-orange-600"
                                                    >
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Deactivate
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(org)}
                                                    className="text-destructive"
                                                    disabled={deleteOrganizationMutation.isPending}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    {deleteOrganizationMutation.isPending ? 'Deleting...' : 'Delete'}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default SuperOrgTable;
export type { SuperOrgTableProps };