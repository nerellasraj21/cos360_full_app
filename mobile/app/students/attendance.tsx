import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { DatePickerModal, formatDate } from '@/components/ui';
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
    case 'half_day': return '#F97316';
    case 'leave': return '#3B82F6';
    default: return '#6B7280';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'present': return 'checkmark-circle';
    case 'absent': return 'close-circle';
    case 'late': return 'time';
    case 'half_day': return 'contrast';
    case 'leave': return 'briefcase';
    default: return 'help-circle';
  }
};

// Badge text for the read-only history rows — 'half_day' must read as
// "Half Day", not the raw enum value.
const getStatusText = (status: string) =>
  status === 'half_day' ? 'Half Day' : status;

// Compact badge label — avoids the single-initial collision between
// Late ("L") and Leave ("L") in the staff mark-attendance row badge.
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'present': return 'P';
    case 'absent': return 'A';
    case 'late': return 'Lt';
    case 'leave': return 'Lv';
    default: return status.charAt(0).toUpperCase();
  }
};

// Matches web app's status Select options and badge colors exactly (AttendancePage.tsx)
const STATUS_OPTIONS = [
  { label: 'Present', value: 'present' },
  { label: 'Absent', value: 'absent' },
  { label: 'Late', value: 'late' },
  { label: 'Leave', value: 'leave' },
];

const STATUS_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  present: { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' },
  absent: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  late: { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE68A' },
  leave: { bg: '#DBEAFE', text: '#2563EB', border: '#93C5FD' },
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
    if (!sorted.length) return { present: 0, absent: 0, late: 0, leave: 0, total: 0, pct: 0 };
    const present = sorted.filter((r) => r.status === 'present').length;
    const absent = sorted.filter((r) => r.status === 'absent').length;
    const late = sorted.filter((r) => r.status === 'late').length;
    const leave = sorted.filter((r) => r.status === 'leave').length;
    const total = sorted.length;
    // Leave, like absent, does not contribute to the attendance percentage.
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, absent, late, leave, total, pct };
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
          mode="default"
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
            <View style={styles.statItem}>
              <ThemedText style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.leave}</ThemedText>
              <ThemedText style={styles.statLabel}>Leave</ThemedText>
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

// ─── Student own-attendance view ──────────────────────────────────────────────
// Mirrors the web app's StudentOwnView (src/pages/students/AttendancePage.tsx):
// a From/To date-range filter, six summary tiles and a numbered record list.

/** { start, end } defaulting to 1st of current month → today (matches web). */
function currentMonthRange() {
  const today = new Date();
  return {
    start: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: formatDate(today),
  };
}

