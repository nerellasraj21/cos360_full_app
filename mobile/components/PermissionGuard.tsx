import React, { ReactNode, useMemo } from 'react';
import { ViewStyle } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  PermissionResource,
  PermissionAction,
  PermissionTuple,
  PermissionCheckMode,
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS
} from '../src/types/permissions';
import {
  PermissionLoading,
  PermissionAccessDenied,
  DisabledActionIndicator
} from './ui';

interface BasePermissionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
}

interface SinglePermissionProps extends BasePermissionGuardProps {
  resource: string;
  action: string;
  // Exclude multiple permission props
  permissions?: never;
  requireAll?: never;
  resourceConstant?: never;
  actionConstant?: never;
}

interface MultiplePermissionProps extends BasePermissionGuardProps {
  permissions: PermissionTuple[];
  requireAll?: boolean;
  // Exclude single permission props
  resource?: never;
  action?: never;
  resourceConstant?: never;
  actionConstant?: never;
}

interface ConstantPermissionProps extends BasePermissionGuardProps {
  resourceConstant: PermissionResource;
  actionConstant: PermissionAction;
  // Exclude other permission props
  resource?: never;
  action?: never;
  permissions?: never;
  requireAll?: never;
}

type PermissionGuardProps = SinglePermissionProps | MultiplePermissionProps | ConstantPermissionProps;

export const PermissionGuard: React.FC<PermissionGuardProps> = (props) => {
  const {
    children,
    fallback,
    loadingFallback,
    disabled = false,
    style
  } = props;

  const { hasPermission, isLoading } = useAuth();

  const hasRequiredPermission = useMemo(() => {
    if (isLoading) return false;

    // Single permission check
    if ('resource' in props && 'action' in props && props.resource && props.action) {
      return hasPermission(props.resource, props.action);
    }

    // Constants-based permission check
    if ('resourceConstant' in props && 'actionConstant' in props && props.resourceConstant && props.actionConstant) {
      return hasPermission(props.resourceConstant, props.actionConstant);
    }

    // Multiple permissions check
    if ('permissions' in props && props.permissions) {
      const { permissions, requireAll = false } = props;

      if (requireAll) {
        return permissions.every(([resource, action]) => hasPermission(resource, action));
      } else {
        return permissions.some(([resource, action]) => hasPermission(resource, action));
      }
    }

    return false;
  }, [props, hasPermission, isLoading]);

  // Show loading state
  if (isLoading) {
    if (loadingFallback !== undefined) {
      return <>{loadingFallback}</>;
    }

    return (
      <PermissionLoading
        message="Checking permissions..."
        size="medium"
        style={style}
      />
    );
  }

  // Handle insufficient permissions
  if (!hasRequiredPermission) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }

    // Default behavior: hide the UI element instead of showing access denied
    return null;
  }

  // Handle disabled state
  if (disabled) {
    return (
      <DisabledActionIndicator
        reason="Action not permitted"
        style={style}
      >
        {children}
      </DisabledActionIndicator>
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;