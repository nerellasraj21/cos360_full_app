import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { Colors } from '@/constants/theme';
import { useStaffAttendance, useBulkUpdateStaffAttendance } from '@/hooks/use-staff-api';
import type { StaffAttendance, StaffAttendanceInput } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';

function StaffAttendanceScreenContent() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingMode, setEditingMode] = useState(false);
  const [attendanceUpdates, setAttendanceUpdates] = useState<Record<string, StaffAttendanceInput>>({});

  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  // Fetch attendance data for selected date
  const { data: attendanceData, isLoading, error, refetch } = useStaffAttendance({
    start_date: selectedDate,
    end_date: selectedDate,
    skip: 0,
    limit: 100
  });

  // Update attendance mutation
  const updateAttendanceMutation = useBulkUpdateStaffAttendance({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-attendance'] });
      setAttendanceUpdates({});
      setEditingMode(false);
      Alert.alert('Success', 'Attendance updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update attendance');
      console.error('Update attendance error:', error);
    },
  });

  const attendanceRecords = useMemo(() => {
    return attendanceData?.items || [];
  }, [attendanceData]);

  const handleAttendanceChange = (staffId: string, status: 'present' | 'absent' | 'late', remarks?: string) => {
    setAttendanceUpdates(prev => ({
      ...prev,
      [staffId]: {
        staff_id: staffId,
        date: selectedDate,
        status,
        remarks: status === 'late' ? remarks : undefined
      }
    }));
  };

  const handleSaveAttendance = () => {
    if (Object.keys(attendanceUpdates).length === 0) {
      Alert.alert('No Changes', 'No attendance changes to save');
      return;
    }
    updateAttendanceMutation.mutate(attendanceUpdates);
  };

  const getAttendanceStatus = (staffId: string) => {
    const existing = attendanceRecords.find(r => r.staff_id === staffId);
    const pending = attendanceUpdates[staffId];
    return pending || existing;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return '#10B981';
      case 'absent': return '#EF4444';
      case 'late': return '#F59E0B';
      default: return themeColors['muted-foreground'];
    }
  };

  const renderAttendanceItem = ({ item }: { item: { staff_id: string; staff?: { first_name: string; last_name?: string } } }) => {
    const attendance = getAttendanceStatus(item.staff_id);
    const staffName = item.staff ? `${item.staff.first_name} ${item.staff.last_name || ''}`.trim() : 'Unknown Staff';

    return (
      <View style={[styles.attendanceCard, { backgroundColor: themeColors.card }]}>
        <View style={styles.staffInfo}>
          <ThemedText type="subtitle" style={styles.staffName}>
            {staffName}
          </ThemedText>
        </View>

        {editingMode ? (
          <View style={styles.statusSelector}>
            {(['present', 'absent', 'late'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  {
                    backgroundColor: attendance?.status === status ? getStatusColor(status) : themeColors.background,
                    borderColor: themeColors.border
                  }
                ]}
                onPress={() => handleAttendanceChange(item.staff_id, status)}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: attendance?.status === status ? 'white' : themeColors['card-foreground'] }
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.statusDisplay}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(attendance?.status) }
              ]}
            >
              <ThemedText style={styles.statusBadgeText}>
                {attendance?.status ? attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1) : 'Not Marked'}
              </ThemedText>
            </View>
            {attendance?.remarks && (
              <ThemedText style={styles.remarksText}>
                {attendance.remarks}
              </ThemedText>
            )}
          </View>
        )}
      </View>
    );
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const isFutureDate = new Date(selectedDate) > new Date();

  if (error) {
    const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;

    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">
          {isAuthError ? 'Authentication Required' : 'Error'}
        </ThemedText>
        <ThemedText style={styles.errorText}>
          {isAuthError
            ? 'Please log in to access attendance data'
            : 'Failed to load attendance data'
          }
        </ThemedText>
        {isAuthError ? (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace('/login')}
          >
            <ThemedText style={styles.retryText}>Go to Login</ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>
          Staff Attendance
        </ThemedText>
        <View style={styles.headerActions}>
          {!isFutureDate && (
            <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF_ATTENDANCE}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: editingMode ? '#EF4444' : themeColors.primary }]}
                onPress={() => {
                  if (editingMode) {
                    setAttendanceUpdates({});
                  }
                  setEditingMode(!editingMode);
                }}
              >
                <Ionicons name={editingMode ? "close" : "create"} size={20} color="white" />
              </TouchableOpacity>
            </UpdatePermissionGuard>
          )}
        </View>
      </View>

      {/* Date Selector */}
      <View style={[styles.dateSelector, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(-1)}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <ThemedText type="subtitle" style={styles.dateText}>
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </ThemedText>
          {isFutureDate && (
            <ThemedText style={styles.futureText}>Future Date - Read Only</ThemedText>
          )}
        </View>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(1)}
        >
          <Ionicons name="chevron-forward" size={24} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {/* Attendance Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>Total Staff</ThemedText>
          <ThemedText type="subtitle" style={styles.summaryValue}>
            {attendanceRecords.length}
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>Present</ThemedText>
          <ThemedText type="subtitle" style={[styles.summaryValue, { color: '#10B981' }]}>
            {attendanceRecords.filter(r => getAttendanceStatus(r.staff_id)?.status === 'present').length}
          </ThemedText>
        </View>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryLabel}>Absent</ThemedText>
          <ThemedText type="subtitle" style={[styles.summaryValue, { color: '#EF4444' }]}>
            {attendanceRecords.filter(r => getAttendanceStatus(r.staff_id)?.status === 'absent').length}
          </ThemedText>
        </View>
      </View>

      {/* Save Button (when editing) */}
      {editingMode && (
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF_ATTENDANCE}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.primary }]}
            onPress={handleSaveAttendance}
            disabled={updateAttendanceMutation.isLoading}
          >
            <ThemedText style={styles.saveButtonText}>
              {updateAttendanceMutation.isLoading ? 'Saving...' : 'Save Attendance'}
            </ThemedText>
          </TouchableOpacity>
        </UpdatePermissionGuard>
      )}

      {/* Attendance List */}
      <FlatList
        data={attendanceRecords}
        renderItem={renderAttendanceItem}
        keyExtractor={(item) => item.staff_id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Staff Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              No staff members available for attendance marking
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    textAlign: 'center',
  },
  futureText: {
    fontSize: 12,
    opacity: 0.7,
    color: '#F59E0B',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  attendanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    marginBottom: 4,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDisplay: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  remarksText: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
});

export default function StaffAttendanceScreen() {
  const router = useRouter();
  
  return (
    <ReadOrListPermissionGuard 
      resource={PERMISSION_RESOURCES.STAFF_ATTENDANCE}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>
              Staff Attendance
            </ThemedText>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed" size={64} color="#9CA3AF" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Access Denied
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              You don't have permission to view staff attendance data
            </ThemedText>
          </View>
        </ThemedView>
      }
    >
      <StaffAttendanceScreenContent />
    </ReadOrListPermissionGuard>
  );
}