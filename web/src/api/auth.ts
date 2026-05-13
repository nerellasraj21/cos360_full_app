import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import CAxios from './index';
import { useAuthStore } from '../lib/authStore';
import { useAcademicYearStore } from '../lib/academicYearStore';
import { updateAcademicYear } from '@/api/masters/academicyears';
import type { Student } from '@/types/auth';

// Types for API responses
export interface AcademicYear {
  id: string;
  title: string;
  is_active: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
  client_name?: string;
  academic_year_id?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    is_active: boolean;
    role?: {
      id: string;
      name: string;
      description: string | null;
    };
    parent_profile?: any;
  };
  role: {
    id: string;
    name: string;
    description: string | null;
  };
  menu: Array<{
    id: string;
    name: string;
    path: string | null;
    icon: string;
    order: number;
    children: any[];
  }>;
  entity_id?: string;
  permissions?: Record<string, string[]>;
  academic_year_id?: string;
  academic_year_title?: string;
}

export interface PasswordChangeRequiredResponse {
  requires_password_change: true;
  change_password_token: string;
  message: string;
  academic_year_id?: string;
  academic_year_title?: string;
}

export type LoginApiResponse = LoginResponse | PasswordChangeRequiredResponse;

export interface SetPasswordRequest {
  change_password_token: string;
  new_password: string;
  confirm_password: string;
}

export interface ParentChildItem {
  id?: string;
  student_id?: string;
  name?: string;         // combined field returned by /my-children
  first_name?: string;
  last_name?: string;
  admission_number?: string;
  class_name?: string;
  section_name?: string;
}

export async function fetchParentChildren(parentEntityId: string): Promise<Student[]> {
  const { data } = await CAxios.get<ParentChildItem[] | { data: ParentChildItem[] }>(
    `/student-parent-links/parent/${parentEntityId}/students`
  );
  const items: ParentChildItem[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
  return items.map(item => ({
    id: item.id || item.student_id || '',
    name: `${item.first_name} ${item.last_name}`.trim(),
    first_name: item.first_name,
    last_name: item.last_name,
    admission_number: item.admission_number || '',
    class_id: '',
    class_name: item.class_name || '',
    academic_year: '',
    academic_year_id: '',
    is_active: true,
  }));
}

// Parent children hook — fetches directly so ParentView doesn't rely on login-time timing
export function useParentChildren(parentEntityId: string | null) {
  return useQuery<Student[]>({
    queryKey: ['parent-children', parentEntityId],
    queryFn: () => fetchParentChildren(parentEntityId!),
    enabled: !!parentEntityId,
    staleTime: 5 * 60 * 1000,
  });
}

// Correct endpoint: token-scoped, no entity ID required in URL
async function fetchMyChildren(): Promise<Student[]> {
  const { data } = await CAxios.get<ParentChildItem[] | { data: ParentChildItem[] }>(
    '/student-parent-links/my-children'
  );
  const items: ParentChildItem[] = Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
  return items.map(item => {
    const fullName = item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim();
    const firstName = item.first_name || fullName.split(' ')[0] || '';
    const lastName = item.last_name || fullName.split(' ').slice(1).join(' ') || '';
    return {
      id: item.id || item.student_id || '',
      name: fullName,
      first_name: firstName,
      last_name: lastName,
      admission_number: item.admission_number || '',
      class_id: '',
      class_name: item.class_name || '',
      section_name: item.section_name || '',
      academic_year: '',
      academic_year_id: '',
      is_active: true,
    };
  });
}

export function useMyChildren() {
  return useQuery<Student[]>({
    queryKey: ['my-children'],
    queryFn: fetchMyChildren,
    staleTime: 5 * 60 * 1000,
  });
}

// Academic years (public endpoint — no auth required)
// Response: [{ id, title, is_active }]
export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  const { data } = await CAxios.get<AcademicYear[]>('/auth/academic-years');
  return Array.isArray(data) ? data : [];
}

export function useAcademicYears() {
  return useQuery<AcademicYear[]>({
    queryKey: ['academic-years-login'],
    queryFn: fetchAcademicYears,
    staleTime: 5 * 60 * 1000,
  });
}

// Role types - Updated to match API guide
export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  permission_count?: number;
  user_count?: number;
  is_system_role?: boolean;
  is_custom_role?: boolean;
}

export interface RoleCreateRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

// Resource Permission types - Updated to match API guide
export interface ResourcePermission {
  id: string;
  role_id: string;
  role_name?: string;
  resource: string;
  action: string;
  is_granted: boolean;
  created_at: string;
  updated_at: string;
  role_description?: string;
  total_count:number;
}

export interface ResourcePermissionCreateRequest {
  role_id: string;
  resource: string;
  action: string;
  is_granted?: boolean;
}

