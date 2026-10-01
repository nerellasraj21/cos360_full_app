import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { IOSDatePickerModal } from '@/components/ui';
import CustomDropdown from '@/components/ui/dropdown';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard,
} from '@/components/PermissionGuards';
import { useTheme } from '@/contexts';
import { useToastContext } from '@/components/ToastProvider';
import {
  useTransportPricings,
  useCreateTransportPricing,
  useUpdateTransportPricing,
  useDeleteTransportPricing,
  useVehiclesDropdown,
  useRoutesDropdown,
} from '@/hooks/use-transport';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { TransportPricing, BillingCycle } from '@/src/types/transport';

// ── Constants ────────────────────────────────────────────────────────────────
const BILLING_CYCLE_OPTIONS: Array<{ label: string; value: BillingCycle }> = [
  { label: 'Annual', value: 'annual' },
  { label: 'Semester', value: 'semester' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom', value: 'custom' },
];

const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDate = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const today = formatDate(new Date());

interface PricingForm {
  vehicle_id: string;
  route_id: string;
  billing_cycle: BillingCycle;
  cycle_name: string;
  amount: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

const INITIAL_FORM: PricingForm = {
  vehicle_id: '',
  route_id: '',
  billing_cycle: 'annual',
  cycle_name: '',
  amount: '',
  start_date: today,
  end_date: '',
  is_active: true,
};

// ── Screen ───────────────────────────────────────────────────────────────────
export default function TransportPricingScreen() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmModalProps } = useConfirmModal();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TransportPricing | null>(null);
  const [form, setForm] = useState<PricingForm>(INITIAL_FORM);
  const [activeDateField, setActiveDateField] = useState<'start_date' | 'end_date' | null>(null);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#f9fafb';

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: pricingList, isLoading, refetch } = useTransportPricings();
  const { data: vehiclesData } = useVehiclesDropdown();
  const { data: routesData } = useRoutesDropdown();

  const vehicles = vehiclesData ?? [];
  const routes = routesData ?? [];

  const vehicleOptions = vehicles.map((v: { id: string; name: string }) => ({
    label: v.name,
    value: v.id,
  }));
  const routeOptions = routes.map((r: { id: string; route_name: string }) => ({
    label: r.route_name,
    value: r.id,
  }));

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useCreateTransportPricing();
  const updateMutation = useUpdateTransportPricing();
  const deleteMutation = useDeleteTransportPricing();

  const setField = <K extends keyof PricingForm>(key: K, value: PricingForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: TransportPricing) => {
    setEditing(item);
    setForm({
      vehicle_id: item.vehicle_id,
      route_id: item.route_id ?? '',
      billing_cycle: item.billing_cycle,
      cycle_name: item.cycle_name,
      amount: String(Number(item.amount)), // Decimal may come as string or number
      start_date: item.start_date,
      end_date: item.end_date,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = (item: TransportPricing) => {
    const name = item.cycle_name || 'this pricing';
    confirm({
      title: 'Delete Pricing',
      message: `Delete "${name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id, {
        onSuccess: () => showSuccess('Deleted', 'Pricing deleted successfully'),
        onError: (err) => showError('Error', err.message || 'Failed to delete'),
      }),
    });
  };

  const handleSubmit = () => {
    if (!form.vehicle_id) {
      showError('Validation', 'Vehicle is required');
      return;
    }
    if (!form.billing_cycle) {
      showError('Validation', 'Billing cycle is required');
      return;
    }
    if (!form.cycle_name.trim()) {
      showError('Validation', 'Cycle name is required');
      return;
    }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      showError('Validation', 'Amount must be a positive number');
      return;
    }
    if (!form.start_date) {
      showError('Validation', 'Start date is required');
      return;
    }
    if (!form.end_date) {
      showError('Validation', 'End date is required');
      return;
    }
    if (form.end_date < form.start_date) {
      showError('Validation', 'End date must be after start date');
      return;
    }

    const payload = {
      vehicle_id: form.vehicle_id,
      route_id: form.route_id || null,
      billing_cycle: form.billing_cycle,
      cycle_name: form.cycle_name.trim(),
      amount: Number(form.amount),
      start_date: form.start_date,
      end_date: form.end_date,
      is_active: form.is_active,
    };

    const callbacks = {
      onSuccess: () => {
        setShowModal(false);
        resetForm();
        showSuccess(editing ? 'Updated' : 'Created', `Pricing ${editing ? 'updated' : 'created'} successfully`);
      },
      onError: (err: Error) => showError('Error', err.message || `Failed to ${editing ? 'update' : 'create'}`),
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload }, callbacks);
    } else {
      createMutation.mutate(payload, callbacks);
    }
  };

  // ── Date picker helpers ──────────────────────────────────────────────────
  const datePickerValue = () => {
    if (!activeDateField) return new Date();
    const val = form[activeDateField];
    return val ? parseDate(val) : new Date();
  };

  const handleDateChange = (field: 'start_date' | 'end_date', date: Date) => {
    setField(field, formatDate(date));
  };

  const openDatePicker = (field: 'start_date' | 'end_date') => {
    setActiveDateField(field);
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const getVehicleName = (id: string) =>
    vehicles.find((v: { id: string; name: string }) => v.id === id)?.name ?? 'Unknown';

  const getRouteName = (id: string | null) => {
    if (!id) return null;
    return routes.find((r: { id: string; route_name: string }) => r.id === id)?.route_name ?? null;
  };

  const getBillingLabel = (cycle: string) =>
    BILLING_CYCLE_OPTIONS.find((o) => o.value === cycle)?.label ?? cycle;

  // ── Card renderer ────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: TransportPricing; index: number }) => {
    const vehicleName = item.vehicle_name || getVehicleName(item.vehicle_id);
    const routeName = item.route_name || getRouteName(item.route_id);

    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              {vehicleName}
            </Text>
            <View style={[styles.badge, { backgroundColor: item.is_active ? '#22c55e20' : '#ef444420' }]}>
              <Text style={{ fontSize: 10, fontWeight: '600', color: item.is_active ? '#16a34a' : '#ef4444' }}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          {!!routeName && (
            <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
              Route: {routeName}
            </Text>
          )}
          <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
            {getBillingLabel(item.billing_cycle)} — {item.cycle_name}
          </Text>
          <Text style={[styles.cardAmount, { color: colors.primary }]}>
            ₹{Number(item.amount).toLocaleString('en-IN')}
          </Text>
          <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
            {item.start_date ? parseDate(item.start_date).toLocaleDateString('en-IN') : ''} - {item.end_date ? parseDate(item.end_date).toLocaleDateString('en-IN') : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <UpdatePermissionGuard resource={PERMISSION_RESOURCES.TRANSPORT_PRICING}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#556ee618' }]}
              onPress={() => openEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create-outline" size={16} color="#556ee6" />
            </TouchableOpacity>
          </UpdatePermissionGuard>
          <DeletePermissionGuard resource={PERMISSION_RESOURCES.TRANSPORT_PRICING}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: '#EF444418' }]}
              onPress={() => handleDelete(item)}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </DeletePermissionGuard>
        </View>
      </View>
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title="Transport Pricing">
      <ReadOrListPermissionGuard
        resource={PERMISSION_RESOURCES.TRANSPORT_PRICING}
        fallback={
          <View style={styles.centered}>
            <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
            <Text style={{ color: colors['muted-foreground'], marginTop: 12 }}>
              You don&apos;t have permission to view transport pricing
            </Text>
          </View>
        }
      >
        <View style={styles.container}>
          <CreatePermissionGuard resource={PERMISSION_RESOURCES.TRANSPORT_PRICING}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: '#556ee6' }]}
              onPress={openCreate}
            >
              <Ionicons name="add" size={18} color="white" />
              <Text style={styles.addBtnText}>Add Pricing</Text>
            </TouchableOpacity>
          </CreatePermissionGuard>

          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>Loading pricing...</Text>
            </View>
          ) : (
            <FlatList
              data={pricingList ?? []}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 32, gap: 8 }}
              refreshing={false}
              onRefresh={refetch}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons name="cash-outline" size={48} color={colors['muted-foreground']} />
                  <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>
                    No pricing records yet
                  </Text>
                </View>
              }
            />
          )}

          {/* ── Create / Edit Modal ──────────────────────────────────────── */}
          <Modal
            visible={showModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowModal(false)}
          >
            <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={[styles.modal, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                    {editing ? 'Edit Pricing' : 'Add Pricing'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}
              accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={colors.foreground} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Vehicle (required) */}
                  <Text style={[styles.label, { color: colors.foreground }]}>Vehicle *</Text>
                  <CustomDropdown
                    data={vehicleOptions}
                    value={form.vehicle_id || undefined}
                    onChange={(val) => setField('vehicle_id', String(val ?? ''))}
                    placeholder="Select Vehicle"
                    search
                  />

                  {/* Route (optional) */}
                  <Text style={[styles.label, { color: colors.foreground }]}>Route</Text>
                  <CustomDropdown
                    data={routeOptions}
                    value={form.route_id || undefined}
                    onChange={(val) => setField('route_id', String(val ?? ''))}
                    placeholder="Select Route (optional)"
                    search
                  />

                  {/* Billing Cycle */}
                  <Text style={[styles.label, { color: colors.foreground }]}>Billing Cycle *</Text>
                  <CustomDropdown
                    data={BILLING_CYCLE_OPTIONS}
                    value={form.billing_cycle || undefined}
                    onChange={(val) => setField('billing_cycle', (val as BillingCycle) ?? 'annual')}
                    placeholder="Select Billing Cycle"
                    search={false}
                  />

                  {/* Cycle Name */}
                  <Text style={[styles.label, { color: colors.foreground }]}>Cycle Name *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                    placeholder="e.g. Annual 2025-26"
                    placeholderTextColor={colors['muted-foreground']}
                    value={form.cycle_name}
                    onChangeText={(t) => setField('cycle_name', t)}
                  />

                  {/* Amount */}
                  <Text style={[styles.label, { color: colors.foreground }]}>Amount (₹) *</Text>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                    placeholder="e.g. 15000"
                    placeholderTextColor={colors['muted-foreground']}
                    value={form.amount}
                    onChangeText={(t) => setField('amount', t)}
                    keyboardType="numeric"
                  />

                  {/* Start Date */}
                  <Text style={[styles.label, { color: colors.foreground }]}>Start Date *</Text>
                  <TouchableOpacity
                    style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}
                    onPress={() => openDatePicker('start_date')}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
                    <Text style={{ color: form.start_date ? colors.foreground : colors['muted-foreground'], flex: 1 }}>
                      {form.start_date || 'Select start date'}
                    </Text>
                  </TouchableOpacity>

                  {/* End Date */}
                  <Text style={[styles.label, { color: colors.foreground }]}>End Date *</Text>
                  <TouchableOpacity
                    style={[styles.dateInput, { borderColor: borderCol, backgroundColor: inputBg }]}
                    onPress={() => openDatePicker('end_date')}
                  >
                    <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
                    <Text style={{ color: form.end_date ? colors.foreground : colors['muted-foreground'], flex: 1 }}>
                      {form.end_date || 'Select end date'}
                    </Text>
                  </TouchableOpacity>

                  {/* Active toggle */}
                  <View style={styles.switchRow}>
                    <Text style={[styles.label, { color: colors.foreground, marginTop: 0, marginBottom: 0 }]}>Active</Text>
                    <Switch
                      value={form.is_active}
                      onValueChange={(val) => setField('is_active', val)}
                      trackColor={{ false: '#767577', true: '#556ee680' }}
                      thumbColor={form.is_active ? '#556ee6' : '#f4f3f4'}
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: borderCol }]}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={{ color: colors.foreground }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: '#556ee6', opacity: isSaving ? 0.5 : 1 }]}
                    onPress={handleSubmit}
                    disabled={isSaving}
                  >
                    <Text style={{ color: 'white', fontWeight: '600' }}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      </ReadOrListPermissionGuard>

      {/* ── Date pickers (outside modal for Android/iOS compat) ───────── */}
      {!!activeDateField && Platform.OS === 'android' && (
        <DateTimePicker
          value={datePickerValue()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            const field = activeDateField;
            setActiveDateField(null);
            if (event.type === 'set' && date && field) {
              handleDateChange(field, date);
            }
          }}
        />
      )}
      {Platform.OS === 'ios' && (
        <IOSDatePickerModal
          visible={!!activeDateField}
          value={datePickerValue()}
          mode="date"
          onChange={(date) => {
            if (activeDateField) handleDateChange(activeDateField, date);
          }}
          onDismiss={() => setActiveDateField(null)}
        />
      )}
      <ConfirmModal {...confirmModalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  container: { flex: 1, padding: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  addBtnText: { color: 'white', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  cardAmount: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderWidth: 1,
  },
  submitBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});
