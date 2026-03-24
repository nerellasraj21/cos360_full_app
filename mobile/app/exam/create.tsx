import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import { examsApi, ExamCreateRequest, ExamNature, ExamLevel, ExamBoard } from '@/src/api/exam';
import { useToastContext } from '@/components/ToastProvider';

const EXAM_NATURES: { label: string; value: ExamNature }[] = [
  { label: 'Formative',  value: 'formative' },
  { label: 'Summative',  value: 'summative' },
  { label: 'Cumulative', value: 'cumulative' },
  { label: 'Custom',     value: 'custom' },
];

const EXAM_BOARDS: { label: string; value: ExamBoard }[] = [
  { label: 'CBSE',   value: 'CBSE' },
  { label: 'ICSE',   value: 'ICSE' },
  { label: 'State',  value: 'State' },
  { label: 'BTech',  value: 'BTech' },
  { label: 'Custom', value: 'Custom' },
];

const EXAM_LEVELS: { label: string; value: ExamLevel }[] = [
  { label: 'Pre Primary',  value: 'pre_primary' },
  { label: 'Primary',      value: 'primary' },
  { label: 'Upper Primary',value: 'upper_primary' },
  { label: 'Secondary',    value: 'secondary' },
  { label: 'Inter',        value: 'inter' },
  { label: 'Diploma',      value: 'diploma' },
];

export default function CreateExamScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const isEdit = !!examId;
  const router = useRouter();
  const { colors, theme } = useTheme();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#e9ecef';

  const [examName, setExamName] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [board, setBoard] = useState<ExamBoard>('CBSE');
  const [level, setLevel] = useState<ExamLevel>('secondary');
  const [examType, setExamType] = useState('');
  const [nature, setNature] = useState<ExamNature>('formative');
  const [markEntryDeadline, setMarkEntryDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: existingExam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getById(examId!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingExam) {
      setExamName(existingExam.exam_name);
      setAcademicYearId(existingExam.academic_year_id);
      setBoard((existingExam.board as ExamBoard) || 'CBSE');
      setLevel((existingExam.level as ExamLevel) || 'secondary');
      setExamType(existingExam.exam_type);
      setNature(existingExam.nature || 'formative');
      setMarkEntryDeadline(existingExam.mark_entry_deadline ?? '');
    }
  }, [existingExam]);

  const createMutation = useMutation({
    mutationFn: (data: ExamCreateRequest) => examsApi.create(data),
    onSuccess: exam => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Exam Created', 'Exam created successfully.');
      router.replace(`/exam/${exam.id}` as any);
    },
    onError: () => showError('Error', 'Failed to create exam. Please try again.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ExamCreateRequest) => examsApi.update(examId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', examId] });
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Exam Updated', 'Exam updated successfully.');
      router.back();
    },
    onError: () => showError('Error', 'Failed to update exam. Please try again.'),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!examName.trim())       e.examName = 'Exam name is required';
    if (!academicYearId.trim()) e.academicYearId = 'Academic Year ID is required';
    if (!examType.trim())       e.examType = 'Exam type is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload: ExamCreateRequest = {
      exam_name: examName.trim(),
      academic_year_id: academicYearId.trim(),
      board,
      level,
      exam_type: examType.trim(),
      nature,
      mark_entry_deadline: markEntryDeadline || undefined,
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout title={isEdit ? 'Edit Exam' : 'Create Exam'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* Exam Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Exam Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: colors['card-foreground'] as string, borderColor: errors.examName ? '#EF4444' : borderCol }]}
              placeholder="e.g. Term 1 Unit Test"
              placeholderTextColor={colors['muted-foreground'] as string}
              value={examName}
              onChangeText={t => { setExamName(t); setErrors(p => ({ ...p, examName: '' })); }}
            />
            {errors.examName && <Text style={styles.error}>{errors.examName}</Text>}
          </View>

          {/* Academic Year ID */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Academic Year ID *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: colors['card-foreground'] as string, borderColor: errors.academicYearId ? '#EF4444' : borderCol }]}
              placeholder="Paste academic year UUID"
              placeholderTextColor={colors['muted-foreground'] as string}
              value={academicYearId}
              onChangeText={t => { setAcademicYearId(t); setErrors(p => ({ ...p, academicYearId: '' })); }}
            />
            {errors.academicYearId && <Text style={styles.error}>{errors.academicYearId}</Text>}
          </View>

          {/* Exam Type */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Exam Type * (e.g. Unit Test, Quarterly)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: colors['card-foreground'] as string, borderColor: errors.examType ? '#EF4444' : borderCol }]}
              placeholder="e.g. Unit Test"
              placeholderTextColor={colors['muted-foreground'] as string}
              value={examType}
              onChangeText={t => { setExamType(t); setErrors(p => ({ ...p, examType: '' })); }}
            />
            {errors.examType && <Text style={styles.error}>{errors.examType}</Text>}
          </View>

          {/* Board */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Board *</Text>
            <View style={styles.chipRow}>
              {EXAM_BOARDS.map(b => (
                <TouchableOpacity
                  key={b.value}
                  style={[styles.chip, { backgroundColor: board === b.value ? colors.primary : cardBg, borderColor: board === b.value ? colors.primary : borderCol }]}
                  onPress={() => setBoard(b.value)}
                >
                  <Text style={[styles.chipText, { color: board === b.value ? 'white' : colors['muted-foreground'] as string }]}>
                    {b.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Level */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Level *</Text>
            <View style={styles.chipRow}>
              {EXAM_LEVELS.map(l => (
                <TouchableOpacity
                  key={l.value}
                  style={[styles.chip, { backgroundColor: level === l.value ? colors.primary : cardBg, borderColor: level === l.value ? colors.primary : borderCol }]}
                  onPress={() => setLevel(l.value)}
                >
                  <Text style={[styles.chipText, { color: level === l.value ? 'white' : colors['muted-foreground'] as string }]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Nature */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Nature *</Text>
            <View style={styles.chipRow}>
              {EXAM_NATURES.map(n => (
                <TouchableOpacity
                  key={n.value}
                  style={[styles.chip, { backgroundColor: nature === n.value ? colors.primary : cardBg, borderColor: nature === n.value ? colors.primary : borderCol }]}
                  onPress={() => setNature(n.value)}
                >
                  <Text style={[styles.chipText, { color: nature === n.value ? 'white' : colors['muted-foreground'] as string }]}>
                    {n.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Mark Entry Deadline */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Mark Entry Deadline (YYYY-MM-DD, optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: cardBg, color: colors['card-foreground'] as string, borderColor: borderCol }]}
              placeholder="2025-06-30"
              placeholderTextColor={colors['muted-foreground'] as string}
              value={markEntryDeadline}
              onChangeText={setMarkEntryDeadline}
              keyboardType="numeric"
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: isSubmitting ? colors.muted : colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Text style={styles.submitBtnText}>Saving…</Text>
            ) : (
              <>
                <Ionicons name={isEdit ? 'checkmark' : 'add'} size={20} color="white" />
                <Text style={styles.submitBtnText}>{isEdit ? 'Save Changes' : 'Create Exam'}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  fieldGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
  },
  error: { color: '#EF4444', fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16, borderRadius: 12, marginTop: 8,
  },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
