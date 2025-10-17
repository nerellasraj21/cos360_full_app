import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useFeeCategories, useCreateFeeCategory, useUpdateFeeCategory, useDeleteFeeCategory } from '@/hooks/fee/useFeeCategories';
import { useFeeCategoryTypes } from '@/hooks/fee/useFeeCategories';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { usePermission } from '@/hooks/usePermission';
import { CategoryTypeManager } from './CategoryTypeManager';
import type { FeeCategory, FeeCategoryInput } from '@/types/fee/category';
import type { FeeType } from '@/types/fee/type';
import { toast } from 'sonner';

interface FeeCategoryTreeProps {
    className?: string;
}

interface CategoryNodeProps {
    category: FeeCategory;
    onEdit: (category: FeeCategory) => void;
    onDelete: (category: FeeCategory) => void;
    onManageTypes: (category: FeeCategory) => void;
    canUpdate: boolean;
    canDelete: boolean;
    canViewTypes: boolean;
}

function CategoryNode({ category, onEdit, onDelete, onManageTypes, canUpdate, canDelete, canViewTypes }: CategoryNodeProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const { data: feeTypes = [], isLoading: typesLoading } = useFeeCategoryTypes(category.id,canViewTypes);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="border border-gray-200 rounded-lg mb-2">
            {/* Category Header */}
            <div
                className={cn(
                    "flex items-center justify-between p-3 hover:bg-gray-50",
                    canViewTypes ? "cursor-pointer" : "cursor-default"
                )}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
            >
                <div className="flex items-center flex-1" onClick={canViewTypes ? toggleExpanded : undefined}>
                    <button className="mr-2 p-1 hover:bg-gray-200 rounded">
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </button>
                    <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{category.category_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                                "px-2 py-1 text-xs rounded-full",
                                category.category_status === 'active'
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                            )}>
                                {category.category_status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                            {canViewTypes && (
                                <span className="text-xs text-gray-500">
                                    {feeTypes.length} fee type{feeTypes.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={cn(
                    "flex items-center gap-1 transition-opacity",
                    showActions ? "opacity-100" : "opacity-0"
                )}>
                    {canViewTypes && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onManageTypes(category);
                            }}
                            className="h-8 w-8 p-0"
                            title="Manage Fee Types"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    )}
                    {canUpdate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(category);
                            }}
                            className="h-8 w-8 p-0"
                            title="Edit Category"
                        >
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(category);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Delete Category"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Fee Types List */}
            {isExpanded && canViewTypes && (
                <div className="border-t border-gray-200 bg-gray-50">
                    {typesLoading ? (
                        <div className="p-4 text-center text-gray-500">Loading fee types...</div>
                    ) : feeTypes.length > 0 ? (
                        <div className="p-3 space-y-2">
                            {feeTypes.map((feeType: FeeType) => (
                                <div key={feeType.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <div>
                                        <span className="font-medium text-sm">{feeType.type_name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "px-2 py-1 text-xs rounded-full",
                                                feeType.fee_status === 'active'
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                            )}>
                                                {feeType.fee_status === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Term: {(() => {
                                                    if (!feeType.fee_term_name) return 'Unknown';
                                                    if (feeType.fee_term_name === feeType.fee_term_id) {
                                                        return `Installment ${feeType.fee_term_name ? 1 : 'N/A'}`;
                                                    }
                                                    return feeType.fee_term_name;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            No fee types found. Click the + button to add fee types.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function FeeCategoryTree({ className }: FeeCategoryTreeProps) {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const { checkPermission } = usePermission();
    const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<FeeCategory | null>(null);
    const [showTypeManager, setShowTypeManager] = useState<FeeCategory | null>(null);
    const [formData, setFormData] = useState<FeeCategoryInput>({
        category_name: '',
        category_status: 'active',
        academic_year_id: selectedAcademicYearId || ''
    });

    // Check permissions
    const canCreate = checkPermission('fee_categories', 'create');
    const canUpdate = checkPermission('fee_categories', 'update');
    const canDelete = checkPermission('fee_categories', 'delete');
    const canViewTypes = checkPermission('fee_types', 'list');


    const { data: categories = [], isLoading } = useFeeCategories({
        academic_year_id: selectedAcademicYearId,
    });

    const createMutation = useCreateFeeCategory();
    const updateMutation = useUpdateFeeCategory();
    const deleteMutation = useDeleteFeeCategory();

    const handleCreate = () => {
        setFormData({
            category_name: '',
            category_status: 'active',
            academic_year_id: selectedAcademicYearId || ''
        });
        setEditingCategory(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (category: FeeCategory) => {
        setFormData({
            category_name: category.category_name,
            category_status: category.category_status,
            academic_year_id: category.academic_year_id
        });
        setEditingCategory(category);
        setShowCreateDialog(true);
    };

    const handleDelete = (category: FeeCategory) => {
        setShowDeleteDialog(category);
    };

    const handleManageTypes = (category: FeeCategory) => {
        setShowTypeManager(category);
    };

    const handleSubmit = async () => {
        try {
            if (editingCategory) {
                await updateMutation.mutateAsync({
                    id: editingCategory.id,
                    data: formData
                });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setShowCreateDialog(false);
            setEditingCategory(null);
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
                <div className="text-center text-gray-500">Loading fee categories...</div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Fee Categories</h2>
                {canCreate && (
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Category
                    </Button>
                )}
            </div>

            {/* Categories List */}
            {categories.length > 0 ? (
                <div className="space-y-2">
                    {categories.map((category) => (
                        <CategoryNode
                            key={category.id}
                            category={category}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onManageTypes={handleManageTypes}
                            canUpdate={canUpdate}
                            canDelete={canDelete}
                            canViewTypes={canViewTypes}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>No fee categories found for the selected academic year.</p>
                    {canCreate && (
                        <Button onClick={handleCreate} className="mt-4">
                            Create First Category
                        </Button>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingCategory ? 'Edit Fee Category' : 'Create Fee Category'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category Name *
                            </label>
                            <Input
                                value={formData.category_name}
                                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                                placeholder="Enter category name"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="category_status"
                                checked={formData.category_status === 'active'}
                                onChange={(e) => setFormData({ ...formData, category_status: e.target.checked ? 'active' : 'inactive' })}
                                className="rounded border-gray-300"
                            />
                            <label htmlFor="category_status" className="text-sm font-medium text-gray-700">
                                Active
                            </label>
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
                            disabled={!formData.category_name.trim() || createMutation.isPending || updateMutation.isPending}
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
                        <DialogTitle>Delete Fee Category</DialogTitle>
                    </DialogHeader>

                    <p className="text-gray-600">
                        Are you sure you want to delete the category "{showDeleteDialog?.category_name}"?
                        This action cannot be undone.
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

            {/* Category Type Manager Modal */}
            {showTypeManager && (
                <CategoryTypeManager
                    category={showTypeManager}
                    open={!!showTypeManager}
                    onOpenChange={() => setShowTypeManager(null)}
                />
            )}
        </div>
    );
}