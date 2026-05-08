import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import ReactSelect from 'react-select';
import { useSelectStyles } from '@/lib/useSelectStyles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCreateFeeType, useUpdateFeeType } from '@/hooks/fee/useFeeTypes';
import { useFeeCategories } from '@/hooks/fee/useFeeCategories';
import { useFeeTerms } from '@/hooks/fee/useFeeTerms';
import { useAcademicYearStore } from '@/lib/academicYearStore';
import type { FeeType } from '@/types/fee';

const feeTypeSchema = z.object({
    type_name: z.string().min(1, 'Type name is required').max(100, 'Type name must be less than 100 characters'),
    fee_category_id: z.string().min(1, 'Fee category is required'),
    fee_term_id: z.string().min(1, 'Fee term is required'),
    fee_status: z.enum(['active', 'inactive']),
});

type FeeTypeFormData = z.infer<typeof feeTypeSchema>;

interface FeeTypeFormProps {
    type?: FeeType | null;
    onSuccess: () => void;
    onCancel: () => void;
}

export function FeeTypeForm({ type, onSuccess, onCancel }: FeeTypeFormProps) {
    const { selectedAcademicYearId } = useAcademicYearStore();
    const [error, setError] = useState<string | null>(null);
    const selectStyles = useSelectStyles();

    const createMutation = useCreateFeeType();
    const updateMutation = useUpdateFeeType();

    const { data: categoriesResponse } = useFeeCategories({
        academic_year_id: selectedAcademicYearId,
    });

    const categories = categoriesResponse?.items || [];

    const { data: terms = [], isLoading: termsLoading } = useFeeTerms({
        academic_year_id: selectedAcademicYearId,
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
        reset,
    } = useForm<FeeTypeFormData>({
        resolver: zodResolver(feeTypeSchema),
        defaultValues: {
            type_name: '',
            fee_category_id: '',
            fee_term_id: '',
            fee_status: 'active',
        },
    });

    const feeStatus = watch('fee_status');

    // Populate form when editing
    useEffect(() => {
        if (type) {
            reset({
                type_name: type.type_name,
                fee_category_id: type.fee_category_id,
                fee_term_id: type.fee_term_id,
                fee_status: type.fee_status as 'active' | 'inactive',
            });
        } else {
            reset({
                type_name: '',
                fee_category_id: '',
                fee_term_id: '',
                fee_status: 'active',
            });
        }
    }, [type, reset]);

    const onSubmit = async (data: FeeTypeFormData) => {
        setError(null);

        try {
            if (type) {
                // Update existing type
                await updateMutation.mutateAsync({
                    id: type.id,
                    data: {
                        type_name: data.type_name,
                        fee_category_id: data.fee_category_id,
                        fee_term_id: data.fee_term_id,
                        fee_status: data.fee_status,
                    },
                });
            } else {
                // Create new type
                await createMutation.mutateAsync({
                    type_name: data.type_name,
                    fee_category_id: data.fee_category_id,
                    fee_term_id: data.fee_term_id,
                    fee_status: data.fee_status,
                    academic_year_id: selectedAcademicYearId,
                });
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <Alert>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-2">
                <Label htmlFor="type_name">Type Name</Label>
                <Input
                    id="type_name"
                    {...register('type_name')}
                    placeholder="e.g., Tuition Fee, Transport Fee"
                    disabled={isPending}
                />
                {errors.type_name && (
                    <p className="text-sm text-destructive">{errors.type_name.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="fee_category_id">Fee Category</Label>
                <ReactSelect
                    options={categories.map(c => ({ value: c.id, label: c.category_name }))}
                    value={watch('fee_category_id') ? { value: watch('fee_category_id'), label: categories.find(c => c.id === watch('fee_category_id'))?.category_name ?? '' } : null}
                    onChange={opt => setValue('fee_category_id', opt?.value ?? '')}
                    placeholder="Select fee category"
                    isClearable
                    isDisabled={isPending}
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={selectStyles}
                />
                {errors.fee_category_id && (
                    <p className="text-sm text-destructive">{errors.fee_category_id.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="fee_term_id">Fee Term</Label>
                <ReactSelect
                    options={terms.map((term, idx) => {
                        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        const isUUID = UUID_REGEX.test(term.term_name ?? '');
                        const suffix = term.number_of_terms ? ` (${term.number_of_terms} installment${term.number_of_terms !== 1 ? 's' : ''})` : '';
                        const label = (!term.term_name || isUUID) ? `Term ${idx + 1}${suffix}` : `${term.term_name}${suffix}`;
                        return { value: term.id, label };
                    })}
                    value={(() => {
                        const id = watch('fee_term_id');
                        if (!id) return null;
                        const idx = terms.findIndex(t => t.id === id);
                        if (idx === -1) return null;
                        const term = terms[idx];
                        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        const isUUID = UUID_REGEX.test(term.term_name ?? '');
                        const suffix = term.number_of_terms ? ` (${term.number_of_terms} installment${term.number_of_terms !== 1 ? 's' : ''})` : '';
                        const label = (!term.term_name || isUUID) ? `Term ${idx + 1}${suffix}` : `${term.term_name}${suffix}`;
                        return { value: id, label };
                    })()}
                    onChange={opt => setValue('fee_term_id', opt?.value ?? '')}
                    placeholder="Select fee term"
                    isClearable
                    isDisabled={isPending || termsLoading}
                    noOptionsMessage={() => termsLoading ? 'Loading...' : 'No fee terms available'}
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
                    styles={selectStyles}
                />
                {errors.fee_term_id && (
                    <p className="text-sm text-destructive">{errors.fee_term_id.message}</p>
                )}
            </div>

            <div className="flex items-center space-x-2">
                <Switch
                    id="fee_status"
                    checked={feeStatus === 'active'}
                    onCheckedChange={(checked) => setValue('fee_status', checked ? 'active' : 'inactive')}
                    disabled={isPending}
                />
                <Label htmlFor="fee_status">Active</Label>
            </div>

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
                    {isPending ? 'Saving...' : type ? 'Update Type' : 'Create Type'}
                </Button>
            </div>
        </form>
    );
}