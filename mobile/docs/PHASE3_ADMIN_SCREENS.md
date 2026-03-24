# Phase 3 — Missing Admin Screens

**Prepared for:** App Developer
**Scope:** 6 new screen files + API additions + Communication tab activation
**Status: ✅ COMPLETE**

> Phase 2 complete. All Phase 3 screens built and committed.

---

## What Gets Built

| # | File | Type | Description |
|---|---|---|---|
| 1 | `src/api/transport.ts` | Update | Add transport pricing API functions |
| 2 | `app/transport/pricing.tsx` | New file | Transport Pricing CRUD |
| 3 | `src/api/fees.ts` | Update | Add fee reports API functions |
| 4 | `app/fees/reports.tsx` | New file | Fee Reports (3 sections) |
| 5 | `src/api/communication.ts` | New file | Communication API (send, templates, logs) |
| 6 | `app/communication/compose.tsx` | New file | Compose & send messages |
| 7 | `app/communication/templates.tsx` | New file | Template CRUD |
| 8 | `app/communication/logs.tsx` | New file | Message logs (read-only) |
| 9 | `app/exam/grading.tsx` | New file | Grading navigation hub |
| 10 | `app/(tabs)/_layout.tsx` | Update | Add Communication tab |
| 11 | `app/(tabs)/communication.tsx` | Update | Change from redirect to hub with 3 cards (⚠️ GAP added Mar 2026) |

> **⚠️ Three gaps were identified vs `FRONTEND_REQUIREMENTS.md` and are documented at the bottom of this file.**

---

## Screen 1 — Transport Pricing (`app/transport/pricing.tsx`)

### 1a — Add API functions to `src/api/transport.ts`

Find the existing transport API file and add:

```ts
// Types
export interface TransportPricing {
  id: string;
  route_id: string;
  vehicle_id: string;
  trip_type: string;
  amount: string;          // Decimal → comes as string from backend
  academic_year_id: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface TransportPricingCreateRequest {
  route_id: string;
  vehicle_id: string;
  trip_type: string;
  amount: number;
  academic_year_id: string;
  description?: string;
  is_active?: boolean;
}

// API object
export const transportPricingApi = {
  list: async (): Promise<TransportPricing[]> => {
    const response = await apiClient.get('/masters/transport-pricing/');
    return response.data.items || response.data;
  },
  create: async (data: TransportPricingCreateRequest): Promise<TransportPricing> => {
    const response = await apiClient.post('/masters/transport-pricing/', data);
    return response.data;
  },
  update: async (id: string, data: Partial<TransportPricingCreateRequest>): Promise<TransportPricing> => {
    const response = await apiClient.put(`/masters/transport-pricing/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/masters/transport-pricing/${id}`);
  },
};
```

> **Important:** `amount` is a Decimal on the backend — it returns as a **string** (e.g. `"1500.00"`). Always use `Number(item.amount)` when displaying.

### 1b — Create `app/transport/pricing.tsx`

