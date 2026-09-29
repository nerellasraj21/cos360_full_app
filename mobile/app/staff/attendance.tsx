import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReadOrListPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { CustomDropdown } from '@/components/ui/dropdown';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Colors } from '@/constants/theme';
import {
  useStaffAttendance,
  useStaffEnrollments,
  useCreateStaffAttendance,
  useUpdateStaffAttendance,
  useDeleteStaffAttendance
} from '@/hooks/use-staff-api';
import type { Staff, StaffAttendance, StaffAttendanceInput } from '@/src/types/masters/staff';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/components/ToastProvider';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';

// Matches web app's status Select options exactly (staff/attendance.tsx)
const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present',  label: 'Present',  color: '#10B981' },
  { value: 'absent',   label: 'Absent',   color: '#EF4444' },
  { value: 'late',     label: 'Late',     color: '#F59E0B' },
  { value: 'half_day', label: 'Half Day', color: '#3B82F6' },
];

// Matches web app's Attendance Analysis cards — same 4 names, same order (Present, Absent, Late, Half Day)
const ANALYSIS_CARDS: { key: AttendanceStatus; label: string }[] = [
  { key: 'present',  label: 'PRESENT' },
  { key: 'absent',   label: 'ABSENT' },
  { key: 'late',     label: 'LATE' },
  { key: 'half_day', label: 'HALF DAY' },
];

// Column visibility — mirrors web's "Columns" menu (Staff Name is fixed, rest are toggleable)
const COLUMN_DEFS: { key: string; label: string; fixed?: boolean }[] = [
  { key: 'staff_name', label: 'Staff Name', fixed: true },
  { key: 'email', label: 'Email' },
  { key: 'department', label: 'Department' },
  { key: 'status', label: 'Status' },
  { key: 'modified', label: 'Modified' },
];
const FIXED_COLUMNS = new Set(['staff_name']);

// Classifies a failed attendance mutation into a distinct {title, message} pair
// so the toast tells the user *what kind* of failure happened (network drop,
// expired session, no permission, bad data, stale record, server outage) —
// apiClient's response interceptor already rewrites error.message per status,
// this just adds a matching title and a safe fallback for non-HTTP failures.
function getAttendanceErrorInfo(error: any): { title: string; message: string } {
  // Request went out but no response came back — offline / timeout / DNS failure.
  if (!error?.response && error?.request) {
    return { title: 'Network Error', message: 'Please check your internet connection and try again.' };
  }

  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;
  const detailStr: string | undefined =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
      ? detail.map((e: any) => e?.msg ?? String(e)).join('; ')
      : undefined;

  switch (status) {
    case 400:
      return { title: 'Invalid Request', message: detailStr || 'Please check the attendance data and try again.' };
    case 401:
      return { title: 'Session Expired', message: 'Please log in again to continue.' };
    case 403:
      return { title: 'Permission Denied', message: detailStr || "You don't have permission to update staff attendance." };
    case 404:
      return { title: 'Not Found', message: detailStr || 'That attendance record no longer exists. Please refresh and try again.' };
    case 409:
      return { title: 'Conflict', message: detailStr || 'This record was changed elsewhere. Please refresh and try again.' };
    case 422:
      return { title: 'Validation Failed', message: detailStr || 'Some attendance data is invalid. Please check and try again.' };
    case 429:
      return { title: 'Too Many Requests', message: 'Please wait a moment and try again.' };
    case 500:
    case 502:
    case 503:
    case 504:
      return { title: 'Server Error', message: 'The server is currently unavailable. Please try again later.' };
    default:
      return { title: 'Error', message: detailStr || error?.message || 'Failed to update attendance.' };
  }
}

function getStatusColor(status?: string): string {
  return STATUS_OPTIONS.find(s => s.value === status)?.color ?? '#10B981';
}

function getStatusLabel(status?: string): string {
  return STATUS_OPTIONS.find(s => s.value === status)?.label ?? 'Present';
}

