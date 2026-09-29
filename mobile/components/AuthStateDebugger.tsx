import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from './themed-text';
import { useAuth } from '../contexts/AuthContext';

export const AuthStateDebugger: React.FC = () => {
  if (!__DEV__) return null;
  const authState = useAuth();
  
  const {
    user,
    role,
    permissions,
    permissionsMap,
    isAuthenticated,
    isLoading,
    error,
    selectedStudent,
    availableStudents,
    studentId,
    hasPermission
  } = authState;

  return (
    <ScrollView style={styles.container}>
      <ThemedText style={styles.title}>🔐 Auth State Debugger</ThemedText>
      
      {/* Authentication Status */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Authentication Status</ThemedText>
        <ThemedText style={[styles.status, isAuthenticated ? styles.success : styles.error]}>
          Authenticated: {isAuthenticated ? '✅ YES' : '❌ NO'}
        </ThemedText>
        <ThemedText style={[styles.status, isLoading ? styles.warning : styles.success]}>
          Loading: {isLoading ? '⏳ YES' : '✅ NO'}
        </ThemedText>
        {error && (
          <ThemedText style={[styles.status, styles.error]}>
            Error: {error}
          </ThemedText>
        )}
      </View>

      {/* User Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>User Information</ThemedText>
        <ThemedText>ID: {user?.id || 'N/A'}</ThemedText>
        <ThemedText>Username: {user?.username || 'N/A'}</ThemedText>
        <ThemedText>Email: {user?.email || 'N/A'}</ThemedText>
        <ThemedText>Active: {user?.is_active ? '✅' : '❌'}</ThemedText>
      </View>

      {/* Role Information */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Role Information</ThemedText>
        <ThemedText>Role ID: {role?.id || 'N/A'}</ThemedText>
        <ThemedText>Role Name: {role?.name || 'N/A'}</ThemedText>
        <ThemedText>Description: {role?.description || 'N/A'}</ThemedText>
      </View>

      {/* Student Information (for parents) */}
      {(selectedStudent || availableStudents?.length > 0) && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Student Information</ThemedText>
          <ThemedText>Selected Student: {selectedStudent?.name || 'None'}</ThemedText>
          <ThemedText>Available Students: {availableStudents?.length || 0}</ThemedText>
          <ThemedText>Student ID: {studentId || 'N/A'}</ThemedText>
        </View>
      )}

      {/* Permission Summary */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Permission Summary</ThemedText>
        <ThemedText>Total Permissions: {permissions?.length || 0}</ThemedText>
        <ThemedText>Permission Map Size: {Object.keys(permissionsMap || {}).length}</ThemedText>
        <ThemedText>Granted Permissions: {
          Object.values(permissionsMap || {}).filter(p => p?.is_granted).length
        }</ThemedText>
      </View>

      {/* Quick Permission Tests */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Quick Permission Tests</ThemedText>
        {[
          'classes:list',
          'classes:read',
          'sections:list', 
          'sections:read',
          'classes_sections:list',
          'classes_sections:read'
        ].map(permission => {
          const [resource, action] = permission.split(':');
          const result = hasPermission(resource, action);
          return (
            <ThemedText key={permission} style={[styles.permissionTest, result ? styles.success : styles.error]}>
              {result ? '✅' : '❌'} {permission}
            </ThemedText>
          );
        })}
      </View>

      {/* Raw Permissions Data */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Raw Permissions (First 20)</ThemedText>
        {permissions?.slice(0, 20).map((perm, index) => (
          <ThemedText key={index} style={styles.rawPermission}>
            {index + 1}. {perm.resource}:{perm.action} = {perm.is_granted ? '✅' : '❌'}
          </ThemedText>
        )) || <ThemedText style={styles.error}>No permissions found</ThemedText>}
        {permissions?.length > 20 && (
          <ThemedText style={styles.moreText}>
            ... and {permissions.length - 20} more permissions
          </ThemedText>
        )}
      </View>

      {/* Permission Map Keys */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Permission Map Keys (First 20)</ThemedText>
        {Object.keys(permissionsMap || {}).slice(0, 20).map((key, index) => (
          <ThemedText key={index} style={styles.mapKey}>
            {index + 1}. {key} = {permissionsMap[key]?.is_granted ? '✅' : '❌'}
          </ThemedText>
        )) || <ThemedText style={styles.error}>No permission map found</ThemedText>}
        {Object.keys(permissionsMap || {}).length > 20 && (
          <ThemedText style={styles.moreText}>
            ... and {Object.keys(permissionsMap).length - 20} more keys
          </ThemedText>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    margin: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007bff',
    maxHeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#007bff',
    color: 'white',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  section: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#495057',
  },
  status: {
    fontSize: 14,
    marginVertical: 2,
    padding: 4,
    borderRadius: 4,
  },
  success: {
    color: '#155724',
    backgroundColor: '#d4edda',
  },
  error: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
  },
  warning: {
    color: '#856404',
    backgroundColor: '#fff3cd',
  },
  permissionTest: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginVertical: 1,
    padding: 2,
  },
  rawPermission: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6c757d',
    marginVertical: 1,
  },
  mapKey: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#6c757d',
    marginVertical: 1,
  },
  moreText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#6c757d',
    marginTop: 4,
    textAlign: 'center',
  },
});