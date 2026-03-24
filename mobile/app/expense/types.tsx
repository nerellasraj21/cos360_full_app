import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const ORANGE = '#F97316';

export default function ExpenseTypesScreen() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ExpenseType | null>(null);
  const [form, setForm] = useState({ name: '', category_id: '', description: '', is_active: true });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';
  const headerBg = theme === 'dark' ? '#13132b' : '#f8fafc';

  const { data: raw, isLoading } = useExpenseTypesProtected();
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
    return all.filter(t => {
      const matchesCat = !categoryFilter || t.category_id === categoryFilter;
      const matchesSearch = !search.trim() ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description ?? '').toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [raw, search, categoryFilter]);

  const resetForm = () => { setForm({ name: '', category_id: '', description: '', is_active: true }); setEditing(null); };

  const openEdit = (item: ExpenseType) => {
    setEditing(item);
    setForm({ name: item.name, category_id: item.category_id, description: item.description ?? '', is_active: item.is_active });
    setShowModal(true);
  };

  const handleDelete = (item: ExpenseType) => {
    Alert.alert('Delete Type', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () =>
          deleteMutation.mutate(item.id, {
            onSuccess: () => showSuccess('Deleted', `"${item.name}" has been deleted.`),
            onError: () => showError('Delete Failed', 'Could not delete expense type.'),
          }),
      },
    ]);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    if (!form.category_id) { Alert.alert('Error', 'Category is required'); return; }
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
      {/* Top bar: search + category filter + new button */}
      <View style={styles.topBar}>
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
        <View style={styles.filterDropdown}>
          <CustomDropdown
            data={categoryOptions}
            value={categoryFilter}
            onChange={(v: any) => setCategoryFilter(v?.toString() ?? '')}
            placeholder="Filter by category"
          />
        </View>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: '#556ee6' }]}
          onPress={() => { resetForm(); setShowModal(true); }}
        >
          <Ionicons name="add" size={15} color="white" />
          <Text style={styles.newBtnText}>New Type</Text>
        </TouchableOpacity>
      </View>

      {/* Table */}
      <View style={[styles.tableCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: 620 }}>
            {/* Header */}
            <View style={[styles.row, { backgroundColor: headerBg, borderBottomColor: borderCol }]}>
              <Text style={[styles.c0, styles.hCell, { color: colors['muted-foreground'] }]}>S.No.</Text>
              <Text style={[styles.c1, styles.hCell, { color: colors['muted-foreground'] }]}>Name</Text>
              <Text style={[styles.c2, styles.hCell, { color: colors['muted-foreground'] }]}>Category</Text>
              <Text style={[styles.c3, styles.hCell, { color: colors['muted-foreground'] }]}>Description</Text>
              <Text style={[styles.c4, styles.hCell, { color: colors['muted-foreground'] }]}>Status</Text>
              <Text style={[styles.c5, styles.hCell, { color: colors['muted-foreground'] }]}>Created</Text>
              <Text style={[styles.c6, styles.hCell, { color: colors['muted-foreground'] }]}>Actions</Text>
            </View>

            {/* Body */}
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {isLoading ? (
                <View style={styles.centered}><ActivityIndicator color={ORANGE} /></View>
              ) : types.length === 0 ? (
                <View style={styles.centered}>
                  <Ionicons name="pricetag-outline" size={36} color={colors['muted-foreground']} />
                  <Text style={[{ color: colors['muted-foreground'], marginTop: 8, fontSize: 13 }]}>
                    No types found
                  </Text>
                </View>
              ) : (
                types.map((item, index) => (
                  <View key={item.id} style={[styles.row, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.c0, { color: colors['muted-foreground'], fontSize: 12 }]}>{index + 1}</Text>
                    <Text style={[styles.c1, { color: colors.foreground, fontWeight: '600', fontSize: 13 }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.c2, { color: colors['muted-foreground'], fontSize: 12 }]} numberOfLines={1}>
                      {categoryMap[item.category_id] ?? '—'}
                    </Text>
                    <Text style={[styles.c3, { color: colors['muted-foreground'], fontSize: 12 }]} numberOfLines={1}>
                      {item.description || '—'}
                    </Text>
                    <View style={styles.c4}>
                      <View style={[styles.badge, { backgroundColor: item.is_active ? '#10B98120' : '#6b728020' }]}>
                        <Text style={[styles.badgeText, { color: item.is_active ? '#10B981' : '#6b7280' }]}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.c5, { color: colors['muted-foreground'], fontSize: 11 }]}>
                      {new Date(item.created_at).toLocaleDateString('en-US')}
                    </Text>
                    <View style={[styles.c6, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}>
                      <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                        <Ionicons name="create-outline" size={17} color={colors['muted-foreground']} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={styles.modalTop}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editing ? 'Edit Type' : 'New Type'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                    : editing ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, height: 38,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  filterDropdown: { width: 140 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  newBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  tableCard: {
    flex: 1, marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, borderWidth: 1, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  hCell: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  c0: { width: 36 },
  c1: { width: 120 },
  c2: { width: 100 },
  c3: { width: 110 },
  c4: { width: 74 },
  c5: { width: 84 },
  c6: { width: 56 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
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
