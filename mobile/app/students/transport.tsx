import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts';
import { useAuth } from '@/contexts/AuthContext';
import { studentAdmissionsApi, studentTransportApi } from '@/src/api/students';
import type { StudentTransportOut } from '@/src/api/students';
import { tripsApi, routeStopsApi } from '@/src/api/masters';
import type { Trip } from '@/src/api/masters';
import {
  CreatePermissionGuard,
  DeletePermissionGuard,
  ReadOrListPermissionGuard,
  UpdatePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

// ─── Shared read-only transport card ─────────────────────────────────────────

function TransportCard({ item, colors }: { item: StudentTransportOut; colors: any }) {
  const tripLabel = item.trip?.trip_number != null ? `Trip #${item.trip.trip_number}` : '—';
  const routeName = (item.trip as any)?.route?.route_name ?? '—';
  const stopName = item.stop?.name ?? '—';
  const fee = item.fee_per_term;

  return (
    <View style={[tStyles.card, { backgroundColor: colors.card }]}>
      <View style={tStyles.topRow}>
        <View style={[tStyles.iconBox, { backgroundColor: `${colors.primary}15` }]}>
          <Ionicons name="bus" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={tStyles.tripLabel}>{tripLabel}</ThemedText>
          <ThemedText style={tStyles.routeName}>{routeName}</ThemedText>
        </View>
      </View>
      <View style={tStyles.infoGrid}>
        <View style={tStyles.infoItem}>
          <Ionicons name="location-outline" size={13} color={colors['muted-foreground']} />
          <ThemedText style={tStyles.infoMeta}>Stop</ThemedText>
          <ThemedText style={tStyles.infoValue}>{stopName}</ThemedText>
        </View>
        <View style={tStyles.infoItem}>
          <Ionicons name="cash-outline" size={13} color={colors['muted-foreground']} />
          <ThemedText style={tStyles.infoMeta}>Fee / Term</ThemedText>
          <ThemedText style={tStyles.infoValue}>
            ₹{fee != null ? fee.toLocaleString('en-IN') : '—'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

// ─── Student view (own assignment) ───────────────────────────────────────────

function StudentTransportView() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { studentId } = useAuth();

  const { data: transportData = [], isLoading } = useQuery({
    queryKey: ['my-transport', studentId],
    queryFn: () => studentTransportApi.listStudentTransport(),
    enabled: !!studentId,
  });

  const myItems = (transportData as StudentTransportOut[]).filter(
    (t) => t.student_id === studentId,
  );

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ThemedText style={{ color: colors['muted-foreground'], fontSize: 14 }}>Loading...</ThemedText>
      </View>
    );
  }
  if (myItems.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="bus-outline" size={44} color={colors['muted-foreground']} />
        <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
          No transport assignment found
        </ThemedText>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      {myItems.map((item) => <TransportCard key={item.id} item={item} colors={colors} />)}
    </ScrollView>
  );
}

// ─── Parent view (child assignment) ──────────────────────────────────────────

function ParentTransportView() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { selectedStudent } = useAuth();

  const { data: transportData = [], isLoading } = useQuery({
    queryKey: ['transport-child', selectedStudent?.id],
    queryFn: () => studentTransportApi.listStudentTransport(),
    enabled: !!selectedStudent?.id,
  });

  const childItems = (transportData as StudentTransportOut[]).filter(
    (t) => t.student_id === selectedStudent?.id,
  );

  if (!selectedStudent) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="person-outline" size={48} color={colors['muted-foreground']} />
        <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
          Select a student from the header
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
      <ThemedText style={{ fontSize: 15, fontWeight: '600', marginBottom: 12, opacity: 0.8 }}>
        {selectedStudent.first_name}{"'"}s Transport
      </ThemedText>
      {isLoading ? (
        <View style={styles.emptyState}>
          <ThemedText style={{ color: colors['muted-foreground'], fontSize: 14 }}>Loading...</ThemedText>
        </View>
      ) : childItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="bus-outline" size={44} color={colors['muted-foreground']} />
          <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            No transport assignment found
          </ThemedText>
        </View>
      ) : (
        childItems.map((item) => <TransportCard key={item.id} item={item} colors={colors} />)
      )}
    </ScrollView>
  );
}

// ─── Admin / Staff / Teacher CRUD view ───────────────────────────────────────

