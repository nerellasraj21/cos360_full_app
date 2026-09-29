import React from 'react';
import { TouchableOpacity, View, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface BaseButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  accessibilityLabel?: string;
  testID?: string;
  haptics?: boolean;
  loadingColor?: string;
}

/**
 * Base button component with consistent styling, haptics, and accessibility
 * All other button types inherit from this
 */
export const BaseButton: React.FC<BaseButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  children,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  testID,
  haptics = true,
  loadingColor = 'white',
}) => {
  const isInteractive = !disabled && !loading;
  const opacity = disabled || loading ? 0.5 : 1;

  const handlePress = async () => {
    if (isInteractive && onPress) {
      if (haptics) {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
          // Haptics might fail on some devices, silently continue
        }
      }
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={isInteractive ? 0.75 : 1}
      style={[{ opacity }, style]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      accessible
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={loadingColor} />
        ) : (
          <>
            {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
            {children && <Text style={textStyle}>{children}</Text>}
            {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
});
