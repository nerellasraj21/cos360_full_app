import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/contexts';

interface FooterItem {
  key: string;
  label: string;
  icon: string;
  route: string;
  comingSoon?: boolean;
}

const footerItems: FooterItem[] = [
  {
    key: 'home',
    label: 'Home',
    icon: 'house.fill',
    route: '/(tabs)',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'gear',
    route: '/(tabs)/settings',
  },
  {
    key: 'notification',
    label: 'Notification',
    icon: 'bell.fill',
    route: '/notification',
    comingSoon: true,
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person.fill',
    route: '/(tabs)/profile',
  },
];

export default function AppFooter() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handlePress = (item: FooterItem) => {
    if (item.comingSoon) {
      // You can add a toast notification here
      return;
    }
    router.push(item.route as any);
  };

  const isActive = (route: string) => {
    if (route === '/(tabs)') {
      return pathname === '/' || pathname.startsWith('/(tabs)');
    }
    return pathname === route;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {footerItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.footerItem}
            onPress={() => handlePress(item)}
            disabled={item.comingSoon}
          >
            <View style={styles.iconContainer}>
              <IconSymbol
                name={item.icon as any}
                size={24}
                color={isActive(item.route) ? colors.primary : colors.tabIconDefault}
              />
              {item.comingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>Soon</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.footerLabel,
                {
                  color: isActive(item.route) ? colors.primary : colors.tabIconDefault,
                },
                item.comingSoon && styles.comingSoonLabel,
              ]}
            >
              {item.comingSoon ? 'Coming Soon' : item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  comingSoonText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  comingSoonLabel: {
    opacity: 0.6,
  },
});