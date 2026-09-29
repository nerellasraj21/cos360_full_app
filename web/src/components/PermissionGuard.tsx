import React from 'react'
import { usePermission } from '@/hooks/usePermission'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '@/constants/permissions'

interface PermissionGuardProps {
  children: React.ReactNode
  resource?: string
  action?: string
  resourceConstant?: PermissionResource
  actionConstant?: PermissionAction<PermissionResource>
  permissions?: Array<[string, string]>
  requireAll?: boolean // If true, user must have ALL permissions; if false, user must have ANY
  fallback?: React.ReactNode
  disabled?: boolean // If true, renders children but disabled instead of hiding
}

/**
 * PermissionGuard component that conditionally renders children based on user permissions
 *
 * Usage examples:
 *
 * // Simple resource/action check
 * <PermissionGuard resource="students" action="create">
 *   <Button>Add Student</Button>
 * </PermissionGuard>
 *
 * // Using constants
 * <PermissionGuard resourceConstant="STUDENTS" actionConstant="CREATE">
 *   <Button>Add Student</Button>
 * </PermissionGuard>
 *
 * // Multiple permissions (user must have ANY by default)
 * <PermissionGuard permissions={[["students", "create"], ["students", "update"]]}>
 *   <Button>Modify Student</Button>
 * </PermissionGuard>
 *
 * // Multiple permissions (user must have ALL)
 * <PermissionGuard permissions={[["students", "create"], ["classes", "read"]]} requireAll>
 *   <Button>Complex Action</Button>
 * </PermissionGuard>
 *
 * // Render disabled instead of hiding
 * <PermissionGuard resource="students" action="delete" disabled>
 *   <Button disabled>Delete Student</Button>
 * </PermissionGuard>
 *
 * // Custom fallback
 * <PermissionGuard resource="admin" action="access" fallback={<div>Access Denied</div>}>
 *   <AdminPanel />
 * </PermissionGuard>
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  resource,
  action,
  resourceConstant,
  actionConstant,
  permissions,
  requireAll = false,
  fallback = null,
  disabled = false,
}) => {
  const { checkPermission, checkPermissionByConstant, hasAnyPermission, hasAllPermissions } = usePermission()

  // Determine if user has permission
  let hasPermission = false

  if (resource && action) {
    // Simple resource/action check
    hasPermission = checkPermission(resource, action)
  } else if (resourceConstant && actionConstant) {
    // Using constants
    hasPermission = checkPermissionByConstant(resourceConstant, actionConstant)
  } else if (permissions && permissions.length > 0) {
    // Multiple permissions check
    hasPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions)
  }

  // If no permission check was performed, default to allowing access
  if (!resource && !action && !resourceConstant && !actionConstant && (!permissions || permissions.length === 0)) {
    hasPermission = true
  }

  // If user doesn't have permission
  if (!hasPermission) {
    if (disabled) {
      // Render children but disabled
      return (
        <div style={{ pointerEvents: 'none', opacity: 0.5 }}>
          {children}
        </div>
      )
    } else {
      // Render fallback or nothing
      return <>{fallback}</>
    }
  }

  // User has permission, render children normally
  return <>{children}</>
}

// Convenience components for common patterns
export const CreatePermissionGuard: React.FC<Omit<PermissionGuardProps, 'action' | 'actionConstant'> & { resource: string }> = (props) => (
  <PermissionGuard {...props} action="create" />
)

export const ReadPermissionGuard: React.FC<Omit<PermissionGuardProps, 'action' | 'actionConstant'> & { resource: string }> = (props) => (
  <PermissionGuard {...props} action="read" />
)

export const UpdatePermissionGuard: React.FC<Omit<PermissionGuardProps, 'action' | 'actionConstant'> & { resource: string }> = (props) => (
  <PermissionGuard {...props} action="update" />
)

export const DeletePermissionGuard: React.FC<Omit<PermissionGuardProps, 'action' | 'actionConstant'> & { resource: string }> = (props) => (
  <PermissionGuard {...props} action="delete" />
)

export const ListPermissionGuard: React.FC<Omit<PermissionGuardProps, 'action' | 'actionConstant'> & { resource: string }> = (props) => (
  <PermissionGuard {...props} action="list" />
)