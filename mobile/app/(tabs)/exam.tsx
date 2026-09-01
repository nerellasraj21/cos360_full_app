import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth } from '@/contexts/AuthContext';
import { useAcademicYear, useTheme } from '@/contexts';
import { examsApi, ExamStatus } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { isAdminRole } from '../../src/lib/roles';

// Hall Tickets is available to every role — admins get the compute/publish/
// override management view, students/parents get a read-only eligibility +
// attendance card for their own (or their child's) hall ticket. Mirrors the
// permission set `hall-ticket-download.tsx`'s ScreenAccessGate already uses
// for the self-service side, plus "exams":"read" for staff/admin.
const hasHallTicketAccess = (isAdmin: boolean, hasAnyPermission: (perms: [string, string][]) => boolean): boolean =>
  isAdmin || hasAnyPermission([
    ['exams', 'read'],
    ['exam_hall_tickets', 'read_own'],
    ['exam_hall_tickets', 'read_related'],
    ['exam_hall_tickets', 'list_related'],
  ]);

const RED = '#EF4444';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

// Web parity (ExamDashboard.tsx): summary counts and exam sections are grouped
// by these statuses, in this order.
const STAT_STATUSES: ExamStatus[] = ['draft', 'active', 'locked', 'published'];

const SECTION_ORDER: { status: ExamStatus; label: string }[] = [
  { status: 'active',    label: 'ACTIVE EXAMS' },
  { status: 'draft',     label: 'DRAFT EXAMS' },
  { status: 'locked',    label: 'LOCKED EXAMS' },
  { status: 'published', label: 'PUBLISHED EXAMS' },
];

// adminOnly: web parity — management areas (Create / Hall Tickets / Grading)
// are gated by the admin role on the web, not by raw permissions.
// Order mirrors the web sidebar's Exam Management submenu: Exams, Board Patterns,
// Grading, Mark Entry, Hall Tickets, Results, Exam Settings, Audit Log.
const sections: {
  title: string; description: string; icon: any; color: string;
  route: string; resource: string; action: string; adminOnly?: boolean;
  checkAccess?: (isAdmin: boolean, hasAnyPermission: (perms: [string, string][]) => boolean) => boolean;
}[] = [
  { title: 'Exams',          description: 'View & manage all exams',                           icon: 'list' as const,          color: RED,       route: '/exam/list',          resource: 'exams',        action: 'list' },
  { title: 'Create Exam',    description: 'Create a new exam',                                 icon: 'create' as const,        color: '#DC2626', route: '/exam/create',        resource: 'exams',        action: 'create', adminOnly: true },
  { title: 'Board Patterns', description: 'Configure board exam patterns',                      icon: 'git-network' as const,   color: '#0EA5E9', route: '/exam/board-patterns', resource: 'exams',       action: 'read',   adminOnly: true },
  { title: 'Grading',        description: 'Grade schemes, remark sets, board patterns & more',  icon: 'layers' as const,        color: '#7C3AED', route: '/exam/grading',       resource: 'exams',        action: 'read',   adminOnly: true },
  { title: 'Mark Entry',     description: 'Enter student marks',                                icon: 'create' as const,        color: '#8B5CF6', route: '/exam/marks',         resource: 'exam_marks',   action: 'create' },
  // Not adminOnly: every role can open this — admins get compute/publish/
  // override management, students/parents get their own (or their child's)
  // eligibility + attendance status. See `checkAccess` / hasHallTicketAccess.
  { title: 'Hall Tickets',   description: 'Eligibility & hall ticket status',                    icon: 'document-text' as const, color: '#F59E0B', route: '/exam/hall-tickets',  resource: 'exams',        action: 'read',   checkAccess: hasHallTicketAccess },
  // Note: 'exam_results' is not a real backend permission resource (see app/exam/results.tsx,
  // where compute/publish use "exams":"update" for the same reason) — gate on "exams":"read"
  // instead, which admin/teacher actually hold, matching web (no separate Results permission gate).
  { title: 'Results',        description: 'Student exam results',                                icon: 'trophy' as const,        color: '#10B981', route: '/exam/results',       resource: 'exams',        action: 'read' },
  { title: 'Exam Settings',  description: 'Configure exam module settings',                       icon: 'settings' as const,      color: '#64748B', route: '/exam/settings',      resource: 'exams',        action: 'read',   adminOnly: true },
  { title: 'Audit Log',      description: 'View exam activity & audit trail',                     icon: 'time' as const,          color: '#F59E0B', route: '/exam/audit',         resource: 'exams',        action: 'read',   adminOnly: true },
];

