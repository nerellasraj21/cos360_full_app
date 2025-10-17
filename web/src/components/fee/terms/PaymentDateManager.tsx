import { format, parseISO } from 'date-fns';
import { Calendar, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { FeeTerm } from '@/types/fee';

interface PaymentDateManagerProps {
    term: FeeTerm;
    onClose: () => void;
}

export function PaymentDateManager({ term, onClose }: PaymentDateManagerProps) {
    // Sort fee term dates by date
    const sortedDates = [...term.fee_term_dates].sort((a, b) =>
        new Date(a.fee_term_date).getTime() - new Date(b.fee_term_date).getTime()
    );

    const isComplete = term.fee_term_dates.length === term.number_of_terms;

    return (
        <div className="space-y-6">
            {/* Header with status */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Payment Schedule Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                        Payment dates for "{term.term_name}"
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={isComplete ? 'default' : 'secondary'}>
                        {term.fee_term_dates.length}/{term.number_of_terms} configured
                    </Badge>
                    {!isComplete && (
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                </div>
            </div>

            {/* Info Alert */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    Payment dates are configured when creating or editing the fee term.
                    Use the "Edit" button in the fee terms list to modify dates.
                </AlertDescription>
            </Alert>

            {/* Validation Alert */}
            {!isComplete && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        This term requires {term.number_of_terms} payment dates but only has {term.fee_term_dates.length} configured.
                    </AlertDescription>
                </Alert>
            )}

            {/* Payment Dates Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Configured Payment Dates</CardTitle>
                </CardHeader>
                <CardContent>
                    {sortedDates.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No payment dates configured yet.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Installment</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedDates.map((date, index) => (
                                    <TableRow key={date.id}>
                                        <TableCell>
                                            <Badge variant="outline">
                                                Installment {index + 1}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(parseISO(date.fee_term_date), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="default">
                                                Configured
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex justify-end">
                <Button onClick={onClose}>
                    Close
                </Button>
            </div>
        </div>
    );
}