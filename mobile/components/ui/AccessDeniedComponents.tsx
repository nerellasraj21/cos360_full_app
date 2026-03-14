import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { ThemedTouchableOpacity } from '../themed-touchable-opacity';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  PermissionError, 
  PermissionErrorType,
  PermissionTuple 
} from '../../src/types/permissions';
import { getPermissionErrorMessage } from '../../src/utils/permission-errors';

// Base interface for all access denied components
interface BaseAccessDeniedProps {
  style?: ViewStyle;
  onRetry?: () => void;
  onContactSupport?: () => void;
  compact?: boolean;
}

// Standard access denied component
interface AccessDeniedProps extends BaseAccessDeniedProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  showActions?: boolean;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  title = "Access Denied",
  message = "You don't have permission to access this feature.",
  icon = "lock-closed",
  showActions = true,
  onRetry,
  onContactSupport,
  compact = false,
  style,
}) => {
  const { colors } = useTheme();

  if (compact) {
    return (
      <ThemedView style={[styles.compactContainer, { borderColor: colors.border }, style]}>
        <Ionicons name={icon} size={24} color={colors['muted-foreground']} />
        <ThemedText style={[styles.compactMessage, { color: colors['muted-foreground'] }]}>
          {message}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={styles.content}>
        <Ionicons 
          name={icon} 
          size={64} 
          color={colors['muted-foreground']} 
          style={styles.icon} 
        />
        
        <ThemedText type="title" style={[styles.title, { color: colors.foreground }]}>
          {title}
        </ThemedText>
        
        <ThemedText style={[styles.message, { color: colors['muted-foreground'] }]}>
          {message}
        </ThemedText>

        {showActions && (
          <View style={styles.actions}>
            {onRetry && (
              <ThemedTouchableOpacity
                style={[styles.actionButton, styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={onRetry}
              >
                <Ionicons name="refresh" size={16} color="white" style={styles.buttonIcon} />
                <ThemedText style={styles.primaryButtonText}>Try Again</ThemedText>
              </ThemedTouchableOpacity>
            )}
            
            {onContactSupport && (
              <ThemedTouchableOpacity
                style={[styles.actionButton, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={onContactSupport}
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.primary} style={styles.buttonIcon} />
                <ThemedText style={[styles.secondaryButtonText, { color: colors.primary }]}>
                  Contact Support
                </ThemedText>
              </ThemedTouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ThemedView>
  );
};

// Permission-specific access denied component
interface PermissionAccessDeniedProps extends BaseAccessDeniedProps {
  error?: PermissionError;
  resource?: string;
  action?: string;
  requiredPermissions?: PermissionTuple[];
}

export const PermissionAccessDenied: React.FC<PermissionAccessDeniedProps> = ({
  error,
  resource,
  action,
  requiredPermissions,
  onRetry,
  onContactSupport,
  compact = false,
  style,
}) => {
  const { colors } = useTheme();

  // Determine icon based on error type or default
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (error?.type === PermissionErrorType.AUTHENTICATION_REQUIRED) {
      return 'log-in-outline';
    }
    if (error?.type === PermissionErrorType.PERMISSION_CHECK_FAILED) {
      return 'refresh-circle-outline';
    }
    return 'lock-closed-outline';
  };

  // Get title based on error type
  const getTitle = (): string => {
    if (error?.type === PermissionErrorType.AUTHENTICATION_REQUIRED) {
      return 'Login Required';
    }
    if (error?.type === PermissionErrorType.PERMISSION_CHECK_FAILED) {
      return 'Permission Check Failed';
    }
    return 'Access Denied';
  };

  // Get message
  const getMessage = (): string => {
    if (error) {
      return getPermissionErrorMessage(error);
    }
    
    if (resource && action) {
      return `You don't have permission to ${action} ${resource.replace(/_/g, ' ')}.`;
    }
    
    if (requiredPermissions && requiredPermissions.length > 0) {
      const permissionList = requiredPermissions
        .map(([res, act]) => `${act} ${res.replace(/_/g, ' ')}`)
        .join(', ');
      return `You need permission to: ${permissionList}`;
    }
    
    return "You don't have permission to access this feature.";
  };

  // Determine if retry is possible
  const canRetry = error?.type === PermissionErrorType.PERMISSION_CHECK_FAILED;

  return (
    <AccessDenied
      title={getTitle()}
      message={getMessage()}
      icon={getIcon()}
      onRetry={canRetry ? onRetry : undefined}
      onContactSupport={onContactSupport}
      compact={compact}
      style={style}
    />
  );
};

// Module-specific access denied component
interface ModuleAccessDeniedProps extends BaseAccessDeniedProps {
  moduleName: string;
  requiredPermissions?: string[];
}

export const ModuleAccessDenied: React.FC<ModuleAccessDeniedProps> = ({
  moduleName,
  requiredPermissions,
  onRetry,
  onContactSupport,
  compact = false,
  style,
}) => {
  const title = `${moduleName} Access Denied`;
  const message = requiredPermissions && requiredPermissions.length > 0
    ? `You need ${requiredPermissions.join(' or ')} permissions to access the ${moduleName} module.`
    : `You don't have permission to access the ${moduleName} module.`;

  return (
    <AccessDenied
      title={title}
      message={message}
      icon="folder-outline"
      onRetry={onRetry}
      onContactSupport={onContactSupport}
      compact={compact}
      style={style}
    />
  );
};

// Feature-specific access denied component
interface FeatureAccessDeniedProps extends BaseAccessDeniedProps {
  featureName: string;
  action?: string;
}

export const FeatureAccessDenied: React.FC<FeatureAccessDeniedProps> = ({
  featureName,
  action = 'access',
  onRetry,
  onContactSupport,
  compact = false,
  style,
}) => {
  const title = 'Feature Unavailable';
  const message = `You don't have permission to ${action} ${featureName}.`;

  return (
    <AccessDenied
      title={title}
      message={message}
      icon="ban-outline"
      onRetry={onRetry}
      onContactSupport={onContactSupport}
      compact={compact}
      style={style}
    />
  );
};

// Inline access denied component for buttons and small areas
interface InlineAccessDeniedProps {
  message?: string;
  style?: ViewStyle;
}

export const InlineAccessDenied: React.FC<InlineAccessDeniedProps> = ({
  message = "Access denied",
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.inlineContainer, style]}>
      <Ionicons name="lock-closed" size={16} color={colors['muted-foreground']} />
      <ThemedText style={[styles.inlineText, { color: colors['muted-foreground'] }]}>
        {message}
      </ThemedText>
    </View>
  );
};

// Disabled action indicator
interface DisabledActionIndicatorProps {
  children: React.ReactNode;
  reason?: string;
  showTooltip?: boolean;
  style?: ViewStyle;
}

export const DisabledActionIndicator: React.FC<DisabledActionIndicatorProps> = ({
  children,
  reason = "Action not permitted",
  showTooltip = false,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.disabledContainer, style]} pointerEvents="none">
      <View style={styles.disabledContent}>
        {children}
      </View>
      <View style={[styles.disabledOverlay, { backgroundColor: colors.background }]} />
      <Ionicons 
        name="lock-closed" 
        size={20} 
        color={colors['muted-foreground']} 
        style={styles.disabledIcon} 
      />
      {showTooltip && (
        <View style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ThemedText style={[styles.tooltipText, { color: colors['muted-foreground'] }]}>
            {reason}
          </ThemedText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  compactMessage: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inlineText: {
    marginLeft: 6,
    fontSize: 12,
  },
  disabledContainer: {
    position: 'relative',
  },
  disabledContent: {
    opacity: 0.4,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
    borderRadius: 8,
  },
  disabledIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tooltip: {
    position: 'absolute',
    top: -40,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    zIndex: 1000,
  },
  tooltipText: {
    fontSize: 12,
  },
});

export default {
  AccessDenied,
  PermissionAccessDenied,
  ModuleAccessDenied,
  FeatureAccessDenied,
  InlineAccessDenied,
  DisabledActionIndicator,
};