import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { useRoutesDropdown } from '@/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────
interface TransportPricing {
  id: string;
  route_id: string;
  vehicle_id: string;
  trip_type: string;
  amount: string; // Decimal → returned as string from backend, use Number() for display
  academic_year_id: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

interface TransportPricingCreateRequest {
  route_id: string;
  vehicle_id: string;
  trip_type: string;
  amount: number;
  academic_year_id?: string;
  description?: string;
}

// ── API ───────────────────────────────────────────────────────────────────────
import apiClient from '@/src/api/client';

const transportPricingApi = {
  list: async (): Promise<TransportPricing[]> => {
    const response = await apiClient.get('/masters/transport-pricing/');
    return response.data.items || response.data;
  },
  create: async (data: TransportPricingCreateRequest): Promise<TransportPricing> => {
    const response = await apiClient.post('/masters/transport-pricing/', data);
    return response.data;
  },
  update: async (
    id: string,
    data: Partial<TransportPricingCreateRequest>,
  ): Promise<TransportPricing> => {
    const response = await apiClient.put(`/masters/transport-pricing/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/transport-pricing/${id}`);
  },
};

// ── Screen ────────────────────────────────────────────────────────────────────
export default function TransportPricingScreen() {
  const { colors, theme } = useTheme();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TransportPricing | null>(null);
  const [form, setForm] = useState({
    route_id: '',
    trip_type: 'first trip',
    amount: '',
    description: '',
  });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: pricingList, isLoading } = useQuery({
    queryKey: ['transport-pricing'],
    queryFn: () => transportPricingApi.list(),
  });

  const { data: routesData } = useRoutesDropdown();
  const routes = routesData ?? [];

  const createMutation = useMutation({
    mutationFn: transportPricingApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-pricing'] });
      setShowModal(false);
      resetForm();
    },
    onError: () => Alert.alert('Error', 'Failed to create pricing'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransportPricingCreateRequest> }) =>
      transportPricingApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-pricing'] });
      setShowModal(false);
      resetForm();
    },
    onError: () => Alert.alert('Error', 'Failed to update pricing'),
  });

  const deleteMutation = useMutation({
    mutationFn: transportPricingApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transport-pricing'] }),
    onError: () => Alert.alert('Error', 'Failed to delete pricing'),
  });

  const resetForm = () => {
    setForm({ route_id: '', trip_type: 'first trip', amount: '', description: '' });
    setEditing(null);
  };

  const openEdit = (item: TransportPricing) => {
    setEditing(item);
    setForm({
      route_id: item.route_id,
      trip_type: item.trip_type,
      amount: String(Number(item.amount)),
      description: item.description ?? '',
    });
    setShowModal(true);
  };

  const handleDelete = (item: TransportPricing) => {
    Alert.alert('Delete Pricing', 'Delete this pricing record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  };

  const handleSubmit = () => {
    if (!form.route_id || !form.amount) {
      Alert.alert('Error', 'Route and amount are required');
      return;
    }
    const payload = {
      route_id: form.route_id,
      vehicle_id: '',
      trip_type: form.trip_type,
      amount: Number(form.amount),
      description: form.description || undefined,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderItem = ({ item }: { item: TransportPricing }) => {
    const route = routes.find((r) => r.id === item.route_id);
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {route?.route_name ?? 'Unknown Route'}
          </Text>
          <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
            {item.trip_type === 'first trip' ? 'Morning' : 'Afternoon'} • ₹
            {Number(item.amount).toLocaleString('en-IN')}
          </Text>
          {item.description ? (
            <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: '#556ee618' }]}
            onPress={() => openEdit(item)}
          >
            <Ionicons name="create-outline" size={16} color="#556ee6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: '#EF444418' }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <AppLayout title="Transport Pricing">
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#556ee6' }]}
          onPress={() => { resetForm(); setShowModal(true); }}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.addBtnText}>Add Pricing</Text>
        </TouchableOpacity>

        <FlatList
          data={pricingList ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32, gap: 8 }}
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.centered}>
                <Ionicons name="cash-outline" size={48} color={colors['muted-foreground']} />
                <Text style={{ color: colors['muted-foreground'], marginTop: 8 }}>
                  No pricing records yet
                </Text>
              </View>
            )
          }
        />

        <Modal
          visible={showModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editing ? 'Edit Pricing' : 'Add Pricing'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <Text style={[styles.label, { color: colors.foreground }]}>Route *</Text>
                {routes.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.radioBtn,
                      {
                        borderColor: form.route_id === r.id ? '#556ee6' : borderCol,
                        backgroundColor:
                          form.route_id === r.id ? '#556ee618' : 'transparent',
                      },
                    ]}
                    onPress={() => setForm((f) => ({ ...f, route_id: r.id }))}
                  >
                    <Text
                      style={{
                        color: form.route_id === r.id ? '#556ee6' : colors.foreground,
                        fontWeight: form.route_id === r.id ? '600' : '400',
                      }}
                    >
                      {r.route_name}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.label, { color: colors.foreground }]}>Trip Type</Text>
                <View style={styles.tripRow}>
                  {['first trip', 'second trip'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.tripBtn,
                        form.trip_type === t && { backgroundColor: '#556ee6' },
                        { borderColor: form.trip_type === t ? '#556ee6' : borderCol },
                      ]}
                      onPress={() => setForm((f) => ({ ...f, trip_type: t }))}
                    >
                      <Text
                        style={{
                          color: form.trip_type === t ? 'white' : colors.foreground,
                          fontWeight: '600',
                        }}
                      >
                        {t === 'first trip' ? 'Morning' : 'Afternoon'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: colors.foreground }]}>Amount (₹) *</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: borderCol }]}
                  placeholder="e.g. 1500"
                  placeholderTextColor={colors['muted-foreground']}
                  value={form.amount}
                  onChangeText={(t) => setForm((f) => ({ ...f, amount: t }))}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: borderCol }]}
                  placeholder="Optional note"
                  placeholderTextColor={colors['muted-foreground']}
                  value={form.description}
                  onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={{ color: colors.foreground }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: '#556ee6' }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  cardSub: { fontSize: 12, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
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
  radioBtn: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  tripRow: { flexDirection: 'row', gap: 8 },
  tripBtn: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});
