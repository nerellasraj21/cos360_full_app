import React, { ReactNode, useMemo, memo } from 'react';
import { ViewStyle } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedMobilePermissions } from '../hooks/use-optimized-mobile-permissions';
import { usePermissionPerformanceMonitor } from '../hooks/use-permission-performance-monitor';
import { 
  PermissionResource, 
  PermissionAction, 
  PermissionTuple, 
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
  componentName?: string; // For performance monitoring
}

interface SinglePermissionProps extends BasePermissionGuardProps {
  resource: string;
  action: string;
  permissions?: never;
  requireAll?: never;
  resourceConstant?: never;
  actionConstant?: never;
}

interface MultiplePermissionProps extends BasePermissionGuardProps {
  permissions: PermissionTuple[];
  requireAll?: boolean;
  resource?: never;
  action?: never;
  resourceConstant?: never;
  actionConstant?: never;
}

interface ConstantPermissionProps extends BasePermissionGuardProps {
  resourceConstant: PermissionResource;
  actionConstant: PermissionAction;
  resource?: never;
  action?: never;
  permissions?: never;
  requireAll?: never;
}

type OptimizedPermissionGuardProps = SinglePermissionProps | MultiplePermissionProps | ConstantPermissionProps;

const OptimizedPermissionGuardComponent: React.FC<OptimizedPermissionGuardProps> = (props) => {
  const { 
    children, 
    fallback, 
    loadingFallback, 
    disabled = false, 
    style,
    componentName = 'OptimizedPermissionGuard'
  } = props;
  
  const { isLoading } = useAuth();
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    checkMultiplePermissions 
  } = useOptimizedMobilePermissions();
  
  const { measurePermissionCheck } = usePermissionPerformanceMonitor(componentName);

  // Memoized permission check with performance monitoring
  const hasRequiredPermission = useMemo(() => {
    if (isLoading) return false;

    return measurePermissionCheck(() => {
      // Single permission check
      if ('resource' in props && 'action' in props && props.resource && props.action) {
        return hasPermission(props.resource, props.action);
      }

      // Constants-based permission check
      if ('resourceConstant' in props && 'actionConstant' in props && props.resourceConstant && props.actionConstant) {
        return hasPermission(props.resourceConstant, props.actionConstant);
      }

      // Multiple permissions check (optimized batch checking)
      if ('permissions' in props && props.permissions) {
        const { permissions, requireAll = false } = props;
        
        // Use batch checking for better performance
        if (permissions.length > 3) {
          const results = checkMultiplePermissions(permissions);
          const permissionResults = permissions.map(([resource, action]) => 
            results[`${resource}:${action}`]
          );
          
          return requireAll 
            ? permissionResults.every(result => result)
            : permissionResults.some(result => result);
        } else {
          // Use individual checks for small sets
          return requireAll 
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);
        }
      }

      return false;
    }, getPermissionDescription(props));
  }, [props, hasPermission, hasAnyPermission, hasAllPermissions, checkMultiplePermissions, isLoading, measurePermissionCheck]);

  // Generate permission description for monitoring
  const getPermissionDescription = (guardProps: OptimizedPermissionGuardProps): string => {
    if ('resource' in guardProps && 'action' in guardProps && guardProps.resource && guardProps.action) {
      return `${guardProps.resource}:${guardProps.action}`;
    }
    
    if ('resourceConstant' in guardProps && 'actionConstant' in guardProps && guardProps.resourceConstant && guardProps.actionConstant) {
      return `${guardProps.resourceConstant}:${guardProps.actionConstant}`;
    }
    
    if ('permissions' in guardProps && guardProps.permissions) {
      const permissionStr = guardProps.permissions
        .map(([resource, action]) => `${resource}:${action}`)
        .join(', ');
      return `multiple(${guardProps.requireAll ? 'ALL' : 'ANY'}): ${permissionStr}`;
    }
    
    return 'unknown';
  };

  // Show loading state
  if (isLoading) {
    if (loadingFallback) {
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
    if (fallback) {
      return <>{fallback}</>;
    }

    // Determine which permissions were checked for better error messaging
    let resource: string | undefined;
    let action: string | undefined;
    let requiredPermissions: PermissionTuple[] | undefined;

    if ('resource' in props && 'action' in props && props.resource && props.action) {
      resource = props.resource;
      action = props.action;
    } else if ('resourceConstant' in props && 'actionConstant' in props && props.resourceConstant && props.actionConstant) {
      resource = props.resourceConstant;
      action = props.actionConstant;
    } else if ('permissions' in props && props.permissions) {
      requiredPermissions = props.permissions;
    }

    return (
      <PermissionAccessDenied
        resource={resource}
        action={action}
        requiredPermissions={requiredPermissions}
        style={style}
      />
    );
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

// Memoize the component to prevent unnecessary re-renders
export const OptimizedPermissionGuard = memo(OptimizedPermissionGuardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  
  // Compare basic props
  if (
    prevProps.disabled !== nextProps.disabled ||
    prevProps.componentName !== nextProps.componentName ||
    prevProps.fallback !== nextProps.fallback ||
    prevProps.loadingFallback !== nextProps.loadingFallback
  ) {
    return false;
  }

  // Compare permission props
  if ('resource' in prevProps && 'resource' in nextProps) {
    return prevProps.resource === nextProps.resource && prevProps.action === nextProps.action;
  }

  if ('resourceConstant' in prevProps && 'resourceConstant' in nextProps) {
    return prevProps.resourceConstant === nextProps.resourceConstant && 
           prevProps.actionConstant === nextProps.actionConstant;
  }

  if ('permissions' in prevProps && 'permissions' in nextProps) {
    if (!prevProps.permissions || !nextProps.permissions) {
      return prevProps.permissions === nextProps.permissions;
    }
    
    if (prevProps.permissions.length !== nextProps.permissions.length) {
      return false;
    }
    
    return prevProps.permissions.every(([resource, action], index) => {
      const [nextResource, nextAction] = nextProps.permissions[index];
      return resource === nextResource && action === nextAction;
    }) && prevProps.requireAll === nextProps.requireAll;
  }

  return true;
});

OptimizedPermissionGuard.displayName = 'OptimizedPermissionGuard';

export default OptimizedPermissionGuard;