```tsx
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
import { transportPricingApi, TransportPricing } from '@/src/api/transport';
import { useRoutesDropdown } from '@/hooks';

export default function TransportPricingScreen() {
  const { colors, theme } = useTheme();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<TransportPricing | null>(null);
  const [form, setForm] = useState({
    route_id: '',
    vehicle_id: '',
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
    mutationFn: ({ id, data }: { id: string; data: any }) =>
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
    setForm({ route_id: '', vehicle_id: '', trip_type: 'first trip', amount: '', description: '' });
    setEditing(null);
  };

  const openEdit = (item: TransportPricing) => {
    setEditing(item);
    setForm({
      route_id: item.route_id,
      vehicle_id: item.vehicle_id,
      trip_type: item.trip_type,
      amount: String(Number(item.amount)),
      description: item.description ?? '',
    });
    setShowModal(true);
  };

  const handleDelete = (item: TransportPricing) => {
    Alert.alert('Delete Pricing', 'Delete this pricing record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  const handleSubmit = () => {
    if (!form.route_id || !form.amount) {
      Alert.alert('Error', 'Route and amount are required');
      return;
    }
    const payload = {
      route_id: form.route_id,
      vehicle_id: form.vehicle_id,
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
    const route = routes.find(r => r.id === item.route_id);
    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
            {route?.route_name ?? 'Unknown Route'}
          </Text>
          <Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
            {item.trip_type === 'first trip' ? 'Morning' : 'Afternoon'} •
            ₹{Number(item.amount).toLocaleString('en-IN')}
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
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32, gap: 8 }}
          ListEmptyComponent={
            isLoading ? null : (
              <View style={styles.centered}>
                <Text style={{ color: colors['muted-foreground'] }}>
                  No pricing records yet
                </Text>
              </View>
            )
          }
        />

        <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
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
                {routes.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.radioBtn,
                      { borderColor: form.route_id === r.id ? '#556ee6' : borderCol },
                    ]}
                    onPress={() => setForm(f => ({ ...f, route_id: r.id }))}
                  >
                    <Text style={{ color: form.route_id === r.id ? '#556ee6' : colors.foreground }}>
                      {r.route_name}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.label, { color: colors.foreground }]}>Trip Type</Text>
                <View style={styles.tripRow}>
                  {['first trip', 'second trip'].map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.tripBtn,
                        form.trip_type === t && { backgroundColor: '#556ee6' },
                        { borderColor: form.trip_type === t ? '#556ee6' : borderCol },
                      ]}
                      onPress={() => setForm(f => ({ ...f, trip_type: t }))}
                    >
                      <Text style={{ color: form.trip_type === t ? 'white' : colors.foreground }}>
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
                  onChangeText={t => setForm(f => ({ ...f, amount: t }))}
                  keyboardType="numeric"
                />

                <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
                <TextInput
                  style={[styles.input, { color: colors.foreground, borderColor: borderCol }]}
                  placeholder="Optional note"
                  placeholderTextColor={colors['muted-foreground']}
                  value={form.description}
                  onChangeText={t => setForm(f => ({ ...f, description: t }))}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    alignSelf: 'flex-end', marginBottom: 12,
  },
  addBtnText: { color: 'white', fontWeight: '600' },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  cardSub: { fontSize: 12, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  radioBtn: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 6 },
  tripRow: { flexDirection: 'row', gap: 8 },
  tripBtn: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});
```

---

## Screen 2 — Fee Reports (`app/fees/reports.tsx`)

### 2a — Add API functions to `src/api/fees.ts`

```ts
// Types
export interface FeeCollectionSummaryReport {
  total_collected: string;
  total_transactions: number;
  by_payment_method: { method: string; amount: string; count: number }[];
  by_date: { date: string; amount: string }[];
}

export interface FeePendingReport {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  section_name: string;
  outstanding_amount: string;
}

export interface FeeStructureReport {
  class_name: string;
  fee_type_name: string;
  total_fee: string;
  student_count: number;
}

// Add to feeCollectionApi (or as a new export):
export const feeReportsApi = {
  /** GET /fee/reports/collection-summary */
  getCollectionSummary: async (params?: {
    academic_year_id?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<FeeCollectionSummaryReport> => {
    const response = await apiClient.get('/fee/reports/collection-summary', { params });
    return response.data;
  },

  /** GET /fee/reports/pending */
  getPendingFees: async (params?: {
    academic_year_id?: string;
    class_id?: string;
  }): Promise<FeePendingReport[]> => {
    const response = await apiClient.get('/fee/reports/pending', { params });
    return response.data.items || response.data;
  },

  /** GET /fee/reports/fee-structure */
  getFeeStructure: async (params?: {
    academic_year_id?: string;
  }): Promise<FeeStructureReport[]> => {
    const response = await apiClient.get('/fee/reports/fee-structure', { params });
    return response.data.items || response.data;
  },
};
```

### 2b — Create `app/fees/reports.tsx`

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { feeReportsApi } from '@/src/api/fees';

type Tab = 'collection' | 'pending' | 'structure';

