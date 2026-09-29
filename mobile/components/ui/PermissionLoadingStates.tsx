import React from 'react';
import { View, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { ThemedTouchableOpacity } from '../themed-touchable-opacity';
import { useTheme } from '@/contexts/ThemeContext';
import { Skeleton } from '../LoadingIndicator';

// Base interface for loading components
interface BaseLoadingProps {
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
}

// Permission verification loading component
interface PermissionLoadingProps extends BaseLoadingProps {
  message?: string;
  showIcon?: boolean;
  compact?: boolean;
}

export const PermissionLoading: React.FC<PermissionLoadingProps> = ({
  message = "Checking permissions...",
  showIcon = true,
  compact = false,
  size = 'medium',
  style,
}) => {
  const { colors } = useTheme();

  const getSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 40;
      default: return 30;
    }
  };

  if (compact) {
    return (
      <ThemedView style={[styles.compactContainer, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <ThemedText style={[styles.compactMessage, { color: colors['muted-foreground'] }]}>
          {message}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, style]}>
      <View style={styles.content}>
        {showIcon && (
          <Ionicons 
            name="shield-checkmark-outline" 
            size={getSize() + 20} 
            color={colors.primary} 
            style={styles.icon} 
          />
        )}
        
        <ActivityIndicator 
          size={size === 'small' ? 'small' : 'large'} 
          color={colors.primary} 
          style={styles.spinner}
        />
        
        <ThemedText style={[styles.message, { color: colors['muted-foreground'] }]}>
          {message}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

// Screen-level permission loading
interface ScreenPermissionLoadingProps extends BaseLoadingProps {
  screenName?: string;
}

export const ScreenPermissionLoading: React.FC<ScreenPermissionLoadingProps> = ({
  screenName,
  size = 'large',
  style,
}) => {
  const message = screenName 
    ? `Verifying access to ${screenName}...`
    : "Verifying screen access...";

  return (
    <PermissionLoading
      message={message}
      size={size}
      style={StyleSheet.flatten([styles.screenLoading, style])}
    />
  );
};

// Component-level permission loading
interface ComponentPermissionLoadingProps extends BaseLoadingProps {
  componentName?: string;
}

export const ComponentPermissionLoading: React.FC<ComponentPermissionLoadingProps> = ({
  componentName,
  size = 'small',
  style,
}) => {
  const message = componentName 
    ? `Loading ${componentName}...`
    : "Loading...";

  return (
    <PermissionLoading
      message={message}
      size={size}
      compact={true}
      style={style}
    />
  );
};

// API permission loading
interface APIPermissionLoadingProps extends BaseLoadingProps {
  operation?: string;
}

export const APIPermissionLoading: React.FC<APIPermissionLoadingProps> = ({
  operation = "operation",
  size = 'medium',
  style,
}) => {
  return (
    <PermissionLoading
      message={`Verifying permission for ${operation}...`}
      size={size}
      showIcon={false}
      compact={true}
      style={style}
    />
  );
};

// Permission skeleton loader for lists and cards
interface PermissionSkeletonProps {
  count?: number;
  itemHeight?: number;
  showHeader?: boolean;
  style?: ViewStyle;
}

export const PermissionSkeleton: React.FC<PermissionSkeletonProps> = ({
  count = 3,
  itemHeight = 60,
  showHeader = false,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.skeletonContainer, style]}>
      {showHeader && (
        <View style={styles.skeletonHeader}>
          <Skeleton width="30%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width="60%" height={16} />
        </View>
      )}
      
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.skeletonItem, { height: itemHeight }]}>
          <Skeleton width={40} height={40} borderRadius={20} />
          <View style={styles.skeletonContent}>
            <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="50%" height={14} />
          </View>
          <Skeleton width={24} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
};

// Button loading state for permission-protected actions
interface PermissionButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export const PermissionButtonLoading: React.FC<PermissionButtonLoadingProps> = ({
  loading,
  children,
  disabled = false,
  style,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <ThemedTouchableOpacity
      style={[
        styles.buttonContainer,
        { backgroundColor: colors.primary },
        (loading || disabled) && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading && (
        <ActivityIndicator 
          size="small" 
          color="white" 
          style={styles.buttonSpinner} 
        />
      )}
      <ThemedText style={[
        styles.buttonText,
        loading && styles.buttonTextLoading,
      ]}>
        {children}
      </ThemedText>
    </ThemedTouchableOpacity>
  );
};

// Inline permission loading for small components
interface InlinePermissionLoadingProps {
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export const InlinePermissionLoading: React.FC<InlinePermissionLoadingProps> = ({
  size = 16,
  color,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <ActivityIndicator
      size="small"
      color={color || colors.primary}
      style={[{ width: size, height: size }, style]}
    />
  );
};

// Permission check progress indicator
interface PermissionProgressProps {
  current: number;
  total: number;
  message?: string;
  style?: ViewStyle;
}

export const PermissionProgress: React.FC<PermissionProgressProps> = ({
  current,
  total,
  message = "Checking permissions",
  style,
}) => {
  const { colors } = useTheme();
  const progress = Math.min(current / total, 1);

  return (
    <View style={[styles.progressContainer, style]}>
      <ThemedText style={[styles.progressMessage, { color: colors['muted-foreground'] }]}>
        {message} ({current}/{total})
      </ThemedText>
      
      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <View 
          style={[
            styles.progressFill, 
            { 
              backgroundColor: colors.primary,
              width: `${progress * 100}%`,
            }
          ]} 
        />
      </View>
    </View>
  );
};

// Loading overlay for full-screen permission checks
interface PermissionLoadingOverlayProps {
  visible: boolean;
  message?: string;
  onCancel?: () => void;
  cancelable?: boolean;
}

export const PermissionLoadingOverlay: React.FC<PermissionLoadingOverlayProps> = ({
  visible,
  message = "Verifying permissions...",
  onCancel,
  cancelable = false,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.overlayContent, { backgroundColor: colors.card }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText style={[styles.overlayMessage, { color: colors.foreground }]}>
          {message}
        </ThemedText>
        
        {cancelable && onCancel && (
          <ThemedTouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <ThemedText style={[styles.cancelButtonText, { color: colors['muted-foreground'] }]}>
              Cancel
            </ThemedText>
          </ThemedTouchableOpacity>
        )}
      </View>
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
  },
  icon: {
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  compactMessage: {
    marginLeft: 12,
    fontSize: 14,
  },
  screenLoading: {
    minHeight: 200,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonHeader: {
    marginBottom: 20,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonSpinner: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextLoading: {
    opacity: 0.8,
  },
  progressContainer: {
    padding: 16,
  },
  progressMessage: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    borderRadius: 12,
    padding: 24,
    minWidth: 200,
    alignItems: 'center',
  },
  overlayMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default {
  PermissionLoading,
  ScreenPermissionLoading,
  ComponentPermissionLoading,
  APIPermissionLoading,
  PermissionSkeleton,
  PermissionButtonLoading,
  InlinePermissionLoading,
  PermissionProgress,
  PermissionLoadingOverlay,
};