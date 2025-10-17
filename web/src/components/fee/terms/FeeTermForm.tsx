import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useCreateFeeTerm, useUpdateFeeTerm } from '@/hooks/fee/useFeeTerms';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type { FeeTerm, FeeTermDateInput } from '@/types/fee';

const feeTermSchema = z.object({
    term_name: z.string().min(1, 'Term name is required').max(100, 'Term name must be less than 100 characters'),
    number_of_terms: z.number().min(1, 'Must have at least 1 term').max(12, 'Cannot exceed 12 terms'),
    term_status: z.enum(['active', 'inactive']),
});

type FeeTermFormData = z.infer<typeof feeTermSchema>;

interface FeeTermFormProps {
    term?: FeeTerm | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export function FeeTermForm({ term, onSuccess, onCancel }: FeeTermFormProps) {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const [error, setError] = useState<string | null>(null);
    const [feeTermDates, setFeeTermDates] = useState<FeeTermDateInput[]>([]);
    const [editingDateIndex, setEditingDateIndex] = useState<number | null>(null);
    const [newDate, setNewDate] = useState<string>('');

    const createMutation = useCreateFeeTerm();
    const updateMutation = useUpdateFeeTerm();

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FeeTermFormData>({
        resolver: zodResolver(feeTermSchema),
        defaultValues: {
            term_name: '',
            number_of_terms: 1,
            term_status: 'active',
        },
    });

    const termStatus = watch('term_status');

    // Populate form when editing
    useEffect(() => {
        if (term) {
            reset({
                term_name: term.term_name,
                number_of_terms: term.number_of_terms,
                term_status: term.term_status as 'active' | 'inactive',
            });
            // Populate existing dates
            setFeeTermDates(term.fee_term_dates.map(date => ({
                fee_term_date: date.fee_term_date
            })));
        } else {
            reset({
                term_name: '',
                number_of_terms: 1,
                term_status: 'active',
            });
            setFeeTermDates([]);
        }
    }, [term, reset]);

    const onSubmit = async (data: FeeTermFormData) => {
        if (!selectedAcademicYearId) {
            setError('Please select an academic year');
            return;
        }

        setError(null);

        try {
            if (term) {
                // Update existing term
                await updateMutation.mutateAsync({
                    id: term.id,
                    data: {
                        term_name: data.term_name,
                        number_of_terms: data.number_of_terms,
                        term_status: data.term_status,
                        academic_year_id: selectedAcademicYearId,
                        fee_term_dates: feeTermDates,
                    },
                });
            } else {
                // Create new term
                await createMutation.mutateAsync({
                    term_name: data.term_name,
                    number_of_terms: data.number_of_terms,
                    term_status: data.term_status,
                    academic_year_id: selectedAcademicYearId,
                    fee_term_dates: feeTermDates,
                });
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    // Date management functions
    const addDate = () => {
        if (!newDate) return;
        setFeeTermDates([...feeTermDates, { fee_term_date: newDate }]);
        setNewDate('');
    };

    const editDate = (index: number, date: string) => {
        const updated = [...feeTermDates];
        updated[index] = { fee_term_date: date };
        setFeeTermDates(updated);
        setEditingDateIndex(null);
    };

    const deleteDate = (index: number) => {
        setFeeTermDates(feeTermDates.filter((_, i) => i !== index));
    };

    const startEditDate = (index: number) => {
        setEditingDateIndex(index);
        setNewDate(feeTermDates[index].fee_term_date);
    };

    const cancelEditDate = () => {
        setEditingDateIndex(null);
        setNewDate('');
    };

    const saveEditDate = () => {
        if (editingDateIndex !== null && newDate) {
            editDate(editingDateIndex, newDate);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <Alert>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-2">
                <Label htmlFor="term_name">Term Name</Label>
                <Input
                    id="term_name"
                    {...register('term_name')}
                    placeholder="e.g., Quarterly, Monthly, Annual"
                    disabled={isPending}
                />
                {errors.term_name && (
                    <p className="text-sm text-destructive">{errors.term_name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="number_of_terms">Number of Terms</Label>
                <Input
                    id="number_of_terms"
                    type="number"
                    min="1"
                    max="12"
                    {...register('number_of_terms', { valueAsNumber: true })}
                    disabled={isPending}
                />
                {errors.number_of_terms && (
                    <p className="text-sm text-destructive">{errors.number_of_terms.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    This determines how many payment dates will be required for this term.
                </p>
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    id="term_status"
                    checked={termStatus === 'active'}
                    onCheckedChange={(checked) => setValue('term_status', checked ? 'active' : 'inactive')}
                    disabled={isPending}
                />
                <Label htmlFor="term_status">Active</Label>
            </div>

            {/* Fee Term Dates Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Payment Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Add/Edit Date Input */}
                    <div className="flex gap-2">
                        <Input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            placeholder="Select date"
                            disabled={isPending}
                        />
                        {editingDateIndex !== null ? (
                            <>
                                <Button
                                    type="button"
                                    onClick={saveEditDate}
                                    disabled={isPending || !newDate}
                                    size="sm"
                                >
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={cancelEditDate}
                                    disabled={isPending}
                                    size="sm"
                                >
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                onClick={addDate}
                                disabled={isPending || !newDate}
                                size="sm"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Date
                            </Button>
                        )}
                    </div>

                    {/* Dates List */}
                    {feeTermDates.length > 0 && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Installment</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feeTermDates.map((date, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Badge variant="outline">
                                                Installment {index + 1}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {format(parseISO(date.fee_term_date), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => startEditDate(index)}
                                                    disabled={isPending || editingDateIndex !== null}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => deleteDate(index)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {feeTermDates.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                            No payment dates added yet. Add dates above.
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end space-x-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isPending}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : term ? 'Update Term' : 'Create Term'}
                </Button>
            </div>
        </form>
    );
}