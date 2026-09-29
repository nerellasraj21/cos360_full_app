import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth, useTheme } from '@/contexts';
import {
  ExamGradeScheme,
  ExamGradeSchemeCreate,
  GradeBand,
  gradeSchemeApi,
} from '@/src/api/exam';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '@/src/hooks/useMobilePermission';
import { isAdminRole } from '@/src/lib/roles';

// Web parity: mirrors src/pages/exam/ExamGradeSchemes.tsx. Subject Grade
// Schemes now live on their own screen — see app/exam/subject-grade-schemes.tsx.

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
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  // Web parity: grade scheme authorization is granted under the "exams"
  // resource — see mobile backend files/grading_endpoints.py.
  const { hasPermission } = useMobilePermission();
  const { showSuccess, showError } = useToastContext();
  const qc = useQueryClient();

  // Web parity (GradingSchemeManager): grade scheme management is admin-only.
  const isAdmin = isAdminRole(role?.name);
  useEffect(() => {
    if (!isAdmin) {
      router.replace('/exam/list');
    }
  }, [isAdmin, router]);

  const { confirm, modalProps } = useConfirmModal();
  const [modalVisible, setModalVisible] = useState(false);
  const [editItem, setEditItem] = useState<ExamGradeScheme | null>(null);
  const [form, setForm] = useState<ExamGradeSchemeCreate>({ ...EMPTY_FORM });
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = isDark ? '#0f0f23' : '#f8fafc';
  const altRowBg = isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const canCreate = hasPermission?.('exams', 'create');
  const canUpdate = hasPermission?.('exams', 'update');
  const canDelete = hasPermission?.('exams', 'delete');

  // ── Query ────────────────────────────────────────────────────────────────

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['grade-schemes', 'exam'],
    queryFn: () => gradeSchemeApi.listExamSchemes(),
  });

  const filteredSchemes = useMemo(() => {
    if (!searchQuery.trim()) return schemes;
    const q = searchQuery.toLowerCase();
    return schemes.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q)
    );
  }, [schemes, searchQuery]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: ExamGradeSchemeCreate) => gradeSchemeApi.createExamScheme(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'exam'] }); closeModal(); showSuccess('Created', 'Exam grade scheme created.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to create scheme.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExamGradeSchemeCreate }) => gradeSchemeApi.updateExamScheme(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'exam'] }); closeModal(); showSuccess('Updated', 'Scheme updated.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to update scheme.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gradeSchemeApi.deleteExamScheme(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grade-schemes', 'exam'] }); showSuccess('Deleted', 'Scheme deleted.'); },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to delete scheme.')),
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
      updateMutation.mutate({ id: editItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (item: ExamGradeScheme) => {
    confirm({
      title: 'Delete Scheme',
      message: `Delete "${item.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(item.id),
    });
  };

  const updateBand = (idx: number, field: keyof GradeBand, value: string | boolean | number) => {
    const bands = [...form.bands];
    bands[idx] = { ...bands[idx], [field]: value };
    setForm(f => ({ ...f, bands }));
  };

  const addBand = () => setForm(f => ({ ...f, bands: [...f.bands, { ...EMPTY_BAND }] }));
  const removeBand = (idx: number) => setForm(f => ({ ...f, bands: f.bands.filter((_, i) => i !== idx) }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  // Non-admins are redirected by the effect above; render nothing meanwhile.
  if (!isAdmin) return null;

  return (
    <AppLayout title="Exam Grade Schemes">
      <View style={styles.container}>
        {/* Page header */}
        <View style={styles.pageHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.foreground }]}>Exam Grade Schemes</Text>
            <Text style={[styles.pageSubtitle, { color: colors['muted-foreground'] }]}>
              Map total percentage ranges to grades (A+, A, B...) with GPA and pass/fail
            </Text>
          </View>
          {canCreate && (
            <TouchableOpacity style={styles.addButton} onPress={openCreate}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addButtonText}>New Scheme</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersLabelRow}>
          <Ionicons name="filter-outline" size={14} color={colors['muted-foreground']} />
          <Text style={[styles.filtersLabelText, { color: colors['muted-foreground'] }]}>Filters</Text>
        </View>
        <View style={[styles.searchBar, { backgroundColor: inputBg, borderColor: borderCol }]}>
          <Ionicons name="search-outline" size={16} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search schemes..."
            placeholderTextColor={colors['muted-foreground']}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {isLoading ? (
            <View style={styles.emptyView}>
              <ActivityIndicator size="large" color="#556ee6" />
            </View>
          ) : filteredSchemes.length === 0 ? (
            <View style={styles.emptyView}>
              <Ionicons name="trophy-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.empty, { color: colors['muted-foreground'] }]}>
                {searchQuery ? 'No schemes match your search' : 'No grade schemes yet'}
              </Text>
            </View>
          ) : (
            filteredSchemes.map((item, idx) => {
              const expanded = expandedId === item.id;
              return (
                <View key={item.id} style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    activeOpacity={0.75}
                    onPress={() => setExpandedId(expanded ? null : item.id)}
                  >
                    <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{idx + 1}</Text>
                    <Ionicons
                      name={expanded ? 'chevron-down' : 'chevron-forward'}
                      size={15}
                      color={colors['muted-foreground']}
                      style={{ marginRight: 8 }}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
                        {item.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      {item.description ? (
                        <Text style={[styles.cardDesc, { color: colors['muted-foreground'] }]} numberOfLines={1}>{item.description}</Text>
                      ) : null}
                      <View style={[styles.bandsBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]}>
                        <Text style={[styles.bandsBadgeText, { color: colors.foreground }]}>
                          {item.bands.length} band{item.bands.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      {canUpdate && (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); openEdit(item); }}
                          style={styles.iconBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityLabel="Edit"
                        >
                          <Ionicons name="create-outline" size={18} color="#556ee6" />
                        </TouchableOpacity>
                      )}
                      {canDelete && (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); handleDelete(item); }}
                          style={styles.iconBtn}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          accessibilityLabel="Delete"
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Expanded band breakdown — mirrors web GradeBandEditor (readOnly) */}
                  {expanded && (
                    <View style={[styles.expandedPanel, { borderTopColor: borderCol }]}>
                      {item.bands.length === 0 ? (
                        <Text style={[styles.noBandsText, { color: colors['muted-foreground'] }]}>No grade bands defined.</Text>
                      ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View>
                            <View style={[styles.bandTableHeader, { borderBottomColor: borderCol }]}>
                              <Text style={[styles.bandHeaderCell, styles.bandColPercent]}>From %</Text>
                              <Text style={[styles.bandHeaderCell, styles.bandColPercent]}>To %</Text>
                              <Text style={[styles.bandHeaderCell, styles.bandColGrade]}>Grade</Text>
                              <Text style={[styles.bandHeaderCell, styles.bandColGpa]}>GPA</Text>
                              <Text style={[styles.bandHeaderCell, styles.bandColRemarks]}>Remarks</Text>
                              <Text style={[styles.bandHeaderCell, styles.bandColPass]}>Pass?</Text>
                            </View>
                            {item.bands.map((b, i) => (
                              <View key={i} style={[styles.bandTableRow, { borderTopColor: borderCol }]}>
                                <Text style={[styles.bandCell, styles.bandColPercent, { color: colors.foreground }]}>{b.from_percent}</Text>
                                <Text style={[styles.bandCell, styles.bandColPercent, { color: colors.foreground }]}>{b.to_percent}</Text>
                                <View style={styles.bandColGrade}>
                                  <View style={styles.gradeBadge}>
                                    <Text style={styles.gradeBadgeText}>{b.grade_label}</Text>
                                  </View>
                                </View>
                                <Text style={[styles.bandCell, styles.bandColGpa, { color: colors.foreground }]}>
                                  {b.gpa != null ? Number(b.gpa).toFixed(1) : '—'}
                                </Text>
                                <Text style={[styles.bandCell, styles.bandColRemarks, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                                  {b.remarks || '—'}
                                </Text>
                                <View style={styles.bandColPass}>
                                  <View style={[styles.passBadge, { backgroundColor: b.is_pass ? '#10B98120' : '#EF444420' }]}>
                                    <Text style={{ color: b.is_pass ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
                                      {b.is_pass ? 'Pass' : 'Fail'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editItem ? 'Edit Scheme' : 'New Exam Grade Scheme'}
              </Text>
              <TouchableOpacity onPress={closeModal}
              accessibilityLabel="Close">
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
                    <TouchableOpacity onPress={() => removeBand(idx)}
              accessibilityLabel="Delete">
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
                style={[styles.saveBtn, { opacity: isPending ? 0.5 : 1 }]}
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
  container: { flex: 1, padding: 16 },

  // Page header
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 10, marginBottom: 14,
  },
  pageTitle: { fontSize: 19, fontWeight: '700' },
  pageSubtitle: { fontSize: 12, marginTop: 3, lineHeight: 16 },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#556ee6', borderRadius: 8,
    paddingHorizontal: 12, height: 36,
  },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 13 },

  // Filters
  filtersLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  filtersLabelText: { fontSize: 13, fontWeight: '500' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', height: 36,
    paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, marginBottom: 14, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  list: { paddingBottom: 48 },
  empty: { textAlign: 'center', fontSize: 14, marginTop: 16 },
  emptyView: { alignItems: 'center', paddingVertical: 48, gap: 12 },

  card: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  serialNo: { fontSize: 12, fontWeight: '600', width: 20, marginTop: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  defaultBadge: { backgroundColor: '#556ee620', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { color: '#556ee6', fontSize: 10, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 3 },
  bandsBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  bandsBadgeText: { fontSize: 11, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  iconBtn: { padding: 6 },

  // Expanded band table
  expandedPanel: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12 },
  noBandsText: { fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  bandTableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 },
  bandHeaderCell: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, opacity: 0.6, color: '#94a3b8' },
  bandTableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  bandCell: { fontSize: 13 },
  bandColPercent: { width: 64 },
  bandColGrade: { width: 72 },
  bandColGpa: { width: 56 },
  bandColRemarks: { width: 130 },
  bandColPass: { width: 70 },
  gradeBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#556ee650', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  gradeBadgeText: { fontSize: 12, fontWeight: '700', color: '#556ee6' },
  passBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },

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
