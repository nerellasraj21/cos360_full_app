import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useTheme } from '@/contexts';
import {
  useCreateExpenseDepartmentProtected,
  useDeleteExpenseDepartmentProtected,
  useExpenseDepartmentsProtected,
  useUpdateExpenseDepartmentProtected,
} from '@/hooks/use-expense-protected';
import type { ExpenseDepartment } from '@/src/types/expense';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const ORANGE = '#F97316';

const errorMessage = (error: unknown, fallback: string) => {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (typeof detail?.message === 'string') return detail.message;
  return fallback;
};

function ExpenseDepartmentsScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { hasPermission } = useMobilePermission();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseDepartment | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const { confirm, modalProps } = useConfirmModal();
  const [refreshing, setRefreshing] = useState(false);

  const canCreate = hasPermission('expense_departments', 'create');
  const canUpdate = hasPermission('expense_departments', 'update');
  const canDelete = hasPermission('expense_departments', 'delete');

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: raw, isLoading, refetch } = useExpenseDepartmentsProtected();
  const createMutation = useCreateExpenseDepartmentProtected();
  const updateMutation = useUpdateExpenseDepartmentProtected();
  const deleteMutation = useDeleteExpenseDepartmentProtected();

  const departments: ExpenseDepartment[] = useMemo(() => {
    const all: ExpenseDepartment[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
    );
  }, [raw, search]);

  const resetForm = () => { setForm({ name: '', description: '' }); setEditing(null); };

  const openEdit = (item: ExpenseDepartment) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? '' });
    setShowModal(true);
  };

  const handleDeactivate = (item: ExpenseDepartment) => {
    confirm({
      title: 'Deactivate Department',
      message: `Deactivate "${item.name}"? It will no longer be offered for new expenses.`,
      confirmLabel: 'Deactivate',
      destructive: true,
      onConfirm: () =>
        deleteMutation.mutate(item.id, {
          onSuccess: () => showSuccess('Deactivated', `"${item.name}" has been deactivated.`),
          onError: (error) => showError('Deactivate Failed', errorMessage(error, 'Could not deactivate department.')),
        }),
    });
  };

  const handleSubmit = () => {
    const name = form.name.trim();
    if (!name) { showError('Error', 'Name is required'); return; }
    const opts = {
      onSuccess: () => {
        setShowModal(false);
        resetForm();
        showSuccess(editing ? 'Department Updated' : 'Department Created', `"${name}" has been saved.`);
      },
      onError: (error: unknown) =>
        showError('Save Failed', errorMessage(error, `Could not ${editing ? 'update' : 'create'} department.`)),
    };
    const description = form.description.trim();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: { name, description } }, opts);
    } else {
      createMutation.mutate(description ? { name, description } : { name }, opts);
    }
  };

  return (
    <AppLayout title="Expense Departments">
      <View style={styles.topBar}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Ionicons name="search-outline" size={14} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search departments..."
            placeholderTextColor={colors['muted-foreground']}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {canCreate && (
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: '#556ee6' }]}
            onPress={() => { resetForm(); setShowModal(true); }}
          >
            <Ionicons name="add" size={15} color="white" />
            <Text style={styles.newBtnText}>New Department</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={ORANGE}
            onRefresh={async () => {
              setRefreshing(true);
              try { await refetch(); } finally { setRefreshing(false); }
            }}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={ORANGE} /></View>
        ) : departments.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="business-outline" size={48} color={colors['muted-foreground']} />
            <Text style={{ color: colors['muted-foreground'], marginTop: 12, fontSize: 14 }}>
              {search ? 'No departments match your search' : 'No departments found'}
            </Text>
          </View>
        ) : departments.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.cardAccent, { backgroundColor: ORANGE }]} />
            <View style={{ flex: 1, padding: 12 }}>
              <View style={styles.cardTop}>
                <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.badge, { backgroundColor: item.is_active ? '#10B98120' : '#6b728020' }]}>
                  <Text style={[styles.badgeText, { color: item.is_active ? '#10B981' : '#6b7280' }]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              {item.description ? (
                <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={[styles.cardDate, { color: colors['muted-foreground'] }]}>
                Created {new Date(item.created_at).toLocaleDateString('en-US')}
              </Text>
              {(canUpdate || canDelete) && (
                <View style={[styles.cardFooter, { borderTopColor: borderCol }]}>
                  {canUpdate && (
                    <TouchableOpacity style={styles.cardAction} onPress={() => openEdit(item)} accessibilityLabel="Edit">
                      <Ionicons name="create-outline" size={15} color={colors['muted-foreground']} />
                      <Text style={[styles.cardActionText, { color: colors['muted-foreground'] }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete && item.is_active && (
                    <TouchableOpacity style={styles.cardAction} onPress={() => handleDeactivate(item)} accessibilityLabel="Deactivate">
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      <Text style={[styles.cardActionText, { color: '#EF4444' }]}>Deactivate</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalTop}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? 'Edit Department' : 'New Department'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter department name"
                placeholderTextColor={colors['muted-foreground']}
                value={form.name}
                maxLength={100}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
              />
              <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter description (optional)"
                placeholderTextColor={colors['muted-foreground']}
                value={form.description}
                maxLength={300}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: borderCol }]}
                onPress={() => setShowModal(false)}
              >
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
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
  },
  newBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  listContent: { padding: 12 },
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, marginBottom: 4 },
  cardDate: { fontSize: 11, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', gap: 4, paddingTop: 8, borderTopWidth: 1, marginTop: 4 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '90%' },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  submitBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});

export default function ExpenseDepartmentsScreen() {
  return (
    <ScreenAccessGate
      title="Expense Departments"
      resources={['expense_departments']}
      blockRoles={['student']}
    >
      <ExpenseDepartmentsScreenContent />
    </ScreenAccessGate>
  );
}
