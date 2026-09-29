import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { gradeSchemeApi, remarkGradesApi } from '@/src/api/exam';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

// Web parity: mirrors src/pages/exam/GradingDashboard.tsx — a hub linking to
// Exam Grade Schemes, Subject Grade Schemes, and Remark Grade Sets. Route
// names match the web sidebar's Grading submenu exactly.
const NAV_ITEMS: { title: string; description: string; icon: any; color: string; route: string }[] = [
  {
    title: 'Exam Grade Schemes',
    description: 'Percentage-based grade bands with GPA and pass/fail thresholds for exams',
    icon: 'grid-outline',
    color: '#556ee6',
    route: '/exam/grade-schemes',
  },
  {
    title: 'Subject Grade Schemes',
    description: 'Subject-specific grading schemes with custom grade bands',
    icon: 'grid-outline',
    color: '#0EA5E9',
    route: '/exam/subject-grade-schemes',
  },
  {
    title: 'Remark Grade Sets',
    description: 'Descriptive remark options (e.g. Excellent, Good, Satisfactory) for teacher feedback',
    icon: 'list-outline',
    color: '#8B5CF6',
    route: '/exam/remark-sets',
  },
];

function GradingScreenContent() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: examSchemes = [], isLoading: loadingExam } = useQuery({
    queryKey: ['grade-schemes', 'exam'],
    queryFn: () => gradeSchemeApi.listExamSchemes(),
  });
  const { data: subjectSchemes = [], isLoading: loadingSubject } = useQuery({
    queryKey: ['grade-schemes', 'subject'],
    queryFn: () => gradeSchemeApi.listSubjectSchemes(),
  });
  const { data: remarkSets = [], isLoading: loadingRemarks } = useQuery({
    queryKey: ['remark-grade-sets'],
    queryFn: () => remarkGradesApi.list(),
  });

  const stats = [
    { label: 'Exam Grade Schemes', value: examSchemes.length, loading: loadingExam },
    { label: 'Subject Grade Schemes', value: subjectSchemes.length, loading: loadingSubject },
    { label: 'Remark Grade Sets', value: remarkSets.length, loading: loadingRemarks },
  ];

  return (
    <AppLayout title="Grading">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
          Manage exam grade schemes, subject grade schemes, and remark grade sets
        </Text>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          {stats.map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.loading ? '—' : s.value}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Nav Cards */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>GRADING SECTIONS</Text>
        {NAV_ITEMS.map(item => (
          <TouchableOpacity
            key={item.title}
            style={[styles.navCard, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.navIconBox, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.navTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.navDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  subtitle: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  navCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  navIconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  navDesc: { fontSize: 12, lineHeight: 16 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function GradingScreen() {
  return (
    <ScreenAccessGate
      title="Grading"
      resources={['exam_grade_schemes', 'exams']}
    >
      <GradingScreenContent />
    </ScreenAccessGate>
  );
}
