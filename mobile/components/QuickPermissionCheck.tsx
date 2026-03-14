import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { useAuth } from '../contexts/AuthContext';

export const QuickPermissionCheck: React.FC = () => {
  const { permissions, permissionsMap, hasPermission, user, role, isAuthenticated } = useAuth();

  // Test the specific permissions needed for classes and sections
  const testPermissions = [
    'classes:list',
    'classes:read', 
    'sections:list',
    'sections:read',
    'classes_sections:list',
    'classes_sections:read'
  ];

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.error}>❌ Not authenticated</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>🔍 Quick Permission Check</ThemedText>
      
      <View style={styles.userInfo}>
        <ThemedText>👤 User: {user?.username || 'Unknown'}</ThemedText>
        <ThemedText>🎭 Role: {role?.name || 'Unknown'}</ThemedText>
        <ThemedText>📊 Total Permissions: {permissions.length}</ThemedText>
        <ThemedText>🗝️ Permission Map Size: {Object.keys(permissionsMap).length}</ThemedText>
      </View>

      <View style={styles.permissionTests}>
        <ThemedText style={styles.subtitle}>Permission Tests:</ThemedText>
        {testPermissions.map(permission => {
          const [resource, action] = permission.split(':');
          const result = hasPermission(resource, action);
          return (
            <View key={permission} style={styles.permissionRow}>
              <ThemedText style={[styles.permissionText, result ? styles.success : styles.error]}>
                {result ? '✅' : '❌'} {permission}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={styles.rawPermissions}>
        <ThemedText style={styles.subtitle}>Raw Permissions (first 10):</ThemedText>
        {permissions.slice(0, 10).map((perm, index) => (
          <ThemedText key={index} style={styles.rawPermission}>
            {perm.resource}:{perm.action} = {perm.is_granted ? '✅' : '❌'}
          </ThemedText>
        ))}
        {permissions.length > 10 && (
          <ThemedText style={styles.moreText}>... and {permissions.length - 10} more</ThemedText>
        )}
      </View>

      <View style={styles.permissionMapKeys}>
        <ThemedText style={styles.subtitle}>Permission Map Keys (first 10):</ThemedText>
        {Object.keys(permissionsMap).slice(0, 10).map((key, index) => (
          <ThemedText key={index} style={styles.mapKey}>
            {key} = {permissionsMap[key]?.is_granted ? '✅' : '❌'}
          </ThemedText>
        ))}
        {Object.keys(permissionsMap).length > 10 && (
          <ThemedText style={styles.moreText}>... and {Object.keys(permissionsMap).length - 10} more</ThemedText>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007bff',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    color: '#495057',
  },
  userInfo: {
    marginBottom: 12,
  },
  permissionTests: {
    marginBottom: 12,
  },
  permissionRow: {
    marginVertical: 2,
  },
  permissionText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  success: {
    color: '#28a745',
  },
  error: {
    color: '#dc3545',
  },
  rawPermissions: {
    marginBottom: 12,
  },
  rawPermission: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6c757d',
  },
  permissionMapKeys: {
    marginBottom: 12,
  },
  mapKey: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6c757d',
  },
  moreText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#6c757d',
    marginTop: 4,
  },
});