import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import type { OrganizationRead, OrganizationCreate, OrganizationUpdate, Plan } from '@/types/organization';

// Organization CRUD operations
export async function fetchOrganizations(params?: {
    skip?: number;
    limit?: number;
    active_only?: boolean;
}): Promise<OrganizationRead[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.active_only !== undefined) queryParams.append('active_only', params.active_only.toString());

    const { data } = await CAxios.get<OrganizationRead[]>(`/organizations/?${queryParams.toString()}`);
    return data;
}

export async function fetchOrganizationById(id: number): Promise<OrganizationRead> {
    const { data } = await CAxios.get<OrganizationRead>(`/organizations/${id}`);
    return data;
}

export async function createOrganization(data: OrganizationCreate): Promise<OrganizationRead> {
    const { data: response } = await CAxios.post<OrganizationRead>('/organizations/', data);
    return response;
}

export async function updateOrganization(id: number, data: OrganizationUpdate): Promise<OrganizationRead> {
    const { data: response } = await CAxios.put<OrganizationRead>(`/organizations/${id}`, data);
    return response;
}

export async function deactivateOrganization(id: number): Promise<OrganizationRead> {
    const { data } = await CAxios.patch<OrganizationRead>(`/organizations/${id}/deactivate`);
    return data;
}

export async function deleteOrganization(id: number): Promise<void> {
    await CAxios.delete(`/organizations/${id}`);
}

// Organization settings
export async function fetchOrganizationSettings(id: number): Promise<any> {
    const { data } = await CAxios.get(`/organizations/${id}/settings`);
    return data;
}

export async function updateOrganizationSettings(id: number, settings: any): Promise<any> {
    const { data } = await CAxios.put(`/organizations/${id}/settings`, settings);
    return data;
}

// Organization users
export async function fetchOrganizationUsers(id: number, params?: {
    skip?: number;
    limit?: number;
}): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const { data } = await CAxios.get(`/organizations/${id}/users?${queryParams.toString()}`);
    return data;
}

export async function addOrganizationUser(id: number, userData: any): Promise<any> {
    const { data } = await CAxios.post(`/organizations/${id}/users`, userData);
    return data;
}

export async function removeOrganizationUser(id: number, userId: number): Promise<void> {
    await CAxios.delete(`/organizations/${id}/users/${userId}`);
}

// Organization plans
export async function fetchOrganizationPlans(): Promise<Plan[]> {
    const { data } = await CAxios.get<Plan[]>('/organizations/plans');
    return data;
}

export async function fetchOrganizationPlan(id: number): Promise<Plan> {
    const { data } = await CAxios.get<Plan>(`/organizations/${id}/plan`);
    return data;
}

export async function updateOrganizationPlan(id: number, planId: number): Promise<OrganizationRead> {
    const { data } = await CAxios.put<OrganizationRead>(`/organizations/${id}/plan`, { plan_id: planId });
    return data;
}

// Super Admin endpoints
export async function fetchAllOrganizationsForSuperAdmin(params?: {
    skip?: number;
    limit?: number;
}): Promise<OrganizationRead[]> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

    const { data } = await CAxios.get<OrganizationRead[]>(`/super-admin/organizations?${queryParams.toString()}`);
    return data;
}

export async function createOrganizationForSuperAdmin(data: OrganizationCreate): Promise<OrganizationRead> {
    const { data: response } = await CAxios.post<OrganizationRead>('/super-admin/organizations', data);
    return response;
}

export async function updateOrganizationForSuperAdmin(id: number, data: OrganizationUpdate): Promise<OrganizationRead> {
    const { data: response } = await CAxios.put<OrganizationRead>(`/super-admin/organizations/${id}`, data);
    return response;
}

export async function deleteOrganizationForSuperAdmin(id: number): Promise<void> {
    await CAxios.delete(`/super-admin/organizations/${id}`);
}

// System settings (Super Admin)
export async function fetchSystemSettings(): Promise<any> {
    const { data } = await CAxios.get('/super-admin/system-settings');
    return data;
}

export async function updateSystemSettings(settings: any): Promise<any> {
    const { data } = await CAxios.put('/super-admin/system-settings', settings);
    return data;
}

// Legacy API for backward compatibility
export const organizationsApi = {
    getAllOrganizations: fetchOrganizations,
    getOrganization: fetchOrganizationById,
    createOrganization: (data: OrganizationCreate) => createOrganization(data),
    updateOrganization: (id: number, data: OrganizationUpdate) => updateOrganization(id, data),
    deactivateOrganization: (id: number) => deactivateOrganization(id),
    deleteOrganization: (id: number) => deleteOrganization(id),
    getOrganizationsPaginated: async (
        page: number,
        pageSize: number,
        activeOnly?: boolean
    ): Promise<{ total: number; data: OrganizationRead[]; hasMore: boolean }> => {
        const skip = page * pageSize;
        const data = await fetchOrganizations({ skip, limit: pageSize, active_only: activeOnly });

        return {
            total: data.length,
            data: data,
            hasMore: data.length === pageSize,
        };
    },
};

// React Query hooks for Organizations
export function useOrganizations(params?: { skip?: number; limit?: number; active_only?: boolean }) {
    return useQuery({
        queryKey: ['organizations', params],
        queryFn: () => fetchOrganizations(params),
    });
}

export function useOrganization(id: number) {
    return useQuery({
        queryKey: ['organization', id],
        queryFn: () => fetchOrganizationById(id),
        enabled: !!id,
    });
}

export function useCreateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createOrganization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

export function useUpdateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: OrganizationUpdate }) => updateOrganization(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

export function useDeleteOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteOrganization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

export function useDeactivateOrganization() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deactivateOrganization,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
        },
    });
}

// React Query hooks for Organization Plans
export function useOrganizationPlans() {
    return useQuery({
        queryKey: ['organization-plans'],
        queryFn: fetchOrganizationPlans,
    });
}

export function useOrganizationPlan(id: number) {
    return useQuery({
        queryKey: ['organization-plan', id],
        queryFn: () => fetchOrganizationPlan(id),
        enabled: !!id,
    });
}

export function useUpdateOrganizationPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, planId }: { id: number; planId: number }) => updateOrganizationPlan(id, planId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['organizations'] });
            queryClient.invalidateQueries({ queryKey: ['organization-plan'] });
        },
    });
}

// React Query hooks for Super Admin
export function useAllOrganizationsForSuperAdmin(params?: { skip?: number; limit?: number }) {
    return useQuery({
        queryKey: ['super-admin-organizations', params],
        queryFn: () => fetchAllOrganizationsForSuperAdmin(params),
    });
}

export function useCreateOrganizationForSuperAdmin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createOrganizationForSuperAdmin,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
        },
    });
}

export function useUpdateOrganizationForSuperAdmin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: number; input: OrganizationUpdate }) => updateOrganizationForSuperAdmin(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
        },
    });
}

export function useDeleteOrganizationForSuperAdmin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteOrganizationForSuperAdmin,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
        },
    });
}

// Export individual functions for backward compatibility
export const {
    getAllOrganizations,
    getOrganization,
    createOrganization: legacyCreateOrganization,
    updateOrganization: legacyUpdateOrganization,
    deactivateOrganization: legacyDeactivateOrganization,
    deleteOrganization: legacyDeleteOrganization,
    getOrganizationsPaginated,
} = organizationsApi;