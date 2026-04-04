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
import {
  ExamGradeScheme,
  ExamGradeSchemeCreate,
  GradeBand,
  gradeSchemeApi,
} from '@/src/api/exam';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';

type TabKey = 'exam' | 'subject';

const EMPTY_BAND: GradeBand = {
  from_percent: 0,
  to_percent: 100,
  grade_label: '',
  is_pass: true,
};

const EMPTY_FORM: ExamGradeSchemeCreate = {
  name: '',
  description: '',
  bands: [{ ...EMPTY_BAND }],
  is_default: false,
};

export default function GradeSchemesScreen() {
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  const { confirm, modalProps } = useConfirmModal();
  const [activeTab, setActiveTab] = useState<TabKey>('exam');
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<ExamGradeScheme | null>(null);
  const [form, setForm] = useState<ExamGradeSchemeCreate>({ ...EMPTY_FORM });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const canCreate = hasPermission?.('grade_schemes', 'create');
  const canUpdate = hasPermission?.('grade_schemes', 'update');
  const canDelete = hasPermission?.('grade_schemes', 'delete');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: examSchemes = [], isLoading: loadingExam } = useQuery({
    queryKey: ['grade-schemes', 'exam'],
    queryFn: () => gradeSchemeApi.listExamSchemes(),
  });

  const { data: subjectSchemes = [], isLoading: loadingSubject } = useQuery({
    queryKey: ['grade-schemes', 'subject'],
    queryFn: () => gradeSchemeApi.listSubjectSchemes(),
  });

  const schemes = activeTab === 'exam' ? examSchemes : subjectSchemes;
  const isLoading = activeTab === 'exam' ? loadingExam : loadingSubject;

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createExamMutation = useMutation({
    mutationFn: (data: ExamGradeSchemeCreate) => gradeSchemeApi.createExamScheme(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'exam'] }); closeModal(); showSuccess('Created', 'Exam grade scheme created.'); },
    onError: () => showError('Error', 'Failed to create scheme.'),
  });

  const updateExamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExamGradeSchemeCreate }) => gradeSchemeApi.updateExamScheme(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'exam'] }); closeModal(); showSuccess('Updated', 'Scheme updated.'); },
    onError: () => showError('Error', 'Failed to update scheme.'),
  });

  const deleteExamMutation = useMutation({
    mutationFn: (id: string) => gradeSchemeApi.deleteExamScheme(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'exam'] }); showSuccess('Deleted', 'Scheme deleted.'); },
    onError: () => showError('Error', 'Failed to delete scheme.'),
  });

  const createSubjectMutation = useMutation({
    mutationFn: (data: ExamGradeSchemeCreate) => gradeSchemeApi.createSubjectScheme(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'subject'] }); closeModal(); showSuccess('Created', 'Subject grade scheme created.'); },
    onError: () => showError('Error', 'Failed to create scheme.'),
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExamGradeSchemeCreate }) => gradeSchemeApi.updateSubjectScheme(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'subject'] }); closeModal(); showSuccess('Updated', 'Scheme updated.'); },
    onError: () => showError('Error', 'Failed to update scheme.'),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => gradeSchemeApi.deleteSubjectScheme(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'subject'] }); showSuccess('Deleted', 'Scheme deleted.'); },
    onError: () => showError('Error', 'Failed to delete scheme.'),
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, bands: [{ ...EMPTY_BAND }] });
    setModalVisible(true);
  };

  const openEdit = (item: ExamGradeScheme) => {
    setEditItem(item);
    setForm({ name: item.name, description: item.description ?? '', bands: item.bands.map(b => ({ ...b })), is_default: item.is_default });
    setModalVisible(true);
  };

  const closeModal = () => { setModalVisible(false); setEditItem(null); };

  const handleSave = () => {
    if (!form.name.trim()) { showError('Validation', 'Name is required.'); return; }
    if (form.bands.length === 0) { showError('Validation', 'At least one grade band required.'); return; }

    const payload: ExamGradeSchemeCreate = {
      ...form,
      bands: form.bands.filter(b => b.grade_label.trim()),
    };

    if (editItem) {
      if (activeTab === 'exam') updateExamMutation.mutate({ id: editItem.id, data: payload });
      else updateSubjectMutation.mutate({ id: editItem.id, data: payload });
    } else {
      if (activeTab === 'exam') createExamMutation.mutate(payload);
      else createSubjectMutation.mutate(payload);
    }
  };

  const handleDelete = (item: ExamGradeScheme) => {
    confirm({
      title: 'Delete Scheme',
      message: `Delete "${item.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        if (activeTab === 'exam') deleteExamMutation.mutate(item.id);
        else deleteSubjectMutation.mutate(item.id);
      },
    });
  };

  const updateBand = (idx: number, field: keyof GradeBand, value: string | boolean | number) => {
    const bands = [...form.bands];
    bands[idx] = { ...bands[idx], [field]: value };
    setForm(f => ({ ...f, bands }));
  };

  const addBand = () => setForm(f => ({ ...f, bands: [...f.bands, { ...EMPTY_BAND }] }));
  const removeBand = (idx: number) => setForm(f => ({ ...f, bands: f.bands.filter((_, i) => i !== idx) }));

  const isPending = createExamMutation.isPending || updateExamMutation.isPending ||
    createSubjectMutation.isPending || updateSubjectMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Grade Schemes">
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['exam', 'subject'] as TabKey[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { backgroundColor: '#556ee6', borderRadius: 8 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? 'white' : colors['muted-foreground'] }]}>
              {tab === 'exam' ? 'Exam Schemes' : 'Subject Schemes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add button */}
      {canCreate && (
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add-circle" size={18} color="white" />
          <Text style={styles.addBtnText}>Add Scheme</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>Loading…</Text>
        ) : schemes.length === 0 ? (
          <View style={styles.emptyView}>
            <Ionicons name="layers-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>No grade schemes yet</Text>
          </View>
        ) : (
          schemes.map(item => (
            <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
                    {item.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                      </View>
                    )}
                  </View>
                  {item.description ? (
                    <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]}>{item.description}</Text>
                  ) : null}
                  <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
                    {item.bands.length} grade band{item.bands.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.cardActions}>
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

              {/* Bands preview */}
              {item.bands.length > 0 && (
                <View style={styles.bandsRow}>
                  {item.bands.slice(0, 6).map((b, i) => (
                    <View key={i} style={[styles.bandChip, { backgroundColor: b.is_pass ? '#10B98120' : '#EF444420' }]}>
                      <Text style={[styles.bandChipText, { color: b.is_pass ? '#10B981' : '#EF4444' }]}>
                        {b.grade_label} ({b.from_percent}–{b.to_percent}%)
                      </Text>
                    </View>
                  ))}
                  {item.bands.length > 6 && (
                    <Text style={[styles.moreBands, { color: colors['muted-foreground'] }]}>+{item.bands.length - 6} more</Text>
                  )}
                </View>
              )}
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
                {editItem ? 'Edit Scheme' : `New ${activeTab === 'exam' ? 'Exam' : 'Subject'} Grade Scheme`}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={22} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: colors.foreground }]}>Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="e.g. CBSE 10-Point"
                placeholderTextColor={colors['muted-foreground']}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder="Optional description"
                placeholderTextColor={colors['muted-foreground']}
              />

              {/* Default toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setForm(f => ({ ...f, is_default: !f.is_default }))}
              >
                <View style={[styles.toggleBox, { backgroundColor: form.is_default ? '#556ee6' : borderCol }]}>
                  <Ionicons name={form.is_default ? 'checkmark' : 'close'} size={14} color="white" />
                </View>
                <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Set as default scheme</Text>
              </TouchableOpacity>

              {/* Grade Bands */}
              <View style={styles.bandsHeader}>
                <Text style={[styles.label, { color: colors.foreground }]}>Grade Bands</Text>
                <TouchableOpacity onPress={addBand} style={styles.addBandBtn}>
                  <Ionicons name="add" size={16} color="#556ee6" />
                  <Text style={styles.addBandBtnText}>Add Band</Text>
                </TouchableOpacity>
              </View>

              {form.bands.map((band, idx) => (
                <View key={idx} style={[styles.bandRow, { backgroundColor: inputBg, borderColor: borderCol }]}>
                  <View style={styles.bandRowTop}>
                    <Text style={[styles.bandIdx, { color: colors['muted-foreground'] }]}>Band {idx + 1}</Text>
                    <TouchableOpacity onPress={() => removeBand(idx)}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bandFields}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Grade Label</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        value={band.grade_label}
                        onChangeText={v => updateBand(idx, 'grade_label', v)}
                        placeholder="A+"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>From %</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        value={String(band.from_percent)}
                        onChangeText={v => updateBand(idx, 'from_percent', Number(v) || 0)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>To %</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        value={String(band.to_percent)}
                        onChangeText={v => updateBand(idx, 'to_percent', Number(v) || 0)}
                        keyboardType="numeric"
                        placeholder="100"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                  </View>
                  <View style={styles.bandFields}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>GPA</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        value={band.gpa != null ? String(band.gpa) : ''}
                        onChangeText={v => updateBand(idx, 'gpa', v ? Number(v) : undefined as any)}
                        keyboardType="decimal-pad"
                        placeholder="10.0"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Remarks</Text>
                      <TextInput
                        style={[styles.smallInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                        value={band.remarks ?? ''}
                        onChangeText={v => updateBand(idx, 'remarks', v)}
                        placeholder="Outstanding"
                        placeholderTextColor={colors['muted-foreground']}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => updateBand(idx, 'is_pass', !band.is_pass)}
                      style={[styles.passToggle, { backgroundColor: band.is_pass ? '#10B98120' : '#EF444420' }]}
                    >
                      <Text style={{ color: band.is_pass ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
                        {band.is_pass ? 'PASS' : 'FAIL'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveBtn, { opacity: isPending ? 0.6 : 1 }]}
                onPress={handleSave}
                disabled={isPending}
              >
                <Text style={styles.saveBtnText}>{isPending ? 'Saving…' : editItem ? 'Update Scheme' : 'Create Scheme'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', padding: 6, marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  tabText: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#556ee6', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  list: { padding: 16 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  emptyView: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  defaultBadge: { backgroundColor: '#556ee620', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { color: '#556ee6', fontSize: 10, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 3 },
  cardMeta: { fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  bandsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bandChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  bandChipText: { fontSize: 11, fontWeight: '600' },
  moreBands: { fontSize: 11, alignSelf: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 4,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4 },
  toggleBox: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14 },
  bandsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  addBandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBandBtnText: { color: '#556ee6', fontSize: 13, fontWeight: '600' },
  bandRow: { borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  bandRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bandIdx: { fontSize: 12, fontWeight: '600' },
  bandFields: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  fieldLabel: { fontSize: 11, marginBottom: 4 },
  smallInput: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 7,
    fontSize: 13,
  },
  passToggle: {
    alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 6, marginBottom: 0, justifyContent: 'center',
  },
  saveBtn: {
    backgroundColor: '#556ee6', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
