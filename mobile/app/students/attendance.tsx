import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { studentAttendanceApi, studentAdmissionsApi, classSectionsApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  attendance_date: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  student_name?: string;
  class_name?: string;
  section_name?: string;
}

export default function StudentAttendanceScreen() {
  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  // Fetch attendance data
  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ['student-attendance', selectedDate, selectedClass, selectedSection],
    queryFn: async () => {
      const response = await studentAttendanceApi.getStudentAttendance();
      let filtered = response.items;

      if (selectedClass) {
        filtered = filtered.filter((record: AttendanceRecord) => record.class_name === selectedClass);
      }
      if (selectedSection) {
        filtered = filtered.filter((record: AttendanceRecord) => record.section_name === selectedSection);
      }

      return filtered;
    },
  });

  // Fetch students for the selected class/section
  const { data: studentsData } = useQuery({
    queryKey: ['students-for-attendance', selectedClass, selectedSection],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      let filtered = response.items;

      if (selectedClass) {
        filtered = filtered.filter((student: any) => student.current_class_id === selectedClass);
      }
      if (selectedSection) {
        filtered = filtered.filter((student: any) => student.current_section_id === selectedSection);
      }

      return filtered;
    },
  });

  // Fetch dropdown data
  const { data: classesData } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: async () => {
      const data = await classSectionsApi.getClassList();
      return data.map((item: any) => ({ label: item.class_name, value: item.id }));
    },
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections-dropdown'],
    queryFn: async () => {
      const data = await classSectionsApi.getSectionList();
      return data.map((item: any) => ({ label: item.section_name, value: item.id }));
    },
  });

  // Mutation for marking attendance
  const markAttendanceMutation = useMutation({
    mutationFn: studentAttendanceApi.createStudentAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
      Alert.alert('Success', 'Attendance marked successfully!');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to mark attendance. Please try again.');
      console.error('Mark attendance error:', error);
    },
  });

  const getAttendanceForStudent = (studentId: string) => {
    return attendanceData?.find((record: AttendanceRecord) =>
      record.student_id === studentId &&
      record.attendance_date === selectedDate
    );
  };

  const handleMarkAttendance = (student: any, status: 'present' | 'absent' | 'late') => {
    const existingRecord = getAttendanceForStudent(student.id);

    if (existingRecord) {
      Alert.alert(
        'Update Attendance',
        `Change attendance for this student to ${status}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Update',
            onPress: () => {
              Alert.alert('Info', 'Update functionality would be implemented here');
            }
          }
        ]
      );
    } else {
      markAttendanceMutation.mutate({
        student_id: student.id,
        class_id: student.current_class_id,
        attendance_date: selectedDate,
        status,
        remarks: '',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#10B981';
      case 'absent': return '#EF4444';
      case 'late': return '#F59E0B';
      default: return themeColors['muted-foreground'];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'checkmark-circle';
      case 'absent': return 'close-circle';
      case 'late': return 'time';
      default: return 'help-circle';
    }
  };

  const renderStudentAttendance = (student: any) => {
    const attendanceRecord = getAttendanceForStudent(student.id);

    return (
      <View key={student.id} style={[styles.studentRow, { backgroundColor: themeColors.card }]}>
        <View style={styles.studentInfo}>
          <ThemedText style={styles.studentName}>{`${student.student.first_name} ${student.student.last_name}`}</ThemedText>
          <ThemedText style={styles.admissionNumber}>{student.admission_number}</ThemedText>
        </View>

        {attendanceRecord ? (
          <View style={styles.attendanceStatus}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(attendanceRecord.status) }]}>
              <Ionicons name={getStatusIcon(attendanceRecord.status) as any} size={16} color="white" />
              <ThemedText style={styles.statusText}>
                {attendanceRecord.status}
              </ThemedText>
            </View>
          </View>
        ) : (
          <CreatePermissionGuard
            resource={PERMISSION_RESOURCES.STUDENT_ATTENDANCE}
          >
            <View style={styles.attendanceActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                onPress={() => handleMarkAttendance(student, 'present')}
              >
                <Ionicons name="checkmark" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                onPress={() => handleMarkAttendance(student, 'absent')}
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => handleMarkAttendance(student, 'late')}
              >
                <Ionicons name="time" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </CreatePermissionGuard>
        )}
      </View>
    );
  };

  const renderAttendanceSummary = () => {
    if (!attendanceData) return null;

    const present = attendanceData.filter((record: any) => record.status === 'present').length;
    const absent = attendanceData.filter((record: any) => record.status === 'absent').length;
    const late = attendanceData.filter((record: any) => record.status === 'late').length;
    const total = attendanceData.length;

    return (
      <View style={[styles.summaryCard, { backgroundColor: themeColors.card }]}>
        <ThemedText type="subtitle" style={styles.summaryTitle}>
          Attendance Summary - {new Date(selectedDate).toLocaleDateString()}
        </ThemedText>

        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={24} color={themeColors.primary} />
            <ThemedText style={styles.statNumber}>{total}</ThemedText>
            <ThemedText style={styles.statLabel}>Total</ThemedText>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <ThemedText style={styles.statNumber}>{present}</ThemedText>
            <ThemedText style={styles.statLabel}>Present</ThemedText>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <ThemedText style={styles.statNumber}>{absent}</ThemedText>
            <ThemedText style={styles.statLabel}>Absent</ThemedText>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color="#F59E0B" />
            <ThemedText style={styles.statNumber}>{late}</ThemedText>
            <ThemedText style={styles.statLabel}>Late</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_ATTENDANCE}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don't have permission to access student attendance
            </ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Student Attendance
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Filters */}
          <View style={[styles.filtersCard, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.filtersTitle}>
              Filters
            </ThemedText>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <ThemedText style={styles.filterLabel}>Date</ThemedText>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: themeColors.background }]}
                  onPress={() => Alert.alert('Date Picker', 'Date picker would be implemented here')}
                >
                  <ThemedText>{new Date(selectedDate).toLocaleDateString()}</ThemedText>
                  <Ionicons name="calendar" size={20} color={themeColors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <ThemedText style={styles.filterLabel}>Class</ThemedText>
                <CustomDropdown
                  data={classesData || []}
                  placeholder="All Classes"
                  value={selectedClass}
                  onChange={(value) => setSelectedClass(value as string)}
                  style={{ backgroundColor: themeColors.background }}
                />
              </View>

              <View style={styles.filterItem}>
                <ThemedText style={styles.filterLabel}>Section</ThemedText>
                <CustomDropdown
                  data={sectionsData || []}
                  placeholder="All Sections"
                  value={selectedSection}
                  onChange={(value) => setSelectedSection(value as string)}
                  style={{ backgroundColor: themeColors.background }}
                />
              </View>
            </View>
          </View>

          {/* Attendance Summary */}
          {renderAttendanceSummary()}

          {/* Students List */}
          <View style={[styles.studentsCard, { backgroundColor: themeColors.card }]}>
            <ThemedText type="subtitle" style={styles.studentsTitle}>
              Mark Attendance
            </ThemedText>

            {studentsData?.map(renderStudentAttendance)}

            {(!studentsData || studentsData.length === 0) && (
              <View style={styles.emptyState}>
                <Ionicons name="people" size={48} color={themeColors['muted-foreground']} />
                <ThemedText style={styles.emptyText}>
                  {selectedClass ? 'No students found for selected class' : 'Select a class to view students'}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </ReadOrListPermissionGuard>
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
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  filtersCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterItem: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  studentsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  studentsTitle: {
    marginBottom: 16,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  admissionNumber: {
    fontSize: 12,
    opacity: 0.7,
  },
  attendanceStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    opacity: 0.7,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
  },
  attendanceDisabled: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  disabledText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
});