function StaffAttendanceScreenContent() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [attendanceUpdates, setAttendanceUpdates] = useState<Record<string, StaffAttendanceInput>>({});
  const [search, setSearch] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(['staff_name', 'email', 'department', 'status', 'modified'])
  );
  const [showColumnsSheet, setShowColumnsSheet] = useState(false);

  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { hasPermission } = useAuth();
  const { showSuccess, showError, showWarning } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

  const canWrite = hasPermission(PERMISSION_RESOURCES.STAFF_ATTENDANCE, 'update')
    || hasPermission(PERMISSION_RESOURCES.STAFF_ATTENDANCE, 'create');

  const { data: staffData, isLoading: staffLoading, refetch: refetchStaff } = useStaffEnrollments({
    is_active: true,
    limit: 100
  });

  const { data: attendanceData, isLoading: attendanceLoading, error, refetch: refetchAttendance } = useStaffAttendance({
    start_date: selectedDate,
    end_date: selectedDate,
    skip: 0,
    limit: 500
  });

  const createAttendanceMutation = useCreateStaffAttendance();
  const updateAttendanceMutation = useUpdateStaffAttendance();
  const deleteAttendanceMutation = useDeleteStaffAttendance();

  const staffList = useMemo(() => staffData?.items || [], [staffData]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, StaffAttendance>();
    for (const r of (attendanceData?.items || [])) {
      map.set(r.staff_id, r);
    }
    return map;
  }, [attendanceData]);

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return staffList;
    const q = search.toLowerCase();
    return staffList.filter(s =>
      `${s.first_name} ${s.last_name ?? ''}`.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q) ||
      s.employee_id?.toLowerCase().includes(q)
    );
  }, [staffList, search]);

  const isLoading = staffLoading || attendanceLoading;

  const getAttendanceStatus = (staffId: string): StaffAttendanceInput | StaffAttendance | undefined =>
    attendanceUpdates[staffId] || attendanceMap.get(staffId);

  const handleAttendanceChange = (staffId: string, status: AttendanceStatus, remarks?: string) => {
    setAttendanceUpdates(prev => ({
      ...prev,
      [staffId]: {
        staff_id: staffId,
        date: selectedDate,
        status,
        remarks: status !== 'present' ? remarks : undefined,
      }
    }));
  };

  const handleSaveAttendance = () => {
    const pending = Object.keys(attendanceUpdates).length;
    if (pending === 0) {
      showWarning('No Changes', 'No attendance changes to save');
      return;
    }
    confirm({
      title: 'Save Attendance?',
      message: `You are about to save attendance changes for ${pending} staff member${pending === 1 ? '' : 's'} on ${selectedDate}. Continue?`,
      confirmLabel: 'Save',
      onConfirm: doSaveAttendance,
    });
  };

  const doSaveAttendance = async () => {
    try {
      // Keep each staff id paired with its outcome so a failure can be reported
      // per-record and only the succeeded entries are cleared from local state.
      const entries = Object.entries(attendanceUpdates);
      const results = await Promise.allSettled(
        entries.map(([staffId, update]) => {
          const existing = attendanceMap.get(staffId);
          if (update.status === 'present') {
            return existing ? deleteAttendanceMutation.mutateAsync(existing.id) : Promise.resolve();
          }
          if (existing) {
            return updateAttendanceMutation.mutateAsync({ id: existing.id, data: { status: update.status, remarks: update.remarks } });
          }
          return createAttendanceMutation.mutateAsync(update);
        })
      );

      const failedStaffIds = new Set<string>();
      // Keep the first rejection around so the failure toast can name the
      // actual error type (network/auth/permission/validation/conflict/server)
      // instead of a one-size-fits-all "failed" message.
      let firstFailure: any = null;
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          failedStaffIds.add(entries[i][0]);
          if (!firstFailure) firstFailure = result.reason;
        }
      });

      // Refetch directly so attendanceMap is guaranteed fresh before clearing
      // pending updates — invalidateQueries alone can resolve before the cache
      // update propagates to the component (race on mobile focus changes).
      await refetchAttendance();

      if (failedStaffIds.size === 0) {
        setAttendanceUpdates({});
        showSuccess('Success', 'Attendance updated successfully');
        return;
      }

      // Only drop the successful entries — keep failed ones pending so the user
      // can see what still needs saving and retry without resubmitting the rest.
      setAttendanceUpdates(prev => {
        const next: Record<string, StaffAttendanceInput> = {};
        for (const [staffId, update] of Object.entries(prev)) {
          if (failedStaffIds.has(staffId)) next[staffId] = update;
        }
        return next;
      });

      const succeededCount = entries.length - failedStaffIds.size;
      const { title, message } = getAttendanceErrorInfo(firstFailure);
      if (succeededCount > 0) {
        showError(
          `Partial Save — ${title}`,
          `${succeededCount} saved, ${failedStaffIds.size} failed (${message}). Failed entries are still marked as pending — please retry.`
        );
      } else {
        showError(title, message);
      }
    } catch (error: any) {
      // Guards against failures outside the per-record mutations themselves
      // (e.g. the post-save refetch failing) so this never becomes an
      // unhandled rejection — doSaveAttendance is invoked fire-and-forget
      // from the confirm modal's onConfirm. Classified the same way as the
      // per-record failures above so the toast names the actual error type.
      const { title, message } = getAttendanceErrorInfo(error);
      showError(title, message);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
    setAttendanceUpdates({});
  };

  const isFutureDate = new Date(selectedDate) > new Date();
  const refetch = () => { refetchStaff(); refetchAttendance(); };

  // Summary counts — same 4 categories/names as web (no separate "Total" card)
  const presentCount  = staffList.filter(s => { const a = getAttendanceStatus(s.id); return !a || a.status === 'present'; }).length;
  const absentCount   = staffList.filter(s => getAttendanceStatus(s.id)?.status === 'absent').length;
  const lateCount     = staffList.filter(s => getAttendanceStatus(s.id)?.status === 'late').length;
  const halfDayCount  = staffList.filter(s => getAttendanceStatus(s.id)?.status === 'half_day').length;
  const totalStaff = staffList.length;
  const attendancePct = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

  const summaryByKey: Record<AttendanceStatus, number> = {
    present: presentCount,
    absent: absentCount,
    late: lateCount,
    half_day: halfDayCount,
  };

  const isSaving = createAttendanceMutation.isPending || updateAttendanceMutation.isPending || deleteAttendanceMutation.isPending;
  const pendingCount = Object.keys(attendanceUpdates).length;

  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB';

  const toggleColumn = (key: string) => {
    if (FIXED_COLUMNS.has(key)) return;
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (error) {
    const isAuthError = (error as any)?.response?.status === 401 || (error as any)?.response?.status === 403;
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}
              accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>Staff Attendance</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color="#9CA3AF" />
          <ThemedText type="subtitle" style={styles.emptyTitle}>{isAuthError ? 'Authentication Required' : 'Error'}</ThemedText>
          <ThemedText style={styles.emptyText}>{isAuthError ? 'Please log in to access attendance data' : 'Failed to load attendance data'}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={isAuthError ? () => router.replace('/login') : refetch}>
            <ThemedText style={styles.retryText}>{isAuthError ? 'Go to Login' : 'Retry'}</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  const renderItem = ({ item, index }: { item: Staff; index: number }) => {
    const attendance = getAttendanceStatus(item.id);
    const staffName = `${item.first_name} ${item.last_name || ''}`.trim();
    const isModified = !!attendanceUpdates[item.id];
    const canEditRow = canWrite && !isFutureDate;

    return (
      <View style={[styles.attendanceCard, { backgroundColor: themeColors.card, borderColor: isModified ? themeColors.primary : borderCol }]}>
        <View style={styles.cardTopRow}>
          <ThemedText style={[styles.serialNo, { color: themeColors['muted-foreground'] }]}>{index + 1}</ThemedText>
          <ThemedText style={styles.staffName}>{staffName}</ThemedText>
          {visibleColumns.has('modified') && isModified && (
            <View style={[styles.modifiedBadge, { backgroundColor: themeColors.muted }]}>
              <ThemedText style={[styles.modifiedBadgeText, { color: themeColors['muted-foreground'] }]}>Modified</ThemedText>
            </View>
          )}
        </View>

        {visibleColumns.has('email') && !!item.email && (
          <ThemedText style={[styles.staffMeta, { color: themeColors['muted-foreground'] }]}>{item.email}</ThemedText>
        )}
        {visibleColumns.has('department') && !!item.department && (
          <ThemedText style={[styles.staffMeta, { color: themeColors['muted-foreground'] }]}>{item.department}</ThemedText>
        )}

        {visibleColumns.has('status') && (
          <View style={styles.statusRow}>
            {canEditRow ? (
              <CustomDropdown
                data={STATUS_OPTIONS}
                value={attendance?.status ?? 'present'}
                onChange={(value) => handleAttendanceChange(item.id, value as AttendanceStatus, (attendance as any)?.remarks)}
                search={false}
                mode="modal"
                containerStyle={styles.statusDropdownContainer}
                style={styles.statusDropdown}
                selectedTextStyle={{ fontSize: 13, fontWeight: '600' }}
              />
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(attendance?.status) }]}>
                <ThemedText style={styles.statusBadgeText}>{getStatusLabel(attendance?.status)}</ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}
              accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.headerTitle}>Staff Attendance</ThemedText>
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: borderCol }]}
          onPress={refetch}
          disabled={isLoading}
          accessibilityLabel="Refresh"
        >
          <Ionicons name="refresh" size={16} color={themeColors['card-foreground']} />
          <ThemedText style={styles.refreshButtonText}>{isLoading ? 'Refreshing...' : 'Refresh'}</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={[styles.dateSelector, { backgroundColor: themeColors.card, borderColor: borderCol }]}>
        <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(-1)}
              accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} color={themeColors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateDisplay} onPress={() => setShowDatePicker(true)}>
          <View style={styles.dateDisplayRow}>
            <Ionicons name="calendar-outline" size={13} color={themeColors.primary} style={{ marginRight: 6 }} />
            <ThemedText style={styles.dateText}>
              {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </ThemedText>
          </View>
          {isFutureDate && <ThemedText style={styles.futureText}>Future Date — Read Only</ThemedText>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(1)}
              accessibilityLabel="Next">
          <Ionicons name="chevron-forward" size={20} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <DatePickerModal
        visible={showDatePicker}
        initialDate={selectedDate}
        onConfirm={(date) => { setSelectedDate(date); setAttendanceUpdates({}); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
        presets={['today']}
      />

      {/* Attendance Analysis */}
      {totalStaff > 0 && (
        <View style={[styles.analysisCard, { backgroundColor: themeColors.card, borderColor: borderCol }]}>
          <View style={styles.analysisHeaderRow}>
            <ThemedText style={[styles.analysisTitle, { color: themeColors['muted-foreground'] }]}>Attendance Analysis</ThemedText>
            <ThemedText style={styles.analysisPct}>{attendancePct}% Present</ThemedText>
          </View>

          <View style={styles.analysisGrid}>
            {ANALYSIS_CARDS.map(({ key, label }) => {
              const opt = STATUS_OPTIONS.find(s => s.value === key)!;
              return (
                <View
                  key={key}
                  style={[styles.analysisTile, { backgroundColor: `${opt.color}1A`, borderColor: `${opt.color}55` }]}
                >
                  <ThemedText style={[styles.analysisValue, { color: opt.color }]}>{summaryByKey[key]}</ThemedText>
                  <ThemedText style={[styles.analysisLabel, { color: opt.color }]}>{label}</ThemedText>
                </View>
              );
            })}
          </View>

          <View style={[styles.progressBg, { backgroundColor: borderCol }]}>
            <View style={styles.progressRowInner}>
              <View style={{ width: `${(presentCount / totalStaff) * 100}%` as any, backgroundColor: '#10B981' }} />
              <View style={{ width: `${(lateCount / totalStaff) * 100}%` as any, backgroundColor: '#F59E0B' }} />
              <View style={{ width: `${(halfDayCount / totalStaff) * 100}%` as any, backgroundColor: '#3B82F6' }} />
              <View style={{ width: `${(absentCount / totalStaff) * 100}%` as any, backgroundColor: '#EF4444' }} />
            </View>
          </View>

          <View style={styles.analysisFooterRow}>
            <ThemedText style={[styles.analysisFooterText, { color: themeColors['muted-foreground'] }]}>{totalStaff} staff total</ThemedText>
            <View style={styles.legendRow}>
              {[
                { label: 'Present', color: '#10B981' },
                { label: 'Late', color: '#F59E0B' },
                { label: 'Half Day', color: '#3B82F6' },
                { label: 'Absent', color: '#EF4444' },
              ].map(({ label, color }) => (
                <View key={label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <ThemedText style={[styles.legendText, { color: themeColors['muted-foreground'] }]}>{label}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Filter title */}
      <View style={styles.filterTitleRow}>
        <Ionicons name="filter-outline" size={15} color={themeColors['muted-foreground']} />
        <ThemedText style={[styles.filterTitle, { color: themeColors['muted-foreground'] }]}>Filter Staff</ThemedText>
        {!!search && (
          <ThemedText style={[styles.filterCount, { color: themeColors['muted-foreground'] }]}>
            {filteredStaff.length} of {totalStaff}
          </ThemedText>
        )}
      </View>

      {/* Search + Columns */}
      <View style={styles.filterRow}>
        <View style={[styles.searchBar, { backgroundColor: themeColors.card, borderColor: borderCol }]}>
          <Ionicons name="search-outline" size={16} color={themeColors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
            placeholder="Search by name, email, or department..."
            placeholderTextColor={themeColors['muted-foreground']}
            value={search}
            onChangeText={setSearch}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}
              accessibilityLabel="Close"><Ionicons name="close-circle" size={16} color={themeColors['muted-foreground']} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity
          style={[styles.columnsButton, { backgroundColor: themeColors.card, borderColor: borderCol }]}
          onPress={() => setShowColumnsSheet(true)}
        >
          <Ionicons name="eye-outline" size={15} color={themeColors['card-foreground']} />
          <ThemedText style={styles.columnsButtonText}>{`Columns (${visibleColumns.size}/${COLUMN_DEFS.length})`}</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      {canWrite && (
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STAFF_ATTENDANCE}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: themeColors.primary, opacity: (isSaving || pendingCount === 0) ? 0.5 : 1 }]}
            onPress={handleSaveAttendance}
            disabled={isSaving || pendingCount === 0}
          >
            <ThemedText style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : `Save Attendance${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            </ThemedText>
          </TouchableOpacity>
        </UpdatePermissionGuard>
      )}

      {/* Staff List */}
      <FlatList
        style={styles.staffList}
        data={filteredStaff}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={themeColors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={56} color="#9CA3AF" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              {search ? 'No results found' : 'No Staff Found'}
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {search ? `No staff matching "${search}"` : 'No active staff members available'}
            </ThemedText>
          </View>
        }
      />

      {/* Columns sheet — mirrors web's Columns menu */}
      {showColumnsSheet && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowColumnsSheet(false)} />
          <View style={[styles.pickerSheet, { backgroundColor: themeColors.background }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: borderCol }]}>
              <ThemedText style={styles.sheetTitle}>Columns</ThemedText>
              <TouchableOpacity onPress={() => setShowColumnsSheet(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>
            {COLUMN_DEFS.map((col) => {
              const isFixed = !!col.fixed;
              const checked = visibleColumns.has(col.key);
              return (
                <TouchableOpacity
                  key={col.key}
                  style={[styles.sheetItem, { borderBottomColor: borderCol, opacity: isFixed ? 0.6 : 1 }]}
                  onPress={() => toggleColumn(col.key)}
                  disabled={isFixed}
                >
                  <ThemedText style={styles.sheetItemText}>
                    {col.label}{isFixed ? '  (fixed)' : ''}
                  </ThemedText>
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={checked ? themeColors.primary : themeColors['muted-foreground']}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <ConfirmModal {...modalProps} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  refreshButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  refreshButtonText: { fontSize: 12, fontWeight: '600' },

  dateSelector: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  dateButton: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  dateDisplay: { flex: 1, alignItems: 'center' },
  dateDisplayRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  futureText: { fontSize: 11, color: '#F59E0B', marginTop: 2 },

  analysisCard: { borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10 },
  analysisHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  analysisTitle: { fontSize: 13, fontWeight: '600' },
  analysisPct: { fontSize: 13, fontWeight: '700' },
  analysisGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  analysisTile: { flexBasis: '47%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, gap: 1 },
  analysisValue: { fontSize: 18, fontWeight: '700' },
  analysisLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressRowInner: { flexDirection: 'row', height: '100%' },
  analysisFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 6 },
  analysisFooterText: { fontSize: 11 },
  legendRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10 },

  filterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  filterTitle: { fontSize: 13, fontWeight: '600' },
  filterCount: { fontSize: 11, marginLeft: 'auto' },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  columnsButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  columnsButtonText: { fontSize: 11, fontWeight: '600' },

  saveButton: { paddingVertical: 9, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  saveButtonText: { color: 'white', fontSize: 13, fontWeight: '700' },

  staffList: { flex: 1 },
  listContainer: { paddingBottom: 20 },
  attendanceCard: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serialNo: { fontSize: 10, fontWeight: '600' },
  staffName: { fontSize: 14, fontWeight: '600', flex: 1 },
  staffMeta: { fontSize: 11 },
  modifiedBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  modifiedBadgeText: { fontSize: 10, fontWeight: '600' },

  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  statusDropdownContainer: { width: 140 },
  statusDropdown: { minHeight: 36, paddingHorizontal: 10, paddingVertical: 0 },
  statusBadge: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, gap: 8 },
  emptyTitle: { marginTop: 8 },
  emptyText: { textAlign: 'center', opacity: 0.7, fontSize: 13 },
  retryButton: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 8 },
  retryText: { color: 'white', fontWeight: '600' },

  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  sheetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetItemText: { fontSize: 14 },
});

export default function StaffAttendanceScreen() {
  const router = useRouter();
  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STAFF_ATTENDANCE}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}
              accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <ThemedText type="title" style={styles.headerTitle}>Staff Attendance</ThemedText>
          </View>
          <View style={styles.emptyContainer}>
            <Ionicons name="lock-closed" size={56} color="#9CA3AF" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>Access Denied</ThemedText>
            <ThemedText style={styles.emptyText}>You don't have permission to view staff attendance</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <StaffAttendanceScreenContent />
    </ReadOrListPermissionGuard>
  );
}
