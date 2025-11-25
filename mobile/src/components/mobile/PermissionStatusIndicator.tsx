import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useMobileAuthStore } from '../../stores/mobileAuthStore'

interface PermissionStatusIndicatorProps {
  resource: string
  action: string
  showText?: boolean
  size?: 'small' | 'medium' | 'large'
  style?: any
}

export const PermissionStatusIndicator: React.FC<PermissionStatusIndicatorProps> = ({
  resource,
  action,
  showText = false,
  size = 'medium',
  style,
}) => {
  const hasPermission = useMobileAuthStore(state => state.hasPermission)
  const isAllowed = hasPermission(resource, action)

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          indicator: { width: 8, height: 8, borderRadius: 4 },
          text: { fontSize: 12 },
        }
      case 'large':
        return {
          indicator: { width: 16, height: 16, borderRadius: 8 },
          text: { fontSize: 16 },
        }
      default: // medium
        return {
          indicator: { width: 12, height: 12, borderRadius: 6 },
          text: { fontSize: 14 },
        }
    }
  }

  const sizeStyles = getSizeStyles()

  return (
    <View style={[styles.container, style]}>
      <View style={[
        styles.indicator,
        sizeStyles.indicator,
        isAllowed ? styles.allowed : styles.denied
      ]} />
      {showText && (
        <Text style={[styles.text, sizeStyles.text]}>
          {isAllowed ? 'Allowed' : 'Denied'}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    marginRight: 5,
  },
  allowed: {
    backgroundColor: '#28a745',
  },
  denied: {
    backgroundColor: '#dc3545',
  },
  text: {
    color: '#333',
    fontWeight: '500',
  },
})

// Multiple permission indicators
interface PermissionIndicatorsProps {
  permissions: Array<{ resource: string; action: string; label?: string }>
  layout?: 'horizontal' | 'vertical'
  size?: 'small' | 'medium' | 'large'
  showLabels?: boolean
  style?: any
}

export const PermissionIndicators: React.FC<PermissionIndicatorsProps> = ({
  permissions,
  layout = 'vertical',
  size = 'small',
  showLabels = true,
  style,
}) => {
  return (
    <View style={[
      indicatorStyles.indicatorsContainer,
      layout === 'horizontal' && indicatorStyles.horizontal,
      style
    ]}>
      {permissions.map((perm, index) => (
        <View key={`${perm.resource}-${perm.action}`} style={[
          indicatorStyles.indicatorItem,
          layout === 'horizontal' && indicatorStyles.horizontalItem,
        ]}>
          <PermissionStatusIndicator
            resource={perm.resource}
            action={perm.action}
            showText={showLabels}
            size={size}
          />
          {showLabels && perm.label && (
            <Text style={indicatorStyles.labelText}>{perm.label}</Text>
          )}
        </View>
      ))}
    </View>
  )
}

const indicatorStyles = StyleSheet.create({
  indicatorsContainer: {
    flex: 1,
  },
  horizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  indicatorItem: {
    marginBottom: 8,
  },
  horizontalItem: {
    marginRight: 16,
    marginBottom: 8,
  },
  labelText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
})