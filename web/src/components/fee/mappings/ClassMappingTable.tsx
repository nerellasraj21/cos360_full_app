import React, { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { EditButton, DeleteButton, TableActionGroup } from '@/components/common/TableActions';
import { Edit, Trash2, Plus, Calculator, AlertCircle, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReactSelect from 'react-select';
import { useSelectStyles } from '@/lib/useSelectStyles';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useFeeClassMappings, useCreateFeeClassMapping, useUpdateFeeClassMapping, useDeleteFeeClassMapping, useToggleMandatoryFeeClassMapping, feeStudentMappingKeys } from '@/hooks/fee/useFeeMappings';
import { feeCollectionKeys } from '@/hooks/fee/useFeeCollection';
import { useFeeTypes } from '@/hooks/fee/useFeeTypes';
import { useFeeCategories } from '@/hooks/fee/useFeeCategories';
import { useClassSectionsDropdown } from '@/api/hooks/masters/classesandsections';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { usePermission } from '@/hooks/usePermission';
import { TermAmountModal } from './TermAmountModal';
import { feeStudentMappingsApi } from '@/api/fee/studentMappings';
import { fetchStudentsDropdown } from '@/api/students/admissions';
import type { FeeClassMapping, FeeType } from '@/types/fee';
import { toast } from 'sonner';
import { logger } from '@/lib/config';

interface ClassMappingTableProps {
    className?: string;
    highlightKey?: number;
}

interface MappingFormData {
    class_id: string;
    fee_type_id: string;
    total_fee: number;
    all_by_default: boolean;
}


type SortKey = 'class' | 'feeType' | 'totalFee' | 'termStatus' | 'assignmentType';
type SortDir = 'asc' | 'desc';

export function ClassMappingTable({ className, highlightKey = 0 }: ClassMappingTableProps) {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const selectStyles = useSelectStyles();
    const { checkPermission } = usePermission();
    const canCreate = checkPermission('fee_class_mappings', 'create');
    const canUpdate = checkPermission('fee_class_mappings', 'update');
    const canDelete = checkPermission('fee_class_mappings', 'delete');
    const hasAnyAction = canCreate || canUpdate || canDelete;

    const [isHighlighted, setIsHighlighted] = useState(false);

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
    const [isFormDirty, setIsFormDirty] = useState(false);

    // Search and sort state
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<SortKey | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const { data: mappingsResponse, isLoading, error } = useFeeClassMappings({
        academic_year_id: selectedAcademicYearId || undefined,
    });

    // Fire when highlightKey increments (every sidebar click) and data is ready
    useEffect(() => {
        if (!highlightKey || isLoading) return;
        setIsHighlighted(true);
        const timer = setTimeout(() => setIsHighlighted(false), 3000);
        return () => clearTimeout(timer);
    }, [highlightKey, isLoading]);

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
    const toggleMandatoryMutation = useToggleMandatoryFeeClassMapping();
    const queryClient = useQueryClient();
    const [bulkApplyingId, setBulkApplyingId] = useState<string | null>(null);

    // Creates the actual per-student fee records for every currently enrolled
    // student in the class. Marking a class mapping "mandatory" only sets a
    // flag on the class-level row; Fee Collection reads student-level records,
    // so without this the fee never shows up for already-enrolled students.
    const applyMandatoryFeeToAllStudents = async (target: {
        class_id: string;
        fee_type_id: string;
        total_fee: number;
    }) => {
        const classItem = classes.find(c => c.id === target.class_id);
        if (!classItem || classItem.sections.length === 0) return;

        let successCount = 0;
        let attemptedCount = 0;

        for (const section of classItem.sections) {
            try {
                const sectionStudents = await fetchStudentsDropdown(true, target.class_id, section.id);
                if (sectionStudents.length === 0) continue;

                const result = await feeStudentMappingsApi.bulkCreateMappings({
                    student_ids: sectionStudents.map(s => s.id),
                    class_id: target.class_id,
                    section_id: section.id,
                    fee_type_id: target.fee_type_id,
                    total_fee: target.total_fee,
                    academic_year_id: selectedAcademicYearId || '',
                });
                successCount += result.success_count;
                attemptedCount += result.total_count;
            } catch (error) {
                logger.error('[DEBUG] Failed to apply mandatory fee for section', section.id, error);
            }
        }

        queryClient.invalidateQueries({ queryKey: feeStudentMappingKeys.lists() });
        queryClient.invalidateQueries({ queryKey: feeCollectionKeys.all });

        if (attemptedCount > 0) {
            toast.success(`Fee applied to ${successCount} of ${attemptedCount} students in this class.`);
        }
    };

    // Sort handler
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ colKey }: { colKey: SortKey }) => {
        if (sortKey !== colKey) return <ChevronsUpDown className="inline h-3 w-3 ml-1 opacity-50" />;
        return sortDir === 'asc'
            ? <ChevronUp className="inline h-3 w-3 ml-1" />
            : <ChevronDown className="inline h-3 w-3 ml-1" />;
    };

    const handleCreate = () => {
        setFormData({
            class_id: '',
            fee_type_id: '',
            total_fee: 0,
            all_by_default: false
        });
        setIsFormDirty(false);
        setEditingMapping(null);
        setShowCreateDialog(true);
    };

    const handleEdit = (mapping: FeeClassMapping) => {
        setFormData({
            class_id: mapping.class_id,
            fee_type_id: mapping.fee_type_id,
            total_fee: Number(mapping.total_fee),
            all_by_default: mapping.all_by_default
        });
        setIsFormDirty(false);
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

                if (formData.all_by_default) {
                    setBulkApplyingId(editingMapping.id);
                    await applyMandatoryFeeToAllStudents({
                        class_id: editingMapping.class_id,
                        fee_type_id: editingMapping.fee_type_id,
                        total_fee: formData.total_fee,
                    });
                    setBulkApplyingId(null);
                }
            } else {
                // CREATE: Send all required fields
                const createData = {
                    class_id: formData.class_id,
                    fee_type_id: formData.fee_type_id,
                    total_fee: formData.total_fee,
                    academic_year_id: selectedAcademicYearId!,
                    all_by_default: formData.all_by_default
                };

                const created = await createMutation.mutateAsync(createData);
                if (createData.all_by_default) {
                    setBulkApplyingId(created.id);
                    await applyMandatoryFeeToAllStudents({
                        class_id: createData.class_id,
                        fee_type_id: createData.fee_type_id,
                        total_fee: createData.total_fee,
                    });
                    setBulkApplyingId(null);
                }
            }

            setIsFormDirty(false);
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

    // Filtered and sorted data
    const processedMappings = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        let filtered = q
            ? mappings.filter(m => {
                const cname = getClassName(m.class_id).toLowerCase();
                const ftname = getFeeTypeName(m.fee_type_id).toLowerCase();
                const totalFee = String(m.total_fee);
                return cname.includes(q) || ftname.includes(q) || totalFee.includes(q);
            })
            : mappings;
        if (sortKey) {
            filtered = [...filtered].sort((a, b) => {
                if (sortKey === 'totalFee') {
                    const diff = a.total_fee - b.total_fee;
                    return sortDir === 'asc' ? diff : -diff;
                }
                let aVal = '', bVal = '';
                if (sortKey === 'class') { aVal = getClassName(a.class_id); bVal = getClassName(b.class_id); }
                else if (sortKey === 'feeType') { aVal = getFeeTypeName(a.fee_type_id); bVal = getFeeTypeName(b.fee_type_id); }
                else if (sortKey === 'termStatus') { aVal = getTermAmountStatus(a).status; bVal = getTermAmountStatus(b).status; }
                else if (sortKey === 'assignmentType') { aVal = a.all_by_default ? 'Default' : 'Custom'; bVal = b.all_by_default ? 'Default' : 'Custom'; }
                return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }
        return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mappings, searchQuery, sortKey, sortDir]);

    // Reset to first page when filters/sort/page size change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, sortKey, sortDir, pageSize]);

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

    const totalPages = Math.max(1, Math.ceil(processedMappings.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedMappings = processedMappings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Fee Class Mappings</h2>
                {canCreate && (
                    <Button onClick={handleCreate} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Mapping
                    </Button>
                )}
            </div>

            {/* Search */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    <span>Filters</span>
                </div>
                <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search by class, fee type, or amount..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>
            </div>

            {/* Mappings Table */}
            {mappings.length > 0 ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">
                                        S.No.
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('class')}
                                    >
                                        Class {<SortIcon colKey='class' />}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('feeType')}
                                    >
                                        Fee Type {<SortIcon colKey='feeType' />}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('totalFee')}
                                    >
                                        Total Fee {<SortIcon colKey='totalFee' />}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('termStatus')}
                                    >
                                        Term Distribution {<SortIcon colKey='termStatus' />}
                                    </th>
                                    <th
                                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground"
                                        onClick={() => handleSort('assignmentType')}
                                    >
                                        Mandatory {<SortIcon colKey='assignmentType' />}
                                    </th>
                                    {hasAnyAction && (
                                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                            Actions
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {paginatedMappings.map((mapping, index) => {
                                    const termStatus = getTermAmountStatus(mapping);
                                    const feeType = getFeeType(mapping.fee_type_id);

                                    return (
                                        <tr
                                            key={mapping.id}
                                            className={cn(
                                                "hover:bg-accent/50 transition-colors duration-300",
                                                isHighlighted && index === 0 && "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 animate-pulse"
                                            )}
                                            style={{ height: '48px' }}
                                        >
                                            <td className="px-4 py-3 text-sm text-muted-foreground align-middle">
                                                {(currentPage - 1) * pageSize + index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-foreground align-middle">
                                                {getClassName(mapping.class_id)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground align-middle">
                                                <div>
                                                    <div className="font-medium">{getFeeTypeName(mapping.fee_type_id)}</div>
                                                    {feeType?.fee_category_name && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {feeType.fee_category_name}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground align-middle">
                                                ₹{Number(mapping.total_fee).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 text-sm align-middle">
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
                                            <td className="px-4 py-3 text-sm align-middle">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={mapping.all_by_default}
                                                        onCheckedChange={() => {
                                                            toggleMandatoryMutation.mutate(mapping.id, {
                                                                onSuccess: async (data) => {
                                                                    if (data.all_by_default) {
                                                                        setBulkApplyingId(mapping.id);
                                                                        await applyMandatoryFeeToAllStudents({
                                                                            class_id: data.class_id,
                                                                            fee_type_id: data.fee_type_id,
                                                                            total_fee: data.total_fee,
                                                                        });
                                                                        setBulkApplyingId(null);
                                                                    }
                                                                },
                                                            });
                                                        }}
                                                        disabled={toggleMandatoryMutation.isPending || bulkApplyingId === mapping.id}
                                                        aria-label="Toggle mandatory"
                                                    />
                                                    {bulkApplyingId === mapping.id && (
                                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                    )}
                                                    <span className="text-xs text-muted-foreground">
                                                        {mapping.all_by_default ? 'Mandatory' : 'Optional'}
                                                    </span>
                                                </div>
                                            </td>
                                            {hasAnyAction && (
                                                <td className="px-4 py-3 text-sm align-middle">
                                                    <TableActionGroup>
                                                        {canUpdate && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleManageTermAmounts(mapping)}
                                                                className={cn(
                                                                    "h-8 w-8 p-0 transition-all duration-300",
                                                                    isHighlighted && index === 0 && "text-amber-600 dark:text-amber-400 scale-110"
                                                                )}
                                                                title="Manage Term Amounts"
                                                            >
                                                                <Calculator className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {canUpdate && (
                                                            <EditButton
                                                                onClick={() => handleEdit(mapping)}
                                                                title="Edit Mapping"
                                                            />
                                                        )}
                                                        {canDelete && (
                                                            <DeleteButton
                                                                onClick={() => handleDelete(mapping)}
                                                                title="Delete Mapping"
                                                            />
                                                        )}
                                                    </TableActionGroup>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {processedMappings.length > 0 && (
                        <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-t border-border">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <span>Rows per page</span>
                                    <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                                        <SelectTrigger className="w-16 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[5, 10, 20, 50].map((size) => (
                                                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <span>
                                    Page {currentPage} of {totalPages} ({processedMappings.length} mappings)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
                    <p>No fee mappings found for the selected academic year.</p>
                    {canCreate && (
                        <Button onClick={handleCreate} className="mt-4">
                            Create First Mapping
                        </Button>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)} modal={false}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMapping ? 'Edit Fee Mapping' : 'Create Fee Mapping'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4" onChange={() => setIsFormDirty(true)}>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Fee Type *
                            </label>
                            <ReactSelect
                                options={feeTypes.map(ft => ({ value: ft.id.toString(), label: ft ? ft.type_name : 'Unknown Fee Type' }))}
                                value={formData.fee_type_id ? { value: formData.fee_type_id, label: feeTypes.find(ft => ft.id.toString() === formData.fee_type_id)?.type_name ?? 'Unknown Fee Type' } : null}
                                onChange={opt => { setFormData({ ...formData, fee_type_id: opt?.value ?? '' }); setIsFormDirty(true); }}
                                placeholder="Select fee type"
                                isClearable
                                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                styles={selectStyles}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Class *
                            </label>
                            <ReactSelect
                                options={classes.map(c => ({ value: c.id, label: c.name }))}
                                value={formData.class_id ? { value: formData.class_id, label: classes.find(c => c.id === formData.class_id)?.name ?? '' } : null}
                                onChange={opt => { setFormData({ ...formData, class_id: opt?.value ?? '' }); setIsFormDirty(true); }}
                                placeholder="Select class"
                                isClearable
                                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                                styles={selectStyles}
                            />
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

                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="all_by_default"
                                    checked={formData.all_by_default}
                                    onChange={(e) => setFormData({ ...formData, all_by_default: e.target.checked })}
                                    className="rounded border-border"
                                />
                                <label htmlFor="all_by_default" className="text-sm font-medium text-foreground">
                                    Mandatory fee (apply to all students in this class)
                                </label>
                            </div>
                            <p className="text-xs text-muted-foreground ml-6">
                                When ticked, this fee is automatically applied to all current and future students in this class. Untick to assign students manually.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending || bulkApplyingId !== null}
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Saving...'
                                : bulkApplyingId !== null
                                    ? 'Applying to students...'
                                    : 'Save'}
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