export default function ExamScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { activeAcademicYear, activeAcademicYearId } = useAcademicYear();
  const { role } = useAuth();
  const { hasPermission, hasAnyPermission } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);
  const isAdmin = isAdminRole(roleName);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const [search, setSearch] = useState('');

  // Web parity: the dashboard lists only the selected academic year's exams, so
  // the counts always agree with the year shown in the banner. Not gated by
  // hasPermission(...) — every role (including student/parent) sees this list
  // on web, and gating the fetch on a raw permission risks silently blocking
  // it on a resource-name mismatch; let the backend 403 instead if unauthorized.
  const { data: examsData, isLoading } = useQuery({
    queryKey: ['exams', activeAcademicYearId],
    queryFn: () => examsApi.list({ academic_year_id: activeAcademicYearId || undefined, size: 100 }),
  });

  const exams = useMemo(() => (Array.isArray(examsData) ? examsData : []), [examsData]);

  const filteredExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q === '' ? exams : exams.filter(e => e.exam_name.toLowerCase().includes(q));
  }, [exams, search]);

  const byStatus = (status: ExamStatus) => filteredExams.filter(e => e.status === status);

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
            <Text style={styles.bannerSub}>
              {activeAcademicYear ? `Academic Year: ${activeAcademicYear.title}` : 'All academic years'}
            </Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={styles.newExamBtn}
              onPress={() => router.push('/exam/create' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color={RED} />
              <Text style={[styles.newExamText, { color: RED }]}>New Exam</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* My Marks card — student / parent only (mobile-only convenience;
            not present on the web dashboard, kept in addition to it) */}
        {(isStudent || isParent) && (
          <>
            <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>MY EXAMS</Text>
            <TouchableOpacity
              style={[styles.myMarksCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => router.push('/exam/my-marks' as any)}
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
          </>
        )}

        {/* Section grid — web parity (ExamDashboard.tsx quick links): web hides
            entries a role can't access entirely (no locked placeholders), so
            mobile filters them out here instead of rendering a disabled card. */}
        {(() => {
          const accessibleSections = sections.filter((section) => {
            // Web parity: admin-only management areas require the admin role;
            // others (All Exams / Enter Marks / View Results) stay permission-based.
            // A few sections (Hall Tickets) have their own multi-permission rule.
            return section.checkAccess
              ? section.checkAccess(isAdmin, hasAnyPermission)
              : section.adminOnly
              ? isAdmin
              : (hasPermission ? hasPermission(section.resource as any, section.action) : false);
          });
          if (accessibleSections.length === 0) return null;
          return (
            <>
              <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>EXAM SECTIONS</Text>
              <View style={styles.grid}>
                {accessibleSections.map((section, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                    onPress={() => router.push(section.route as any)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.sectionIconBox, { backgroundColor: section.color + '18' }]}>
                      <Ionicons name={section.icon} size={24} color={section.color} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {section.title}
                    </Text>
                    <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                      {section.description}
                    </Text>
                    <View style={[styles.sectionArrow, { backgroundColor: section.color + '18' }]}>
                      <Ionicons name="arrow-forward" size={12} color={section.color} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          );
        })()}

        {/* Filters + exam listing — web parity: shown to every role. */}
        {/* Filter bar */}
        <View style={styles.filterHeader}>
          <Ionicons name="funnel-outline" size={14} color={colors['muted-foreground']} />
          <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Filters</Text>
        </View>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={16} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search exams..."
            placeholderTextColor={colors['muted-foreground']}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status counts — Draft / Active / Locked / Published */}
        <View style={styles.statsGrid}>
          {STAT_STATUSES.map(status => (
            <View key={status} style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.statNum, { color: colors.foreground }]}>{byStatus(status).length}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>{status}</Text>
            </View>
          ))}
        </View>

        {isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Loading exams…</Text>
          </View>
        ) : (<>
          {SECTION_ORDER.map(({ status, label }) => {
            const items = byStatus(status);
            if (items.length === 0) return null;
            return (
              <View key={status} style={styles.examSection}>
                <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>{label}</Text>
                {items.map((exam, i) => {
                  const sc = STATUS_COLORS[exam.status] ?? STATUS_COLORS.draft;
                  const subjectCount = exam.subject_config_count ?? 0;
                  return (
                    <TouchableOpacity
                      key={exam.id}
                      style={[styles.examCard, { backgroundColor: cardBg, borderColor: borderCol }]}
                      onPress={() => router.push(`/exam/${exam.id}` as any)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.examRow}>
                        <Text style={[styles.examIndex, { color: colors['muted-foreground'] }]}>{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.examTitle, { color: colors.foreground }]}>{exam.exam_name}</Text>
                          <View style={styles.examBadgeRow}>
                            <View style={[styles.boardPill, { backgroundColor: colors['muted-foreground'] + '18' }]}>
                              <Text style={[styles.boardText, { color: colors['muted-foreground'] }]}>{exam.board}</Text>
                            </View>
                            <Text style={[styles.examMeta, { color: colors['muted-foreground'] }]}>{exam.nature}</Text>
                          </View>
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.statusText, { color: sc.text }]}>{exam.status.toUpperCase()}</Text>
                        </View>
                      </View>
                      <View style={styles.examDateRow}>
                        <Ionicons name="layers-outline" size={13} color={colors['muted-foreground']} />
                        <Text style={[styles.examDateText, { color: colors['muted-foreground'] }]}>
                          {subjectCount > 0 ? `${subjectCount} subject${subjectCount !== 1 ? 's' : ''}` : '—'}
                        </Text>
                        <Ionicons name="calendar-outline" size={13} color={colors['muted-foreground']} style={{ marginLeft: 10 }} />
                        <Text style={[styles.examDateText, { color: colors['muted-foreground'] }]}>
                          {exam.mark_entry_deadline ?? '—'}
                        </Text>
                        <View style={[styles.viewBtn, { borderColor: borderCol }]}>
                          <Ionicons name="eye-outline" size={12} color={colors['muted-foreground']} />
                          <Text style={[styles.viewBtnText, { color: colors['muted-foreground'] }]}>View</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {filteredExams.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Ionicons name="school-outline" size={44} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                {exams.length === 0
                  ? 'No exams found for this academic year.'
                  : 'No exams match your search.'}
              </Text>
              {isAdmin && exams.length === 0 && (
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/exam/create' as any)}>
                  <Ionicons name="add" size={18} color="white" />
                  <Text style={styles.emptyBtnText}>Create First Exam</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
  newExamBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'white', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  newExamText: { fontSize: 12, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  filterLabel: { fontSize: 13, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 10, height: 40, marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '48%', borderRadius: 14, borderWidth: 1, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statNum: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
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
  examSection: { marginBottom: 12 },
  emptyCard: {
    borderRadius: 14, borderWidth: 1, padding: 32,
    alignItems: 'center', gap: 8,
  },
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
  examRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  examIndex: { fontSize: 12, fontWeight: '600', paddingTop: 2, minWidth: 14 },
  examTitle: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  examBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  boardText: { fontSize: 10, fontWeight: '700' },
  examMeta: { fontSize: 12, lineHeight: 16, textTransform: 'capitalize' },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  viewBtnText: { fontSize: 11, fontWeight: '600' },
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
