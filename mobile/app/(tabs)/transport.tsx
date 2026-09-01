import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useAuth, useTheme } from '@/contexts';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

const AMBER = '#F59E0B';

const sections = [
  { title: 'Routes',              description: 'Manage transport routes and their configurations',      icon: 'map' as const,           color: AMBER,     route: '/transport/routes',           resource: PERMISSION_RESOURCES.TRANSPORT_ROUTES,      action: 'list' },
  { title: 'Vehicles',            description: 'Manage the school vehicle fleet and details',           icon: 'bus' as const,           color: AMBER,     route: '/transport/vehicles',         resource: PERMISSION_RESOURCES.TRANSPORT_VEHICLES,    action: 'list' },
];

export default function TransportScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudentOrParent = ['student', 'parent', 'guardian', 'father', 'mother'].includes(roleName);

  // Student/parent: go directly to their own transport view
  if (isStudentOrParent) {
    const studentRoute = '/transport/student-transport';
    return (
      <AppLayout title="My Transport">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
          <Ionicons name="bus" size={56} color={AMBER} />
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
            Transport Information
          </Text>
          <Text style={{ color: colors['muted-foreground'], fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
            View your transport assignment, route, stop and timings.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 }}
            onPress={() => router.push(studentRoute as any)}
          >
            <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>View My Transport</Text>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Transport">
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: AMBER }]}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerDecor2} />
          <View style={styles.bannerIcon}>
            <Ionicons name="bus" size={28} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Transport Management</Text>
            <Text style={styles.bannerSub}>Routes · Stops · Vehicles · Trips</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>TRANSPORT SECTIONS</Text>

        {/* Grid */}
        <View style={styles.grid}>
          {sections.map((section, i) => {
            const hasAccess = hasPermission ? hasPermission(section.resource, section.action) : false;
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
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
});
