import React, { useState } from 'react';
import { Edit2, Trash2, Plus, Users, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useParents, useCreateParent, useUpdateParent, useDeleteParent } from '@/hooks/masters/useParents';
import type { Parent, ParentInput } from '@/types/masters/parent';
import { toast } from 'sonner';

interface ParentsTableProps {
    className?: string;
}

interface ParentFormData extends ParentInput {}

export function ParentsTable({ className }: ParentsTableProps) {
    const [editingParent, setEditingParent] = useState<Parent | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<Parent | null>(null);
    const [formData, setFormData] = useState<ParentFormData>({
        name: '',
        email: '',
        phone: '',
        occupation: '',
        aadhar_number: '',
        gender: undefined,
        relation_to_student: 'Father',
        user_id: ''
    });

    const { data: parentsResponse, isLoading } = useParents();

    // Use API data
    const parents: Parent[] = parentsResponse?.items || [];

    const createMutation = useCreateParent();
    const updateMutation = useUpdateParent();
    const deleteMutation = useDeleteParent();

    const handleCreate = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            occupation: '',
            aadhar_number: '',
            gender: undefined,
            relation_to_student: 'Father',
            user_id: ''
        });
        setEditingParent(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (parent: Parent) => {
        setFormData({
            name: parent.name,
            email: parent.email || '',
            phone: parent.phone || '',
            occupation: parent.occupation || '',
            aadhar_number: parent.aadhar_number || '',
            gender: parent.gender as 'Male' | 'Female' | 'Other' | undefined,
            relation_to_student: parent.relation_to_student,
            user_id: parent.user_id
        });
        setEditingParent(parent);
        setShowCreateDialog(true);
    };

    const handleDelete = (parent: Parent) => {
        setShowDeleteDialog(parent);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('Parent name is required');
            return;
        }

        if (!formData.user_id.trim()) {
            toast.error('User ID is required');
            return;
        }

        try {
            if (editingParent) {
                await updateMutation.mutateAsync({
                    id: editingParent.id,
                    data: formData
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setShowCreateDialog(false);
            setEditingParent(null);
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

    const getRelationBadgeVariant = (relation: string) => {
        switch (relation) {
            case 'Father':
                return 'default';
            case 'Mother':
                return 'secondary';
            case 'Guardian':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    if (isLoading) {
        return (
            <div className={cn("p-6", className)}>
                <div className="text-center text-muted-foreground">Loading parents...</div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Parent Profiles</h2>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Parent
                </Button>
            </div>

            {/* Parents Table */}
            {parents.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Relationship
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Occupation
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Students
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {parents.map((parent) => (
                                    <tr key={parent.id} className="hover:bg-accent/50">
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">
                                            <div>
                                                <div className="font-medium">{parent.name}</div>
                                                {parent.gender && (
                                                    <div className="text-xs text-muted-foreground">{parent.gender}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            <div className="space-y-1">
                                                {parent.email && (
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        <span className="text-xs">{parent.email}</span>
                                                    </div>
                                                )}
                                                {parent.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        <span className="text-xs">{parent.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <Badge variant={getRelationBadgeVariant(parent.relation_to_student)}>
                                                {parent.relation_to_student}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {parent.occupation || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                <span>{parent.students?.length || 0} student{parent.students?.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(parent)}
                                                    className="h-8 w-8 p-0"
                                                    title="Edit Parent"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(parent)}
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                                                    title="Delete Parent"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                    <p>No parent profiles found.</p>
                    <Button onClick={handleCreate} className="mt-4">
                        Create First Parent Profile
                    </Button>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingParent ? 'Edit Parent Profile' : 'Create Parent Profile'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Full Name *
                            </label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Enter parent's full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Email
                            </label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="Enter email address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Phone
                            </label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Occupation
                            </label>
                            <Input
                                value={formData.occupation}
                                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                placeholder="Enter occupation/profession"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Aadhar Number
                            </label>
                            <Input
                                value={formData.aadhar_number}
                                onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                                placeholder="Enter 12-digit Aadhar number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Gender
                            </label>
                            <Select
                                value={formData.gender || ''}
                                onValueChange={(value) => setFormData({ ...formData, gender: value as 'Male' | 'Female' | 'Other' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Relationship to Student *
                            </label>
                            <Select
                                value={formData.relation_to_student}
                                onValueChange={(value) => setFormData({ ...formData, relation_to_student: value as 'Father' | 'Mother' | 'Guardian' })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select relationship" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Father">Father</SelectItem>
                                    <SelectItem value="Mother">Mother</SelectItem>
                                    <SelectItem value="Guardian">Guardian</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                User ID *
                            </label>
                            <Input
                                value={formData.user_id}
                                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                placeholder="Enter associated user ID"
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
                        <DialogTitle>Delete Parent Profile</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        Are you sure you want to delete the profile for "{showDeleteDialog?.name}"?
                        This action cannot be undone and will remove all student associations.
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