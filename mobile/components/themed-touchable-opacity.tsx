import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTouchableOpacityProps = TouchableOpacityProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedTouchableOpacity({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedTouchableOpacityProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <TouchableOpacity style={[{ backgroundColor }, style]} {...otherProps} />;
}