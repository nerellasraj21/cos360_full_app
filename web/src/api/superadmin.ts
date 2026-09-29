import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import type {
    TenantCreate,
    TenantUpdate,
    TenantRead,
    SystemHealth,
    SystemLog,
    PlanCreate,
    PlanUpdate,
    PlanRead,
    TenantsListResponse,
    SystemLogsResponse,
    PlansListResponse,
    SuperAdminError
} from '@/types/superadmin';

// Helper function to handle API errors
const handleApiError = (error: any): Error => {
    if (error.response?.data) {
        const apiError: SuperAdminError = error.response.data;
        return new Error(apiError.detail || 'An error occurred');
    }
    return new Error(error.message || 'Network error');
};

// Tenant Management API
export async function fetchTenants(params?: {
    status?: string;
    limit?: number;
    offset?: number;
}): Promise<TenantsListResponse> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        const url = queryString ? `/super-admin/tenants?${queryString}` : '/super-admin/tenants';

        const { data } = await CAxios.get<TenantsListResponse>(url);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function fetchTenantById(tenantId: string): Promise<TenantRead> {
    try {
        const { data } = await CAxios.get<TenantRead>(`/super-admin/tenants/${tenantId}`);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function createTenant(tenantData: TenantCreate): Promise<TenantRead> {
    try {
        const { data } = await CAxios.post<TenantRead>('/super-admin/tenants', tenantData);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function updateTenant(tenantId: string, tenantData: TenantUpdate): Promise<TenantRead> {
    try {
        const { data } = await CAxios.put<TenantRead>(`/super-admin/tenants/${tenantId}`, tenantData);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function deleteTenant(tenantId: string): Promise<void> {
    try {
        await CAxios.delete(`/super-admin/tenants/${tenantId}`);
    } catch (error) {
        throw handleApiError(error);
    }
}

// System Health API
export async function fetchSystemHealth(): Promise<SystemHealth> {
    try {
        const { data } = await CAxios.get<SystemHealth>('/super-admin/system/health');
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

// System Logs API
export async function fetchSystemLogs(params?: {
    level?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}): Promise<SystemLogsResponse> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.level) queryParams.append('level', params.level);
        if (params?.start_date) queryParams.append('start_date', params.start_date);
        if (params?.end_date) queryParams.append('end_date', params.end_date);
        if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
        if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());

        const queryString = queryParams.toString();
        const url = queryString ? `/super-admin/system/logs?${queryString}` : '/super-admin/system/logs';

        const { data } = await CAxios.get<SystemLogsResponse>(url);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

// Plan Management API
export async function fetchPlans(): Promise<PlansListResponse> {
    try {
        const { data } = await CAxios.get<PlansListResponse>('/super-admin/plans');
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function fetchPlanById(planId: string): Promise<PlanRead> {
    try {
        const { data } = await CAxios.get<PlanRead>(`/super-admin/plans/${planId}`);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function createPlan(planData: PlanCreate): Promise<PlanRead> {
    try {
        const { data } = await CAxios.post<PlanRead>('/super-admin/plans', planData);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function updatePlan(planId: string, planData: PlanUpdate): Promise<PlanRead> {
    try {
        const { data } = await CAxios.put<PlanRead>(`/super-admin/plans/${planId}`, planData);
        return data;
    } catch (error) {
        throw handleApiError(error);
    }
}

export async function deletePlan(planId: string): Promise<void> {
    try {
        await CAxios.delete(`/super-admin/plans/${planId}`);
    } catch (error) {
        throw handleApiError(error);
    }
}

// React Query Hooks

// Tenant hooks
export function useTenants(params?: { status?: string; limit?: number; offset?: number }) {
    return useQuery({
        queryKey: ['superadmin-tenants', params],
        queryFn: () => fetchTenants(params),
    });
}

export function useTenant(tenantId: string) {
    return useQuery({
        queryKey: ['superadmin-tenant', tenantId],
        queryFn: () => fetchTenantById(tenantId),
        enabled: !!tenantId,
    });
}

export function useCreateTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
        },
    });
}

export function useUpdateTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tenantId, tenantData }: { tenantId: string; tenantData: TenantUpdate }) =>
            updateTenant(tenantId, tenantData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
            queryClient.invalidateQueries({ queryKey: ['superadmin-tenant'] });
        },
    });
}

export function useDeleteTenant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
        },
    });
}

// System Health hook
export function useSystemHealth() {
    return useQuery({
        queryKey: ['superadmin-system-health'],
        queryFn: fetchSystemHealth,
        refetchInterval: 30000, // Refetch every 30 seconds
    });
}

// System Logs hook
export function useSystemLogs(params?: {
    level?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
}) {
    return useQuery({
        queryKey: ['superadmin-system-logs', params],
        queryFn: () => fetchSystemLogs(params),
    });
}

// Plan hooks
export function usePlans() {
    return useQuery({
        queryKey: ['superadmin-plans'],
        queryFn: fetchPlans,
    });
}

export function usePlan(planId: string) {
    return useQuery({
        queryKey: ['superadmin-plan', planId],
        queryFn: () => fetchPlanById(planId),
        enabled: !!planId,
    });
}

export function useCreatePlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-plans'] });
        },
    });
}

export function useUpdatePlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ planId, planData }: { planId: string; planData: PlanUpdate }) =>
            updatePlan(planId, planData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-plans'] });
            queryClient.invalidateQueries({ queryKey: ['superadmin-plan'] });
        },
    });
}

export function useDeletePlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePlan,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['superadmin-plans'] });
        },
    });
}