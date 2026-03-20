import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { examResultsApi } from '@/src/api/exam';

interface MarksComponentView {
  component_id: string;
  component_name: string;
  max_marks: number;
  marks_obtained: number | null;
  is_absent: boolean;
}

interface MarksSubjectView {
  subject_id: string;
  subject_name: string;
  total_max_marks: number;
  total_obtained: number | null;
  is_absent: boolean;
  components: MarksComponentView[];
}

export default function MyMarksScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const { role, selectedStudent } = useAuth();
  const { colors, theme } = useTheme();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Student: own marks ────────────────────────────────────────────────────
  const { data: myMarks, isLoading: myLoading } = useQuery({
    queryKey: ['my-marks', examId],
    queryFn: () => examResultsApi.getMyMarks(examId),
    enabled: !isParent && !!examId,
  });

  // ── Parent: selected child's marks ────────────────────────────────────────
  const childId = selectedStudent?.id ?? '';
  const { data: childMarks, isLoading: childLoading } = useQuery({
    queryKey: ['child-marks', examId, childId],
    queryFn: () => examResultsApi.getChildMarks(examId, childId),
    enabled: isParent && !!examId && !!childId,
  });

  const marks = isParent ? childMarks : myMarks;
  const isLoading = isParent ? childLoading : myLoading;

  const getMarksColor = (obtained: number | null, max: number) => {
    if (obtained === null) return colors['muted-foreground'];
    const pct = (obtained / max) * 100;
    if (pct >= 75) return '#10B981';
    if (pct >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getOverallPct = () => {
    if (!marks?.subjects) return null;
    let totalMax = 0;
    let totalObtained = 0;
    let hasAny = false;
    for (const s of marks.subjects) {
      if (s.total_max_marks) totalMax += s.total_max_marks;
      if (s.total_obtained !== null) {
        totalObtained += s.total_obtained;
        hasAny = true;
      }
    }
    return hasAny && totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : null;
  };

  const SubjectCard = ({ subject }: { subject: MarksSubjectView }) => {
    const pct =
      subject.total_max_marks && subject.total_obtained !== null
        ? ((subject.total_obtained / subject.total_max_marks) * 100).toFixed(0)
        : null;
    const marksColor =
      subject.total_obtained !== null
        ? getMarksColor(subject.total_obtained, subject.total_max_marks)
        : colors['muted-foreground'];

    return (
      <View style={[styles.subjectCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={styles.subjectHeader}>
          <Text style={[styles.subjectName, { color: colors.foreground }]}>
            {subject.subject_name}
          </Text>
          <View style={styles.subjectScore}>
            {subject.is_absent ? (
              <View style={[styles.badge, { backgroundColor: '#EF444418' }]}>
                <Text style={[styles.badgeText, { color: '#EF4444' }]}>Absent</Text>
              </View>
            ) : subject.total_obtained !== null ? (
              <>
                <Text style={[styles.subjectTotal, { color: marksColor }]}>
                  {subject.total_obtained}/{subject.total_max_marks}
                </Text>
                {pct && (
                  <Text style={[styles.subjectPct, { color: marksColor }]}>{pct}%</Text>
                )}
              </>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#F59E0B18' }]}>
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Not entered</Text>
              </View>
            )}
          </View>
        </View>

        {subject.components.length > 0 && (
          <View style={[styles.components, { borderTopColor: borderCol }]}>
            {subject.components.map((comp) => (
              <View key={comp.component_id} style={styles.componentRow}>
                <Text style={[styles.componentName, { color: colors['muted-foreground'] }]}>
                  {comp.component_name}
                </Text>
                <Text
                  style={[
                    styles.componentMarks,
                    {
                      color: comp.is_absent
                        ? '#EF4444'
                        : comp.marks_obtained !== null
                        ? getMarksColor(comp.marks_obtained, comp.max_marks)
                        : colors['muted-foreground'],
                    },
                  ]}
                >
                  {comp.is_absent
                    ? 'Absent'
                    : comp.marks_obtained !== null
                    ? `${comp.marks_obtained}/${comp.max_marks}`
                    : '—'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (isParent && !childId) {
    return (
      <AppLayout title="My Marks">
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            {'No student selected.\nUse the selector in the header.'}
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="My Marks">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  if (!marks) {
    return (
      <AppLayout title="My Marks">
        <View style={styles.centered}>
          <Ionicons name="document-text-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            {'No marks available yet.\nMarks will appear after your teacher enters them.'}
          </Text>
        </View>
      </AppLayout>
    );
  }

  const overallPct = getOverallPct();

  return (
    <AppLayout title="My Marks">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text style={styles.headerExamName}>{marks.exam_name}</Text>
          <Text style={styles.headerStudentName}>{marks.student_name}</Text>
          {overallPct && (
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Overall</Text>
              <Text style={styles.overallPct}>{overallPct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.subjectList}>
          {marks.subjects.map((subject: MarksSubjectView) => (
            <SubjectCard key={subject.subject_id} subject={subject} />
          ))}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  headerCard: {
    backgroundColor: '#556ee6',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 16,
  },
  headerExamName: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  headerStudentName: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  overallLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  overallPct: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  subjectList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  subjectCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  subjectScore: {
    alignItems: 'flex-end',
  },
  subjectTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  subjectPct: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  components: {
    marginTop: 10,
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  componentName: {
    fontSize: 13,
    flex: 1,
  },
  componentMarks: {
    fontSize: 13,
    fontWeight: '600',
  },
});
