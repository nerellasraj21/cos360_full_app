import React, { useState, useMemo } from 'react';
import { Edit, Trash2, Plus, Users, Mail, Phone, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<Parent | null>(null);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
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

    const filteredParents = useMemo(() => {
        if (!searchQuery.trim()) return parents;
        const q = searchQuery.toLowerCase();
        return parents.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.email || '').toLowerCase().includes(q) ||
            (p.phone || '').toLowerCase().includes(q) ||
            (p.occupation || '').toLowerCase().includes(q) ||
            p.relation_to_student.toLowerCase().includes(q)
        );
    }, [parents, searchQuery]);

    const sortedParents = useMemo(() => {
        if (!sortKey || !sortDir) return filteredParents;
        return [...filteredParents].sort((a, b) => {
            const aVal = (a as any)[sortKey] ?? '';
            const bVal = (b as any)[sortKey] ?? '';
            const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredParents, sortKey, sortDir]);

    const SortIcon = ({ colKey }: { colKey: string }) => {
        if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-40 shrink-0" />;
        if (sortDir === 'asc') return <ChevronUp className="h-3 w-3 ml-1 shrink-0" />;
        return <ChevronDown className="h-3 w-3 ml-1 shrink-0" />;
    };

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
        setIsFormDirty(false);
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
        setIsFormDirty(false);
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
            setIsFormDirty(false);
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
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading parents...</span>
                </div>
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

            {/* Filter bar */}
            <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filters</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search parents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-sm"
                        />
                    </div>
                    {searchQuery && (
                        <span className="text-xs text-muted-foreground">
                            {sortedParents.length} of {parents.length} results
                        </span>
                    )}
                </div>
            </div>

            {/* Parents Table */}
            {parents.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground w-14">
                                        S.No.
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/80"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center">Name <SortIcon colKey="name" /></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Contact
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/80"
                                        onClick={() => handleSort('relation_to_student')}
                                    >
                                        <div className="flex items-center">Relationship <SortIcon colKey="relation_to_student" /></div>
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:bg-muted/80"
                                        onClick={() => handleSort('occupation')}
                                    >
                                        <div className="flex items-center">Occupation <SortIcon colKey="occupation" /></div>
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
                                {sortedParents.map((parent, idx) => (
                                    <tr key={parent.id} className="hover:bg-accent/50" style={{ height: '48px' }}>
                                        <td className="px-3 align-middle text-xs text-muted-foreground">{idx + 1}</td>
                                        <td className="px-4 align-middle text-sm font-medium text-foreground">
                                            <div>
                                                <div className="font-medium">{parent.name}</div>
                                                {parent.gender && (
                                                    <div className="text-xs text-muted-foreground">{parent.gender}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 align-middle text-sm text-foreground">
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
                                        <td className="px-4 align-middle text-sm">
                                            <Badge variant={getRelationBadgeVariant(parent.relation_to_student)}>
                                                {parent.relation_to_student}
                                            </Badge>
                                        </td>
                                        <td className="px-4 align-middle text-sm text-foreground">
                                            {parent.occupation || '-'}
                                        </td>
                                        <td className="px-4 align-middle text-sm text-foreground">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                <span>{parent.students?.length || 0} student{parent.students?.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 align-middle text-sm">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(parent)}
                                                    className="h-8 w-8 p-0"
                                                    title="Edit Parent"
                                                >
                                                    <Edit className="h-4 w-4" />
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
                                {sortedParents.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {searchQuery ? 'No results found' : 'No parent profiles found'}
                                        </td>
                                    </tr>
                                )}
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
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingParent ? 'Edit Parent Profile' : 'Create Parent Profile'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4" onChange={() => setIsFormDirty(true)}>
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