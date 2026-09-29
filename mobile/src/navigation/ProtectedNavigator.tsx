import React, { useEffect } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { useMobileAuthStore } from '../stores/mobileAuthStore'
import { LoadingScreen } from '../components/mobile/LoadingScreen'
import { AccessDeniedScreen } from '../components/mobile/AccessDeniedScreen'
import { type PermissionResource, type PermissionAction } from '../constants/permissions'

interface ProtectedRouteProps {
  name: string
  component: React.ComponentType
  permission?: {
    resource: string
    action: string
  } | {
    resourceConstant: PermissionResource
    actionConstant: PermissionAction<PermissionResource>
  }
  fallback?: React.ComponentType
  options?: any
}

interface ProtectedNavigatorProps {
  routes: ProtectedRouteProps[]
  initialRouteName?: string
  screenOptions?: any
}

export const ProtectedNavigator: React.FC<ProtectedNavigatorProps> = ({
  routes,
  initialRouteName,
  screenOptions,
}) => {
  const Stack = createStackNavigator()
  const { hasPermission, isAuthenticated, initializeFromStorage } = useMobileAuthStore()

  useEffect(() => {
    initializeFromStorage()
  }, [initializeFromStorage])

  const checkRoutePermission = (route: ProtectedRouteProps): boolean => {
    if (!route.permission) return true

    if ('resource' in route.permission && 'action' in route.permission) {
      return hasPermission(route.permission.resource, route.permission.action)
    }

    // Handle resourceConstant and actionConstant
    // This would need to be implemented based on your permission constants
    return true
  }

  if (!isAuthenticated) {
    return <LoadingScreen />
  }

  const filteredRoutes = routes.filter(checkRoutePermission)

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={screenOptions}
    >
      {filteredRoutes.map(route => (
        <Stack.Screen
          key={route.name}
          name={route.name}
          component={route.component}
          options={route.options}
        />
      ))}
    </Stack.Navigator>
  )
}

// Higher-order component for route protection
export const withRouteProtection = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission?: {
    resource: string
    action: string
  } | {
    resourceConstant: PermissionResource
    actionConstant: PermissionAction<PermissionResource>
  }
) => {
  const ComponentWithRouteProtection = (props: P) => {
    const hasPermission = useMobileAuthStore(state => state.hasPermission)

    const checkPermission = () => {
      if (!permission) return true

      if ('resource' in permission && 'action' in permission) {
        return hasPermission(permission.resource, permission.action)
      }

      // Handle resourceConstant and actionConstant
      return true
    }

    const hasAccess = checkPermission()

    if (!hasAccess) {
      return <AccessDeniedScreen />
    }

    return <WrappedComponent {...props} />
  }

  ComponentWithRouteProtection.displayName = `withRouteProtection(${WrappedComponent.displayName || WrappedComponent.name})`

  return ComponentWithRouteProtection
}