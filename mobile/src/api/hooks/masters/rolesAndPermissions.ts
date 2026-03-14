import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../../../components/FeedbackToast';
import { usePermissionProtectedQuery, usePermissionProtectedMutation } from '../../../../hooks/use-permission-protected-api';
import { PERMISSION_RESOURCES } from '../../../types/permissions';
import { rolesApi, permissionsApi, Role, RoleCreate, RoleUpdate, Permission, PermissionCreate, PermissionUpdate } from '../../index';

// Get all roles - permission protected
export function useRoles() {
  return usePermissionProtectedQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getRoles(),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'list',
  });
}

// Get role by ID - permission protected
export function useRole(id: string) {
  return usePermissionProtectedQuery<Role>({
    queryKey: ['roles', id],
    queryFn: () => rolesApi.getRole(id),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'read',
    enabled: !!id,
  });
}

// Create role - permission protected
export function useCreateRole() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<Role, Error, RoleCreate>({
    mutationFn: (data) => rolesApi.createRole(data),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Role created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create role');
    },
  });
}

// Update role - permission protected
export function useUpdateRole() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<Role, Error, { id: string; data: RoleUpdate }>({
    mutationFn: ({ id, data }) => rolesApi.updateRole(id, data),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Role updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update role');
    },
  });
}

// Delete role - permission protected
export function useDeleteRole() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => rolesApi.deleteRole(id),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Role deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete role');
    },
  });
}

// Get permissions with pagination - permission protected
export function usePermissions(params?: { skip?: number; limit?: number; role_id?: string }) {
  return usePermissionProtectedQuery<any>({
    queryKey: ['resource-permissions', 'paginated', params?.skip, params?.limit, params?.role_id],
    queryFn: () => permissionsApi.getPermissions(params),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'list',
  });
}

// Get permission matrix - permission protected
export function usePermissionMatrix() {
  return usePermissionProtectedQuery<any[]>({
    queryKey: ['permissionMatrix'],
    queryFn: () => permissionsApi.getPermissionMatrix(),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'read',
  });
}

// Get available resources - permission protected
export function useAvailableResources() {
  return usePermissionProtectedQuery<any>({
    queryKey: ['availableResources'],
    queryFn: () => permissionsApi.getAvailableResources(),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'read',
    retry: false,
  });
}

// Get available actions - permission protected
export function useAvailableActions() {
  return usePermissionProtectedQuery<any>({
    queryKey: ['availableActions'],
    queryFn: () => permissionsApi.getAvailableActions(),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'read',
    retry: false,
  });
}

// Create permission - permission protected
export function useCreatePermission() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<Permission, Error, PermissionCreate>({
    mutationFn: (data) => permissionsApi.createPermission(data),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Permission created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create permission');
    },
  });
}

// Update permission - permission protected
export function useUpdatePermission() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<Permission, Error, { id: string; data: PermissionUpdate }>({
    mutationFn: ({ id, data }) => permissionsApi.updatePermission(id, data),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'update',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Permission updated successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to update permission');
    },
  });
}

// Delete permission - permission protected
export function useDeletePermission() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<void, Error, string>({
    mutationFn: (id) => permissionsApi.deletePermission(id),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'delete',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Permission deleted successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to delete permission');
    },
  });
}

// Bulk create permissions - permission protected
export function useBulkCreatePermissions() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  
  return usePermissionProtectedMutation<any, Error, any>({
    mutationFn: (data) => permissionsApi.bulkCreatePermissions(data),
    resource: PERMISSION_RESOURCES.ROLES_PERMISSIONS,
    action: 'create',
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permissionMatrix'] });
      showSuccess('Permissions created successfully');
    },
    onError: (error) => {
      showError(error.message || 'Failed to create permissions');
    },
  });
}