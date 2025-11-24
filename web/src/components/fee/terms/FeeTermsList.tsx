import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, Calendar, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFeeTerms, useDeleteFeeTerm } from '@/hooks/fee/useFeeTerms';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import { PaymentDateManager } from './PaymentDateManager';
import { FeeTermForm } from './FeeTermForm';
import type { FeeTerm } from '@/types/fee';

export function FeeTermsList() {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const [selectedTerm, setSelectedTerm] = useState<FeeTerm | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPaymentManagerOpen, setIsPaymentManagerOpen] = useState(false);

    const { data: terms = [], isLoading, error } = useFeeTerms({
        academic_year_id: selectedAcademicYearId,
    });

    const deleteTermMutation = useDeleteFeeTerm();

    const handleEditTerm = (term: FeeTerm) => {
        setSelectedTerm(term);
        setIsFormOpen(true);
    };

    const handleDeleteTerm = async (term: FeeTerm) => {
        if (window.confirm(`Are you sure you want to delete "${term.term_name}"? This action cannot be undone.`)) {
            try {
                await deleteTermMutation.mutateAsync(term.id);
            } catch (error) {
                console.error('Failed to delete term:', error);
            }
        }
    };

    const handleManagePaymentDates = (term: FeeTerm) => {
        setSelectedTerm(term);
        setIsPaymentManagerOpen(true);
    };

    const handleCreateNew = () => {
        setSelectedTerm(null);
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
                        <Button onClick={handleCreateNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Term
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {terms.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-muted-foreground mb-4">
                                No fee terms found for the selected academic year.
                            </div>
                            <Button onClick={handleCreateNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create First Term
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Term Name</TableHead>
                                    <TableHead>Number of Terms</TableHead>
                                    <TableHead>Payment Schedule</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {terms.map((term) => {
                                    const paymentSummary = getPaymentDatesSummary(term);

                                    return (
                                        <TableRow key={term.id}>
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
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleManagePaymentDates(term)}
                                                    >
                                                        <Calendar className="h-4 w-4 mr-1" />
                                                        Payment Dates
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleEditTerm(term)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteTerm(term)}
                                                        disabled={deleteTermMutation.isPending}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Fee Term Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedTerm ? 'Edit Fee Term' : 'Create New Fee Term'}
                        </DialogTitle>
                    </DialogHeader>
                    <FeeTermForm
                        term={selectedTerm}
                        onSuccess={() => {
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
        </div>
    );
}