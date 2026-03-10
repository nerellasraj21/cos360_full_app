import React, { useState, useMemo } from 'react';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import { Edit, Trash2, Plus, Briefcase, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation } from '@/hooks/staff/useStaff';
import { usePermission } from '@/hooks/usePermission';
import type { Designation, DesignationInput } from '@/types/staff/staff';
import { toast } from 'sonner';

interface DesignationsTableProps {
    className?: string;
}

interface DesignationFormData extends DesignationInput {}

export function DesignationsTable({ className }: DesignationsTableProps) {
    const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<Designation | null>(null);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
    const [localSearch, setLocalSearch] = useState('');

    const [formData, setFormData] = useState<DesignationFormData>({
        title: ''
    });
    const [isFormDirty, setIsFormDirty] = useState(false);

    const { data: designationsResponse, isLoading } = useDesignations();

    // Use API data
    const designations: Designation[] = designationsResponse?.items || [];

    // Search filter and sort
    const filteredData = useMemo(() => {
        const q = localSearch.toLowerCase().trim();
        let data = designations;
        if (q) {
            data = data.filter(d => d.title.toLowerCase().includes(q));
        }
        return data;
    }, [designations, localSearch]);

    const sortedData = useMemo(() => {
        if (!sortKey || !sortDir) return filteredData;
        return [...filteredData].sort((a, b) => {
            let aVal: string = '';
            let bVal: string = '';
            if (sortKey === 'title') { aVal = a.title; bVal = b.title; }
            else if (sortKey === 'created') { aVal = a.created_at || ''; bVal = b.created_at || ''; }
            const cmp = aVal.localeCompare(bVal);
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredData, sortKey, sortDir]);

    const handleSort = (key: string) => {
        if (editingDesignation) return;
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
            if (sortDir === 'desc') setSortKey(null);
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ChevronsUpDown className='h-3 w-3 ml-1 inline opacity-50' />;
        if (sortDir === 'asc') return <ChevronUp className='h-3 w-3 ml-1 inline' />;
        return <ChevronDown className='h-3 w-3 ml-1 inline' />;
    };


    const createMutation = useCreateDesignation();
    const updateMutation = useUpdateDesignation();
    const deleteMutation = useDeleteDesignation();

    // Permission checks for UI elements
    const { checkPermission } = usePermission();
    const hasCreatePermission = checkPermission('designations', 'create');
    const hasUpdatePermission = checkPermission('designations', 'update');
    const hasDeletePermission = checkPermission('designations', 'delete');

    const handleCreate = () => {
        setFormData({ title: '' });
        setEditingDesignation(null);
        setIsFormDirty(false);
        setShowCreateDialog(true);
    };

    const handleEdit = (designation: Designation) => {
        setFormData({ title: designation.title });
        setEditingDesignation(designation);
        setIsFormDirty(false);
        setShowCreateDialog(true);
    };

    const handleDelete = (designation: Designation) => {
        setShowDeleteDialog(designation);
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            toast.error('Designation title is required');
            return;
        }

        try {
            if (editingDesignation) {
                await updateMutation.mutateAsync({
                    id: editingDesignation.id,
                    data: formData
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setIsFormDirty(false);
            setShowCreateDialog(false);
            setEditingDesignation(null);
        } catch (error) {
            // Error handling is done in the mutation hooks
        }
    };

    const handleConfirmDelete = async () => {
        if (showDeleteDialog) {
            try {
                await deleteMutation.mutateAsync(showDeleteDialog.id);
                setShowDeleteDialog(null);
            } catch (error) {
                // Error handling is done in the mutation hook
            }
        }
    };

    if (isLoading) {
        return (
            <div className={cn("p-6", className)}>
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading designations...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-end">
                {hasCreatePermission && (
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Designation
                    </Button>
                )}
            </div>

            {/* Designations Table */}
            {/* Filter bar */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filters</span>
                </div>
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input placeholder="Search designations..." value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
            </div>

            {filteredData.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-14">S.No.</th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none"
                                        onClick={() => handleSort('title')}
                                    >
                                        Title<SortIcon col="title" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Staff Count
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none"
                                        onClick={() => handleSort('created')}
                                    >
                                        Created<SortIcon col="created" />
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {sortedData.map((designation, index) => (
                                    <tr key={designation.id} className="hover:bg-accent/50" style={{ height: '48px' }}>
                                        <td className="px-3 align-middle text-xs text-muted-foreground">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-foreground align-middle">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                <span>{designation.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground align-middle">
                                            {designation.staff_count || 0} staff member{designation.staff_count !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground align-middle">
                                            {new Date(designation.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm align-middle">
                                            <TableActionGroup>
                                                {hasUpdatePermission && (
                                                    <EditButton
                                                        onClick={() => handleEdit(designation)}
                                                        title="Edit Designation"
                                                    />
                                                )}
                                                {hasDeletePermission && (
                                                    <DeleteButton
                                                        onClick={() => handleDelete(designation)}
                                                        title="Delete Designation"
                                                    />
                                                )}
                                            </TableActionGroup>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                    <p>No designations found.</p>
                    {hasCreatePermission && (
                        <Button onClick={handleCreate} className="mt-4">
                            Create First Designation
                        </Button>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingDesignation ? 'Edit Designation' : 'Create Designation'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Designation Title *
                            </label>
                            <Input
                                value={formData.title}
                                onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setIsFormDirty(true); }}
                                placeholder="Enter designation title (e.g., Mathematics Teacher)"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Designation</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        Are you sure you want to delete the designation "{showDeleteDialog?.title}"?
                        This action cannot be undone and may affect staff members assigned to this designation.
                    </p>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}