import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
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
import { tripsApi, routeStopsApi, transportPricingApi } from '@/src/api/masters';
import type { Trip } from '@/src/api/masters';
import {
  CreatePermissionGuard,
  DeletePermissionGuard,
  ReadOrListPermissionGuard,
  UpdatePermissionGuard,
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

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

  const { data: transportData = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['my-transport', studentId],
    queryFn: () => studentTransportApi.listStudentTransport({ student_id: studentId! }),
    enabled: !!studentId,
  });

  const myItems = transportData as StudentTransportOut[];

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ThemedText style={{ color: colors['muted-foreground'], fontSize: 14 }}>Loading...</ThemedText>
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors['muted-foreground']} />
        <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
          Failed to load transport info
        </ThemedText>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <ThemedText style={[styles.retryBtnText, { color: colors.primary }]}>Tap to retry</ThemedText>
        </TouchableOpacity>
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

  const { data: transportData = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['transport-child', selectedStudent?.id],
    queryFn: () => studentTransportApi.listStudentTransport({ student_id: selectedStudent!.id }),
    enabled: !!selectedStudent?.id,
  });

  const childItems = transportData as StudentTransportOut[];

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
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors['muted-foreground']} />
          <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
            Failed to load transport info
          </ThemedText>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <ThemedText style={[styles.retryBtnText, { color: colors.primary }]}>Tap to retry</ThemedText>
          </TouchableOpacity>
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

  const { confirm, modalProps: confirmModalProps } = useConfirmModal();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StudentTransportOut | null>(null);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [selectedStop, setSelectedStop] = useState('');
  const [selectedPricing, setSelectedPricing] = useState('');
  const [feePerTerm, setFeePerTerm] = useState('');

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedTrip('');
    setSelectedStop('');
    setSelectedPricing('');
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
    setSelectedPricing(item.pricing_id ?? '');
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
      return stops.map((s) => ({ label: `#${s.number} – ${s.name}`, value: s.id }));
    },
    enabled: !!selectedTripRoute,
  });

  const selectedTripVehicleId = (rawTrips as Trip[]).find((t) => t.id === selectedTrip)?.vehicle_id;

  const { data: pricingData = [] } = useQuery({
    queryKey: ['transport-pricing-dropdown', selectedTripVehicleId],
    queryFn: () => transportPricingApi.getDropdown({ vehicle_id: selectedTripVehicleId }),
    enabled: !!selectedTripVehicleId,
    select: (d) => d.map((p) => ({
      label: `${p.cycle_name} — ₹${Number(p.amount).toLocaleString('en-IN')}`,
      value: p.id,
      amount: Number(p.amount),
    })),
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
    mutationFn: ({ id, data }: { id: string; data: { trip_id?: string; stop_id?: string; fee_per_term?: number; pricing_id?: string } }) =>
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
    if (!selectedTrip || !selectedStop) {
      showError('Validation', 'Please select a trip and stop');
      return;
    }
    if (!editingItem && !selectedStudent) {
      showError('Validation', 'Please select a student');
      return;
    }
    const fee = parseFloat(feePerTerm);
    if (isNaN(fee) || fee < 0) {
      showError('Validation', 'Enter a valid fee amount');
      return;
    }
    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        data: {
          trip_id: selectedTrip,
          stop_id: selectedStop,
          fee_per_term: fee,
          pricing_id: selectedPricing || undefined,
        },
      });
    } else {
      createMutation.mutate({
        student_id: selectedStudent,
        trip_id: selectedTrip,
        stop_id: selectedStop,
        fee_per_term: fee,
        pricing_id: selectedPricing || undefined,
      });
    }
  };

  const handleDelete = (item: StudentTransportOut) => {
    const name = item.student
      ? `${item.student.first_name} ${item.student.last_name}`
      : 'this student';
    confirm({
      title: 'Remove Assignment',
      message: `Remove transport for ${name}?`,
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id),
    });
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

        {/* Cards */}
        <ScrollView style={styles.tableScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 12 }}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: colors['muted-foreground'], fontSize: 14 }}>Loading...</ThemedText>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bus-outline" size={44} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                {searchQuery ? 'No results found' : 'No transport assignments yet'}
              </ThemedText>
            </View>
          ) : filtered.map((item) => {
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
              ? `₹${Number(item.pricing.amount).toLocaleString('en-IN')}`
              : null;
            const fee = item.fee_per_term;

            return (
              <View key={item.id} style={[styles.assignCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.assignCardAccent, { backgroundColor: colors.primary }]} />
                <View style={{ flex: 1, padding: 12 }}>
                  <View style={styles.assignCardTop}>
                    <ThemedText style={[styles.studentNameBold, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                      {studentName}
                    </ThemedText>
                    <View style={[styles.tripBadge, { backgroundColor: colors.primary + '20' }]}>
                      <ThemedText style={[styles.tripBadgeText, { color: colors.primary }]}>{tripLabel}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.assignCardMeta}>
                    <Ionicons name="navigate-outline" size={13} color={colors['muted-foreground']} />
                    <ThemedText style={[styles.assignCardMetaText, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                      {routeName}{routeSubtitle ? ` · ${routeSubtitle}` : ''}
                    </ThemedText>
                  </View>
                  <View style={styles.assignCardMeta}>
                    <Ionicons name="location-outline" size={13} color={colors['muted-foreground']} />
                    <ThemedText style={[styles.assignCardMetaText, { color: colors['muted-foreground'] }]}>{stopName}</ThemedText>
                  </View>
                  {(pricingName || fee != null) && (
                    <View style={styles.assignCardMeta}>
                      <Ionicons name="pricetag-outline" size={13} color={colors['muted-foreground']} />
                      <ThemedText style={[styles.assignCardMetaText, { color: colors['muted-foreground'] }]}>
                        {pricingName ?? '—'}{pricingAmount ? ` (${pricingAmount})` : ''}
                        {fee != null ? ` · Fee: ₹${fee.toLocaleString('en-IN')}` : ''}
                      </ThemedText>
                    </View>
                  )}
                  <View style={[styles.assignCardFooter, { borderTopColor: colors.border }]}>
                    <UpdatePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
                      <TouchableOpacity style={styles.assignCardAction} onPress={() => openEditModal(item)}>
                        <Ionicons name="create-outline" size={15} color={colors.primary} />
                        <ThemedText style={[styles.assignCardActionText, { color: colors.primary }]}>Edit</ThemedText>
                      </TouchableOpacity>
                    </UpdatePermissionGuard>
                    <DeletePermissionGuard resource={PERMISSION_RESOURCES.STUDENT_TRANSPORT}>
                      <TouchableOpacity style={styles.assignCardAction} onPress={() => handleDelete(item)} disabled={deleteMutation.isPending}>
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        <ThemedText style={[styles.assignCardActionText, { color: '#EF4444' }]}>Delete</ThemedText>
                      </TouchableOpacity>
                    </DeletePermissionGuard>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <ConfirmModal {...confirmModalProps} />

        {/* Assign Transport Modal */}
        <Modal
          visible={showAssignModal}
          transparent
          animationType="fade"
          onRequestClose={() => { setShowAssignModal(false); resetForm(); }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalDialog, { backgroundColor: colors.card }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>
                  {editingItem ? 'Edit Transport' : 'Assign Transport'}
                </ThemedText>
                <TouchableOpacity onPress={() => { setShowAssignModal(false); resetForm(); }} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={20} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <ThemedText style={[styles.fieldLabel, { color: colors.foreground }]}>Student</ThemedText>
                <CustomDropdown
                  data={studentsData}
                  placeholder="Select student"
                  value={selectedStudent}
                  onChange={(v) => setSelectedStudent(v as string)}
                  disabled={!!editingItem}
                />

                <ThemedText style={[styles.fieldLabel, { color: colors.foreground }]}>Trip</ThemedText>
                <CustomDropdown
                  data={tripsDropdown}
                  placeholder="Select trip"
                  value={selectedTrip}
                  onChange={(v) => {
                    setSelectedTrip(v as string);
                    setSelectedStop('');
                    setSelectedPricing('');
                    setFeePerTerm('');
                  }}
                />

                <ThemedText style={[styles.fieldLabel, { color: colors.foreground }]}>Stop</ThemedText>
                <CustomDropdown
                  data={stopsData}
                  placeholder={selectedTrip ? 'Select stop' : 'Select trip first'}
                  value={selectedStop}
                  onChange={(v) => setSelectedStop(v as string)}
                  disabled={!selectedTrip}
                />

                <ThemedText style={[styles.fieldLabel, { color: colors.foreground }]}>Pricing Plan <ThemedText style={{ opacity: 0.55 }}>(optional)</ThemedText></ThemedText>
                <CustomDropdown
                  data={pricingData}
                  placeholder={selectedTripVehicleId ? 'Select pricing plan' : 'Select trip first'}
                  value={selectedPricing}
                  onChange={(v) => {
                    const id = v as string;
                    setSelectedPricing(id);
                    const plan = (pricingData as any[]).find((p) => p.value === id);
                    if (plan?.amount != null) setFeePerTerm(String(plan.amount));
                  }}
                  disabled={!selectedTripVehicleId}
                />

                <ThemedText style={[styles.fieldLabel, { color: colors.foreground }]}>Fee per Term (₹)</ThemedText>
                <TextInput
                  style={[styles.textInput, {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  }]}
                  placeholder="0.00"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                  value={feePerTerm}
                  onChangeText={setFeePerTerm}
                />

                <View style={{ height: 8 }} />
              </ScrollView>

              {/* Footer: Cancel + Assign */}
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => { setShowAssignModal(false); resetForm(); }}
                >
                  <ThemedText style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.assignBtn2, { backgroundColor: colors.primary, opacity: (createMutation.isPending || updateMutation.isPending) ? 0.6 : 1 }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <ThemedText style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingItem ? 'Update' : 'Assign'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
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
  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = ['parent', 'guardian', 'father', 'mother'].includes(roleName);

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

  // Cards
  tableScroll: { flex: 1 },
  studentNameBold: { fontSize: 15, fontWeight: '700' },
  assignCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  assignCardAccent: { width: 4, alignSelf: 'stretch' },
  assignCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  assignCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  assignCardMetaText: { fontSize: 12, flex: 1 },
  tripBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tripBadgeText: { fontSize: 11, fontWeight: '700' },
  assignCardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 6 },
  assignCardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  assignCardActionText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 13, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 8 },
  retryBtnText: { fontSize: 14, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
  },
  modalDialog: {
    width: '100%',
    borderRadius: 16,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
  },
  assignBtn2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 10,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
  },
  textInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
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
