import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  hasAccess: boolean;
  onPress: () => void;
  badge?: string | number;
}

export default function ModuleCard({
  title,
  description,
  icon,
  color,
  hasAccess,
  onPress,
  badge,
}: ModuleCardProps) {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const activeColor = hasAccess ? color : '#9ca3af';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: borderCol },
        !hasAccess && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={!hasAccess}
      activeOpacity={0.72}
    >
      <View style={styles.row}>
        {/* Colored left accent bar */}
        <View style={[styles.leftAccent, { backgroundColor: activeColor }]} />

        {/* Icon box */}
        <View style={[styles.iconBox, { backgroundColor: activeColor + '18' }]}>
          <Ionicons
            name={hasAccess ? icon : 'lock-closed'}
            size={22}
            color={activeColor}
          />
        </View>

        {/* Text content */}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.desc, { color: colors['muted-foreground'] }]} numberOfLines={1}>
            {hasAccess ? description : 'No access — contact your admin'}
          </Text>
        </View>

        {/* Right: optional badge + chevron */}
        {badge !== undefined && hasAccess && (
          <View style={[styles.badge, { backgroundColor: activeColor + '18' }]}>
            <Text style={[styles.badgeText, { color: activeColor }]}>{badge}</Text>
          </View>
        )}
        <Ionicons
          name={hasAccess ? 'chevron-forward' : 'lock-closed'}
          size={16}
          color={colors['muted-foreground']}
          style={styles.chevron}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
    marginVertical: 14,
    marginRight: 14,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    paddingRight: 14,
  },
});
