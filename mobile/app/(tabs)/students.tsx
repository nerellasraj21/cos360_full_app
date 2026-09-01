import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { getModuleStyle, mapPath } from '@/components/navigation/menuMap';
import { useAuth, useTheme } from '@/contexts';
import { studentAdmissionsApi, StudentAdmission } from '@/src/api/students';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { menuChildrenFor } from '@/src/lib/menuUtils';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

type Student = StudentAdmission;

const BLUE = '#3B82F6';

/** A card in the admin sections grid, from the menu or the cold-start fallback. */
type StudentSection = {
  key: string; title: string; description: string; icon: any; color: string;
  route: string; hasAccess: boolean;
};

// Descriptions for known submodules — mirrors the web Students dashboard's
// `descriptionMap` (src/routes/_app/students/index.tsx).
const DESCRIPTIONS: Record<string, string> = {
  'Admission': 'Manage student admissions and enrollment records',
  'Student Admission': 'Manage student admissions and enrollment records',
  'Student Admissions': 'Manage student admissions and enrollment records',
  'Attendance': 'Track and manage daily student attendance',
  'Student Attendance': 'Track and manage daily student attendance',
  'Documents': 'Upload and manage student documents',
  'Student Documents': 'Upload and manage student documents',
  'Certificates': 'Issue and manage student certificates',
  'Student Certificates': 'Issue and manage student certificates',
  'Certificate Types': 'Manage certificate types',
  'My Certificates': 'View your certificates',
  'My Documents': 'View your documents',
  'Profile': 'View and update student profile details',
  'Reports': 'Generate and export student reports',
};

// Cold-start fallback only, used before the backend menu has loaded.
const sections = [
  {
    title: 'Student Admissions',
    description: 'Manage student admissions',
    icon: 'person-add' as const,
    color: BLUE,
    route: '/students/admission',
    resource: PERMISSION_RESOURCES.STUDENT_ADMISSIONS,
    action: 'list',
  },
  {
    title: 'Student Attendance',
    description: 'Track and manage daily student attendance',
    icon: 'checkmark-circle' as const,
    color: '#10B981',
    route: '/students/attendance',
    resource: PERMISSION_RESOURCES.STUDENT_ATTENDANCE,
    action: 'create',
  },
  {
    title: 'Student Documents',
    description: 'Upload and manage student documents',
    icon: 'folder-open' as const,
    color: '#F97316',
    route: '/students/studentdocuments',
    resource: PERMISSION_RESOURCES.STUDENT_DOCUMENTS,
    action: 'list',
  },
  {
    title: 'Student Certificates',
    description: 'Issue and manage student certificates',
    icon: 'document-text' as const,
    color: '#8B5CF6',
    route: '/students/studentcertificates',
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'list',
  },
  {
    title: 'Certificate Types',
    description: 'Manage certificate types',
    icon: 'pricetag' as const,
    color: '#F59E0B',
    route: '/students/certificatetypes',
    resource: PERMISSION_RESOURCES.STUDENT_CERTIFICATES,
    action: 'list',
  },
];

// Web parity: web's Students hub is exactly four sections — Admissions,
// Attendance, Documents, Certificates (see AdmissionTable.tsx /
// AttendancePage.tsx / StudentDocumentsPage.tsx / CertificatePage.tsx) — with
// no Profile/Fees/Calendar/Transport/Timetable entries in that hub at all
// (Fees and Profile already have their own tabs here; Transport has no
// working parent/student view on web — admin-only, hidden from every menu;
// Timetable is admin-only under Masters, no student/parent view exists).
const STUDENT_QUICK_LINKS = [
  { title: 'My Admission',    icon: 'person-add' as const,        color: '#3B82F6', route: '/students/myadmission',    desc: 'View your admission details'       },
  { title: 'My Attendance',   icon: 'checkmark-circle' as const,  color: '#10B981', route: '/students/attendance',     desc: 'View attendance history'           },
  { title: 'My Documents',    icon: 'folder-open' as const,       color: '#F97316', route: '/students/mydocuments',    desc: 'View & upload your documents'      },
  { title: 'My Certificates', icon: 'document-text' as const,     color: '#8B5CF6', route: '/students/mycertificates', desc: 'Download your certificates'        },
];

const PARENT_QUICK_LINKS = [
  { title: 'Child Admissions',   icon: 'person-add' as const,        color: '#3B82F6', route: '/students/myadmission',      desc: 'View child admission details'      },
  { title: 'Child Attendance',   icon: 'checkmark-circle' as const,  color: '#10B981', route: '/students/attendance',       desc: 'View child attendance history'     },
  { title: 'Child Documents',    icon: 'folder-open' as const,       color: '#F97316', route: '/students/mydocuments',      desc: 'View child documents'              },
  { title: 'Child Certificates', icon: 'document-text' as const,     color: '#8B5CF6', route: '/students/mycertificates',   desc: 'Download child certificates'       },
];