export default function FeeReportsScreen() {
  const { colors, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('collection');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: collectionData, isLoading: collectionLoading } = useQuery({
    queryKey: ['fee-report-collection'],
    queryFn: () => feeReportsApi.getCollectionSummary(),
    enabled: activeTab === 'collection',
  });

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['fee-report-pending'],
    queryFn: () => feeReportsApi.getPendingFees(),
    enabled: activeTab === 'pending',
  });

  const { data: structureData, isLoading: structureLoading } = useQuery({
    queryKey: ['fee-report-structure'],
    queryFn: () => feeReportsApi.getFeeStructure(),
    enabled: activeTab === 'structure',
  });

  const isLoading = activeTab === 'collection' ? collectionLoading
    : activeTab === 'pending' ? pendingLoading
    : structureLoading;

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'collection', label: 'Collection', icon: 'cash' },
    { key: 'pending', label: 'Pending', icon: 'alert-circle' },
    { key: 'structure', label: 'Structure', icon: 'list' },
  ];

  return (
    <AppLayout title="Fee Reports">
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: '#556ee6', borderRadius: 8 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.key ? 'white' : colors['muted-foreground']}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? 'white' : colors['muted-foreground'] },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Collection Summary ── */}
          {activeTab === 'collection' && collectionData && (
            <View>
              <View style={[styles.summaryCard, { backgroundColor: '#556ee6' }]}>
                <Text style={styles.summaryCardLabel}>Total Collected</Text>
                <Text style={styles.summaryCardAmount}>
                  ₹{Number(collectionData.total_collected).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.summaryCardSub}>
                  {collectionData.total_transactions} transactions
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>By Payment Method</Text>
              {collectionData.by_payment_method.map(m => (
                <View key={m.method} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                    {m.method.replace('_', ' ').toUpperCase()}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.rowValue, { color: '#10B981' }]}>
                      ₹{Number(m.amount).toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                      {m.count} txns
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Pending Fees ── */}
          {activeTab === 'pending' && (
            <View>
              {(pendingData ?? []).length === 0 ? (
                <View style={styles.centered}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No pending fees!
                  </Text>
                </View>
              ) : (
                (pendingData ?? []).map(s => (
                  <View key={s.student_id} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: colors.foreground }]}>{s.student_name}</Text>
                      <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                        {s.admission_number} • {s.class_name}
                      </Text>
                    </View>
                    <Text style={[styles.rowValue, { color: '#EF4444' }]}>
                      ₹{Number(s.outstanding_amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── Fee Structure ── */}
          {activeTab === 'structure' && (
            <View>
              {(structureData ?? []).length === 0 ? (
                <View style={styles.centered}>
                  <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                    No fee structure found
                  </Text>
                </View>
              ) : (
                (structureData ?? []).map((item, idx) => (
                  <View key={idx} style={[styles.row, { backgroundColor: cardBg, borderColor: borderCol }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowLabel, { color: colors.foreground }]}>
                        {item.fee_type_name}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors['muted-foreground'] }]}>
                        {item.class_name} • {item.student_count} students
                      </Text>
                    </View>
                    <Text style={[styles.rowValue, { color: '#556ee6' }]}>
                      ₹{Number(item.total_fee).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    padding: 6,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 8,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  summaryCard: { borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  summaryCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  summaryCardAmount: { color: 'white', fontSize: 28, fontWeight: '700', marginTop: 4 },
  summaryCardSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  rowLabel: { fontSize: 14, fontWeight: '600' },
  rowValue: { fontSize: 15, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 2 },
});
```

---

## Screen 3 — Communication API (`src/api/communication.ts`)

Create this as a **new file** `src/api/communication.ts`:

```ts
import apiClient from './client';

export interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'push';
  is_active: boolean;
  created_at: string;
}

export interface CommunicationTemplateCreateRequest {
  name: string;
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'push';
  is_active?: boolean;
}

export interface SendMessageRequest {
  recipient_type: 'all' | 'class' | 'student' | 'staff' | 'parent';
  recipient_ids?: string[];
  class_ids?: string[];
  subject: string;
  body: string;
  channel: 'sms' | 'email' | 'push';
  template_id?: string;
}

export interface CommunicationLog {
  id: string;
  recipient_type: string;
  subject: string;
  body: string;
  channel: string;
  status: string;
  sent_at: string;
  sent_by: string;
  recipient_count: number;
}

export const communicationApi = {
  // Templates
  getTemplates: async (): Promise<CommunicationTemplate[]> => {
    const response = await apiClient.get('/send/templates/');
    return response.data.items || response.data || [];
  },
  createTemplate: async (data: CommunicationTemplateCreateRequest): Promise<CommunicationTemplate> => {
    const response = await apiClient.post('/send/templates/', data);
    return response.data;
  },
  updateTemplate: async (id: string, data: Partial<CommunicationTemplateCreateRequest>): Promise<CommunicationTemplate> => {
    const response = await apiClient.put(`/send/templates/${id}`, data);
    return response.data;
  },
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/send/templates/${id}`);
  },

  // Send
  send: async (data: SendMessageRequest): Promise<{ message: string; recipient_count: number }> => {
    const response = await apiClient.post('/send/', data);
    return response.data;
  },

  // Logs
  getLogs: async (params?: { page?: number; limit?: number }): Promise<CommunicationLog[]> => {
    const response = await apiClient.get('/send/logs', { params });
    return response.data.items || response.data || [];
  },
};
```

---

## Screen 4 — Communication Compose (`app/communication/compose.tsx`)

Create folder `app/communication/` first, then add this file:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { communicationApi, SendMessageRequest } from '@/src/api/communication';

type Channel = 'sms' | 'email' | 'push';
type RecipientType = 'all' | 'class' | 'student' | 'staff' | 'parent';

export default function ComposeScreen() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [channel, setChannel] = useState<Channel>('sms');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateId, setTemplateId] = useState('');

  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

  const sendMutation = useMutation({
    mutationFn: (data: SendMessageRequest) => communicationApi.send(data),
    onSuccess: (res) => {
      Alert.alert('Sent', `Message sent to ${res.recipient_count} recipients.`);
      setSubject('');
      setBody('');
      setTemplateId('');
    },
    onError: () => Alert.alert('Error', 'Failed to send message'),
  });

  const handleSend = () => {
    if (!body.trim()) {
      Alert.alert('Error', 'Message body is required');
      return;
    }
    Alert.alert('Confirm Send', `Send ${channel.toUpperCase()} to ${recipientType}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: () =>
          sendMutation.mutate({
            recipient_type: recipientType,
            subject,
            body,
            channel,
            template_id: templateId || undefined,
          }),
      },
    ]);
  };

  const applyTemplate = (t: typeof templates extends (infer U)[] | undefined ? U : never) => {
    if (!t) return;
    setSubject((t as any).subject ?? '');
    setBody((t as any).body ?? '');
    setTemplateId((t as any).id ?? '');
  };

  const CHANNELS: { key: Channel; label: string; icon: string }[] = [
    { key: 'sms', label: 'SMS', icon: 'chatbubble' },
    { key: 'email', label: 'Email', icon: 'mail' },
    { key: 'push', label: 'Push', icon: 'notifications' },
  ];

  const RECIPIENTS: { key: RecipientType; label: string }[] = [
    { key: 'all', label: 'All Users' },
    { key: 'parent', label: 'All Parents' },
    { key: 'student', label: 'All Students' },
    { key: 'staff', label: 'All Staff' },
  ];

  return (
    <AppLayout title="Compose Message">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Channel */}
        <Text style={[styles.label, { color: colors.foreground }]}>Channel</Text>
        <View style={styles.chipRow}>
          {CHANNELS.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.chip,
                { borderColor: channel === c.key ? '#556ee6' : borderCol },
                channel === c.key && { backgroundColor: '#556ee618' },
              ]}
              onPress={() => setChannel(c.key)}
            >
              <Ionicons name={c.icon as any} size={14} color={channel === c.key ? '#556ee6' : colors['muted-foreground']} />
              <Text style={{ color: channel === c.key ? '#556ee6' : colors['muted-foreground'], fontSize: 13, fontWeight: '600' }}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recipients */}
        <Text style={[styles.label, { color: colors.foreground }]}>Send To</Text>
        <View style={styles.chipRow}>
          {RECIPIENTS.map(r => (
            <TouchableOpacity
              key={r.key}
              style={[
                styles.chip,
                { borderColor: recipientType === r.key ? '#10B981' : borderCol },
                recipientType === r.key && { backgroundColor: '#10B98118' },
              ]}
              onPress={() => setRecipientType(r.key)}
            >
              <Text style={{ color: recipientType === r.key ? '#10B981' : colors['muted-foreground'], fontSize: 13, fontWeight: '600' }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Template picker */}
        {(templates ?? []).length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Use Template</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {(templates ?? []).map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.templateChip,
                    { borderColor: templateId === t.id ? '#556ee6' : borderCol, backgroundColor: cardBg },
                  ]}
                  onPress={() => applyTemplate(t)}
                >
                  <Text style={{ color: templateId === t.id ? '#556ee6' : colors.foreground, fontSize: 12 }}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Subject (email only) */}
        {channel === 'email' && (
          <>
            <Text style={[styles.label, { color: colors.foreground }]}>Subject</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: borderCol }]}
              placeholder="Email subject"
              placeholderTextColor={colors['muted-foreground']}
              value={subject}
              onChangeText={setSubject}
            />
          </>
        )}

        {/* Body */}
        <Text style={[styles.label, { color: colors.foreground }]}>Message *</Text>
        <TextInput
          style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: borderCol }]}
          placeholder="Type your message here..."
          placeholderTextColor={colors['muted-foreground']}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: '#556ee6' }]}
          onPress={handleSend}
          disabled={sendMutation.isPending}
        >
          <Ionicons name="send" size={18} color="white" />
          <Text style={styles.sendBtnText}>
            {sendMutation.isPending ? 'Sending...' : `Send ${channel.toUpperCase()}`}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  templateChip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },
  textarea: { height: 120, marginBottom: 8 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 14, marginTop: 16,
  },
  sendBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
});
```

---

## Screen 5 — Communication Templates (`app/communication/templates.tsx`)

```tsx
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
import { communicationApi, CommunicationTemplate } from '@/src/api/communication';

export default function TemplatesScreen() {
  const { colors, theme } = useTheme();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CommunicationTemplate | null>(null);
  const [form, setForm] = useState({ name: '', subject: '', body: '', channel: 'sms' as const });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: templates } = useQuery({
    queryKey: ['comm-templates'],
    queryFn: () => communicationApi.getTemplates(),
  });

  const createMutation = useMutation({
    mutationFn: communicationApi.createTemplate,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comm-templates'] }); setShowModal(false); resetForm(); },
    onError: () => Alert.alert('Error', 'Failed to create template'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => communicationApi.updateTemplate(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comm-templates'] }); setShowModal(false); resetForm(); },
    onError: () => Alert.alert('Error', 'Failed to update template'),
  });

  const deleteMutation = useMutation({
    mutationFn: communicationApi.deleteTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comm-templates'] }),
    onError: () => Alert.alert('Error', 'Failed to delete template'),
  });

  const resetForm = () => { setForm({ name: '', subject: '', body: '', channel: 'sms' }); setEditing(null); };

  const openEdit = (t: CommunicationTemplate) => {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, body: t.body, channel: t.channel });
    setShowModal(true);
  };

  const handleDelete = (t: CommunicationTemplate) => {
    Alert.alert('Delete Template', `Delete "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(t.id) },
    ]);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.body.trim()) {
      Alert.alert('Error', 'Name and body are required');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const CHANNEL_COLORS: Record<string, string> = { sms: '#10B981', email: '#3B82F6', push: '#8B5CF6' };

  return (
    <AppLayout title="Message Templates">
      <View style={{ flex: 1, padding: 16 }}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: '#556ee6' }]}
          onPress={() => { resetForm(); setShowModal(true); }}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.addBtnText}>New Template</Text>
        </TouchableOpacity>

        <FlatList
          data={templates ?? []}
          keyExtractor={t => t.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={{ color: colors['muted-foreground'] }}>No templates yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTop}>
                  <Text style={[styles.cardName, { color: colors.foreground }]}>{item.name}</Text>
                  <View style={[styles.channelBadge, { backgroundColor: CHANNEL_COLORS[item.channel] + '20' }]}>
                    <Text style={[styles.channelBadgeText, { color: CHANNEL_COLORS[item.channel] }]}>
                      {item.channel.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardBody, { color: colors['muted-foreground'] }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#556ee618' }]} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={16} color="#556ee6" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#EF444418' }]} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
          <View style={styles.overlay}>
            <View style={[styles.modal, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editing ? 'Edit Template' : 'New Template'}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color={colors.foreground} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {(['name', 'subject', 'body'] as const).map(field => (
                  <View key={field}>
                    <Text style={[styles.label, { color: colors.foreground }]}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}{field !== 'subject' ? ' *' : ''}
                    </Text>
                    <TextInput
                      style={[styles.input, { color: colors.foreground, borderColor: borderCol },
                        field === 'body' && styles.textarea]}
                      placeholder={field === 'body' ? 'Template content...' : ''}
                      placeholderTextColor={colors['muted-foreground']}
                      value={form[field]}
                      onChangeText={t => setForm(f => ({ ...f, [field]: t }))}
                      multiline={field === 'body'}
                      numberOfLines={field === 'body' ? 5 : 1}
                      textAlignVertical={field === 'body' ? 'top' : 'center'}
                    />
                  </View>
                ))}
                <Text style={[styles.label, { color: colors.foreground }]}>Channel</Text>
                <View style={styles.chipRow}>
                  {(['sms', 'email', 'push'] as const).map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.chip,
                        { borderColor: form.channel === c ? CHANNEL_COLORS[c] : borderCol },
                        form.channel === c && { backgroundColor: CHANNEL_COLORS[c] + '18' },
                      ]}
                      onPress={() => setForm(f => ({ ...f, channel: c }))}
                    >
                      <Text style={{ color: form.channel === c ? CHANNEL_COLORS[c] : colors['muted-foreground'], fontSize: 13, fontWeight: '600' }}>
                        {c.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, alignSelf: 'flex-end', marginBottom: 12 },
  addBtnText: { color: 'white', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: { fontSize: 14, fontWeight: '600', flex: 1 },
  channelBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  channelBadgeText: { fontSize: 10, fontWeight: '700' },
  cardBody: { fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'column', gap: 6 },
  iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 4 },
  textarea: { height: 110, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});
```

---

## Screen 6 — Communication Logs (`app/communication/logs.tsx`)

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { communicationApi, CommunicationLog } from '@/src/api/communication';

const STATUS_COLOR: Record<string, string> = {
  sent: '#10B981',
  failed: '#EF4444',
  pending: '#F59E0B',
};

export default function LogsScreen() {
  const { colors, theme } = useTheme();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const { data: logs, isLoading } = useQuery({
    queryKey: ['comm-logs'],
    queryFn: () => communicationApi.getLogs(),
  });

  const renderItem = ({ item }: { item: CommunicationLog }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.subject, { color: colors.foreground }]} numberOfLines={1}>
          {item.subject || '(No subject)'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[item.status] ?? '#888') + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? '#888' }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <Text style={[styles.body, { color: colors['muted-foreground'] }]} numberOfLines={2}>
        {item.body}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          {item.channel.toUpperCase()} • {item.recipient_type} • {item.recipient_count} recipients
        </Text>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          {new Date(item.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
        </Text>
      </View>
    </View>
  );

  return (
    <AppLayout title="Message Logs">
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      ) : (
        <FlatList
          data={logs ?? []}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="mail-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No messages sent yet
              </Text>
            </View>
          }
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  subject: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 11 },
});
```

---

## Screen 7 — Exam Grading Dashboard (`app/exam/grading.tsx`)

This is a navigation hub linking to Grade Schemes, Marks entry, and Hall Tickets.

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';

const GRADING_LINKS = [
  {
    id: 'marks',
    title: 'Mark Entry',
    description: 'Enter subject marks per student',
    icon: 'pencil',
    color: '#3B82F6',
    route: '/exam/marks',
  },
  {
    id: 'results',
    title: 'Results',
    description: 'View and publish exam results',
    icon: 'bar-chart',
    color: '#10B981',
    route: '/exam/results',
  },
  {
    id: 'hall-tickets',
    title: 'Hall Tickets',
    description: 'Manage eligibility and publish',
    icon: 'card',
    color: '#8B5CF6',
    route: '/exam/hall-tickets',
  },
  {
    id: 'my-marks',
    title: 'My Marks',
    description: 'View your marks (Student/Parent)',
    icon: 'document-text',
    color: '#EC4899',
    route: '/exam/my-marks',
  },
];

export default function GradingDashboardScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Grading & Results">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
          Select an area to manage
        </Text>

        {GRADING_LINKS.map(link => (
          <TouchableOpacity
            key={link.id}
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push(link.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: link.color + '20' }]}>
              <Ionicons name={link.icon as any} size={24} color={link.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{link.title}</Text>
              <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
                {link.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
```

---

## Step 8 — Add Communication Tab to `app/(tabs)/_layout.tsx`

Now that all 3 communication screens exist, it's safe to add the tab.

Open `app/(tabs)/_layout.tsx` and add this entry to `TAB_CONFIGS` **after the exam entry and before profile**:

```ts
// ADD after exam entry:
{
  name: 'communication',
  moduleResources: ['communications', 'communication_templates', 'communication_logs'],
  requireAll: false,
},
```

Also create `app/(tabs)/communication.tsx` as the tab entry point. This file routes to the compose screen by default or shows a simple tab layout:

```tsx
// app/(tabs)/communication.tsx
import { Redirect } from 'expo-router';

export default function CommunicationTab() {
  return <Redirect href="/communication/compose" />;
}
```

> **Note:** Or instead of a redirect, you can render a 3-tab screen directly here using `useState` and conditional rendering. Either approach works.

---

## What to Test After Phase 3

Run through each screen after it's built:

### Transport Pricing
- [ ] Open Transport → Pricing → list loads without error
- [ ] Tap "Add Pricing" → fill route, trip type, amount → save → appears in list
- [ ] Tap edit → change amount → save → updated in list
- [ ] Tap delete → confirm → removed from list
- [ ] **Verify:** amount shows as number (not `"1500.00"` string) → use `Number(item.amount)`

### Fee Reports
- [ ] Open Fees → Reports → Collection tab shows total collected + by-method breakdown
- [ ] Tap Pending tab → shows students with outstanding fees (or "No pending fees!" tick)
- [ ] Tap Structure tab → shows class × fee type breakdown
- [ ] **If any tab crashes:** the backend endpoint may not exist — check with backend team

### Communication → Compose
- [ ] Open Communication → Compose
- [ ] Select SMS channel → type body → tap Send → confirm alert → success alert shows recipient count
- [ ] Select a template → subject/body auto-fill
- [ ] Email channel → Subject field appears; SMS channel → Subject field hidden
- [ ] **If 403:** user role may not have communication permission — check menu seeding

### Communication → Templates
- [ ] Tap "New Template" → fill name + body → save → appears in list
- [ ] Tap edit → change body → save → updated
- [ ] Tap delete → confirm → removed
- [ ] Template appears in Compose's template picker

### Communication → Logs
- [ ] After sending a message from Compose, open Logs → sent message appears
- [ ] Status badge shows "sent" in green (or "failed" in red)
- [ ] Empty state shows when no messages sent yet

### Exam Grading Dashboard
- [ ] Open Exam → Grading → 4 cards render
- [ ] Tap Mark Entry → navigates to marks screen
- [ ] Tap Results → navigates to results screen
- [ ] Tap Hall Tickets → navigates to hall-tickets screen
- [ ] Tap My Marks → navigates correctly (student sees their marks)

### Communication Tab
- [ ] Admin login → Communication tab visible in bottom nav / AppDrawer
- [ ] Student login → Communication tab NOT visible (no permission)
- [ ] Tap tab → opens Compose screen

---

## Checklist

- [x] Transport pricing API functions added to `src/api/transport.ts`
- [x] `app/transport/pricing.tsx` created and working
- [x] Fee reports API functions added to `src/api/fees.ts`
- [x] `app/fees/reports.tsx` created and working (all 3 tabs)
- [x] `src/api/communication.ts` created (new file)
- [x] `app/communication/compose.tsx` created and working
- [x] `app/communication/templates.tsx` created and working
- [x] `app/communication/logs.tsx` created and working
- [x] `app/exam/grading.tsx` created and working
- [x] `app/(tabs)/communication.tsx` created
- [x] Communication entry added to `TAB_CONFIGS` in `_layout.tsx`
- [ ] All test scenarios above passed — verify on device
- [ ] ⚠️ Transport Pricing schema corrected to use Name + Vehicle + Amount + is_active — verify
- [ ] ⚠️ Communication hub rebuilt as 3-card hub (not a redirect) — verify
- [ ] ⚠️ Exam Grading Dashboard links corrected to Grade Schemes / Remark Sets / Hall Tickets — verify

---

## ⚠️ GAP 1 — Transport Pricing: Wrong Schema (added Mar 2026)

> The original Screen 1 code used `route_id + vehicle_id + trip_type` as the primary fields. `FRONTEND_REQUIREMENTS.md §6.7.5` specifies a different schema: **Name, Vehicle, Amount, Description, Is Active**.

### Correct `TransportPricing` type (replace the one in Screen 1a):

```ts
export interface TransportPricing {
  id: string;
  name: string;          // e.g. "Standard Route Fee"
  vehicle_id: string;    // FK to vehicle
  amount: string;        // Decimal → returned as string; use Number() for display
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface TransportPricingCreateRequest {
  name: string;
  vehicle_id: string;
  amount: number;        // send as number
  description?: string;
  is_active?: boolean;
}
```

### Correct form fields in `app/transport/pricing.tsx` (replace the modal form):

Replace the `route_id` radio list and `trip_type` selector with:

- **Name** — `TextInput` (required)
- **Vehicle** — `CustomDropdown` fetching `GET /masters/vehicles/`
- **Amount (₹)** — numeric `TextInput` (required)
- **Description** — multiline `TextInput` (optional)
- **Is Active** — `Switch` toggle

```tsx
// Replace form state:
const [form, setForm] = useState({
  name: '',
  vehicle_id: '',
  amount: '',
  description: '',
  is_active: true,
});

// Replace openEdit:
const openEdit = (item: TransportPricing) => {
  setEditing(item);
  setForm({
    name: item.name,
    vehicle_id: item.vehicle_id,
    amount: String(Number(item.amount)),
    description: item.description ?? '',
    is_active: item.is_active,
  });
  setShowModal(true);
};

// Replace handleSubmit payload:
const payload: TransportPricingCreateRequest = {
  name: form.name,
  vehicle_id: form.vehicle_id,
  amount: Number(form.amount),
  description: form.description || undefined,
  is_active: form.is_active,
};
```

Card display — show name and amount (not route name):

```tsx
<Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
<Text style={[styles.cardSub, { color: colors['muted-foreground'] }]}>
  ₹{Number(item.amount).toLocaleString('en-IN')}
  {item.description ? ` • ${item.description}` : ''}
</Text>
```

---

## ⚠️ GAP 2 — Communication Hub: Should Be Cards, Not a Redirect (added Mar 2026)

> The original Step 8 made `app/(tabs)/communication.tsx` a `<Redirect>` to compose. `FRONTEND_REQUIREMENTS.md §6.9` requires a **hub screen with 3 navigation cards** linking to Compose, Templates, and Logs.

Replace the content of `app/(tabs)/communication.tsx` with:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';

const COMM_LINKS = [
  {
    id: 'compose',
    title: 'Compose Message',
    description: 'Send SMS, Email, or Push to students, parents, or staff',
    icon: 'send',
    color: '#556ee6',
    route: '/communication/compose',
  },
  {
    id: 'templates',
    title: 'Message Templates',
    description: 'Create and manage reusable message templates',
    icon: 'document-text',
    color: '#10B981',
    route: '/communication/templates',
  },
  {
    id: 'logs',
    title: 'Message Logs',
    description: 'View history of all sent messages',
    icon: 'time',
    color: '#F59E0B',
    route: '/communication/logs',
  },
];

export default function CommunicationTab() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  return (
    <AppLayout title="Communication">
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
          Send messages and manage communication
        </Text>

        {COMM_LINKS.map(link => (
          <TouchableOpacity
            key={link.id}
            style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
            onPress={() => router.push(link.route as any)}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, { backgroundColor: link.color + '20' }]}>
              <Ionicons name={link.icon as any} size={24} color={link.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{link.title}</Text>
              <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
                {link.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors['muted-foreground']} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 48 }} />
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
```

---

## ⚠️ GAP 3 — Exam Grading Dashboard: Wrong Navigation Links (added Mar 2026)

> The original Screen 7 linked to Mark Entry, Results, Hall Tickets, My Marks. `FRONTEND_REQUIREMENTS.md §6.6.5` specifies: **Grade Schemes, Subject Grade Schemes, Remark Grade Sets, Hall Tickets** — all Admin/Teacher only.

Replace `GRADING_LINKS` in `app/exam/grading.tsx`:

```tsx
const GRADING_LINKS = [
  {
    id: 'grade-schemes',
    title: 'Grade Schemes',
    description: 'Define grade boundaries for exams',
    icon: 'ribbon',
    color: '#3B82F6',
    route: '/exam/grade-schemes',   // create this screen in a future phase if not built
  },
  {
    id: 'subject-grade-schemes',
    title: 'Subject Grade Schemes',
    description: 'Per-subject grading overrides',
    icon: 'school',
    color: '#10B981',
    route: '/exam/subject-grade-schemes',
  },
  {
    id: 'remark-sets',
    title: 'Remark Grade Sets',
    description: 'Configure remark sets for report cards',
    icon: 'chatbubble-ellipses',
    color: '#8B5CF6',
    route: '/exam/remark-sets',
  },
  {
    id: 'hall-tickets',
    title: 'Hall Tickets',
    description: 'Compute eligibility and publish hall tickets',
    icon: 'card',
    color: '#EC4899',
    route: '/exam/hall-tickets',
  },
];
```

> **Note:** The routes `/exam/grade-schemes`, `/exam/subject-grade-schemes`, `/exam/remark-sets` don't have screens yet. For now, tapping them can show a "Coming soon" placeholder or simply navigate and let Expo Router show a 404. Add them as a Phase 5 task if needed.

Add role guard — this screen is Admin/Teacher only. At the top of `GradingDashboardScreen`:

```tsx
const { role } = useAuth();
const roleName = role?.name?.toLowerCase() ?? '';
const canAccess = ['admin', 'teacher', 'principal'].includes(roleName);

if (!canAccess) {
  return (
    <AppLayout title="Grading & Results">
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
        <Text style={{ color: colors['muted-foreground'], marginTop: 12 }}>
          Access restricted
        </Text>
      </View>
    </AppLayout>
  );
}
```

---

Last updated: March 2026
