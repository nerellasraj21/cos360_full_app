import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function TransportScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = colors;
  const { hasPermission } = useMobilePermission();

  const transportModules = [
   {
     id: 'routes',
     title: 'Routes',
     description: 'Manage transport routes and schedules',
     icon: 'bus-outline',
     screen: '/transport/routes',
     color: '#3B82F6',
   },
   {
     id: 'route-stops',
     title: 'Route Stops',
     description: 'Manage stops along transport routes',
     icon: 'location-outline',
     screen: '/transport/route-stops',
     color: '#EF4444',
   },
   {
     id: 'vehicles',
     title: 'Vehicles',
     description: 'Fleet management and maintenance',
     icon: 'car-outline',
     screen: '/transport/vehicles',
     color: '#10B981',
   },
   {
     id: 'trips',
     title: 'Trips',
     description: 'Assign vehicles and drivers to routes',
     icon: 'navigate-outline',
     screen: '/transport/trips',
     color: '#F59E0B',
   },
   {
     id: 'student-transport',
     title: 'Student Transport',
     description: 'Manage student transport assignments',
     icon: 'people-outline',
     screen: '/transport/studentTransport',
     color: '#8B5CF6',
   },
   {
     id: 'student-trips',
     title: 'Student Trips',
     description: 'Detailed student trip assignments with fees',
     icon: 'person-outline',
     screen: '/transport/studentTrips',
     color: '#06B6D4',
   },
 ];

  const renderModuleCard = (module: typeof transportModules[0]) => {
    const resourceMap: { [key: string]: string } = {
      'routes': PERMISSION_RESOURCES.TRANSPORT_ROUTES,
      'route-stops': PERMISSION_RESOURCES.TRANSPORT_ROUTE_STOPS,
      'vehicles': PERMISSION_RESOURCES.TRANSPORT_VEHICLES,
      'trips': PERMISSION_RESOURCES.TRANSPORT_TRIPS,
      'student-transport': PERMISSION_RESOURCES.STUDENT_TRANSPORT,
      'student-trips': PERMISSION_RESOURCES.STUDENT_TRANSPORT, // Using same resource for both student transport modules
    };

    const resource = resourceMap[module.id] || PERMISSION_RESOURCES.TRANSPORT_ROUTES;
    const hasAccess = hasPermission ? hasPermission(resource, 'list') : false;

    const handlePress = () => {
      if (hasAccess) {
        router.push(module.screen as any);
      }
    };

    return (
      <TouchableOpacity
        key={module.id}
        style={[
          styles.moduleCard, 
          { 
            backgroundColor: hasAccess ? themeColors.card : themeColors.muted,
            opacity: hasAccess ? 1 : 0.6
          }
        ]}
        onPress={handlePress}
        disabled={!hasAccess}
      >
        <View style={[
          styles.iconContainer, 
          { 
            backgroundColor: hasAccess 
              ? module.color + '20' 
              : themeColors['muted-foreground'] + '20'
          }
        ]}>
          {hasAccess ? (
            <Ionicons name={module.icon as any} size={32} color={module.color} />
          ) : (
            <Ionicons name="lock-closed" size={32} color={themeColors['muted-foreground']} />
          )}
        </View>
        <View style={styles.moduleInfo}>
          <ThemedText style={styles.moduleTitle}>{module.title}</ThemedText>
          <ThemedText style={styles.moduleDescription}>
            {hasAccess 
              ? module.description 
              : "You don't have permission to access this feature"
            }
          </ThemedText>
        </View>
        {hasAccess ? (
          <Ionicons name="chevron-forward" size={20} color={themeColors['muted-foreground']} />
        ) : (
          <Ionicons name="lock-closed" size={20} color={themeColors['muted-foreground']} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title="Transport">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={[styles.welcomeCard, { backgroundColor: themeColors.card }]}>
          <Ionicons name="bus" size={48} color={themeColors.primary} />
          <ThemedText style={styles.welcomeTitle}>Welcome to Transport</ThemedText>
          <ThemedText style={styles.welcomeText}>
            Manage your schools transportation system efficiently with our comprehensive tools.
          </ThemedText>
        </View>

        {/* Transport Modules */}
        <View style={styles.modulesSection}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Transport Modules
          </ThemedText>

          {transportModules.map(renderModuleCard)}
        </View>
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
  modulesSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
});