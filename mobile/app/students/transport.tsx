import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { studentAdmissionsApi } from '@/src/api/students';
import { studentTransportApi } from '@/src/api/students';
import type { StudentTransportOut } from '@/src/api/students';
import { tripsApi, routeStopsApi } from '@/src/api/masters';
import type { Trip } from '@/src/api/masters';
import { CreatePermissionGuard, DeletePermissionGuard, ReadOrListPermissionGuard, UpdatePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

export default function StudentTransportScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const queryClient = useQueryClient();

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedTrip, setSelectedTrip] = useState<string>('');
  const [selectedStop, setSelectedStop] = useState<string>('');
  const [feePerTerm, setFeePerTerm] = useState<string>('');

  // Fetch transport assignments
  const { data: transportData, isLoading } = useQuery({
    queryKey: ['student-transport'],
    queryFn: () => studentTransportApi.listStudentTransport(),
  });

  // Fetch students dropdown
  const { data: studentsData } = useQuery({
    queryKey: ['students-dropdown'],
    queryFn: async () => {
      const items = await studentAdmissionsApi.studentsDropdown({ active_only: true });
      return items.map((s) => ({ label: s.display_name, value: s.id }));
    },
  });

  // Fetch trips (raw + dropdown)
  const { data: rawTrips } = useQuery({
    queryKey: ['trips-list'],
    queryFn: () => tripsApi.getTrips(),
  });

  const tripsDropdown = rawTrips?.map((t: Trip) => ({
    label: `Trip #${t.trip_number}`,
    value: t.id,
  })) ?? [];

  // Get route_id for selected trip
  const selectedTripRoute = rawTrips?.find((t: Trip) => t.id === selectedTrip)?.route_id;

  // Fetch stops for selected trip's route
  const { data: stopsData } = useQuery({
    queryKey: ['route-stops', selectedTripRoute],
    queryFn: async () => {
      const stops = await routeStopsApi.getRouteStops({ route_id: selectedTripRoute! });
      return stops.map((s) => ({ label: s.name, value: s.id }));
    },
    enabled: !!selectedTripRoute,
  });

  const createTransportMutation = useMutation({
    mutationFn: studentTransportApi.createStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      Alert.alert('Success', 'Transport assignment created successfully!');
      setSelectedStudent('');
      setSelectedTrip('');
      setSelectedStop('');
      setFeePerTerm('');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.detail || 'Failed to create transport assignment.';
      Alert.alert('Error', msg);
    },
  });

  const deleteTransportMutation = useMutation({
    mutationFn: studentTransportApi.deleteStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      Alert.alert('Success', 'Transport assignment removed.');
    },
    onError: () => Alert.alert('Error', 'Failed to remove transport assignment.'),
  });

  const handleCreate = () => {
    if (!selectedStudent || !selectedTrip || !selectedStop || !feePerTerm) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    const fee = parseFloat(feePerTerm);
    if (isNaN(fee) || fee < 0) {
      Alert.alert('Error', 'Enter a valid fee amount');
      return;
    }
    createTransportMutation.mutate({
      student_id: selectedStudent,
      trip_id: selectedTrip,
      stop_id: selectedStop,
      fee_per_term: fee,
    });
  };

  const handleDelete = (item: StudentTransportOut) => {
    const name = item.student
      ? `${item.student.first_name} ${item.student.last_name}`
      : 'this student';
    Alert.alert(
      'Remove Assignment',
      `Remove transport assignment for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteTransportMutation.mutate(item.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: StudentTransportOut }) => {
    const studentName = item.student
      ? `${item.student.first_name} ${item.student.last_name}`
      : '—';
    const routeName = item.trip?.route?.route_name ?? '—';
    const tripNum = item.trip?.trip_number != null ? `Trip #${item.trip.trip_number}` : '—';
    const stopName = item.stop?.name ?? '—';
    const pickupTime = item.stop?.pickup_time ?? item.stop?.reaching_time ?? '—';
    const dropTime = item.stop?.drop_time ?? '—';

    return (
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.cardRow}>
          <View style={[styles.avatarBox, { backgroundColor: '#F59E0B18' }]}>
            <Ionicons name="person" size={18} color="#F59E0B" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.cardName}>{studentName}</ThemedText>
            <ThemedText style={[styles.cardSub, { color: themeColors['muted-foreground'] }]}>
              {tripNum} · {routeName}
            </ThemedText>
          </View>
          <ThemedText style={[styles.fee, { color: '#10B981' }]}>
            ₹{item.fee_per_term}/term
          </ThemedText>
        </View>

        <View style={[styles.detailsRow, { borderTopColor: themeColors.border }]}>
          <View style={styles.detailItem}>
            <Ionicons name="location" size={13} color={themeColors['muted-foreground']} />
            <ThemedText style={[styles.detailText, { color: themeColors['muted-foreground'] }]}>
              {stopName}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time" size={13} color={themeColors['muted-foreground']} />
            <ThemedText style={[styles.detailText, { color: themeColors['muted-foreground'] }]}>
              {pickupTime} / {dropTime}
            </ThemedText>
          </View>
        </View>

        <View style={[styles.actionBar, { borderTopColor: themeColors.border }]}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => Alert.alert('Edit', 'Edit not yet implemented')}
            >
              <Ionicons name="create-outline" size={15} color={themeColors.primary} />
              <ThemedText style={[styles.actionLabel, { color: themeColors.primary }]}>Edit</ThemedText>
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDelete(item)}
              disabled={deleteTransportMutation.isPending}
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
              <ThemedText style={[styles.actionLabel, { color: '#EF4444' }]}>Remove</ThemedText>
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>
    );
  };

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.permDenied}>
            <Ionicons name="lock-closed" size={48} color={themeColors['muted-foreground']} />
            <ThemedText style={{ marginTop: 12, textAlign: 'center', opacity: 0.7 }}>
              You don't have permission to access student transport
            </ThemedText>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: themeColors.primary }]} onPress={() => router.back()}>
              <ThemedText style={{ color: 'white', fontWeight: '600' }}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>Student Transport</ThemedText>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Assign Form */}
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
            <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>Assign Transport</ThemedText>

              <ThemedText style={styles.label}>Student *</ThemedText>
              <CustomDropdown
                data={studentsData || []}
                placeholder="Select student"
                value={selectedStudent}
                onChange={(v) => setSelectedStudent(v as string)}
              />

              <ThemedText style={styles.label}>Trip *</ThemedText>
              <CustomDropdown
                data={tripsDropdown}
                placeholder="Select trip"
                value={selectedTrip}
                onChange={(v) => {
                  setSelectedTrip(v as string);
                  setSelectedStop('');
                }}
              />

              <ThemedText style={styles.label}>Stop *</ThemedText>
              <CustomDropdown
                data={stopsData || []}
                placeholder={selectedTrip ? 'Select stop' : 'Select trip first'}
                value={selectedStop}
                onChange={(v) => setSelectedStop(v as string)}
                disabled={!selectedTrip}
              />

              <ThemedText style={styles.label}>Fee per Term (₹) *</ThemedText>
              <TextInput
                style={[styles.textInput, {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  color: themeColors.foreground,
                }]}
                placeholder="e.g. 3000"
                placeholderTextColor={themeColors['muted-foreground']}
                keyboardType="numeric"
                value={feePerTerm}
                onChangeText={setFeePerTerm}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: createTransportMutation.isPending ? themeColors['muted'] : themeColors.primary }]}
                onPress={handleCreate}
                disabled={createTransportMutation.isPending}
              >
                <Ionicons name="bus" size={18} color="white" />
                <ThemedText style={styles.submitLabel}>
                  {createTransportMutation.isPending ? 'Assigning…' : 'Assign Transport'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </CreatePermissionGuard>

          {/* Assignments List */}
          <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Assignments ({transportData?.length ?? 0})
            </ThemedText>

            {isLoading && (
              <ThemedText style={[styles.emptyText, { color: themeColors['muted-foreground'] }]}>
                Loading…
              </ThemedText>
            )}

            {!isLoading && (
              <FlatList
                data={transportData ?? []}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="bus-outline" size={44} color={themeColors['muted-foreground']} />
                    <ThemedText style={[styles.emptyText, { color: themeColors['muted-foreground'] }]}>
                      No transport assignments found
                    </ThemedText>
                  </View>
                }
              />
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backIconBtn: { marginRight: 12 },
  headerTitle: { flex: 1 },
  scroll: { flex: 1, padding: 16 },

  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { marginBottom: 16 },

  label: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 4 },

  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 16,
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  submitLabel: { color: 'white', fontSize: 15, fontWeight: '600' },

  // Cards
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatarBox: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  cardName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  cardSub: { fontSize: 12 },
  fee: { fontSize: 13, fontWeight: '700' },

  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12 },

  actionBar: { flexDirection: 'row', borderTopWidth: 1 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9,
  },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  divider: { width: 1, marginVertical: 6 },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },

  permDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10,
  },
});
