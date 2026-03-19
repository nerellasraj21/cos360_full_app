import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';

// Tab configuration with permission requirements
interface TabConfig {
  name: string;
  moduleResources: string[];
  requireAll?: boolean;
  alwaysShow?: boolean; // For tabs that should always be visible (like index, settings)
}

const TAB_CONFIGS: TabConfig[] = [
  {
    name: 'index',
    moduleResources: [],
    alwaysShow: true,
  },
  {
    name: 'students',
    moduleResources: ['students', 'student_admissions', 'student_attendance', 'student_documents'],
    requireAll: false,
  },
  {
    name: 'fees',
    moduleResources: ['fee_categories', 'fee_types', 'fee_terms', 'fee_transactions'],
    requireAll: false,
  },
  {
    name: 'masters',
    moduleResources: ['academic_years', 'classes', 'subjects', 'holidays', 'timetables'],
    requireAll: false,
  },
  {
    name: 'transport',
    moduleResources: ['routes', 'vehicles', 'transport_trips', 'transport_routes'],
    requireAll: false,
  },
  {
    name: 'staff',
    moduleResources: ['staff', 'designations', 'staff_attendance'],
    requireAll: false,
  },
  {
    name: 'expense',
    moduleResources: ['expense_categories', 'expense_transactions', 'expense_types'],
    requireAll: false,
  },
  {
    name: 'exam',
    moduleResources: ['exams', 'exam_marks', 'exam_results', 'exam_hall_tickets'],
    requireAll: false,
  },
  {
    name: 'profile',
    moduleResources: [],
    alwaysShow: true,
  },
  {
    name: 'settings',
    moduleResources: [],
    alwaysShow: true,
  },
];

export default function TabLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const isInitialCheck = useRef(true);
  const { hasModuleAccess, isUserAuthenticated } = useMobilePermission();

  // Calculate accessible tabs based on permissions
  const accessibleTabs = useMemo(() => {
    if (isLoading || !isAuthenticated) {
      return [];
    }

    return TAB_CONFIGS.filter(tab => {
      // Always show tabs that don't require permissions
      if (tab.alwaysShow) {
        return true;
      }

      // Check module access for permission-based tabs
      return hasModuleAccess(tab.moduleResources);
    });
  }, [isLoading, isAuthenticated, hasModuleAccess]);

  // Handle authentication redirect
  useEffect(() => {
    if (!isInitialCheck.current && !isAuthenticated) {
      router.replace('/login');
    }
    isInitialCheck.current = false;
  }, [isAuthenticated, router]);

  // Handle case where user has no accessible tabs (except always-show tabs)
  const hasAnyModuleAccess = useMemo(() => {
    return accessibleTabs.some(tab => !tab.alwaysShow);
  }, [accessibleTabs]);

  // Show loading state during permission verification
  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <ThemedText style={{ marginTop: 16, textAlign: 'center' }}>
          Loading permissions...
        </ThemedText>
      </ThemedView>
    );
  }

  // Show message if user has no module access
  if (isAuthenticated && !hasAnyModuleAccess) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <ThemedText style={{ 
          fontSize: 18, 
          fontWeight: '600', 
          textAlign: 'center',
          marginBottom: 8
        }}>
          Limited Access
        </ThemedText>
        <ThemedText style={{ 
          textAlign: 'center', 
          lineHeight: 20,
          opacity: 0.7
        }}>
          You don't have access to any modules.{'\n'}
          Please contact your administrator for access permissions.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide the default tab bar since we're using custom footer
      }}>
      {accessibleTabs.map(tab => (
        <Tabs.Screen 
          key={tab.name} 
          name={tab.name}
          options={{
            // Add any tab-specific options here if needed
          }}
        />
      ))}
    </Tabs>
  );
}
