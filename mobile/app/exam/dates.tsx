import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert, FlatList, Modal, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { useTheme } from '@/contexts';
import {
  examDatesApi, examsApi, ExamDate, ExamDateCreateRequest, ExamListItem,
} from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

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
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = isDark ? '#0f0f23' : '#f8fafc';

  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamDateCreateRequest>({ ...EMPTY_FORM });

  const canCreate = hasPermission?.('exam_dates', 'create');
  const canUpdate = hasPermission?.('exam_dates', 'update');
  const canDelete = hasPermission?.('exam_dates', 'delete');

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

  const createMutation = useMutation({
    mutationFn: (data: ExamDateCreateRequest) => examDatesApi.create(selectedExamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-dates', selectedExamId] });
      setModalVisible(false);
      setForm({ ...EMPTY_FORM });
      showSuccess('Date Added', 'Exam date added successfully.');
    },
    onError: () => showError('Error', 'Failed to add exam date.'),
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
    onError: () => showError('Error', 'Failed to update exam date.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (dateId: string) => examDatesApi.delete(selectedExamId, dateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-dates', selectedExamId] });
      showSuccess('Deleted', 'Exam date deleted.');
    },
    onError: () => showError('Error', 'Failed to delete exam date.'),
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
    if (!form.subject_id.trim()) { showError('Validation', 'Subject ID is required.'); return; }
    if (!form.exam_date.trim()) { showError('Validation', 'Exam date is required (YYYY-MM-DD).'); return; }
    if (!form.class_id.trim()) { showError('Validation', 'Class ID is required.'); return; }
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
    Alert.alert('Delete Date', `Delete schedule for ${d.subject_name ?? d.subject_id}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(d.id) },
    ]);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const renderDate = ({ item }: { item: ExamDate }) => (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <View style={[styles.iconBox, { backgroundColor: '#3B82F618' }]}>
        <Ionicons name="calendar" size={20} color="#3B82F6" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.subjectText, { color: colors.foreground }]}>
          {item.subject_name ?? item.subject_id}
        </Text>
        <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
          {new Date(item.exam_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          {item.start_time ? ` · ${item.start_time}` : ''}
          {item.end_time ? ` – ${item.end_time}` : ''}
        </Text>
        {item.venue && (
          <Text style={[styles.metaText, { color: colors['muted-foreground'] }]}>
            📍 {item.venue}
          </Text>
        )}
      </View>
      <View style={styles.rowActions}>
        {canUpdate && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(item)}>
            <Ionicons name="pencil-outline" size={18} color="#556ee6" />
          </TouchableOpacity>
        )}
        {canDelete && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <AppLayout title="Exam Dates">
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

        {!selectedExamId ? (
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={48} color={colors['muted-foreground']} />
            <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select an exam to manage dates</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.centered}>
            <Text style={{ color: colors['muted-foreground'] }}>Loading dates…</Text>
          </View>
        ) : (
          <FlatList
            data={dates}
            keyExtractor={d => d.id}
            renderItem={renderDate}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Ionicons name="calendar-outline" size={40} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No exam dates scheduled yet</Text>
              </View>
            }
            ListHeaderComponent={
              dates.length > 0
                ? <Text style={[styles.countText, { color: colors['muted-foreground'] }]}>{dates.length} date{dates.length !== 1 ? 's' : ''}</Text>
                : null
            }
          />
        )}

        {/* FAB */}
        {canCreate && !!selectedExamId && (
          <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={openCreate}>
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
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Subject ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.subject_id}
                onChangeText={v => setForm(f => ({ ...f, subject_id: v }))}
                placeholder="Paste subject UUID"
                placeholderTextColor={colors['muted-foreground']}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Class ID *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.class_id}
                onChangeText={v => setForm(f => ({ ...f, class_id: v }))}
                placeholder="Paste class UUID"
                placeholderTextColor={colors['muted-foreground']}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Section ID (optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.section_id ?? ''}
                onChangeText={v => setForm(f => ({ ...f, section_id: v }))}
                placeholder="Leave blank for all sections"
                placeholderTextColor={colors['muted-foreground']}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Exam Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.exam_date}
                onChangeText={v => setForm(f => ({ ...f, exam_date: v }))}
                placeholder="2025-06-15"
                placeholderTextColor={colors['muted-foreground']}
                keyboardType="numbers-and-punctuation"
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Start Time (HH:MM, optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.start_time ?? ''}
                onChangeText={v => setForm(f => ({ ...f, start_time: v }))}
                placeholder="09:00"
                placeholderTextColor={colors['muted-foreground']}
              />

              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>End Time (HH:MM, optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, color: colors.foreground, borderColor: borderCol }]}
                value={form.end_time ?? ''}
                onChangeText={v => setForm(f => ({ ...f, end_time: v }))}
                placeholder="12:00"
                placeholderTextColor={colors['muted-foreground']}
              />

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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center' },
  countText: { fontSize: 12, marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', borderRadius: 14, borderWidth: 1,
    padding: 12, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