export interface ResourcePermissionUpdateRequest {
  role_id?: string;
  resource?: string;
  action?: string;
  is_granted?: boolean;
}

export interface BulkPermissionRequest {
  role_id: string;
  permissions: Array<{
    resource: string;
    action: string;
    is_granted?: boolean;
  }>;
}

export interface PermissionMatrix {
  roles: Array<{
    id: string;
    name: string;
    permissions: Record<string, Record<string, boolean>>;
  }>;
  resources: string[];
  actions: string[];
}

// Menu types
export interface Menu {
  id: string;
  name: string;
  path: string | null;
  icon: string;
  order: number;
  parent_id: string | null;
  is_active: boolean;
  children: Menu[];
}

export interface MenuCreateRequest {
  name: string;
  path?: string;
  icon?: string;
  order?: number;
  parent_id?: string;
  is_active?: boolean;
}

// Permission types
export interface Permission {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionCreateRequest {
  name: string;
  description?: string;
  resource: string;
  action: string;
  is_active?: boolean;
}

// Enhanced login mutation hook with student fetching
export function useLoginMutation() {
  const login = useAuthStore((s) => s.login);
  const setAvailableStudents = useAuthStore((s) => s.setAvailableStudents);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<LoginApiResponse> => {
      try {
        const { data } = await CAxios.post<LoginApiResponse>('/auth/login', credentials);
        return data;
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail ||
                           error.response?.data?.message ||
                           error.message ||
                           'Login failed. Please check your credentials and try again.';
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (data) => {
      // If password change is required, skip login — handled by the component
      if ('requires_password_change' in data && data.requires_password_change) {
        // Store academic year so set-password page can use it if needed
        if (data.academic_year_id) {
          sessionStorage.setItem('change_password_academic_year_id', data.academic_year_id);
        }
        if (data.academic_year_title) {
          sessionStorage.setItem('change_password_academic_year_title', data.academic_year_title);
        }
        return;
      }

      const loginData = data as LoginResponse;
      login(loginData);

      // Seed academicYearStore with the year the user selected at login,
      // so fetchAndSetAcademicYears() won't override it with the active year.
      if (loginData.academic_year_id) {
        useAcademicYearStore.getState().setSelectedAcademicYearId(loginData.academic_year_id);
      }

      // For admin: activate the selected academic year on the backend
      // (backend auto-deactivates all other years when is_active=true is set)
      if (loginData.academic_year_id && loginData.role.name.toLowerCase() === 'admin') {
        try {
          await updateAcademicYear(loginData.academic_year_id, { is_active: true });
          queryClient.invalidateQueries({ queryKey: ['academicYearsDropdown'] });
          queryClient.invalidateQueries({ queryKey: ['academic-years-login'] });
        } catch (error) {
          // Non-critical — don't block login if activation fails
          console.error('Failed to activate academic year:', error);
        }
      }

      if (loginData.role.name.toLowerCase() === 'parent' && loginData.entity_id) {
        try {
          const children = await fetchParentChildren(loginData.entity_id);
          setAvailableStudents(children);
        } catch (error) {
          console.error('Failed to fetch parent children:', error);
        }
      }

      queryClient.clear();
    },
    onError: (error: any) => {
      console.error('Login error:', error);
    },
  });
}

// Set password mutation hook (first-time login for Staff/Teacher)
export function useSetPasswordMutation() {
  const login = useAuthStore((s) => s.login);
  const setAvailableStudents = useAuthStore((s) => s.setAvailableStudents);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SetPasswordRequest): Promise<LoginResponse> => {
      try {
        const { data } = await CAxios.post<LoginResponse>('/auth/staff/set-password', payload);
        return data;
      } catch (error: any) {
        const errorMessage = error.response?.data?.detail ||
                           error.response?.data?.message ||
                           error.message ||
                           'Failed to set password. Please try again.';
        throw new Error(errorMessage);
      }
    },
    onSuccess: async (data) => {
      login(data);

      // Seed academicYearStore with the year carried from the login step
      if (data.academic_year_id) {
        useAcademicYearStore.getState().setSelectedAcademicYearId(data.academic_year_id);
      }

      if (data.role.name.toLowerCase() === 'parent' && data.entity_id) {
        try {
          const children = await fetchParentChildren(data.entity_id);
          setAvailableStudents(children);
        } catch (error) {
          console.error('Failed to fetch parent children:', error);
        }
      }

      queryClient.clear();
      sessionStorage.removeItem('change_password_token');
      sessionStorage.removeItem('change_password_academic_year_id');
      sessionStorage.removeItem('change_password_academic_year_title');
    },
    onError: (error: any) => {
      console.error('Set password error:', error);
    },
  });
}

// Logout mutation hook
export function useLogoutMutation() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await CAxios.post('/auth/logout');
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
    onError: (error: any) => {
      console.error('Logout error:', error);
      // Even if logout fails on server, clear local state
      logout();
      queryClient.clear();
    },
  });
}

