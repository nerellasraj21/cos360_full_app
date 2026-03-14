import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

interface LoadingIndicatorProps {
  size?: 'small' | 'large' | number;
  color?: string;
  message?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  style?: any;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'large',
  color,
  message,
  fullScreen = false,
  overlay = false,
  style,
}) => {
  const { theme, colors } = useTheme();

  const indicatorColor = color || colors.primary;

  const content = (
    <View style={[styles.container, style]}>
      <ActivityIndicator
        size={size}
        color={indicatorColor}
        style={styles.indicator}
      />
      {message && (
        <ThemedText style={[styles.message, { color: colors['muted-foreground'] }]}>
          {message}
        </ThemedText>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <ThemedView style={[styles.fullScreen, overlay && styles.overlay]}>
        {content}
      </ThemedView>
    );
  }

  return content;
};

// Skeleton loading component for content placeholders
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const { theme, colors } = useTheme();

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors['muted'],
        },
        style,
      ]}
    />
  );
};

// Skeleton list for loading multiple items
interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  spacing?: number;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 5,
  itemHeight = 60,
  spacing = 12,
}) => {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.skeletonItem, { marginBottom: spacing }]}>
          <Skeleton width={itemHeight} height={itemHeight} borderRadius={itemHeight / 2} />
          <View style={styles.skeletonContent}>
            <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
            <Skeleton width="50%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
};

// Inline loading spinner for buttons and small areas
interface InlineLoaderProps {
  size?: 'small' | 'large';
  color?: string;
  style?: any;
}

export const InlineLoader: React.FC<InlineLoaderProps> = ({
  size = 'small',
  color,
  style,
}) => {
  const { theme, colors } = useTheme();

  return (
    <ActivityIndicator
      size={size}
      color={color || colors.primary}
      style={[styles.inlineLoader, style]}
    />
  );
};

// Loading button component
interface LoadingButtonProps {
  loading: boolean;
  children: React.ReactNode;
  loaderColor?: string;
  disabled?: boolean;
  style?: any;
  onPress?: () => void;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading,
  children,
  loaderColor = 'white',
  disabled,
  style,
  onPress,
}) => {
  return (
    <View style={[styles.loadingButton, style]}>
      {loading && <InlineLoader color={loaderColor} style={styles.buttonLoader} />}
      <Text style={[styles.buttonText, loading && styles.buttonTextLoading]}>
        {children}
      </Text>
    </View>
  );
};

// Loading overlay for modals and full-screen operations
interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  transparent = false,
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.overlay, transparent && styles.transparentOverlay]}>
      <View style={styles.overlayContent}>
        <LoadingIndicator size="large" message={message} />
      </View>
    </View>
  );
};

// Pull-to-refresh loading indicator
interface PullToRefreshLoaderProps {
  refreshing: boolean;
  onRefresh?: () => void;
  colors?: string[];
  tintColor?: string;
}

export const PullToRefreshLoader: React.FC<PullToRefreshLoaderProps> = ({
  refreshing,
  onRefresh,
  colors,
  tintColor,
}) => {
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
    const { theme } = useTheme();

  const colorsArray = colors || [Colors[theme].primary];

  // This is a utility function that returns refresh control props
  // It's not a React component itself
  return null;
};

// Utility function to get pull-to-refresh props
export const getPullToRefreshProps = (
  refreshing: boolean,
  onRefresh?: () => void,
  colors?: string[],
  tintColor?: string
) => {
  const { theme } = useTheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const colorsArray = colors || [Colors[theme].primary];

  return {
    refreshing,
    onRefresh,
    colors: colorsArray,
    tintColor: tintColor || colorsArray[0],
  };
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  indicator: {
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  transparentOverlay: {
    backgroundColor: 'transparent',
  },
  overlayContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  skeleton: {
    opacity: 0.5,
  },
  skeletonList: {
    padding: 16,
  },
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  inlineLoader: {
    marginRight: 8,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLoader: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextLoading: {
    opacity: 0.7,
  },
});

export default LoadingIndicator;