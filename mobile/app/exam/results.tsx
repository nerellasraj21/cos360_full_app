import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { examsApi, examResultsApi, StudentExamResult } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';

const PASS_COLOR = '#10B981';
const FAIL_COLOR = '#EF4444';

export default function ResultsScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const router = useRouter();
  const { role } = useAuth();
  const { showSuccess, showError } = useToastContext();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent =
    roleName === 'student' ||
    ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Redirect student/parent immediately if examId was passed as a param
  useEffect(() => {
    if (isStudentOrParent && examId) {
      router.replace(`/exam/my-marks/${examId}` as any);
    }
  }, [isStudentOrParent, examId]);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const canCompute = hasPermission?.('exam_results', 'approve');
  const canPublish = hasPermission?.('exam_results', 'approve');

  const { data: examsData } = useQuery({
    queryKey: ['exams', 'results-list'],
    queryFn: () => examsApi.list({ size: 50 }),
    enabled: !examId,
  });

  const { data: resultsData, isLoading } = useQuery({
    queryKey: ['exam-results', selectedExamId],
    queryFn: () => examResultsApi.list(selectedExamId),
    enabled: !!selectedExamId,
  });

  const { data: studentResult } = useQuery({
    queryKey: ['exam-student-result', selectedExamId, selectedStudentId],
    queryFn: () => examResultsApi.getStudentResult(selectedExamId, selectedStudentId!),
    enabled: !!selectedExamId && !!selectedStudentId,
  });

  const computeMutation = useMutation({
    mutationFn: () => examResultsApi.compute(selectedExamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-results', selectedExamId] });
      showSuccess('Results Computed', 'Results computed successfully.');
    },
    onError: () => showError('Error', 'Failed to compute results.'),
  });

  const publishMutation = useMutation({
    mutationFn: () => examResultsApi.publish(selectedExamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Results Published', 'Results published to students and parents.');
    },
    onError: () => showError('Error', 'Failed to publish results.'),
  });

  // Student detail view
  if (selectedStudentId && studentResult) {
    return (
      <AppLayout title="Student Result">
        <View style={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedStudentId(null)}>
            <Ionicons name="arrow-back" size={20} color={colors.primary as string} />
            <Text style={[styles.backText, { color: colors.primary as string }]}>Back to Results</Text>
          </TouchableOpacity>

          <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.detailStudentName, { color: colors.foreground }]}>
              {studentResult.student_name ?? studentResult.student_id}
            </Text>
            {studentResult.admission_number && (
              <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>{studentResult.admission_number}</Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statBig, { color: '#556ee6' }]}>{(studentResult.percentage ?? 0).toFixed(1)}%</Text>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Percentage</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statBig, { color: '#8B5CF6' }]}>{studentResult.grade_label ?? studentResult.gpa?.toFixed(1) ?? '–'}</Text>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Grade</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statBig, { color: studentResult.is_passed ? PASS_COLOR : FAIL_COLOR }]}>
                  {studentResult.is_passed ? 'PASS' : 'FAIL'}
                </Text>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Result</Text>
              </View>
            </View>

            <Text style={[styles.totalMarks, { color: colors['muted-foreground'] }]}>
              {studentResult.total_marks_obtained ?? 0} / {studentResult.total_max_marks ?? 0} marks
              {studentResult.rank ? ` · Rank #${studentResult.rank}` : ''}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginHorizontal: 16 }]}>Subject Results</Text>
          <FlatList
            data={studentResult.subject_results}
            keyExtractor={item => item.subject_config_id}
            renderItem={({ item }) => (
              <View style={[styles.subjectRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectName, { color: colors.foreground }]}>{item.subject_name ?? item.subject_config_id}</Text>
                  {item.is_absent ? (
                    <Text style={{ color: '#F59E0B', fontSize: 12, marginTop: 2 }}>Absent</Text>
                  ) : (
                    <Text style={[styles.subjectMeta, { color: colors['muted-foreground'] }]}>
                      {item.marks_obtained ?? 0} / {item.max_marks ?? 0}
                      {item.grade_label ? ` · Grade: ${item.grade_label}` : ''}
                    </Text>
                  )}
                </View>
                <View style={[styles.passBadge, { backgroundColor: item.is_absent ? '#F59E0B18' : item.is_passed ? '#10B98118' : '#EF444418' }]}>
                  <Text style={[styles.passBadgeText, { color: item.is_absent ? '#F59E0B' : item.is_passed ? PASS_COLOR : FAIL_COLOR }]}>
                    {item.is_absent ? 'AB' : item.is_passed ? 'PASS' : 'FAIL'}
                  </Text>
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          />
        </View>
      </AppLayout>
    );
  }

  const renderResultRow = ({ item }: { item: StudentExamResult }) => (
    <TouchableOpacity
      style={[styles.resultRow, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={() => setSelectedStudentId(item.student_id)}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.studentName, { color: colors.foreground }]}>
          {item.student_name ?? item.student_id}
        </Text>
        <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>
          {item.admission_number ?? ''}
          {item.class_name ? ` · ${item.class_name}` : ''}
          {item.section_name ? ` – ${item.section_name}` : ''}
        </Text>
      </View>

      <View style={styles.resultMeta}>
        <Text style={[styles.percentage, { color: item.is_passed ? PASS_COLOR : FAIL_COLOR }]}>
          {(item.percentage ?? 0).toFixed(1)}%
        </Text>
        {item.rank && <Text style={[styles.rank, { color: colors['muted-foreground'] }]}>#{item.rank}</Text>}
      </View>

      <View style={[styles.passBadge, { backgroundColor: item.is_passed ? '#10B98118' : '#EF444418' }]}>
        <Text style={[styles.passBadgeText, { color: item.is_passed ? PASS_COLOR : FAIL_COLOR }]}>
          {item.is_passed ? 'PASS' : 'FAIL'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );

  return (
    <AppLayout title="Exam Results">
      <View style={styles.container}>

        {/* Exam selector */}
        {!examId && (
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Select Exam</Text>
            <View style={styles.chips}>
              {(Array.isArray(examsData) ? examsData : []).map(e => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.chip, { backgroundColor: selectedExamId === e.id ? colors.primary : cardBg, borderColor: borderCol }]}
                  onPress={() => {
                    if (isStudentOrParent) {
                      router.push(`/exam/my-marks/${e.id}` as any);
                    } else {
                      setSelectedExamId(e.id);
                    }
                  }}
                >
                  <Text style={[styles.chipText, { color: selectedExamId === e.id ? 'white' : colors['muted-foreground'] as string }]}>
                    {e.exam_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {!!selectedExamId && (canCompute || canPublish) && (
          <View style={styles.actionsBar}>
            {canCompute && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
                onPress={() =>
                  Alert.alert('Compute Results', 'Recompute all results for this exam?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Compute', onPress: () => computeMutation.mutate() },
                  ])
                }
                disabled={computeMutation.isPending}
              >
                <Ionicons name="calculator" size={16} color="white" />
                <Text style={styles.actionBtnText}>Compute</Text>
              </TouchableOpacity>
            )}
            {canPublish && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() =>
                  Alert.alert('Publish Results', 'Publish results to students and parents?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Publish', onPress: () => publishMutation.mutate() },
                  ])
                }
                disabled={publishMutation.isPending}
              >
                <Ionicons name="send" size={16} color="white" />
                <Text style={styles.actionBtnText}>Publish</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Summary stats */}
        {Array.isArray(resultsData) && resultsData.length > 0 && (
          <View style={styles.summaryBar}>
            <Text style={[styles.summaryText, { color: colors['muted-foreground'] }]}>
              {resultsData.length} students ·{' '}
              <Text style={{ color: PASS_COLOR }}>{resultsData.filter(r => r.is_passed).length} passed</Text>
              {' · '}
              <Text style={{ color: FAIL_COLOR }}>{resultsData.filter(r => !r.is_passed).length} failed</Text>
            </Text>
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading results…</Text>
          </View>
        ) : !selectedExamId ? (
          <View style={styles.centered}>
            <Ionicons name="trophy-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select an exam to view results</Text>
          </View>
        ) : (Array.isArray(resultsData) ? resultsData : []).length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No results found</Text>
            {canCompute && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8B5CF6', marginTop: 16 }]}
                onPress={() => computeMutation.mutate()}
              >
                <Text style={styles.actionBtnText}>Compute Results</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={Array.isArray(resultsData) ? resultsData : []}
            keyExtractor={item => item.student_id}
            renderItem={renderResultRow}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          />
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  actionsBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 13 },
  summaryBar: { paddingHorizontal: 16, paddingBottom: 8 },
  summaryText: { fontSize: 13 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  studentName: { fontSize: 14, fontWeight: '600' },
  admNo: { fontSize: 11, marginTop: 2 },
  resultMeta: { alignItems: 'flex-end', marginRight: 8 },
  percentage: { fontSize: 15, fontWeight: '700' },
  rank: { fontSize: 11 },
  passBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  passBadgeText: { fontSize: 10, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  // Detail view
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16 },
  backText: { fontWeight: '600' },
  summaryCard: {
    margin: 16, borderRadius: 14, borderWidth: 1, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  detailStudentName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  statItem: { alignItems: 'center' },
  statBig: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 4 },
  totalMarks: { textAlign: 'center', marginTop: 10, fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  subjectRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  subjectName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  subjectMeta: { fontSize: 12 },
});
