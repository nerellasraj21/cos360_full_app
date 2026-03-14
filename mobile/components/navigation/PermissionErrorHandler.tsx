import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { ThemedTouchableOpacity } from '../themed-touchable-opacity';
import { Ionicons } from '@expo/vector-icons';
import { PermissionErrorType } from '../../src/types/permissions';

interface PermissionErrorHandlerProps {
  errorType: PermissionErrorType;
  resource?: string;
  action?: string;
  requiredPermissions?: Array<[string, string]>;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  style?: ViewStyle;
}

export const PermissionErrorHandler: React.FC<PermissionErrorHandlerProps> = ({
  errorType,
  resource,
  action,
  requiredPermissions,
  message,
  onRetry,
  onGoBack,
  style,
}) => {
  const router = useRouter();

  const getErrorContent = () => {
    switch (errorType) {
      case PermissionErrorType.INSUFFICIENT_PERMISSIONS:
        return {
          icon: 'shield-outline' as const,
          title: 'Access Denied',
          description: message || `You don't have permission to ${action || 'perform this action'} on ${resource || 'this resource'}.`,
          color: '#ef4444',
        };

      case PermissionErrorType.AUTHENTICATION_REQUIRED:
        return {
          icon: 'log-in-outline' as const,
          title: 'Authentication Required',
          description: message || 'Please log in to access this feature.',
          color: '#f59e0b',
        };

      case PermissionErrorType.PERMISSION_CHECK_FAILED:
        return {
          icon: 'warning-outline' as const,
          title: 'Permission Check Failed',
          description: message || 'Unable to verify your permissions. Please try again.',
          color: '#f59e0b',
        };

      case PermissionErrorType.PERMISSION_DATA_CORRUPTED:
        return {
          icon: 'refresh-outline' as const,
          title: 'Permission Data Error',
          description: message || 'Your permission data appears to be corrupted. Please log out and log back in.',
          color: '#dc2626',
        };

      default:
        return {
          icon: 'alert-circle-outline' as const,
          title: 'Permission Error',
          description: message || 'An unknown permission error occurred.',
          color: '#6b7280',
        };
    }
  };

  const errorContent = getErrorContent();

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/' as any);
  };

  const handleLogin = () => {
    router.replace('/login' as any);
  };

  return (
    <ThemedView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, style]}>
      <Ionicons name={errorContent.icon} size={64} color={errorContent.color} />
      
      <ThemedText style={{ 
        marginTop: 20, 
        fontSize: 18, 
        fontWeight: '600', 
        textAlign: 'center',
        color: '#374151'
      }}>
        {errorContent.title}
      </ThemedText>
      
      <ThemedText style={{ 
        marginTop: 8, 
        textAlign: 'center', 
        color: '#6b7280',
        lineHeight: 20
      }}>
        {errorContent.description}
      </ThemedText>

      {/* Show required permissions if available */}
      {requiredPermissions && requiredPermissions.length > 0 && (
        <ThemedView style={{ marginTop: 16, padding: 12, backgroundColor: '#f3f4f6', borderRadius: 8 }}>
          <ThemedText style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
            Required Permissions:
          </ThemedText>
          {requiredPermissions.map(([res, act], index) => (
            <ThemedText key={index} style={{ fontSize: 11, color: '#6b7280' }}>
              • {res}:{act}
            </ThemedText>
          ))}
        </ThemedView>
      )}

      {/* Action buttons */}
      <ThemedView style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
        {errorType === PermissionErrorType.AUTHENTICATION_REQUIRED ? (
          <ThemedTouchableOpacity
            onPress={handleLogin}
            style={{
              backgroundColor: '#3b82f6',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="log-in-outline" size={16} color="white" />
            <ThemedText style={{ color: 'white', fontWeight: '600' }}>
              Log In
            </ThemedText>
          </ThemedTouchableOpacity>
        ) : (
          <>
            {onRetry && (
              <ThemedTouchableOpacity
                onPress={onRetry}
                style={{
                  backgroundColor: '#10b981',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="refresh-outline" size={16} color="white" />
                <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                  Retry
                </ThemedText>
              </ThemedTouchableOpacity>
            )}
            
            <ThemedTouchableOpacity
              onPress={handleGoBack}
              style={{
                backgroundColor: '#6b7280',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="arrow-back-outline" size={16} color="white" />
              <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                Go Back
              </ThemedText>
            </ThemedTouchableOpacity>
            
            <ThemedTouchableOpacity
              onPress={handleGoHome}
              style={{
                backgroundColor: '#3b82f6',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="home-outline" size={16} color="white" />
              <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                Home
              </ThemedText>
            </ThemedTouchableOpacity>
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
};

export default PermissionErrorHandler;