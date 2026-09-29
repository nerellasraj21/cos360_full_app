import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useTheme } from '@/contexts';
import { staffAttendanceReportsApi } from '@/src/api/staff';
import { exportToCsv } from '@/src/utils/exportCsv';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const COLOR = '#8B5CF6';

const DATE_RANGES = [
  { label: 'Today', days: 0 },
  { label: 'Last 7D', days: 7 },
  { label: 'Last 30D', days: 30 },
  { label: 'Last 90D', days: 90 },
];

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  if (days > 0) start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { date_from: fmt(start), date_to: fmt(end) };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  present:  { bg: '#d1fae5', text: '#065f46' },
  absent:   { bg: '#fee2e2', text: '#991b1b' },
  late:     { bg: '#fef3c7', text: '#92400e' },
  leave:    { bg: '#dbeafe', text: '#1e40af' },
  half_day: { bg: '#ede9fe', text: '#5b21b6' },
};

function StaffReportsScreenContent() {
  const { colors, theme } = useTheme();
  const [rangeDays, setRangeDays] = useState(30);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { date_from, date_to } = getDateRange(rangeDays);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['staff-attendance-stats', date_from, date_to],
    queryFn: () => staffAttendanceReportsApi.getAttendanceStats({ date_from, date_to }),
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['staff-attendance-report', date_from, date_to],
    queryFn: () => staffAttendanceReportsApi.getAttendanceReport({ date_from, date_to, page_size: 100 }),
  });

  const isLoading = statsLoading || recordsLoading;
  const summary = stats?.summary_stats;

  const handleExport = () =>
    exportToCsv(
      'staff_attendance_report.csv',
      ['#', 'Staff Name', 'Date', 'Status', 'Designation'],
      records.map((r, i) => [i + 1, r.staff_name, r.date ?? '', r.attendance_status, r.designation ?? '']),
    );

  return (
    <ScreenLayout title="Staff Reports">
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="person" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>Staff Attendance Report</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
          <Ionicons name="share-outline" size={16} color="white" />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      <View style={[styles.filterBar, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        {DATE_RANGES.map(range => (
          <TouchableOpacity
            key={range.days}
            style={[
              styles.filterChip,
              { borderColor: borderCol, backgroundColor: cardBg },
              rangeDays === range.days && { backgroundColor: COLOR, borderColor: COLOR },
            ]}
            onPress={() => setRangeDays(range.days)}
          >
            <Text style={[styles.filterChipText, { color: rangeDays === range.days ? 'white' : colors['muted-foreground'] }]}>
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLOR} size="large" />
          <Text style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading report...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            summary ? (
              <View>
                {/* Stats Row */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
                    <Text style={[styles.statValue, { color: '#065f46' }]}>{summary.present_count}</Text>
                    <Text style={[styles.statLabel, { color: '#065f46' }]}>Present</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.statValue, { color: '#991b1b' }]}>{summary.absent_count}</Text>
                    <Text style={[styles.statLabel, { color: '#991b1b' }]}>Absent</Text>
                  </View>
                  <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
                    <Text style={[styles.statValue, { color: '#5b21b6' }]}>
                      {`${summary.attendance_percentage.toFixed(1)}%`}
                    </Text>
                    <Text style={[styles.statLabel, { color: '#5b21b6' }]}>Rate</Text>
                  </View>
                </View>
                <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>RECORDS</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No records for this period</Text>
            </View>
          }
          renderItem={({ item: rec }) => {
            const statusColor = STATUS_COLORS[rec.attendance_status] || STATUS_COLORS.present;
            return (
              <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {rec.staff_name || 'Staff'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                    <Text style={[styles.statusText, { color: statusColor.text }]}>
                      {(rec.attendance_status || '').replace(/[-_]/g, ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                  {rec.date} {rec.designation ? `\u00b7 ${rec.designation}` : ''}
                </Text>
              </View>
            );
          }}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -20, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700', flex: 1 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  exportBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  filterBar: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  rowCard: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8,
    elevation: 1,
  },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  rowSub: { fontSize: 12, lineHeight: 18 },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 40 },
  emptyText: { fontSize: 14 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function StaffReportsScreen() {
  return (
    <ScreenAccessGate
      title="Staff Reports"
      resources={['staff', 'staff_attendance']}
      blockRoles={['student']}
    >
      <StaffReportsScreenContent />
    </ScreenAccessGate>
  );
}
