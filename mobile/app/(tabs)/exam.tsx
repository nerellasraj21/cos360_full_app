import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts';
import { examsApi, ExamStatus } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

const RED = '#EF4444';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

const sections = [
  { title: 'All Exams',    description: 'View & manage all exams',                            icon: 'list' as const,          color: RED,       route: '/exam/list',         resource: 'exams',             action: 'list' },
  { title: 'Create Exam',  description: 'Create a new exam',                                  icon: 'add-circle' as const,    color: '#DC2626', route: '/exam/create',        resource: 'exams',             action: 'create' },
  { title: 'Enter Marks',  description: 'Enter student marks',                                icon: 'create' as const,        color: '#8B5CF6', route: '/exam/marks',         resource: 'exam_marks',        action: 'create' },
  { title: 'View Results', description: 'Student exam results',                               icon: 'bar-chart' as const,     color: '#10B981', route: '/exam/results',       resource: 'exam_results',      action: 'list' },
  { title: 'Hall Tickets', description: 'Manage & publish tickets',                           icon: 'document-text' as const, color: '#F59E0B', route: '/exam/hall-tickets',  resource: 'exams',             action: 'read' },
  { title: 'Grading',      description: 'Grade schemes, remark sets, board patterns & more',  icon: 'trophy' as const,        color: '#7C3AED', route: '/exam/grading',       resource: 'exams',             action: 'read' },
  { title: 'Notify',       description: 'Send notifications to students & parents',            icon: 'notifications' as const, color: '#F97316', route: '/exam/notify',        resource: 'exams',             action: 'create' },
];

export default function ExamScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const hasListPerm = hasPermission ? hasPermission('exams', 'list') : false;

  const { data: examsData, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list({ size: 5 }),
    enabled: hasListPerm,
  });

  const stats = useMemo(() => {
    const items = Array.isArray(examsData) ? examsData : [];
    return {
      total:     items.length,
      active:    items.filter(e => e.status === 'active').length,
      published: items.filter(e => e.status === 'published' || e.status === 'finalized').length,
    };
  }, [examsData]);

  return (
    <AppLayout title="Exam Management">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: RED }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="school" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Exam Management</Text>
            <Text style={styles.bannerSub}>Exams · Marks · Results · Hall Tickets</Text>
          </View>
        </View>

        {/* Stats row — admin/staff only */}
        {!isStudent && !isParent && <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIconBox, { backgroundColor: RED + '18' }]}>
              <Ionicons name="school" size={20} color={RED} />
            </View>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#3B82F618' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="trophy" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{stats.published}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Published</Text>
          </View>
        </View>}

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>
          {isStudent || isParent ? 'MY EXAMS' : 'EXAM SECTIONS'}
        </Text>

        {/* My Marks card — student / parent only */}
        {(isStudent || isParent) && (
          <TouchableOpacity
            style={[styles.myMarksCard, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push('/exam/list' as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.sectionIconBox, { backgroundColor: '#556ee618', marginBottom: 0, marginRight: 12 }]}>
              <Ionicons name="ribbon" size={24} color="#556ee6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>My Marks</Text>
              <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]}>View your exam marks and results</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
          </TouchableOpacity>
        )}

        {/* Admin grid — hidden for student / parent */}
        {!isStudent && !isParent && (
        <View style={styles.grid}>
          {sections.map((section, i) => {
            const hasAccess = hasPermission ? hasPermission(section.resource as any, section.action) : false;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.sectionCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                  !hasAccess && { opacity: 0.5 },
                ]}
                onPress={() => hasAccess && router.push(section.route as any)}
                disabled={!hasAccess}
                activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBox, { backgroundColor: section.color + '18' }]}>
                  <Ionicons
                    name={hasAccess ? section.icon : 'lock-closed'}
                    size={24}
                    color={hasAccess ? section.color : '#9ca3af'}
                  />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {section.title}
                </Text>
                <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                  {hasAccess ? section.description : 'No access — contact admin'}
                </Text>
                {hasAccess && (
                  <View style={[styles.sectionArrow, { backgroundColor: section.color + '18' }]}>
                    <Ionicons name="arrow-forward" size={12} color={section.color} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Recent Exams — admin only */}
        {!isStudent && !isParent && (<>
        <View style={styles.recentHeader}>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>Recent Exams</Text>
          {hasListPerm && (
            <TouchableOpacity onPress={() => router.push('/exam/list' as any)}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading && (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Loading exams…</Text>
          </View>
        )}

        {!isLoading && (Array.isArray(examsData) ? examsData : []).length === 0 && (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Ionicons name="school-outline" size={44} color={colors['muted-foreground']} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Exams Yet</Text>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Create your first exam to get started</Text>
            {hasPermission?.('exams', 'create') && (
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/exam/create' as any)}>
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.emptyBtnText}>Create Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {(Array.isArray(examsData) ? examsData : []).map(exam => {
          const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;
          return (
            <TouchableOpacity
              key={exam.id}
              style={[styles.examCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => router.push(`/exam/${exam.id}` as any)}
              activeOpacity={0.75}
            >
              <View style={styles.examRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.examTitle, { color: colors.foreground }]}>{exam.exam_name}</Text>
                  <Text style={[styles.examMeta, { color: colors['muted-foreground'] }]}>
                    {exam.exam_type} · {exam.nature} · {exam.academic_year_title ?? exam.academic_year_id}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{exam.status.toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.examDateRow}>
                <Ionicons name="layers-outline" size={13} color={colors['muted-foreground']} />
                <Text style={[styles.examDateText, { color: colors['muted-foreground'] }]}>
                  {exam.board} · {exam.level.replace(/_/g, ' ')}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors['muted-foreground']} style={{ marginLeft: 'auto' }} />
              </View>
            </TouchableOpacity>
          );
        })}
        </>)}

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: {
    borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerDecor2: {
    position: 'absolute', bottom: -40, right: 60,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bannerIcon: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  sectionCard: {
    width: '48%', borderRadius: 14, borderWidth: 1,
    padding: 16, minHeight: 120,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionIconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  sectionDesc: { fontSize: 11, lineHeight: 16, flex: 1 },
  sectionArrow: {
    alignSelf: 'flex-end', marginTop: 8,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  listTitle: { fontSize: 16, fontWeight: '700' },
  viewAll: { fontSize: 14, fontWeight: '600' },
  emptyCard: {
    borderRadius: 14, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  emptyBtnText: { color: 'white', fontWeight: '600' },
  examCard: {
    borderRadius: 14, borderWidth: 1, marginBottom: 8, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  examRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  examTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  examMeta: { fontSize: 12, lineHeight: 16 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  examDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  examDateText: { fontSize: 12 },
  myMarksCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
});
