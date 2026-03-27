import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
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
import { ReadOrListPermissionGuard } from '@/components/PermissionGuards';
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
  const { showSuccess, showError } = useToastContext();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pendingDate, setPendingDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [statusMap, setStatusMap] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateStr = selectedDate.toISOString().split('T')[0];

  // Classes with nested sections
  const { data: classesData = [] } = useQuery({
    queryKey: ['classes-sections-att'],
    queryFn: () => classSectionsApi.getClassSections({ active_only: true }),
  });

  const classOptions = useMemo(() =>
    (classesData as any[]).map((c: any) => ({ label: c.name || '', value: c.id })),
    [classesData]
  );

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    const cls = (classesData as any[]).find((c: any) => c.id === selectedClass);
    return (cls?.sections || []).map((s: any) => ({ label: s.name || '', value: s.id }));
  }, [classesData, selectedClass]);

  // Students for selected class/section
  const { data: studentsData = [], isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['students-att', selectedClass, selectedSection],
    queryFn: async () => {
      const response = await studentAdmissionsApi.getStudentAdmissions();
      let items: any[] = (response as any).items ?? response;
      if (selectedClass) items = items.filter((s: any) => s.current_class_id === selectedClass);
      if (selectedSection) items = items.filter((s: any) => s.current_section_id === selectedSection);
      return items;
    },
    enabled: !!selectedClass,
  });

  // Attendance records for selected date
  const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['att-date', dateStr],
    queryFn: () => studentAttendanceApi.getAttendanceByDate(dateStr),
  });

  // Sync statusMap when records load
  useEffect(() => {
    const map: Record<string, 'present' | 'absent' | 'late'> = {};
    (attendanceRecords as any[]).forEach((r: any) => {
      map[r.student_id] = r.status;
    });
    setStatusMap(map);
  }, [attendanceRecords]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0;
    (studentsData as any[]).forEach((s: any) => {
      const status = statusMap[s.student?.id];
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
    });
    return { present, absent, late };
  }, [studentsData, statusMap]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = attendanceRecords as any[];
      const students = studentsData as any[];
      const ops = students.map(async (student: any) => {
        const sid = student.student?.id;
        if (!sid || !statusMap[sid]) return;
        const status = statusMap[sid];
        const existing = records.find((r: any) => r.student_id === sid);
        if (existing) {
          if (existing.status !== status) await studentAttendanceApi.updateAttendance(existing.id, { status });
        } else {
          await studentAttendanceApi.createAttendance({ student_id: sid, date: dateStr, status });
        }
      });
      await Promise.all(ops);
    },
    onSuccess: () => {
      showSuccess('Saved', 'Attendance saved successfully');
      queryClient.invalidateQueries({ queryKey: ['att-date'] });
    },
    onError: () => showError('Error', 'Failed to save attendance'),
  });

  const handleRefresh = () => {
    refetchStudents();
    refetchAttendance();
  };

  const handleMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleMarkAll = (status: 'present' | 'absent' | 'late') => {
    const map = { ...statusMap };
    (studentsData as any[]).forEach((s: any) => {
      if (s.student?.id) map[s.student.id] = status;
    });
    setStatusMap(map);
  };

  return (
    <>
      {/* Android date picker (renders as system calendar dialog) */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="calendar"
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setSelectedDate(date);
          }}
        />
      )}

      {/* iOS date picker in a modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={sStyles.iosOverlay}>
            <View style={[sStyles.iosPicker, { backgroundColor: colors.card }]}>
              <View style={sStyles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <ThemedText style={{ color: colors['muted-foreground'] }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedDate(pendingDate);
                    setShowDatePicker(false);
                  }}
                >
                  <ThemedText style={{ color: colors.primary, fontWeight: '600' }}>Done</ThemedText>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => date && setPendingDate(date)}
              />
            </View>
          </View>
        </Modal>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Compact 3-column filter row */}
        <View style={[sStyles.filterCard, { backgroundColor: colors.card }]}>
          <View style={sStyles.filterRow}>
            <View style={sStyles.filterCol}>
              <ThemedText style={sStyles.filterLabel}>Class</ThemedText>
              <CustomDropdown
                data={classOptions}
                placeholder="Class"
                value={selectedClass}
                onChange={(v) => {
                  setSelectedClass(v as string);
                  setSelectedSection('');
                }}
                style={sStyles.filterDropdown}
              />
            </View>
            <View style={sStyles.filterCol}>
              <ThemedText style={sStyles.filterLabel}>Section</ThemedText>
              <CustomDropdown
                data={sectionOptions}
                placeholder="Section"
                value={selectedSection}
                onChange={(v) => setSelectedSection(v as string)}
                style={sStyles.filterDropdown}
              />
            </View>
            <View style={sStyles.filterCol}>
              <ThemedText style={sStyles.filterLabel}>Date</ThemedText>
              <TouchableOpacity
                style={[sStyles.dateBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => {
                  setPendingDate(selectedDate);
                  setShowDatePicker(true);
                }}
              >
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <ThemedText style={sStyles.dateBtnText} numberOfLines={1}>
                  {selectedDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section header: title + Refresh + Save Attendance */}
        <View style={sStyles.sectionHeader}>
          <ThemedText style={sStyles.sectionTitle}>Student Attendance</ThemedText>
          <View style={sStyles.headerBtns}>
            <TouchableOpacity
              style={[sStyles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
              onPress={handleRefresh}
            >
              <Ionicons name="refresh-outline" size={14} color={colors['card-foreground']} />
              <ThemedText style={[sStyles.headerBtnText, { color: colors['card-foreground'] }]}>Refresh</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sStyles.headerBtn, { backgroundColor: colors.primary }]}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Ionicons name="save-outline" size={14} color="white" />
              <ThemedText style={[sStyles.headerBtnText, { color: 'white' }]}>
                {saveMutation.isPending ? 'Saving...' : 'Save Attendance'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats cards row */}
        {selectedClass && (
          <View style={sStyles.statsRow}>
            <View style={[sStyles.statCard, { backgroundColor: '#DCFCE7' }]}>
              <ThemedText style={[sStyles.statNum, { color: '#16A34A' }]}>{stats.present}</ThemedText>
              <ThemedText style={[sStyles.statLbl, { color: '#16A34A' }]}>Present</ThemedText>
            </View>
            <View style={[sStyles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <ThemedText style={[sStyles.statNum, { color: '#DC2626' }]}>{stats.absent}</ThemedText>
              <ThemedText style={[sStyles.statLbl, { color: '#DC2626' }]}>Absent</ThemedText>
            </View>
            <View style={[sStyles.statCard, { backgroundColor: '#FEF9C3' }]}>
              <ThemedText style={[sStyles.statNum, { color: '#CA8A04' }]}>{stats.late}</ThemedText>
              <ThemedText style={[sStyles.statLbl, { color: '#CA8A04' }]}>Late</ThemedText>
            </View>
          </View>
        )}

        {/* Student list */}
        {!selectedClass ? (
          <View style={styles.emptyState}>
            <Ionicons name="filter-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyText}>Select a class to view students</ThemedText>
          </View>
        ) : studentsLoading ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>Loading students...</ThemedText>
          </View>
        ) : (studentsData as any[]).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.emptyText}>No students found</ThemedText>
          </View>
        ) : (
          <View style={[sStyles.studentsList, { backgroundColor: colors.card }]}>
            {/* Mark All quick actions */}
            <View style={[sStyles.markAllRow, { borderBottomColor: colors.border }]}>
              <ThemedText style={sStyles.markAllLabel}>Mark All:</ThemedText>
              {(['present', 'absent', 'late'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[sStyles.markAllBtn, { backgroundColor: getStatusColor(s) }]}
                  onPress={() => handleMarkAll(s)}
                >
                  <ThemedText style={sStyles.markAllBtnText}>{s[0].toUpperCase()}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {(studentsData as any[]).map((student: any, idx: number) => {
              const sid = student.student?.id;
              const status = sid ? statusMap[sid] : undefined;
              return (
                <View
                  key={student.id}
                  style={[
                    sStyles.studentRow,
                    { borderBottomColor: colors.border },
                    idx % 2 !== 0 && { backgroundColor: `${colors.primary}08` },
                  ]}
                >
                  {/* Status indicator dot */}
                  <View style={[sStyles.statusDot, { backgroundColor: status ? getStatusColor(status) : '#D1D5DB' }]}>
                    <ThemedText style={sStyles.statusDotText}>
                      {status ? status[0].toUpperCase() : '?'}
                    </ThemedText>
                  </View>

                  {/* Student info */}
                  <View style={sStyles.studentInfo}>
                    <ThemedText style={sStyles.studentName} numberOfLines={1}>
                      {student.student?.first_name} {student.student?.last_name}
                    </ThemedText>
                    <ThemedText style={sStyles.admNo}>{student.admission_number}</ThemedText>
                  </View>

                  {/* P / A / L buttons */}
                  {sid ? (
                    <View style={sStyles.palRow}>
                      {(['present', 'absent', 'late'] as const).map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            sStyles.palBtn,
                            status === s
                              ? { backgroundColor: getStatusColor(s) }
                              : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
                          ]}
                          onPress={() => handleMark(sid, s)}
                        >
                          <ThemedText
                            style={[
                              sStyles.palBtnText,
                              { color: status === s ? 'white' : colors['muted-foreground'] },
                            ]}
                          >
                            {s[0].toUpperCase()}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudentAttendanceScreen() {
  const { role, studentId, selectedStudent } = useAuth();
  const { colors } = useTheme();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

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

// ─── Shared / history view styles ─────────────────────────────────────────────

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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
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

// ─── Staff view styles ─────────────────────────────────────────────────────────

const sStyles = StyleSheet.create({
  // Filter row
  filterCard: {
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  filterCol: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filterDropdown: {
    height: 40,
  },
  dateBtn: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 6,
  },
  dateBtnText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },

  // Section header with action buttons
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  headerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats cards
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLbl: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  // Student list
  studentsList: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  markAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  markAllLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.6,
    flex: 1,
  },
  markAllBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  statusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDotText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  admNo: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 1,
  },
  palRow: {
    flexDirection: 'row',
    gap: 5,
  },
  palBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  palBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // iOS date picker modal
  iosOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iosPicker: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
});
