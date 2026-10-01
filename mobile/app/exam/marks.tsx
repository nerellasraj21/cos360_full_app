import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout, ScreenAccessGate } from '@/components';
import { useTheme } from '@/contexts';
import {
  examsApi, examMarksApi, ExamListItem, ExamSubjectConfig, ExamSubjectComponent,
  MarksGrid, MarkUploadResponse,
} from '@/src/api/exam';
import { subjectsApi, classSectionsApi } from '@/src/api/masters';
import apiClient from '@/src/api/client';
// expo-file-system used for authenticated Excel download — Linking.openURL cannot send auth headers.
// SDK 54: documentDirectory/downloadAsync live in the /legacy export (matches fees/receipts.tsx).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getValidAccessToken } from '../../services/authUtils';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';
import { useToastContext } from '@/components/ToastProvider';
import { getApiErrorMessage } from '@/src/utils/apiError';

interface LocalMark {
  marks: string;
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

interface RosterStudent {
  student_id: string;
  student_name?: string;
  admission_number?: string;
}

interface SummaryGroup {
  key: string;
  class_id: string;
  section_id?: string;
  configs: ExamSubjectConfig[];
}

const EMPTY_STUDENT_SET: Set<string> = new Set();
const PAGE_SIZE = 200;

function MarkEntryScreenContent() {
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

  // Student picker — web lets you check off which students to enter marks for
  // via a side panel; mobile doesn't have the width for that alongside a
  // subject/component grid, so it's a modal instead. Selection is scoped per
  // class-section GROUP (not per subject) so it stays put as you move between
  // that group's subjects — which is what lets the Grand Total below add up
  // across subjects for the same set of students, same as the web table.
  const [studentSelectionByGroup, setStudentSelectionByGroup] = useState<Record<string, Set<string>>>({});
  const [studentPickerOpenFor, setStudentPickerOpenFor] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');

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
  const allConfigs = useMemo(() => subjectConfigs ?? [], [subjectConfigs]);

  // Resolve subject names — the subject-config endpoint returns only IDs, so map
  // them via the subjects master scoped to THIS exam's academic year (cached from detail screen).
  const { data: examDetail } = useQuery({
    queryKey: ['exam', selectedExamId],
    queryFn: () => examsApi.getById(selectedExamId),
    enabled: !!selectedExamId,
  });
  const { data: subjectList = [] } = useQuery({
    queryKey: ['subjects-all', examDetail?.academic_year_id],
    queryFn: () => subjectsApi.getSubjects({ active_only: false, academic_year_id: examDetail?.academic_year_id }),
    enabled: !!examDetail?.academic_year_id,
  });
  const subjectNameMap = Object.fromEntries(subjectList.map(s => [s.id, s.name]));

  // Class/section names for the summary headers (same scoping as subjects)
  const { data: classList = [] } = useQuery({
    queryKey: ['class-sections-all', examDetail?.academic_year_id],
    queryFn: () => classSectionsApi.getClassSections({ active_only: false, academic_year_id: examDetail?.academic_year_id }),
    enabled: !!examDetail?.academic_year_id,
  });
  const classNameMap = Object.fromEntries(classList.map(c => [c.id, c.name]));
  const sectionNameMap = Object.fromEntries(classList.flatMap(c => (c.sections ?? []).map(s => [s.id, s.name])));
  const csLabel = (classId: string, sectionId?: string) =>
    [classNameMap[classId], sectionId ? sectionNameMap[sectionId] : null].filter(Boolean).join(' – ') || 'Class';
  const subjectLabel = (cfg: ExamSubjectConfig) =>
    cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? 'Subject';
  const totalComponentsOf = (cfg: ExamSubjectConfig) =>
    cfg.components.filter(c => c.include_in_total && c.entry_type === 'marks');
  const totalMarks = (cfg: ExamSubjectConfig) =>
    totalComponentsOf(cfg).reduce((sum, c) => sum + Number(c.max_marks ?? 0), 0);

  // Group subject-configs by class-section for the web-style summary
  const summaryGroups: SummaryGroup[] = useMemo(() => {
    const map = new Map<string, SummaryGroup>();
    for (const cfg of allConfigs) {
      const key = `${cfg.class_id}|${cfg.section_id ?? ''}`;
      if (!map.has(key)) map.set(key, { key, class_id: cfg.class_id, section_id: cfg.section_id, configs: [] });
      map.get(key)!.configs.push(cfg);
    }
    return Array.from(map.values());
  }, [allConfigs]);

  // Get components for selected subject config
  const selectedConfig: ExamSubjectConfig | undefined = useMemo(
    () => allConfigs.find(sc => sc.id === selectedSubjectConfigId),
    [allConfigs, selectedSubjectConfigId],
  );
  const activeGroupKey = selectedConfig ? `${selectedConfig.class_id}|${selectedConfig.section_id ?? ''}` : '';

  const selectedComponent: ExamSubjectComponent | undefined = useMemo(
    () => selectedConfig?.components?.find(c => c.id === selectedComponentId),
    [selectedConfig, selectedComponentId],
  );

  const selectConfig = (cfg: ExamSubjectConfig) => {
    setSelectedSubjectConfigId(cfg.id);
    // Auto-select the first component so the student grid shows immediately on
    // "Enter Marks" (web parity). For multi-component subjects the user can still
    // switch between components via the chips above the grid.
    setSelectedComponentId(cfg.components?.[0]?.id ?? '');
    // NOTE: student selection and any unsaved marks are intentionally left as-is
    // when switching subject/component — they're keyed per (student, component)
    // and per class-section group, so nothing collides, and clearing them would
    // wipe the running Total/Grand Total the moment you moved to the next subject.
  };

  const backToSummary = () => {
    setSelectedSubjectConfigId('');
    setSelectedComponentId('');
  };

  // Fetch every subject-config's mark grid for the whole exam up front (not
  // just the currently-open one). This is what lets the Grand Total on the
  // summary screen add up "live" across subjects the way the web table does
  // in one glance — each card's totals fill in progressively as its
  // background fetches resolve. Fine for the typical handful of
  // class-sections/subjects a school runs per exam; a very large exam could
  // reconsider fetching per-group-on-demand instead.
  const marksQueries = useQueries({
    queries: allConfigs.map(cfg => ({
      queryKey: ['exam-marks', selectedExamId, cfg.id, cfg.class_id, cfg.section_id, page],
      queryFn: () => examMarksApi.getMarksGrid(selectedExamId, {
        class_id: cfg.class_id,
        section_id: cfg.section_id,
        subject_config_id: cfg.id,
        page,
        page_size: PAGE_SIZE,
      }),
      enabled: !!selectedExamId,
    })),
  });

  const marksGridByConfig = useMemo(() => {
    const map = new Map<string, MarksGrid | undefined>();
    allConfigs.forEach((cfg, i) => map.set(cfg.id, marksQueries[i]?.data));
    return map;
  }, [allConfigs, marksQueries]);

  const marksGrid = selectedSubjectConfigId ? marksGridByConfig.get(selectedSubjectConfigId) : undefined;
  const isLoading = (() => {
    const idx = allConfigs.findIndex(c => c.id === selectedSubjectConfigId);
    return idx >= 0 ? !!marksQueries[idx]?.isLoading : false;
  })();

  // Roster per class-section group, deduped across all of that group's
  // subjects — powers both the student-picker modal and the "X/Y selected"
  // chips (summary card + subject-entry screen).
  const rosterByGroup = useMemo(() => {
    const map = new Map<string, RosterStudent[]>();
    for (const group of summaryGroups) {
      const seen = new Map<string, RosterStudent>();
      for (const cfg of group.configs) {
        for (const row of marksGridByConfig.get(cfg.id)?.students ?? []) {
          if (!seen.has(row.student_id)) {
            seen.set(row.student_id, {
              student_id: row.student_id,
              student_name: row.student_name,
              admission_number: row.admission_number,
            });
          }
        }
      }
      map.set(group.key, Array.from(seen.values()));
    }
    return map;
  }, [summaryGroups, marksGridByConfig]);

  // Default each group to "all students selected" the first time its roster
  // loads (matches web's Select-all-checked-by-default). Only fires once per
  // group so it doesn't stomp on manual unchecks when queries silently
  // refetch (e.g. after Save invalidates them).
  const initializedGroupsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const group of summaryGroups) {
      if (initializedGroupsRef.current.has(group.key)) continue;
      const roster = rosterByGroup.get(group.key) ?? [];
      if (roster.length === 0) continue;
      initializedGroupsRef.current.add(group.key);
      setStudentSelectionByGroup(prev => ({ ...prev, [group.key]: new Set(roster.map(s => s.student_id)) }));
    }
  }, [summaryGroups, rosterByGroup]);

  const activeRoster = rosterByGroup.get(activeGroupKey) ?? [];
  const activeSelectedStudentIds = studentSelectionByGroup[activeGroupKey] ?? EMPTY_STUDENT_SET;

  const openStudentPicker = (groupKey: string) => {
    setStudentSearch('');
    setStudentPickerOpenFor(groupKey);
  };

  const toggleStudent = (groupKey: string, studentId: string) => {
    setStudentSelectionByGroup(prev => {
      const current = prev[groupKey] ?? new Set<string>();
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId); else next.add(studentId);
      return { ...prev, [groupKey]: next };
    });
  };

  const toggleSelectAllStudents = (groupKey: string, roster: RosterStudent[]) => {
    setStudentSelectionByGroup(prev => {
      const current = prev[groupKey] ?? new Set<string>();
      const allSelected = roster.length > 0 && current.size === roster.length;
      return { ...prev, [groupKey]: allSelected ? new Set() : new Set(roster.map(s => s.student_id)) };
    });
  };

  // Live value for one (student, component) cell — an unsaved edit wins over
  // whatever the server last returned. Same lookup powers the grid input,
  // the per-subject Total column, and the summary screen's Grand Total, so
  // typing anywhere updates all three immediately (web parity).
  const componentValue = (cfgId: string, studentId: string, componentId: string): number | null => {
    const local = localMarks[studentId + componentId];
    if (local !== undefined) return local.marks === '' ? null : Number(local.marks);
    const row = marksGridByConfig.get(cfgId)?.students.find(
      s => s.student_id === studentId && s.component_id === componentId,
    );
    return row?.marks_obtained ?? null;
  };

  const subjectTotalForStudent = (cfg: ExamSubjectConfig, studentId: string): number | null => {
    const comps = totalComponentsOf(cfg);
    if (comps.length === 0) return null;
    let sum = 0; let any = false;
    for (const c of comps) {
      const v = componentValue(cfg.id, studentId, c.id);
      if (v !== null && !Number.isNaN(v)) { sum += v; any = true; }
    }
    return any ? sum : null;
  };

  const grandTotalForStudent = (group: SummaryGroup, studentId: string): number | null => {
    let sum = 0; let any = false;
    for (const cfg of group.configs) {
      const t = subjectTotalForStudent(cfg, studentId);
      if (t !== null) { sum += t; any = true; }
    }
    return any ? sum : null;
  };

  const groupMaxTotal = (group: SummaryGroup) => group.configs.reduce((s, c) => s + totalMarks(c), 0);

  // Filter marks to the selected component AND the checked students — mobile
  // isolates entry to one subject + one component + the chosen students at a
  // time (screen-width constraint), unlike web's single all-in-one grid.
  const mergedRows: MergedRow[] = useMemo(() => {
    // Guard against any unexpected response shape so the screen never crashes
    // (the normalized grid always provides `students`, but be defensive).
    const gridStudents = marksGrid?.students ?? [];
    if (gridStudents.length === 0) return [];
    const selectedIds = studentSelectionByGroup[activeGroupKey] ?? EMPTY_STUDENT_SET;
    // The grid may have multiple rows per student (one per component)
    const rows = gridStudents.filter(row =>
      (!selectedComponentId || row.component_id === selectedComponentId) &&
      selectedIds.has(row.student_id)
    );
    return rows.map(row => ({
      ...row,
      marks_obtained: localMarks[row.student_id + row.component_id]?.marks !== undefined
        ? (localMarks[row.student_id + row.component_id].marks === ''
          ? null
          : Number(localMarks[row.student_id + row.component_id].marks))
        : row.marks_obtained,
      // Absence is read-only here (reflects whatever was already saved for that
      // student/subject) — there's no control on this screen to toggle it.
      is_absent: row.is_absent,
    }));
  }, [marksGrid, localMarks, selectedComponentId, studentSelectionByGroup, activeGroupKey]);

  const pendingRows = mergedRows.filter(row => localMarks[row.student_id + row.component_id] !== undefined);

  const saveMarksMutation = useMutation({
    mutationFn: (changedRows: MergedRow[]) => {
      const payload = {
        // Backend requires exam_id in the body too, not just the URL — matches
        // web's batchSaveMarks (src/api/exam/index.ts). Omitting it is what
        // produced the "Field required" 422.
        exam_id: selectedExamId,
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
    onSuccess: async (_data, changedRows) => {
      // Await the refetch BEFORE clearing local values — otherwise the just-saved
      // cells briefly (or, on a slow/failed background refetch, indefinitely)
      // show blank: local edits are gone but the query cache hasn't caught up
      // with the server yet, so componentValue() falls back to stale/absent data.
      await qc.invalidateQueries({ queryKey: ['exam-marks', selectedExamId] });
      // Only clear the entries that were just saved — other subjects' unsaved
      // edits (and their contribution to the Grand Total) must survive.
      setLocalMarks(prev => {
        const next = { ...prev };
        for (const row of changedRows) delete next[row.student_id + row.component_id];
        return next;
      });
      showSuccess('Marks Saved', 'Marks saved successfully.');
    },
    onError: (err: any) => showError('Error', getApiErrorMessage(err, 'Failed to save marks. Please try again.')),
  });

  const handleDownloadTemplate = async () => {
    if (!selectedExamId || !selectedSubjectConfigId || !selectedConfig) {
      showError('Select first', 'Please select an exam and subject first.');
      return;
    }
    try {
      // class_id/section_id are required by the backend (same contract as web's
      // getMarkTemplate) — omitting them, as this used to, produces a 422
      // "Field required" the same way the missing exam_id did for Save Marks.
      const params: Record<string, string> = {
        class_id: selectedConfig.class_id,
        subject_config_id: selectedSubjectConfigId,
      };
      if (selectedConfig.section_id) params.section_id = selectedConfig.section_id;

      // expo-file-system's downloadAsync/documentDirectory (used below) are
      // native-only — they don't exist on web (Expo web preview included), so
      // that path silently fails there. Same fix as fees/receipts.tsx: fetch
      // the file as a blob through the normal axios client and hand it to the
      // browser via an object URL + synthetic <a download>.
      if (Platform.OS === 'web') {
        const response = await apiClient.get(`/exams/${selectedExamId}/marks/template`, {
          params,
          responseType: 'blob',
        });
        const w = globalThis as any;
        const url = w.URL.createObjectURL(response.data);
        const a = w.document.createElement('a');
        a.href = url;
        a.download = 'marks_template.xlsx';
        w.document.body.appendChild(a);
        a.click();
        a.remove();
        w.URL.revokeObjectURL(url);
        return;
      }

      // Must use FileSystem.downloadAsync (not Linking.openURL) — backend requires Authorization header
      const token = await getValidAccessToken(false);
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
      const query = new URLSearchParams(params);
      const url = `${baseUrl}/exams/${selectedExamId}/marks/template?${query.toString()}`;
      const localUri = FileSystem.documentDirectory + 'marks_template.xlsx';
      const result = await FileSystem.downloadAsync(url, localUri, { headers });
      if (result.status && result.status >= 400) {
        showError('Error', `Could not download template (status ${result.status}).`);
        return;
      }
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
    if (pendingRows.length === 0) { showWarning('No Changes', 'No marks have been modified.'); return; }
    saveMarksMutation.mutate(pendingRows);
  };

  const updateMark = (studentId: string, componentId: string, value: string) => {
    // Web parity (MarkEntryGrid.tsx handleCellChange) — block and warn on entry
    // past the component's max, rather than only finding out from the 422 the
    // backend already enforces on save.
    const maxAllowed = selectedConfig?.components?.find(c => c.id === componentId)?.max_marks;
    if (maxAllowed != null && value !== '' && Number(value) > maxAllowed) {
      showWarning('Exceeds Maximum', `Cannot exceed max marks (${maxAllowed}).`);
      return;
    }
    const key = studentId + componentId;
    setLocalMarks(prev => ({ ...prev, [key]: { marks: value } }));
  };

  const renderRow = ({ item, index }: { item: MergedRow; index: number }) => {
    const key = item.student_id + item.component_id;
    const local = localMarks[key];
    const isAbsent = item.is_absent;
    const marksVal = local?.marks !== undefined ? local.marks : (item.marks_obtained?.toString() ?? '');
    const subjectTotal = selectedConfig ? subjectTotalForStudent(selectedConfig, item.student_id) : null;

    return (
      <View style={[styles.markRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.serialNo, { color: colors['muted-foreground'] }]}>{index + 1}</Text>
          <Text style={[styles.studentName, { color: colors.foreground }]}>
            {item.student_name ?? 'Student'}
          </Text>
          {!!item.admission_number && (
            <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>{item.admission_number}</Text>
          )}
        </View>

        {isAbsent ? (
          <View style={[styles.absentBadge, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.absentText}>ABS</Text>
          </View>
        ) : (
          <TextInput
            style={[
              styles.marksInput,
              {
                backgroundColor: colors.background,
                color: colors['card-foreground'] as string,
                borderColor: local !== undefined ? '#556ee6' : borderCol,
              },
            ]}
            value={marksVal}
            onChangeText={v => updateMark(item.student_id, item.component_id, v)}
            keyboardType="numeric"
            placeholder="–"
            placeholderTextColor={colors['muted-foreground'] as string}
          />
        )}

        {/* Subject Total — read-only, sums every component of THIS subject
            (not just the one currently being entered), live with unsaved edits.
            Mirrors web's per-subject "Total[20]" column. */}
        <View style={styles.totalCell}>
          <Text style={[styles.totalCellText, { color: colors.foreground }]}>
            {subjectTotal !== null ? subjectTotal : '–'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <AppLayout title="Mark Entry">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.container}>

          {/* Exam Selector — hidden once a subject is open so its chips don't sit
              above the student list permanently; "Change" on the subject bar
              below returns here by clearing the subject/component selection. */}
          {!examId && !selectedSubjectConfigId && (
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Exam</Text>
              <View style={styles.chips}>
                {(Array.isArray(examsData) ? examsData : []).map((e: ExamListItem) => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.chip, { backgroundColor: selectedExamId === e.id ? colors.primary : cardBg, borderColor: borderCol }]}
                    onPress={() => {
                      setSelectedExamId(e.id); setSelectedSubjectConfigId(''); setSelectedComponentId(''); setLocalMarks({});
                      setStudentSelectionByGroup({}); initializedGroupsRef.current = new Set();
                    }}
                  >
                    <Text style={[styles.chipText, { color: selectedExamId === e.id ? 'white' : colors['muted-foreground'] as string }]}>
                      {e.exam_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Marks area — summary mode (no subject open yet) keeps its own
              ScrollView below. Once a subject IS open, everything above the
              student rows (subject bar, student picker, component chips, bulk
              actions, column headers) rides as the FlatList's own header so it
              scrolls together with the rows, instead of sitting in fixed Views
              stacked above a separate FlatList — on a short phone screen that
              chrome alone could fill the viewport with no way to scroll down
              to a single student's mark box. */}
          {isLoading && !selectedSubjectConfigId ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#556ee6" />
            </View>
          ) : !selectedExamId ? (
            <View style={styles.centered}>
              <Ionicons name="school-outline" size={48} color={colors['muted-foreground']} />
              <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select an exam to begin</Text>
            </View>
          ) : !selectedSubjectConfigId ? (
            summaryGroups.length === 0 ? (
              <View style={styles.centered}>
                <Ionicons name="book-outline" size={48} color={colors['muted-foreground']} />
                <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>No subjects configured for this exam</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                {summaryGroups.map(group => {
                  const roster = rosterByGroup.get(group.key) ?? [];
                  const selected = studentSelectionByGroup[group.key] ?? EMPTY_STUDENT_SET;
                  const maxTotal = groupMaxTotal(group);
                  const selectedRoster = roster.filter(s => selected.has(s.student_id));

                  return (
                    <View key={group.key} style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                      <View style={[styles.summaryHeader, { borderBottomColor: borderCol }]}>
                        <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
                          {csLabel(group.class_id, group.section_id)}
                        </Text>
                        <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
                          <Text style={[styles.countBadgeText, { color: colors['muted-foreground'] }]}>
                            {group.configs.length} subject{group.configs.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>

                      {roster.length > 0 && (
                        <View style={styles.groupStudentsRow}>
                          <TouchableOpacity
                            style={[styles.studentsSummaryBtn, { backgroundColor: colors.muted, borderColor: borderCol }]}
                            onPress={() => openStudentPicker(group.key)}
                          >
                            <Ionicons name="people-outline" size={16} color="#556ee6" />
                            <Text style={[styles.studentsSummaryText, { color: colors.foreground }]}>
                              {selected.size}/{roster.length} students selected
                            </Text>
                            <Text style={[styles.changeLink, { color: '#556ee6' }]}>Change</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Grand Total — sums every subject's Total for each
                          selected student, live with unsaved edits, updating
                          as their per-subject queries resolve/refresh.
                          Web parity: the wide table's rightmost column. */}
                      {selectedRoster.length > 0 && (
                        <View style={[styles.grandTotalBlock, { borderTopColor: borderCol }]}>
                          <Text style={[styles.grandTotalHeading, { color: colors['muted-foreground'] }]}>
                            Grand Total{maxTotal > 0 ? `[${maxTotal}]` : ''}
                          </Text>
                          {selectedRoster.map(s => {
                            const gt = grandTotalForStudent(group, s.student_id);
                            return (
                              <View key={s.student_id} style={styles.grandTotalRow}>
                                <Text style={[styles.grandTotalName, { color: colors.foreground }]} numberOfLines={1}>
                                  {s.student_name ?? 'Student'}
                                </Text>
                                <Text style={[styles.grandTotalValue, { color: colors.primary as string }]}>
                                  {gt !== null ? gt : '–'}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {group.configs.map((cfg, idx) => {
                        const tot = totalMarks(cfg);
                        return (
                          <TouchableOpacity
                            key={cfg.id}
                            style={[styles.summaryRow, { borderTopColor: idx === 0 ? 'transparent' : borderCol }]}
                            onPress={() => selectConfig(cfg)}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.summarySubject, { color: colors.foreground }]}>{subjectLabel(cfg)}</Text>
                              <View style={styles.componentWrap}>
                                {cfg.components.map(comp => (
                                  <View key={comp.id} style={[styles.componentBadge, { borderColor: borderCol }]}>
                                    <Text style={[styles.componentBadgeText, { color: colors['muted-foreground'] }]}>
                                      {comp.component_name}
                                      {comp.entry_type === 'marks' && comp.max_marks != null ? `[${comp.max_marks}]` : ''}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                              {tot > 0 && (
                                <Text style={[styles.summaryTotal, { color: colors.primary as string }]}>Total[{tot}]</Text>
                              )}
                            </View>
                            {canSave && (
                              <View style={styles.enterMarks}>
                                <Text style={[styles.enterMarksText, { color: '#556ee6' }]}>Enter Marks</Text>
                                <Ionicons name="chevron-forward" size={16} color="#556ee6" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>
            )
          ) : !selectedConfig ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#556ee6" />
            </View>
          ) : (
            <FlatList
              data={selectedComponentId ? mergedRows : []}
              keyExtractor={(item, index) => (item.student_id && item.component_id) ? item.student_id + item.component_id : String(index)}
              renderItem={renderRow}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, flexGrow: 1 }}
              ListHeaderComponent={
                <>
                  {/* Selected-subject bar — shown once a subject is picked from the summary */}
                  <TouchableOpacity style={[styles.selectedBar, { backgroundColor: cardBg, borderColor: borderCol }]} onPress={backToSummary}>
                    <Ionicons name="chevron-back" size={18} color="#556ee6" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.selectedSubject, { color: colors.foreground }]}>{subjectLabel(selectedConfig)}</Text>
                      <Text style={[styles.selectedMeta, { color: colors['muted-foreground'] }]}>
                        {csLabel(selectedConfig.class_id, selectedConfig.section_id)}
                      </Text>
                    </View>
                    <Text style={[styles.changeLink, { color: '#556ee6' }]}>Change</Text>
                  </TouchableOpacity>

                  {/* Student Picker — web shows a checkbox side-panel of students
                      alongside the grid; on mobile that's a modal instead (no room
                      for both side by side), opened from this summary chip. Selection
                      is shared with the same group's card on the summary screen. */}
                  {activeRoster.length > 0 && (
                    <View style={styles.filterRow}>
                      <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Students</Text>
                      <TouchableOpacity
                        style={[styles.studentsSummaryBtn, { backgroundColor: cardBg, borderColor: borderCol }]}
                        onPress={() => openStudentPicker(activeGroupKey)}
                      >
                        <Ionicons name="people-outline" size={16} color="#556ee6" />
                        <Text style={[styles.studentsSummaryText, { color: colors.foreground }]}>
                          {activeSelectedStudentIds.size}/{activeRoster.length} selected
                        </Text>
                        <Text style={[styles.changeLink, { color: '#556ee6' }]}>Change</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Component Selector */}
                  {selectedConfig.components && selectedConfig.components.length > 0 && (
                    <View style={styles.filterRow}>
                      <Text style={[styles.filterLabel, { color: colors['muted-foreground'] }]}>Component</Text>
                      <View style={styles.chips}>
                        {selectedConfig.components.map(c => (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.chip, { backgroundColor: selectedComponentId === c.id ? colors.primary : cardBg, borderColor: borderCol }]}
                            onPress={() => setSelectedComponentId(c.id)}
                          >
                            <Text style={[styles.chipText, { color: selectedComponentId === c.id ? 'white' : colors['muted-foreground'] as string }]}>
                              {c.component_name}{c.max_marks ? `[${c.max_marks}]` : ''}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Bulk Actions */}
                  {canSave && (
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

                  {/* Column Headers — only once a component's chosen, i.e. once
                      there's actually a list of rows below to label. */}
                  {!!selectedComponentId && (
                    <View style={[styles.headerRow, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.headerCell, { flex: 1, color: colors['muted-foreground'] }]}>Student</Text>
                      <Text style={[styles.headerCell, { width: 72, textAlign: 'center', color: colors['muted-foreground'] }]}>
                        Marks{selectedComponent?.max_marks ? `[${selectedComponent.max_marks}]` : ''}
                      </Text>
                      <Text style={[styles.headerCell, { width: 64, textAlign: 'center', color: colors['muted-foreground'] }]}>
                        Total{totalMarks(selectedConfig) > 0 ? `[${totalMarks(selectedConfig)}]` : ''}
                      </Text>
                    </View>
                  )}
                </>
              }
              ListEmptyComponent={
                !selectedComponentId ? (
                  <View style={styles.centered}>
                    <Ionicons name="list-outline" size={48} color={colors['muted-foreground']} />
                    <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>Select a component</Text>
                  </View>
                ) : (
                  <View style={styles.centered}>
                    <Text style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                      {activeSelectedStudentIds.size === 0 ? 'No students selected. Tap "Students" above to choose.' : 'No students found'}
                    </Text>
                  </View>
                )
              }
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
                  {saveMarksMutation.isPending ? 'Saving…' : `Save Marks (${pendingRows.length} changed)`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Student Picker Modal — shared by both the summary card chip and the
            subject-entry screen's chip; keyed by which group is open. */}
        {(() => {
          const pickerRoster = rosterByGroup.get(studentPickerOpenFor) ?? [];
          const pickerSelected = studentSelectionByGroup[studentPickerOpenFor] ?? EMPTY_STUDENT_SET;
          const q = studentSearch.trim().toLowerCase();
          const filteredPickerRoster = q
            ? pickerRoster.filter(s =>
                (s.student_name ?? '').toLowerCase().includes(q) || (s.admission_number ?? '').toLowerCase().includes(q))
            : pickerRoster;

          return (
            <Modal
              visible={!!studentPickerOpenFor}
              transparent
              animationType="slide"
              onRequestClose={() => setStudentPickerOpenFor('')}
            >
              <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Students</Text>
                    <TouchableOpacity onPress={() => setStudentPickerOpenFor('')} accessibilityLabel="Close" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                      <Ionicons name="close" size={22} color={colors['muted-foreground']} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.searchInput, { backgroundColor: cardBg, color: colors.foreground, borderColor: borderCol }]}
                    value={studentSearch}
                    onChangeText={setStudentSearch}
                    placeholder="Search name or admission #"
                    placeholderTextColor={colors['muted-foreground'] as string}
                  />

                  <TouchableOpacity
                    style={styles.selectAllRow}
                    onPress={() => toggleSelectAllStudents(studentPickerOpenFor, pickerRoster)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={pickerRoster.length > 0 && pickerSelected.size === pickerRoster.length ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={pickerRoster.length > 0 && pickerSelected.size === pickerRoster.length ? '#556ee6' : colors['muted-foreground']}
                    />
                    <Text style={[styles.selectAllText, { color: colors.foreground }]}>Select all</Text>
                  </TouchableOpacity>

                  <FlatList
                    data={filteredPickerRoster}
                    keyExtractor={s => s.student_id}
                    style={{ maxHeight: 320 }}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => {
                      const checked = pickerSelected.has(item.student_id);
                      return (
                        <TouchableOpacity
                          style={styles.studentRow}
                          onPress={() => toggleStudent(studentPickerOpenFor, item.student_id)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name={checked ? 'checkbox' : 'square-outline'}
                            size={22}
                            color={checked ? '#556ee6' : colors['muted-foreground']}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.studentRowName, { color: colors.foreground }]}>
                              {item.student_name ?? 'Student'}
                            </Text>
                            {!!item.admission_number && (
                              <Text style={[styles.admNo, { color: colors['muted-foreground'] }]}>{item.admission_number}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <Text style={[styles.emptyText, { color: colors['muted-foreground'], paddingVertical: 16 }]}>
                        No matching students
                      </Text>
                    }
                  />

                  <TouchableOpacity
                    style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setStudentPickerOpenFor('')}
                  >
                    <Text style={styles.doneBtnText}>Done ({pickerSelected.size} selected)</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          );
        })()}
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

// Screen-level access control — web parity (MarkEntryExamList.tsx): students
// are always redirected to "My Marks" (read-only) and never reach mark entry;
// teachers/admins keep it, gated by the existing exam_marks permission.
export default function MarkEntryScreen() {
  return (
    <ScreenAccessGate
      title="Mark Entry"
      permissions={[
        ['exam_marks', 'read'],
        ['exam_marks', 'list'],
        ['exam_marks', 'create'],
        ['exam_marks', 'update'],
      ]}
      blockRoles={['student']}
    >
      <MarkEntryScreenContent />
    </ScreenAccessGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  filterLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  studentsSummaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, minHeight: 44, borderRadius: 10, borderWidth: 1,
  },
  studentsSummaryText: { flex: 1, fontSize: 13, fontWeight: '600' },
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
  serialNo: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  studentName: { fontSize: 13, fontWeight: '600' },
  admNo: { fontSize: 11, marginTop: 2 },
  absentBadge: {
    paddingHorizontal: 10, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  absentText: { fontSize: 11, fontWeight: '700', color: 'white' },
  marksInput: {
    width: 64, height: 44, borderWidth: 1, borderRadius: 8,
    textAlign: 'center', fontSize: 14, fontWeight: '600',
  },
  totalCell: { width: 56, alignItems: 'center', justifyContent: 'center' },
  totalCellText: { fontSize: 14, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { marginTop: 12, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  // Selected-subject bar
  selectedBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1,
  },
  selectedSubject: { fontSize: 14, fontWeight: '700' },
  selectedMeta: { fontSize: 12, marginTop: 1 },
  changeLink: { fontSize: 13, fontWeight: '600' },
  // Summary (web-style class-section groups)
  summaryCard: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1,
  },
  summaryTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  countBadgeText: { fontSize: 11, fontWeight: '600' },
  groupStudentsRow: { paddingHorizontal: 14, paddingTop: 10 },
  grandTotalBlock: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, borderTopWidth: 1 },
  grandTotalHeading: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 },
  grandTotalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  grandTotalName: { flex: 1, fontSize: 13, fontWeight: '500' },
  grandTotalValue: { fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, minHeight: 56, borderTopWidth: 1 },
  summarySubject: { fontSize: 14, fontWeight: '600' },
  componentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  componentBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  componentBadgeText: { fontSize: 11, fontWeight: '500' },
  summaryTotal: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  enterMarks: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  enterMarksText: { fontSize: 12, fontWeight: '600' },
  bulkRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, minHeight: 44 },
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
  // Student Picker Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingBottom: 28, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700' },
  searchInput: {
    height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    fontSize: 13, marginBottom: 10,
  },
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 44, marginBottom: 4,
  },
  selectAllText: { fontSize: 14, fontWeight: '600' },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.15)',
  },
  studentRowName: { fontSize: 14, fontWeight: '600' },
  doneBtn: {
    marginTop: 14, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  doneBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
