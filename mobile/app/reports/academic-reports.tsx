import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useTheme } from '@/contexts';
import { examsApi } from '@/src/api/exam';

const COLOR = '#EF4444';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:     { bg: '#f1f5f9', text: '#475569' },
  active:    { bg: '#dbeafe', text: '#1e40af' },
  locked:    { bg: '#fef3c7', text: '#92400e' },
  published: { bg: '#d1fae5', text: '#065f46' },
  finalized: { bg: '#ede9fe', text: '#5b21b6' },
};

export default function AcademicReportsScreen() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['academic-report-exams'],
    queryFn: () => examsApi.list(),
  });

  const published = (exams as any[]).filter(e => e.status === 'published' || e.status === 'finalized').length;
  const active = (exams as any[]).filter(e => e.status === 'active').length;
  const draft = (exams as any[]).filter(e => e.status === 'draft').length;

  return (
    <ScreenLayout title="Academic Reports">
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="school" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>Academic / Exam Overview</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLOR} size="large" />
          <Text style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
                  <Text style={[styles.statValue, { color: '#065f46' }]}>{published}</Text>
                  <Text style={[styles.statLabel, { color: '#065f46' }]}>Published</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
                  <Text style={[styles.statValue, { color: '#1e40af' }]}>{active}</Text>
                  <Text style={[styles.statLabel, { color: '#1e40af' }]}>Active</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.statValue, { color: '#475569' }]}>{draft}</Text>
                  <Text style={[styles.statLabel, { color: '#475569' }]}>Draft</Text>
                </View>
              </View>
              <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>ALL EXAMS</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={40} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No exams found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const exam = item as any;
            const sc = STATUS_COLORS[exam.status] || STATUS_COLORS.draft;
            return (
              <View style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={styles.rowHeader}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>{exam.exam_name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{exam.status}</Text>
                  </View>
                </View>
                <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                  {exam.exam_type} · {exam.board} · {exam.academic_year_title || ""}
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
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
