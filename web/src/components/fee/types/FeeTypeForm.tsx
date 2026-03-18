import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
                <Select
                    value={watch('fee_category_id')}
                    onValueChange={(value) => setValue('fee_category_id', value)}
                    disabled={isPending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select fee category" />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.category_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.fee_category_id && (
                    <p className="text-sm text-destructive">{errors.fee_category_id.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="fee_term_id">Fee Term</Label>
                <Select
                    value={watch('fee_term_id')}
                    onValueChange={(value) => setValue('fee_term_id', value)}
                    disabled={isPending}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select fee term" />
                    </SelectTrigger>
                    <SelectContent>
                        {terms.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                No fee terms available
                            </div>
                        ) : (
                            terms.map((term, idx) => {
                                const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                const isUUID = UUID_REGEX.test(term.term_name ?? '');
                                const suffix = term.number_of_terms ? ` (${term.number_of_terms} installment${term.number_of_terms !== 1 ? 's' : ''})` : '';
                                const label = (!term.term_name || isUUID)
                                    ? `Term ${idx + 1}${suffix}`
                                    : `${term.term_name}${suffix}`;
                                return (
                                    <SelectItem key={term.id} value={term.id}>{label}</SelectItem>
                                );
                            })
                        )}
                    </SelectContent>
                </Select>
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