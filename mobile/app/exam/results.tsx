import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useAuth, useTheme } from '@/contexts';
import { examsApi, examResultsApi, ExamStatus, StudentExamResult } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';

const PASS_COLOR = '#10B981';
const FAIL_COLOR = '#EF4444';

// Web parity (ResultsExamList.tsx): student/parent get a list of exams whose
// results can be viewed (active/locked/published/finalized), each opening
// `/exam/results/[examId]` — the computed-result self-service view. Distinct
// from `/exam/my-marks`, which shows raw entered marks regardless of publish state.
const RESULT_ALLOWED: ExamStatus[] = ['active', 'locked', 'published', 'finalized'];

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

  // Redirect student/parent straight to the self-service result detail when
  // an examId was passed as a param (e.g. from an exam's detail screen).
  useEffect(() => {
    if (isStudentOrParent && examId) {
      router.replace(`/exam/results/${examId}` as any);
    }
  }, [isStudentOrParent, examId]);

  const [studentSearch, setStudentSearch] = useState('');
  const cardBgSP = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderColSP = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBgSP = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: studentExamsData, isLoading: studentExamsLoading } = useQuery({
    queryKey: ['exams', 'student-results-list'],
    queryFn: () => examsApi.list({ size: 100 }),
    enabled: isStudentOrParent && !examId,
  });

  const studentAllExams = Array.isArray(studentExamsData) ? studentExamsData : [];
  const studentResultExams = useMemo(
    () => studentAllExams.filter((e) => RESULT_ALLOWED.includes(e.status)),
    [studentAllExams],
  );
  const studentFilteredExams = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return studentResultExams;
    return studentResultExams.filter(
      (e) =>
        e.exam_name.toLowerCase().includes(q) ||
        e.board.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q),
    );
  }, [studentResultExams, studentSearch]);

  const { confirm, modalProps } = useConfirmModal();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Web parity: results compute/publish are admin state-changing actions,
  // authorized under "exams":"update" like hall-ticket compute/publish —
  // see mobile backend files/hall_ticket_endpoints.py for the equivalent
  // pattern (there is no separate "exam_results" resource or "approve" action).
  const canCompute = hasPermission?.('exams', 'update');
  const canPublish = hasPermission?.('exams', 'update');

  const { data: examsData } = useQuery({
    queryKey: ['exams', 'results-list'],
    queryFn: () => examsApi.list({ size: 50 }),
    enabled: !examId,
  });

  const { data: resultsData, isLoading, refetch: refetchResults, isRefetching: refetchingResults } = useQuery({
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

  // Student/Parent: exam picker → `/exam/results/[examId]` self-service detail
  // (web parity: ResultsExamList.tsx). Rendered instead of the admin grid below.
  if (isStudentOrParent) {
    const renderExamRow = ({ item, index }: { item: (typeof studentResultExams)[number]; index: number }) => (
      <TouchableOpacity
        style={[styles.resultRow, { backgroundColor: cardBgSP, borderColor: borderColSP }]}
        onPress={() => router.push(`/exam/results/${item.id}` as any)}
        activeOpacity={0.75}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          <Text style={[styles.studentName, { color: colors.foreground }]}>{item.exam_name}</Text>
          <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>
            {item.board} · {item.exam_type} · {item.nature}
          </Text>
        </View>
        <Text style={[styles.rank, { color: colors['muted-foreground'], textTransform: 'capitalize' }]}>{item.status}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );

    return (
      <AppLayout title="Results">
        <View style={styles.container}>
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Filters</Text>
          </View>
          <View style={[styles.searchBoxSP, { backgroundColor: inputBgSP, borderColor: borderColSP }]}>
            <Ionicons name="search" size={16} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInputSP, { color: colors.foreground }]}
              placeholder="Search exam, board, status..."
              placeholderTextColor={colors['muted-foreground']}
              value={studentSearch}
              onChangeText={setStudentSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {studentSearch.length > 0 && (
              <TouchableOpacity onPress={() => setStudentSearch('')} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
              </TouchableOpacity>
            )}
          </View>

          {studentExamsLoading ? (
            <View style={styles.centered}>
              <Text style={{ color: colors['muted-foreground'] }}>Loading exams…</Text>
            </View>
          ) : studentResultExams.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="trophy-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                {studentAllExams.length === 0
                  ? 'No exams found for this academic year.'
                  : 'No active or published exams found.'}
              </Text>
            </View>
          ) : studentFilteredExams.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="search" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No exams match your search.</Text>
            </View>
          ) : (
            <FlatList
              data={studentFilteredExams}
              keyExtractor={(item) => item.id}
              renderItem={renderExamRow}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            />
          )}
        </View>
      </AppLayout>
    );
  }

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
              {studentResult.student_name ?? 'Student'}
            </Text>
            {!!studentResult.admission_number && (
              <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>{studentResult.admission_number}</Text>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statBig, { color: '#556ee6' }]}>{Number(studentResult.percentage ?? 0).toFixed(1)}%</Text>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Percentage</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statBig, { color: '#8B5CF6' }]}>{studentResult.grade_label ?? (studentResult.gpa != null ? Number(studentResult.gpa).toFixed(1) : '–')}</Text>
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
                  <Text style={[styles.subjectName, { color: colors.foreground }]}>{item.subject_name ?? 'Subject'}</Text>
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

  const renderResultRow = ({ item, index }: { item: StudentExamResult; index: number }) => (
    <TouchableOpacity
      style={[styles.resultRow, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={() => setSelectedStudentId(item.student_id)}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
        <Text style={[styles.studentName, { color: colors.foreground }]}>
          {item.student_name ?? 'Student'}
        </Text>
        <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>
          {item.admission_number ?? ''}
          {item.class_name ? ` · ${item.class_name}` : ''}
          {item.section_name ? ` – ${item.section_name}` : ''}
        </Text>
      </View>

      <View style={styles.resultMeta}>
        <Text style={[styles.percentage, { color: item.is_passed ? PASS_COLOR : FAIL_COLOR }]}>
          {Number(item.percentage ?? 0).toFixed(1)}%
        </Text>
        {!!item.rank && <Text style={[styles.rank, { color: colors['muted-foreground'] }]}>#{item.rank}</Text>}
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
                onPress={() => {
                  confirm({
                    title: 'Compute Results',
                    message: 'Recompute all results for this exam?',
                    confirmLabel: 'Compute',
                    onConfirm: () => computeMutation.mutate(),
                  });
                }}
                disabled={computeMutation.isPending}
              >
                <Ionicons name="calculator" size={16} color="white" />
                <Text style={styles.actionBtnText}>Compute</Text>
              </TouchableOpacity>
            )}
            {canPublish && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => {
                  confirm({
                    title: 'Publish Results',
                    message: 'Publish results to students and parents?',
                    confirmLabel: 'Publish',
                    onConfirm: () => publishMutation.mutate(),
                  });
                }}
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
            onRefresh={refetchResults}
            refreshing={refetchingResults}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          />
        )}
      </View>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  container: { flex: 1 },
  filterSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  searchBoxSP: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, marginHorizontal: 16, marginBottom: 12,
    paddingHorizontal: 10, height: 40,
  },
  searchInputSP: { flex: 1, fontSize: 14, padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  actionsBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 44, borderRadius: 10 },
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16, minHeight: 48 },
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