function StudentOwnView({ studentId }: { studentId: string }) {
  const { colors } = useTheme();
  const [dateFrom, setDateFrom] = useState(() => currentMonthRange().start);
  const [dateTo, setDateTo] = useState(() => currentMonthRange().end);
  const [activePicker, setActivePicker] = useState<'from' | 'to' | null>(null);

  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance-range', studentId, dateFrom, dateTo],
    queryFn: () =>
      studentAttendanceApi.getStudentAttendanceFilter(studentId, {
        start_date: dateFrom,
        end_date: dateTo,
      }),
    enabled: !!studentId && !!dateFrom && !!dateTo,
  });

  const sorted = useMemo(
    () => [...(records ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  );

  const summary = useMemo(() => {
    // Compared as strings: the shared AttendanceStatus union has no 'half_day'
    // member, but the backend does return it (the web app renders it).
    const count = (status: string) =>
      sorted.filter((r) => (r.status as string) === status).length;
    return {
      total: sorted.length,
      present: count('present'),
      absent: count('absent'),
      late: count('late'),
      halfDay: count('half_day'),
      leave: count('leave'),
    };
  }, [sorted]);

  const tiles: { value: number; label: string; color?: string }[] = [
    { value: summary.total, label: 'Total Days' },
    { value: summary.present, label: 'Present', color: '#16A34A' },
    { value: summary.absent, label: 'Absent', color: '#DC2626' },
    { value: summary.late, label: 'Late', color: '#CA8A04' },
    { value: summary.halfDay, label: 'Half Day', color: '#EA580C' },
    { value: summary.leave, label: 'Leave', color: '#2563EB' },
  ];

  const renderDateField = (label: string, value: string, which: 'from' | 'to') => (
    <View style={rStyles.dateCol}>
      <ThemedText style={rStyles.dateLabel}>{label}</ThemedText>
      <TouchableOpacity
        style={[rStyles.dateField, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => setActivePicker(which)}
      >
        <ThemedText style={rStyles.dateFieldText} numberOfLines={1}>
          {value.split('-').reverse().join('-')}
        </ThemedText>
        <Ionicons name="calendar-outline" size={16} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <DatePickerModal
        visible={activePicker !== null}
        initialDate={activePicker === 'to' ? dateTo : dateFrom}
        presets={['today']}
        onConfirm={(date) => {
          if (activePicker === 'to') setDateTo(date);
          else setDateFrom(date);
          setActivePicker(null);
        }}
        onCancel={() => setActivePicker(null)}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Filter by Date */}
        <View style={[styles.filtersCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.filtersTitle}>
            Filter by Date
          </ThemedText>
          <View style={rStyles.dateRow}>
            {renderDateField('From', dateFrom, 'from')}
            {renderDateField('To', dateTo, 'to')}
          </View>
        </View>

        {/* Summary tiles */}
        {!isLoading && sorted.length > 0 && (
          <View style={rStyles.tileGrid}>
            {tiles.map((tile) => (
              <View
                key={tile.label}
                style={[rStyles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <ThemedText style={[rStyles.tileValue, tile.color ? { color: tile.color } : null]}>
                  {tile.value}
                </ThemedText>
                <ThemedText style={rStyles.tileLabel}>{tile.label}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Attendance Records */}
        <View style={[styles.studentsCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.studentsTitle}>
            Attendance Records
          </ThemedText>

          {isLoading ? (
            <ThemedText style={styles.emptyText}>Loading attendance...</ThemedText>
          ) : sorted.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={styles.emptyText}>
                No attendance records found for the selected period.
              </ThemedText>
            </View>
          ) : (
            sorted.map((record, index) => (
              <View
                key={record.id}
                style={[rStyles.recordRow, { borderColor: colors.border }]}
              >
                <ThemedText style={[rStyles.recordIndex, { color: colors['muted-foreground'] }]}>
                  {index + 1}
                </ThemedText>
                <View style={styles.recordDateWrapper}>
                  <ThemedText style={styles.recordDateText}>
                    {new Date(record.date + 'T00:00:00').toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </ThemedText>
                  {record.remarks ? (
                    <ThemedText style={styles.remarksText} numberOfLines={1}>
                      {record.remarks}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(record.status) }]}>
                  <Ionicons name={getStatusIcon(record.status) as any} size={13} color="white" />
                  <ThemedText style={styles.statusText}>{getStatusText(record.status)}</ThemedText>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
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
  const [statusMap, setStatusMap] = useState<Record<string, 'present' | 'absent' | 'late' | 'leave'>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dateStr = selectedDate.toISOString().split('T')[0];

  // Classes with nested sections
  const { data: classesData = [], refetch: refetchClasses } = useQuery({
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

  // Students for selected class/section — mirrors web app's getStudentsByClassSection exactly
  const { data: studentsData = [], isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ['students-att', selectedClass, selectedSection],
    queryFn: () => studentAdmissionsApi.getStudentsByClassSection(
      selectedClass,
      selectedSection || undefined,
    ),
    enabled: !!selectedClass,
  });

  // Attendance records for selected date
  const { data: attendanceRecords = [], refetch: refetchAttendance } = useQuery({
    queryKey: ['att-date', dateStr],
    queryFn: () => studentAttendanceApi.getAttendanceByDate(dateStr),
  });

  // Build statusMap: default all students to 'present', then override with saved records.
  // Matches web app behaviour: students without an attendance record default to Present.
  useEffect(() => {
    if ((studentsData as any[]).length === 0) return;
    const map: Record<string, 'present' | 'absent' | 'late' | 'leave'> = {};
    // Step 1 — pre-fill every student with 'present' (web app default)
    (studentsData as any[]).forEach((s: any) => {
      if (s.student?.id) map[s.student.id] = 'present';
    });
    // Step 2 — override with whatever the backend has saved for this date
    (attendanceRecords as any[]).forEach((r: any) => {
      if (r.student_id) map[r.student_id] = r.status;
    });
    setStatusMap(map);
  }, [studentsData, attendanceRecords]);

  const stats = useMemo(() => {
    let present = 0, absent = 0, late = 0, leave = 0;
    (studentsData as any[]).forEach((s: any) => {
      const status = statusMap[s.student?.id];
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'leave') leave++;
    });
    const total = (studentsData as any[]).length;
    // Leave, like absent, does not count towards the % Present figure.
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, late, leave, total, pct };
  }, [studentsData, statusMap]);

  // Search by name or roll number — matches web app's Filter Students box
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const students = studentsData as any[];
    if (!q) return students;
    return students.filter((s: any) => {
      const name = `${s.student?.first_name ?? ''} ${s.student?.last_name ?? ''}`.toLowerCase();
      const roll = (s.admission_number || '').toLowerCase();
      return name.includes(q) || roll.includes(q);
    });
  }, [studentsData, searchQuery]);

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
    refetchClasses();
    refetchStudents();
    refetchAttendance();
  };

  const handleMark = (studentId: string, status: 'present' | 'absent' | 'late' | 'leave') => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
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
                containerStyle={sStyles.filterDropdownContainer}
                dropdownContainerStyle={sStyles.filterDropdownPopup}
                mode="modal"
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
                containerStyle={sStyles.filterDropdownContainer}
                dropdownContainerStyle={sStyles.filterDropdownPopup}
                mode="modal"
              />
            </View>
            <View style={sStyles.filterCol}>
              <ThemedText style={sStyles.filterLabel}>Date</ThemedText>
              {Platform.OS === 'web' ? (
                /* Web: native HTML date input — browser provides its own calendar icon */
                <View style={[sStyles.dateBtn, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  {/* @ts-ignore — native HTML input, valid in Expo web */}
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e: any) => {
                      const iso: string = e.target.value;
                      if (iso) setSelectedDate(new Date(iso + 'T00:00:00'));
                    }}
                    style={{
                      flex: 1, border: 'none', background: 'transparent',
                      color: colors['card-foreground'], fontSize: 13,
                      outline: 'none', padding: '0 4px', cursor: 'pointer', width: '100%',
                    }}
                  />
                </View>
              ) : (
                /* iOS / Android: native picker triggered by button press */
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
              )}
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
            <View style={[sStyles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <ThemedText style={[sStyles.statNum, { color: '#2563EB' }]}>{stats.leave}</ThemedText>
              <ThemedText style={[sStyles.statLbl, { color: '#2563EB' }]}>Leave</ThemedText>
            </View>
          </View>
        )}

        {/* Total students summary bar */}
        {selectedClass && stats.total > 0 && (
          <View style={sStyles.totalRow}>
            <View style={sStyles.progressBar}>
              <View style={[sStyles.progressSegment, { flex: stats.present, backgroundColor: '#22C55E' }]} />
              <View style={[sStyles.progressSegment, { flex: stats.late, backgroundColor: '#FACC15' }]} />
              <View style={[sStyles.progressSegment, { flex: stats.leave, backgroundColor: '#60A5FA' }]} />
              <View style={[sStyles.progressSegment, { flex: stats.absent, backgroundColor: '#F87171' }]} />
            </View>
            <View style={sStyles.totalRowText}>
              <ThemedText style={[sStyles.totalRowLabel, { color: colors['muted-foreground'] }]}>
                {stats.total} students total
              </ThemedText>
              <ThemedText style={[sStyles.totalRowLabel, { color: colors['muted-foreground'] }]}>
                {stats.pct}% Present
              </ThemedText>
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
            {/* Filter Students */}
            <View style={[sStyles.filterStudentsWrap, { borderBottomColor: colors.border }]}>
              <View style={sStyles.filterStudentsHeader}>
                <Ionicons name="filter-outline" size={15} color={colors['muted-foreground']} />
                <ThemedText style={[sStyles.filterStudentsLabel, { color: colors['muted-foreground'] }]}>
                  Filter Students
                </ThemedText>
                {searchQuery ? (
                  <ThemedText style={[sStyles.filterStudentsCount, { color: colors['muted-foreground'] }]}>
                    {filteredStudents.length} of {(studentsData as any[]).length}
                  </ThemedText>
                ) : null}
              </View>
              <View style={[sStyles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="search" size={15} color={colors['muted-foreground']} />
                <TextInput
                  style={[sStyles.searchInput, { color: colors['card-foreground'] }]}
                  placeholder="Search by name or roll no..."
                  placeholderTextColor={colors['muted-foreground']}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
                    <Ionicons name="close-circle" size={15} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {filteredStudents.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>
                  {searchQuery ? `No students match "${searchQuery}".` : 'No students found'}
                </ThemedText>
              </View>
            ) : (
              filteredStudents.map((student: any, idx: number) => {
                const sid = student.student?.id;
                const status = (sid ? statusMap[sid] : undefined) || 'present';
                const badge = STATUS_BADGE[status];
                // Highlight absent/late rows with a colored box, matching the web app's
                // per-row border (border-red-200 / border-yellow-200) treatment.
                const highlightStyle =
                  status === 'absent'
                    ? sStyles.rowAbsentHighlight
                    : status === 'late'
                    ? sStyles.rowLateHighlight
                    : status === 'leave'
                    ? sStyles.rowLeaveHighlight
                    : null;
                return (
                  <View
                    key={student.id}
                    style={[
                      sStyles.studentRow,
                      { borderBottomColor: colors.border },
                      idx % 2 !== 0 && { backgroundColor: `${colors.primary}08` },
                      highlightStyle,
                    ]}
                  >
                    <ThemedText style={[sStyles.serialNo, { color: colors['muted-foreground'] }]}>
                      {idx + 1}
                    </ThemedText>

                    {/* Status badge (Present / Absent / Late / Leave) */}
                    <View style={[sStyles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <ThemedText style={[sStyles.statusBadgeText, { color: badge.text }]}>
                        {getStatusLabel(status)}
                      </ThemedText>
                    </View>

                    {/* Student info */}
                    <View style={sStyles.studentInfo}>
                      <ThemedText style={sStyles.studentName} numberOfLines={1}>
                        {student.student?.first_name} {student.student?.last_name}
                      </ThemedText>
                      <ThemedText style={sStyles.admNo}>Roll No: {student.admission_number || 'N/A'}</ThemedText>
                    </View>

                    {/* Status dropdown — same options as web app's Select */}
                    {sid ? (
                      <CustomDropdown
                        data={STATUS_OPTIONS}
                        value={status}
                        onChange={(v) => handleMark(sid, v as 'present' | 'absent' | 'late' | 'leave')}
                        search={false}
                        mode="default"
                        style={sStyles.statusDropdown}
                        containerStyle={sStyles.statusDropdownContainer}
                        selectedTextStyle={sStyles.statusDropdownText}
                      />
                    ) : null}
                  </View>
                );
              })
            )}
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
    content = <StudentOwnView studentId={studentId} />;
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
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 56,
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

// ─── Student own-attendance (date range) styles ───────────────────────────────

const rStyles = StyleSheet.create({
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 6,
  },
  dateField: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  dateFieldText: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },

  // Six summary tiles, three per row
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 16,
  },
  tile: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tileValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  tileLabel: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
    textAlign: 'center',
  },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },
  recordIndex: {
    fontSize: 11,
    width: 16,
    textAlign: 'right',
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
  // CustomDropdown's own container bakes in a marginBottom (meant for stacked
  // form fields); zero it here so the dropdown's box bottom-aligns flush with
  // the Date column's box instead of sitting above an invisible gap.
  filterDropdownContainer: {
    marginBottom: 0,
  },
  // The dropdown's popup panel (list + search box) is width-measured from
  // its trigger field by default, which in this 3-up compact row leaves it
  // only ~1/3 of the screen wide — too narrow for the search input, causing
  // it to render squeezed/misaligned. Give it a fixed, legible width and pair
  // it with mode="modal" so it centers on screen instead of anchoring to the
  // (narrow) trigger.
  filterDropdownPopup: {
    width: 280,
    maxWidth: '85%',
    alignSelf: 'center',
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

  // Total students summary bar
  totalRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  progressBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 6,
  },
  progressSegment: {
    height: '100%',
  },
  totalRowText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalRowLabel: {
    fontSize: 11,
    fontWeight: '500',
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
  // Filter Students (search bar above the list — matches web app)
  filterStudentsWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  filterStudentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterStudentsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterStudentsCount: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  // Absent/late rows get a colored bordered box, matching the web app's
  // border-red-200 / border-yellow-200 row highlighting.
  rowAbsentHighlight: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderBottomColor: '#FCA5A5',
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  rowLateHighlight: {
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderBottomColor: '#FDE68A',
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  rowLeaveHighlight: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderBottomColor: '#93C5FD',
    borderRadius: 10,
    marginHorizontal: 6,
    marginVertical: 2,
  },
  serialNo: {
    fontSize: 11,
    width: 16,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 58,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
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
  statusDropdown: {
    height: 36,
    minWidth: 108,
    paddingHorizontal: 10,
    paddingVertical: 0,
  },
  statusDropdownContainer: {
    marginBottom: 0,
  },
  statusDropdownText: {
    fontSize: 12,
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
