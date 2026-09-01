import { Tabs } from 'expo-router';
import React, { useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { roleBlocksFees } from '../../src/lib/menuUtils';
import { ThemedView } from '../../components/themed-view';
import { ThemedText } from '../../components/themed-text';

// Tab configuration with permission requirements
interface TabConfig {
  name: string;
  moduleResources: string[];
  requireAll?: boolean;
  alwaysShow?: boolean; // For tabs that should always be visible (like index, settings)
  hideForRoles?: string[]; // Role names (lowercase) that must never see this tab
}

const TAB_CONFIGS: TabConfig[] = [
  {
    name: 'index',
    moduleResources: [],
    alwaysShow: true,
  },
  {
    name: 'masters',
    moduleResources: ['academic_years', 'classes', 'subjects', 'holidays', 'timetables'],
    requireAll: false,
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Masters module
  },
  {
    name: 'students',
    moduleResources: [],
    alwaysShow: true,
  },
  {
    name: 'staff',
    moduleResources: ['staff', 'designations', 'staff_attendance'],
    requireAll: false,
  },
  {
    name: 'fees',
    moduleResources: [],
    alwaysShow: true,
    hideForRoles: ['teacher'], // Web parity: teachers are blocked from the Fee module
  },
  {
    name: 'transport',
    moduleResources: [],
    alwaysShow: true,
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Transport module
  },
  {
    name: 'reports',
    moduleResources: [],
    alwaysShow: true,
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'], // Web parity: student/parent have no Reports module
  },
  {
    name: 'admin',
    moduleResources: ['users', 'roles', 'permissions', 'menu', 'school_settings', 'announcements'],
    requireAll: false,
  },
  {
    name: 'exam',
    moduleResources: [],
    alwaysShow: true,
  },
  {
    name: 'communication',
    moduleResources: [],
    alwaysShow: true,
    // Web parity: student/parent have no Communication module (backend never sends
    // it in their menu). Aliases match the isStudentOrParent check inside the
    // screen itself — without this, parents saw a tab that dead-ended on an
    // "Access Restricted" screen.
    hideForRoles: ['student', 'parent', 'guardian', 'father', 'mother'],
  },
  {
    name: 'expense',
    moduleResources: ['expense_categories', 'expense_transactions', 'expense_types'],
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
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();
  const isInitialCheck = useRef(true);
  const { hasModuleAccess, isUserAuthenticated } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';

  // Calculate accessible tabs based on permissions
  const accessibleTabs = useMemo(() => {
    if (isLoading || !isAuthenticated) {
      return [];
    }

    return TAB_CONFIGS.filter(tab => {
      // Web parity: hide tabs explicitly blocked for this role (e.g. teacher → fees)
      if (tab.hideForRoles?.includes(roleName)) {
        return false;
      }

      // Always show tabs that don't require permissions
      if (tab.alwaysShow) {
        return true;
      }

      // Check module access for permission-based tabs
      return hasModuleAccess(tab.moduleResources);
    });
  }, [isLoading, isAuthenticated, hasModuleAccess, roleName]);

  // Handle authentication redirect
  useEffect(() => {
    if (!isInitialCheck.current && !isAuthenticated) {
      router.replace('/login');
    }
    isInitialCheck.current = false;
  }, [isAuthenticated, router]);

  // Handle case where user has no accessible tabs at all. Previously this only
  // counted permission-gated tabs (masters/staff/admin/expense), which wrongly
  // showed "Limited Access" for roles like parent/student/teacher that have no
  // grants for those four but still have legitimate always-show tabs (fees,
  // students, exam, profile, settings, ...).
  const hasAnyModuleAccess = useMemo(() => {
    return accessibleTabs.length > 0;
  }, [accessibleTabs]);

  // While unauthenticated, render nothing — the useEffect above will redirect to /login
  if (!isAuthenticated) {
    return null;
  }

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
          You don&apos;t have access to any modules.{'\n'}
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
