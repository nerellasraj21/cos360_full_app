import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { examsApi, examResultsApi, SubjectResult } from '@/src/api/exam';

// Student/Parent self-service result view — web parity (StudentResults.tsx:
// StudentResultView / ParentResultView). Distinct from `/exam/my-marks/[examId]`,
// which shows raw entered marks any time; this screen shows the COMPUTED,
// published exam_results record and only renders once the exam is published
// (getMyResult / getChildResult 404 until then — see PASS_COLOR/FAIL_COLOR card).

const PASS_COLOR = '#10B981';
const FAIL_COLOR = '#EF4444';

export default function MyExamResultScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const { role, selectedStudent } = useAuth();
  const { colors, theme } = useTheme();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: exam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getById(examId),
    enabled: !!examId,
  });

  const childId = selectedStudent?.id ?? '';

  // Student: own computed result (only available after the exam is published)
  const { data: myResult, isLoading: myLoading, isError: myError } = useQuery({
    queryKey: ['my-result', examId],
    queryFn: () => examResultsApi.getMyResult(examId),
    enabled: !isParent && !!examId,
  });

  // Parent: selected child's computed result
  const { data: childResult, isLoading: childLoading, isError: childError } = useQuery({
    queryKey: ['child-result', examId, childId],
    queryFn: () => examResultsApi.getChildResult(examId, childId),
    enabled: isParent && !!examId && !!childId,
  });

  const result = isParent ? childResult : myResult;
  const isLoading = isParent ? childLoading : myLoading;
  const isError = isParent ? childError : myError;

  const SubjectRow = ({ item }: { item: SubjectResult }) => (
    <View style={[styles.subjectRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.subjectName, { color: colors.foreground }]}>{item.subject_name ?? '—'}</Text>
        {item.is_absent ? (
          <Text style={{ color: '#F59E0B', fontSize: 12, marginTop: 2 }}>Absent</Text>
        ) : (
          <Text style={[styles.subjectMeta, { color: colors['muted-foreground'] }]}>
            {item.marks_obtained != null ? Number(item.marks_obtained).toFixed(1) : '—'} / {item.max_marks ?? '—'}
            {item.grade_label ? ` · Grade: ${item.grade_label}` : ''}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.passBadge,
          { backgroundColor: item.is_absent ? '#F59E0B18' : item.is_passed ? '#10B98118' : '#EF444418' },
        ]}
      >
        <Text
          style={[
            styles.passBadgeText,
            { color: item.is_absent ? '#F59E0B' : item.is_passed ? PASS_COLOR : FAIL_COLOR },
          ]}
        >
          {item.is_absent ? 'AB' : item.is_passed ? 'PASS' : 'FAIL'}
        </Text>
      </View>
    </View>
  );

  return (
    <AppLayout title={`Results — ${exam?.exam_name ?? '...'}`}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.primary as string} />
          <Text style={[styles.backText, { color: colors.primary as string }]}>Back to Results</Text>
        </TouchableOpacity>

        {isParent && !!selectedStudent && (
          <Text style={[styles.studentLabel, { color: colors['muted-foreground'] }]}>{selectedStudent.name}</Text>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading result…</Text>
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Ionicons name="trophy-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              Results have not been published yet. Check back later.
            </Text>
          </View>
        ) : !result ? (
          <View style={styles.centered}>
            <Ionicons name="trophy-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No result found for this exam.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            <View
              style={[
                styles.resultBanner,
                {
                  backgroundColor: result.is_passed ? '#10B98114' : '#EF444414',
                  borderColor: result.is_passed ? '#10B98140' : '#EF444440',
                },
              ]}
            >
              <Ionicons
                name={result.is_passed ? 'checkmark-circle' : 'close-circle'}
                size={40}
                color={result.is_passed ? PASS_COLOR : FAIL_COLOR}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.resultBannerText, { color: result.is_passed ? PASS_COLOR : FAIL_COLOR }]}>
                  {result.is_passed ? 'Pass' : 'Fail'}
                </Text>
                {!!result.grade_label && (
                  <Text style={[styles.gradeText, { color: colors['muted-foreground'] }]}>
                    Grade: {result.grade_label}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total Marks</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {result.total_marks_obtained != null ? Number(result.total_marks_obtained).toFixed(1) : '—'}
                  <Text style={[styles.statSub, { color: colors['muted-foreground'] }]}> / {result.total_max_marks ?? '—'}</Text>
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Percentage</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {result.percentage != null ? `${Number(result.percentage).toFixed(1)}%` : '—'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>GPA</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {result.gpa != null ? Number(result.gpa).toFixed(2) : '—'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Rank</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {result.rank != null ? `#${result.rank}` : '—'}
                </Text>
              </View>
            </View>

            {result.subject_results && result.subject_results.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Subject Breakdown</Text>
                {result.subject_results.map((sr) => (
                  <SubjectRow key={sr.subject_config_id} item={sr} />
                ))}
              </>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16, paddingBottom: 4, minHeight: 48 },
  backText: { fontWeight: '600' },
  studentLabel: { fontSize: 12, marginLeft: 16, marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  resultBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    padding: 18, marginTop: 8, marginBottom: 14,
  },
  resultBannerText: { fontSize: 17, fontWeight: '700' },
  gradeText: { fontSize: 13, marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%', borderRadius: 14, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statSub: { fontSize: 13, fontWeight: '400' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  subjectRow: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  subjectName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  subjectMeta: { fontSize: 12 },
  passBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  passBadgeText: { fontSize: 10, fontWeight: '700' },
});
