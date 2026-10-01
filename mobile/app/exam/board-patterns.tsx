import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
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
import { CustomDropdown, DropdownOption } from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import {
  BoardPattern, BoardPatternCreate, BoardPatternExamTypeCreate,
  ExamBoard, ExamLevel, ExamNature, boardPatternsApi,
} from '@/src/api/exam';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { isAdminRole } from '@/src/lib/roles';

// Web parity: web's board pattern authorization is granted under the "exams"
// resource, not a separate "board_patterns" resource — see BoardPatternSetup.tsx.
const RESOURCE = 'exams';

const BOARD_OPTIONS: DropdownOption[] = [
  { value: 'CBSE',   label: 'CBSE' },
  { value: 'ICSE',   label: 'ICSE' },
  { value: 'State',  label: 'State' },
  { value: 'BTech',  label: 'BTech' },
  { value: 'Custom', label: 'Custom' },
];

const LEVEL_OPTIONS: DropdownOption[] = [
  { value: 'pre_primary',   label: 'Pre-Primary' },
  { value: 'primary',       label: 'Primary' },
  { value: 'upper_primary', label: 'Upper Primary' },
  { value: 'secondary',     label: 'Secondary' },
  { value: 'inter',         label: 'Intermediate' },
  { value: 'diploma',       label: 'Diploma' },
  { value: 'btech',         label: 'BTech' },
  { value: 'mtech',         label: 'MTech' },
  { value: 'iit',           label: 'IIT' },
  { value: 'others',        label: 'Others' },
];

const NATURE_OPTIONS: DropdownOption[] = [
  { value: 'formative',  label: 'Formative' },
  { value: 'summative',  label: 'Summative' },
  { value: 'cumulative', label: 'Cumulative' },
  { value: 'custom',     label: 'Custom' },
];

const EMPTY_TYPE: BoardPatternExamTypeCreate = { exam_type_name: '', nature: 'formative', weightage_percent: null, count_per_year: null, sort_order: 0 };
const EMPTY_FORM: BoardPatternCreate = { board: 'CBSE', level: 'primary', exam_types: [{ ...EMPTY_TYPE }] };

const levelLabel = (value: string) => LEVEL_OPTIONS.find(l => l.value === value)?.label ?? value;

