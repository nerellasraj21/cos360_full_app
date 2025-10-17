import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { feeCategoriesApi, feeTypesApi, feeMappingsApi, bulkCreateStudentMappings } from '@/api/fee';
import { feeCategoryKeys } from './useFeeCategories';
import { feeTypeKeys } from './useFeeTypes';
import { feeMappingKeys } from './useFeeMappings';

export interface BulkDeleteRequest {
    type: 'categories' | 'types' | 'mappings';
    ids: string[];
}

export interface BulkStatusChangeRequest {
    type: 'categories' | 'types' | 'mappings';
    ids: string[];
    is_active: boolean;
}

export interface BulkOperationResult {
    success: number;
    failed: number;
    errors: string[];
}

// Bulk delete operations
export function useBulkDelete() {
    const queryClient = useQueryClient();

    return useMutation<BulkOperationResult, Error, BulkDeleteRequest>({
        mutationFn: async ({ type, ids }) => {
            const results: BulkOperationResult = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (const id of ids) {
                try {
                    switch (type) {
                        case 'categories':
                            await feeCategoriesApi.deleteCategory(parseInt(id));
                            break;
                        case 'types':
                            await feeTypesApi.deleteType(id);
                            break;
                        case 'mappings':
                            await feeMappingsApi.deleteMapping(parseInt(id));
                            break;
                    }
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Failed to delete ${type.slice(0, -1)} ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return results;
        },
        onSuccess: (results, { type }) => {
            // Invalidate appropriate queries based on type
            switch (type) {
                case 'categories':
                    queryClient.invalidateQueries({ queryKey: feeCategoryKeys.lists() });
                    break;
                case 'types':
                    queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });
                    queryClient.invalidateQueries({ queryKey: feeCategoryKeys.all }); // Categories might show type counts
                    break;
                case 'mappings':
                    queryClient.invalidateQueries({ queryKey: feeMappingKeys.lists() });
                    break;
            }

            if (results.success > 0) {
                toast.success(`Successfully deleted ${results.success} ${type}`);
            }
            if (results.failed > 0) {
                toast.error(`Failed to delete ${results.failed} ${type}. Check console for details.`);
                console.error('Bulk delete errors:', results.errors);
            }
        },
        onError: (error) => {
            toast.error(`Bulk delete operation failed: ${error.message}`);
        },
    });
}

// Bulk status change operations (for activate/deactivate)
export function useBulkStatusChange() {
    const queryClient = useQueryClient();

    return useMutation<BulkOperationResult, Error, BulkStatusChangeRequest>({
        mutationFn: async ({ type, ids, is_active }) => {
            const results: BulkOperationResult = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (const id of ids) {
                try {
                    switch (type) {
                        case 'categories':
                            await feeCategoriesApi.updateCategory(parseInt(id), { is_active });
                            break;
                        case 'types':
                            await feeTypesApi.updateType(id, { fee_status: is_active });
                            break;
                        case 'mappings':
                            await feeMappingsApi.updateMapping(parseInt(id), { is_active });
                            break;
                    }
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Failed to update ${type.slice(0, -1)} ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return results;
        },
        onSuccess: (results, { type, is_active }) => {
            // Invalidate appropriate queries based on type
            switch (type) {
                case 'categories':
                    queryClient.invalidateQueries({ queryKey: feeCategoryKeys.lists() });
                    break;
                case 'types':
                    queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });
                    queryClient.invalidateQueries({ queryKey: feeCategoryKeys.all });
                    break;
                case 'mappings':
                    queryClient.invalidateQueries({ queryKey: feeMappingKeys.lists() });
                    break;
            }

            const action = is_active ? 'activated' : 'deactivated';
            if (results.success > 0) {
                toast.success(`Successfully ${action} ${results.success} ${type}`);
            }
            if (results.failed > 0) {
                toast.error(`Failed to ${action.slice(0, -1)} ${results.failed} ${type}. Check console for details.`);
                console.error('Bulk status change errors:', results.errors);
            }
        },
        onError: (error) => {
            toast.error(`Bulk status change operation failed: ${error.message}`);
        },
    });
}

// Bulk student mappings operation
export function useBulkCreateStudentMappings() {
    const queryClient = useQueryClient();

    return useMutation<{
        success: boolean;
        created_count: number;
        total_term_amounts: number;
        message: string;
        created_mappings: any[];
    }, Error, {
        fee_type_id: string;
        student_id: string;
        academic_year_id: string;
        mappings: {
            term_amounts: {
                fee_term_date_id: string;
                amount: number;
            }[];
        }[];
    }>({
        mutationFn: bulkCreateStudentMappings,
        onSuccess: (data) => {
            // Invalidate fee mappings queries
            queryClient.invalidateQueries({ queryKey: ['fee-mappings'] });

            toast.success(data.message || 'Student fee mappings created successfully');
        },
        onError: (error) => {
            toast.error(`Failed to create student fee mappings: ${error.message}`);
        },
    });
}

// Academic year transfer operation (for copying fee structures to new academic year)
export interface AcademicYearTransferRequest {
    type: 'categories' | 'types' | 'mappings';
    ids: string[];
    target_academic_year_id: string;
}

export function useAcademicYearTransfer() {
    const queryClient = useQueryClient();

    return useMutation<BulkOperationResult, Error, AcademicYearTransferRequest>({
        mutationFn: async ({ type, ids, target_academic_year_id }) => {
            const results: BulkOperationResult = {
                success: 0,
                failed: 0,
                errors: []
            };

            // This would need to be implemented based on the actual API endpoints
            // For now, this is a placeholder implementation
            for (const id of ids) {
                try {
                    switch (type) {
                        case 'categories':
                            // Get the original category and create a copy with new academic year
                            const category = await feeCategoriesApi.getCategory(parseInt(id));
                            await feeCategoriesApi.createCategory({
                                category_name: category.category_name,
                                academic_year_id: target_academic_year_id,
                            });
                            break;
                        case 'types':
                            // Similar logic for types
                            const feeType = await feeTypesApi.getType(id);
                            await feeTypesApi.createType({
                                type_name: feeType.type_name,
                                fee_category_id: feeType.fee_category_id,
                                fee_term_id: feeType.fee_term_id,
                                is_mandatory: feeType.is_mandatory,
                                fee_status: feeType.fee_status,
                                academic_year_id: target_academic_year_id,
                            });
                            break;
                        case 'mappings':
                            // Similar logic for mappings
                            const mapping = await feeMappingsApi.getMapping(parseInt(id));
                            await feeMappingsApi.createMapping({
                                fee_type_id: mapping.fee_type_id,
                                class_id: mapping.class_id,
                                total_amount: mapping.total_amount,
                                academic_year_id: target_academic_year_id,
                                is_active: mapping.is_active,
                            });
                            break;
                    }
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push(`Failed to transfer ${type.slice(0, -1)} ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }

            return results;
        },
        onSuccess: (results, { type }) => {
            // Invalidate all queries to refresh data
            queryClient.invalidateQueries({ queryKey: feeCategoryKeys.lists() });
            queryClient.invalidateQueries({ queryKey: feeTypeKeys.lists() });
            queryClient.invalidateQueries({ queryKey: feeMappingKeys.lists() });

            if (results.success > 0) {
                toast.success(`Successfully transferred ${results.success} ${type} to new academic year`);
            }
            if (results.failed > 0) {
                toast.error(`Failed to transfer ${results.failed} ${type}. Check console for details.`);
                console.error('Academic year transfer errors:', results.errors);
            }
        },
        onError: (error) => {
            toast.error(`Academic year transfer failed: ${error.message}`);
        },
    });
}