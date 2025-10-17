import React, { useState } from 'react';
import { Plus, Edit2, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
    const [formData, setFormData] = useState<ExpenseCategoryCreateRequest>({
        name: '',
        description: '',
        is_active: true
    });

    const { data: categories = [], isLoading } = useExpenseCategories();
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
        setShowCreateDialog(true);
    };

    const handleEdit = (category: ExpenseCategoryRead) => {
        setFormData({
            name: category.name,
            description: category.description || '',
            is_active: category.is_active
        });
        setSelectedCategory(category);
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
                setShowEditDialog(false);
            } else {
                await createMutation.mutateAsync(formData);
                setShowCreateDialog(false);
            }
            resetForm();
        } catch (error) {
            // Error handling is done in the mutation hooks
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

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium">
                                    {category.name}
                                </TableCell>
                                <TableCell>
                                    {category.description || '-'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={category.is_active ? "default" : "secondary"}>
                                        {category.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
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
                                                    <Edit2 className="mr-2 h-4 w-4" />
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

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Expense Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
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
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label htmlFor="is_active">Active</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
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
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Expense Category</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
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
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <Label htmlFor="edit-is_active">Active</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
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

                    <p className="text-gray-600">
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