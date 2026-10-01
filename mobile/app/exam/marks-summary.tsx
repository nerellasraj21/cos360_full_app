import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { CustomDropdown } from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { examsApi, ExamClassSection } from '@/src/api/exam';
import { classSectionsApi, subjectsApi } from '@/src/api/masters';
import { useMobilePermission } from '../../src/hooks/useMobilePermission';

/**
 * Mark Entry Summary — mobile port of the web's MarkEntrySummary.tsx.
 * Reached from the exam detail screen's Marks tab ("View Summary"). Shows,
 * for a chosen class-section: the roster of students (search + select-all,
 * mirroring the web panel) and the configured subjects with their
 * components and max marks. Available to every role that can see the exam
 * (students included) — only the "Enter Marks" action is permission-gated.
 */
export default function MarkEntrySummaryScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { hasPermission } = useMobilePermission();

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examsApi.getById(examId),
    enabled: !!examId,
  });

  const {
    data: classSections = [],
    isLoading: sectionsLoading,
    isError: sectionsError,
  } = useQuery<ExamClassSection[]>({
    queryKey: ['exam-class-sections', examId],
    queryFn: () => examsApi.getClassSections(examId),
    enabled: !!examId,
  });

  const {
    data: subjectConfigs = [],
    isLoading: configsLoading,
    isError: configsError,
  } = useQuery({
    queryKey: ['exam-subject-configs', examId],
    queryFn: () => examsApi.getSubjectConfigs(examId),
    enabled: !!examId,
  });

  const canEnterMarks = hasPermission?.('exams', 'update') || hasPermission?.('exam_marks', 'create');

  // The exam's own class-sections/subject-configs endpoints return only IDs
  // (no *_name fields), so resolve names locally the same way the web
  // MarkEntrySummary.tsx and the exam detail screen do — scoped to the
  // exam's academic year so past-year IDs still resolve.
  const { data: classList = [] } = useQuery({
    queryKey: ['class-sections-all', exam?.academic_year_id],
    queryFn: () => classSectionsApi.getClassSections({ active_only: false, academic_year_id: exam?.academic_year_id }),
    enabled: !!exam?.academic_year_id,
  });
  const { data: subjectList = [] } = useQuery({
    queryKey: ['subjects-all', exam?.academic_year_id],
    queryFn: () => subjectsApi.getSubjects({ active_only: false, academic_year_id: exam?.academic_year_id }),
    enabled: !!exam?.academic_year_id,
  });
  const classNameMap = useMemo(() => Object.fromEntries(classList.map((c: any) => [c.id, c.name])), [classList]);
  const sectionNameMap = useMemo(
    () => Object.fromEntries(classList.flatMap((c: any) => (c.sections ?? []).map((s: any) => [s.id, s.name]))),
    [classList],
  );
  const subjectNameMap = useMemo(() => Object.fromEntries(subjectList.map((s: any) => [s.id, s.name])), [subjectList]);

  const [selectedCsId, setSelectedCsId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedCsId && classSections.length > 0) {
      setSelectedCsId(classSections[0].id);
    }
  }, [classSections, selectedCsId]);

  const selectedCs = classSections.find(cs => cs.id === selectedCsId);
  const csLabel = (cs: ExamClassSection) => {
    const sectionLabel = cs.section_name ?? (cs.section_id ? sectionNameMap[cs.section_id] : null);
    return [cs.class_name ?? classNameMap[cs.class_id], sectionLabel].filter(Boolean).join(' – ') || 'Class';
  };

  const configs = useMemo(
    () => subjectConfigs.filter(
      (cfg: any) => selectedCs && cfg.class_id === selectedCs.class_id && cfg.section_id === selectedCs.section_id,
    ),
    [subjectConfigs, selectedCs],
  );

  const { data: studentsData = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-by-class-section', selectedCs?.class_id, selectedCs?.section_id],
    queryFn: () => classSectionsApi.getStudentsByClassSection(selectedCs!.class_id, selectedCs!.section_id),
    enabled: !!selectedCs?.class_id,
  });

  const students = useMemo(
    () => studentsData
      .filter((s: any) => !!s.student?.id)
      .map((s: any) => ({
        id: s.student.id,
        name: `${s.student.first_name ?? ''} ${s.student.last_name ?? ''}`.trim() || 'Unknown Student',
        admissionNumber: s.admission_number ?? '',
      })),
    [studentsData],
  );

  useEffect(() => {
    setSelectedStudentIds(new Set(students.map((s: { id: string }) => s.id)));
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s: { name: string; admissionNumber: string }) =>
      s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q));
  }, [students, studentSearch]);

  const allSelected = students.length > 0 && selectedStudentIds.size === students.length;
  const toggleAll = (checked: boolean) => {
    setSelectedStudentIds(checked ? new Set(students.map((s: { id: string }) => s.id)) : new Set());
  };
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const isLoading = examLoading || sectionsLoading || configsLoading;
  const isBackendError = sectionsError || configsError;

  if (isLoading) {
    return (
      <AppLayout title="Mark Entry">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#556ee6" />
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mark Entry">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {exam && (
          <Text style={[styles.subtitle, { color: colors['muted-foreground'] }]}>
            {exam.exam_name} · {exam.board} · {exam.exam_type}
          </Text>
        )}

        {isBackendError && (
          <View style={[styles.noticeBox, { borderColor: '#F59E0B', backgroundColor: '#F59E0B14' }]}>
            <Ionicons name="cloud-offline-outline" size={18} color="#F59E0B" />
            <Text style={[styles.noticeText, { color: '#B45309' }]}>
              The mark entry subject list is temporarily unavailable.
            </Text>
          </View>
        )}

        {!isBackendError && classSections.length === 0 && (
          <View style={[styles.emptyBox, { borderColor: borderCol }]}>
            <Ionicons name="alert-circle-outline" size={32} color={colors['muted-foreground']} />
            <Text style={[styles.emptyHint, { color: colors['muted-foreground'], textAlign: 'center' }]}>
              No class-sections assigned to this exam.
            </Text>
          </View>
        )}

        {!isBackendError && classSections.length > 0 && (
          <>
            {/* Class-Section filter */}
            <View style={styles.filterRow}>
              <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Class – Section</Text>
              <CustomDropdown
                data={classSections.map(cs => ({ label: csLabel(cs), value: cs.id }))}
                value={selectedCsId || null}
                onChange={v => setSelectedCsId(v ? String(v) : '')}
                placeholder="Select class-section"
                search={false}
                containerStyle={{ marginBottom: 4 }}
              />
              {selectedCs && (
                <Text style={[styles.subjectCount, { color: colors['muted-foreground'] }]}>
                  {configs.length} subject{configs.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>

            {selectedCs && (
              <>
                {/* Students panel */}
                <View style={[styles.groupSection, { backgroundColor: cardBg, borderColor: borderCol }]}>
                  <View style={[styles.groupHeader, { borderBottomColor: borderCol }]}>
                    <Ionicons name="people-outline" size={16} color={colors['muted-foreground']} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0, marginLeft: 6, flex: 1 }]}>
                      Students
                    </Text>
                    <Text style={[styles.subjectCount, { color: colors['muted-foreground'] }]}>
                      {selectedStudentIds.size}/{students.length}
                    </Text>
                  </View>

                  <View style={[styles.searchBox, { backgroundColor: inputBg, borderColor: borderCol }]}>
                    <Ionicons name="search" size={15} color={colors['muted-foreground']} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.foreground }]}
                      placeholder="Search name or admission #"
                      placeholderTextColor={colors['muted-foreground']}
                      value={studentSearch}
                      onChangeText={setStudentSearch}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.selectAllRow, { borderBottomColor: borderCol }]}
                    onPress={() => toggleAll(!allSelected)}
                    disabled={students.length === 0}
                  >
                    <Ionicons
                      name={allSelected ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={students.length === 0 ? colors['muted-foreground'] : '#556ee6'}
                    />
                    <Text style={[styles.selectAllText, { color: colors['muted-foreground'] }]}>Select all</Text>
                  </TouchableOpacity>

                  {studentsLoading ? (
                    <View style={{ paddingVertical: 24 }}>
                      <ActivityIndicator color="#556ee6" />
                    </View>
                  ) : filteredStudents.length === 0 ? (
                    <Text style={[styles.emptyHint, { color: colors['muted-foreground'], textAlign: 'center', padding: 16 }]}>
                      {studentSearch ? `No students match "${studentSearch}".` : 'No students in this class-section.'}
                    </Text>
                  ) : (
                    <View style={{ maxHeight: 320 }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {filteredStudents.map((s: { id: string; name: string; admissionNumber: string }) => (
                          <TouchableOpacity
                            key={s.id}
                            style={[styles.studentRow, { borderBottomColor: borderCol }]}
                            onPress={() => toggleStudent(s.id)}
                          >
                            <Ionicons
                              name={selectedStudentIds.has(s.id) ? 'checkbox' : 'square-outline'}
                              size={18}
                              color="#556ee6"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.studentName, { color: colors.foreground }]} numberOfLines={1}>{s.name}</Text>
                              <Text style={[styles.studentMeta, { color: colors['muted-foreground'] }]}>
                                {s.admissionNumber || '—'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Subjects panel */}
                <View style={[styles.groupSection, { backgroundColor: cardBg, borderColor: borderCol, marginTop: 12 }]}>
                  <View style={[styles.groupHeader, { borderBottomColor: borderCol }]}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0, flex: 1 }]}>
                      {csLabel(selectedCs)}
                    </Text>
                    {canEnterMarks && configs.length > 0 && (
                      <TouchableOpacity
                        style={[styles.enterMarksBtn, { backgroundColor: selectedStudentIds.size === 0 ? colors.muted : '#556ee6' }]}
                        onPress={() => router.push({ pathname: '/exam/marks', params: { examId } } as any)}
                        disabled={selectedStudentIds.size === 0}
                      >
                        <Ionicons name="create-outline" size={14} color="white" />
                        <Text style={styles.enterMarksBtnText}>Enter Marks</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {configs.length === 0 ? (
                    <Text style={[styles.emptyHint, { color: colors['muted-foreground'], textAlign: 'center', padding: 16 }]}>
                      No subjects configured for this class-section.
                    </Text>
                  ) : (
                    configs.map((cfg: any) => {
                      const totalMarks = (cfg.components ?? [])
                        .filter((c: any) => c.include_in_total && c.entry_type === 'marks')
                        .reduce((sum: number, c: any) => sum + Number(c.max_marks ?? 0), 0);
                      return (
                        <View key={cfg.id} style={[styles.subjectRow, { borderBottomColor: borderCol }]}>
                          <View style={styles.rowBetween}>
                            <Text style={[styles.subjectName, { color: colors.foreground }]}>
                              {cfg.subject_name ?? subjectNameMap[cfg.subject_id] ?? 'Subject'}
                            </Text>
                            {totalMarks > 0 && (
                              <Text style={[styles.maxMarks, { color: '#556ee6' }]}>{totalMarks}</Text>
                            )}
                          </View>
                          <View style={styles.componentRow}>
                            {(cfg.components ?? []).map((comp: any) => (
                              <View key={comp.id} style={[styles.componentBadge, { backgroundColor: borderCol }]}>
                                <Text style={[styles.componentText, { color: colors.foreground }]}>
                                  {comp.component_name}
                                  {comp.entry_type === 'marks' && comp.max_marks != null ? ` [${comp.max_marks}]` : ''}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 13, marginBottom: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  noticeText: { flex: 1, fontSize: 12 },
  emptyBox: {
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', padding: 24,
  },
  emptyHint: { fontSize: 13 },
  filterRow: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  subjectCount: { fontSize: 11, fontWeight: '600' },
  groupSection: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 12, marginTop: 10, borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, height: 44,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  selectAllRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, minHeight: 44, marginTop: 8, borderBottomWidth: 1,
  },
  selectAllText: { fontSize: 12, fontWeight: '600' },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, minHeight: 48, borderBottomWidth: 1,
  },
  studentName: { fontSize: 13, fontWeight: '600' },
  studentMeta: { fontSize: 11, marginTop: 1 },
  enterMarksBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 12, minHeight: 40,
  },
  enterMarksBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  subjectRow: { padding: 12, borderBottomWidth: 1, gap: 8 },
  subjectName: { fontSize: 14, fontWeight: '600' },
  maxMarks: { fontSize: 14, fontWeight: '700' },
  componentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  componentBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  componentText: { fontSize: 11, fontWeight: '500' },
});
