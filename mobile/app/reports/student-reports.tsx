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
import { studentAttendanceApi } from '@/src/api/students';

const COLOR = '#3B82F6';

const DATE_RANGES = [
  { label: 'Today', days: 0 },
  { label: 'Last 7D', days: 7 },
  { label: 'Last 30D', days: 30 },
];

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  if (days > 0) start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start_date: fmt(start), end_date: fmt(end) };
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  present: { bg: '#d1fae5', text: '#065f46' },
  absent:  { bg: '#fee2e2', text: '#991b1b' },
  late:    { bg: '#fef3c7', text: '#92400e' },
};

export default function StudentReportsScreen() {
  const { colors, theme } = useTheme();
  const [rangeDays, setRangeDays] = useState(7);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { start_date, end_date } = getDateRange(rangeDays);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['student-attendance-report', start_date, end_date],
    queryFn: () => studentAttendanceApi.searchAttendance({ start_date, end_date }),
  });

  const present = records.filter((r: any) => r.status === 'present').length;
  const absent = records.filter((r: any) => r.status === 'absent').length;
  const late = records.filter((r: any) => r.status === 'late').length;
  const rate = records.length > 0 ? `${((present / records.length) * 100).toFixed(1)}%` : '—';

  return (
    <ScreenLayout title="Student Reports">
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="people" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>Student Attendance Report</Text>
      </View>

      <View style={[styles.filterBar, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        {DATE_RANGES.map(range => (
          <TouchableOpacity
            key={range.days}
            style={[
              styles.filterChip,
              { borderColor: borderCol },
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
          <Text style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* 2×2 stats grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
                  <Text style={[styles.statValue, { color: '#065f46' }]}>{present}</Text>
                  <Text style={[styles.statLabel, { color: '#065f46' }]}>Present</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.statValue, { color: '#991b1b' }]}>{absent}</Text>
                  <Text style={[styles.statLabel, { color: '#991b1b' }]}>Absent</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.statValue, { color: '#92400e' }]}>{late}</Text>
                  <Text style={[styles.statLabel, { color: '#92400e' }]}>Late</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.statValue, { color: '#1e40af' }]}>{rate}</Text>
                  <Text style={[styles.statLabel, { color: '#1e40af' }]}>Present Rate</Text>
                </View>
              </View>
              <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>ATTENDANCE RECORDS</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No records for this period</Text>
            </View>
          }
          renderItem={({ item }) => {
            const rec = item as any;
            const sc = STATUS_COLORS[rec.status] || STATUS_COLORS.present;
            return (
              <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {rec.student_name || `Student #${rec.student_id?.slice(0, 8)}`}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{rec.status}</Text>
                  </View>
                </View>
                <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                  {rec.date}{rec.class_name ? ` · ${rec.class_name}` : ''}
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  bannerDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  filterBar: { flexDirection: 'row', gap: 8, padding: 12, borderBottomWidth: 1 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { width: '47.5%', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  rowCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, elevation: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rowTitle: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  rowSub: { fontSize: 12 },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 40 },
  emptyText: { fontSize: 14 },
});
