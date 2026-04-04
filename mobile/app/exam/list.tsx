import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { useAuth, useTheme } from '@/contexts';
import { examsApi, ExamListItem, ExamStatus, ExamNature, ExamUpdateRequest } from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

const STATUSES: { label: string; value: ExamStatus | '' }[] = [
  { label: 'All',       value: '' },
  { label: 'Draft',     value: 'draft' },
  { label: 'Active',    value: 'active' },
  { label: 'Locked',    value: 'locked' },
  { label: 'Published', value: 'published' },
  { label: 'Finalized', value: 'finalized' },
];

const NATURES: { label: string; value: ExamNature | '' }[] = [
  { label: 'All Nature',   value: '' },
  { label: 'Formative',    value: 'formative' },
  { label: 'Summative',    value: 'summative' },
  { label: 'Cumulative',   value: 'cumulative' },
  { label: 'Custom',       value: 'custom' },
];

export default function ExamListScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps: confirmProps } = useConfirmModal();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const roleName = role?.name?.toLowerCase() ?? '';
  const isStudent = roleName === 'student';
  const isParent = roleName === 'parent' || roleName === 'guardian';
  const isStudentOrParent = isStudent || isParent;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExamStatus | ''>('');
  const [natureFilter, setNatureFilter] = useState<ExamNature | ''>('');

  // Edit modal state
  const [editTarget, setEditTarget] = useState<ExamListItem | null>(null);
  const [editForm, setEditForm] = useState<{
    exam_name: string;
    mark_entry_deadline: string;
    attendance_from_date: string;
    attendance_to_date: string;
    term: string;
    publish_rank: boolean;
  }>({ exam_name: '', mark_entry_deadline: '', attendance_from_date: '', attendance_to_date: '', term: '', publish_rank: false });

  // Clone modal state
  const [cloneTarget, setCloneTarget] = useState<ExamListItem | null>(null);
  const [cloneName, setCloneName] = useState('');

  const canCreate = hasPermission?.('exams', 'create');
  const canUpdate = hasPermission?.('exams', 'update');
  const canDelete = hasPermission?.('exams', 'delete');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exams', statusFilter, natureFilter],
    queryFn: () => examsApi.list({
      exam_status: isStudentOrParent
        ? (statusFilter as ExamStatus || 'published')
        : (statusFilter as ExamStatus || undefined),
      nature: natureFilter as ExamNature || undefined,
      size: 50,
    }),
    enabled: isStudentOrParent || !!(hasPermission?.('exams', 'list')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExamUpdateRequest }) =>
      examsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setEditTarget(null);
      showSuccess('Updated', 'Exam updated successfully.');
    },
    onError: () => showError('Error', 'Failed to update exam.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Deleted', 'Exam deleted.');
    },
    onError: () => showError('Error', 'Failed to delete exam.'),
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      examsApi.clone(id, { new_name: name }),
    onSuccess: (newExam) => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      setCloneTarget(null);
      showSuccess('Cloned', 'Exam cloned successfully.');
      router.push(`/exam/${newExam.id}` as any);
    },
    onError: () => showError('Error', 'Failed to clone exam.'),
  });

  const openEdit = (exam: ExamListItem) => {
    setEditForm({
      exam_name: exam.exam_name,
      mark_entry_deadline: exam.mark_entry_deadline ?? '',
      attendance_from_date: (exam as any).attendance_from_date ?? '',
      attendance_to_date: (exam as any).attendance_to_date ?? '',
      term: (exam as any).term ?? '',
      publish_rank: !!(exam as any).publish_rank,
    });
    setEditTarget(exam);
  };

  const handleEditSave = () => {
    if (!editTarget) return;
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        exam_name: editForm.exam_name.trim() || undefined,
        mark_entry_deadline: editForm.mark_entry_deadline || undefined,
        attendance_from_date: editForm.attendance_from_date || undefined,
        attendance_to_date: editForm.attendance_to_date || undefined,
        term: editForm.term || undefined,
        publish_rank: editForm.publish_rank,
      },
    });
  };

  const handleDelete = async (exam: ExamListItem) => {
    const ok = await confirm({
      title: 'Delete Exam?',
      message: `This will permanently delete "${exam.exam_name}" and all its dates. This cannot be undone.`,
      confirmText: 'Delete',
      confirmDestructive: true,
    });
    if (ok) deleteMutation.mutate(exam.id);
  };

  const handleClone = () => {
    if (!cloneTarget) return;
    cloneMutation.mutate({ id: cloneTarget.id, name: cloneName.trim() });
  };

  const filtered = useMemo(() => {
    const items = Array.isArray(data) ? data : [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(e =>
      e.exam_name.toLowerCase().includes(q) ||
      (e.exam_type ?? '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: ExamListItem }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}
        onPress={() =>
          isStudentOrParent
            ? router.push(`/exam/my-marks/${item.id}` as any)
            : router.push(`/exam/${item.id}` as any)
        }
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.exam_name}</Text>
            <Text style={[styles.cardMeta, { color: colors['muted-foreground'] }]}>
              {item.exam_type} · {item.nature} · {item.academic_year_title ?? item.academic_year_id}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateRow}>
            <Ionicons name="layers-outline" size={13} color={colors['muted-foreground']} />
            <Text style={[styles.dateText, { color: colors['muted-foreground'] }]}>
              {item.board} · {item.level.replace(/_/g, ' ')}
              {item.mark_entry_deadline ? ` · Due ${item.mark_entry_deadline}` : ''}
              {(item.subject_config_count ?? 0) > 0 ? ` · ${item.subject_config_count} subj.` : ''}
            </Text>
          </View>

          {/* Actions menu (admin only) */}
          {!isStudentOrParent && (canUpdate || canDelete) && (
            <View style={styles.actions}>
              {canUpdate && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={(e) => { e.stopPropagation?.(); openEdit(item); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={15} color="#556ee6" />
                </TouchableOpacity>
              )}
              {canUpdate && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setCloneName(`${item.exam_name} (Copy)`);
                    setCloneTarget(item);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="copy-outline" size={15} color="#10B981" />
                </TouchableOpacity>
              )}
              {canDelete && item.status === 'draft' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={(e) => { e.stopPropagation?.(); handleDelete(item); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {isStudentOrParent && (
            <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title={isStudentOrParent ? 'My Exams' : 'All Exams'}>
      <View style={styles.container}>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <Ionicons name="search" size={18} color={colors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: colors['card-foreground'] as string }]}
            placeholder="Search exams..."
            placeholderTextColor={colors['muted-foreground'] as string}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter chips */}
        <View style={styles.filterRow}>
          {STATUSES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.filterChip,
                { backgroundColor: statusFilter === s.value ? colors.primary : cardBg, borderColor: borderCol },
              ]}
              onPress={() => setStatusFilter(s.value)}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === s.value ? 'white' : colors['muted-foreground'] as string }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nature filter chips */}
        {!isStudentOrParent && (
          <View style={[styles.filterRow, { paddingTop: 0 }]}>
            {NATURES.map(n => (
              <TouchableOpacity
                key={n.value}
                style={[
                  styles.filterChip,
                  { backgroundColor: natureFilter === n.value ? '#8B5CF6' : cardBg, borderColor: borderCol },
                ]}
                onPress={() => setNatureFilter(n.value)}
              >
                <Text style={[styles.filterChipText, { color: natureFilter === n.value ? 'white' : colors['muted-foreground'] as string }]}>
                  {n.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* List */}
        {isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading exams…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {search ? 'No matching exams' : 'No exams found'}
            </Text>
            {canCreate && !search && (
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/exam/create' as any)}
              >
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.createBtnText}>Create First Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            onRefresh={refetch}
            refreshing={isLoading}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            ListHeaderComponent={
              <Text style={[styles.count, { color: colors['muted-foreground'] }]}>
                {filtered.length} exam{filtered.length !== 1 ? 's' : ''}
              </Text>
            }
          />
        )}

        {/* FAB */}
        {canCreate && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/exam/create' as any)}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={!!editTarget} animationType="slide" transparent onRequestClose={() => setEditTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Exam</Text>
            <Text style={[styles.modalHint, { color: colors['muted-foreground'] }]}>
              Board, level, nature, and academic year cannot be changed after creation.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Exam Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={editForm.exam_name}
              onChangeText={v => setEditForm(f => ({ ...f, exam_name: v }))}
              placeholder="Exam name"
              placeholderTextColor={colors['muted-foreground']}
            />

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Mark Entry Deadline (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={editForm.mark_entry_deadline}
              onChangeText={v => setEditForm(f => ({ ...f, mark_entry_deadline: v }))}
              placeholder="e.g. 2025-06-30"
              placeholderTextColor={colors['muted-foreground']}
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Attendance From</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                  value={editForm.attendance_from_date}
                  onChangeText={v => setEditForm(f => ({ ...f, attendance_from_date: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']}
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Attendance To</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                  value={editForm.attendance_to_date}
                  onChangeText={v => setEditForm(f => ({ ...f, attendance_to_date: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors['muted-foreground']}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Term</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={editForm.term}
              onChangeText={v => setEditForm(f => ({ ...f, term: v }))}
              placeholder="e.g. Term 1"
              placeholderTextColor={colors['muted-foreground']}
            />

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setEditForm(f => ({ ...f, publish_rank: !f.publish_rank }))}
            >
              <View style={[styles.checkbox, { backgroundColor: editForm.publish_rank ? '#556ee6' : 'transparent', borderColor: editForm.publish_rank ? '#556ee6' : borderCol }]}>
                {editForm.publish_rank && <Ionicons name="checkmark" size={12} color="white" />}
              </View>
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>Publish Rank</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: inputBg, borderColor: borderCol }]}
                onPress={() => setEditTarget(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors['muted-foreground'] }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#556ee6', borderColor: '#556ee6', opacity: updateMutation.isPending || !editForm.exam_name.trim() ? 0.5 : 1 }]}
                onPress={handleEditSave}
                disabled={updateMutation.isPending || !editForm.exam_name.trim()}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clone Modal */}
      <Modal visible={!!cloneTarget} animationType="slide" transparent onRequestClose={() => setCloneTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Clone Exam</Text>
            <Text style={[styles.modalHint, { color: colors['muted-foreground'] }]}>
              A copy of "{cloneTarget?.exam_name}" will be created without marks.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>New Exam Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
              value={cloneName}
              onChangeText={setCloneName}
              placeholder="New exam name"
              placeholderTextColor={colors['muted-foreground']}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: inputBg, borderColor: borderCol }]}
                onPress={() => setCloneTarget(null)}
              >
                <Text style={[styles.modalBtnText, { color: colors['muted-foreground'] }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#10B981', borderColor: '#10B981', opacity: cloneMutation.isPending || !cloneName.trim() ? 0.5 : 1 }]}
                onPress={handleClone}
                disabled={cloneMutation.isPending || !cloneName.trim()}
              >
                <Text style={[styles.modalBtnText, { color: 'white' }]}>
                  {cloneMutation.isPending ? 'Cloning…' : 'Clone'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  count: { fontSize: 12, marginBottom: 10 },
  card: {
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardMeta: { fontSize: 12 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  dateText: { fontSize: 12, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { padding: 6 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16,
  },
  createBtnText: { color: 'white', fontWeight: '600' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderRadius: 20, borderWidth: 1, padding: 20,
    marginHorizontal: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  modalHint: { fontSize: 12, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 4,
  },
  row: { flexDirection: 'row' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});
