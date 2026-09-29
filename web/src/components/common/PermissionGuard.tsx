import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionGuardProps {
  resource: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * @param resource - The resource name (e.g., 'staff', 'holidays')
 * @param action - The action name (e.g., 'list', 'create', 'read')
 * @param fallback - Optional component to render when permission is denied
 * @param children - The content to render when permission is granted
 */
export function PermissionGuard({
  resource,
  action,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { checkPermission } = usePermission();
  const hasPermission = checkPermission(resource, action);

  // Debug logging
  console.log(`PermissionGuard: Checking ${resource}:${action}`, { hasPermission });

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}