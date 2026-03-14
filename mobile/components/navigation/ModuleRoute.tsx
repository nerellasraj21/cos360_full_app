import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { PermissionGuard } from '../PermissionGuard';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { Ionicons } from '@expo/vector-icons';
import { PermissionTuple } from '../../src/types/permissions';

interface ModuleRouteProps {
  moduleResources: string[];
  requireAll?: boolean;
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
  style?: ViewStyle;
}

export const ModuleRoute: React.FC<ModuleRouteProps> = ({
  moduleResources,
  requireAll = false,
  children,
  redirectTo,
  fallback,
  style,
}) => {
  const router = useRouter();

  // Create permission tuples for module access checking
  // Each module resource needs at least read or list permission
  const modulePermissions: PermissionTuple[] = moduleResources.flatMap(resource => [
    [resource as any, 'read' as any],
    [resource as any, 'list' as any],
  ]);

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
        <Ionicons name="lock-closed-outline" size={64} color="#ef4444" />
        <ThemedText style={{
          marginTop: 20,
          fontSize: 18,
          fontWeight: '600',
          textAlign: 'center',
          color: '#374151'
        }}>
          Module Access Denied
        </ThemedText>
        <ThemedText style={{
          marginTop: 8,
          textAlign: 'center',
          color: '#6b7280',
          lineHeight: 20
        }}>
          You don't have permission to access this module.{'\n'}
          Please contact your administrator for access.
        </ThemedText>
      </ThemedView>
    );
  };

  return (
    <PermissionGuard
      permissions={modulePermissions}
      requireAll={requireAll}
      fallback={handleUnauthorizedAccess()}
      style={style}
    >
      {children}
    </PermissionGuard>
  );
};

export default ModuleRoute;