import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native'
import { useMobilePermission } from '../../hooks/useMobilePermission'
import { PERMISSIONS, type PermissionResource, type PermissionAction } from '../../constants/permissions'

interface MenuItem {
  id: string
  title: string
  icon?: React.ComponentType
  permission?: {
    resource: string
    action: string
  } | {
    resourceConstant: PermissionResource
    actionConstant: PermissionAction<PermissionResource>
  }
  onPress: () => void
  disabled?: boolean
  badge?: string | number
  style?: any
}

interface PermissionBasedMenuProps {
  items: MenuItem[]
  style?: any
  itemStyle?: any
  scrollable?: boolean
  numColumns?: number
  showIcons?: boolean
  showTitles?: boolean
}

export const PermissionBasedMenu: React.FC<PermissionBasedMenuProps> = ({
  items,
  style,
  itemStyle,
  scrollable = false,
  numColumns = 2,
  showIcons = true,
  showTitles = true,
}) => {
  const { checkPermission, checkPermissionByConstant } = useMobilePermission()

  const checkItemPermission = (item: MenuItem): boolean => {
    if (!item.permission) return true

    if ('resource' in item.permission && 'action' in item.permission) {
      return checkPermission(item.permission.resource, item.permission.action)
    }

    if ('resourceConstant' in item.permission && 'actionConstant' in item.permission) {
      return checkPermissionByConstant(item.permission.resourceConstant, item.permission.actionConstant)
    }

    return true
  }

  const visibleItems = items.filter(checkItemPermission)

  const renderItem = (item: MenuItem) => {
    const IconComponent = item.icon

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.menuItem,
          numColumns > 1 && { flex: 1 / numColumns },
          item.disabled && styles.disabled,
          itemStyle,
          item.style,
        ]}
        onPress={item.onPress}
        disabled={item.disabled}
      >
        {showIcons && IconComponent && (
          <View style={styles.iconContainer}>
            <IconComponent />
            {item.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                </Text>
              </View>
            )}
          </View>
        )}
        {showTitles && (
          <Text style={[styles.menuText, item.disabled && styles.disabledText]}>
            {item.title}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  const Container = scrollable ? ScrollView : View

  return (
    <Container
      style={[styles.container, style]}
      contentContainerStyle={scrollable ? styles.scrollContent : undefined}
      showsVerticalScrollIndicator={false}
    >
      {numColumns === 1 ? (
        visibleItems.map(renderItem)
      ) : (
        <View style={styles.gridContainer}>
          {visibleItems.map(renderItem)}
        </View>
      )}
    </Container>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    alignItems: 'center',
    padding: 15,
    margin: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    minHeight: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#dc3545',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#e9ecef',
  },
  disabledText: {
    color: '#6c757d',
  },
})

// Specialized menu components
export const ActionMenu: React.FC<{
  actions: MenuItem[]
  style?: any
}> = ({ actions, style }) => (
  <PermissionBasedMenu
    items={actions}
    style={[{ flexDirection: 'row', paddingVertical: 5 }, style]}
    numColumns={1}
    showIcons={false}
    showTitles={true}
  />
)

export const QuickActionsMenu: React.FC<{
  actions: MenuItem[]
  style?: any
}> = ({ actions, style }) => (
  <PermissionBasedMenu
    items={actions}
    style={style}
    numColumns={4}
    showIcons={true}
    showTitles={false}
  />
)