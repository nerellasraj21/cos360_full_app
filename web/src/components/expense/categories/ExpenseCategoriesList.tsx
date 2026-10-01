import React, { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, MoreHorizontal, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/expense';
import type { ExpenseCategoryCreateRequest, ExpenseCategoryUpdateRequest, ExpenseCategoryRead } from '@/types/expense/index';
import { PermissionGuard } from '@/components/PermissionGuard';

interface ExpenseCategoriesListProps {
    onCreateCategory?: () => void;
}

export function ExpenseCategoriesList({ onCreateCategory }: ExpenseCategoriesListProps) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<ExpenseCategoryRead | null>(null);
    const [isCreateFormDirty, setIsCreateFormDirty] = useState(false);
    const [isEditFormDirty, setIsEditFormDirty] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
        return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />;
    };

    const [formData, setFormData] = useState<ExpenseCategoryCreateRequest>({
        name: '',
        description: '',
        is_active: true
    });

    const { data: categories = [], isLoading } = useExpenseCategories();

    const filteredCategories = useMemo(() => {
        let items = categories;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(c =>
                c.name.toLowerCase().includes(q) ||
                (c.description ?? '').toLowerCase().includes(q)
            );
        }
        if (sortKey) {
            items = [...items].sort((a, b) => {
                const aVal = String((a as any)[sortKey] ?? '');
                const bVal = String((b as any)[sortKey] ?? '');
                return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }
        return items;
    }, [categories, searchQuery, sortKey, sortDir]);

    const createMutation = useCreateExpenseCategory();
    const updateMutation = useUpdateExpenseCategory();
    const deleteMutation = useDeleteExpenseCategory();

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            is_active: true
        });
        setSelectedCategory(null);
    };

    const handleCreate = () => {
        resetForm();
        setIsCreateFormDirty(false);
        setSubmitError(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (category: ExpenseCategoryRead) => {
        setFormData({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active
        });
        setSelectedCategory(category);
        setIsEditFormDirty(false);
        setShowEditDialog(true);
    };

    const handleDelete = (category: ExpenseCategoryRead) => {
        setSelectedCategory(category);
        setShowDeleteDialog(true);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            return;
        }

        setSubmitError(null);
        try {
            if (selectedCategory) {
                const updateData: ExpenseCategoryUpdateRequest = {
                    name: formData.name,
                    description: formData.description,
                    is_active: formData.is_active
                };
                await updateMutation.mutateAsync({
                    id: selectedCategory.id,
                    data: updateData
                });
                setIsEditFormDirty(false);
                setShowEditDialog(false);
            } else {
                await createMutation.mutateAsync(formData);
                setIsCreateFormDirty(false);
                setShowCreateDialog(false);
            }
            resetForm();
        } catch (error: any) {
            const msg = error?.response?.data?.detail || error?.message || 'Something went wrong. Please try again.';
            setSubmitError(msg);
        }
    };

    const handleConfirmDelete = async () => {
        if (selectedCategory) {
            try {
                await deleteMutation.mutateAsync(selectedCategory.id);
                setShowDeleteDialog(false);
                setSelectedCategory(null);
            } catch (error) {
                // Error handling is done in the mutation hook
            }
        }
    };

    if (isLoading) {
        return <div className="text-center py-8">Loading categories...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Expense Categories</h2>
                <PermissionGuard
                    resource="expense_categories"
                    action="create"
                    fallback={null}
                >
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Category
                    </Button>
                </PermissionGuard>
            </div>

            <div className="space-y-3">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                        <Filter className="h-3.5 w-3.5" />
                        <span>Filters</span>
                    </div>
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input placeholder="Search by name or description..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
                    </div>
                </div>
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">S.No.</TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>Name <SortIcon col="name" /></TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('is_active')}>Status <SortIcon col="is_active" /></TableHead>
                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('created_at')}>Created <SortIcon col="created_at" /></TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCategories.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No categories match your search' : 'No expense categories'}</TableCell></TableRow>
                            ) : filteredCategories.map((category, index) => (
                                <TableRow key={category.id} style={{ height: '48px' }}>
                                    <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                                    <TableCell className="font-medium">
                                        {category.name}
                                    </TableCell>
                                    <TableCell>
                                        {category.description || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={category.is_active} />
                                    </TableCell>
                                    <TableCell>
                                        {new Date(category.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <PermissionGuard
                                                    resource="expense_categories"
                                                    action="update"
                                                    fallback={null}
                                                >
                                                    <DropdownMenuItem onClick={() => handleEdit(category)}>
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                </PermissionGuard>
                                                <PermissionGuard
                                                    resource="expense_categories"
                                                    action="delete"
                                                    fallback={null}
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(category)}
                                                        className="text-red-600"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </PermissionGuard>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                guardDirty={isCreateFormDirty}
                onDirtyDiscard={() => setIsCreateFormDirty(false)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Expense Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4" onChange={() => setIsCreateFormDirty(true)}>
                        <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Category name"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Category description"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => {
                                    setFormData({ ...formData, is_active: checked });
                                    setIsCreateFormDirty(true);
                                }}
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>

                    {submitError && (
                        <p className="text-sm text-red-500 -mt-2">{submitError}</p>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || !formData.name.trim()}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog
                open={showEditDialog}
                onOpenChange={setShowEditDialog}
                guardDirty={isEditFormDirty}
                onDirtyDiscard={() => setIsEditFormDirty(false)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Expense Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4" onChange={() => setIsEditFormDirty(true)}>
                        <div>
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Category name"
                            />
                        </div>

                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Category description"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => {
                                    setFormData({ ...formData, is_active: checked });
                                    setIsEditFormDirty(true);
                                }}
                            />
                            <Label htmlFor="edit-is_active">Active</Label>
                        </div>
                    </div>

                    {submitError && (
                        <p className="text-sm text-red-500 -mt-2">{submitError}</p>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmit}
                            disabled={updateMutation.isPending || !formData.name.trim()}
                        >
                            {updateMutation.isPending ? 'Updating...' : 'Update'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Expense Category</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        Are you sure you want to delete the category "{selectedCategory?.name}"?
                        This action cannot be undone.
                    </p>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
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
