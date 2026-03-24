import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { examsApi, examDatesApi, ExamStatus } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: exam, isLoading, error } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => examsApi.getById(id),
    enabled: !!id,
  });

  const { data: dates } = useQuery({
    queryKey: ['exam-dates', id],
    queryFn: () => examDatesApi.list(id),
    enabled: !!id && hasPermission?.('exam_dates', 'list'),
  });

  const { data: subjectConfigs } = useQuery({
    queryKey: ['exam-subject-configs', id],
    queryFn: () => examsApi.getSubjectConfigs(id),
    enabled: !!id,
  });

  const unlockMutation = useMutation({
    mutationFn: () => examsApi.unlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      showSuccess('Exam Unlocked', 'Exam unlocked for corrections.');
    },
    onError: () => showError('Error', 'Failed to unlock exam.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => examsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      router.back();
    },
    onError: () => showError('Error', 'Failed to delete exam.'),
  });

  if (isLoading) {
    return (
      <AppLayout title="Exam Detail">
        <View style={styles.centered}>
          <Text style={{ color: colors['muted-foreground'] }}>Loading…</Text>
        </View>
      </AppLayout>
    );
  }

  if (error || !exam) {
    return (
      <AppLayout title="Exam Detail">
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText]}>Failed to load exam</Text>
        </View>
      </AppLayout>
    );
  }

  const canEdit          = hasPermission?.('exams', 'update');
  const canDelete        = hasPermission?.('exams', 'delete');
  const canUnlock        = hasPermission?.('exams', 'update') && exam.status === 'published';
  const canEnterMarks    = hasPermission?.('exam_marks', 'create') && exam.status === 'active';
  const canViewResults   = hasPermission?.('exam_results', 'list') && (exam.status === 'published' || exam.status === 'finalized');
  const canViewHallTickets = hasPermission?.('exam_hall_tickets', 'list');

  const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;

  return (
    <AppLayout title={exam.exam_name}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.examTitle, { color: colors.foreground }]}>{exam.exam_name}</Text>
            <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
              <Text style={[styles.statusText, { color: sc.text }]}>{exam.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Ionicons name="layers-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.exam_type} · {exam.nature}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="school-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.board} · {exam.level.replace('_', ' ')}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
              <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
                {exam.academic_year_title ?? exam.academic_year_id}
              </Text>
            </View>
            {exam.mark_entry_deadline && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#F59E0B" />
                <Text style={[styles.metaText, { color: '#F59E0B' }]}>
                  Deadline: {new Date(exam.mark_entry_deadline).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions</Text>
          <View style={styles.actionsGrid}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#556ee6' }]}
                onPress={() => router.push({ pathname: '/exam/create', params: { examId: id } } as any)}
              >
                <Ionicons name="pencil" size={18} color="white" />
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
            {canEnterMarks && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() => router.push({ pathname: '/exam/marks', params: { examId: id } } as any)}
              >
                <Ionicons name="create" size={18} color="white" />
                <Text style={styles.actionBtnText}>Marks</Text>
              </TouchableOpacity>
            )}
            {canViewResults && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => router.push({ pathname: '/exam/results', params: { examId: id } } as any)}
              >
                <Ionicons name="bar-chart" size={18} color="white" />
                <Text style={styles.actionBtnText}>Results</Text>
              </TouchableOpacity>
            )}
            {canViewHallTickets && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => router.push({ pathname: '/exam/hall-tickets', params: { examId: id } } as any)}
              >
                <Ionicons name="document-text" size={18} color="white" />
                <Text style={styles.actionBtnText}>Hall Tickets</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subject Configs */}
        {subjectConfigs && subjectConfigs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Subjects ({subjectConfigs.length})
            </Text>
            {subjectConfigs.map(cfg => (
              <View key={cfg.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.rowCardIcon, { backgroundColor: '#556ee618' }]}>
                  <Ionicons name="book-outline" size={18} color="#556ee6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                    {cfg.subject_name ?? cfg.subject_id}
                  </Text>
                  {cfg.components && cfg.components.length > 0 && (
                    <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                      {cfg.components.map(c => `${c.component_name}(${c.max_marks ?? '—'})`).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Exam Dates */}
        {dates && dates.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Exam Schedule ({dates.length})
            </Text>
            {dates.map(d => (
              <View key={d.id} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={[styles.rowCardIcon, { backgroundColor: '#3B82F618' }]}>
                  <Ionicons name="calendar" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowCardTitle, { color: colors.foreground }]}>
                    {d.subject_name ?? d.subject_id}
                  </Text>
                  <Text style={[styles.rowCardMeta, { color: colors['muted-foreground'] }]}>
                    {new Date(d.exam_date).toLocaleDateString()}
                    {d.start_time ? ` · ${d.start_time} – ${d.end_time}` : ''}
                    {d.venue ? ` · ${d.venue}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Danger Zone */}
        {(canUnlock || canDelete) && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Danger Zone</Text>
            {canUnlock && (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#F59E0B' }]}
                onPress={() =>
                  Alert.alert('Unlock Exam', 'This will allow mark corrections. Continue?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Unlock', style: 'destructive', onPress: () => unlockMutation.mutate() },
                  ])
                }
              >
                <Ionicons name="lock-open-outline" size={18} color="#F59E0B" />
                <Text style={[styles.dangerBtnText, { color: '#F59E0B' }]}>Unlock for Corrections</Text>
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: '#EF4444' }]}
                onPress={() =>
                  Alert.alert('Delete Exam', `Delete "${exam.exam_name}"? This cannot be undone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.dangerBtnText, { color: '#EF4444' }]}>Delete Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 15, marginTop: 12 },
  headerCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  examTitle: { flex: 1, fontSize: 20, fontWeight: '700', marginRight: 8 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  metaGrid: { marginTop: 12, gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  rowCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1,
    padding: 12, marginBottom: 6, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  rowCardIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowCardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rowCardMeta: { fontSize: 12 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1,
    borderRadius: 10, padding: 12, marginBottom: 8,
  },
  dangerBtnText: { fontWeight: '600' },
});
