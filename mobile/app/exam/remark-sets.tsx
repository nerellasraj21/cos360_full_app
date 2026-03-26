import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import {
  remarkGradesApi, RemarkGradeSet, RemarkGradeSetCreate, RemarkGradeItem,
} from '@/src/api/exam';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

const PURPLE = '#8B5CF6';
const EMPTY_ITEM: RemarkGradeItem = { remark: '', description: '' };

export default function RemarkSetsScreen() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<RemarkGradeSet | null>(null);
  const [form, setForm] = useState<RemarkGradeSetCreate>({ name: '', description: '', items: [{ ...EMPTY_ITEM }] });

  const { data: sets = [], isLoading } = useQuery({
    queryKey: ['remark-grade-sets'],
    queryFn: () => remarkGradesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (d: RemarkGradeSetCreate) => remarkGradesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remark-grade-sets'] }); showSuccess('Remark set created'); closeModal(); },
    onError: () => showError('Failed to create remark set'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RemarkGradeSetCreate> }) => remarkGradesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remark-grade-sets'] }); showSuccess('Remark set updated'); closeModal(); },
    onError: () => showError('Failed to update remark set'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remarkGradesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remark-grade-sets'] }); showSuccess('Remark set deleted'); },
    onError: () => showError('Failed to delete remark set'),
  });

  const openCreate = () => {
    setEditingSet(null);
    setForm({ name: '', description: '', items: [{ ...EMPTY_ITEM }] });
    setModalVisible(true);
  };

  const openEdit = (set: RemarkGradeSet) => {
    setEditingSet(set);
    setForm({ name: set.name, description: set.description || '', items: set.items.length > 0 ? [...set.items] : [{ ...EMPTY_ITEM }] });
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditingSet(null); };

  const handleDelete = (set: RemarkGradeSet) => {
    Alert.alert('Delete', `Delete \"${set.name}\"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(set.id) },
    ]);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { Alert.alert('Validation', 'Name is required'); return; }
    const validItems = form.items.filter(i => i.remark.trim());
    if (validItems.length === 0) { Alert.alert('Validation', 'At least one remark item is required'); return; }
    const payload = { ...form, items: validItems };
    if (editingSet) updateMutation.mutate({ id: editingSet.id, data: payload });
    else createMutation.mutate(payload);
  };

  const updateItem = (idx: number, key: keyof RemarkGradeItem, value: any) => {
    setForm(prev => ({ ...prev, items: prev.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) }));
  };

  const canCreate = hasPermission?.('exams', 'create') ?? false;
  const canEdit = hasPermission?.('exams', 'update') ?? false;
  const canDelete = hasPermission?.('exams', 'delete') ?? false;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title="Remark Grade Sets">
      {canCreate && (
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: PURPLE }]} onPress={openCreate}>
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.addBtnText}>New Remark Set</Text>
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
          {sets.map(set => (
            <View key={set.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.accent, { backgroundColor: PURPLE }]} />
              <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 12 }}>
                <Text style={[styles.cardName, { color: colors.foreground }]}>{set.name}</Text>
                {set.description ? <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]} numberOfLines={1}>{set.description}</Text> : null}
                <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                  {set.items.length} remark{set.items.length !== 1 ? 's' : ''}
                  {set.items.length > 0 && ': ' + set.items.slice(0, 3).map(i => i.remark).join(' · ')}
                  {set.items.length > 3 ? ' ...' : ''}
                </Text>
              </View>
              <View style={styles.cardActions}>
                {canEdit && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(set)}>
                    <Ionicons name="pencil" size={16} color={PURPLE} />
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(set)}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <View style={{ height: 48 }} />
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingSet ? 'Edit Remark Set' : 'New Remark Set'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: inputBg, borderColor: borderCol }]}
                placeholder="e.g. Descriptive Remarks"
                placeholderTextColor={colors['muted-foreground']}
                value={form.name}
                onChangeText={v => setForm(p => ({ ...p, name: v }))}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, backgroundColor: inputBg, borderColor: borderCol }]}
                placeholder="Optional"
                placeholderTextColor={colors['muted-foreground']}
                value={form.description || ''}
                onChangeText={v => setForm(p => ({ ...p, description: v }))}
              />

              <View style={styles.itemsHeader}>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Remark Items</Text>
                <TouchableOpacity
                  style={[styles.addBandBtn, { borderColor: PURPLE }]}
                  onPress={() => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }))}
                >
                  <Ionicons name="add" size={14} color={PURPLE} />
                  <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '600' }}>Add</Text>
                </TouchableOpacity>
              </View>

              {form.items.map((item, idx) => (
                <View key={idx} style={[styles.itemCard, { borderColor: borderCol, backgroundColor: inputBg }]}>
                  <View style={styles.itemCardHeader}>
                    <Text style={[styles.itemIdx, { color: colors['muted-foreground'] }]}>Remark {idx + 1}</Text>
                    {form.items.length > 1 && (
                      <TouchableOpacity onPress={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}>
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: borderCol }]}
                    placeholder="Remark text *"
                    placeholderTextColor={colors['muted-foreground']}
                    value={item.remark}
                    onChangeText={v => updateItem(idx, 'remark', v)}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.foreground, borderColor: borderCol, marginTop: 8 }]}
                    placeholder="Description (optional)"
                    placeholderTextColor={colors['muted-foreground']}
                    value={item.description || ''}
                    onChangeText={v => updateItem(idx, 'description', v)}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.miniLabel, { color: colors['muted-foreground'] }]}>Min Marks</Text>
                      <TextInput
                        style={[styles.miniInput, { color: colors.foreground, borderColor: borderCol }]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors['muted-foreground']}
                        value={item.min_marks !== undefined ? String(item.min_marks) : ''}
                        onChangeText={v => updateItem(idx, 'min_marks', v ? Number(v) : undefined)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.miniLabel, { color: colors['muted-foreground'] }]}>Max Marks</Text>
                      <TextInput
                        style={[styles.miniInput, { color: colors.foreground, borderColor: borderCol }]}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={colors['muted-foreground']}
                        value={item.max_marks !== undefined ? String(item.max_marks) : ''}
                        onChangeText={v => updateItem(idx, 'max_marks', v ? Number(v) : undefined)}
                      />
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: borderCol }]} onPress={closeModal}>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: PURPLE, flex: 1 }]} onPress={handleSubmit} disabled={isPending}>
                <Text style={{ color: 'white', fontWeight: '600' }}>{isPending ? 'Saving...' : editingSet ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cardName: { fontSize: 15, fontWeight: '700' },
  cardDesc: { fontSize: 12, marginTop: 2 },
  cardMeta: { fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 4, paddingRight: 10 },
  actionBtn: { padding: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  sectionLabel: { fontSize: 15, fontWeight: '700' },
  addBandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  itemCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemIdx: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  miniLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  miniInput: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 13 },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(0,0,0,0.1)' },
  btn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', paddingHorizontal: 20 },
});
