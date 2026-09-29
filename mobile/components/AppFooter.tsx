import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts';

interface FooterItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
  comingSoon?: boolean;
}

const footerItems: FooterItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'home-outline',
    activeIcon: 'home',
    route: '/(tabs)',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings-outline',
    activeIcon: 'settings',
    route: '/(tabs)/settings',
  },
  {
    key: 'notification',
    label: 'Alerts',
    icon: 'notifications-outline',
    activeIcon: 'notifications',
    route: '/notification',
    comingSoon: true,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    route: '/(tabs)/profile',
  },
];

export default function AppFooter() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handlePress = (item: FooterItem) => {
    if (item.comingSoon) return;
    router.push(item.route as any);
  };

  const isActive = (route: string) => {
    if (route === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname === route || pathname.startsWith(route + '/');
  };

  const footerBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: footerBg }]} edges={['bottom']}>
      <View style={[styles.footer, { backgroundColor: footerBg, borderTopColor: borderColor }]}>
        {footerItems.map((item) => {
          const active = isActive(item.route);
          return (
            <TouchableOpacity
              key={item.key}
              style={styles.footerItem}
              onPress={() => handlePress(item)}
              disabled={item.comingSoon}
              activeOpacity={0.7}
            >
              {/* Active pill background */}
              <View style={[styles.iconPill, active && styles.iconPillActive]}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={24}
                  color={active ? '#ffffff' : colors.tabIconDefault}
                />
                {item.comingSoon && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeDotText}>!</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.footerLabel,
                  { color: active ? colors.primary : colors.tabIconDefault },
                  active && styles.footerLabelActive,
                  item.comingSoon && { opacity: 0.45 },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  iconPill: {
    width: 44,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
    position: 'relative',
  },
  iconPillActive: {
    backgroundColor: '#556ee6',
  },
  badgeDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeDotText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '800',
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerLabelActive: {
    fontWeight: '700',
  },
});
