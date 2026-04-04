import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const sections = [
  { title: 'Academic Years',        description: 'Configure and manage academic year cycles',         icon: 'calendar' as const,         color: '#06B6D4', route: '/masters/academicyears',        resource: PERMISSION_RESOURCES.ACADEMIC_YEARS },
  { title: 'Classes & Sections',    description: 'Manage classes, sections and their configurations', icon: 'business' as const,         color: '#0891B2', route: '/masters/classesandsections',   resource: PERMISSION_RESOURCES.CLASSES },
  { title: 'Staff Management',      description: 'Manage staff enrollment and designations',          icon: 'people' as const,           color: '#06B6D4', route: '/masters/staffmanagement',      resource: PERMISSION_RESOURCES.STAFF },
  { title: 'Subject Categories',    description: 'Organize subjects into categories',                 icon: 'folder' as const,           color: '#0E7490', route: '/masters/subjectcategories',    resource: PERMISSION_RESOURCES.SUBJECT_CATEGORIES },
  { title: 'Subjects',              description: 'Define subjects and subject details',               icon: 'book' as const,             color: '#06B6D4', route: '/masters/subjects',             resource: PERMISSION_RESOURCES.SUBJECTS },
  { title: 'Class Subject Mappings',description: 'Map subjects to classes and sections',              icon: 'git-branch' as const,       color: '#0891B2', route: '/masters/classsubjectmappings', resource: PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS },
  { title: 'Holidays',              description: 'Configure school holidays and calendar events',     icon: 'sunny' as const,            color: '#06B6D4', route: '/masters/holidays',             resource: PERMISSION_RESOURCES.HOLIDAYS },
  { title: 'Timetable Management',  description: 'Manage class timetables and schedules',             icon: 'time' as const,             color: '#0E7490', route: '/masters/timetable',            resource: PERMISSION_RESOURCES.TIMETABLES },
];

export default function MastersScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const comingSoonBorderCol = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1';

  return (
    <AppLayout title="Masters">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="server" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Masters Dashboard</Text>
            <Text style={styles.bannerSub}>Configure and manage all master data for the school system</Text>
          </View>
        </View>

        {/* Coming Soon card */}
        <View style={[styles.comingSoonCard, { borderColor: comingSoonBorderCol, backgroundColor: cardBg }]}>
          <Ionicons name="settings" size={44} color={colors['muted-foreground']} />
          <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>
            Masters Dashboard — Coming Soon
          </Text>
          <Text style={[styles.comingSoonDesc, { color: colors['muted-foreground'] }]}>
            A unified overview and quick-access dashboard is being built. Use the sections below to navigate individual master data sections.
          </Text>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>MASTERS SECTIONS</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {sections.map((section, i) => {
            const hasAccess = hasPermission ? hasPermission(section.resource, 'list') : false;
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
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  banner: {
    backgroundColor: '#556ee6',
    borderRadius: 18, padding: 20,
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
    width: 54, height: 54, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 3 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 16 },
  comingSoonCard: {
    borderRadius: 14, borderWidth: 1.5,
    borderStyle: 'dashed', padding: 28,
    marginBottom: 20, alignItems: 'center', gap: 10,
  },
  comingSoonTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  comingSoonDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sectionCard: {
    width: '48%', borderRadius: 14, borderWidth: 1,
    padding: 16, minHeight: 130,
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
});
