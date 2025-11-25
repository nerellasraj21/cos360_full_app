import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout, PermissionGuard, ReadPermissionGuard } from '@/components';
import { CustomDropdown, DropdownOption } from '@/components/ui/dropdown';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAcademicYear, useAuth } from '@/contexts';
import { academicYearsApi } from '@/src/api/masters';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function SettingsScreen() {
  const {
    activeAcademicYearId,
    setActiveAcademicYearById,
  } = useAcademicYear();
  const { role } = useAuth();

  // Fetch academic years dropdown data
  const { data: academicYearOptions = [], isLoading } = useQuery({
    queryKey: ['academicYearsDropdown'],
    queryFn: () => academicYearsApi.getAcademicYearsDropdown(),
    select: (data) => data.map(item => ({
      label: item.title,
      value: item.id,
    })),
  });

  const handleAcademicYearChange = (value: string | number | null) => {
    setActiveAcademicYearById(value as string);
  };

  return (
    <AppLayout title="Settings">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Academic Year Section - Only for admin/staff roles */}
          <ReadPermissionGuard
            resource={PERMISSION_RESOURCES.ACADEMIC_YEARS}>
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Academic Year
              </ThemedText>
              <ThemedText style={styles.sectionDescription}>
                Select the current academic year for the application
              </ThemedText>

              <PermissionGuard
                resource={PERMISSION_RESOURCES.ACADEMIC_YEARS}
                action="update"
                disabled={true}
                fallback={
                  <View style={styles.disabledDropdown}>
                    <CustomDropdown
                      data={academicYearOptions}
                      placeholder="Select Academic Year"
                      value={activeAcademicYearId}
                      onChange={() => {}}
                      disabled={true}
                      search={false}
                    />
                    <ThemedText style={styles.disabledText}>
                      You can view but not change the academic year setting.
                    </ThemedText>
                  </View>
                }
              >
                <CustomDropdown
                  data={academicYearOptions}
                  placeholder="Select Academic Year"
                  value={activeAcademicYearId}
                  onChange={handleAcademicYearChange}
                  disabled={isLoading}
                  search={false}
                />
              </PermissionGuard>
            </View>
          </ReadPermissionGuard>

          {/* Appearance Section - Available to all users */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Appearance
            </ThemedText>
            <ThemedText style={styles.sectionDescription}>
              Choose your preferred theme
            </ThemedText>

            <View style={styles.themeContainer}>
              <ThemedText style={styles.themeLabel}>Theme Mode</ThemedText>
              <ThemeToggle />
            </View>
          </View>

          {/* Role-specific settings */}
          {role && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Account Information
              </ThemedText>
              <ThemedText style={styles.sectionDescription}>
                Your current role and permissions
              </ThemedText>

              <View style={styles.roleContainer}>
                <ThemedText style={styles.roleLabel}>Current Role:</ThemedText>
                <ThemedText style={styles.roleValue}>{role.name}</ThemedText>
              </View>
            </View>
          )}
        </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  themeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  disabledDropdown: {
    opacity: 0.6,
  },
  disabledText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  roleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
});