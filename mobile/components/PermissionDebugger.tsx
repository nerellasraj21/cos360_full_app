import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useAuth } from '../contexts/AuthContext';
import { useMobilePermission } from '../src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '../src/types/permissions';

export const PermissionDebugger: React.FC = () => {
  const { permissions, permissionsMap, user, role } = useAuth();
  const { 
    checkPermission, 
    getAllPermissions, 
    hasModuleAccess,
    canRead,
    canList 
  } = useMobilePermission();

  const testPermissions = [
    'classes:list',
    'classes:read',
    'sections:list', 
    'sections:read',
    'classes_sections:list',
    'classes_sections:read',
    'academic_years:list',
    'academic_years:read',
    'subjects:list',
    'subjects:read'
  ];

  const moduleResources = ['classes', 'sections', 'classes_sections', 'academic_years', 'subjects'];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Permission Debugger</ThemedText>
      
      <ScrollView style={styles.scrollView}>
        {/* User Info */}
        <View style={styles.section}>
          <ThemedText type="subtitle">User Info</ThemedText>
          <ThemedText>Username: {user?.username || 'N/A'}</ThemedText>
          <ThemedText>Role: {role?.name || 'N/A'}</ThemedText>
          <ThemedText>Total Permissions: {permissions.length}</ThemedText>
        </View>

        {/* Permission Tests */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Permission Tests</ThemedText>
          {testPermissions.map(permission => {
            const [resource, action] = permission.split(':');
            const hasPermission = checkPermission(resource, action);
            return (
              <View key={permission} style={styles.permissionRow}>
                <ThemedText style={[styles.permissionText, hasPermission ? styles.granted : styles.denied]}>
                  {permission}: {hasPermission ? '✅' : '❌'}
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* Module Access Tests */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Module Access Tests</ThemedText>
          {moduleResources.map(resource => {
            const hasAccess = hasModuleAccess([resource]);
            return (
              <View key={resource} style={styles.permissionRow}>
                <ThemedText style={[styles.permissionText, hasAccess ? styles.granted : styles.denied]}>
                  {resource} module: {hasAccess ? '✅' : '❌'}
                </ThemedText>
              </View>
            );
          })}
        </View>

        {/* Resource-specific Tests */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Resource-specific Tests</ThemedText>
          <ThemedText style={[styles.permissionText, canRead(PERMISSION_RESOURCES.CLASSES) ? styles.granted : styles.denied]}>
            Can read classes: {canRead(PERMISSION_RESOURCES.CLASSES) ? '✅' : '❌'}
          </ThemedText>
          <ThemedText style={[styles.permissionText, canList(PERMISSION_RESOURCES.CLASSES) ? styles.granted : styles.denied]}>
            Can list classes: {canList(PERMISSION_RESOURCES.CLASSES) ? '✅' : '❌'}
          </ThemedText>
          <ThemedText style={[styles.permissionText, canRead(PERMISSION_RESOURCES.SECTIONS) ? styles.granted : styles.denied]}>
            Can read sections: {canRead(PERMISSION_RESOURCES.SECTIONS) ? '✅' : '❌'}
          </ThemedText>
          <ThemedText style={[styles.permissionText, canList(PERMISSION_RESOURCES.SECTIONS) ? styles.granted : styles.denied]}>
            Can list sections: {canList(PERMISSION_RESOURCES.SECTIONS) ? '✅' : '❌'}
          </ThemedText>
        </View>

        {/* All Permissions */}
        <View style={styles.section}>
          <ThemedText type="subtitle">All Permissions</ThemedText>
          {Object.entries(getAllPermissions()).map(([resource, actions]) => (
            <View key={resource} style={styles.resourceGroup}>
              <ThemedText style={styles.resourceName}>{resource}:</ThemedText>
              <ThemedText style={styles.actions}>  {actions.join(', ')}</ThemedText>
            </View>
          ))}
        </View>

        {/* Raw Permission Map */}
        <View style={styles.section}>
          <ThemedText type="subtitle">Raw Permission Map</ThemedText>
          {Object.keys(permissionsMap).map(key => (
            <ThemedText key={key} style={styles.rawPermission}>
              {key}: {permissionsMap[key]?.is_granted ? '✅' : '❌'}
            </ThemedText>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  permissionRow: {
    marginVertical: 2,
  },
  permissionText: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  granted: {
    color: '#10B981',
  },
  denied: {
    color: '#EF4444',
  },
  resourceGroup: {
    marginVertical: 4,
  },
  resourceName: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  actions: {
    fontSize: 12,
    opacity: 0.8,
  },
  rawPermission: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginVertical: 1,
  },
});