import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
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
    route: '/admin/roles',
    resource: PERMISSION_RESOURCES.ADMIN_ROLES,
  },
  {
    title: 'Permission Management',
    description: 'Manage granular permissions for each role',
    icon: 'lock-closed' as const,
    color: '#F59E0B',
    route: '/admin/permissions',
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
  const comingSoonBorderCol = theme === 'dark' ? 'rgba(255,255,255,0.15)' : '#cbd5e1';

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

        {/* Coming Soon card */}
        <View style={[styles.comingSoonCard, { borderColor: comingSoonBorderCol, backgroundColor: cardBg }]}>
          <Ionicons name="shield-checkmark" size={44} color={colors['muted-foreground']} />
          <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>
            Administration Dashboard — Coming Soon
          </Text>
          <Text style={[styles.comingSoonDesc, { color: colors['muted-foreground'] }]}>
            A centralized administration panel with system health, user stats, and quick actions is being built. Use the sections below to access available admin sections.
          </Text>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>ADMINISTRATION SECTIONS</Text>

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
