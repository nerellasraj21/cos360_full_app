import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PermissionDebugger } from '@/components/PermissionDebugger';
import { useAuth } from '@/contexts/AuthContext';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { runPermissionTests } from '@/utils/verify-permissions';

export default function PermissionTestScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const themeColors = Colors[theme];
  
  const { permissions, permissionsMap, role, user } = useAuth();
  const { checkPermission, getAllPermissions } = useMobilePermission();

  const testPermissions = [
    { resource: 'classes', action: 'list' },
    { resource: 'classes', action: 'read' },
    { resource: 'sections', action: 'list' },
    { resource: 'sections', action: 'read' },
    { resource: 'classes_sections', action: 'list' },
    { resource: 'classes_sections', action: 'read' },
    { resource: 'academic_years', action: 'list' },
    { resource: 'academic_years', action: 'read' },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="title">Permission Test</ThemedText>
        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: themeColors.primary }]}
          onPress={() => runPermissionTests()}
        >
          <ThemedText style={styles.testButtonText}>Run Tests</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Summary */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle">Quick Summary</ThemedText>
          <ThemedText>User: {user?.username}</ThemedText>
          <ThemedText>Role: {role?.name}</ThemedText>
          <ThemedText>Total Permissions: {permissions.length}</ThemedText>
          <ThemedText>Permission Map Keys: {Object.keys(permissionsMap).length}</ThemedText>
        </View>

        {/* Permission Tests */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle">Permission Tests</ThemedText>
          {testPermissions.map(({ resource, action }) => {
            const hasPermission = checkPermission(resource, action);
            const permissionKey = `${resource}:${action}`;
            const rawPermission = permissionsMap[permissionKey];
            
            return (
              <View key={permissionKey} style={styles.testRow}>
                <View style={styles.testInfo}>
                  <ThemedText style={styles.permissionKey}>{permissionKey}</ThemedText>
                  <ThemedText style={styles.testDetails}>
                    Hook Result: {hasPermission ? '✅' : '❌'} | 
                    Raw Exists: {rawPermission ? '✅' : '❌'} | 
                    Raw Granted: {rawPermission?.is_granted ? '✅' : '❌'}
                  </ThemedText>
                </View>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: hasPermission ? '#10B981' : '#EF4444' }
                ]}>
                  <ThemedText style={styles.statusText}>
                    {hasPermission ? 'PASS' : 'FAIL'}
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>

        {/* Raw Permissions */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <ThemedText type="subtitle">All Available Permissions</ThemedText>
          {Object.entries(getAllPermissions()).map(([resource, actions]) => (
            <View key={resource} style={styles.resourceRow}>
              <ThemedText style={styles.resourceName}>{resource}:</ThemedText>
              <ThemedText style={styles.actionsList}>{actions.join(', ')}</ThemedText>
            </View>
          ))}
        </View>

        {/* Full Debugger */}
        <PermissionDebugger />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  testButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 16,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  testRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  testInfo: {
    flex: 1,
  },
  permissionKey: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  testDetails: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resourceRow: {
    marginVertical: 4,
  },
  resourceName: {
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  actionsList: {
    fontSize: 12,
    opacity: 0.8,
    marginLeft: 16,
  },
});