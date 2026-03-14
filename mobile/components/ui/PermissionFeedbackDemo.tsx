import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { ThemedTouchableOpacity } from '../themed-touchable-opacity';
import { useTheme } from '@/contexts/ThemeContext';
import {
  AccessDenied,
  PermissionAccessDenied,
  ModuleAccessDenied,
  FeatureAccessDenied,
  InlineAccessDenied,
  DisabledActionIndicator,
  PermissionLoading,
  ScreenPermissionLoading,
  ComponentPermissionLoading,
  APIPermissionLoading,
  PermissionSkeleton,
  PermissionButtonLoading,
  InlinePermissionLoading,
  PermissionProgress,
  PermissionLoadingOverlay,
  ScreenPermissionErrorBoundary,
  ComponentPermissionErrorBoundary,
  APIPermissionErrorBoundary,
  usePermissionFeedback,
  usePermissionFeedbackPatterns,
} from './index';
import { 
  PermissionErrorType,
  PERMISSION_RESOURCES,
  PERMISSION_ACTIONS 
} from '../../src/types/permissions';
import { createPermissionError } from '../../src/utils/permission-errors';

/**
 * Demo component showcasing all permission UI feedback components
 * This component is for development and testing purposes
 */
export const PermissionFeedbackDemo: React.FC = () => {
  const { colors } = useTheme();
  const feedback = usePermissionFeedback();
  const patterns = usePermissionFeedbackPatterns();
  
  const [loadingStates, setLoadingStates] = useState({
    button: false,
    api: false,
    screen: false,
  });
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);

  const simulateLoading = (type: keyof typeof loadingStates, duration = 2000) => {
    setLoadingStates(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
      setLoadingStates(prev => ({ ...prev, [type]: false }));
    }, duration);
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 5) {
          clearInterval(interval);
          return 5;
        }
        return prev + 1;
      });
    }, 500);
  };

  const testErrorScenarios = () => {
    // Test different error types
    const errors = [
      createPermissionError(
        PermissionErrorType.INSUFFICIENT_PERMISSIONS,
        'Test insufficient permissions',
        PERMISSION_RESOURCES.STUDENTS,
        PERMISSION_ACTIONS.CREATE
      ),
      createPermissionError(
        PermissionErrorType.AUTHENTICATION_REQUIRED,
        'Test authentication required'
      ),
      createPermissionError(
        PermissionErrorType.PERMISSION_CHECK_FAILED,
        'Test permission check failed'
      ),
    ];

    errors.forEach((error, index) => {
      setTimeout(() => {
        feedback.showPermissionError(error, `test_scenario_${index}`);
      }, index * 1000);
    });
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="title" style={styles.sectionTitle}>
          Permission UI Feedback Demo
        </ThemedText>
        <ThemedText style={styles.sectionDescription}>
          This demo showcases all the permission UI feedback components and patterns.
        </ThemedText>
      </ThemedView>

      {/* Access Denied Components */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Access Denied Components
        </ThemedText>
        
        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Standard Access Denied:</ThemedText>
          <AccessDenied
            title="Feature Unavailable"
            message="This feature is not available in your current plan."
            compact={true}
          />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Permission Access Denied:</ThemedText>
          <PermissionAccessDenied
            resource={PERMISSION_RESOURCES.STUDENTS}
            action={PERMISSION_ACTIONS.CREATE}
            compact={true}
          />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Module Access Denied:</ThemedText>
          <ModuleAccessDenied
            moduleName="Students"
            requiredPermissions={['students:read', 'students:list']}
            compact={true}
          />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Inline Access Denied:</ThemedText>
          <InlineAccessDenied message="Cannot edit this field" />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Disabled Action:</ThemedText>
          <DisabledActionIndicator reason="Insufficient permissions" showTooltip={true}>
            <ThemedTouchableOpacity style={styles.demoButton}>
              <ThemedText>Disabled Button</ThemedText>
            </ThemedTouchableOpacity>
          </DisabledActionIndicator>
        </View>
      </ThemedView>

      {/* Loading State Components */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Loading State Components
        </ThemedText>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Permission Loading:</ThemedText>
          <PermissionLoading
            message="Verifying access..."
            size="small"
            compact={true}
          />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Component Loading:</ThemedText>
          <ComponentPermissionLoading
            componentName="Student List"
            size="small"
          />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>API Loading:</ThemedText>
          <APIPermissionLoading
            operation="create student"
            size="small"
          />
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Button Loading:</ThemedText>
          <PermissionButtonLoading
            loading={loadingStates.button}
            onPress={() => simulateLoading('button')}
            style={styles.demoButton}
          >
            {loadingStates.button ? 'Loading...' : 'Test Button Loading'}
          </PermissionButtonLoading>
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Progress Indicator:</ThemedText>
          <PermissionProgress
            current={progress}
            total={5}
            message="Checking permissions"
          />
          <ThemedTouchableOpacity
            style={[styles.demoButton, { marginTop: 8 }]}
            onPress={simulateProgress}
          >
            <ThemedText>Start Progress</ThemedText>
          </ThemedTouchableOpacity>
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Skeleton Loading:</ThemedText>
          <PermissionSkeleton count={2} itemHeight={50} />
        </View>
      </ThemedView>

      {/* Error Boundary Demos */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Error Boundary Components
        </ThemedText>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>Component Error Boundary:</ThemedText>
          <ComponentPermissionErrorBoundary
            componentName="Demo Component"
            compact={true}
          >
            <ThemedText>Protected component content</ThemedText>
          </ComponentPermissionErrorBoundary>
        </View>

        <View style={styles.demoItem}>
          <ThemedText style={styles.demoLabel}>API Error Boundary:</ThemedText>
          <APIPermissionErrorBoundary operation="fetch data">
            <ThemedText>API operation content</ThemedText>
          </APIPermissionErrorBoundary>
        </View>
      </ThemedView>

      {/* Feedback System Demos */}
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Feedback System
        </ThemedText>

        <View style={styles.demoRow}>
          <ThemedTouchableOpacity
            style={styles.demoButton}
            onPress={testErrorScenarios}
          >
            <ThemedText>Test Error Toasts</ThemedText>
          </ThemedTouchableOpacity>

          <ThemedTouchableOpacity
            style={styles.demoButton}
            onPress={() => feedback.showPermissionGranted('Access granted successfully!')}
          >
            <ThemedText>Test Success Toast</ThemedText>
          </ThemedTouchableOpacity>
        </View>

        <View style={styles.demoRow}>
          <ThemedTouchableOpacity
            style={styles.demoButton}
            onPress={() => setShowOverlay(true)}
          >
            <ThemedText>Show Loading Overlay</ThemedText>
          </ThemedTouchableOpacity>

          <ThemedTouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              patterns.handleScreenAccess(false, 'Demo Screen', [
                [PERMISSION_RESOURCES.STUDENTS, PERMISSION_ACTIONS.READ]
              ]);
            }}
          >
            <ThemedText>Test Screen Access</ThemedText>
          </ThemedTouchableOpacity>
        </View>

        <View style={styles.demoRow}>
          <ThemedTouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              patterns.handleAPIOperation(false, 'create_student', 
                PERMISSION_RESOURCES.STUDENTS, PERMISSION_ACTIONS.CREATE);
            }}
          >
            <ThemedText>Test API Operation</ThemedText>
          </ThemedTouchableOpacity>

          <ThemedTouchableOpacity
            style={styles.demoButton}
            onPress={() => {
              patterns.handleButtonAction(false, 'delete_student',
                PERMISSION_RESOURCES.STUDENTS, PERMISSION_ACTIONS.DELETE);
            }}
          >
            <ThemedText>Test Button Action</ThemedText>
          </ThemedTouchableOpacity>
        </View>
      </ThemedView>

      {/* Loading Overlay */}
      <PermissionLoadingOverlay
        visible={showOverlay}
        message="Processing your request..."
        cancelable={true}
        onCancel={() => setShowOverlay(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  demoItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  demoLabel: {
    fontWeight: '600',
    marginBottom: 8,
  },
  demoButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  demoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
});

export default PermissionFeedbackDemo;