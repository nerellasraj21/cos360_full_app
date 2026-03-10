import React, { useState, useEffect, useMemo } from 'react';
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
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { ViewButton, EditButton, DeleteButton, DeactivateButton, TableActionGroup } from '@/components/common/TableActions';
import {
    Search,
    Filter,
    Globe,
    Database,
    Building2,
    Loader2,
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
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
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

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

    const handleSort = (key: string) => {
        if (sortKey === key) {
            if (sortDir === 'asc') setSortDir('desc');
            else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
            else setSortDir('asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />;
        if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0" />;
        return <ChevronDown className="h-3 w-3 ml-1 shrink-0" />;
    };

    const filteredOrganizations = useMemo(() => {
        const base = organizations.filter(org =>
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.subdomain.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (!sortKey || !sortDir) return base;
        return [...base].sort((a, b) => {
            const aVal = (a as any)[sortKey] ?? '';
            const bVal = (b as any)[sortKey] ?? '';
            const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [organizations, searchTerm, sortKey, sortDir]);

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

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <Filter className="h-3.5 w-3.5" />
                        <span>Filters</span>
                    </div>
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
                            <TableHead className="w-14 text-xs text-muted-foreground">S.No.</TableHead>
                            <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('name')}>
                                <div className="flex items-center">Organization <SortIcon colKey="name" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('subdomain')}>
                                <div className="flex items-center">Subdomain <SortIcon colKey="subdomain" /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('schema_name')}>
                                <div className="flex items-center">Schema <SortIcon colKey="schema_name" /></div>
                            </TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead className="cursor-pointer select-none hover:bg-muted/80" onClick={() => handleSort('is_active')}>
                                <div className="flex items-center">Status <SortIcon colKey="is_active" /></div>
                            </TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                                        <p className="text-muted-foreground">Loading organizations...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredOrganizations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <div className="flex flex-col items-center gap-2">
                                        <Building2 className="w-8 h-8 text-muted-foreground" />
                                        <p className="text-muted-foreground">
                                            {searchTerm ? 'No organizations found matching your search.' : 'No organizations created yet.'}
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredOrganizations.map((org, idx) => (
                                <TableRow key={org.id} style={{ height: '48px' }}>
                                    <TableCell className="align-middle text-xs text-muted-foreground">{idx + 1}</TableCell>
                                    <TableCell className="align-middle">
                                        <div className="space-y-1">
                                            <div className="font-medium">{org.name}</div>
                                            <div className="text-sm text-muted-foreground line-clamp-1">
                                                {org.description}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <div className="flex items-center gap-1">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-mono text-sm">{org.subdomain}.yourapp.com</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <div className="flex items-center gap-1">
                                            <Database className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-mono text-sm">{org.schema_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <Badge variant="outline">
                                            {planNames[org.plan_id as keyof typeof planNames] || 'Unknown'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <StatusBadge status={org.is_active} />
                                    </TableCell>
                                    <TableCell className="text-right align-middle">
                                        <TableActionGroup>
                                            <ViewButton onClick={() => handleView(org)} title="View Details" />
                                            <EditButton onClick={() => handleEdit(org)} title="Edit Organization" />
                                            {org.is_active && (
                                                <DeactivateButton
                                                    onClick={() => handleDeactivate(org)}
                                                    title="Deactivate Organization"
                                                />
                                            )}
                                            <DeleteButton
                                                onClick={() => handleDelete(org)}
                                                disabled={deleteOrganizationMutation.isPending}
                                                title="Delete Organization"
                                            />
                                        </TableActionGroup>
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