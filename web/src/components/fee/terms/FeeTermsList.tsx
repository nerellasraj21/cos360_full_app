import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Calendar, AlertTriangle, Loader2, Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeeTerms, useDeleteFeeTerm } from '@/hooks/fee/useFeeTerms';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { usePermission } from '@/hooks/usePermission';
import { PaymentDateManager } from './PaymentDateManager';
import { FeeTermForm } from './FeeTermForm';
import type { FeeTerm } from '@/types/fee';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export function FeeTermsList() {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const { checkPermission } = usePermission();
    const canCreate = checkPermission('fee_terms', 'create');
    const canUpdate = checkPermission('fee_terms', 'update');
    const canDelete = checkPermission('fee_terms', 'delete');
    const hasAnyAction = canCreate || canUpdate || canDelete;

    const [selectedTerm, setSelectedTerm] = useState<FeeTerm | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPaymentManagerOpen, setIsPaymentManagerOpen] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<FeeTerm | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };
    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ChevronsUpDown className="h-3 w-3 ml-1 inline opacity-40" />;
        return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />;
    };

    const { data: terms = [], isLoading, error } = useFeeTerms({
        academic_year_id: selectedAcademicYearId,
    });

    const filteredTerms = useMemo(() => {
        let items = terms;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(t => t.term_name.toLowerCase().includes(q));
        }
        if (sortKey) {
            items = [...items].sort((a, b) => {
                const aVal = sortKey === 'number_of_terms'
                    ? String(a.number_of_terms)
                    : String((a as any)[sortKey] ?? '');
                const bVal = sortKey === 'number_of_terms'
                    ? String(b.number_of_terms)
                    : String((b as any)[sortKey] ?? '');
                return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });
        }
        return items;
    }, [terms, searchQuery, sortKey, sortDir]);

    // Reset to first page when filters/sort/page size change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, sortKey, sortDir, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredTerms.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const paginatedTerms = filteredTerms.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const deleteTermMutation = useDeleteFeeTerm();

    const handleEditTerm = (term: FeeTerm) => {
        setSelectedTerm(term);
        setIsDirty(false);
        setIsFormOpen(true);
    };

    const handleDeleteTerm = (term: FeeTerm) => {
        setDeleteTarget(term);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            deleteTermMutation.mutate(deleteTarget.id);
            setDeleteTarget(null);
        }
    };

    const handleManagePaymentDates = (term: FeeTerm) => {
        setSelectedTerm(term);
        setIsPaymentManagerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedTerm(null);
        setIsDirty(false);
        setIsFormOpen(true);
    };

    const getPaymentDatesSummary = (term: FeeTerm) => {
        const { fee_term_dates, number_of_terms } = term;
        const hasAllDates = fee_term_dates.length === number_of_terms;

        if (fee_term_dates.length === 0) {
            return { text: 'No payment dates', status: 'error' as const };
        }

        if (!hasAllDates) {
            return {
                text: `${fee_term_dates.length}/${number_of_terms} dates configured`,
                status: 'warning' as const
            };
        }

        const sortedDates = [...fee_term_dates].sort((a, b) =>
            new Date(a.fee_term_date).getTime() - new Date(b.fee_term_date).getTime()
        );

        const firstDate = format(new Date(sortedDates[0].fee_term_date), 'MMM dd');
        const lastDate = format(new Date(sortedDates[sortedDates.length - 1].fee_term_date), 'MMM dd');

        return {
            text: `${firstDate} - ${lastDate} (${fee_term_dates.length} dates)`,
            status: 'success' as const
        };
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading fee terms...</span>
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
                            Failed to load fee terms. Please try again.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Fee Terms & Payment Schedules</CardTitle>
                        {canCreate && (
                            <Button onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Term
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {terms.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-muted-foreground mb-4">
                                No fee terms found for the selected academic year.
                            </div>
                            {canCreate && (
                                <Button onClick={handleCreateNew}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Term
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
                                <Input placeholder="Search by term name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">S.No.</TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('term_name')}>Term Name <SortIcon col="term_name" /></TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('number_of_terms')}>Number of Terms <SortIcon col="number_of_terms" /></TableHead>
                                    <TableHead>Payment Schedule</TableHead>
                                    <TableHead className="cursor-pointer select-none" onClick={() => handleSort('term_status')}>Status <SortIcon col="term_status" /></TableHead>
                                    {hasAnyAction && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTerms.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">{searchQuery ? 'No terms match your search' : 'No fee terms'}</TableCell></TableRow>
                                ) : paginatedTerms.map((term, index) => {
                                    const paymentSummary = getPaymentDatesSummary(term);

                                    return (
                                        <TableRow key={term.id} style={{ height: '48px' }}>
                                            <TableCell className="text-muted-foreground text-sm">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                            <TableCell className="font-medium">
                                                {term.term_name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {term.number_of_terms} {term.number_of_terms === 1 ? 'term' : 'terms'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm ${paymentSummary.status === 'error' ? 'text-destructive' :
                                                            paymentSummary.status === 'warning' ? 'text-yellow-600' :
                                                                'text-muted-foreground'
                                                        }`}>
                                                        {paymentSummary.text}
                                                    </span>
                                                    {paymentSummary.status !== 'success' && (
                                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={term.term_status === 'active' ? 'default' : 'secondary'}>
                                                    {term.term_status === 'active' ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            {hasAnyAction && (
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {canUpdate && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleManagePaymentDates(term)}
                                                                title="Manage Payment Dates"
                                                            >
                                                                <Calendar className="h-4 w-4 mr-1" />
                                                                Payment Dates
                                                            </Button>
                                                        )}
                                                        {canUpdate && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditTerm(term)}
                                                                className="h-8 w-8 p-0"
                                                                title="Edit Fee Term"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {canDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteTerm(term)}
                                                                disabled={deleteTermMutation.isPending}
                                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                                                                title="Delete Fee Term"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {filteredTerms.length > 0 && (
                            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
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
                                        Page {currentPage} of {totalPages} ({filteredTerms.length} terms)
                                    </span>
                                </div>
                            </div>
                        )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Fee Term Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen} guardDirty={isDirty} onDirtyDiscard={() => setIsDirty(false)}>
                <DialogContent className="max-w-md" onChange={() => setIsDirty(true)}>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedTerm ? 'Edit Fee Term' : 'Create New Fee Term'}
                        </DialogTitle>
                    </DialogHeader>
                    <FeeTermForm
                        term={selectedTerm}
                        onSuccess={() => {
                            setIsDirty(false);
                            setIsFormOpen(false);
                            setSelectedTerm(null);
                        }}
                        onCancel={() => {
                            setIsFormOpen(false);
                            setSelectedTerm(null);
                        }}
                    />
                </DialogContent>
            </Dialog>

            {/* Payment Date Manager Dialog */}
            <Dialog open={isPaymentManagerOpen} onOpenChange={setIsPaymentManagerOpen}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>
                            Manage Payment Dates - {selectedTerm?.term_name}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTerm && (
                        <PaymentDateManager
                            term={selectedTerm}
                            onClose={() => {
                                setIsPaymentManagerOpen(false);
                                setSelectedTerm(null);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Fee Term"
                description={`Are you sure you want to delete "${deleteTarget?.term_name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
                isPending={deleteTermMutation.isPending}
            />
        </div>
    );
}