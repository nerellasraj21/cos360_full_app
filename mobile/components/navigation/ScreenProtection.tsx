import React, { ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useScreenPermissions } from '../../src/hooks/useScreenPermissions';

interface ScreenProtectionProps {
  children: ReactNode;
  screenPath?: string; // If not provided, will use current pathname
  fallback?: ReactNode;
  redirectTo?: string;
  style?: ViewStyle;
}

export const ScreenProtection: React.FC<ScreenProtectionProps> = ({
  children,
  screenPath,
  fallback,
  redirectTo,
  style,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { validateScreen, getScreenConfig } = useScreenPermissions();

  // Use provided screenPath or current pathname
  const currentScreenPath = screenPath || pathname;
  
  // Validate screen access
  const { hasAccess, config, reason } = validateScreen(currentScreenPath);

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle unauthorized access
  if (redirectTo) {
    // Redirect to specified route
    router.replace(redirectTo as any);
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default unauthorized access UI
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
        {config?.description || 'You don\'t have permission to access this screen.'}
      </ThemedText>
      {reason && (
        <ThemedText style={{ 
          marginTop: 12, 
          fontSize: 12,
          textAlign: 'center', 
          color: '#9ca3af',
          fontStyle: 'italic'
        }}>
          {reason}
        </ThemedText>
      )}
    </ThemedView>
  );
};

// Higher-order component for screen protection
export const withScreenProtection = <P extends object>(
  Component: React.ComponentType<P>,
  screenPath?: string,
  options?: {
    fallback?: ReactNode;
    redirectTo?: string;
    style?: ViewStyle;
  }
): React.FC<P> => {
  return (props: P) => {
    return (
      <ScreenProtection
        screenPath={screenPath}
        fallback={options?.fallback}
        redirectTo={options?.redirectTo}
        style={options?.style}
      >
        <Component {...props} />
      </ScreenProtection>
    );
  };
};

export default ScreenProtection;