/*
 * Term Amount Modal Component
 * 
 * BACKEND INTEGRATION TODO:
 * When implementing the backend, uncomment the following:
 * 1. Import statements for API hooks (lines ~8-9)
 * 2. useFeeTermAmounts and useFeeType hook calls (lines ~25-27)
 * 3. useSetTermAmounts mutation hook (lines ~28)
 * 4. Replace mock data with API data (lines ~30-85)
 * 
 * The component currently uses sample fee type data with term structures.
 */

import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, CheckCircle, DivideSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCreateClassMappingTermAmounts, useUpdateClassMappingTermAmounts } from '@/hooks/fee/useFeeMappings';
import { useFeeType } from '@/hooks/fee/useFeeTypes';
import { useFeeTerm, useFeeTermDates } from '@/hooks/fee/useFeeTerms';
import { usePermission } from '@/hooks/usePermission';
import type { FeeClassMapping, FeeTermAmount, FeeTermAmountCreateRequest } from '@/types/fee';
import { toast } from 'sonner';

interface TermAmountModalProps {
    mapping: FeeClassMapping;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface TermAmountFormData {
    term_number: number;
    term_amount: number;
    term_id?: string;  // ⚠️ DEPRECATED - For backward compatibility only
    term_date_id?: string;  // ✅ NEW - Use this for new code
    term_name?: string;
    due_date?: string;
}

export function TermAmountModal({ mapping, open, onOpenChange }: TermAmountModalProps) {
    const [termAmounts, setTermAmounts] = useState<TermAmountFormData[]>([]);
    const [distributionMode, setDistributionMode] = useState<'equal' | 'manual'>('equal');
    const [isFormDirty, setIsFormDirty] = useState(false);

    const { checkPermission } = usePermission();
    const canCreate = checkPermission('fee_class_mapping_term_amounts', 'create');
    const canUpdate = checkPermission('fee_class_mapping_term_amounts', 'update');
    const canWrite = canCreate || canUpdate;

    // Use hooks for API integration
    const createTermAmountsMutation = useCreateClassMappingTermAmounts();
    const updateTermAmountsMutation = useUpdateClassMappingTermAmounts();

    // Get fee type information
    const { data: feeType, isLoading: feeTypeLoading } = useFeeType(mapping.fee_type_id);

    // Get fee term information if fee type has a term
    const { data: feeTerm, isLoading: feeTermLoading } = useFeeTerm(feeType?.fee_term_id || '');

    // Get term dates if we have a fee term
    const { data: termDates, isLoading: termDatesLoading } = useFeeTermDates(feeTerm?.id || '');

    // For now, use existing data from mapping
    const existingTermAmounts = mapping.class_fee_mapping_terms || [];
    const termAmountsLoading = feeTypeLoading || feeTermLoading || termDatesLoading;

    // Initialize term amounts based on fee term information
    useEffect(() => {
        if (open && !termAmountsLoading) {
            // Check if fee term exists and has valid ID
            if (!feeTerm?.id) {
                console.warn('Fee term not found or invalid for fee type:', feeType?.id);
                // Fallback to existing data or default
                const fallbackTerms = existingTermAmounts.length > 0 ? existingTermAmounts.length : 1;
                const initialTermAmounts: TermAmountFormData[] = [];

                for (let i = 0; i < fallbackTerms; i++) {
                    const existingAmount = existingTermAmounts[i];
                    initialTermAmounts.push({
                        term_number: i + 1,
                        term_amount: existingAmount ? existingAmount.term_amount : 0,
                        term_date_id: existingAmount?.term_date_id || existingAmount?.term_id || `fallback_term_${i + 1}`,
                        term_id: existingAmount?.term_id,  // Keep for backward compatibility
                        term_name: existingAmount?.term_name || `Term ${i + 1}`,
                        due_date: existingAmount?.term_date
                    });
                }

                setTermAmounts(initialTermAmounts);
                setDistributionMode(existingTermAmounts.length > 0 ? 'manual' : 'equal');
                return;
            }

            // Get number of terms from fee term
            const numberOfTerms = feeTerm.number_of_terms;
            const initialTermAmounts: TermAmountFormData[] = [];

            // Check if we have term dates available (these should have unique IDs for each term)
            console.log('TermAmountModal: Initializing with:', {
                feeTermId: feeTerm.id,
                numberOfTerms,
                termDatesCount: termDates?.length,
                existingTermAmountsCount: existingTermAmounts.length
            });

            if (termDates && termDates.length === numberOfTerms) {
                for (let i = 0; i < numberOfTerms; i++) {
                    const existingAmount = existingTermAmounts[i];
                    const termDate = termDates[i];

                    // The freshly-loaded term dates are the source of truth: if the fee
                    // term's dates were edited, the amounts saved earlier still carry the
                    // old (now deleted) term_date_id, which the backend would reject.
                    initialTermAmounts.push({
                        term_number: i + 1,
                        term_amount: existingAmount ? existingAmount.term_amount : 0,
                        term_date_id: termDate.id, // ✅ Always the current term date
                        term_id: feeTerm.id, // ⚠️ Keep for backward compatibility
                        term_name: feeTerm.term_name ? `${feeTerm.term_name} - Term ${i + 1}` : `Term ${i + 1}`,
                        due_date: termDate.fee_term_date
                    });
                }
            } else {
                // Fallback: Use fee_term.id with term number suffix to ensure uniqueness
                console.warn('Term dates not available or mismatched count, using fallback term IDs');
                for (let i = 0; i < numberOfTerms; i++) {
                    const existingAmount = existingTermAmounts[i];

                    initialTermAmounts.push({
                        term_number: i + 1,
                        term_amount: existingAmount ? existingAmount.term_amount : 0,
                        term_date_id: existingAmount?.term_date_id || `${feeTerm.id}_term_${i + 1}`, // Ensure uniqueness
                        term_id: existingAmount?.term_id || feeTerm.id, // Keep for backward compatibility
                        term_name: existingAmount?.term_name || (feeTerm.term_name ? `${feeTerm.term_name} - Term ${i + 1}` : `Term ${i + 1}`),
                        due_date: existingAmount?.term_date
                    });
                }
            }

            setTermAmounts(initialTermAmounts);

            // Set distribution mode based on existing data
            if (existingTermAmounts.length > 0) {
                const equalAmount = mapping.total_fee / numberOfTerms;
                const isEqualDistribution = existingTermAmounts.every(ta =>
                    Math.abs(ta.term_amount - equalAmount) < 0.01
                );
                setDistributionMode(isEqualDistribution ? 'equal' : 'manual');
            } else {
                setDistributionMode('equal');
            }
        } else if (!open) {
            // Reset state when modal closes
            setTermAmounts([]);
            setDistributionMode('equal');
            setIsFormDirty(false);
        }
    }, [mapping.id, mapping.total_fee, open, feeTerm, termDates, existingTermAmounts, termAmountsLoading, feeType?.id]);

    const handleEqualDistribution = () => {
        const numberOfTerms = termAmounts.length;
        if (numberOfTerms === 0) return;

        const equalAmount = mapping.total_fee / numberOfTerms;

        const updatedTermAmounts = termAmounts.map(ta => ({
            ...ta,
            term_amount: equalAmount
        }));

        setTermAmounts(updatedTermAmounts);
        setDistributionMode('equal');
        setIsFormDirty(true);
    };

    const handleManualAmountChange = (termNumber: number, term_amount: number) => {
        const updatedTermAmounts = termAmounts.map(ta =>
            ta.term_number === termNumber ? { ...ta, term_amount } : ta
        );
        setTermAmounts(updatedTermAmounts);
        setDistributionMode('manual');
        setIsFormDirty(true);
    };

    const getTotalTermAmount = () => {
        return termAmounts.reduce((sum, ta) => sum + (ta.term_amount || 0), 0);
    };

    const getAmountDifference = () => {
        return (getTotalTermAmount() || 0) - (mapping.total_fee || 0);
    };

    const isValidDistribution = () => {
        const difference = Math.abs(getAmountDifference());
        return difference < 0.01; // Allow for small floating point differences
    };

    const handleSave = async () => {
        // Validate that fee term exists
        if (!feeTerm?.id) {
            toast.error('Fee term not found. Please ensure the fee type has a valid fee term assigned.');
            return;
        }

        // Validate term count matches fee term's number_of_terms
        const expectedTermCount = feeTerm.number_of_terms;
        if (termAmounts.length !== expectedTermCount) {
            toast.error(`Number of terms (${termAmounts.length}) must match fee term's number of terms (${expectedTermCount})`);
            return;
        }

        // Validate that all term date IDs are valid and unique
        const invalidTermDateIds = termAmounts.filter(ta => !ta.term_date_id || ta.term_date_id.startsWith('fallback_term_'));
        if (invalidTermDateIds.length > 0) {
            toast.error('Some term date IDs are invalid. Please ensure the fee type has a properly configured fee term.');
            return;
        }

        // Check for duplicate term date IDs
        const termDateIds = termAmounts.map(ta => ta.term_date_id);
        const uniqueTermDateIds = new Set(termDateIds);
        if (uniqueTermDateIds.size !== termDateIds.length) {
            toast.error('Duplicate term date IDs found. Each term must have a unique ID.');
            return;
        }

        // Validate total amount
        if (!isValidDistribution()) {
            toast.error('Term amounts must sum to the total fee amount');
            return;
        }

        // Tracks whether the failure came from a mutation (which toasts on its own)
        // or from our own payload building (which would otherwise fail silently).
        let mutationStarted = false;

        try {
            // A term already saved for this mapping has a row id and must go through PUT;
            // terms added since (e.g. the fee term's number_of_terms grew) have no row id
            // yet and must go through POST. Both can be present at the same time.
            const toUpdate: { id: string; term_date_id: string; term_amount: number }[] = [];
            const toCreate: { term_date_id: string; term_amount: number }[] = [];

            termAmounts.forEach((ta, index) => {
                const termDateId = ta.term_date_id || ta.term_id || ta.term_number.toString();
                const existingId = existingTermAmounts[index]?.id;

                if (existingId) {
                    toUpdate.push({
                        id: existingId, // Must be valid UUID
                        term_date_id: termDateId, // Backend schema field name
                        term_amount: ta.term_amount || 0
                    });
                } else {
                    toCreate.push({
                        term_date_id: termDateId, // Backend expects this field for CREATE
                        term_amount: ta.term_amount || 0
                    });
                }
            });

            console.log('TermAmountModal: Saving term amounts:', { toUpdate, toCreate });

            if (toUpdate.length > 0) {
                mutationStarted = true;
                await updateTermAmountsMutation.mutateAsync({
                    fee_class_mapping_id: mapping.id.toString(),
                    term_amounts: toUpdate
                });
            }

            if (toCreate.length > 0) {
                mutationStarted = true;
                await createTermAmountsMutation.mutateAsync({
                    fee_class_mapping_id: mapping.id.toString(),
                    term_amounts: toCreate
                });
            }

            setIsFormDirty(false);
            onOpenChange(false);
        } catch (error) {
            console.error('TermAmountModal: Save error:', error);
            // The mutation hooks toast their own failures; anything thrown before a
            // mutation ran would otherwise disappear silently.
            if (!mutationStarted) {
                toast.error(error instanceof Error ? error.message : 'Failed to save term amounts');
            }
        }
    };

    const getTermName = (termNumber: number) => {
        const termAmount = termAmounts.find(ta => ta.term_number === termNumber);
        return termAmount?.term_name || `Term ${termNumber}`;
    };

    const getPaymentDate = (termNumber: number) => {
        const termAmount = termAmounts.find(ta => ta.term_number === termNumber);
        return termAmount?.due_date || null;
    };

    if (termAmountsLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Manage Term Amounts
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <div className="text-muted-foreground">Loading term amounts...</div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Show error if fee term is not found
    if (!feeTerm?.id && !termAmountsLoading) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Manage Term Amounts
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">Configuration Error</span>
                            </div>
                            <p className="text-destructive mt-2">
                                The selected fee type does not have a valid fee term assigned.
                                Please ensure the fee type is properly configured with a fee term before managing term amounts.
                            </p>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-foreground">Fee Type:</span>
                                    <div className="text-foreground">{feeType?.type_name || `Fee Type ${mapping.fee_type_id}`}</div>
                                    <div className="text-xs text-muted-foreground">{feeType?.fee_category_name || 'Category info not available'}</div>
                                </div>
                                <div>
                                    <span className="font-medium text-foreground">Fee Term ID:</span>
                                    <div className="text-foreground">{feeType?.fee_term_id || 'Not assigned'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange} guardDirty={isFormDirty} onDirtyDiscard={() => setIsFormDirty(false)}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        Manage Term Amounts
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Mapping Info */}
                    <div className="bg-muted p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-foreground">Fee Type:</span>
                                <div className="text-foreground">{feeType?.type_name || `Fee Type ${mapping.fee_type_id}`}</div>
                                <div className="text-xs text-muted-foreground">{feeType?.fee_category_name || 'Category info not available'}</div>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Total Amount:</span>
                                <div className="text-lg font-semibold text-foreground">
                                    ₹{(mapping.total_fee || 0).toLocaleString()}
                                </div>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Number of Terms:</span>
                                <div className="text-foreground">{feeTerm?.number_of_terms || termAmounts.length}</div>
                            </div>
                            <div>
                                <span className="font-medium text-foreground">Term Structure:</span>
                                <div className="text-foreground">{feeTerm?.term_name || 'Not available'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Distribution Options */}
                    {canWrite && (
                        <div className="space-y-3">
                            <h3 className="font-medium text-foreground">Distribution Options</h3>
                            <div className="flex gap-3">
                                <Button
                                    variant={distributionMode === 'equal' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={handleEqualDistribution}
                                    className="flex items-center gap-2"
                                >
                                    <DivideSquare className="h-4 w-4" />
                                    Equal Distribution
                                </Button>
                                <Button
                                    variant={distributionMode === 'manual' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setDistributionMode('manual')}
                                >
                                    Manual Entry
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Term Amounts */}
                    <div className="space-y-3">
                        <h3 className="font-medium text-foreground">Term-wise Amount Distribution</h3>
                        <div className="space-y-3">
                            {termAmounts.map((termAmount) => {
                                const paymentDate = getPaymentDate(termAmount.term_number);
                                return (
                                    <div key={termAmount.term_number} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm text-foreground">
                                                {getTermName(termAmount.term_number)}
                                            </div>
                                            {paymentDate && (
                                                <div className="text-xs text-muted-foreground">
                                                    Due: {paymentDate}
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-32">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={termAmount.term_amount || 0}
                                                onChange={(e) => canWrite && handleManualAmountChange(
                                                    termAmount.term_number,
                                                    parseFloat(e.target.value) || 0
                                                )}
                                                readOnly={!canWrite}
                                                placeholder="Amount"
                                                className="text-right"
                                            />
                                        </div>
                                        <div className="w-20 text-right text-sm text-muted-foreground">
                                            ₹{(termAmount.term_amount || 0).toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Validation Summary */}
                    <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-foreground">Total Term Amount:</div>
                                <div className="text-lg font-semibold text-foreground">
                                    ₹{(getTotalTermAmount() || 0).toLocaleString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-foreground">Difference:</div>
                                <div className={cn(
                                    "text-lg font-semibold",
                                    isValidDistribution() ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {getAmountDifference() >= 0 ? '+' : ''}₹{(getAmountDifference() || 0).toFixed(2)}
                                </div>
                            </div>
                            <div className="flex items-center">
                                {isValidDistribution() ? (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <CheckCircle className="h-5 w-5" />
                                        <span className="text-sm font-medium">Valid</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="text-sm font-medium">Invalid</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isValidDistribution() && (
                            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 inline mr-1" />
                                The sum of term amounts must equal the total fee amount (₹{(mapping.total_fee || 0).toLocaleString()}).
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">
                            {canWrite ? 'Cancel' : 'Close'}
                        </Button>
                    </DialogClose>
                    {canWrite && (
                        <Button
                            onClick={handleSave}
                            disabled={!isValidDistribution() || createTermAmountsMutation.isPending || updateTermAmountsMutation.isPending}
                            className="flex items-center gap-2"
                        >
                            {createTermAmountsMutation.isPending || updateTermAmountsMutation.isPending ? (
                                'Saving...'
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Save Term Amounts
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}