import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useAuth, useTheme } from '@/contexts';
import {
  remarkGradesApi, RemarkGradeOptionCreate, RemarkGradeSet, RemarkGradeSetCreate,
} from '@/src/api/exam';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { isAdminRole } from '@/src/lib/roles';

const PURPLE = '#8B5CF6';
const EMPTY_OPTION: RemarkGradeOptionCreate = { grade_letter: '', label: '', sort_order: 0 };
const EMPTY_FORM: RemarkGradeSetCreate = { name: '', options: [{ grade_letter: 'A', label: 'Excellent', sort_order: 0 }] };

export default function RemarkSetsScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { showSuccess, showError } = useToastContext();
  // Web parity: remark grade authorization is granted under the "exams"
  // resource — see mobile backend files/remark_grade_endpoints.py.
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();

  // Web parity (RemarkGradeManager): remark grade set management is admin-only.
  const isAdmin = isAdminRole(role?.name);
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/exam/list');
    }
  }, [isAdmin, router]);

  const { confirm, modalProps } = useConfirmModal();
  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<RemarkGradeSet | null>(null);
  const [form, setForm] = useState<RemarkGradeSetCreate>({ ...EMPTY_FORM });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['remark-grade-sets'],
    queryFn: () => remarkGradesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d: RemarkGradeSetCreate) => remarkGradesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remark-grade-sets'] }); showSuccess('Remark set created'); closeModal(); },
    onError: (err: any) => showError(getApiErrorMessage(err, 'Failed to create remark set')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RemarkGradeSetCreate }) => remarkGradesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remark-grade-sets'] }); showSuccess('Remark set updated'); closeModal(); },
    onError: (err: any) => showError(getApiErrorMessage(err, 'Failed to update remark set')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remarkGradesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remark-grade-sets'] }); showSuccess('Remark set deleted'); },
    onError: (err: any) => showError(getApiErrorMessage(err, 'Failed to delete remark set')),
  });

  const openCreate = () => {
    setEditingSet(null);
    setForm({ ...EMPTY_FORM, options: [{ ...EMPTY_FORM.options[0] }] });
    setModalVisible(true);
  };

  const openEdit = (set: RemarkGradeSet) => {
    setEditingSet(set);
    setForm({
      name: set.name,
      options: set.options.length > 0
        ? set.options.map(o => ({ grade_letter: o.grade_letter, label: o.label, sort_order: o.sort_order }))
        : [{ ...EMPTY_OPTION }],
    });
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditingSet(null); };

  const handleDelete = (set: RemarkGradeSet) => {
    confirm({
      title: 'Delete',
      message: `Delete "${set.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(set.id),
    });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { showError('Validation', 'Name is required'); return; }
    const validOptions = form.options.filter(o => o.grade_letter.trim() && o.label.trim());
    if (validOptions.length === 0) { showError('Validation', 'At least one grade option is required'); return; }
    const payload: RemarkGradeSetCreate = { name: form.name, options: validOptions.map((o, i) => ({ ...o, sort_order: i })) };
    if (editingSet) updateMutation.mutate({ id: editingSet.id, data: payload });
    else createMutation.mutate(payload);
  };

  const updateOption = (idx: number, key: keyof RemarkGradeOptionCreate, value: string) => {
    setForm(prev => ({ ...prev, options: prev.options.map((o, i) => i === idx ? { ...o, [key]: value } : o) }));
  };

  const canCreate = hasPermission?.('exams', 'create') ?? false;
  const canEdit = hasPermission?.('exams', 'update') ?? false;
  const canDelete = hasPermission?.('exams', 'delete') ?? false;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Non-admins are redirected by the effect above; render nothing meanwhile.
  if (!isAdmin) return null;

  return (
    <AppLayout title="Remark Grade Sets">
      {canCreate && (
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: PURPLE }]} onPress={openCreate}>
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.addBtnText}>New Set</Text>
        </TouchableOpacity>
      )}

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={PURPLE} /></View>
      ) : sets.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubble-outline" size={48} color={colors['muted-foreground']} />
          <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No remark sets yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {sets.map(set => {
            const isExpanded = expandedId === set.id;
            return (
              <TouchableOpacity
                key={set.id}
                activeOpacity={0.7}
                onPress={() => setExpandedId(isExpanded ? null : set.id)}
                style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
              >
                <View style={[styles.accent, { backgroundColor: PURPLE }]} />
                <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}>
                  <View style={styles.cardNameRow}>
                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={14}
                      color={colors['muted-foreground']}
                    />
                    <Text style={[styles.cardName, { color: colors.foreground }]}>{set.name}</Text>
                  </View>
                  <View style={styles.chipRow}>
                    {set.options.slice(0, 4).map(opt => (
                      <View key={opt.id} style={[styles.chip, { borderColor: borderCol }]}>
                        <Text style={[styles.chipText, { color: colors.foreground }]}>{opt.grade_letter}: {opt.label}</Text>
                      </View>
                    ))}
                    {set.options.length > 4 && (
                      <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>+{set.options.length - 4} more</Text>
                    )}
                  </View>

                  {isExpanded && (
                    <View style={[styles.optionsTable, { borderColor: borderCol }]}>
                      <View style={[styles.optionsTableHeaderRow, { borderColor: borderCol }]}>
                        <Text style={[styles.optionsTableHeaderCell, styles.colGradeLetter, { color: colors['muted-foreground'] }]}>Grade Letter</Text>
                        <Text style={[styles.optionsTableHeaderCell, styles.colLabel, { color: colors['muted-foreground'] }]}>Label</Text>
                        <Text style={[styles.optionsTableHeaderCell, styles.colOrder, { color: colors['muted-foreground'] }]}>Order</Text>
                      </View>
                      {set.options.map(opt => (
                        <View key={opt.id} style={[styles.optionsTableRow, { borderColor: borderCol }]}>
                          <View style={styles.colGradeLetter}>
                            <View style={[styles.gradeLetterBadge, { borderColor: borderCol }]}>
                              <Text style={[styles.gradeLetterBadgeText, { color: colors.foreground }]}>{opt.grade_letter}</Text>
                            </View>
                          </View>
                          <Text style={[styles.optionsTableCell, styles.colLabel, { color: colors.foreground }]}>{opt.label}</Text>
                          <Text style={[styles.optionsTableCell, styles.colOrder, { color: colors['muted-foreground'] }]}>{opt.sort_order}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <View style={styles.cardActions}>
                  {canEdit && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(set)} accessibilityLabel="Edit">
                      <Ionicons name="pencil" size={16} color={PURPLE} />
                    </TouchableOpacity>
                  )}
                  {canDelete && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(set)} accessibilityLabel="Delete">
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 48 }} />
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingSet ? 'Edit Remark Grade Set' : 'Create Remark Grade Set'}
              </Text>
              <TouchableOpacity onPress={closeModal} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>Set Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: inputBg, borderColor: borderCol }]}
                placeholder="e.g. Primary Remarks Set"
                placeholderTextColor={colors['muted-foreground']}
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
              />

              <View style={styles.itemsHeader}>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Grade Options *</Text>
                <TouchableOpacity
                  style={[styles.addOptBtn, { borderColor: PURPLE }]}
                  onPress={() => setForm(p => ({ ...p, options: [...p.options, { ...EMPTY_OPTION, sort_order: p.options.length }] }))}
                >
                  <Ionicons name="add" size={14} color={PURPLE} />
                  <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '600' }}>Add Option</Text>
                </TouchableOpacity>
              </View>

              {form.options.map((option, idx) => (
                <View key={idx} style={styles.optionRow}>
                  <TextInput
                    style={[styles.gradeLetterInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                    placeholder="A"
                    placeholderTextColor={colors['muted-foreground']}
                    value={option.grade_letter}
                    onChangeText={v => updateOption(idx, 'grade_letter', v)}
                    maxLength={5}
                  />
                  <TextInput
                    style={[styles.input, styles.labelInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                    placeholder="Excellent"
                    placeholderTextColor={colors['muted-foreground']}
                    value={option.label}
                    onChangeText={v => updateOption(idx, 'label', v)}
                  />
                  {form.options.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setForm(p => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))}
                      style={styles.removeBtn}
                      accessibilityLabel="Remove"
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: borderCol }]} onPress={closeModal}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: PURPLE, flex: 1 }]} onPress={handleSubmit} disabled={isPending}>
                <Text style={{ color: 'white', fontWeight: '600' }}>{isPending ? 'Saving...' : 'Save Set'}</Text>
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
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', margin: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  accent: { width: 4, alignSelf: 'stretch' },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  chipText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 4, paddingRight: 10 },
  actionBtn: { padding: 8 },
  optionsTable: { marginTop: 10, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  optionsTableHeaderRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  optionsTableHeaderCell: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  optionsTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  optionsTableCell: { fontSize: 12 },
  colGradeLetter: { width: 76 },
  colLabel: { flex: 1 },
  colOrder: { width: 50 },
  gradeLetterBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  gradeLetterBadgeText: { fontSize: 11, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700' },
  addOptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  gradeLetterInput: { width: 64, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, textAlign: 'center' },
  labelInput: { flex: 1 },
  removeBtn: { padding: 4 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', paddingHorizontal: 20 },
});