// User Menu Query
export async function fetchUserMenu(): Promise<Menu[]> {
  const { data } = await CAxios.get<Menu[]>('/auth/user-menu');
  return data;
}

export function useUserMenu() {
  return useQuery({
    queryKey: ['user-menu'],
    queryFn: fetchUserMenu,
  });
}

// Menus API
export async function fetchMenus(): Promise<Menu[]> {
  const { data } = await CAxios.get<Menu[]>('/auth/menus/');
  return data;
}

export async function createMenu(menuData: MenuCreateRequest): Promise<Menu> {
  const { data } = await CAxios.post<Menu>('/auth/menus/', menuData);
  return data;
}

export function useMenus() {
  return useQuery({
    queryKey: ['menus'],
    queryFn: fetchMenus,
  });
}

export function useCreateMenu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMenu,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });
}

// Permissions API
export async function fetchPermissions(): Promise<Permission[]> {
  const { data } = await CAxios.get<Permission[]>('/auth/permissions/');
  return data;
}

export async function createPermission(permissionData: PermissionCreateRequest): Promise<Permission> {
  const { data } = await CAxios.post<Permission>('/auth/permissions/', permissionData);
  return data;
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: fetchPermissions,
  });
}

export function useCreatePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}

// Resource Permissions API - Updated to match API guide
export async function fetchResourcePermissionsPaginated(skip: number = 0, limit: number = 50): Promise<{ items: ResourcePermission[]; total_count: number; skip: number; limit: number; has_next?: boolean }> {
  const { data } = await CAxios.get('/auth/resource-permissions/', {
    params: { skip, limit }
  });
  return data.data || data;
}

export async function createResourcePermission(permissionData: ResourcePermissionCreateRequest): Promise<ResourcePermission> {
  const { data } = await CAxios.post<ResourcePermission>('/auth/resource-permissions/', permissionData);
  return data;
}

export async function getResourcePermissionById(id: string): Promise<ResourcePermission> {
  const { data } = await CAxios.get<ResourcePermission>(`/auth/resource-permissions/${id}`);
  return data;
}

export async function updateResourcePermission(id: string, permissionData: ResourcePermissionUpdateRequest): Promise<ResourcePermission> {
  const { data } = await CAxios.put<ResourcePermission>(`/auth/resource-permissions/${id}`, permissionData);
  return data;
}

export async function deleteResourcePermission(id: string): Promise<void> {
  await CAxios.delete(`/auth/resource-permissions/${id}`);
}

export async function getPermissionsByRole(roleId: string): Promise<ResourcePermission[]> {
  const { data } = await CAxios.get<ResourcePermission[]>(`/auth/resource-permissions/role/${roleId}`);
  return data;
}

export async function getPermissionsByResource(resource: string): Promise<ResourcePermission[]> {
  const { data } = await CAxios.get<ResourcePermission[]>(`/auth/resource-permissions/resource/${resource}`);
  return data;
}

export async function bulkCreatePermissions(bulkData: BulkPermissionRequest): Promise<ResourcePermission[]> {
  const { data } = await CAxios.post<ResourcePermission[]>('/auth/resource-permissions/bulk', bulkData);
  return data;
}

export async function getRolePermissionSummary(roleId: string): Promise<any> {
  const { data } = await CAxios.get(`/auth/resource-permissions/role/${roleId}/summary`);
  return data;
}

export async function getPermissionMatrix(): Promise<PermissionMatrix> {
  const { data } = await CAxios.get('/auth/resource-permissions/matrix/all');
  return data.data || data;
}

export async function deleteAllPermissionsForRole(roleId: string): Promise<{ message: string }> {
  const { data } = await CAxios.delete(`/auth/resource-permissions/role/${roleId}/all`);
  return data;
}

export async function deleteAllPermissionsForResource(resource: string): Promise<{ message: string }> {
  const { data } = await CAxios.delete(`/auth/resource-permissions/resource/${resource}/all`);
  return data;
}

export async function getAvailableResources(): Promise<{ resource: string; display_name: string }[]> {
  const { data } = await CAxios.get('/auth/resource-permissions/dropdown/resources');
  return data.data || data;
}

export async function getAvailableActions(): Promise<{ action: string; display_name: string }[]> {
  const { data } = await CAxios.get('/auth/resource-permissions/dropdown/actions');
  return data.data || data;
}

export async function checkPermissionExists(roleId: string, resource: string, action: string): Promise<{ permission_granted: boolean }> {
  const { data } = await CAxios.get<{ permission_granted: boolean }>(`/auth/resource-permissions/check/${roleId}/${resource}/${action}`);
  return data;
}

