import React from 'react';
import { StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BaseButton } from './BaseButton';

interface IconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  accessibilityLabel: string; // Required for accessibility!
  testID?: string;
  style?: StyleProp<ViewStyle>;
  haptics?: boolean;
}

/**
 * Icon-only button with accessibility support
 * Requires accessibilityLabel for screen readers
 * Enforces minimum 48x48dp touch target
 */
export const IconButton: React.FC<IconButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  icon,
  size = 'md',
  variant = 'ghost',
  accessibilityLabel,
  testID,
  style,
  haptics = true,
}) => {
  const sizeStyles = sizeMap[size];
  const variantStyles = variantMap[variant];

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      haptics={haptics}
      style={[styles.button, sizeStyles, variantStyles, style]}
      loadingColor={variant === 'ghost' ? '#6B7280' : 'white'}
    />
  );
};

const sizeMap = {
  sm: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  md: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  lg: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
};

const variantMap = {
  primary: {
    backgroundColor: '#556ee6',
  },
  secondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
