import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useAcademicYear, useAuth, useTheme } from '@/contexts';
import { examsApi, ExamListItem, ExamStatus } from '@/src/api/exam';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

const STAT_CONFIG: { status: ExamStatus; label: string; accent: string }[] = [
  { status: 'draft',     label: 'Draft',     accent: '#6B7280' },
  { status: 'active',    label: 'Active',    accent: '#3B82F6' },
  { status: 'locked',    label: 'Locked',    accent: '#F59E0B' },
  { status: 'published', label: 'Published', accent: '#10B981' },
];

const QUICK_LINKS = [
  { id: 'exams',        label: 'All Exams',    icon: 'book-outline',        color: '#556ee6', route: '/exam/list' },
  { id: 'marks',        label: 'Mark Entry',   icon: 'pencil-outline',      color: '#3B82F6', route: '/exam/marks' },
  { id: 'results',      label: 'Results',      icon: 'bar-chart-outline',   color: '#10B981', route: '/exam/results' },
  { id: 'hall-tickets', label: 'Hall Tickets', icon: 'card-outline',        color: '#8B5CF6', route: '/exam/hall-tickets' },
  { id: 'settings',     label: 'Settings',     icon: 'settings-outline',    color: '#64748B', route: '/exam/settings' },
];

// ─── Exam Card ────────────────────────────────────────────────────────────────

