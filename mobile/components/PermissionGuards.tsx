import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { PermissionGuard } from './PermissionGuard';
import { 
  PermissionResource, 
  PermissionAction, 
  PermissionTuple,
  PERMISSION_ACTIONS 
} from '../src/types/permissions';

interface BaseGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

interface CRUDPermissionGuardProps extends BaseGuardProps {
  resource: PermissionResource;
}

interface ModulePermissionGuardProps extends BaseGuardProps {
  moduleResources: string[];
  requireAll?: boolean;
}

// CRUD-specific permission guards
export const CreatePermissionGuard: React.FC<CRUDPermissionGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    resourceConstant={resource}
    actionConstant={PERMISSION_ACTIONS.CREATE}
    {...props}
  />
);

export const ReadPermissionGuard: React.FC<CRUDPermissionGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    resourceConstant={resource}
    actionConstant={PERMISSION_ACTIONS.READ}
    {...props}
  />
);

export const UpdatePermissionGuard: React.FC<CRUDPermissionGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    resourceConstant={resource}
    actionConstant={PERMISSION_ACTIONS.UPDATE}
    {...props}
  />
);

export const DeletePermissionGuard: React.FC<CRUDPermissionGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    resourceConstant={resource}
    actionConstant={PERMISSION_ACTIONS.DELETE}
    {...props}
  />
);

export const ListPermissionGuard: React.FC<CRUDPermissionGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    resourceConstant={resource}
    actionConstant={PERMISSION_ACTIONS.LIST}
    {...props}
  />
);

export const ApprovePermissionGuard: React.FC<CRUDPermissionGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    resourceConstant={resource}
    actionConstant={PERMISSION_ACTIONS.APPROVE}
    {...props}
  />
);

// Module-level permission guard
export const ModulePermissionGuard: React.FC<ModulePermissionGuardProps> = ({
  moduleResources,
  requireAll = false,
  ...props
}) => {
  const permissions = moduleResources.flatMap(resource => [
    [resource as PermissionResource, PERMISSION_ACTIONS.READ],
    [resource as PermissionResource, PERMISSION_ACTIONS.LIST],
  ]) as PermissionTuple[];

  return (
    <PermissionGuard
      permissions={permissions}
      requireAll={requireAll}
      {...props}
    />
  );
};

// Convenience guards for common patterns
interface ReadOrListGuardProps extends BaseGuardProps {
  resource: PermissionResource;
}

export const ReadOrListPermissionGuard: React.FC<ReadOrListGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    permissions={[
      [resource, PERMISSION_ACTIONS.READ],
      [resource, PERMISSION_ACTIONS.LIST],
    ]}
    requireAll={false}
    {...props}
  />
);

interface CRUDAccessGuardProps extends BaseGuardProps {
  resource: PermissionResource;
}

export const CRUDAccessPermissionGuard: React.FC<CRUDAccessGuardProps> = ({
  resource,
  ...props
}) => (
  <PermissionGuard
    permissions={[
      [resource, PERMISSION_ACTIONS.CREATE],
      [resource, PERMISSION_ACTIONS.READ],
      [resource, PERMISSION_ACTIONS.UPDATE],
      [resource, PERMISSION_ACTIONS.DELETE],
      [resource, PERMISSION_ACTIONS.LIST],
    ]}
    requireAll={false}
    {...props}
  />
);

// Own resource guards (for read_own, update_own, delete_own)
interface OwnResourceGuardProps extends BaseGuardProps {
  resource: PermissionResource;
  action: 'read_own' | 'update_own' | 'delete_own';
}

export const OwnResourcePermissionGuard: React.FC<OwnResourceGuardProps> = ({
  resource,
  action,
  ...props
}) => (
  <PermissionGuard
    resource={resource}
    action={action}
    {...props}
  />
);

// Export all guards
export {
  PermissionGuard,
};