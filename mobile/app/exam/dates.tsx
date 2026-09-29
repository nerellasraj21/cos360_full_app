import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';
import { DatePickerModal, TimePickerModal, formatTime12h } from '@/components/ui';
import { CustomDropdown } from '@/components/ui/dropdown';
import { useAuth, useTheme } from '@/contexts';
import {
  examDatesApi, examsApi, ExamClassSection, ExamDate, ExamDateCreateRequest,
  ExamListItem, ExamSubjectConfig,
} from '@/src/api/exam';
import { classSectionsApi, subjectsApi } from '@/src/api/masters';
import { getApiErrorMessage } from '@/src/utils/apiError';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { isAdminRole } from '../../src/lib/roles';

const EMPTY_FORM: ExamDateCreateRequest = {
  class_id: '',
  subject_id: '',
  exam_date: '',
  start_time: '',
  end_time: '',
  venue: '',
};

export default function ExamDatesScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { colors, theme } = useTheme();
  const { role } = useAuth();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  // Web parity (ExamDatesManager): scheduling exam dates is admin-only.
  // Non-admins (student/parent/teacher) now stay on this screen in a
  // read-only mode instead of being bounced back to the exam list — the
  // web app's "View All Dates" button pointed at a dead end otherwise.
  const isAdmin = isAdminRole(role?.name);

  const [searchQuery, setSearchQuery] = useState('');

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = isDark ? '#0f0f23' : '#f8fafc';

  const { confirm, modalProps } = useConfirmModal();
  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamDateCreateRequest>({ ...EMPTY_FORM });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_time' | 'end_time'>('start_time');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const openTimePicker = (field: 'start_time' | 'end_time') => {
    setActiveTimeField(field);
    setShowTimePicker(true);
  };
  const confirmTime = (time: string) => {
    setForm(f => ({ ...f, [activeTimeField]: time }));
    setShowTimePicker(false);
  };
  const confirmDate = (date: string) => {
    setForm(f => ({ ...f, exam_date: date }));
    setShowDatePicker(false);
  };

  // Web parity: exam date authorization is granted under the "exams" resource
  // — see mobile backend files/exam_date_endpoints.py. Both add and edit map
  // to the "update" action there (there is no separate "create" check).
  // Scheduling (create/update/delete) stays admin-only — everyone else gets
  // the read-only list below.
  const canCreate = isAdmin && hasPermission?.('exams', 'update');
  const canUpdate = isAdmin && hasPermission?.('exams', 'update');
  const canDelete = isAdmin && hasPermission?.('exams', 'delete');

  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: () => examsApi.list({ size: 50 }),
    enabled: !examId,
  });

  const { data: dates = [], isLoading } = useQuery({
    queryKey: ['exam-dates', selectedExamId],
    queryFn: () => examDatesApi.list(selectedExamId),
    enabled: !!selectedExamId,
  });

  // The exam's own configured class-sections & subjects — used to drive the
  // Class-Section / Subject pickers below instead of raw-UUID text entry.
  const { data: classSections = [] } = useQuery<ExamClassSection[]>({
    queryKey: ['exam-class-sections', selectedExamId],
    queryFn: () => examsApi.getClassSections(selectedExamId),
    enabled: !!selectedExamId,
  });

  const { data: subjectConfigs = [] } = useQuery<ExamSubjectConfig[]>({
    queryKey: ['exam-subject-configs', selectedExamId],
    queryFn: () => examsApi.getSubjectConfigs(selectedExamId),
    enabled: !!selectedExamId,
  });

  // Read-only mode: ExamDate doesn't carry class/section names, so resolve
  // them locally the same way the exam detail screen does.
  const { data: examDetail } = useQuery({
    queryKey: ['exam', selectedExamId],
    queryFn: () => examsApi.getById(selectedExamId),
    enabled: !!selectedExamId,
  });
  const { data: classList = [] } = useQuery({
    queryKey: ['class-sections-all', examDetail?.academic_year_id],
    queryFn: () => classSectionsApi.getClassSections({ active_only: false, academic_year_id: examDetail?.academic_year_id }),
    enabled: !!examDetail?.academic_year_id,
  });
  const { data: subjectList = [] } = useQuery({
    queryKey: ['subjects-all', examDetail?.academic_year_id],
    queryFn: () => subjectsApi.getSubjects({ active_only: false, academic_year_id: examDetail?.academic_year_id }),
    enabled: !!examDetail?.academic_year_id,
  });
  const classNameMap = useMemo(() => Object.fromEntries(classList.map((c: any) => [c.id, c.name])), [classList]);
  const sectionNameMap = useMemo(
    () => Object.fromEntries(classList.flatMap((c: any) => (c.sections ?? []).map((s: any) => [s.id, s.name]))),
    [classList],
  );
  const subjectNameMap = useMemo(() => Object.fromEntries(subjectList.map((s: any) => [s.id, s.name])), [subjectList]);
  const classLabel = (d: ExamDate) => {
    const sectionLabel = d.section_id ? sectionNameMap[d.section_id] : null;
    return [classNameMap[d.class_id] ?? d.class_id, sectionLabel].filter(Boolean).join(' – ');
  };

  const filteredDates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dates;
    return dates.filter(d =>
      (d.subject_name ?? subjectNameMap[d.subject_id] ?? '').toLowerCase().includes(q) ||
      classLabel(d).toLowerCase().includes(q) ||
      (d.venue ?? '').toLowerCase().includes(q),
    );
  }, [dates, searchQuery, subjectNameMap, classNameMap, sectionNameMap]);

  const csKey = (classId: string, sectionId?: string | null) => `${classId}|${sectionId ?? ''}`;
  const selectedCsKey = form.class_id ? csKey(form.class_id, form.section_id) : null;
  const subjectOptions = subjectConfigs
    .filter(sc => csKey(sc.class_id, sc.section_id) === selectedCsKey)
    .map(sc => ({ label: sc.subject_name ?? sc.subject_id, value: sc.subject_id }));

  const createMutation = useMutation({
    mutationFn: (data: ExamDateCreateRequest) => examDatesApi.create(selectedExamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-dates', selectedExamId] });
      setModalVisible(false);
      setForm({ ...EMPTY_FORM });
      showSuccess('Date Added', 'Exam date added successfully.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to add exam date.')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ dateId, data }: { dateId: string; data: Partial<ExamDateCreateRequest> }) =>
      examDatesApi.update(selectedExamId, dateId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-dates', selectedExamId] });
      setModalVisible(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      showSuccess('Updated', 'Exam date updated.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to update exam date.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (dateId: string) => examDatesApi.delete(selectedExamId, dateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-dates', selectedExamId] });
      showSuccess('Deleted', 'Exam date deleted.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to delete exam date.')),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setModalVisible(true);
  };

  const openEdit = (d: ExamDate) => {
    setEditingId(d.id);
    setForm({
      class_id: d.class_id,
      section_id: d.section_id,
      subject_id: d.subject_id,
      exam_date: d.exam_date,
      start_time: d.start_time ?? '',
      end_time: d.end_time ?? '',
      venue: d.venue ?? '',
    });
    setModalVisible(true);
  };

  const handleSubmit = () => {
    if (!form.class_id.trim()) { showError('Validation', 'Select a class-section.'); return; }
    if (!form.subject_id.trim()) { showError('Validation', 'Select a subject.'); return; }
    if (!form.exam_date.trim()) { showError('Validation', 'Select the exam date.'); return; }
    const payload = {
      ...form,
      start_time: form.start_time || undefined,
      end_time: form.end_time || undefined,
      venue: form.venue || undefined,
      section_id: form.section_id || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ dateId: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (d: ExamDate) => {
    confirm({
      title: 'Delete Date',
      message: `Delete schedule for ${d.subject_name ?? d.subject_id}?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(d.id),
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const renderDate = ({ item, index }: { item: ExamDate; index: number }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.iconBox, { backgroundColor: '#3B82F618' }]}>
        <Ionicons name="calendar" size={20} color="#3B82F6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
        <Text style={[styles.subjectText, { color: colors.foreground }]}>
          {item.subject_name ?? subjectNameMap[item.subject_id] ?? item.subject_id}
        </Text>
        {!!classLabel(item) && (
          <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
            {classLabel(item)}
          </Text>
        )}
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          {new Date(item.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          {item.start_time ? ` · ${formatTime12h(item.start_time)}` : ''}
          {item.end_time ? ` – ${formatTime12h(item.end_time)}` : ''}
        </Text>
        {item.venue && (
          <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
            📍 {item.venue}
          </Text>
        )}
      </View>
      <View style={styles.rowActions}>
        {canUpdate && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}
              accessibilityLabel="Edit">
            <Ionicons name="pencil-outline" size={18} color="#556ee6" />
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}
              accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <AppLayout title={isAdmin ? 'Exam Dates' : 'Exam Dates (View Only)'}>
      <View style={styles.container}>

        {/* Exam selector */}
        {!examId && (
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Select Exam</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {(Array.isArray(examsData) ? examsData : []).map((e: ExamListItem) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.chip, { backgroundColor: selectedExamId === e.id ? colors.primary : cardBg, borderColor: borderCol }]}
                  onPress={() => setSelectedExamId(e.id)}
                >
                  <Text style={[styles.chipText, { color: selectedExamId === e.id ? 'white' : colors['muted-foreground'] as string }]}>
                    {e.exam_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {!!selectedExamId && (
          <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
            <Ionicons name="search" size={16} color={colors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search subject, class, or venue..."
              placeholderTextColor={colors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
                <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {!selectedExamId ? (
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
              {isAdmin ? 'Select an exam to manage dates' : 'Select an exam to view dates'}
            </Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#556ee6" />
          </View>
        ) : (
          <FlatList
            data={filteredDates}
            keyExtractor={d => d.id}
            renderItem={renderDate}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="calendar-outline" size={40} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  {searchQuery ? 'No dates match your search.' : 'No exam dates scheduled yet'}
                </Text>
              </View>
            }
            ListHeaderComponent={
              filteredDates.length > 0
                ? <Text style={[styles.countText, { color: colors['muted-foreground'] }]}>{filteredDates.length} date{filteredDates.length !== 1 ? 's' : ''}</Text>
                : null
            }
          />
        )}

        {/* FAB */}
        {canCreate && !!selectedExamId && (
          <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate}
              accessibilityLabel="Add">
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: cardBg }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  {editingId ? 'Edit Exam Date' : 'Add Exam Date'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Class-Section *</Text>
              <CustomDropdown
                data={classSections.map(cs => ({
                  label: cs.section_name ? `${cs.class_name ?? cs.class_id} – ${cs.section_name}` : (cs.class_name ?? cs.class_id),
                  value: `${cs.class_id}|${cs.section_id ?? ''}`,
                }))}
                value={form.class_id ? `${form.class_id}|${form.section_id ?? ''}` : null}
                onChange={v => {
                  if (!v) return;
                  const [cid, sid] = String(v).split('|');
                  setForm(f => ({ ...f, class_id: cid, section_id: sid || undefined, subject_id: '' }));
                }}
                placeholder="Select class & section"
                search={false}
                containerStyle={{ marginBottom: 4 }}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Subject *</Text>
              <CustomDropdown
                data={subjectOptions}
                value={form.subject_id || null}
                onChange={v => setForm(f => ({ ...f, subject_id: v ? String(v) : '' }))}
                placeholder={form.class_id ? 'Select subject' : 'Select a class-section first'}
                search={false}
                disabled={!form.class_id}
                containerStyle={{ marginBottom: 4 }}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Exam Date *</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: form.exam_date ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
                  {form.exam_date || 'Tap to select date'}
                </Text>
                <Ionicons name="calendar-outline" size={16} color={colors['muted-foreground']} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Start Time (optional)</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => openTimePicker('start_time')}
              >
                <Text style={{ color: form.start_time ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
                  {formatTime12h(form.start_time ?? '') || 'Tap to set'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!!form.start_time && (
                    <TouchableOpacity onPress={() => setForm(f => ({ ...f, start_time: '' }))}
              accessibilityLabel="Close">
                      <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                </View>
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>End Time (optional)</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => openTimePicker('end_time')}
              >
                <Text style={{ color: form.end_time ? colors.foreground : colors['muted-foreground'], fontSize: 14 }}>
                  {formatTime12h(form.end_time ?? '') || 'Tap to set'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {!!form.end_time && (
                    <TouchableOpacity onPress={() => setForm(f => ({ ...f, end_time: '' }))}
              accessibilityLabel="Close">
                      <Ionicons name="close-circle" size={16} color={colors['muted-foreground']} />
                    </TouchableOpacity>
                  )}
                  <Ionicons name="time-outline" size={16} color={colors['muted-foreground']} />
                </View>
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Venue (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.venue ?? ''}
                onChangeText={v => setForm(f => ({ ...f, venue: v }))}
                placeholder="e.g. Room 101"
                placeholderTextColor={colors['muted-foreground']}
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: isPending ? colors.muted : colors.primary }]}
                onPress={handleSubmit}
                disabled={isPending}
              >
                <Ionicons name={editingId ? 'checkmark' : 'add'} size={18} color="white" />
                <Text style={styles.submitBtnText}>{isPending ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Date')}</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
      <TimePickerModal
        visible={showTimePicker}
        initialTime={form[activeTimeField] ?? ''}
        onConfirm={confirmTime}
        onCancel={() => setShowTimePicker(false)}
      />
      <DatePickerModal
        visible={showDatePicker}
        initialDate={form.exam_date || ''}
        onConfirm={confirmDate}
        onCancel={() => setShowDatePicker(false)}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 10, height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  countText: { fontSize: 12, marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1,
    padding: 12, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  subjectText: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  metaText: { fontSize: 12, marginBottom: 2 },
  rowActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12, marginTop: 20,
  },
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
