import React, { useState } from 'react';
import { Edit, Trash2, Plus, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
    const [formData, setFormData] = useState<DesignationFormData>({
        title: ''
    });

    const { data: designationsResponse, isLoading } = useDesignations();

    // Use API data
    const designations: Designation[] = designationsResponse?.items || [];

    const createMutation = useCreateDesignation();
    const updateMutation = useUpdateDesignation();
    const deleteMutation = useDeleteDesignation();

    // Permission checks for UI elements
    const { checkPermission } = usePermission();
    const hasCreatePermission = checkPermission('designations', 'create');
    const hasUpdatePermission = checkPermission('designations', 'update');
    const hasDeletePermission = checkPermission('designations', 'delete');

    const handleCreate = () => {
        setFormData({
            title: ''
        });
        setEditingDesignation(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (designation: Designation) => {
        setFormData({
            title: designation.title
        });
        setEditingDesignation(designation);
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
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Staff Designations</h2>
                {hasCreatePermission && (
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Designation
                    </Button>
                )}
            </div>

            {/* Designations Table */}
            {designations.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Title
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Staff Count
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {designations.map((designation) => (
                                    <tr key={designation.id} className="hover:bg-accent/50">
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                <span>{designation.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {designation.staff_members?.length || 0} staff member{designation.staff_members?.length !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {new Date(designation.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1">
                                                {hasUpdatePermission && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(designation)}
                                                        className="h-8 w-8 p-0"
                                                        title="Edit Designation"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {hasDeletePermission && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(designation)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                                                        title="Delete Designation"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Enter designation title (e.g., Mathematics Teacher)"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateDialog(false)}
                        >
                            Cancel
                        </Button>
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