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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import {
  useCreateExpenseTypeProtected,
  useDeleteExpenseTypeProtected,
  useExpenseCategoryDropdownProtected,
  useExpenseTypesProtected,
  useUpdateExpenseTypeProtected,
} from '@/hooks/use-expense-protected';
import type { ExpenseType } from '@/src/types/expense';
import { ScreenAccessGate } from '@/components/ScreenAccessGate';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

const ORANGE = '#F97316';

function ExpenseTypesScreenContent() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { hasPermission } = useMobilePermission();
  const canCreate = hasPermission('expense_types', 'create');
  const canUpdate = hasPermission('expense_types', 'update');
  const canDelete = hasPermission('expense_types', 'delete');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseType | null>(null);
  const [form, setForm] = useState({ name: '', category_id: '', description: '', is_active: true });
  const { confirm, modalProps } = useConfirmModal();
  const [refreshing, setRefreshing] = useState(false);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const filterBg = theme === 'dark' ? '#13132b' : '#f8fafc';

  // Filter by category server-side (matches the web app), so it refetches per category
  const { data: raw, isLoading, refetch } = useExpenseTypesProtected({ category_id: categoryFilter || undefined });
  const { data: categoriesDropdown = [] } = useExpenseCategoryDropdownProtected();
  const createMutation = useCreateExpenseTypeProtected();
  const updateMutation = useUpdateExpenseTypeProtected();
  const deleteMutation = useDeleteExpenseTypeProtected();

  // Build category name lookup map
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    (categoriesDropdown as any[]).forEach((c: any) => { map[c.id] = c.name; });
    return map;
  }, [categoriesDropdown]);

  const categoryOptions = useMemo(() => [
    { label: 'All Categories', value: '' },
    ...(categoriesDropdown as any[]).map((c: any) => ({ label: c.name || '', value: c.id })),
  ], [categoriesDropdown]);

  const types: ExpenseType[] = useMemo(() => {
    const all: ExpenseType[] = Array.isArray(raw) ? raw : (raw as any)?.items ?? [];
    // Category filtering is done server-side; only the text search runs here.
    return all.filter(t => {
      const matchesSearch = !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [raw, search]);

  const resetForm = () => { setForm({ name: '', category_id: '', description: '', is_active: true }); setEditing(null); };

  const openEdit = (item: ExpenseType) => {
    setEditing(item);
    setForm({ name: item.name, category_id: item.category_id, description: item.description ?? '', is_active: item.is_active });
    setShowModal(true);
  };

  const handleDelete = (item: ExpenseType) => {
    confirm({
      title: 'Delete Type',
      message: `Delete "${item.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () =>
        deleteMutation.mutate(item.id, {
          onSuccess: () => showSuccess('Deleted', `"${item.name}" has been deleted.`),
          onError: () => showError('Delete Failed', 'Could not delete expense type.'),
        }),
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { showError('Error', 'Name is required'); return; }
    if (!form.category_id) { showError('Error', 'Category is required'); return; }
    const opts = {
      onSuccess: () => {
        setShowModal(false);
        resetForm();
        showSuccess(editing ? 'Type Updated' : 'Type Created', `"${form.name}" has been saved.`);
      },
      onError: () => showError('Save Failed', `Could not ${editing ? 'update' : 'create'} expense type.`),
    };
    editing
      ? updateMutation.mutate({ id: editing.id, data: form }, opts)
      : createMutation.mutate(form, opts);
  };

  return (
    <AppLayout title="Expense Types">
      {/* Filters: search + category, stacked full-width so nothing wraps/overlaps on narrow screens */}
      <View style={[styles.filtersSection, { backgroundColor: filterBg, borderColor: borderCol }]}>
        <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Ionicons name="search-outline" size={14} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search types..."
            placeholderTextColor={colors['muted-foreground']}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <CustomDropdown
          data={categoryOptions}
          value={categoryFilter}
          onChange={(v: any) => setCategoryFilter(v?.toString() ?? '')}
          placeholder="All Categories"
          containerStyle={{ marginBottom: 0 }}
          style={{
            height: 44,
            paddingHorizontal: 10,
            paddingVertical: 0,
            borderRadius: 10,
            backgroundColor: inputBg,
            borderColor: borderCol,
          }}
          placeholderStyle={{ fontSize: 13 }}
          selectedTextStyle={{ fontSize: 13 }}
          iconStyle={{ width: 16, height: 16 }}
        />
      </View>

      {/* New Type button, right-aligned in its own row */}
      {canCreate && (
        <View style={styles.newBtnRow}>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: '#556ee6' }]}
            onPress={() => { resetForm(); setShowModal(true); }}
          >
            <Ionicons name="add" size={15} color="white" />
            <Text style={styles.newBtnText}>New Type</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cards */}
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
        ) : types.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="pricetag-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[{ color: colors['muted-foreground'], marginTop: 12, fontSize: 14 }]}>No types found</Text>
          </View>
        ) : types.map((item) => (
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
              <View style={styles.cardMeta}>
                <Ionicons name="folder-outline" size={13} color={colors['muted-foreground']} />
                <Text style={[styles.cardMetaText, { color: colors['muted-foreground'] }]}>{categoryMap[item.category_id] ?? '—'}</Text>
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
                    <TouchableOpacity style={styles.cardAction} onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={15} color={colors['muted-foreground']} />
                      <Text style={[styles.cardActionText, { color: colors['muted-foreground'] }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  {canDelete && (
                    <TouchableOpacity style={styles.cardAction} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      <Text style={[styles.cardActionText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalTop}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? 'Edit Expense Type' : 'Create Expense Type'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: colors['muted-foreground'] }]}>
              Expense types must be linked to categories for proper classification
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                placeholder="Enter type name"
                placeholderTextColor={colors['muted-foreground']}
                value={form.name}
                onChangeText={t => setForm(f => ({ ...f, name: t }))}
              />
              <Text style={[styles.label, { color: colors.foreground }]}>Category *</Text>
              <CustomDropdown
                data={(categoriesDropdown as any[]).map((c: any) => ({ label: c.name || '', value: c.id }))}
                value={form.category_id}
                onChange={(v: any) => setForm(f => ({ ...f, category_id: v?.toString() ?? '' }))}
                placeholder="Select category"
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
        </KeyboardAvoidingView>
      </Modal>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  filtersSection: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, padding: 14, gap: 10,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  newBtnRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, alignItems: 'flex-end' },
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
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  cardMetaText: { fontSize: 12 },
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
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 11, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  submitBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
});


// Screen-level access control - see docs/USER_ROLES_WORKFLOW.md.
export default function ExpenseTypesScreen() {
  return (
    <ScreenAccessGate
      title="Expense Types"
      resources={['expense_types']}
    >
      <ExpenseTypesScreenContent />
    </ScreenAccessGate>
  );
}
