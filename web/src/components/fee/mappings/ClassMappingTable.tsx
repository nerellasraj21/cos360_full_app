import React, { useState } from 'react';
import { Edit, Trash2, Plus, Calculator, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFeeClassMappings, useCreateFeeClassMapping, useUpdateFeeClassMapping, useDeleteFeeClassMapping } from '@/hooks/fee/useFeeMappings';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import { useFeeCategories } from '@/hooks/fee/useFeeCategories';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { TermAmountModal } from './TermAmountModal';
import type { FeeClassMapping, FeeType } from '@/types/fee';
import { toast } from 'sonner';

interface ClassMappingTableProps {
    className?: string;
}

interface MappingFormData {
    class_id: string;
    fee_type_id: string;
    total_fee: number;
    all_by_default: boolean;
}

export function ClassMappingTable({ className }: ClassMappingTableProps) {
    const { selectedAcademicYearId } = useAcademicYearStore();

    // Component logic
    const [editingMapping, setEditingMapping] = useState<FeeClassMapping | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState<FeeClassMapping | null>(null);
    const [showTermAmountModal, setShowTermAmountModal] = useState<FeeClassMapping | null>(null);
    const [formData, setFormData] = useState<MappingFormData>({
        class_id: '',
        fee_type_id: '',
        total_fee: 0,
        all_by_default: false
    });

    const { data: mappingsResponse, isLoading, error } = useFeeClassMappings({
        academic_year_id: selectedAcademicYearId || undefined,
    });

    // Data handling

    // Use API data - handle both direct array and paginated response
    const mappings: FeeClassMapping[] = Array.isArray(mappingsResponse)
        ? mappingsResponse
        : (mappingsResponse?.items || []);

    const { data: feeTypes = [] } = useFeeTypes();

    const { data: classesData } = useClassSectionsDropdown();
    const classes = classesData || [];

    const createMutation = useCreateFeeClassMapping();
    const updateMutation = useUpdateFeeClassMapping();
    const deleteMutation = useDeleteFeeClassMapping();

    const handleCreate = () => {
        setFormData({
            class_id: '',
            fee_type_id: '',
            total_fee: 0,
            all_by_default: false
        });
        setEditingMapping(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (mapping: FeeClassMapping) => {
        setFormData({
            class_id: mapping.class_id,
            fee_type_id: mapping.fee_type_id,
            total_fee: mapping.total_fee,
            all_by_default: mapping.all_by_default
        });
        setEditingMapping(mapping);
        setShowCreateDialog(true);
    };

    const handleDelete = (mapping: FeeClassMapping) => {
        setShowDeleteDialog(mapping);
    };

    const handleManageTermAmounts = (mapping: FeeClassMapping) => {
        setShowTermAmountModal(mapping);
    };

    const handleSubmit = async () => {
        if (!formData.fee_type_id || !formData.class_id) {
            toast.error('Please select both fee type and class');
            return;
        }

        if (formData.total_fee <= 0) {
            toast.error('Total fee must be greater than 0');
            return;
        }

        // Validate academic year for new mappings
        if (!editingMapping && !selectedAcademicYearId) {
            toast.error('Please select an academic year');
            return;
        }

        try {
            if (editingMapping) {
                // UPDATE: Only send updatable fields (total_fee, all_by_default)
                // Backend typically doesn't allow changing relationship fields (class_id, fee_type_id, academic_year_id)
                const updateData = {
                    total_fee: formData.total_fee,
                    all_by_default: formData.all_by_default
                };

                await updateMutation.mutateAsync({
                    id: editingMapping.id,
                    data: updateData
                });
            } else {
                // CREATE: Send all required fields
                const createData = {
                    class_id: formData.class_id,
                    fee_type_id: formData.fee_type_id,
                    total_fee: formData.total_fee,
                    academic_year_id: selectedAcademicYearId!,
                    all_by_default: formData.all_by_default
                };

                await createMutation.mutateAsync(createData);
            }

            setShowCreateDialog(false);
            setEditingMapping(null);
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

    const getClassName = (classId: string) => {
        const classItem = classes.find(c => c.id === classId);
        return classItem ? `${classItem.name} (${classItem.sections.map(s => s.name).join(', ')})` : `Class ${classId}`;
    };

    const getFeeTypeName = (feeTypeId: string) => {
        const feeType = feeTypes.find(ft => ft.id === feeTypeId);
        return feeType ? feeType.type_name : `Fee Type ${feeTypeId}`;
    };

    const getFeeType = (feeTypeId: string) => {
        return feeTypes.find(ft => ft.id === feeTypeId);
    };

    const getTermAmountStatus = (mapping: FeeClassMapping) => {
        if (!mapping.class_fee_mapping_terms || mapping.class_fee_mapping_terms.length === 0) {
            return { status: 'not-set', message: 'Not Set' };
        }

        const totalTermAmount = mapping.class_fee_mapping_terms.reduce((sum, ta) => sum + (Number(ta.term_amount) || 0), 0);
        const difference = Math.abs(totalTermAmount - mapping.total_fee);

        const termCount = mapping.class_fee_mapping_terms.length;
        const termLabel = termCount === 1 ? '1 term' : `${termCount} terms`;

        if (difference < 0.01) { // Allow for small floating point differences
            return { status: 'complete', message: `Complete (${termLabel})` };
        } else {
            return { status: 'incomplete', message: `Mismatch: ₹${difference.toFixed(2)}` };
        }
    };

    // Helper to get term display text (supports both old term_id and new term_date_id)
    const getTermDisplayText = (term: any) => {
        // Prefer new format with term_name and term_date
        if (term.term_name) {
            if (term.term_date) {
                return `${term.term_name} (Due: ${new Date(term.term_date).toLocaleDateString()})`;
            }
            return term.term_name;
        }
        // Fallback to term_id or term_date_id
        return term.term_date_id || term.term_id || 'Unknown Term';
    };

    if (!selectedAcademicYearId) {
        return (
            <div className={cn("p-6", className)}>
                <div className="text-center text-muted-foreground">
                    <p>Please select an academic year to view fee mappings.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={cn("p-6", className)}>
                <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading fee mappings...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("p-6", className)}>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-destructive mb-2">Failed to Load Fee Class Mappings</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                The backend encountered an error while retrieving fee class mappings.
                            </p>
                            <div className="bg-background/50 rounded p-3 mb-4">
                                <p className="text-xs font-mono text-foreground">
                                    Error: {error.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Endpoint: GET /api/v1/fee/class-mappings/
                                </p>
                                {selectedAcademicYearId && (
                                    <p className="text-xs text-muted-foreground">
                                        Academic Year ID: {selectedAcademicYearId}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium">Backend team should check:</p>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                                    <li>Database table 'fee_class_mappings' exists and is accessible</li>
                                    <li>Foreign key relationships are properly configured</li>
                                    <li>Backend server logs for detailed stack trace</li>
                                    <li>SQL query syntax and data integrity</li>
                                </ul>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => window.location.reload()}
                            >
                                Retry
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Fee Class Mappings</h2>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Mapping
                </Button>
            </div>

            {/* Mappings Table */}
            {mappings.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Class
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Fee Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Total Fee
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Term Distribution
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Assignment Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {mappings.map((mapping) => {
                                    const termStatus = getTermAmountStatus(mapping);
                                    const feeType = getFeeType(mapping.fee_type_id);

                                    return (
                                        <tr key={mapping.id} className="hover:bg-accent/50">
                                            <td className="px-4 py-3 text-sm font-medium text-foreground">
                                                {getClassName(mapping.class_id)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground">
                                                <div>
                                                    <div className="font-medium">{getFeeTypeName(mapping.fee_type_id)}</div>
                                                    {feeType?.fee_category_name && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {feeType.fee_category_name}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground">
                                                ₹{mapping.total_fee.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            termStatus.status === 'complete' ? 'default' :
                                                                termStatus.status === 'incomplete' ? 'destructive' : 'secondary'
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {termStatus.message}
                                                    </Badge>
                                                    {termStatus.status === 'incomplete' && (
                                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <Badge
                                                    variant={mapping.all_by_default ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                >
                                                    {mapping.all_by_default ? 'Default' : 'Custom'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleManageTermAmounts(mapping)}
                                                        className="h-8 w-8 p-0"
                                                        title="Manage Term Amounts"
                                                    >
                                                        <Calculator className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(mapping)}
                                                        className="h-8 w-8 p-0"
                                                        title="Edit Mapping"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDelete(mapping)}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                                                        title="Delete Mapping"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                    <p>No fee mappings found for the selected academic year.</p>
                    <Button onClick={handleCreate} className="mt-4">
                        Create First Mapping
                    </Button>
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMapping ? 'Edit Fee Mapping' : 'Create Fee Mapping'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Fee Type *
                            </label>
                            <Select
                                value={formData.fee_type_id || ''}
                                onValueChange={(value) => setFormData({ ...formData, fee_type_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select fee type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {feeTypes.map((feeType) => (
                                        <SelectItem key={feeType.id} value={feeType.id.toString()}>
                                            {/* <div>
                                                <div className="font-medium">{feeType.type_name}</div>
                                                {feeType.fee_category_name && (
                                                    <div className="text-xs text-muted-foreground">
                                                     
                                                    </div>
                                                )}
                                            </div> */}
                                            {feeType?feeType.type_name:'Unknown Fee Type'} 
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Class *
                            </label>
                            <Select
                                value={formData.class_id || ''}
                                onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((classItem) => (
                                        <SelectItem key={classItem.id} value={classItem.id}>
                                            {classItem.name} 
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Total Fee *
                            </label>
                            <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.total_fee}
                                onChange={(e) => setFormData({ ...formData, total_fee: parseFloat(e.target.value) || 0 })}
                                placeholder="Enter total fee"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="all_by_default"
                                checked={formData.all_by_default}
                                onChange={(e) => setFormData({ ...formData, all_by_default: e.target.checked })}
                                className="rounded border-border"
                            />
                            <label htmlFor="all_by_default" className="text-sm font-medium text-foreground">
                                Apply to all students by default
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
                        <DialogTitle>Delete Fee Mapping</DialogTitle>
                    </DialogHeader>

                    <p className="text-muted-foreground">
                        Are you sure you want to delete the mapping for "{getClassName(showDeleteDialog?.class_id || '0')}" - "{getFeeTypeName(showDeleteDialog?.fee_type_id || '0')}"?
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

            {/* Term Amount Modal */}
            {showTermAmountModal && (
                <TermAmountModal
                    mapping={showTermAmountModal}
                    open={!!showTermAmountModal}
                    onOpenChange={() => setShowTermAmountModal(null)}
                />
            )}
        </div>
    );
}