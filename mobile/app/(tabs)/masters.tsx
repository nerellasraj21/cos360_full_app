import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';

export default function MastersScreen() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const { hasPermission } = useMobilePermission();

  const masterModules = [
    {
      id: 'academicyears',
      title: 'Academic Years',
      description: 'Manage academic year settings',
      icon: 'school' as const,
      route: '/masters/academicyears',
    },
    {
      id: 'classesandsections',
      title: 'Classes & Sections',
      description: 'Manage class and section configurations',
      icon: 'people' as const,
      route: '/masters/classesandsections',
    },
    {
      id: 'subjects',
      title: 'Subjects',
      description: 'Manage subject catalog',
      icon: 'book' as const,
      route: '/masters/subjects',
    },
    {
      id: 'subjectcategories',
      title: 'Subject Categories',
      description: 'Manage subject categories',
      icon: 'folder' as const,
      route: '/masters/subjectcategories',
    },
    {
      id: 'timetable',
      title: 'Timetable',
      description: 'Manage class timetables',
      icon: 'time' as const,
      route: '/masters/timetable',
    },
    {
      id: 'rolespermissions',
      title: 'Roles & Permissions',
      description: 'Manage user roles and permissions',
      icon: 'shield' as const,
      route: '/masters/rolespermissions',
    },
    {
      id: 'holidays',
      title: 'Holidays',
      description: 'Manage holiday calendar',
      icon: 'calendar' as const,
      route: '/masters/holidays',
    },
  ];

  const renderMasterModule = (module: typeof masterModules[0]) => {
    const resourceMap: { [key: string]: string } = {
      'academicyears': PERMISSION_RESOURCES.ACADEMIC_YEARS,
      'classesandsections': PERMISSION_RESOURCES.CLASSES, // Use CLASSES instead of CLASSES_SECTIONS
      'subjects': PERMISSION_RESOURCES.SUBJECTS,
      'subjectcategories': PERMISSION_RESOURCES.SUBJECT_CATEGORIES,
      'timetable': PERMISSION_RESOURCES.TIMETABLES,
      'rolespermissions': 'role_management', // Use the correct resource name
      'holidays': PERMISSION_RESOURCES.HOLIDAYS
    };

    const resource = resourceMap[module.id] || PERMISSION_RESOURCES.ACADEMIC_YEARS;
    const hasAccess = hasPermission ? hasPermission(resource, 'list') : false;

    const handlePress = () => {
      if (hasAccess) {
        router.push(module.route as any);
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
        <View style={styles.moduleHeader}>
          <View style={[
            styles.iconContainer,
            {
              backgroundColor: hasAccess ? themeColors.primary : themeColors['muted-foreground']
            }
          ]}>
            {hasAccess ? (
              <Ionicons name={module.icon} size={24} color="white" />
            ) : (
              <Ionicons name="lock-closed" size={24} color="white" />
            )}
          </View>
          <View style={styles.moduleInfo}>
            <ThemedText type="subtitle" style={styles.moduleTitle}>
              {module.title}
            </ThemedText>
            <ThemedText style={styles.moduleDescription}>
              {hasAccess
                ? module.description
                : "You don't have permission to access this feature"
              }
            </ThemedText>
          </View>
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
    <AppLayout title="Masters">
      <View style={styles.container}>
        <View style={styles.modulesContainer}>
          {masterModules.map(renderMasterModule)}
        </View>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  modulesContainer: {
    gap: 12,
  },
  moduleCard: {
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
  moduleHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
});