import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { OrganizationRead, OrganizationCreate, OrganizationUpdate } from '@/types/organization';
import {
    getAllOrganizations,
    getOrganization,
    createOrganization,
    updateOrganization,
    deactivateOrganization,
    deleteOrganization,
    getOrganizationsPaginated,
} from '@/api/organizations';

// Get all organizations
export function useOrganizations(params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
}) {
    return useQuery<OrganizationRead[]>({
        queryKey: ['organizations', params],
        queryFn: () => getAllOrganizations(params),
    });
}

// Get single organization by ID
export function useOrganization(id: number) {
    return useQuery<OrganizationRead>({
        queryKey: ['organization', id],
        queryFn: () => getOrganization(id),
        enabled: !!id,
    });
}

// Create organization mutation
export function useCreateOrganization() {
    const queryClient = useQueryClient();

    return useMutation<OrganizationRead, Error, OrganizationCreate>({
        mutationFn: createOrganization,
        onSuccess: (data) => {
            toast.success('Organization created successfully!');
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.setQueryData(['organization', data.id], data);
        },
        onError: (error) => {
            toast.error(`Failed to create organization: ${error.message}`);
        },
    });
}

// Update organization mutation
export function useUpdateOrganization() {
    const queryClient = useQueryClient();

    return useMutation<OrganizationRead, Error, { id: number; data: OrganizationUpdate }>({
        mutationFn: ({ id, data }) => updateOrganization(id, data),
        onSuccess: (data) => {
            toast.success('Organization updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.setQueryData(['organization', data.id], data);
        },
        onError: (error) => {
            toast.error(`Failed to update organization: ${error.message}`);
        },
    });
}

// Deactivate organization mutation
export function useDeactivateOrganization() {
    const queryClient = useQueryClient();

    return useMutation<OrganizationRead, Error, number>({
        mutationFn: deactivateOrganization,
        onSuccess: (data) => {
            toast.success('Organization deactivated successfully!');
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.setQueryData(['organization', data.id], data);
        },
        onError: (error) => {
            toast.error(`Failed to deactivate organization: ${error.message}`);
        },
    });
}

// Delete organization mutation
export function useDeleteOrganization() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
        mutationFn: deleteOrganization,
        onSuccess: (_, id) => {
            toast.success('Organization deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.removeQueries({ queryKey: ['organization', id] });
        },
        onError: (error) => {
            toast.error(`Failed to delete organization: ${error.message}`);
        },
    });
}

// Paginated organizations with infinite query
export function usePaginatedOrganizations(
    queryKey = ['organizations'],
    PAGE_SIZE = 10,
    activeOnly?: boolean
) {
    return useInfiniteQuery<
        { data: OrganizationRead[]; hasMore: boolean; total: number },
        Error
    >({
        queryKey: [...queryKey, 'paginated', activeOnly],
        queryFn: async (context) => {
            const pageParam = (context.pageParam ?? 0) as number;
            return getOrganizationsPaginated(pageParam, PAGE_SIZE, activeOnly);
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) =>
            lastPage.hasMore ? allPages.length : undefined,
    });
}

// Standard paginated organizations
export function useOrganizationsPaginated(
    page: number,
    pageSize: number,
    activeOnly?: boolean
) {
    return useQuery<
        { total: number; data: OrganizationRead[]; hasMore: boolean },
        Error
    >({
        queryKey: ['organizations', 'paginated', page, pageSize, activeOnly],
        queryFn: () => getOrganizationsPaginated(page, pageSize, activeOnly),
    });
}

// Bulk operations (if needed in the future)
export function useBulkUpdateOrganizations() {
    const queryClient = useQueryClient();

    return useMutation<OrganizationRead[], Error, { ids: number[]; data: Partial<OrganizationUpdate> }>({
        mutationFn: async ({ ids, data }) => {
            // This would need to be implemented in the API
            const promises = ids.map(id => updateOrganization(id, { ...data, id }));
            return Promise.all(promises);
        },
        onSuccess: () => {
            toast.success('Organizations updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
        onError: (error) => {
            toast.error(`Failed to update organizations: ${error.message}`);
        },
    });
}