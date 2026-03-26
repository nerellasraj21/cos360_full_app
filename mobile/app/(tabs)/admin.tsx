import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { authApi } from '@/src/api/auth';
import { rolesApi } from '@/src/api';
import { staffApi } from '@/src/api/staff';
import { studentAdmissionsApi } from '@/src/api/students';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const ADMIN_COLOR = '#64748b';

const sections = [
  {
    title: 'User Management',
    description: 'Manage user accounts and access across the organization',
    icon: 'people' as const,
    color: '#6366F1',
    route: '/admin/users',
    resource: PERMISSION_RESOURCES.ADMIN_USERS,
  },
  {
    title: 'Role Management',
    description: 'Configure roles and fine-grained access control',
    icon: 'shield-checkmark' as const,
    color: '#10B981',
    route: '/masters/rolespermissions',
    resource: PERMISSION_RESOURCES.ADMIN_ROLES,
  },
  {
    title: 'Permission Management',
    description: 'Manage granular permissions for each role',
    icon: 'lock-closed' as const,
    color: '#F59E0B',
    route: '/masters/rolespermissions',
    resource: PERMISSION_RESOURCES.ADMIN_PERMISSIONS,
  },
  {
    title: 'Menu Management',
    description: 'Configure sidebar menu items and visibility',
    icon: 'menu' as const,
    color: '#EF4444',
    route: '/admin/menu',
    resource: PERMISSION_RESOURCES.ADMIN_MENU,
  },
];

export default function AdminScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const statBg = theme === 'dark' ? '#16213e' : '#f8fafc';

  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['admin-stats-staff'],
    queryFn: () => staffApi.getStaffEnrollments({ limit: 1 }),
  });
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-stats-students'],
    queryFn: () => studentAdmissionsApi.listAdmissions({ limit: 1 }),
  });
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-stats-roles'],
    queryFn: () => rolesApi.getRoles(),
  });
  const { data: menus = [], isLoading: menusLoading } = useQuery({
    queryKey: ['admin-stats-menus'],
    queryFn: () => authApi.getMenus(),
  });

  const statsLoading = staffLoading || studentsLoading || rolesLoading || menusLoading;
  const staffCount = (staffData as any)?.total ?? (staffData as any)?.items?.length ?? 0;
  const studentCount = (studentsData as any)?.total_count ?? (studentsData as any)?.total ?? (studentsData as any)?.items?.length ?? 0;
  const rolesCount = Array.isArray(roles) ? roles.length : 0;
  const menusCount = Array.isArray(menus) ? menus.length : 0;

  const stats = [
    { label: 'Staff', value: staffCount, icon: 'people' as const, color: '#8b5cf6' },
    { label: 'Students', value: studentCount, icon: 'school' as const, color: '#3b82f6' },
    { label: 'Roles', value: rolesCount, icon: 'shield-checkmark' as const, color: '#10b981' },
    { label: 'Menus', value: menusCount, icon: 'menu' as const, color: '#f59e0b' },
  ];

  return (
    <AppLayout title="Administration">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="shield-checkmark" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Administration</Text>
            <Text style={styles.bannerSub}>Manage system settings, users, roles, and organization-wide configurations</Text>
          </View>
        </View>

        {/* Stats row */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>SYSTEM OVERVIEW</Text>
        <View style={styles.statsRow}>
          {stats.map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: statBg, borderColor: borderCol }]}>
              {statsLoading ? (
                <ActivityIndicator size="small" color={stat.color} />
              ) : (
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              )}
              <View style={styles.statLabelRow}>
                <Ionicons name={stat.icon} size={12} color={colors['muted-foreground']} />
                <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'], marginTop: 8 }]}>ADMINISTRATION SECTIONS</Text>

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
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statLabel: { fontSize: 10, fontWeight: '600' },
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
