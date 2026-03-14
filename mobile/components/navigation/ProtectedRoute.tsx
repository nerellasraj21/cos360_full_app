import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { PermissionGuard } from '../PermissionGuard';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PermissionTuple } from '../../src/types/permissions';

interface ProtectedRouteProps {
  resource: string;
  action: string;
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
  style?: ViewStyle;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  resource,
  action,
  children,
  redirectTo,
  fallback,
  style,
}) => {
  const router = useRouter();

  const handleUnauthorizedAccess = () => {
    if (redirectTo) {
      router.replace(redirectTo as any);
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <ThemedView style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, style]}>
        <Ionicons name="shield-outline" size={64} color="#ef4444" />
        <ThemedText style={{ 
          marginTop: 20, 
          fontSize: 18, 
          fontWeight: '600', 
          textAlign: 'center',
          color: '#374151'
        }}>
          Access Denied
        </ThemedText>
        <ThemedText style={{ 
          marginTop: 8, 
          textAlign: 'center', 
          color: '#6b7280',
          lineHeight: 20
        }}>
          You don't have permission to access this screen.{'\n'}
          Please contact your administrator if you believe this is an error.
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <PermissionGuard
      resource={resource}
      action={action}
      fallback={handleUnauthorizedAccess()}
      style={style}
    >
      {children}
    </PermissionGuard>
  );
};

export default ProtectedRoute;