// Legacy function for backward compatibility
export async function fetchResourcePermissions(): Promise<ResourcePermission[]> {
  const response = await fetchResourcePermissionsPaginated();
  const permissions = response.items;

  // Fetch roles to map role_id to role_name
  const roles = await fetchRoles();
  const roleMap = new Map(roles.map(r => [r.id, r.name]));

  // Add role_name to permissions
  return permissions.map(p => ({
    ...p,
    role_name: roleMap.get(p.role_id) || p.role_id
  }));
}

export async function fetchPermissionMatrix(): Promise<PermissionMatrix> {
  return getPermissionMatrix();
}

export async function fetchAvailableResources(): Promise<string[]> {
  const resources = await getAvailableResources();
  return resources.map(r => r.resource);
}

export async function fetchAvailableActions(): Promise<string[]> {
  const actions = await getAvailableActions();
  return actions.map(a => a.action);
}

export function useResourcePermissions() {
  return useQuery({
    queryKey: ['resource-permissions'],
    queryFn: fetchResourcePermissions,
  });
}

export function useCreateResourcePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createResourcePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

export function useUpdateResourcePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResourcePermissionUpdateRequest }) => updateResourcePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

export function useDeleteResourcePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteResourcePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

export function useBulkCreatePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkCreatePermissions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

export function usePermissionMatrix() {
  return useQuery({
    queryKey: ['permission-matrix'],
    queryFn: fetchPermissionMatrix,
  });
}

export function useAvailableResources() {
  return useQuery({
    queryKey: ['available-resources'],
    queryFn: fetchAvailableResources,
  });
}

export function useAvailableActions() {
  return useQuery({
    queryKey: ['available-actions'],
    queryFn: fetchAvailableActions,
  });
}

// Roles API - Updated to match API guide
export async function fetchRoles(): Promise<Role[]> {
  const { data } = await CAxios.get('/admin/role-mgmt/roles/');
  return data?.roles || data?.data || data || [];
}

export async function createRole(roleData: RoleCreateRequest): Promise<Role> {
  const { data } = await CAxios.post('/admin/role-mgmt/', roleData);
  return data.data || data;
}

export async function updateRole(id: string, roleData: RoleUpdateRequest): Promise<Role> {
  const { data } = await CAxios.put(`/admin/role-mgmt/roles/${id}`, roleData);
  return data.data || data;
}

export async function deleteRole(id: string): Promise<void> {
  await CAxios.delete(`/admin/role-mgmt/roles/${id}`);
}

export async function getRoleById(id: string): Promise<Role> {
  const { data } = await CAxios.get(`/admin/role-mgmt/roles/${id}`);
  return data.data || data;
}

export async function getRolePermissions(roleId: string): Promise<any> {
  const { data } = await CAxios.get(`/admin/role-mgmt/roles/${roleId}/permissions`);
  return data;
}

export async function updateRolePermission(roleId: string, resource: string, action: string, isGranted: boolean): Promise<any> {
  const { data } = await CAxios.put(`/admin/role-mgmt/roles/${roleId}/permissions?resource=${resource}&action=${action}&is_granted=${isGranted}`);
  return data;
}

export async function bulkUpdateRolePermissions(roleId: string, permissions: any[]): Promise<any> {
  const { data } = await CAxios.post(`/admin/role-mgmt/roles/${roleId}/permissions/bulk`, { permissions });
  return data;
}

export async function getPermissionTemplates(): Promise<any> {
  const { data } = await CAxios.get('/admin/role-mgmt/templates/');
  return data;
}

export async function applyPermissionTemplate(roleId: string, templateName: string): Promise<any> {
  const { data } = await CAxios.post(`/admin/role-mgmt/roles/${roleId}/apply-template?template_name=${templateName}`);
  return data;
}

export async function validateRoleDeletion(roleId: string): Promise<any> {
  const { data } = await CAxios.get(`/admin/role-mgmt/${roleId}/delete-validation`);
  return data;
}

// Admin endpoints
export async function getTenantRoles(): Promise<any> {
  const { data } = await CAxios.get('/admin/role-mgmt/roles/');
  return data;
}

export async function debugGetTenantRoles(): Promise<any> {
  const { data } = await CAxios.get('/admin/role-mgmt/debug-roles/');
  return data;
}

export async function testAdminEndpoint(): Promise<any> {
  const { data } = await CAxios.get('/admin/role-mgmt/test/');
  return data;
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: fetchRoles,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: () => getRoleById(id),
    enabled: !!id,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoleUpdateRequest }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
    },
  });
}

// Utility function to get current access token
export const getAccessToken = (): string | null => {
  return useAuthStore.getState().accessToken;
};

// Utility function to get current refresh token
export const getRefreshToken = (): string | null => {
  return useAuthStore.getState().refreshToken;
};

// Utility function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return useAuthStore.getState().isAuthenticated;
};
