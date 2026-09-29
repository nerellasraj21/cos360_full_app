import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { PermissionGuard } from './PermissionGuard';
import { PERMISSION_RESOURCES } from '../src/types/permissions';

export const SimplePermissionTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>🧪 Simple Permission Tests</ThemedText>
      
      {/* Test 1: Direct permission check */}
      <View style={styles.testSection}>
        <ThemedText style={styles.testTitle}>Test 1: Direct Classes Permission</ThemedText>
        <PermissionGuard resource="classes" action="list">
          <ThemedText style={styles.success}>✅ You have classes:list permission!</ThemedText>
        </PermissionGuard>
        <PermissionGuard resource="classes" action="list" fallback={
          <ThemedText style={styles.error}>❌ You don't have classes:list permission</ThemedText>
        }>
          <ThemedText style={styles.success}>✅ Classes list permission confirmed</ThemedText>
        </PermissionGuard>
      </View>

      {/* Test 2: Sections permission */}
      <View style={styles.testSection}>
        <ThemedText style={styles.testTitle}>Test 2: Direct Sections Permission</ThemedText>
        <PermissionGuard resource="sections" action="list">
          <ThemedText style={styles.success}>✅ You have sections:list permission!</ThemedText>
        </PermissionGuard>
        <PermissionGuard resource="sections" action="list" fallback={
          <ThemedText style={styles.error}>❌ You don't have sections:list permission</ThemedText>
        }>
          <ThemedText style={styles.success}>✅ Sections list permission confirmed</ThemedText>
        </PermissionGuard>
      </View>

      {/* Test 3: Combined permission */}
      <View style={styles.testSection}>
        <ThemedText style={styles.testTitle}>Test 3: Combined Classes_Sections Permission</ThemedText>
        <PermissionGuard resource="classes_sections" action="list">
          <ThemedText style={styles.success}>✅ You have classes_sections:list permission!</ThemedText>
        </PermissionGuard>
        <PermissionGuard resource="classes_sections" action="list" fallback={
          <ThemedText style={styles.error}>❌ You don't have classes_sections:list permission</ThemedText>
        }>
          <ThemedText style={styles.success}>✅ Classes_sections list permission confirmed</ThemedText>
        </PermissionGuard>
      </View>

      {/* Test 4: Multiple permissions (ANY) */}
      <View style={styles.testSection}>
        <ThemedText style={styles.testTitle}>Test 4: Multiple Permissions (ANY)</ThemedText>
        <PermissionGuard
          permissions={[
            ['classes', 'list'],
            ['sections', 'list'],
            ['classes_sections', 'list']
          ]}
          requireAll={false}
          fallback={<ThemedText style={styles.error}>❌ No matching permissions found</ThemedText>}
        >
          <ThemedText style={styles.success}>✅ At least one permission matches!</ThemedText>
        </PermissionGuard>
      </View>

      {/* Test 5: Using constants */}
      <View style={styles.testSection}>
        <ThemedText style={styles.testTitle}>Test 5: Using Permission Constants</ThemedText>
        <PermissionGuard
          resourceConstant={PERMISSION_RESOURCES.CLASSES}
          actionConstant="list"
          fallback={<ThemedText style={styles.error}>❌ Classes constant permission failed</ThemedText>}
        >
          <ThemedText style={styles.success}>✅ Classes constant permission works!</ThemedText>
        </PermissionGuard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff3cd',
    margin: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#856404',
  },
  testSection: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  testTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#495057',
  },
  success: {
    color: '#155724',
    backgroundColor: '#d4edda',
    padding: 8,
    borderRadius: 4,
    marginVertical: 2,
  },
  error: {
    color: '#721c24',
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 4,
    marginVertical: 2,
  },
});