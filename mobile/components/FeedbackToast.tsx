import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastProps extends ToastMessage {
  onDismiss: (id: string) => void;
  position: 'top' | 'bottom';
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  action,
  onDismiss,
  position,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(position === 'top' ? -100 : 100));
  const { theme, colors } = useTheme();

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(id);
    });
  };

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          background: colors.primary,
          icon: 'checkmark-circle',
          iconColor: 'white',
        };
      case 'error':
        return {
          background: colors.destructive,
          icon: 'close-circle',
          iconColor: 'white',
        };
      case 'warning':
        return {
          background: '#f59e0b', // amber-500
          icon: 'warning',
          iconColor: 'white',
        };
      case 'info':
      default:
        return {
          background: colors.secondary,
          icon: 'information-circle',
          iconColor: colors.secondary,
        };
    }
  };

  const { background, icon, iconColor } = getToastColors();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: background,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={icon as any} size={24} color={iconColor} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: 'white' }]}>{title}</Text>
          {message && (
            <Text style={[styles.message, { color: 'rgba(255, 255, 255, 0.9)' }]}>
              {message}
            </Text>
          )}
        </View>
        {action && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              action.onPress();
              dismiss();
            }}
          >
            <Text style={[styles.actionText, { color: 'white' }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.dismissButton} onPress={dismiss}>
        <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Toast container component
interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  position: 'top' | 'bottom';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position,
}) => {
  if (toasts.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        position === 'top' ? styles.topContainer : styles.bottomContainer,
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={onDismiss}
          position={position}
        />
      ))}
    </View>
  );
};

// Toast manager hook
export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    type: ToastType,
    title: string,
    message?: string,
    options?: {
      duration?: number;
      action?: { label: string; onPress: () => void };
    }
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const toast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: options?.duration,
      action: options?.action,
    };

    setToasts((prev) => [...prev, toast]);

    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const dismissAllToasts = () => {
    setToasts([]);
  };

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
    showSuccess: (title: string, message?: string, options?: any) =>
      showToast('success', title, message, options),
    showError: (title: string, message?: string, options?: any) =>
      showToast('error', title, message, options),
    showWarning: (title: string, message?: string, options?: any) =>
      showToast('warning', title, message, options),
    showInfo: (title: string, message?: string, options?: any) =>
      showToast('info', title, message, options),
  };
};

// Success feedback component
interface SuccessFeedbackProps {
  message: string;
  onComplete?: () => void;
}

export const SuccessFeedback: React.FC<SuccessFeedbackProps> = ({
  message,
  onComplete,
}) => {
  const [scaleAnim] = useState(new Animated.Value(0));
  const { theme, colors } = useTheme();

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 3,
      }),
      Animated.delay(1500),
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  }, []);

  return (
    <Animated.View
      style={[
        styles.successFeedback,
        {
          backgroundColor: colors.primary,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={32} color="white" />
      <Text style={[styles.successText, { color: 'white' }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  topContainer: {
    top: 50,
  },
  bottomContainer: {
    bottom: 50,
  },
  toast: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 18,
  },
  actionButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    marginLeft: 8,
    padding: 4,
  },
  successFeedback: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -50 }],
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default Toast;