export default function BoardPatternsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  // Web parity (BoardPatternSetup.tsx): board pattern management is admin-only.
  const isAdmin = isAdminRole(role?.name);
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/exam/list');
    }
  }, [isAdmin, router]);

  const { confirm, modalProps } = useConfirmModal();
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<BoardPattern | null>(null);
  const [form, setForm] = useState<BoardPatternCreate>({ ...EMPTY_FORM });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const canCreate = hasPermission?.(RESOURCE, 'create');
  const canUpdate = hasPermission?.(RESOURCE, 'update');
  const canDelete = hasPermission?.(RESOURCE, 'delete');

  const { data: patterns = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['board-patterns'],
    queryFn: () => boardPatternsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: BoardPatternCreate) => boardPatternsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-patterns'] }); closeModal(); showSuccess('Created', 'Board pattern created.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to create pattern.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BoardPatternCreate }) => boardPatternsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-patterns'] }); closeModal(); showSuccess('Updated', 'Pattern updated.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to update pattern.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardPatternsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-patterns'] }); showSuccess('Deleted', 'Pattern deleted.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to delete pattern.')),
  });

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY_FORM, exam_types: [{ ...EMPTY_TYPE }] }); setModalVisible(true); };
  const openEdit = (item: BoardPattern) => {
    setEditItem(item);
    setForm({
      board: item.board,
      custom_board_name: item.custom_board_name ?? undefined,
      level: item.level,
      exam_types: item.exam_types.map(et => ({
        exam_type_name: et.exam_type_name,
        nature: et.nature,
        weightage_percent: et.weightage_percent,
        count_per_year: et.count_per_year,
        sort_order: et.sort_order,
      })),
    });
    setModalVisible(true);
  };
  const closeModal = () => { setModalVisible(false); setEditItem(null); };

  const handleSave = () => {
    if (form.exam_types.filter(t => t.exam_type_name.trim()).length === 0) {
      showError('Validation', 'At least one exam type is required.');
      return;
    }
    const payload: BoardPatternCreate = { ...form, exam_types: form.exam_types.filter(t => t.exam_type_name.trim()) };
    if (editItem) updateMutation.mutate({ id: editItem.id, data: payload });
    else createMutation.mutate(payload);
  };

  const handleDelete = (item: BoardPattern) => {
    const name = item.board === 'Custom' ? (item.custom_board_name ?? 'Custom') : item.board;
    confirm({
      title: 'Delete Pattern',
      message: `Delete "${name}" (${levelLabel(item.level)})?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const updateType = (idx: number, field: keyof BoardPatternExamTypeCreate, value: any) => {
    setForm(f => ({ ...f, exam_types: f.exam_types.map((t, i) => i === idx ? { ...t, [field]: value } : t) }));
  };
  const addType = () => setForm(f => ({ ...f, exam_types: [...f.exam_types, { ...EMPTY_TYPE, sort_order: f.exam_types.length }] }));
  const removeType = (idx: number) => setForm(f => ({ ...f, exam_types: f.exam_types.filter((_, i) => i !== idx) }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Non-admins are redirected by the effect above; render nothing meanwhile.
  if (!isAdmin) return null;

  return (
    <AppLayout title="Board Patterns">
      {canCreate && (
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add-circle" size={18} color="white" />
          <Text style={styles.addBtnText}>New Pattern</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        {isLoading ? (
          <View style={styles.emptyView}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : patterns.length === 0 ? (
          <View style={styles.emptyView}>
            <Ionicons name="library-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>No board patterns yet</Text>
          </View>
        ) : (
          patterns.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
              onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: item.is_active ? '#556ee620' : '#6B728020' }]}>
                  <Ionicons name="library" size={22} color={item.is_active ? '#556ee6' : '#6B7280'} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <Ionicons
                      name={expandedId === item.id ? 'chevron-down' : 'chevron-forward'}
                      size={14}
                      color={colors['muted-foreground']}
                    />
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                      {(item.board === 'Custom' ? item.custom_board_name : item.board) || 'Custom'}
                    </Text>
                  </View>
                  <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>
                    {levelLabel(item.level)} · {item.exam_types.length} type{item.exam_types.length !== 1 ? 's' : ''}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B98120' : '#EF444420' }]}>
                    <Text style={{ color: item.is_active ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
                      {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  {canUpdate && (
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} accessibilityLabel="Edit">
                      <Ionicons name="create-outline" size={18} color="#556ee6" />
                    </TouchableOpacity>
                  )}
                  {canDelete && (
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn} accessibilityLabel="Delete">
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {expandedId === item.id && item.exam_types.length > 0 && (
                <View style={[styles.typesTable, { borderColor: borderCol }]}>
                  {item.exam_types.map(et => (
                    <View key={et.id} style={[styles.typeRow, { borderColor: borderCol }]}>
                      <Text style={[styles.typeName, { color: colors.foreground }]}>{et.exam_type_name}</Text>
                      <Text style={[styles.typeMeta, { color: colors['muted-foreground'] }]}>
                        {et.nature} · {et.weightage_percent ?? '—'}% · {et.count_per_year ?? '—'}/yr
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editItem ? 'Edit Board Pattern' : 'New Board Pattern'}
              </Text>
              <TouchableOpacity onPress={closeModal} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.foreground }]}>Board</Text>
              <CustomDropdown
                data={BOARD_OPTIONS}
                value={form.board}
                onChange={v => setForm(f => ({ ...f, board: (v as ExamBoard) ?? 'CBSE' }))}
                placeholder="Select board"
                search={false}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Level</Text>
              <CustomDropdown
                data={LEVEL_OPTIONS}
                value={form.level}
                onChange={v => setForm(f => ({ ...f, level: (v as ExamLevel) ?? 'primary' }))}
                placeholder="Select level"
                search={false}
              />

              {form.board === 'Custom' && (
                <>
                  <Text style={[styles.label, { color: colors.foreground }]}>Custom Board Name</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                    value={form.custom_board_name ?? ''}
                    onChangeText={v => setForm(f => ({ ...f, custom_board_name: v }))}
                    placeholder="Enter board name"
                    placeholderTextColor={colors['muted-foreground']}
                  />
                </>
              )}

              <View style={styles.typesHeader}>
                <Text style={[styles.label, { color: colors.foreground, marginTop: 0 }]}>Exam Types</Text>
                <TouchableOpacity onPress={addType} style={styles.addTypeBtn}>
                  <Ionicons name="add" size={16} color="#556ee6" />
                  <Text style={styles.addTypeBtnText}>Add Type</Text>
                </TouchableOpacity>
              </View>

              {form.exam_types.map((type, idx) => (
                <View key={idx} style={[styles.typeCard, { backgroundColor: inputBg, borderColor: borderCol }]}>
                  <View style={styles.typeCardTop}>
                    <Text style={[styles.typeIdx, { color: colors['muted-foreground'] }]}>Type Name</Text>
                    {form.exam_types.length > 1 && (
                      <TouchableOpacity onPress={() => removeType(idx)} accessibilityLabel="Delete" hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                    value={type.exam_type_name}
                    onChangeText={v => updateType(idx, 'exam_type_name', v)}
                    placeholder="e.g. FA1"
                    placeholderTextColor={colors['muted-foreground']}
                  />
                  <View style={{ marginTop: 8 }}>
                    <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Nature</Text>
                    <CustomDropdown
                      data={NATURE_OPTIONS}
                      value={type.nature}
                      onChange={v => updateType(idx, 'nature', (v as ExamNature) ?? 'formative')}
                      placeholder="Nature"
                      search={false}
                      containerStyle={{ marginBottom: 0 }}
                      style={styles.natureDropdown}
                      placeholderStyle={styles.natureDropdownText}
                      selectedTextStyle={styles.natureDropdownText}
                      iconStyle={{ width: 16, height: 16 }}
                    />
                  </View>
                  <View style={styles.typeFields}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Weightage %</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        keyboardType="numeric"
                        value={type.weightage_percent != null ? String(type.weightage_percent) : ''}
                        onChangeText={v => updateType(idx, 'weightage_percent', v ? Number(v) : null)}
                        placeholder="10"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Count/Year</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        keyboardType="numeric"
                        value={type.count_per_year != null ? String(type.count_per_year) : ''}
                        onChangeText={v => updateType(idx, 'count_per_year', v ? Number(v) : null)}
                        placeholder="2"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                  </View>
                </View>
              ))}

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: inputBg }]} onPress={closeModal} disabled={isPending}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.saveBtn, { flex: 1, opacity: isPending ? 0.5 : 1 }]}
                onPress={handleSave}
                disabled={isPending}
              >
                <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : 'Save Pattern'}</Text>
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
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#556ee6', marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 16, minHeight: 44,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  list: { padding: 16 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  emptyView: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginBottom: 6 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  typesTable: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  typeName: { fontSize: 13, fontWeight: '600' },
  typeMeta: { fontSize: 12, textTransform: 'capitalize' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  typesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  addTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44 },
  addTypeBtnText: { color: '#556ee6', fontSize: 13, fontWeight: '600' },
  typeCard: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  typeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeIdx: { fontSize: 12, fontWeight: '600' },
  typeFields: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fieldLabel: { fontSize: 11, marginBottom: 4 },
  smallInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13 },
  natureDropdown: { height: 44, paddingHorizontal: 8, paddingVertical: 0, borderRadius: 6 },
  natureDropdownText: { fontSize: 13 },
  modalFooter: {
    flexDirection: 'row', gap: 10, marginTop: 8, paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)',
  },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', paddingHorizontal: 20 },
  saveBtn: { backgroundColor: '#556ee6' },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
