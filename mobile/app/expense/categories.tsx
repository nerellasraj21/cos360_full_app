import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
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
  useCreateExpenseCategoryProtected,
  useDeleteExpenseCategoryProtected,
  useExpenseCategoriesProtected,
  useUpdateExpenseCategoryProtected,
} from '@/hooks/use-expense-protected';
import type { ExpenseCategory } from '@/src/types/expense';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';

const ORANGE = '#F97316';

function ExpenseCategoriesScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const { confirm, modalProps } = useConfirmModal();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: raw, isLoading } = useExpenseCategoriesProtected();
  const createMutation = useCreateExpenseCategoryProtected();
  const updateMutation = useUpdateExpenseCategoryProtected();
  const deleteMutation = useDeleteExpenseCategoryProtected();

  const categories: ExpenseCategory[] = useMemo(() => {
    const all: ExpenseCategory[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q)
    );
  }, [raw, search]);

  const resetForm = () => { setForm({ name: '', description: '', is_active: true }); setEditing(null); };

  const openEdit = (item: ExpenseCategory) => {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? '', is_active: item.is_active });
    setShowModal(true);
  };

  const handleDelete = (item: ExpenseCategory) => {
    confirm({
      title: 'Delete Category',
      message: `Delete "${item.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () =>
        deleteMutation.mutate(item.id, {
          onSuccess: () => showSuccess('Deleted', `"${item.name}" has been deleted.`),
          onError: () => showError('Delete Failed', 'Could not delete category.'),
        }),
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { showError('Error', 'Name is required'); return; }
    const opts = {
      onSuccess: () => {
        setShowModal(false);
        resetForm();
        showSuccess(editing ? 'Category Updated' : 'Category Created', `"${form.name}" has been saved.`);
      },
      onError: () => showError('Save Failed', `Could not ${editing ? 'update' : 'create'} category.`),
    };
    editing
      ? updateMutation.mutate({ id: editing.id, data: form }, opts)
      : createMutation.mutate(form, opts);
  };

  return (
    <AppLayout title="Expense Categories">
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Ionicons name="search-outline" size={14} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search categories..."
            placeholderTextColor={colors['muted-foreground']}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: '#556ee6' }]}
          onPress={() => { resetForm(); setShowModal(true); }}
        >
          <Ionicons name="add" size={15} color="white" />
          <Text style={styles.newBtnText}>New Category</Text>
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centered}><ActivityIndicator color={ORANGE} /></View>
        ) : categories.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="folder-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[{ color: colors['muted-foreground'], marginTop: 12, fontSize: 14 }]}>No categories found</Text>
          </View>
        ) : categories.map((item) => (
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
              <View style={[styles.cardFooter, { borderTopColor: borderCol }]}>
                <TouchableOpacity style={styles.cardAction} onPress={() => openEdit(item)}>
                  <Ionicons name="create-outline" size={15} color={colors['muted-foreground']} />
                  <Text style={[styles.cardActionText, { color: colors['muted-foreground'] }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardAction} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={[styles.cardActionText, { color: '#EF4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalTop}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? 'Edit Category' : 'New Category'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter category name"
                placeholderTextColor={colors['muted-foreground']}
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
              />
              <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter description (optional)"
                placeholderTextColor={colors['muted-foreground']}
                value={form.description}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <View style={styles.switchRow}>
                <Text style={[styles.label, { color: colors.foreground, marginBottom: 0 }]}>Active</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={v => setForm(f => ({ ...f, is_active: v }))}
                  trackColor={{ false: '#d1d5db', true: '#556ee6' }}
                  thumbColor="white"
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
                style={[styles.submitBtn, { backgroundColor: '#556ee6' }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
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
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  cardActionText: { fontSize: 13, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ExpenseCategoriesScreen() {
  return (
    <ScreenAccessGate
      title="Expense Categories"
      resources={['expense_categories']}
    >
      <ExpenseCategoriesScreenContent />
    </ScreenAccessGate>
  );
}