function AdminTransportView() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentTransportOut | null>(null);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [selectedStop, setSelectedStop] = useState('');
  const [feePerTerm, setFeePerTerm] = useState('');

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedTrip('');
    setSelectedStop('');
    setFeePerTerm('');
    setEditingItem(null);
  };

  const openAssignModal = () => {
    resetForm();
    setShowAssignModal(true);
  };

  const openEditModal = (item: StudentTransportOut) => {
    setEditingItem(item);
    setSelectedStudent(item.student_id);
    setSelectedTrip(item.trip_id);
    setSelectedStop(item.stop_id);
    setFeePerTerm(item.fee_per_term != null ? String(item.fee_per_term) : '');
    setShowAssignModal(true);
  };

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: transportData = [], isLoading } = useQuery({
    queryKey: ['student-transport'],
    queryFn: () => studentTransportApi.listStudentTransport(),
  });

  const { data: studentsData = [] } = useQuery({
    queryKey: ['students-dropdown-transport'],
    queryFn: async () => {
      const items = await studentAdmissionsApi.studentsDropdown({ active_only: true });
      return items.map((s) => ({ label: s.display_name || '', value: s.id }));
    },
  });

  const { data: rawTrips = [] } = useQuery({
    queryKey: ['trips-list'],
    queryFn: () => tripsApi.getTrips(),
  });

  const tripsDropdown = (rawTrips as Trip[]).map((t) => ({
    label: `Trip #${t.trip_number}`,
    value: t.id,
  }));

  const selectedTripRoute = (rawTrips as Trip[]).find((t) => t.id === selectedTrip)?.route_id;

  const { data: stopsData = [] } = useQuery({
    queryKey: ['route-stops', selectedTripRoute],
    queryFn: async () => {
      const stops = await routeStopsApi.getRouteStops({ route_id: selectedTripRoute! });
      return stops.map((s) => ({ label: s.name || '', value: s.id }));
    },
    enabled: !!selectedTripRoute,
  });

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const list = (transportData as StudentTransportOut[]);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((item) => {
      const name = `${item.student?.first_name ?? ''} ${item.student?.last_name ?? ''}`.toLowerCase();
      const route = (item.trip?.route?.route_name ?? '').toLowerCase();
      const stop = (item.stop?.name ?? '').toLowerCase();
      return name.includes(q) || route.includes(q) || stop.includes(q);
    });
  }, [transportData, searchQuery]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: studentTransportApi.createStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      showSuccess('Assigned', 'Transport assignment created successfully');
      setShowAssignModal(false);
      resetForm();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.detail || 'Failed to create assignment');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { trip_id?: string; stop_id?: string; fee_per_term?: number } }) =>
      studentTransportApi.updateStudentTransport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      showSuccess('Updated', 'Transport assignment updated successfully');
      setShowAssignModal(false);
      resetForm();
    },
    onError: (error: any) => {
      showError('Error', error?.response?.data?.detail || 'Failed to update assignment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentTransportApi.deleteStudentTransport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-transport'] });
      showSuccess('Removed', 'Transport assignment removed');
    },
    onError: () => showError('Error', 'Failed to remove assignment'),
  });

  const handleSubmit = () => {
    if (!selectedTrip || !selectedStop || !feePerTerm) {
      Alert.alert('Validation', 'Please fill in all fields');
      return;
    }
    if (!editingItem && !selectedStudent) {
      Alert.alert('Validation', 'Please select a student');
      return;
    }
    const fee = parseFloat(feePerTerm);
    if (isNaN(fee) || fee < 0) {
      Alert.alert('Validation', 'Enter a valid fee amount');
      return;
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: { trip_id: selectedTrip, stop_id: selectedStop, fee_per_term: fee },
      });
    } else {
      createMutation.mutate({
        student_id: selectedStudent,
        trip_id: selectedTrip,
        stop_id: selectedStop,
        fee_per_term: fee,
      });
    }
  };

  const handleDelete = (item: StudentTransportOut) => {
    const name = item.student
      ? `${item.student.first_name} ${item.student.last_name}`
      : 'this student';
    Alert.alert('Remove Assignment', `Remove transport for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}
      fallback={
        <AppLayout title="Student Transport">
          <View style={styles.permDenied}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <ThemedText style={styles.permDeniedText}>
              You don&apos;t have permission to access student transport
            </ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Student Transport">
        {/* Page header: title + Assign button */}
        <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
          <ThemedText style={styles.pageTitle}>Student Transport Assignments</ThemedText>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
            <TouchableOpacity
              style={[styles.assignBtn, { backgroundColor: colors.primary }]}
              onPress={openAssignModal}
            >
              <Ionicons name="add" size={16} color="white" />
              <ThemedText style={styles.assignBtnText}>Assign Transport</ThemedText>
            </TouchableOpacity>
          </CreatePermissionGuard>
        </View>

        {/* Search / filter bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Ionicons name="filter" size={15} color={colors['muted-foreground']} style={{ marginRight: 4 }} />
          <ThemedText style={[styles.filtersLabel, { color: colors['muted-foreground'] }]}>Filters</ThemedText>
          <View style={[styles.searchInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={14} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search student, route, stop..."
              placeholderTextColor={colors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={15} color={colors['muted-foreground']} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Table */}
        <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false}>
          {/* Column headers */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ minWidth: 760 }}>
              {/* Header row */}
              <View style={[styles.tableHeaderRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <ThemedText style={[styles.th, styles.colNo]}>S.No.</ThemedText>
                <ThemedText style={[styles.th, styles.colStudent]}>Student</ThemedText>
                <ThemedText style={[styles.th, styles.colTrip]}>Trip</ThemedText>
                <ThemedText style={[styles.th, styles.colRoute]}>Route</ThemedText>
                <ThemedText style={[styles.th, styles.colStop]}>Stop</ThemedText>
                <ThemedText style={[styles.th, styles.colPricing]}>Pricing</ThemedText>
                <ThemedText style={[styles.th, styles.colFee]}>Fee / Term</ThemedText>
                <ThemedText style={[styles.th, styles.colActions]}>Actions</ThemedText>
              </View>

              {/* Loading */}
              {isLoading && (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: colors['muted-foreground'], fontSize: 14 }}>Loading...</ThemedText>
                </View>
              )}

              {/* Empty */}
              {!isLoading && filtered.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="bus-outline" size={44} color={colors['muted-foreground']} />
                  <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    {searchQuery ? 'No results found' : 'No transport assignments yet'}
                  </ThemedText>
                </View>
              )}

              {/* Data rows */}
              {filtered.map((item, idx) => {
                const studentName = item.student
                  ? `${item.student.first_name} ${item.student.last_name}`
                  : '—';
                const tripLabel = item.trip?.trip_number != null ? `Trip #${item.trip.trip_number}` : '—';
                const routeName = item.trip?.route?.route_name ?? '—';
                const routeSubtitle = item.trip?.route
                  ? `${item.trip.route.starting_stop} → ${item.trip.route.ending_stop}`
                  : null;
                const stopNum = item.stop?.number != null ? ` (#${item.stop.number})` : '';
                const stopName = item.stop?.name ? `${item.stop.name}${stopNum}` : '—';
                const pricingName = item.pricing?.cycle_name ?? null;
                const pricingAmount = item.pricing?.amount != null
                  ? `₹${item.pricing.amount.toLocaleString('en-IN')}`
                  : null;
                const fee = item.fee_per_term;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.tableDataRow,
                      { borderBottomColor: colors.border },
                      idx % 2 === 0
                        ? { backgroundColor: colors.card }
                        : { backgroundColor: colors.background },
                    ]}
                  >
                    <ThemedText style={[styles.td, styles.colNo, { color: colors['muted-foreground'] }]}>
                      {idx + 1}
                    </ThemedText>
                    <View style={[styles.colStudent]}>
                      <ThemedText style={styles.studentNameBold} numberOfLines={1}>
                        {studentName}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.td, styles.colTrip]} numberOfLines={1}>
                      {tripLabel}
                    </ThemedText>
                    <View style={styles.colRoute}>
                      <ThemedText style={styles.routeName} numberOfLines={1}>{routeName}</ThemedText>
                      {routeSubtitle ? (
                        <ThemedText style={[styles.routeSubtitle, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                          {routeSubtitle}
                        </ThemedText>
                      ) : null}
                    </View>
                    <ThemedText style={[styles.td, styles.colStop]} numberOfLines={1}>
                      {stopName}
                    </ThemedText>
                    <View style={styles.colPricing}>
                      {pricingName ? (
                        <>
                          <ThemedText style={styles.pricingName} numberOfLines={1}>{pricingName}</ThemedText>
                          {pricingAmount ? (
                            <ThemedText style={[styles.pricingAmount, { color: colors['muted-foreground'] }]}>
                              {pricingAmount}
                            </ThemedText>
                          ) : null}
                        </>
                      ) : (
                        <ThemedText style={[styles.td, { color: colors['muted-foreground'] }]}>—</ThemedText>
                      )}
                    </View>
                    <ThemedText style={[styles.td, styles.colFee, styles.feeText]}>
                      ₹{fee != null ? fee.toLocaleString('en-IN') : '—'}
                    </ThemedText>
                    <View style={[styles.colActions, styles.actionsCell]}>
                      <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => openEditModal(item)}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </UpdatePermissionGuard>
                      <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => handleDelete(item)}
                          disabled={deleteMutation.isPending}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </DeletePermissionGuard>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>

        {/* Assign Transport Modal */}
        <Modal
          visible={showAssignModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAssignModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              {/* Modal header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <ThemedText style={styles.modalTitle}>
                  {editingItem ? 'Edit Transport' : 'Assign Transport'}
                </ThemedText>
                <TouchableOpacity onPress={() => { setShowAssignModal(false); resetForm(); }}>
                  <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.fieldLabel}>Student *</ThemedText>
                <CustomDropdown
                  data={studentsData}
                  placeholder="Select student"
                  value={selectedStudent}
                  onChange={(v) => setSelectedStudent(v as string)}
                  disabled={!!editingItem}
                />

                <ThemedText style={styles.fieldLabel}>Trip *</ThemedText>
                <CustomDropdown
                  data={tripsDropdown}
                  placeholder="Select trip"
                  value={selectedTrip}
                  onChange={(v) => {
                    setSelectedTrip(v as string);
                    setSelectedStop('');
                  }}
                />

                <ThemedText style={styles.fieldLabel}>Stop *</ThemedText>
                <CustomDropdown
                  data={stopsData}
                  placeholder={selectedTrip ? 'Select stop' : 'Select trip first'}
                  value={selectedStop}
                  onChange={(v) => setSelectedStop(v as string)}
                  disabled={!selectedTrip}
                />

                <ThemedText style={styles.fieldLabel}>Fee per Term (₹) *</ThemedText>
                <TextInput
                  style={[styles.textInput, {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  }]}
                  placeholder="e.g. 3000"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                  value={feePerTerm}
                  onChangeText={setFeePerTerm}
                />

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor:
                        (createMutation.isPending || updateMutation.isPending)
                          ? colors['muted']
                          : colors.primary,
                    },
                  ]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Ionicons name="bus" size={16} color="white" />
                  <ThemedText style={styles.submitBtnText}>
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving...'
                      : editingItem
                      ? 'Update Transport'
                      : 'Assign Transport'}
                  </ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </AppLayout>
    </ReadOrListPermissionGuard>
  );
}

// ─── Role router (default export) ─────────────────────────────────────────────

export default function StudentTransportScreen() {
  const { role } = useAuth();
  const roleName = role?.name?.toLowerCase();
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName || '');

  if (isStudent) {
    return (
      <AppLayout title="My Transport">
        <StudentTransportView />
      </AppLayout>
    );
  }

  if (isParent) {
    return (
      <AppLayout title="Child Transport">
        <ParentTransportView />
      </AppLayout>
    );
  }

  return <AdminTransportView />;
}

// ─── Column widths ─────────────────────────────────────────────────────────────

const colNo = { width: 44 };
const colStudent = { width: 110 };
const colTrip = { width: 70 };
const colRoute = { width: 110 };
const colStop = { width: 130 };
const colPricing = { width: 130 };
const colFee = { width: 90 };
const colActions = { width: 76 };

const styles = StyleSheet.create({
  permDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  permDeniedText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 14,
  },

  // Page header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  assignBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filtersLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },

  // Table
  tableScroll: {
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  td: {
    fontSize: 13,
  },
  studentNameBold: {
    fontSize: 13,
    fontWeight: '700',
  },
  routeName: {
    fontSize: 13,
  },
  routeSubtitle: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 1,
  },
  pricingName: {
    fontSize: 13,
    fontWeight: '500',
  },
  pricingAmount: {
    fontSize: 11,
    marginTop: 1,
  },
  feeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  actionsCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Column widths
  colNo,
  colStudent,
  colTrip,
  colRoute,
  colStop,
  colPricing,
  colFee,
  colActions,

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 10,
    opacity: 0.75,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

// ─── TransportCard styles ──────────────────────────────────────────────────────

const tStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  routeName: {
    fontSize: 13,
    opacity: 0.55,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  infoMeta: {
    fontSize: 12,
    opacity: 0.55,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
