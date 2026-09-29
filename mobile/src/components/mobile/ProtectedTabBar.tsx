import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useMobilePermission } from '../../hooks/useMobilePermission'
import { type PermissionResource, type PermissionAction } from '../../constants/permissions'

interface ProtectedTabProps {
  name: string
  component: React.ComponentType
  permission?: {
    resource: string
    action: string
  } | {
    resourceConstant: PermissionResource
    actionConstant: PermissionAction<PermissionResource>
  }
  icon: React.ComponentType
  label: string
  badge?: string | number
  options?: any
}

interface ProtectedTabBarProps {
  tabs: ProtectedTabProps[]
  screenOptions?: any
  initialRouteName?: string
}

export const ProtectedTabBar: React.FC<ProtectedTabBarProps> = ({
  tabs,
  screenOptions,
  initialRouteName,
}) => {
  const Tab = createBottomTabNavigator()
  const { checkPermission, checkPermissionByConstant } = useMobilePermission()

  const checkTabPermission = (tab: ProtectedTabProps): boolean => {
    if (!tab.permission) return true

    if ('resource' in tab.permission && 'action' in tab.permission) {
      return checkPermission(tab.permission.resource, tab.permission.action)
    }

    if ('resourceConstant' in tab.permission && 'actionConstant' in tab.permission) {
      return checkPermissionByConstant(tab.permission.resourceConstant, tab.permission.actionConstant)
    }

    return true
  }

  const filteredTabs = tabs.filter(checkTabPermission)

  return (
    <Tab.Navigator
      screenOptions={screenOptions}
      initialRouteName={initialRouteName}
    >
      {filteredTabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarIcon: tab.icon,
            tabBarLabel: tab.label,
            tabBarBadge: tab.badge,
            ...tab.options,
          }}
        />
      ))}
    </Tab.Navigator>
  )
}