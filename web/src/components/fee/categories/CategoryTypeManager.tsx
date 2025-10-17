import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useFeeCategoryTypes } from '@/hooks/fee/useFeeCategories';
import { useFeeTerms } from '@/hooks/fee/useFeeTerms';
import { useCreateFeeType, useUpdateFeeType, useDeleteFeeType } from '@/hooks/fee/useFeeTypes';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type { FeeCategory } from '@/types/fee/category';
import type { FeeType, FeeTypeCreateRequest, FeeTypeUpdateRequest } from '@/types/fee/type';
import { toast } from 'sonner';

interface CategoryTypeManagerProps {
    category: FeeCategory;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface FeeTypeFormData {
    type_name: string;
    fee_term_id: string;
    fee_status: string;
}

export function CategoryTypeManager({ category, open, onOpenChange }: CategoryTypeManagerProps) {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const [editingType, setEditingType] = useState<FeeType | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<FeeType | null>(null);
    const [formData, setFormData] = useState<FeeTypeFormData>({
        type_name: '',
        fee_term_id: '',
        fee_status: 'active'
    });

    const { data: feeTypes = [], isLoading: typesLoading, refetch: refetchTypes } = useFeeCategoryTypes(category.id);
    const { data: feeTerms = [], isLoading: termsLoading } = useFeeTerms({
        academic_year_id: selectedAcademicYearId,
        is_active: true
    });

    // Debug logging
    console.log('CategoryTypeManager - Terms data:', feeTerms);
    console.log('CategoryTypeManager - Terms loading:', termsLoading);

    const createMutation = useCreateFeeType();
    const updateMutation = useUpdateFeeType();
    const deleteMutation = useDeleteFeeType();

    const resetForm = () => {
        setFormData({
            type_name: '',
            fee_term_id: '',
            fee_status: 'active'
        });
        setEditingType(null);
        setShowCreateForm(false);
    };

    const handleCreate = () => {
        resetForm();
        setShowCreateForm(true);
    };

    const handleEdit = (feeType: FeeType) => {
        setFormData({
            type_name: feeType.type_name,
            fee_term_id: feeType.fee_term_id,
            fee_status: feeType.fee_status
        });
        setEditingType(feeType);
        setShowCreateForm(true);
    };

    const handleDelete = (feeType: FeeType) => {
        setShowDeleteDialog(feeType);
    };

    const handleSubmit = async () => {
        if (!formData.type_name.trim()) {
            toast.error('Fee type name is required');
            return;
        }

        if (!formData.fee_term_id) {
            toast.error('Please select a fee term');
            return;
        }

        try {
            if (editingType) {
                const updateData: FeeTypeUpdateRequest = {
                    type_name: formData.type_name,
                    fee_category_id: category.id,
                    fee_term_id: formData.fee_term_id,
                    fee_status: formData.fee_status
                };
                await updateMutation.mutateAsync({
                    id: editingType.id,
                    data: updateData
                });
            } else {
                const createData: FeeTypeCreateRequest = {
                    type_name: formData.type_name,
                    fee_category_id: category.id,
                    fee_term_id: formData.fee_term_id,
                    fee_status: formData.fee_status,
                    academic_year_id: selectedAcademicYearId || ''
                };
                await createMutation.mutateAsync(createData);
            }
            resetForm();
            // Invalidate fee types queries since we're now using the main endpoint
            // The refetchTypes is not needed as the main query will be invalidated
        } catch (error) {
            // Error handling is done in the mutation hooks
        }
    };

    const handleConfirmDelete = async () => {
        if (showDeleteDialog) {
            try {
                await deleteMutation.mutateAsync({
                    id: showDeleteDialog.id,
                    categoryId: category.id
                });
                setShowDeleteDialog(null);
                // No need to refetch as the main query will be invalidated by the mutation
            } catch (error) {
                // Error handling is done in the mutation hook
            }
        }
    };

    const handleTermChange = (value: string) => {
        setFormData({ ...formData, fee_term_id: value });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Manage Fee Types - {category.category_name}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* Add New Fee Type Button */}
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">Fee Types</h3>
                            <Button onClick={handleCreate} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Fee Type
                            </Button>
                        </div>

                        {/* Create/Edit Form */}
                        {showCreateForm && (
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <h4 className="font-medium mb-4">
                                    {editingType ? 'Edit Fee Type' : 'Create New Fee Type'}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fee Type Name *
                                        </label>
                                        <Input
                                            value={formData.type_name}
                                            onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                                            placeholder="Enter fee type name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Fee Term *
                                        </label>
                                        <Select
                                            value={formData.fee_term_id}
                                            onValueChange={handleTermChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select fee term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {feeTerms.length === 0 ? (
                                                    <SelectItem value="">
                                                        No fee terms available
                                                    </SelectItem>
                                                ) : (
                                                    feeTerms.map((term) => {
                                                        const displayName = (() => {
                                                            if (!term.term_name || term.term_name === term.id) {
                                                                // If term_name is empty or same as ID, create a readable name
                                                                return `Installment ${term.number_of_terms || 1}`;
                                                            }
                                                            return term.term_name;
                                                        })();
                                                        console.log('CategoryTypeManager - Rendering term:', term.id, 'displayName:', displayName, 'term_name:', term.term_name);
                                                        return (
                                                            <SelectItem key={term.id} value={term.id}  >
                                                                {displayName} 
                                                            </SelectItem>
                                                        );
                                                    })
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                </div>

                                <div className="flex items-center gap-6 mt-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="fee_status_form"
                                            checked={formData.fee_status === 'active'}
                                            onChange={(e) => setFormData({ ...formData, fee_status: e.target.checked ? 'active' : 'inactive' })}
                                            className="rounded border-gray-300"
                                        />
                                        <label htmlFor="fee_status_form" className="text-sm font-medium text-gray-700">
                                            Active
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" onClick={resetForm}>
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={!formData.type_name.trim() || !formData.fee_term_id || createMutation.isPending || updateMutation.isPending}
                                    >
                                        {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Fee Types List */}
                        <div className="space-y-2">
                            {typesLoading ? (
                                <div className="text-center py-4 text-gray-500">Loading fee types...</div>
                            ) : feeTypes.length > 0 ? (
                                feeTypes.map((feeType: FeeType) => (
                                    <div key={feeType.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{feeType.type_name}</h4>
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
                                                        const term = feeTerms.find(term => term.id === feeType.fee_term_id);
                                                        if (term) {
                                                            if (!term.term_name || term.term_name === term.id) {
                                                                return `Installment ${term.number_of_terms || 1}`;
                                                            }
                                                            return term.term_name;
                                                        }
                                                        return 'Unknown';
                                                    })()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(feeType)}
                                                className="h-8 w-8 p-0"
                                                title="Edit Fee Type"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(feeType)}
                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                title="Delete Fee Type"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No fee types found for this category.</p>
                                    <Button onClick={handleCreate} className="mt-2">
                                        Add First Fee Type
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Fee Type</DialogTitle>
                    </DialogHeader>

                    <p className="text-gray-600">
                        Are you sure you want to delete the fee type "{showDeleteDialog?.type_name}"?
                        This action cannot be undone and may affect existing fee mappings.
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
        </>
    );
}