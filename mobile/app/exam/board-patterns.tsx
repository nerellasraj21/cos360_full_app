import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Modal,
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
import { BoardPattern, BoardPatternCreate, boardPatternsApi } from '@/src/api/exam';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

const EMPTY_FORM: BoardPatternCreate = { name: '', description: '' };

export default function BoardPatternsScreen() {
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  const { confirm, modalProps } = useConfirmModal();
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<BoardPattern | null>(null);
  const [form, setForm] = useState<BoardPatternCreate>({ ...EMPTY_FORM });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const canCreate = hasPermission?.('board_patterns', 'create');
  const canUpdate = hasPermission?.('board_patterns', 'update');
  const canDelete = hasPermission?.('board_patterns', 'delete');

  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ['board-patterns'],
    queryFn: () => boardPatternsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: BoardPatternCreate) => boardPatternsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-patterns'] }); closeModal(); showSuccess('Created', 'Board pattern created.'); },
    onError: () => showError('Error', 'Failed to create pattern.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BoardPatternCreate }) => boardPatternsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-patterns'] }); closeModal(); showSuccess('Updated', 'Pattern updated.'); },
    onError: () => showError('Error', 'Failed to update pattern.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardPatternsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['board-patterns'] }); showSuccess('Deleted', 'Pattern deleted.'); },
    onError: () => showError('Error', 'Failed to delete pattern.'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      boardPatternsApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['board-patterns'] }),
    onError: () => showError('Error', 'Failed to update status.'),
  });

  const openCreate = () => { setEditItem(null); setForm({ ...EMPTY_FORM }); setModalVisible(true); };
  const openEdit = (item: BoardPattern) => { setEditItem(item); setForm({ name: item.name, description: item.description ?? '' }); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name.trim()) { showError('Validation', 'Name is required.'); return; }
    if (editItem) updateMutation.mutate({ id: editItem.id, data: form });
    else createMutation.mutate(form);
  };

  const handleDelete = (item: BoardPattern) => {
    confirm({
      title: 'Delete Pattern',
      message: `Delete "${item.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title="Board Patterns">
      {canCreate && (
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add-circle" size={18} color="white" />
          <Text style={styles.addBtnText}>Add Pattern</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>Loading…</Text>
        ) : patterns.length === 0 ? (
          <View style={styles.emptyView}>
            <Ionicons name="library-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>No board patterns yet</Text>
          </View>
        ) : (
          patterns.map(item => (
            <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={[styles.iconBox, { backgroundColor: item.is_active ? '#556ee620' : '#6B728020' }]}>
                <Ionicons name="library" size={22} color={item.is_active ? '#556ee6' : '#6B7280'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
                {item.description ? (
                  <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>{item.description}</Text>
                ) : null}
                <TouchableOpacity
                  onPress={() => canUpdate && toggleActiveMutation.mutate({ id: item.id, is_active: !item.is_active })}
                  style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B98120' : '#EF444420' }]}
                >
                  <Text style={{ color: item.is_active ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
                    {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actions}>
                {canUpdate && (
                  <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={18} color="#556ee6" />
                  </TouchableOpacity>
                )}
                {canDelete && (
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editItem ? 'Edit Pattern' : 'New Board Pattern'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
              placeholder="e.g. CBSE Standard"
              placeholderTextColor={colors['muted-foreground']}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              placeholder="Optional description"
              placeholderTextColor={colors['muted-foreground']}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.saveBtn, { opacity: isPending ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={isPending}
            >
              <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : editItem ? 'Update Pattern' : 'Create Pattern'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#556ee6', marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  list: { padding: 16 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  emptyView: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10,
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardDesc: { fontSize: 13, marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multilineInput: { minHeight: 72, paddingTop: 10 },
  saveBtn: {
    backgroundColor: '#556ee6', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
