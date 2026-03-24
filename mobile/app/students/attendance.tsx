import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { studentAttendanceApi, studentAdmissionsApi, classSectionsApi } from '@/src/api';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { ReadOrListPermissionGuard, CreatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'present': return '#10B981';
    case 'absent': return '#EF4444';
    case 'late': return '#F59E0B';
    default: return '#6B7280';
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

// ─── Attendance history view (student + parent) ────────────────────────────

function AttendanceHistoryView({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName?: string;
}) {
  const { colors } = useTheme();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const selectedYear = today.getFullYear();

  const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance-history', studentId, startDate, endDate],
    queryFn: () =>
      studentAttendanceApi.getStudentAttendanceFilter(studentId, {
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: !!studentId,
  });

  const monthOptions = MONTHS.map((m, i) => ({ label: m, value: String(i) }));

  const sorted = useMemo(() => {
    if (!records) return [];
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  const stats = useMemo(() => {
    if (!sorted.length) return { present: 0, absent: 0, late: 0, total: 0, pct: 0 };
    const present = sorted.filter((r) => r.status === 'present').length;
    const absent = sorted.filter((r) => r.status === 'absent').length;
    const late = sorted.filter((r) => r.status === 'late').length;
    const total = sorted.length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, absent, late, total, pct };
  }, [sorted]);

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Month filter */}
      <View style={[styles.filtersCard, { backgroundColor: colors.card }]}>
        {studentName ? (
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            {studentName}&apos;s Attendance
          </ThemedText>
        ) : (
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            My Attendance
          </ThemedText>
        )}
        <CustomDropdown
          data={monthOptions}
          placeholder="Select Month"
          value={String(selectedMonth)}
          onChange={(val) => setSelectedMonth(Number(val))}
          style={{ backgroundColor: colors.background }}
        />
      </View>

      {/* Stats summary */}
      {sorted.length > 0 && (
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            {MONTHS[selectedMonth]} {selectedYear}
          </ThemedText>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.total}</ThemedText>
              <ThemedText style={styles.statLabel}>Days</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#10B981' }]}>{stats.present}</ThemedText>
              <ThemedText style={styles.statLabel}>Present</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#EF4444' }]}>{stats.absent}</ThemedText>
              <ThemedText style={styles.statLabel}>Absent</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.late}</ThemedText>
              <ThemedText style={styles.statLabel}>Late</ThemedText>
            </View>
          </View>
          <View style={styles.percentageBarBg}>
            <View
              style={[
                styles.percentageFill,
                {
                  width: `${stats.pct}%` as any,
                  backgroundColor: stats.pct >= 75 ? '#10B981' : '#EF4444',
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.percentageText, { color: stats.pct >= 75 ? '#10B981' : '#EF4444' }]}>
            {stats.pct}% attendance
          </ThemedText>
        </View>
      )}

      {/* Records list */}
      <View style={[styles.studentsCard, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.studentsTitle}>
          Attendance Records
        </ThemedText>

        {isLoading ? (
          <ThemedText style={styles.emptyText}>Loading...</ThemedText>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyText}>
              No records for {MONTHS[selectedMonth]}
            </ThemedText>
          </View>
        ) : (
          sorted.map((record) => (
            <View
              key={record.id}
              style={[styles.recordRow, { borderBottomColor: colors.border }]}
            >
              <View style={styles.recordDateWrapper}>
                <ThemedText style={styles.recordDateText}>
                  {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </ThemedText>
                {record.remarks ? (
                  <ThemedText style={styles.remarksText} numberOfLines={1}>
                    {record.remarks}
                  </ThemedText>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
                <Ionicons
                  name={getStatusIcon(record.status) as any}
                  size={13}
                  color="white"
                />
                <ThemedText style={styles.statusText}>{record.status}</ThemedText>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Staff view (mark attendance) ─────────────────────────────────────────────

function StaffAttendanceView() {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { showError } = useToastContext();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const { data: attendanceData } = useQuery({
    queryKey: ['student-attendance', selectedDate],
    queryFn: () => studentAttendanceApi.getAttendanceByDate(selectedDate),
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students-for-attendance', selectedClass, selectedSection],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      let filtered = response.items;
      if (selectedClass) {
        filtered = filtered.filter((s: any) => s.current_class_id === selectedClass);
      }
      if (selectedSection) {
        filtered = filtered.filter((s: any) => s.current_section_id === selectedSection);
      }
      return filtered;
    },
  });

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

  const markMutation = useMutation({
    mutationFn: studentAttendanceApi.createAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
    },
    onError: () => showError('Error', 'Failed to mark attendance.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'present' | 'absent' | 'late' }) =>
      studentAttendanceApi.updateAttendance(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-attendance'] });
    },
    onError: () => showError('Error', 'Failed to update attendance.'),
  });

  const getRecordForStudent = (studentEntityId: string) =>
    attendanceData?.find((r: any) => r.student_id === studentEntityId);

  const handleMark = (student: any, status: 'present' | 'absent' | 'late') => {
    const existing = getRecordForStudent(student.student.id);
    if (existing) {
      Alert.alert(
        'Update Attendance',
        `Change to ${status}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update', onPress: () => updateMutation.mutate({ id: existing.id, status }) },
        ],
      );
    } else {
      markMutation.mutate({ student_id: student.student.id, date: selectedDate, status });
    }
  };

  const stats = useMemo(() => {
    if (!attendanceData) return null;
    const present = (attendanceData as any[]).filter((r) => r.status === 'present').length;
    const absent = (attendanceData as any[]).filter((r) => r.status === 'absent').length;
    const late = (attendanceData as any[]).filter((r) => r.status === 'late').length;
    return { present, absent, late, total: (attendanceData as any[]).length };
  }, [attendanceData]);

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Filters */}
      <View style={[styles.filtersCard, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.filtersTitle}>Filters</ThemedText>

        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Date</ThemedText>
          <TouchableOpacity
            style={[styles.dateButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => Alert.alert('Date Picker', 'Date picker will be implemented')}
          >
            <ThemedText>{new Date(selectedDate + 'T00:00:00').toLocaleDateString()}</ThemedText>
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Class</ThemedText>
          <CustomDropdown
            data={classesData || []}
            placeholder="All Classes"
            value={selectedClass}
            onChange={(val) => setSelectedClass(val as string)}
            style={{ backgroundColor: colors.background }}
          />
        </View>

        <View style={styles.filterRow}>
          <ThemedText style={styles.filterLabel}>Section</ThemedText>
          <CustomDropdown
            data={sectionsData || []}
            placeholder="All Sections"
            value={selectedSection}
            onChange={(val) => setSelectedSection(val as string)}
            style={{ backgroundColor: colors.background }}
          />
        </View>
      </View>

      {/* Summary */}
      {stats && (
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.summaryTitle}>
            Summary — {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </ThemedText>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: colors.primary }]}>{stats.total}</ThemedText>
              <ThemedText style={styles.statLabel}>Total</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#10B981' }]}>{stats.present}</ThemedText>
              <ThemedText style={styles.statLabel}>Present</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#EF4444' }]}>{stats.absent}</ThemedText>
              <ThemedText style={styles.statLabel}>Absent</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.late}</ThemedText>
              <ThemedText style={styles.statLabel}>Late</ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Students list */}
      <View style={[styles.studentsCard, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={styles.studentsTitle}>Mark Attendance</ThemedText>

        {studentsData?.map((student: any) => {
          const record = getRecordForStudent(student.student.id);
          return (
            <View
              key={student.id}
              style={[styles.studentRow, { backgroundColor: colors.background }]}
            >
              <View style={styles.studentInfo}>
                <ThemedText style={styles.studentName}>
                  {student.student.first_name} {student.student.last_name}
                </ThemedText>
                <ThemedText style={styles.admissionNumber}>{student.admission_number}</ThemedText>
              </View>

              {record ? (
                <TouchableOpacity
                  style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}
                  onPress={() =>
                    Alert.alert(
                      'Change Attendance',
                      `Current: ${record.status}. Change to:`,
                      [
                        { text: 'Present', onPress: () => updateMutation.mutate({ id: record.id, status: 'present' }) },
                        { text: 'Absent', onPress: () => updateMutation.mutate({ id: record.id, status: 'absent' }) },
                        { text: 'Late', onPress: () => updateMutation.mutate({ id: record.id, status: 'late' }) },
                        { text: 'Cancel', style: 'cancel' },
                      ],
                    )
                  }
                >
                  <Ionicons name={getStatusIcon(record.status) as any} size={14} color="white" />
                  <ThemedText style={styles.statusText}>{record.status}</ThemedText>
                </TouchableOpacity>
              ) : (
                <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_ATTENDANCE}>
                  <View style={styles.attendanceActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                      onPress={() => handleMark(student, 'present')}
                    >
                      <Ionicons name="checkmark" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                      onPress={() => handleMark(student, 'absent')}
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                      onPress={() => handleMark(student, 'late')}
                    >
                      <Ionicons name="time" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                </CreatePermissionGuard>
              )}
            </View>
          );
        })}

        {(!studentsData || studentsData.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#9CA3AF" />
            <ThemedText style={styles.emptyText}>
              {selectedClass ? 'No students found' : 'Select a class to view students'}
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentAttendanceScreen() {
  const { role, studentId, selectedStudent } = useAuth();
  const { colors } = useTheme();

  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');

  let content: React.ReactNode;

  if (isStudent && studentId) {
    content = <AttendanceHistoryView studentId={studentId} />;
  } else if (isParent && selectedStudent) {
    content = (
      <AttendanceHistoryView
        studentId={selectedStudent.id}
        studentName={`${selectedStudent.first_name} ${selectedStudent.last_name}`}
      />
    );
  } else if (isParent && !selectedStudent) {
    content = (
      <View style={styles.emptyState}>
        <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
        <ThemedText style={styles.emptyText}>Please select a student from the header</ThemedText>
      </View>
    );
  } else {
    content = <StaffAttendanceView />;
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_ATTENDANCE}
      fallback={
        <AppLayout title="Attendance">
          <View style={styles.accessDeniedContainer}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.accessDeniedText}>
              You don&apos;t have permission to access attendance
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Attendance">{content}</AppLayout>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.7,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  percentageBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: 6,
  },
  percentageFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  studentsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  studentsTitle: {
    marginBottom: 12,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  recordDateWrapper: {
    flex: 1,
  },
  recordDateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  remarksText: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
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
    fontSize: 15,
    fontWeight: '500',
  },
  admissionNumber: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 10,
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 14,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 14,
    opacity: 0.65,
  },
});
