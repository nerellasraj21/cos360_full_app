import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useMobilePermission } from '../../hooks/useMobilePermission'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '../../constants/permissions'

interface MobilePermissionGuardProps {
  children: React.ReactNode
  resource?: string
  action?: string
  resourceConstant?: PermissionResource
  actionConstant?: PermissionAction<PermissionResource>
  permissions?: Array<[string, string]>
  requireAll?: boolean
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
  disabledStyle?: any
  accessDeniedMessage?: string
}

export const MobilePermissionGuard: React.FC<MobilePermissionGuardProps> = ({
  children,
  resource,
  action,
  resourceConstant,
  actionConstant,
  permissions,
  requireAll = false,
  fallback,
  showMessage = false, // Changed default to false to hide UI elements instead of showing messages
  disabled = false,
  disabledStyle,
  accessDeniedMessage = "You don't have permission to access this feature",
}) => {
  const { checkPermission: checkPerm, checkPermissionByConstant, hasAnyPermission, hasAllPermissions } = useMobilePermission()

  const checkPermission = () => {
    if (resource && action) {
      return checkPerm(resource, action)
    }

    if (resourceConstant && actionConstant) {
      return checkPermissionByConstant(resourceConstant, actionConstant)
    }

    if (permissions && permissions.length > 0) {
      return requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions)
    }

    return true
  }

  const hasAccess = checkPermission()

  if (!hasAccess) {
    if (disabled) {
      return (
        <View style={[styles.container, styles.disabled, disabledStyle]}>
          {children}
        </View>
      )
    }

    if (fallback) {
      return <>{fallback}</>
    }

    if (showMessage) {
      return (
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>
            {accessDeniedMessage}
          </Text>
        </View>
      )
    }

    return null
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none' as const,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 100,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
})

// Higher-order component for permission guarding - aligned with web version
export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permissionConfig: {
    resource?: string
    action?: string
    resourceConstant?: PermissionResource
    actionConstant?: PermissionAction<PermissionResource>
    permissions?: Array<[string, string]>
    requireAll?: boolean
    fallback?: React.ReactNode
    showMessage?: boolean
    disabled?: boolean
  }
) => {
  const ComponentWithPermission = (props: P) => (
    <MobilePermissionGuard {...permissionConfig}>
      <WrappedComponent {...props} />
    </MobilePermissionGuard>
  )

  ComponentWithPermission.displayName = `withPermission(${WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithPermission
}

// Main PermissionGuard component - renamed to match web version naming
export const PermissionGuard = MobilePermissionGuard

// Specialized guards for common use cases
export const CreatePermissionGuard: React.FC<{
  children: React.ReactNode
  resource: PermissionResource
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
}> = ({ children, resource, ...props }) => (
  <MobilePermissionGuard
    resourceConstant={resource}
    actionConstant="create"
    {...props}
  >
    {children}
  </MobilePermissionGuard>
)

export const ReadPermissionGuard: React.FC<{
  children: React.ReactNode
  resource: PermissionResource
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
}> = ({ children, resource, ...props }) => (
  <MobilePermissionGuard
    resourceConstant={resource}
    actionConstant="read"
    {...props}
  >
    {children}
  </MobilePermissionGuard>
)

export const UpdatePermissionGuard: React.FC<{
  children: React.ReactNode
  resource: PermissionResource
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
}> = ({ children, resource, ...props }) => (
  <MobilePermissionGuard
    resourceConstant={resource}
    actionConstant="update"
    {...props}
  >
    {children}
  </MobilePermissionGuard>
)

export const DeletePermissionGuard: React.FC<{
  children: React.ReactNode
  resource: PermissionResource
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
}> = ({ children, resource, ...props }) => (
  <MobilePermissionGuard
    resourceConstant={resource}
    actionConstant="delete"
    {...props}
  >
    {children}
  </MobilePermissionGuard>
)

export const ListPermissionGuard: React.FC<{
  children: React.ReactNode
  resource: PermissionResource
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
}> = ({ children, resource, ...props }) => (
  <MobilePermissionGuard
    resourceConstant={resource}
    actionConstant="list"
    {...props}
  >
    {children}
  </MobilePermissionGuard>
)

export const ApprovePermissionGuard: React.FC<{
  children: React.ReactNode
  resource: PermissionResource
  fallback?: React.ReactNode
  showMessage?: boolean
  disabled?: boolean
}> = ({ children, resource, ...props }) => (
  <MobilePermissionGuard
    resourceConstant={resource}
    actionConstant="approve"
    {...props}
  >
    {children}
  </MobilePermissionGuard>
)