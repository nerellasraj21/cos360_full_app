import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { getModuleStyle, mapPath } from '@/components/navigation/menuMap';
import { useAuth, useTheme } from '@/contexts';

// Descriptions for known submodules — mirrors the web Masters dashboard's
// `descriptionMap`. Anything not listed falls back to "Manage <name>".
const DESCRIPTIONS: Record<string, string> = {
  'Academic Years': 'Configure and manage academic year cycles',
  'Classes & Sections': 'Manage classes, sections and their configurations',
  'Staff Management': 'Manage staff enrollment and designations',
  'Subject Categories': 'Organize subjects into categories',
  'Subjects': 'Define subjects and subject details',
  'Class Subject Mappings': 'Map subjects to classes and sections',
  'Parents': 'Manage parent and guardian information',
  'Holidays': 'Configure school holidays and calendar events',
  'Timetable Management': 'Manage class timetables and schedules',
  'Routes & Stops': 'Manage transport routes and route stops',
  'Vehicles & Trips': 'Manage fleet vehicles and trip schedules',
  'Roles & Permissions': 'Configure roles and access permissions',
  'Locations': 'Manage locations used across the school',
};

/** Shape shared by backend menu children and the offline fallback list. */
type MastersSection = { id?: string; name?: string | null; path?: string | null };

// Used only when the backend menu has not loaded yet (offline / cold start).
// Kept in sync with the screens that exist under app/masters. Each entry names
// the resource that gates it, so the fallback list can never expose a section
// the user's role has no permission for (the backend menu is already scoped).
const FALLBACK_SECTIONS: (MastersSection & { resource: string })[] = [
  { id: 'academicyears', name: 'Academic Years', path: '/masters/academicyears', resource: 'academic_years' },
  { id: 'classesandsections', name: 'Classes & Sections', path: '/masters/classesandsections', resource: 'classes' },
  { id: 'staffmanagement', name: 'Staff Management', path: '/masters/staffmanagement', resource: 'staff' },
  { id: 'subjectcategories', name: 'Subject Categories', path: '/masters/subjectcategories', resource: 'subject_categories' },
  { id: 'subjects', name: 'Subjects', path: '/masters/subjects', resource: 'subjects' },
  { id: 'classsubjectmappings', name: 'Class Subject Mappings', path: '/masters/classsubjectmappings', resource: 'class_subject_mappings' },
  { id: 'parents', name: 'Parents', path: '/masters/parents', resource: 'parent_management' },
  { id: 'holidays', name: 'Holidays', path: '/masters/holidays', resource: 'holiday_management' },
  { id: 'timetable', name: 'Timetable Management', path: '/masters/timetable', resource: 'timetable_management' },
  { id: 'locations', name: 'Locations', path: '/masters/locations', resource: 'locations' },
  { id: 'rolespermissions', name: 'Roles & Permissions', path: '/masters/rolespermissions', resource: 'role_management' },
];

export default function MastersScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { menu, hasPermission } = useAuth();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  // Sections come from the backend menu (same source as the web dashboard),
  // so a user only sees what their role's menu actually grants.
  const sections = useMemo<MastersSection[]>(() => {
    const masters = ((menu ?? []) as MastersSection[]).find(
      (item) => item.name?.toLowerCase() === 'masters'
    ) as (MastersSection & { children?: MastersSection[] }) | undefined;
    const children = masters?.children ?? [];
    if (children.length > 0) return children;

    // Cold start: the menu has not arrived yet, so gate the fallback list by
    // permission instead of showing every masters screen to every role.
    return FALLBACK_SECTIONS.filter(
      section => hasPermission(section.resource, 'read') || hasPermission(section.resource, 'list')
    );
  }, [menu, hasPermission]);

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

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>MASTERS SECTIONS</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {sections.map((section) => {
            const { icon, color } = getModuleStyle(section.name ?? '');
            const description = DESCRIPTIONS[section.name ?? ''] || `Manage ${(section.name ?? '').toLowerCase()}`;
            const hasPath = !!section.path;

            return (
              <TouchableOpacity
                key={section.id ?? section.path ?? section.name}
                style={[
                  styles.sectionCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                  !hasPath && { opacity: 0.7 },
                ]}
                onPress={() => hasPath && router.push(mapPath(section.path!) as any)}
                disabled={!hasPath}
                activeOpacity={0.75}
              >
                <View style={[styles.sectionIconBox, { backgroundColor: color + '18' }]}>
                  <Ionicons name={icon} size={24} color={color} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {section.name}
                </Text>
                <Text style={[styles.sectionDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                  {description}
                </Text>
                {hasPath && (
                  <View style={[styles.sectionArrow, { backgroundColor: color + '18' }]}>
                    <Ionicons name="arrow-forward" size={12} color={color} />
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
