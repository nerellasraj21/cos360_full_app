import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getStatusColors, getStatusColorsDark, getStatusLabel } from '../../src/utils/statusColors';
import type { StatusKey } from '../../src/utils/statusColors';

interface StatusBadgeProps {
  status: StatusKey;
  /** Override the display label */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, label, size = 'md' }: StatusBadgeProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const colors = isDark ? getStatusColorsDark(status) : getStatusColors(status);
  const displayLabel = label ?? getStatusLabel(status);
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingHorizontal: isSm ? 6 : 8,
          paddingVertical: isSm ? 1 : 3,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: isSm ? 10 : 12,
          },
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});

export default StatusBadge;