function ExamCard({ exam, cardBg, borderCol, colors, onPress }: {
  exam: ExamListItem;
  cardBg: string;
  borderCol: string;
  colors: Record<string, unknown>;
  onPress: () => void;
}) {
  const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;
  return (
    <TouchableOpacity
      style={[styles.examCard, { backgroundColor: cardBg, borderColor: borderCol }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.examCardHeader}>
        <Text style={[styles.examCardTitle, { color: colors.foreground as string }]} numberOfLines={2}>
          {exam.exam_name}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{exam.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.tagRow}>
        <View style={styles.tag}><Text style={styles.tagText}>{exam.board}</Text></View>
        <View style={styles.tag}><Text style={styles.tagText}>{exam.nature}</Text></View>
        {!!exam.exam_type && (
          <View style={styles.tagOutline}><Text style={styles.tagOutlineText}>{exam.exam_type}</Text></View>
        )}
      </View>

      {(exam.subject_config_count ?? 0) > 0 && (
        <Text style={[styles.examMeta, { color: colors['muted-foreground'] as string }]}>
          {exam.subject_config_count} subject{exam.subject_config_count !== 1 ? 's' : ''} configured
        </Text>
      )}
      {!!exam.mark_entry_deadline && (
        <Text style={[styles.examMeta, { color: colors['muted-foreground'] as string }]}>
          Deadline: {exam.mark_entry_deadline}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function ExamDashboardScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const { role } = useAuth();
  const { activeAcademicYear, activeAcademicYearId } = useAcademicYear();
  const { hasPermission } = useMobilePermission();

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const mutedBg = isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc';

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = roleName === 'parent' || roleName === 'guardian';
  const isStudentOrParent = isStudent || isParent;
  const canCreate = hasPermission?.('exams', 'create');

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams-dashboard', activeAcademicYearId],
    queryFn: () => examsApi.list({ academic_year_id: activeAcademicYearId ?? undefined, size: 100 }),
    enabled: !isStudentOrParent,
  });

  const byStatus = (status: ExamStatus) =>
    (Array.isArray(exams) ? exams : []).filter(e => e.status === status);

  const activeExams = useMemo(() => byStatus('active'), [exams]);
  const draftExams  = useMemo(() => byStatus('draft'),  [exams]);

  const navigateToExam = (exam: ExamListItem) => {
    if (isStudentOrParent) {
      router.push(`/exam/my-marks/${exam.id}` as any);
    } else {
      router.push(`/exam/${exam.id}` as any);
    }
  };

  // Students/parents go directly to my-marks hub
  const studentQuickLinks = [
    { id: 'my-marks', label: 'My Marks',  icon: 'document-text-outline', color: '#EC4899', route: '/exam/my-marks' },
    { id: 'exams',    label: 'All Exams', icon: 'book-outline',           color: '#556ee6', route: '/exam/list' },
  ];
  const quickLinks = isStudentOrParent ? studentQuickLinks : QUICK_LINKS;

  return (
    <AppLayout title="Exam Management">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header subtitle */}
        <View style={[styles.headerBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="clipboard-outline" size={20} color="#556ee6" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground as string }]}>Exam Management</Text>
            <Text style={[styles.headerSub, { color: colors['muted-foreground'] as string }]}>
              {activeAcademicYear ? `Academic Year: ${activeAcademicYear.title}` : 'All academic years'}
            </Text>
          </View>
          {canCreate && (
            <TouchableOpacity
              style={styles.newExamBtn}
              onPress={() => router.push('/exam/create' as any)}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.newExamBtnText}>New Exam</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* Quick Links Grid */}
          <View style={styles.quickGrid}>
            {quickLinks.map(link => (
              <TouchableOpacity
                key={link.id}
                style={[styles.quickCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                onPress={() => router.push(link.route as any)}
                activeOpacity={0.75}
              >
                <Ionicons name={link.icon as any} size={22} color={link.color} />
                <Text style={[styles.quickLabel, { color: colors['muted-foreground'] as string }]} numberOfLines={1}>
                  {link.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status Summary (admin only) */}
          {!isStudentOrParent && (
            <View style={styles.statsGrid}>
              {STAT_CONFIG.map(({ status, label, accent }) => {
                const count = byStatus(status).length;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => router.push({ pathname: '/exam/list' as any, params: { status } })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.statCount, { color: accent }]}>{count}</Text>
                    <Text style={[styles.statLabel, { color: colors['muted-foreground'] as string }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Exam Sections */}
          {!isStudentOrParent && (
            isLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#556ee6" />
              </View>
            ) : (
              <>
                {/* Active Exams */}
                {activeExams.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors['muted-foreground'] as string }]}>
                      ACTIVE EXAMS
                    </Text>
                    <View style={styles.examGrid}>
                      {activeExams.map(exam => (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          cardBg={cardBg}
                          borderCol={borderCol}
                          colors={colors}
                          onPress={() => navigateToExam(exam)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Draft Exams */}
                {draftExams.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors['muted-foreground'] as string }]}>
                      DRAFT EXAMS
                    </Text>
                    <View style={styles.examGrid}>
                      {draftExams.map(exam => (
                        <ExamCard
                          key={exam.id}
                          exam={exam}
                          cardBg={cardBg}
                          borderCol={borderCol}
                          colors={colors}
                          onPress={() => navigateToExam(exam)}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Empty state */}
                {!isLoading && exams.length === 0 && (
                  <View style={[styles.emptyBox, { backgroundColor: mutedBg, borderColor: borderCol }]}>
                    <Ionicons name="book-outline" size={36} color={colors['muted-foreground'] as string} />
                    <Text style={[styles.emptyText, { color: colors['muted-foreground'] as string }]}>
                      No exams found for this academic year.
                    </Text>
                    {canCreate && (
                      <TouchableOpacity
                        style={styles.newExamBtn}
                        onPress={() => router.push('/exam/create' as any)}
                      >
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={styles.newExamBtnText}>Create First Exam</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 16, marginBottom: 4,
    borderRadius: 14, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  newExamBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#556ee6', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  newExamBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  content: { paddingHorizontal: 16, paddingTop: 12 },

  // Quick links
  quickGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  quickCard: {
    width: '18%',
    flexGrow: 1,
    alignItems: 'center', gap: 6,
    borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  quickLabel: { fontSize: 10, textAlign: 'center', fontWeight: '500' },

  // Stats
  statsGrid: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1, padding: 12,
    alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  statCount: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '500' },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    marginBottom: 10,
  },
  examGrid: { gap: 8 },

  // Exam card
  examCard: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  examCardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8,
  },
  examCardTitle: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  tag: { backgroundColor: 'rgba(85,110,230,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagText: { fontSize: 11, color: '#556ee6', fontWeight: '600' },
  tagOutline: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tagOutlineText: { fontSize: 11, color: '#64748B' },
  examMeta: { fontSize: 12, marginTop: 2 },

  // Empty
  centered: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: {
    borderRadius: 14, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 12,
  },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
