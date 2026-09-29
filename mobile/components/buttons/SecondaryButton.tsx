import React from 'react';
import { StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { BaseButton } from './BaseButton';

interface SecondaryButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptics?: boolean;
}

/**
 * Secondary action button (gray/outline)
 * Use for secondary actions like Cancel, Reset, Back
 */
export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  children,
  size = 'md',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  testID,
  style,
  textStyle,
  haptics = true,
}) => {
  const sizeStyles = sizeMap[size];
  const width = fullWidth ? { width: '100%' as const } : {};

  return (
    <BaseButton
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      iconPosition={iconPosition}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      haptics={haptics}
      style={[styles.button, sizeStyles, width, style]}
      textStyle={[styles.text, textStyle]}
      loadingColor="#6B7280"
    >
      {children}
    </BaseButton>
  );
};

const sizeMap = {
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  md: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  lg: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
