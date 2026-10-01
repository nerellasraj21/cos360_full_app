import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { studentAttendanceApi } from '@/src/api/students';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const STATUS_COLOR: Record<string, string> = {
  present: '#10B981',
  absent: '#EF4444',
  late: '#F59E0B',
};

const toYYYYMMDD = (d: Date) => d.toISOString().slice(0, 10);

function ParentAttendanceScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { selectedStudent } = useAuth();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const today = new Date();
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const [startDate] = useState(toYYYYMMDD(monthAgo));
  const [endDate] = useState(toYYYYMMDD(today));

  const { data: records, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['parentAttendance', selectedStudent?.id, startDate, endDate],
    queryFn: () =>
      studentAttendanceApi.getStudentAttendanceFilter(selectedStudent!.id, {
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: !!selectedStudent?.id,
  });

  if (!selectedStudent) {
    return (
      <AppLayout title="Attendance">
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
            No child selected.
          </Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/parents/select-child' as any)}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Select a child</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Attendance">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Attendance">
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.centeredText, { color: colors['muted-foreground'] }]}>
            Could not load attendance.
          </Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => refetch()}>
            <Text style={{ color: '#556ee6', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const rows = records ?? [];
  const present = rows.filter((r) => r.status === 'present').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const late = rows.filter((r) => r.status === 'late').length;
  const pct = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0;

  return (
    <AppLayout title={`Attendance — ${selectedStudent.name ?? ''}`}>
      <FlatList
        data={[...rows].reverse()}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {/* Summary row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
                <Text style={styles.statLabel}>Present</Text>
                <Text style={styles.statValue}>{present}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.statLabel}>Absent</Text>
                <Text style={styles.statValue}>{absent}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.statLabel}>Late</Text>
                <Text style={styles.statValue}>{late}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#556ee6' }]}>
                <Text style={styles.statLabel}>Rate</Text>
                <Text style={styles.statValue}>{pct}%</Text>
              </View>
            </View>
            <Text style={[styles.rangeLabel, { color: colors['muted-foreground'] }]}>
              Last 30 days ({startDate} to {endDate})
            </Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              No attendance records found.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: STATUS_COLOR[item.status] ?? '#94a3b8' },
              ]}
            />
            <Text style={[styles.dateText, { color: colors.foreground }]}>{item.date}</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: (STATUS_COLOR[item.status] ?? '#94a3b8') + '22' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: STATUS_COLOR[item.status] ?? '#94a3b8' },
                ]}
              >
                {(item.status ?? '').charAt(0).toUpperCase() + (item.status ?? '').slice(1)}
              </Text>
            </View>
            {item.remarks ? (
              <Text style={[styles.remarks, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                {item.remarks}
              </Text>
            ) : null}
          </View>
        )}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  centeredText: { fontSize: 15, textAlign: 'center' },
  linkBtn: { marginTop: 4, padding: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3 },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600' },
  statValue: { color: 'white', fontSize: 18, fontWeight: '700' },
  rangeLabel: { fontSize: 11, marginBottom: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  dateText: { fontSize: 13, fontWeight: '600', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  remarks: { fontSize: 11, flex: 1 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ParentAttendanceScreen() {
  return (
    <ScreenAccessGate
      title="Attendance"
      permissions={[
        ['profile', 'read_own'],
        ['students', 'read'],
        ['student_attendance', 'read'],
        ['student_attendance', 'list'],
        ['student_attendance', 'read_related'],
        ['student_attendance', 'list_related'],
      ]}
    >
      <ParentAttendanceScreenContent />
    </ScreenAccessGate>
  );
}
