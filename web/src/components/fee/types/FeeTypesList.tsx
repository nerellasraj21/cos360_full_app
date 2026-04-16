import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, Loader2, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeeTypes, useDeleteFeeType } from '@/hooks/fee/useFeeTypes';
import { usePermission } from '@/hooks/usePermission';
import { FeeTypeForm } from './FeeTypeForm';
import type { FeeType } from '@/types/fee';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function FeeTypesList() {
    const [selectedType, setSelectedType] = useState<FeeType | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<FeeType | null>(null);
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

    const { checkPermission } = usePermission();

    // Check permissions
    const canCreate = checkPermission('fee_types', 'create');
    const canUpdate = checkPermission('fee_types', 'update');
    const canDelete = checkPermission('fee_types', 'delete');

    const { data: types = [], isLoading, error } = useFeeTypes();

    const filteredTypes = useMemo(() => {
        let items = types;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(t =>
                t.type_name.toLowerCase().includes(q) ||
                (t.fee_category_name ?? '').toLowerCase().includes(q) ||
                (t.fee_term_name ?? '').toLowerCase().includes(q)
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
    }, [types, searchQuery, sortKey, sortDir]);

    const deleteTypeMutation = useDeleteFeeType();

    const handleEditType = (type: FeeType) => {
        setSelectedType(type);
        setIsDirty(false);
        setIsFormOpen(true);
    };

    const handleDeleteType = (type: FeeType) => {
        setDeleteTarget(type);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            deleteTypeMutation.mutate({ id: deleteTarget.id, categoryId: deleteTarget.fee_category_id });
            setDeleteTarget(null);
        }
    };

    const handleCreateNew = () => {
        setSelectedType(null);
        setIsDirty(false);
        setIsFormOpen(true);
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading fee types...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load fee types. Please try again.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                {canCreate && (
                    <CardHeader className="pb-0">
                        <div className="flex justify-end">
                            <Button onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Type
                            </Button>
                        </div>
                    </CardHeader>
                )}
                <CardContent>
                    {types.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-muted-foreground mb-4">
                                No fee types found for the selected academic year.
                            </div>
                            {canCreate && (
                                <Button onClick={handleCreateNew}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Type
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                                <Filter className="h-3.5 w-3.5" />
                                <span>Filters</span>
                            </div>
                            <div className="relative max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input placeholder="Search by name, category or term..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">S.No.</TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('type_name')}>Type Name <SortIcon col="type_name" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('fee_category_name')}>Category <SortIcon col="fee_category_name" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('fee_term_name')}>Term <SortIcon col="fee_term_name" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('fee_status')}>Status <SortIcon col="fee_status" /></TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTypes.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No types match your search' : 'No fee types'}</TableCell></TableRow>
                                ) : filteredTypes.map((type, index) => (
                                    <TableRow key={type.id} style={{ height: '48px' }}>
                                        <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                                        <TableCell className="font-medium">
                                            {type.type_name}
                                        </TableCell>
                                        <TableCell>
                                            {type.fee_category_name || 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                if (!type.fee_term_name) return 'N/A';
                                                if (type.fee_term_name === type.fee_term_id) {
                                                    return `Installment ${type.fee_term_name ? 1 : 'N/A'}`;
                                                }
                                                return type.fee_term_name;
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={type.fee_status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {canUpdate && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditType(type)}
                                                        className="h-8 w-8 p-0"
                                                        title="Edit Fee Type"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {canDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteType(type)}
                                                        disabled={deleteTypeMutation.isPending}
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                                                        title="Delete Fee Type"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Fee Type Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} guardDirty={isDirty} onDirtyDiscard={() => setIsDirty(false)}>
                <DialogContent className="max-w-md" onChange={() => setIsDirty(true)}>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedType ? 'Edit Fee Type' : 'Create New Fee Type'}
                        </DialogTitle>
                    </DialogHeader>
                    <FeeTypeForm
                        type={selectedType}
                        onSuccess={() => {
                            setIsDirty(false);
                            setIsFormOpen(false);
                            setSelectedType(null);
                        }}
                        onCancel={() => {
                            setIsFormOpen(false);
                            setSelectedType(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Fee Type"
                description={`Are you sure you want to delete "${deleteTarget?.type_name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                isPending={deleteTypeMutation.isPending}
            />
        </div>
    );
}