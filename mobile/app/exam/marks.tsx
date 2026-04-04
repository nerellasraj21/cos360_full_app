import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useState, useMemo } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme } from '@/contexts';
import {
  examsApi, examMarksApi, ExamListItem, ExamSubjectConfig, ExamSubjectComponent,
  MarkUploadResponse,
} from '@/src/api/exam';
import apiClient from '@/src/api/client';
// expo-file-system used for authenticated Excel download — Linking.openURL cannot send auth headers
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getValidAccessToken, getClientSchema } from '../../services/authUtils';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';

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
  const { showSuccess, showError, showWarning } = useToastContext();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';

  const [selectedSubjectConfigId, setSelectedSubjectConfigId] = useState<string>('');
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [localMarks, setLocalMarks] = useState<Record<string, LocalMark>>({});
  const [page] = useState(1);
  const PAGE_SIZE = 20;

  const canSave = hasPermission?.('exam_marks', 'create') || hasPermission?.('exam_marks', 'update');
  const [isUploading, setIsUploading] = useState(false);

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
      showSuccess('Marks Saved', 'Marks saved successfully.');
    },
    onError: () => showError('Error', 'Failed to save marks. Please try again.'),
  });

  const handleDownloadTemplate = async () => {
    if (!selectedExamId || !selectedSubjectConfigId) {
      showError('Select first', 'Please select an exam and subject first.');
      return;
    }
    try {
      // Must use FileSystem.downloadAsync (not Linking.openURL) — backend requires Authorization header
      const token = await getValidAccessToken(false);
      const schema = await getClientSchema();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (schema) headers.cschema = schema;

      const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
      const url = `${baseUrl}/exams/${selectedExamId}/marks/template?subject_config_id=${selectedSubjectConfigId}`;
      const localUri = FileSystem.documentDirectory + 'marks_template.xlsx';
      const result = await FileSystem.downloadAsync(url, localUri, { headers });
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    } catch {
      showError('Error', 'Could not download template. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedExamId || !selectedSubjectConfigId) {
      showError('Select first', 'Please select an exam and subject first.');
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setIsUploading(true);
      const form = new FormData();
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'text/csv' } as any);
      const response = await apiClient.post<MarkUploadResponse>(
        `/exams/${selectedExamId}/marks/upload`,
        form,
        { params: { subject_config_id: selectedSubjectConfigId }, headers: { 'Content-Type': 'multipart/form-data' } },
      );
      qc.invalidateQueries({ queryKey: ['exam-marks', selectedExamId] });
      setLocalMarks({});
      const res = response.data;
      showSuccess('Upload Complete', `${res.written} marks written${res.errors.length ? `, ${res.errors.length} error(s)` : ''}.`);
    } catch {
      showError('Upload Failed', 'Could not upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    if (!selectedExamId) { showError('Error', 'Please select an exam first.'); return; }
    if (!selectedSubjectConfigId) { showError('Error', 'Please select a subject first.'); return; }
    if (!selectedComponentId) { showError('Error', 'Please select a component first.'); return; }
    const changed = Object.keys(localMarks).length;
    if (changed === 0) { showWarning('No Changes', 'No marks have been modified.'); return; }
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
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

          {/* Bulk Actions */}
          {canSave && !!selectedExamId && !!selectedSubjectConfigId && (
            <View style={styles.bulkRow}>
              <TouchableOpacity style={[styles.bulkBtn, { borderColor: '#556ee6' }]} onPress={handleDownloadTemplate}>
                <Ionicons name="download-outline" size={14} color="#556ee6" />
                <Text style={[styles.bulkBtnText, { color: '#556ee6' }]}>Template</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bulkBtn, { borderColor: '#10B981' }]} onPress={handleUpload} disabled={isUploading}>
                <Ionicons name="cloud-upload-outline" size={14} color="#10B981" />
                <Text style={[styles.bulkBtnText, { color: '#10B981' }]}>{isUploading ? 'Uploading…' : 'Upload CSV'}</Text>
              </TouchableOpacity>
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
              keyExtractor={(item, index) => (item.student_id && item.component_id) ? item.student_id + item.component_id : String(index)}
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
  bulkRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  bulkBtnText: { fontSize: 12, fontWeight: '600' },
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
