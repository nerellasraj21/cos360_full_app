import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useMobileAuthStore } from '../../stores/mobileAuthStore'

interface AccessDeniedScreenProps {
  title?: string
  message?: string
  showRetry?: boolean
  onRetry?: () => void
  showGoBack?: boolean
  onGoBack?: () => void
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  title = 'Access Denied',
  message = 'You don\'t have permission to access this feature.',
  showRetry = false,
  onRetry,
  showGoBack = true,
  onGoBack,
}) => {
  const logout = useMobileAuthStore(state => state.logout)

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack()
    } else {
      // Default behavior - could navigate back or to home
      console.log('Go back pressed')
    }
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      // Default behavior - could refresh permissions
      console.log('Retry pressed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <View style={styles.buttonContainer}>
          {showRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}

          {showGoBack && (
            <TouchableOpacity style={styles.goBackButton} onPress={handleGoBack}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  goBackButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
})