export default function StudentsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role, menu } = useAuth();
  const { hasPermission } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Admin sections are the UNION of the static list (kept, with its locked-card
  // treatment, so nothing disappears) and any extra section the Students node of
  // the backend menu grants.
  const adminSections = useMemo<StudentSection[]>(() => {
    const merged: StudentSection[] = sections.map(section => ({
      key: section.route,
      title: section.title,
      description: section.description,
      icon: section.icon,
      color: section.color,
      route: section.route,
      hasAccess: hasPermission ? hasPermission(section.resource, section.action) : false,
    }));
    const seenRoutes = new Set(merged.map(s => s.route));

    for (const child of menuChildrenFor((menu ?? []) as any, roleName, ['students', 'student'])) {
      if (!child.path) continue;
      const route = mapPath(child.path);
      // The hub itself is not one of its own sections.
      if (route === '/(tabs)/students' || seenRoutes.has(route)) continue;
      seenRoutes.add(route);
      const title = child.name ?? '';
      const { icon, color } = getModuleStyle(title);
      merged.push({
        key: child.id ?? child.path,
        title,
        description: DESCRIPTIONS[title] ?? `Manage ${title.toLowerCase()}`,
        icon,
        color,
        route,
        // The backend menu is already permission-scoped, so anything it sends is open.
        hasAccess: true,
      });
    }

    return merged;
  }, [menu, roleName, hasPermission]);

  const hasListPermission = hasPermission ? hasPermission(PERMISSION_RESOURCES.STUDENTS, 'list') : false;
  const { data: studentsResponse } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentAdmissionsApi.getStudentAdmissions(),
    enabled: hasListPermission,
  });

  const totalStudents = studentsResponse?.total_count ?? studentsResponse?.items?.length ?? 0;
  const activeStudents = studentsResponse?.items?.filter((s: Student) => s.is_active).length ?? 0;
  const inactiveStudents = totalStudents - activeStudents;

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // ── Student / Parent quick-link view ─────────────────────────────────────
  if (isStudent || isParent) {
    const links = isStudent ? STUDENT_QUICK_LINKS : PARENT_QUICK_LINKS;
    const title = isStudent ? 'My Portal' : 'Child Portal';
    const subtitle = isStudent ? 'Quick access to your records' : 'Quick access to your child\'s records';
    return (
      <AppLayout title={title}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Banner */}
          <View style={[styles.banner, { backgroundColor: BLUE }]}>
            <View style={styles.bannerDecor} />
            <View style={styles.bannerDecor2} />
            <View style={styles.bannerIcon}>
              <Ionicons name={isStudent ? 'person' : 'people'} size={28} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{title}</Text>
              <Text style={styles.bannerSub}>{subtitle}</Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>QUICK ACCESS</Text>

          <View style={styles.grid}>
            {links.map((link, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.sectionCard, { backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9' }]}
                onPress={() => router.push(link.route as any)}
                activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBox, { backgroundColor: link.color + '18' }]}>
                  <Ionicons name={link.icon} size={24} color={link.color} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={2}>{link.title}</Text>
                <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>{link.desc}</Text>
                <View style={[styles.sectionArrow, { backgroundColor: link.color + '18' }]}>
                  <Ionicons name="arrow-forward" size={12} color={link.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </AppLayout>
    );
  }

  // ── Admin / Staff / Teacher view ──────────────────────────────────────────
  return (
    <AppLayout title="Students">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: BLUE }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="people" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Students Dashboard</Text>
            <Text style={styles.bannerSub}>Comprehensive management of student data, admissions, and records</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIconBox, { backgroundColor: BLUE + '18' }]}>
              <Ionicons name="people" size={20} color={BLUE} />
            </View>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{totalStudents}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#10B98118' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{activeStudents}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.statIconBox, { backgroundColor: '#EF444418' }]}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{inactiveStudents}</Text>
            <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Inactive</Text>
          </View>
        </View>

        {/* Sections label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>STUDENTS SECTIONS</Text>

        {/* Section cards grid */}
        <View style={styles.grid}>
          {adminSections.map((section) => {
            const hasAccess = section.hasAccess;
            return (
              <TouchableOpacity
                key={section.key}
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

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  // Banner
  banner: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    overflow: 'hidden',
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

  // Stats
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

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 12,
  },

  // Grid
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 24,
  },
  sectionCard: {
    width: '48%',
    borderRadius: 14, borderWidth: 1,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    minHeight: 120,
  },
  sectionIconBox: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4, lineHeight: 18 },
  sectionDesc: { fontSize: 11, lineHeight: 16, flex: 1 },
  sectionArrow: {
    alignSelf: 'flex-end', marginTop: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Recent students header
  recentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  listTitle: { fontSize: 16, fontWeight: '700' },
  addNew: { fontSize: 14, fontWeight: '600' },

  // Empty state
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

  // Student cards
  studentCard: {
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  studentAvatarBox: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { fontSize: 18, fontWeight: '700' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  studentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studentMeta: { fontSize: 12 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '700' },
  actionBar: { flexDirection: 'row', borderTopWidth: 1 },
  actionIconBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9,
  },
  actionIconLabel: { fontSize: 12, fontWeight: '600' },
  actionDivider: { width: 1, marginVertical: 6 },
});
