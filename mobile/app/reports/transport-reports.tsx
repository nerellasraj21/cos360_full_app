import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ScreenLayout } from '@/components';
import { useTheme } from '@/contexts';
import { vehiclesApi, tripsApi } from '@/src/api/masters';
import { routesApi } from '@/src/api/transport';

const COLOR = '#F59E0B';

export default function TransportReportsScreen() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['transport-report-routes'],
    queryFn: () => routesApi.getRoutes(),
  });
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['transport-report-vehicles'],
    queryFn: () => vehiclesApi.getVehicles(),
  });
  const { data: trips = [], isLoading: tripsLoading } = useQuery({
    queryKey: ['transport-report-trips'],
    queryFn: () => tripsApi.getTrips(),
  });

  const isLoading = routesLoading || vehiclesLoading || tripsLoading;

  const activeRoutes = (routes as any[]).filter(r => r.is_active).length;
  const activeVehicles = (vehicles as any[]).filter(v => v.is_active).length;

  return (
    <ScreenLayout title="Transport Reports">
      <View style={[styles.banner, { backgroundColor: COLOR }]}>
        <View style={styles.bannerDecor} />
        <View style={styles.bannerIcon}>
          <Ionicons name="bus" size={24} color="white" />
        </View>
        <Text style={styles.bannerTitle}>Transport Overview</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLOR} size="large" />
          <Text style={[styles.loadingText, { color: colors['muted-foreground'] }]}>Loading...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="map" size={20} color={COLOR} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{(routes as any[]).length}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Routes</Text>
              <Text style={[styles.statSub, { color: '#10b981' }]}>{activeRoutes} active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="bus" size={20} color="#3b82f6" />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{(vehicles as any[]).length}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Vehicles</Text>
              <Text style={[styles.statSub, { color: '#10b981' }]}>{activeVehicles} active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.statIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="swap-horizontal" size={20} color="#8b5cf6" />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{(trips as any[]).length}</Text>
              <Text style={[styles.statLabel, { color: colors['muted-foreground'] }]}>Trips</Text>
            </View>
          </View>

          {/* Routes List */}
          <Text style={[styles.sectionLabel, { color: colors['muted-foreground'] }]}>ROUTES</Text>
          {(routes as any[]).map((route, i) => (
            <View key={route.id || i} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.rowHeader}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {route.route_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: route.is_active ? '#d1fae5' : '#f1f5f9' }]}>
                  <Text style={[styles.statusText, { color: route.is_active ? '#065f46' : '#64748b' }]}>
                    {route.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                {route.starting_stop} → {route.ending_stop}
              </Text>
            </View>
          ))}
          {(routes as any[]).length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={36} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No routes configured</Text>
            </View>
          )}

          {/* Vehicles List */}
          <Text style={[styles.sectionLabel, { color: colors['muted-foreground'], marginTop: 16 }]}>VEHICLES</Text>
          {(vehicles as any[]).map((vehicle, i) => (
            <View key={vehicle.id || i} style={[styles.rowCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.rowHeader}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {vehicle.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: vehicle.is_active ? '#d1fae5' : '#f1f5f9' }]}>
                  <Text style={[styles.statusText, { color: vehicle.is_active ? '#065f46' : '#64748b' }]}>
                    {vehicle.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                {vehicle.registration_number}{vehicle.vehicle_type ? ` · ${vehicle.vehicle_type}` : ''}
              </Text>
            </View>
          ))}
          {(vehicles as any[]).length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={36} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No vehicles configured</Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden' },
  bannerDecor: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  statSub: { fontSize: 10, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 10 },
  rowCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8, elevation: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  rowTitle: { fontSize: 13, fontWeight: '600', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 3 },
  emptyState: { alignItems: 'center', gap: 8, paddingTop: 32 },
  emptyText: { fontSize: 14 },
});
