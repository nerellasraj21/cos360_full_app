import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { DatePickerModal } from '@/components/ui';
import CustomDropdown from '@/components/ui/dropdown';
import { useAuth, useTheme, useAcademicYear } from '@/contexts';
import { examsApi, ExamListItem, ExamStatus, ExamNature, ExamUpdateRequest } from '@/src/api/exam';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { isAdminRole } from '../../src/lib/roles';
import { useToastContext } from '@/components/ToastProvider';

const STATUS_COLORS: Record<ExamStatus, { bg: string; text: string }> = {
  draft:     { bg: '#6B728018', text: '#6B7280' },
  active:    { bg: '#3B82F618', text: '#3B82F6' },
  locked:    { bg: '#F59E0B18', text: '#F59E0B' },
  published: { bg: '#10B98118', text: '#10B981' },
  finalized: { bg: '#8B5CF618', text: '#8B5CF6' },
};

const STATUSES: { label: string; value: ExamStatus | '' }[] = [
  { label: 'All Status', value: '' },
  { label: 'Draft',      value: 'draft' },
  { label: 'Active',     value: 'active' },
  { label: 'Locked',     value: 'locked' },
  { label: 'Published',  value: 'published' },
  { label: 'Finalized',  value: 'finalized' },
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
  const { academicYears, activeAcademicYearId } = useAcademicYear();
  const { hasPermission } = useMobilePermission();

  // The /exams endpoint doesn't populate academic_year_title, so resolve the
  // academic_year_id to a readable title (e.g. "2025-26(2)") client-side.
  const yearTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const y of academicYears) map[y.id] = y.title;
    return map;
  }, [academicYears]);
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
  // Web parity (ExamList.tsx): create/edit/delete are gated by the admin role.
  const isAdmin = isAdminRole(roleName);

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
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [activeEditDateField, setActiveEditDateField] = useState<'deadline' | 'from' | 'to'>('deadline');
  const confirmEditDate = (date: string) => {
    if (activeEditDateField === 'deadline') setEditForm(f => ({ ...f, mark_entry_deadline: date }));
    if (activeEditDateField === 'from') setEditForm(f => ({ ...f, attendance_from_date: date }));
    if (activeEditDateField === 'to') setEditForm(f => ({ ...f, attendance_to_date: date }));
    setShowEditDatePicker(false);
  };

  // Endpoint mapping: scope the list to the active academic year, same as
  // the web app's ExamList (`selectedAcademicYearId` param on GET /exams).
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exams', activeAcademicYearId, statusFilter, natureFilter],
    queryFn: () => examsApi.list({
      academic_year_id: activeAcademicYearId ?? undefined,
      // Web parity (ExamList.tsx): no role-based status filter — students and
      // parents see the same exams as everyone else, filtered only by the
      // status dropdown. Previously forced to 'published', which hid the
      // active exams the web dashboard shows them.
      exam_status: (statusFilter as ExamStatus) || undefined,
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
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to update exam.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Deleted', 'Exam deleted.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to delete exam.')),
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

  const handleDelete = (exam: ExamListItem) => {
    confirm({
      title: 'Delete Exam?',
      message: `This will permanently delete "${exam.exam_name}" and all its dates. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(exam.id),
    });
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

  const renderItem = ({ item, index }: { item: ExamListItem; index: number }) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.draft;
    const yearLabel = item.academic_year_title ?? yearTitleById[item.academic_year_id];
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
          <View style={[styles.serialBadge, { backgroundColor: inputBg }]}>
            <Text style={[styles.serialBadgeText, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.exam_name}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors['muted-foreground'] }]}>Board</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>{item.board}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors['muted-foreground'] }]}>Type</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>{item.exam_type}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors['muted-foreground'] }]}>Level</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>{item.level.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors['muted-foreground'] }]}>Subjects</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>
              {(item.subject_config_count ?? 0) > 0 ? `${item.subject_config_count} subj.` : '—'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors['muted-foreground'] }]}>Nature</Text>
            <View style={[styles.natureBadge, { borderColor: borderCol }]}>
              <Text style={[styles.natureBadgeText, { color: colors.foreground }]} numberOfLines={1}>{item.nature}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: colors['muted-foreground'] }]}>Deadline</Text>
            <Text style={[styles.metaValue, { color: colors.foreground }]} numberOfLines={1}>{item.mark_entry_deadline ?? '—'}</Text>
          </View>
        </View>

        {!!yearLabel && (
          <Text style={[styles.yearLabel, { color: colors['muted-foreground'] }]}>{yearLabel}</Text>
        )}

        {/* Actions (admin only — no clone, matches web ExamList) */}
        {!isStudentOrParent && isAdmin && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={(e) => { e.stopPropagation?.(); openEdit(item); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Edit"
            >
              <Ionicons name="pencil-outline" size={14} color="#556ee6" />
              <Text style={[styles.actionBtnText, { color: '#556ee6' }]}>Edit</Text>
            </TouchableOpacity>
            {item.status === 'draft' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={(e) => { e.stopPropagation?.(); handleDelete(item); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete"
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {isStudentOrParent && (
          <View style={styles.studentFooter}>
            <Ionicons name="chevron-forward" size={16} color={colors['muted-foreground']} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <AppLayout title={isStudentOrParent ? 'My Exams' : 'Exam Management'}>
      <View style={styles.container}>

        {/* Page header — title + tagline + Create Exam button (web parity) */}
        {!isStudentOrParent && (
          <View style={styles.pageHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.pageTitleRow}>
                <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>Exam Management</Text>
              </View>
              <Text style={[styles.pageSubtitle, { color: colors['muted-foreground'] }]}>
                Manage all examinations for the academic year
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.createHeaderBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/exam/create' as any)}
                accessibilityLabel="Create Exam"
              >
                <Ionicons name="add" size={16} color="white" />
                <Text style={styles.createHeaderBtnText}>Create Exam</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
            <TouchableOpacity onPress={() => setSearch('')}
              accessibilityLabel="Close">
              <Ionicons name="close-circle" size={18} color={colors['muted-foreground']} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterSectionHeader}>
          <Ionicons name="filter-outline" size={14} color={colors['muted-foreground']} />
          <Text style={[styles.filterSectionText, { color: colors['muted-foreground'] }]}>Filters</Text>
        </View>
        <View style={styles.filterDropdownRow}>
          <View style={{ flex: 1 }}>
            <CustomDropdown
              data={STATUSES}
              value={statusFilter}
              onChange={(v) => setStatusFilter(((v ?? '') as ExamStatus | ''))}
              placeholder="All Status"
              search={false}
              containerStyle={styles.filterDropdownContainer}
            />
          </View>
          {!isStudentOrParent && (
            <View style={{ flex: 1 }}>
              <CustomDropdown
                data={NATURES}
                value={natureFilter}
                onChange={(v) => setNatureFilter(((v ?? '') as ExamNature | ''))}
                placeholder="All Nature"
                search={false}
                containerStyle={styles.filterDropdownContainer}
              />
            </View>
          )}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {search ? 'No matching exams' : 'No exams found'}
            </Text>
            {isAdmin && !search && (
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

            <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Mark Entry Deadline</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => { setActiveEditDateField('deadline'); setShowEditDatePicker(true); }}
            >
              <Text style={{ color: editForm.mark_entry_deadline ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
                {editForm.mark_entry_deadline || 'Tap to select date'}
              </Text>
              <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Attendance From</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => { setActiveEditDateField('from'); setShowEditDatePicker(true); }}
                >
                  <Text style={{ color: editForm.attendance_from_date ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
                    {editForm.attendance_from_date || 'Select'}
                  </Text>
                  <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Attendance To</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                  onPress={() => { setActiveEditDateField('to'); setShowEditDatePicker(true); }}
                >
                  <Text style={{ color: editForm.attendance_to_date ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
                    {editForm.attendance_to_date || 'Select'}
                  </Text>
                  <Ionicons name="calendar-outline" size={14} color={colors['muted-foreground']} />
                </TouchableOpacity>
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
        <DatePickerModal
          visible={showEditDatePicker}
          initialDate={
            activeEditDateField === 'deadline' ? editForm.mark_entry_deadline
              : activeEditDateField === 'from' ? editForm.attendance_from_date
              : editForm.attendance_to_date
          }
          onConfirm={confirmEditDate}
          onCancel={() => setShowEditDatePicker(false)}
        />
      </Modal>

      <ConfirmModal {...confirmProps} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 10, paddingHorizontal: 16, paddingTop: 16,
  },
  pageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageTitle: { fontSize: 18, fontWeight: '700' },
  pageSubtitle: { fontSize: 12, marginTop: 2 },
  createHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  createHeaderBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 16, marginBottom: 6 },
  filterSectionText: { fontSize: 12, fontWeight: '600' },
  filterDropdownRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filterDropdownContainer: { marginBottom: 0 },
  count: { fontSize: 12, marginBottom: 10 },
  card: {
    borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  serialBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  serialBadgeText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metaItem: { width: '33.33%', marginBottom: 8, paddingRight: 6 },
  metaLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: '500', textTransform: 'capitalize' },
  natureBadge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  natureBadgeText: { fontSize: 11, fontWeight: '500', textTransform: 'capitalize' },
  yearLabel: { fontSize: 11, marginBottom: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.15)', paddingTop: 8, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionBtnText: { fontSize: 12, fontWeight: '600' },
  studentFooter: { alignItems: 'flex-end' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 16,
  },
  createBtnText: { color: 'white', fontWeight: '600' },
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
