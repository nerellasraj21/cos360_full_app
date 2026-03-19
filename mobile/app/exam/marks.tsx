import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import {
  examsApi, examMarksApi, ExamListItem, ExamSubjectConfig, ExamSubjectComponent,
} from '@/src/api/exam';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

interface LocalMark {
  marks: string;
  absent: boolean;
}

interface MergedRow {
  student_id: string;
  student_name?: string;
  admission_number?: string;
  subject_config_id: string;
  component_id: string;
  marks_obtained: number | null;
  is_absent: boolean;
}

export default function MarkEntryScreen() {
  const { examId } = useLocalSearchParams<{ examId?: string }>();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();
  const qc = useQueryClient();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [selectedSubjectConfigId, setSelectedSubjectConfigId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [localMarks, setLocalMarks] = useState<Record<string, LocalMark>>({});
  const [page] = useState(1);
  const PAGE_SIZE = 20;

  const canSave = hasPermission?.('exam_marks', 'create') || hasPermission?.('exam_marks', 'update');

  const { data: examsData } = useQuery({
    queryKey: ['exams', 'active'],
    queryFn: () => examsApi.list({ exam_status: 'active' }),
    enabled: !examId,
  });

  const [selectedExamId, setSelectedExamId] = useState<string>(examId ?? '');

  const { data: subjectConfigs } = useQuery({
    queryKey: ['exam-subject-configs', selectedExamId],
    queryFn: () => examsApi.getSubjectConfigs(selectedExamId),
    enabled: !!selectedExamId,
  });

  // Get components for selected subject config
  const selectedConfig: ExamSubjectConfig | undefined = useMemo(
    () => subjectConfigs?.find(sc => sc.id === selectedSubjectConfigId),
    [subjectConfigs, selectedSubjectConfigId],
  );

  const selectedComponent: ExamSubjectComponent | undefined = useMemo(
    () => selectedConfig?.components?.find(c => c.id === selectedComponentId),
    [selectedConfig, selectedComponentId],
  );

  const { data: marksGrid, isLoading } = useQuery({
    queryKey: ['exam-marks', selectedExamId, selectedSubjectConfigId, selectedComponentId, page],
    queryFn: () => examMarksApi.getMarksGrid(selectedExamId, {
      subject_config_id: selectedSubjectConfigId || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    enabled: !!selectedExamId && !!selectedSubjectConfigId,
  });

  // Filter marks for the selected component
  const mergedRows: MergedRow[] = useMemo(() => {
    if (!marksGrid) return [];
    // The grid may have multiple rows per student (one per component)
    const rows = marksGrid.students.filter(row =>
      !selectedComponentId || row.component_id === selectedComponentId
    );
    return rows.map(row => ({
      ...row,
      marks_obtained: localMarks[row.student_id + row.component_id]?.marks !== undefined
        ? (localMarks[row.student_id + row.component_id].marks === ''
          ? null
          : Number(localMarks[row.student_id + row.component_id].marks))
        : row.marks_obtained,
      is_absent: localMarks[row.student_id + row.component_id]?.absent ?? row.is_absent,
    }));
  }, [marksGrid, localMarks, selectedComponentId]);

  const saveMarksMutation = useMutation({
    mutationFn: () => {
      const changedRows = mergedRows.filter(row =>
        localMarks[row.student_id + row.component_id] !== undefined
      );
      const payload = {
        subject_config_id: selectedSubjectConfigId,
        marks: changedRows.map(row => ({
          student_id: row.student_id,
          component_id: row.component_id,
          marks_obtained: row.is_absent ? null : (row.marks_obtained ?? null),
          is_absent: row.is_absent,
        })),
        attempt_number: 1,
      };
      return examMarksApi.saveMarks(selectedExamId, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam-marks', selectedExamId] });
      setLocalMarks({});
      Alert.alert('Success', 'Marks saved successfully.');
    },
    onError: () => Alert.alert('Error', 'Failed to save marks. Please try again.'),
  });

  const handleSave = () => {
    if (!selectedExamId) { Alert.alert('Error', 'Please select an exam first.'); return; }
    if (!selectedSubjectConfigId) { Alert.alert('Error', 'Please select a subject first.'); return; }
    if (!selectedComponentId) { Alert.alert('Error', 'Please select a component first.'); return; }
    const changed = Object.keys(localMarks).length;
    if (changed === 0) { Alert.alert('No Changes', 'No marks have been modified.'); return; }
    saveMarksMutation.mutate();
  };

  const updateMark = (studentId: string, componentId: string, value: string) => {
    const key = studentId + componentId;
    setLocalMarks(prev => ({ ...prev, [key]: { ...prev[key], marks: value, absent: prev[key]?.absent ?? false } }));
  };

  const toggleAbsent = (studentId: string, componentId: string) => {
    const key = studentId + componentId;
    setLocalMarks(prev => ({
      ...prev,
      [key]: { marks: prev[key]?.marks ?? '', absent: !(prev[key]?.absent ?? false) },
    }));
  };

  const renderRow = ({ item }: { item: MergedRow }) => {
    const key = item.student_id + item.component_id;
    const local = localMarks[key];
    const isAbsent = local?.absent ?? item.is_absent;
    const marksVal = local?.marks !== undefined ? local.marks : (item.marks_obtained?.toString() ?? '');

    return (
      <View style={[styles.markRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: colors.foreground }]}>
            {item.student_name ?? item.student_id}
          </Text>
          {item.admission_number && (
            <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>{item.admission_number}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.absentToggle, { backgroundColor: isAbsent ? '#EF4444' : colors.muted }]}
          onPress={() => toggleAbsent(item.student_id, item.component_id)}
        >
          <Text style={[styles.absentText, { color: isAbsent ? 'white' : colors['muted-foreground'] as string }]}>
            {isAbsent ? 'AB' : 'P'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={[
            styles.marksInput,
            {
              backgroundColor: isAbsent ? colors.muted : colors.background,
              color: colors['card-foreground'] as string,
              borderColor: local !== undefined ? '#556ee6' : borderCol,
            },
          ]}
          value={isAbsent ? '' : marksVal}
          onChangeText={v => updateMark(item.student_id, item.component_id, v)}
          keyboardType="numeric"
          editable={!isAbsent}
          placeholder="–"
          placeholderTextColor={colors['muted-foreground'] as string}
        />
      </View>
    );
  };

  return (
    <AppLayout title="Mark Entry">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>

          {/* Exam Selector */}
          {!examId && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Exam</Text>
              <View style={styles.chips}>
                {(Array.isArray(examsData) ? examsData : []).map((e: ExamListItem) => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.chip, { backgroundColor: selectedExamId === e.id ? colors.primary : cardBg, borderColor: borderCol }]}
                    onPress={() => { setSelectedExamId(e.id); setSelectedSubjectConfigId(''); setSelectedComponentId(''); setLocalMarks({}); }}
                  >
                    <Text style={[styles.chipText, { color: selectedExamId === e.id ? 'white' : colors['muted-foreground'] as string }]}>
                      {e.exam_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Subject Selector */}
          {subjectConfigs && subjectConfigs.length > 0 && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Subject</Text>
              <View style={styles.chips}>
                {subjectConfigs.map(sc => (
                  <TouchableOpacity
                    key={sc.id}
                    style={[styles.chip, { backgroundColor: selectedSubjectConfigId === sc.id ? colors.primary : cardBg, borderColor: borderCol }]}
                    onPress={() => { setSelectedSubjectConfigId(sc.id); setSelectedComponentId(''); setLocalMarks({}); }}
                  >
                    <Text style={[styles.chipText, { color: selectedSubjectConfigId === sc.id ? 'white' : colors['muted-foreground'] as string }]}>
                      {sc.subject_name ?? sc.subject_id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Component Selector */}
          {selectedConfig && selectedConfig.components && selectedConfig.components.length > 0 && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Component</Text>
              <View style={styles.chips}>
                {selectedConfig.components.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, { backgroundColor: selectedComponentId === c.id ? colors.primary : cardBg, borderColor: borderCol }]}
                    onPress={() => { setSelectedComponentId(c.id); setLocalMarks({}); }}
                  >
                    <Text style={[styles.chipText, { color: selectedComponentId === c.id ? 'white' : colors['muted-foreground'] as string }]}>
                      {c.component_name}{c.max_marks ? ` (/${c.max_marks})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Column Headers */}
          {!!selectedExamId && !!selectedSubjectConfigId && !!selectedComponentId && (
            <View style={[styles.headerRow, { backgroundColor: colors.muted }]}>
              <Text style={[styles.headerCell, { flex: 1, color: colors['muted-foreground'] }]}>Student</Text>
              <Text style={[styles.headerCell, { width: 44, color: colors['muted-foreground'] }]}>Status</Text>
              <Text style={[styles.headerCell, { width: 72, textAlign: 'center', color: colors['muted-foreground'] }]}>
                Marks{selectedComponent?.max_marks ? `/${selectedComponent.max_marks}` : ''}
              </Text>
            </View>
          )}

          {/* Marks List */}
          {isLoading ? (
            <View style={styles.centered}>
              <Text style={{ color: colors['muted-foreground'] }}>Loading students…</Text>
            </View>
          ) : !selectedExamId ? (
            <View style={styles.centered}>
              <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select an exam to begin</Text>
            </View>
          ) : !selectedSubjectConfigId ? (
            <View style={styles.centered}>
              <Ionicons name="book-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select a subject</Text>
            </View>
          ) : !selectedComponentId ? (
            <View style={styles.centered}>
              <Ionicons name="list-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select a component</Text>
            </View>
          ) : mergedRows.length === 0 ? (
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No students found</Text>
            </View>
          ) : (
            <FlatList
              data={mergedRows}
              keyExtractor={item => item.student_id + item.component_id}
              renderItem={renderRow}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 100 }}
            />
          )}

          {/* Save Bar */}
          {canSave && !!selectedExamId && !!selectedSubjectConfigId && !!selectedComponentId && mergedRows.length > 0 && (
            <View style={[styles.saveBar, { backgroundColor: colors.background, borderTopColor: borderCol }]}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: saveMarksMutation.isPending ? colors.muted : colors.primary }]}
                onPress={handleSave}
                disabled={saveMarksMutation.isPending}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.saveBtnText}>
                  {saveMarksMutation.isPending ? 'Saving…' : `Save Marks (${Object.keys(localMarks).length} changed)`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, marginTop: 8, borderRadius: 8,
  },
  headerCell: { fontSize: 12, fontWeight: '700' },
  markRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6,
    borderRadius: 12, borderWidth: 1, padding: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  studentName: { fontSize: 13, fontWeight: '600' },
  admNo: { fontSize: 11, marginTop: 2 },
  absentToggle: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  absentText: { fontSize: 11, fontWeight: '700' },
  marksInput: {
    width: 64, height: 36, borderWidth: 1, borderRadius: 8,
    textAlign: 'center', fontSize: 14, fontWeight: '600',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14 },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: 12,
  },
  saveBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
