import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { routesApi, vehiclesApi, studentTransportApi } from '@/src/api/index';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const NAV_ITEMS = [
  { route: '/transport/routes', icon: 'map' as const, color: '#3B82F6', label: 'Routes', sub: 'Manage bus routes' },
  { route: '/transport/route-stops', icon: 'location' as const, color: '#F59E0B', label: 'Route Stops', sub: 'Configure stops per route' },
  { route: '/transport/vehicles', icon: 'bus' as const, color: '#10B981', label: 'Vehicles', sub: 'Fleet management' },
  { route: '/transport/trips', icon: 'navigate' as const, color: '#6366F1', label: 'Trips', sub: 'Vehicle–route assignments' },
  { route: '/transport/pricing', icon: 'pricetag' as const, color: '#EC4899', label: 'Pricing', sub: 'Billing cycles & amounts' },
  { route: '/transport/student-transport', icon: 'person' as const, color: '#F97316', label: 'Student Transport', sub: 'Assign students to trips' },
  { route: '/transport/student-trips', icon: 'list' as const, color: '#64748b', label: 'Student Trips', sub: 'Trip history & tracking' },
];

function TransportIndexScreenContent() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: routes } = useQuery({
    queryKey: ['routes', { active_only: true }],
    queryFn: () => routesApi.getRoutes({ active_only: true }),
    staleTime: 60_000,
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', { is_active: true }],
    queryFn: () => vehiclesApi.getVehicles({ is_active: true }),
    staleTime: 60_000,
  });

  const { data: studentTransports } = useQuery({
    queryKey: ['studentTransport'],
    queryFn: () => studentTransportApi.listStudentTransport(),
    staleTime: 60_000,
  });

  const stats = [
    { label: 'Active Routes', value: routes?.length ?? '-', icon: 'map' as const, color: '#3B82F6' },
    { label: 'Vehicles', value: vehicles?.length ?? '-', icon: 'bus' as const, color: '#10B981' },
    { label: 'Students', value: studentTransports?.length ?? '-', icon: 'people' as const, color: '#F59E0B' },
  ];

  return (
    <AppLayout title="Transport">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Navigation cards */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Manage</Text>
        <View style={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.navCard, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.navSub, { color: colors['muted-foreground'] }]}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
  },
  statValue: { color: 'white', fontSize: 22, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  navList: { gap: 10 },
  navCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  navIcon: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  navLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  navSub: { fontSize: 12 },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function TransportIndexScreen() {
  return (
    <ScreenAccessGate
      title="Transport"
      resources={['routes', 'vehicles', 'transport_trips']}
    >
      <TransportIndexScreenContent />
    </ScreenAccessGate>
  );
}
