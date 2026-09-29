import React, { useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ThemedText } from './themed-text';
import { useAuth } from '../contexts/AuthContext';

export const QuickDiagnostic: React.FC = () => {
  if (!__DEV__) return null;
  const { permissions, permissionsMap, hasPermission, isAuthenticated, user, role } = useAuth();

  useEffect(() => {
    // Run diagnostic on mount
    const runDiagnostic = () => {
      console.log('🚨 QUICK DIAGNOSTIC STARTING...');
      
      // Basic auth check
      console.log('1. Authentication:', {
        isAuthenticated,
        hasUser: !!user,
        hasRole: !!role,
        username: user?.username,
        roleName: role?.name
      });

      // Permission data check
      console.log('2. Permission Data:', {
        permissionsArrayLength: permissions?.length || 0,
        permissionsMapSize: Object.keys(permissionsMap || {}).length,
        firstFewPermissions: permissions?.slice(0, 5).map(p => `${p.resource}:${p.action}=${p.is_granted}`) || [],
        firstFewMapKeys: Object.keys(permissionsMap || {}).slice(0, 5)
      });

      // Test critical permissions
      const criticalTests = [
        'classes:list',
        'classes:read', 
        'sections:list',
        'sections:read',
        'classes_sections:list',
        'classes_sections:read'
      ];

      console.log('3. Critical Permission Tests:');
      criticalTests.forEach(permission => {
        const [resource, action] = permission.split(':');
        const result = hasPermission(resource, action);
        console.log(`   ${permission}: ${result ? '✅ PASS' : '❌ FAIL'}`);
      });

      // Check if any permissions exist at all
      const hasAnyPermissions = permissions && permissions.length > 0;
      const hasAnyGrantedPermissions = Object.values(permissionsMap || {}).some(p => p?.is_granted);

      console.log('4. Summary:', {
        hasAnyPermissions,
        hasAnyGrantedPermissions,
        diagnosis: getDiagnosis(isAuthenticated, hasAnyPermissions, hasAnyGrantedPermissions, criticalTests.some(p => {
          const [r, a] = p.split(':');
          return hasPermission(r, a);
        }))
      });

      console.log('🚨 QUICK DIAGNOSTIC COMPLETE');
    };

    if (isAuthenticated) {
      // Run after a short delay to ensure auth state is fully loaded
      setTimeout(runDiagnostic, 1000);
    }
  }, [isAuthenticated, permissions, permissionsMap, hasPermission, user, role]);

  const getDiagnosis = (auth: boolean, hasPerms: boolean, hasGranted: boolean, hasRequired: boolean): string => {
    if (!auth) return 'NOT_AUTHENTICATED';
    if (!hasPerms) return 'NO_PERMISSIONS_RECEIVED';
    if (!hasGranted) return 'NO_GRANTED_PERMISSIONS';
    if (!hasRequired) return 'MISSING_REQUIRED_PERMISSIONS';
    return 'ALL_GOOD';
  };

  const diagnosis = getDiagnosis(
    isAuthenticated,
    permissions && permissions.length > 0,
    Object.values(permissionsMap || {}).some(p => p?.is_granted),
    ['classes:list', 'sections:list', 'classes_sections:list'].some(p => {
      const [r, a] = p.split(':');
      return hasPermission(r, a);
    })
  );

  const getStatusColor = (diagnosis: string) => {
    switch (diagnosis) {
      case 'ALL_GOOD': return '#28a745';
      case 'NOT_AUTHENTICATED': return '#dc3545';
      case 'NO_PERMISSIONS_RECEIVED': return '#fd7e14';
      case 'NO_GRANTED_PERMISSIONS': return '#ffc107';
      case 'MISSING_REQUIRED_PERMISSIONS': return '#6f42c1';
      default: return '#6c757d';
    }
  };

  const getStatusMessage = (diagnosis: string) => {
    switch (diagnosis) {
      case 'ALL_GOOD': return '✅ Everything looks good!';
      case 'NOT_AUTHENTICATED': return '❌ User not authenticated';
      case 'NO_PERMISSIONS_RECEIVED': return '⚠️ No permissions received from backend';
      case 'NO_GRANTED_PERMISSIONS': return '⚠️ No permissions are granted';
      case 'MISSING_REQUIRED_PERMISSIONS': return '🔒 Missing required permissions';
      default: return '❓ Unknown status';
    }
  };

  return (
    <View style={[styles.container, { borderColor: getStatusColor(diagnosis) }]}>
      <ThemedText style={styles.title}>🩺 Quick Diagnostic</ThemedText>
      
      <View style={[styles.statusBox, { backgroundColor: getStatusColor(diagnosis) + '20' }]}>
        <ThemedText style={[styles.statusText, { color: getStatusColor(diagnosis) }]}>
          {getStatusMessage(diagnosis)}
        </ThemedText>
      </View>

      <View style={styles.details}>
        <ThemedText style={styles.detail}>Auth: {isAuthenticated ? '✅' : '❌'}</ThemedText>
        <ThemedText style={styles.detail}>User: {user?.username || 'None'}</ThemedText>
        <ThemedText style={styles.detail}>Role: {role?.name || 'None'}</ThemedText>
        <ThemedText style={styles.detail}>Permissions: {permissions?.length || 0}</ThemedText>
        <ThemedText style={styles.detail}>Map Size: {Object.keys(permissionsMap || {}).length}</ThemedText>
      </View>

      <ThemedText style={styles.instruction}>
        📱 Check console for detailed diagnostic logs
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  statusBox: {
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detail: {
    fontSize: 12,
    marginVertical: 2,
    minWidth: '45%',
  },
  instruction: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.7,
  },
});