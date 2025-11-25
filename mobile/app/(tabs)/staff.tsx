import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function StaffScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = colors;
  const { hasPermission } = useMobilePermission();

  const menuItems = [
    {
      id: 'enrollment',
      title: 'Staff Enrollment',
      subtitle: 'View and manage staff enrollments',
      icon: 'people',
      route: '/staff/enrollment',
    },
    {
      id: 'attendance',
      title: 'Staff Attendance',
      subtitle: 'Track and manage staff attendance',
      icon: 'calendar',
      route: '/staff/attendance',
    },
    {
      id: 'designations',
      title: 'Staff Designations',
      subtitle: 'Manage staff roles and positions',
      icon: 'ribbon',
      route: '/staff/designations',
    },
    {
      id: 'profile',
      title: 'Staff Profile',
      subtitle: 'View and edit your profile',
      icon: 'person',
      route: '/staff/profile',
    },
  ];

  const handleMenuPress = (route: string, hasAccess: boolean) => {
    if (hasAccess) {
      router.push(route as any);
    }
  };

  return (
    <AppLayout title="Staff Management">
      <View style={styles.container}>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => {
            const resourceMap: { [key: string]: string } = {
              'enrollment': PERMISSION_RESOURCES.STAFF,
              'attendance': PERMISSION_RESOURCES.STAFF_ATTENDANCE,
              'designations': PERMISSION_RESOURCES.STAFF_DESIGNATIONS,
              'profile': PERMISSION_RESOURCES.STAFF
            };

            const resource = resourceMap[item.id] || PERMISSION_RESOURCES.STAFF;
            const hasAccess = hasPermission ? hasPermission(resource, 'list') : false;

            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuCard, 
                  { 
                    backgroundColor: hasAccess ? themeColors.card : themeColors.muted,
                    opacity: hasAccess ? 1 : 0.6
                  }
                ]}
                onPress={() => handleMenuPress(item.route, hasAccess)}
                disabled={!hasAccess}
              >
                <View style={styles.menuIcon}>
                  <Ionicons 
                    name={hasAccess ? item.icon as any : "lock-closed"} 
                    size={32} 
                    color={hasAccess ? themeColors.primary : themeColors['muted-foreground']} 
                  />
                </View>
                <View style={styles.menuContent}>
                  <ThemedText type="subtitle" style={styles.menuTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={styles.menuSubtitle}>
                    {hasAccess 
                      ? item.subtitle 
                      : "You don't have permission to access this feature"
                    }
                  </ThemedText>
                </View>
                <Ionicons 
                  name={hasAccess ? "chevron-forward" : "lock-closed"} 
                  size={24} 
                  color={themeColors['muted-foreground']} 
                />
              </TouchableOpacity>
            );
          })}
        </View>
{/* 
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: themeColors.card }]}>
          <Ionicons name="people" size={24} color={themeColors.primary} />
          <View style={styles.statContent}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              4
            </ThemedText>
            <ThemedText style={styles.statLabel}>Total Staff</ThemedText>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: themeColors.card }]}>
          <Ionicons name="people-circle" size={24} color={themeColors.primary} />
          <View style={styles.statContent}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              2
            </ThemedText>
            <ThemedText style={styles.statLabel}>Parents</ThemedText>
          </View>
        </View>

        <View style={[styles.statCard, { backgroundColor: themeColors.card }]}>
          <Ionicons name="ribbon" size={24} color={themeColors.primary} />
          <View style={styles.statContent}>
            <ThemedText type="subtitle" style={styles.statNumber}>
              4
            </ThemedText>
            <ThemedText style={styles.statLabel}>Designations</ThemedText>
          </View>
        </View>
      </View> */}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  menuContainer: {
    gap: 12,
    marginBottom: 24,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    marginLeft: 12,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
});