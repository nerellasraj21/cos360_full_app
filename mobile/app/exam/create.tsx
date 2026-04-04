import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import { DatePickerModal, TimePickerModal, formatTime12h } from '@/components/ui';
import { CustomDropdown, DropdownOption } from '@/components/ui/dropdown';
import { useAcademicYear, useTheme } from '@/contexts';
import {
  ClassSectionPayload, ComponentPayload, EntryType, ExamBoard,
  ExamCreateFull, ExamDatePayload, ExamGradeScheme, ExamLevel,
  ExamNature, SubjectConfigPayload, examsApi, gradeSchemeApi,
} from '@/src/api/exam';
import { ClassRead, classSectionsApi, classSubjectMappingsApi } from '@/src/api/masters';

// ─── Constants ───────────────────────────────────────────────────────────────

const BOARD_OPTIONS: DropdownOption[] = [
  { value: 'CBSE',   label: 'CBSE' },
  { value: 'ICSE',   label: 'ICSE' },
  { value: 'State',  label: 'State' },
  { value: 'BTech',  label: 'BTech' },
  { value: 'Custom', label: 'Custom' },
];

const LEVEL_OPTIONS: DropdownOption[] = [
  { value: 'pre_primary',   label: 'Pre-Primary' },
  { value: 'primary',       label: 'Primary' },
  { value: 'upper_primary', label: 'Upper Primary' },
  { value: 'secondary',     label: 'Secondary' },
  { value: 'inter',         label: 'Intermediate' },
  { value: 'diploma',       label: 'Diploma' },
  { value: 'btech',         label: 'BTech' },
  { value: 'mtech',         label: 'MTech' },
  { value: 'iit',           label: 'IIT' },
  { value: 'others',        label: 'Others' },
];

const NATURE_OPTIONS: DropdownOption[] = [
  { value: 'formative',  label: 'Formative' },
  { value: 'summative',  label: 'Summative' },
  { value: 'cumulative', label: 'Cumulative' },
  { value: 'custom',     label: 'Custom' },
];

const ENTRY_TYPES: { value: EntryType; label: string }[] = [
  { value: 'marks',   label: 'Marks' },
  { value: 'remarks', label: 'Remarks' },
];

const EMPTY_COMPONENT: ComponentPayload = {
  component_name: '',
  entry_type: 'marks',
  max_marks: null,
  min_pass_marks: null,
  include_in_total: true,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  num, title, open, completed,
  onPress,
}: {
  num: number; title: string; open: boolean; completed: boolean; onPress: () => void;
}) {
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <TouchableOpacity
      style={[
        styles.sectionHeader,
        { borderColor: isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0' },
        open && { borderLeftWidth: 3, borderLeftColor: '#556ee6' },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[
        styles.stepBadge,
        { backgroundColor: completed ? '#10B981' : (isDark ? '#2d2d4e' : '#e2e8f0') },
      ]}>
        {completed
          ? <Ionicons name="checkmark" size={14} color="white" />
          : <Text style={[styles.stepNum, { color: completed ? 'white' : (colors['muted-foreground'] as string) }]}>{num}</Text>
        }
      </View>
      <Text style={[styles.sectionTitle, { color: colors.foreground as string, flex: 1 }]}>{title}</Text>
      {completed && !open && (
        <Text style={styles.completeTag}>Complete</Text>
      )}
      <Ionicons
        name={open ? 'chevron-down' : 'chevron-forward'}
        size={16}
        color={colors['muted-foreground'] as string}
      />
    </TouchableOpacity>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] as string }]}>
      {text}{required && <Text style={{ color: '#EF4444' }}> *</Text>}
    </Text>
  );
}


// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CreateExamScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();
  const { activeAcademicYearId, academicYears } = useAcademicYear();
  const qc = useQueryClient();
  const { showSuccess, showError } = useToastContext();

  const isDark = theme === 'dark';
  const cardBg = isDark ? '#1a1a2e' : '#ffffff';
  const borderCol = isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0';
  const inputBg = isDark ? '#0f0f23' : '#f8fafc';

  // ── Accordion state ──
  const [open, setOpen] = useState(new Set([1]));
  const [done, setDone] = useState(new Set<number>());

  const toggle = (n: number) => setOpen(prev => {
    const next = new Set(prev);
    next.has(n) ? next.delete(n) : next.add(n);
    return next;
  });
  const advance = (from: number, to: number) => {
    setDone(prev => new Set([...prev, from]));
    setOpen(new Set([to]));
  };

  // ── Step 1: Exam Details ──
  const [examName,          setExamName]          = useState('');
  const [board,             setBoard]             = useState<ExamBoard>('CBSE');
  const [level,             setLevel]             = useState<ExamLevel>('primary');
  const [examType,          setExamType]          = useState('');
  const [nature,            setNature]            = useState<ExamNature>('formative');
  const [academicYearId,    setAcademicYearId]    = useState(activeAcademicYearId ?? '');
  const [gradeSchemeId,     setGradeSchemeId]     = useState<string | null>(null);
  const [markDeadline,      setMarkDeadline]      = useState('');
  const [minAttendance,     setMinAttendance]     = useState('');
  const [attendanceFrom,    setAttendanceFrom]    = useState('');
  const [attendanceTo,      setAttendanceTo]      = useState('');
  const [publishRank,       setPublishRank]       = useState(false);
  const [isInternal,        setIsInternal]        = useState(true);

  useEffect(() => {
    if (activeAcademicYearId && !academicYearId) setAcademicYearId(activeAcademicYearId);
  }, [activeAcademicYearId]);

  // ── Step 2: Class & Sections ──
  const [classSections, setClassSections] = useState<ClassSectionPayload[]>([]);

  // ── Step 3: Subject Configs ──
  const [subjectConfigs, setSubjectConfigs] = useState<SubjectConfigPayload[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, { id: string; name: string }[]>>({});

  // ── Step 4: Exam Dates ──
  const [examDates, setExamDates] = useState<ExamDatePayload[]>([]);
  const [newDate, setNewDate] = useState({
    class_id: '', section_id: null as string | null,
    subject_id: '', exam_date: '', start_time: '', end_time: '', venue: '',
  });

  // Time picker
  const [showTimePicker, setShowTimePicker]   = useState(false);
  const [activeTimeField, setActiveTimeField] = useState<'start_time' | 'end_time'>('start_time');

  const openTimePicker = (field: 'start_time' | 'end_time') => {
    setActiveTimeField(field);
    setShowTimePicker(true);
  };
  const confirmTime = (time: string) => {
    setNewDate(p => ({ ...p, [activeTimeField]: time }));
    setShowTimePicker(false);
  };

  // Date picker
  type DateField = 'markDeadline' | 'attendanceFrom' | 'attendanceTo' | 'examDate';
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [activeDateField, setActiveDateField] = useState<DateField>('markDeadline');

  const dateFieldValues: Record<DateField, string> = {
    markDeadline,
    attendanceFrom,
    attendanceTo,
    examDate: newDate.exam_date,
  };

  const openDatePicker = (field: DateField) => {
    setActiveDateField(field);
    setShowDatePicker(true);
  };
  const confirmDate = (date: string) => {
    if (activeDateField === 'markDeadline')   setMarkDeadline(date);
    if (activeDateField === 'attendanceFrom') setAttendanceFrom(date);
    if (activeDateField === 'attendanceTo')   setAttendanceTo(date);
    if (activeDateField === 'examDate')       setNewDate(p => ({ ...p, exam_date: date }));
    setShowDatePicker(false);
  };

  // ── Remote data ──
  const { data: availableClasses = [] } = useQuery<ClassRead[]>({
    queryKey: ['class-sections-all'],
    queryFn: () => classSectionsApi.getClassSections(),
  });

  const { data: gradeSchemes = [] } = useQuery<ExamGradeScheme[]>({
    queryKey: ['grade-schemes-exam'],
    queryFn: () => gradeSchemeApi.listExamSchemes(),
  });

  // Load subjects when class-sections change
  useEffect(() => {
    const classIds = [...new Set(classSections.map(cs => cs.class_id))];
    classIds.forEach(classId => {
      if (!subjectsByClass[classId]) {
        classSubjectMappingsApi.getMappingsByClass(classId).then(mappings => {
          const subjects = Array.from(
            new Map(
              mappings
                .filter(m => !m.exclude_marks)
                .map(m => [m.subject_id, { id: m.subject_id, name: m.subject_name ?? m.subject_id }])
            ).values()
          );
          setSubjectsByClass(prev => ({ ...prev, [classId]: subjects }));
        }).catch(() => {});
      }
    });
  }, [classSections]);

  // ── Derived ──
  const selectedCsKeys = new Set(classSections.map(cs => `${cs.class_id}|${cs.section_id ?? ''}`));
  const activeConfigs = subjectConfigs.filter(cfg => selectedCsKeys.has(`${cfg.class_id}|${cfg.section_id ?? ''}`));

  const missingItems = [
    !examName.trim()          && 'Exam Name (Section 1)',
    !academicYearId           && 'Academic Year (Section 1)',
    !examType.trim()          && 'Exam Type (Section 1)',
    classSections.length === 0 && 'Class & Sections — select at least one (Section 2)',
    activeConfigs.length === 0 && 'Subject Configuration — configure at least one subject (Section 3)',
  ].filter(Boolean) as string[];

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: ExamCreateFull) => examsApi.createFull(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      showSuccess('Exam Created', `"${res.exam_name}" created successfully.`);
      router.replace(`/exam/${res.id}` as any);
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(' | ') : 'Failed to create exam.');
      showError('Error', msg);
    },
  });

  // ── Helpers ──
  const toggleClassSection = (classId: string, sectionId: string | null) => {
    const key = `${classId}|${sectionId ?? ''}`;
    const exists = classSections.some(cs => `${cs.class_id}|${cs.section_id ?? ''}` === key);
    if (exists) {
      setClassSections(prev => prev.filter(cs => `${cs.class_id}|${cs.section_id ?? ''}` !== key));
    } else {
      setClassSections(prev => [...prev, { class_id: classId, section_id: sectionId }]);
    }
  };

  const isClassSectionSelected = (classId: string, sectionId: string | null) =>
    classSections.some(cs => cs.class_id === classId && cs.section_id === sectionId);

  const getConfigForCs = (classId: string, sectionId: string | null): SubjectConfigPayload[] =>
    subjectConfigs.filter(cfg => cfg.class_id === classId && cfg.section_id === sectionId);

  const upsertConfig = (classId: string, sectionId: string | null, subjectId: string, patch: Partial<SubjectConfigPayload>) => {
    setSubjectConfigs(prev => {
      const idx = prev.findIndex(c => c.class_id === classId && c.section_id === sectionId && c.subject_id === subjectId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      }
      return [...prev, { class_id: classId, section_id: sectionId, subject_id: subjectId, components: [], ...patch }];
    });
  };

  const addSubjectConfig = (classId: string, sectionId: string | null, subjectId: string) => {
    const exists = subjectConfigs.some(c => c.class_id === classId && c.section_id === sectionId && c.subject_id === subjectId);
    if (!exists) {
      setSubjectConfigs(prev => [...prev, {
        class_id: classId, section_id: sectionId, subject_id: subjectId,
        components: [],
      }]);
    }
  };

  const removeSubjectConfig = (classId: string, sectionId: string | null, subjectId: string) => {
    setSubjectConfigs(prev => prev.filter(c => !(c.class_id === classId && c.section_id === sectionId && c.subject_id === subjectId)));
  };

  const addComponent = (classId: string, sectionId: string | null, subjectId: string) => {
    setSubjectConfigs(prev => prev.map(cfg =>
      cfg.class_id === classId && cfg.section_id === sectionId && cfg.subject_id === subjectId
        ? { ...cfg, components: [...cfg.components, { ...EMPTY_COMPONENT }] }
        : cfg
    ));
  };

  const removeComponent = (classId: string, sectionId: string | null, subjectId: string, idx: number) => {
    setSubjectConfigs(prev => prev.map(cfg =>
      cfg.class_id === classId && cfg.section_id === sectionId && cfg.subject_id === subjectId
        ? { ...cfg, components: cfg.components.filter((_, i) => i !== idx) }
        : cfg
    ));
  };

  const updateComponent = (classId: string, sectionId: string | null, subjectId: string, idx: number, patch: Partial<ComponentPayload>) => {
    setSubjectConfigs(prev => prev.map(cfg => {
      if (!(cfg.class_id === classId && cfg.section_id === sectionId && cfg.subject_id === subjectId)) return cfg;
      const comps = [...cfg.components];
      comps[idx] = { ...comps[idx], ...patch };
      return { ...cfg, components: comps };
    }));
  };

  const addExamDate = () => {
    if (!newDate.class_id || !newDate.subject_id || !newDate.exam_date) return;
    setExamDates(prev => [...prev, {
      class_id: newDate.class_id, section_id: newDate.section_id,
      subject_id: newDate.subject_id, exam_date: newDate.exam_date,
      start_time: newDate.start_time || null, end_time: newDate.end_time || null,
      venue: newDate.venue || null,
    }]);
    setNewDate(prev => ({ ...prev, subject_id: '', exam_date: '', start_time: '', end_time: '', venue: '' }));
  };

  const handleSubmit = () => {
    if (missingItems.length > 0) {
      showError('Fix Issues', missingItems[0]);
      return;
    }
    const payload: ExamCreateFull = {
      exam: {
        exam_name: examName.trim(),
        academic_year_id: academicYearId,
        board,
        level,
        exam_type: examType.trim(),
        nature,
        is_internal: isInternal,
        publish_rank: publishRank || undefined,
        exam_grade_scheme_id: gradeSchemeId || null,
        mark_entry_deadline: markDeadline || undefined,
        hall_ticket_min_attendance: minAttendance ? Number(minAttendance) : null,
        attendance_from_date: attendanceFrom || undefined,
        attendance_to_date: attendanceTo || undefined,
      },
      class_sections: classSections,
      subject_configs: activeConfigs.filter(cfg => cfg.components.length > 0 && cfg.components[0].component_name.trim()),
      exam_dates: examDates,
    };
    createMutation.mutate(payload);
  };

  const getClassName = (classId: string) =>
    availableClasses.find(c => c.id === classId)?.name ?? classId;

  const getSectionName = (classId: string, sectionId: string | null) => {
    if (!sectionId) return '';
    const cls = availableClasses.find(c => c.id === classId);
    return cls?.sections?.find(s => s.id === sectionId)?.name ?? '';
  };

  const getSubjectName = (classId: string, subjectId: string) =>
    (subjectsByClass[classId] ?? []).find(s => s.id === subjectId)?.name ?? subjectId;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Create Exam">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Top bar */}
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors['muted-foreground'] as string} />
            <Text style={[styles.backText, { color: colors['muted-foreground'] as string }]}>Back to Exams</Text>
          </TouchableOpacity>

          <View style={[styles.accordion, { backgroundColor: cardBg, borderColor: borderCol }]}>

            {/* ── Section 1: Exam Details ── */}
            <SectionHeader num={1} title="Exam Details" open={open.has(1)} completed={done.has(1)} onPress={() => toggle(1)} />
            {open.has(1) && (
              <View style={styles.sectionBody}>

                <FieldLabel text="Exam Name" required />
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                  value={examName}
                  onChangeText={setExamName}
                  placeholder="FA1 2024-25"
                  placeholderTextColor={colors['muted-foreground'] as string}
                />

                <FieldLabel text="Board" required />
                <CustomDropdown
                  data={BOARD_OPTIONS}
                  value={board}
                  onChange={v => setBoard((v as ExamBoard) ?? 'CBSE')}
                  placeholder="Select Board"
                  search={false}
                  containerStyle={styles.dropdownContainer}
                />

                <FieldLabel text="Level" required />
                <CustomDropdown
                  data={LEVEL_OPTIONS}
                  value={level}
                  onChange={v => setLevel((v as ExamLevel) ?? 'primary')}
                  placeholder="Select Level"
                  search={false}
                  containerStyle={styles.dropdownContainer}
                />

                <FieldLabel text="Exam Type" required />
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                  value={examType}
                  onChangeText={setExamType}
                  placeholder="FA1"
                  placeholderTextColor={colors['muted-foreground'] as string}
                />

                <FieldLabel text="Nature" required />
                <CustomDropdown
                  data={NATURE_OPTIONS}
                  value={nature}
                  onChange={v => setNature((v as ExamNature) ?? 'formative')}
                  placeholder="Select Nature"
                  search={false}
                  containerStyle={styles.dropdownContainer}
                />

                <FieldLabel text="Academic Year" required />
                <CustomDropdown
                  data={academicYears.map(ay => ({ label: ay.title, value: String(ay.id) }))}
                  value={academicYearId || null}
                  onChange={v => setAcademicYearId(v ? String(v) : '')}
                  placeholder="Select Academic Year"
                  search={false}
                  containerStyle={styles.dropdownContainer}
                />

                <FieldLabel text="Grade Scheme" />
                <CustomDropdown
                  data={[
                    { label: '— None —', value: '' },
                    ...gradeSchemes.map(gs => ({ label: gs.name, value: gs.id })),
                  ]}
                  value={gradeSchemeId ?? ''}
                  onChange={v => setGradeSchemeId(v && v !== '' ? String(v) : null)}
                  placeholder="Select Grade Scheme"
                  search={false}
                  containerStyle={styles.dropdownContainer}
                />

                <FieldLabel text="Mark Entry Deadline" />
                <TouchableOpacity
                  style={[styles.timeBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                  onPress={() => openDatePicker('markDeadline')}
                >
                  <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground'] as string} />
                  <Text style={[styles.timeBtnText, { color: markDeadline ? colors.foreground as string : colors['muted-foreground'] as string }]}>
                    {markDeadline || 'Tap to select date'}
                  </Text>
                  {!!markDeadline && (
                    <TouchableOpacity onPress={() => setMarkDeadline('')}>
                      <Ionicons name="close-circle" size={16} color={colors['muted-foreground'] as string} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <FieldLabel text="Min Attendance %" />
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                  value={minAttendance}
                  onChangeText={setMinAttendance}
                  placeholder="75"
                  placeholderTextColor={colors['muted-foreground'] as string}
                  keyboardType="numeric"
                />

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <FieldLabel text="Attendance From" />
                    <TouchableOpacity
                      style={[styles.timeBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                      onPress={() => openDatePicker('attendanceFrom')}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground'] as string} />
                      <Text style={[styles.timeBtnText, { color: attendanceFrom ? colors.foreground as string : colors['muted-foreground'] as string }]}>
                        {attendanceFrom || 'Select'}
                      </Text>
                      {!!attendanceFrom && (
                        <TouchableOpacity onPress={() => setAttendanceFrom('')}>
                          <Ionicons name="close-circle" size={16} color={colors['muted-foreground'] as string} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={{ width: 10 }} />
                  <View style={{ flex: 1 }}>
                    <FieldLabel text="Attendance To" />
                    <TouchableOpacity
                      style={[styles.timeBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                      onPress={() => openDatePicker('attendanceTo')}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground'] as string} />
                      <Text style={[styles.timeBtnText, { color: attendanceTo ? colors.foreground as string : colors['muted-foreground'] as string }]}>
                        {attendanceTo || 'Select'}
                      </Text>
                      {!!attendanceTo && (
                        <TouchableOpacity onPress={() => setAttendanceTo('')}>
                          <Ionicons name="close-circle" size={16} color={colors['muted-foreground'] as string} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.foreground as string }]}>Publish Rank</Text>
                  <Switch value={publishRank} onValueChange={setPublishRank} trackColor={{ true: '#556ee6' }} thumbColor="white" />
                </View>

                <View style={styles.switchRow}>
                  <Text style={[styles.switchLabel, { color: colors.foreground as string }]}>Internal Exam</Text>
                  <Switch value={isInternal} onValueChange={setIsInternal} trackColor={{ true: '#556ee6' }} thumbColor="white" />
                </View>

                <View style={styles.nextRow}>
                  <TouchableOpacity
                    style={[styles.nextBtn, { opacity: !examName.trim() || !academicYearId || !examType.trim() ? 0.4 : 1 }]}
                    onPress={() => { if (examName.trim() && academicYearId && examType.trim()) advance(1, 2); }}
                    disabled={!examName.trim() || !academicYearId || !examType.trim()}
                  >
                    <Text style={styles.nextBtnText}>Next: Class & Sections</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Section 2: Class & Sections ── */}
            <SectionHeader num={2} title="Class & Sections" open={open.has(2)} completed={done.has(2)} onPress={() => toggle(2)} />
            {open.has(2) && (
              <View style={styles.sectionBody}>
                <Text style={[styles.hint, { color: colors['muted-foreground'] as string }]}>
                  Select which class-section combinations this exam applies to
                </Text>

                {availableClasses.map(cls => {
                  const hasAnySectionSelected = cls.sections.some(s => isClassSectionSelected(cls.id, s.id));
                  const allSectionsSelected = cls.sections.length > 0 &&
                    cls.sections.every(s => isClassSectionSelected(cls.id, s.id));

                  return (
                    <View key={cls.id} style={[styles.classCard, { borderColor: borderCol, backgroundColor: isDark ? '#0f0f23' : '#f8fafc' }]}>
                      <View style={styles.classRow}>
                        <TouchableOpacity
                          style={[styles.checkbox, {
                            backgroundColor: allSectionsSelected ? '#556ee6' : 'transparent',
                            borderColor: allSectionsSelected ? '#556ee6' : (isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1'),
                          }]}
                          onPress={() => {
                            if (allSectionsSelected) {
                              cls.sections.forEach(s => {
                                if (isClassSectionSelected(cls.id, s.id)) toggleClassSection(cls.id, s.id);
                              });
                            } else {
                              cls.sections.forEach(s => {
                                if (!isClassSectionSelected(cls.id, s.id)) toggleClassSection(cls.id, s.id);
                              });
                            }
                          }}
                        >
                          {allSectionsSelected && <Ionicons name="checkmark" size={12} color="white" />}
                        </TouchableOpacity>
                        <Text style={[styles.className, { color: colors.foreground as string }]}>{cls.name}</Text>
                        {hasAnySectionSelected && (
                          <Text style={styles.selectedCount}>
                            {cls.sections.filter(s => isClassSectionSelected(cls.id, s.id)).length} / {cls.sections.length} selected
                          </Text>
                        )}
                      </View>

                      <View style={styles.sectionChips}>
                        {cls.sections.map(sec => {
                          const sel = isClassSectionSelected(cls.id, sec.id);
                          return (
                            <TouchableOpacity
                              key={sec.id}
                              style={[styles.sectionChip, {
                                backgroundColor: sel ? '#556ee6' : (isDark ? '#1a1a2e' : '#1e293b'),
                                borderColor: sel ? '#556ee6' : 'transparent',
                              }]}
                              onPress={() => toggleClassSection(cls.id, sec.id)}
                            >
                              <Text style={[styles.sectionChipText, { color: sel ? 'white' : '#94a3b8' }]}>
                                Section {sec.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {classSections.length > 0 && (
                  <Text style={[styles.hint, { color: colors['muted-foreground'] as string, marginTop: 8 }]}>
                    {classSections.length} class-section{classSections.length !== 1 ? 's' : ''} selected
                  </Text>
                )}

                <View style={styles.nextRow}>
                  <TouchableOpacity
                    style={[styles.nextBtn, { opacity: classSections.length === 0 ? 0.4 : 1 }]}
                    onPress={() => { if (classSections.length > 0) advance(2, 3); }}
                    disabled={classSections.length === 0}
                  >
                    <Text style={styles.nextBtnText}>Next: Subject Config</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Section 3: Subject Configuration ── */}
            <SectionHeader num={3} title="Subject Configuration" open={open.has(3)} completed={done.has(3)} onPress={() => toggle(3)} />
            {open.has(3) && (
              <View style={styles.sectionBody}>
                {classSections.length === 0 ? (
                  <Text style={[styles.hint, { color: colors['muted-foreground'] as string }]}>Please select class-sections first.</Text>
                ) : (
                  classSections.map(cs => {
                    const clsName = getClassName(cs.class_id);
                    const secName = getSectionName(cs.class_id, cs.section_id);
                    const label = secName ? `${clsName} — ${secName}` : clsName;
                    const subjects = subjectsByClass[cs.class_id] ?? [];
                    const configs = getConfigForCs(cs.class_id, cs.section_id);

                    return (
                      <View key={`${cs.class_id}|${cs.section_id}`} style={[styles.subjectGroup, { borderColor: borderCol, backgroundColor: isDark ? '#0f0f23' : '#f8fafc' }]}>
                        <View style={styles.subjectGroupHeader}>
                          <Text style={[styles.subjectGroupTitle, { color: colors.foreground as string }]}>{label}</Text>
                          <Text style={[styles.subjectCount, { color: colors['muted-foreground'] as string }]}>
                            {configs.length} subject{configs.length !== 1 ? 's' : ''}
                          </Text>
                        </View>

                        {subjects.length === 0 ? (
                          <Text style={[styles.hint, { color: colors['muted-foreground'] as string }]}>Loading subjects…</Text>
                        ) : (
                          subjects.map(subj => {
                            const cfg = configs.find(c => c.subject_id === subj.id);
                            const added = !!cfg;

                            return (
                              <View key={subj.id} style={[styles.subjectRow, { borderTopColor: borderCol }]}>
                                <TouchableOpacity
                                  style={[styles.checkbox, {
                                    backgroundColor: added ? '#10B981' : 'transparent',
                                    borderColor: added ? '#10B981' : (isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1'),
                                  }]}
                                  onPress={() => added ? removeSubjectConfig(cs.class_id, cs.section_id, subj.id) : addSubjectConfig(cs.class_id, cs.section_id, subj.id)}
                                >
                                  {added && <Ionicons name="checkmark" size={12} color="white" />}
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.subjectName, { color: colors.foreground as string }]}>{subj.name}</Text>

                                  {added && cfg && (
                                    <View style={styles.componentBlock}>
                                      {/* Grade Scheme + Credit Hours */}
                                      <View style={styles.twoCol}>
                                        <View style={{ flex: 2 }}>
                                          <Text style={[styles.compLabel, { color: colors['muted-foreground'] as string, marginBottom: 4 }]}>Grade Scheme</Text>
                                          <CustomDropdown
                                            data={[
                                              { label: 'Default', value: '' },
                                              ...gradeSchemes.map(gs => ({ label: gs.name, value: gs.id })),
                                            ]}
                                            value={cfg.subject_grade_scheme_id ?? ''}
                                            onChange={v => upsertConfig(cs.class_id, cs.section_id, subj.id, {
                                              subject_grade_scheme_id: v && v !== '' ? String(v) : null,
                                            })}
                                            placeholder="Default"
                                            search={false}
                                            containerStyle={styles.dropdownContainerSm}
                                            style={{ height: 30, paddingHorizontal: 8, paddingVertical: 0, borderRadius: 6, fontSize: 12 }}
                                            selectedTextStyle={{ fontSize: 12 }}
                                            placeholderStyle={{ fontSize: 12 }}
                                          />
                                        </View>
                                        <View style={{ width: 8 }} />
                                        <View style={{ flex: 1 }}>
                                          <Text style={[styles.compLabel, { color: colors['muted-foreground'] as string, marginBottom: 4 }]}>Credit Hours</Text>
                                          <TextInput
                                            style={[styles.compInput, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                                            value={cfg.credit_hours != null ? String(cfg.credit_hours) : ''}
                                            onChangeText={v => upsertConfig(cs.class_id, cs.section_id, subj.id, {
                                              credit_hours: v ? Number(v) : null,
                                            })}
                                            keyboardType="numeric"
                                            placeholder="—"
                                            placeholderTextColor={colors['muted-foreground'] as string}
                                          />
                                        </View>
                                      </View>

                                      <Text style={[styles.compHeader, { color: colors['muted-foreground'] as string, marginTop: 8 }]}>Mark Components</Text>

                                      {cfg.components.map((comp, ci) => (
                                        <View key={ci} style={[styles.compRow, { borderColor: borderCol }]}>
                                          <View style={styles.twoCol}>
                                            <View style={{ flex: 2 }}>
                                              <Text style={[styles.compLabel, { color: colors['muted-foreground'] as string }]}>Component</Text>
                                              <TextInput
                                                style={[styles.compInput, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                                                value={comp.component_name}
                                                onChangeText={v => updateComponent(cs.class_id, cs.section_id, subj.id, ci, { component_name: v })}
                                                placeholder="e.g. Written"
                                                placeholderTextColor={colors['muted-foreground'] as string}
                                              />
                                            </View>
                                            <View style={{ width: 8 }} />
                                            <View style={{ flex: 1 }}>
                                              <Text style={[styles.compLabel, { color: colors['muted-foreground'] as string }]}>Type</Text>
                                              <View style={styles.miniChips}>
                                                {ENTRY_TYPES.map(et => (
                                                  <TouchableOpacity
                                                    key={et.value}
                                                    style={[styles.miniChip, {
                                                      backgroundColor: comp.entry_type === et.value ? '#556ee6' : inputBg,
                                                      borderColor: comp.entry_type === et.value ? '#556ee6' : borderCol,
                                                    }]}
                                                    onPress={() => updateComponent(cs.class_id, cs.section_id, subj.id, ci, { entry_type: et.value })}
                                                  >
                                                    <Text style={[styles.miniChipText, { color: comp.entry_type === et.value ? 'white' : colors['muted-foreground'] as string }]}>
                                                      {et.label}
                                                    </Text>
                                                  </TouchableOpacity>
                                                ))}
                                              </View>
                                            </View>
                                          </View>

                                          {comp.entry_type === 'marks' && (
                                            <View style={[styles.twoCol, { marginTop: 6 }]}>
                                              <View style={{ flex: 1 }}>
                                                <Text style={[styles.compLabel, { color: colors['muted-foreground'] as string }]}>Max Marks</Text>
                                                <TextInput
                                                  style={[styles.compInput, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                                                  value={comp.max_marks != null ? String(comp.max_marks) : ''}
                                                  onChangeText={v => updateComponent(cs.class_id, cs.section_id, subj.id, ci, { max_marks: v ? Number(v) : null })}
                                                  keyboardType="numeric"
                                                  placeholder="—"
                                                  placeholderTextColor={colors['muted-foreground'] as string}
                                                />
                                              </View>
                                              <View style={{ width: 8 }} />
                                              <View style={{ flex: 1 }}>
                                                <Text style={[styles.compLabel, { color: colors['muted-foreground'] as string }]}>Min Pass</Text>
                                                <TextInput
                                                  style={[styles.compInput, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                                                  value={comp.min_pass_marks != null ? String(comp.min_pass_marks) : ''}
                                                  onChangeText={v => updateComponent(cs.class_id, cs.section_id, subj.id, ci, { min_pass_marks: v ? Number(v) : null })}
                                                  keyboardType="numeric"
                                                  placeholder="—"
                                                  placeholderTextColor={colors['muted-foreground'] as string}
                                                />
                                              </View>
                                              <View style={{ width: 8 }} />
                                              <TouchableOpacity
                                                style={[styles.inTotalChip, { backgroundColor: comp.include_in_total ? '#10B981' : inputBg, borderColor: comp.include_in_total ? '#10B981' : borderCol, marginTop: 16 }]}
                                                onPress={() => updateComponent(cs.class_id, cs.section_id, subj.id, ci, { include_in_total: !comp.include_in_total })}
                                              >
                                                <Text style={{ color: comp.include_in_total ? 'white' : colors['muted-foreground'] as string, fontSize: 10, fontWeight: '600' }}>
                                                  In Total
                                                </Text>
                                              </TouchableOpacity>
                                            </View>
                                          )}

                                          <TouchableOpacity
                                            style={styles.removeCompBtn}
                                            onPress={() => removeComponent(cs.class_id, cs.section_id, subj.id, ci)}
                                          >
                                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                                            <Text style={{ color: '#EF4444', fontSize: 11 }}>Remove</Text>
                                          </TouchableOpacity>
                                        </View>
                                      ))}

                                      <TouchableOpacity
                                        style={styles.addCompBtn}
                                        onPress={() => addComponent(cs.class_id, cs.section_id, subj.id)}
                                      >
                                        <Ionicons name="add" size={14} color="#556ee6" />
                                        <Text style={{ color: '#556ee6', fontSize: 12, fontWeight: '600' }}>Add Component</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    );
                  })
                )}

                <View style={styles.nextRow}>
                  <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={() => advance(3, 4)}
                  >
                    <Text style={styles.nextBtnText}>Next: Exam Dates (Optional)</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Section 4: Exam Dates ── */}
            <SectionHeader num={4} title="Exam Dates (Optional)" open={open.has(4)} completed={done.has(4)} onPress={() => toggle(4)} />
            {open.has(4) && (
              <View style={styles.sectionBody}>
                <Text style={[styles.hint, { color: colors['muted-foreground'] as string }]}>
                  Add exam dates now or later from the exam detail page
                </Text>

                {/* Add date form */}
                <View style={[styles.dateForm, { borderColor: borderCol }]}>
                  <Text style={[styles.compHeader, { color: colors['muted-foreground'] as string, marginBottom: 8 }]}>Add Exam Date</Text>

                  <FieldLabel text="Class-Section" required />
                  <CustomDropdown
                    data={classSections.map(cs => ({
                      label: getSectionName(cs.class_id, cs.section_id)
                        ? `${getClassName(cs.class_id)} – ${getSectionName(cs.class_id, cs.section_id)}`
                        : getClassName(cs.class_id),
                      value: `${cs.class_id}|${cs.section_id ?? ''}`,
                    }))}
                    value={newDate.class_id ? `${newDate.class_id}|${newDate.section_id ?? ''}` : null}
                    onChange={v => {
                      if (!v) return;
                      const [cid, sid] = String(v).split('|');
                      setNewDate(p => ({ ...p, class_id: cid, section_id: sid || null, subject_id: '' }));
                    }}
                    placeholder="Select Class-Section"
                    search={false}
                    containerStyle={styles.dropdownContainer}
                  />

                  <FieldLabel text="Subject" required />
                  <CustomDropdown
                    data={(subjectsByClass[newDate.class_id] ?? []).map(s => ({ label: s.name, value: s.id }))}
                    value={newDate.subject_id || null}
                    onChange={v => setNewDate(p => ({ ...p, subject_id: v ? String(v) : '' }))}
                    placeholder="Select Subject"
                    search={false}
                    containerStyle={styles.dropdownContainer}
                  />

                  <FieldLabel text="Date" required />
                  <TouchableOpacity
                    style={[styles.timeBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                    onPress={() => openDatePicker('examDate')}
                  >
                    <Ionicons name="calendar-outline" size={15} color={colors['muted-foreground'] as string} />
                    <Text style={[styles.timeBtnText, { color: newDate.exam_date ? colors.foreground as string : colors['muted-foreground'] as string }]}>
                      {newDate.exam_date || 'Tap to select date'}
                    </Text>
                    {!!newDate.exam_date && (
                      <TouchableOpacity onPress={() => setNewDate(p => ({ ...p, exam_date: '' }))}>
                        <Ionicons name="close-circle" size={16} color={colors['muted-foreground'] as string} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <FieldLabel text="Start Time" />
                      <TouchableOpacity
                        style={[styles.timeBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                        onPress={() => openTimePicker('start_time')}
                      >
                        <Ionicons name="time-outline" size={15} color={colors['muted-foreground'] as string} />
                        <Text style={[styles.timeBtnText, { color: newDate.start_time ? colors.foreground as string : colors['muted-foreground'] as string }]}>
                          {formatTime12h(newDate.start_time) || 'Tap to set'}
                        </Text>
                        {!!newDate.start_time && (
                          <TouchableOpacity onPress={() => setNewDate(p => ({ ...p, start_time: '' }))}>
                            <Ionicons name="close-circle" size={16} color={colors['muted-foreground'] as string} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={{ width: 10 }} />
                    <View style={{ flex: 1 }}>
                      <FieldLabel text="End Time" />
                      <TouchableOpacity
                        style={[styles.timeBtn, { borderColor: borderCol, backgroundColor: inputBg }]}
                        onPress={() => openTimePicker('end_time')}
                      >
                        <Ionicons name="time-outline" size={15} color={colors['muted-foreground'] as string} />
                        <Text style={[styles.timeBtnText, { color: newDate.end_time ? colors.foreground as string : colors['muted-foreground'] as string }]}>
                          {formatTime12h(newDate.end_time) || 'Tap to set'}
                        </Text>
                        {!!newDate.end_time && (
                          <TouchableOpacity onPress={() => setNewDate(p => ({ ...p, end_time: '' }))}>
                            <Ionicons name="close-circle" size={16} color={colors['muted-foreground'] as string} />
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  <FieldLabel text="Venue" />
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, color: colors.foreground as string, borderColor: borderCol }]}
                    value={newDate.venue}
                    onChangeText={v => setNewDate(p => ({ ...p, venue: v }))}
                    placeholder="Room / Hall"
                    placeholderTextColor={colors['muted-foreground'] as string}
                  />

                  <TouchableOpacity
                    style={[styles.addDateBtn, { opacity: !newDate.class_id || !newDate.subject_id || !newDate.exam_date ? 0.4 : 1 }]}
                    onPress={addExamDate}
                    disabled={!newDate.class_id || !newDate.subject_id || !newDate.exam_date}
                  >
                    <Ionicons name="add" size={16} color="#556ee6" />
                    <Text style={{ color: '#556ee6', fontWeight: '700' }}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* Date list */}
                <View style={[styles.dateTable, { borderColor: borderCol }]}>
                  <View style={[styles.dateTableHeader, { borderColor: borderCol }]}>
                    {['Subject', 'Class-Section', 'Date', 'Start', 'End', 'Venue'].map(h => (
                      <Text key={h} style={[styles.dateTableHead, { color: colors['muted-foreground'] as string }]}>{h}</Text>
                    ))}
                  </View>
                  {examDates.length === 0 ? (
                    <Text style={[styles.hint, { color: colors['muted-foreground'] as string, padding: 12 }]}>
                      No dates added yet. Use the form above to add dates, or skip and add later.
                    </Text>
                  ) : (
                    examDates.map((d, i) => (
                      <View key={i} style={[styles.dateTableRow, { borderColor: borderCol }]}>
                        <Text style={[styles.dateCell, { color: colors.foreground as string }]}>{getSubjectName(d.class_id, d.subject_id)}</Text>
                        <Text style={[styles.dateCell, { color: colors['muted-foreground'] as string }]}>
                          {getClassName(d.class_id)}{d.section_id ? ` – ${getSectionName(d.class_id, d.section_id)}` : ''}
                        </Text>
                        <Text style={[styles.dateCell, { color: colors['muted-foreground'] as string }]}>{d.exam_date}</Text>
                        <Text style={[styles.dateCell, { color: colors['muted-foreground'] as string }]}>{d.start_time ? formatTime12h(d.start_time) : '—'}</Text>
                        <Text style={[styles.dateCell, { color: colors['muted-foreground'] as string }]}>{d.end_time ? formatTime12h(d.end_time) : '—'}</Text>
                        <Text style={[styles.dateCell, { color: colors['muted-foreground'] as string }]}>{d.venue ?? '—'}</Text>
                      </View>
                    ))
                  )}
                </View>

                <View style={styles.nextRow}>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => advance(4, 5)}>
                    <Text style={styles.nextBtnText}>Review & Submit</Text>
                    <Ionicons name="arrow-forward" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Section 5: Review & Submit ── */}
            <SectionHeader num={5} title="Review & Submit" open={open.has(5)} completed={false} onPress={() => toggle(5)} />
            {open.has(5) && (
              <View style={styles.sectionBody}>
                {/* Validation errors */}
                {missingItems.length > 0 && (
                  <View style={styles.errorBox}>
                    <View style={styles.errorBoxHeader}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={styles.errorBoxTitle}>Missing required information</Text>
                    </View>
                    {missingItems.map((m, i) => (
                      <Text key={i} style={styles.errorItem}>• {m}</Text>
                    ))}
                  </View>
                )}

                {/* 1 · Exam Details */}
                <View style={[styles.reviewSection, { borderColor: borderCol }]}>
                  <View style={styles.reviewSectionHeader}>
                    <Text style={[styles.reviewSectionTitle, { color: colors.foreground as string }]}>1 · Exam Details</Text>
                    <TouchableOpacity onPress={() => setOpen(new Set([1]))}>
                      <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.reviewGrid}>
                    {[
                      ['Exam Name', examName || '—', true],
                      ['Board', board, true],
                      ['Level', LEVEL_OPTIONS.find(l => l.value === level)?.label ?? level, true],
                      ['Exam Type', examType || '—', true],
                      ['Nature', nature, true],
                      ['Academic Year', (academicYears.find(y => String(y.id) === academicYearId)?.title ?? academicYearId) || '—', true],
                      ['Grade Scheme', gradeSchemes.find(g => g.id === gradeSchemeId)?.name ?? '—', false],
                      ['Mark Entry Deadline', markDeadline || '—', false],
                      ['Min Attendance %', minAttendance || '—', false],
                      ['Attendance From', attendanceFrom || '—', false],
                      ['Attendance To', attendanceTo || '—', false],
                    ].map(([label, val, req]) => (
                      <View key={label as string} style={styles.reviewField}>
                        <Text style={[styles.reviewLabel, { color: colors['muted-foreground'] as string }]}>
                          {label}{req ? <Text style={{ color: '#EF4444' }}> *</Text> : ''}
                        </Text>
                        <Text style={[styles.reviewValue, { color: colors.foreground as string }]}>{val as string}</Text>
                      </View>
                    ))}
                    <View style={styles.reviewField}>
                      <Text style={[styles.reviewLabel, { color: colors['muted-foreground'] as string }]}>Options</Text>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {publishRank && <View style={styles.optionBadge}><Text style={styles.optionBadgeText}>Publish Rank</Text></View>}
                        {isInternal  && <View style={styles.optionBadge}><Text style={styles.optionBadgeText}>Internal</Text></View>}
                      </View>
                    </View>
                  </View>
                </View>

                {/* 2 · Class & Sections */}
                <View style={[styles.reviewSection, { borderColor: borderCol }]}>
                  <View style={styles.reviewSectionHeader}>
                    <Text style={[styles.reviewSectionTitle, { color: colors.foreground as string }]}>2 · Class & Sections</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {classSections.length > 0 && (
                        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{classSections.length} selected</Text></View>
                      )}
                      <TouchableOpacity onPress={() => setOpen(new Set([2]))}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.tagWrap}>
                    {classSections.length === 0
                      ? <Text style={[styles.hint, { color: '#EF4444' }]}>None selected — required.</Text>
                      : classSections.map(cs => (
                          <View key={`${cs.class_id}|${cs.section_id}`} style={styles.reviewTag}>
                            <Text style={styles.reviewTagText}>
                              {getClassName(cs.class_id)}{cs.section_id ? ` – ${getSectionName(cs.class_id, cs.section_id)}` : ''}
                            </Text>
                          </View>
                        ))
                    }
                  </View>
                </View>

                {/* 3 · Subject Configuration */}
                <View style={[styles.reviewSection, { borderColor: borderCol }]}>
                  <View style={styles.reviewSectionHeader}>
                    <Text style={[styles.reviewSectionTitle, { color: colors.foreground as string }]}>3 · Subject Configuration</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      {activeConfigs.length === 0
                        ? <View style={[styles.countBadge, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.countBadgeText, { color: '#EF4444' }]}>None configured</Text></View>
                        : <View style={styles.countBadge}><Text style={styles.countBadgeText}>{activeConfigs.length} subject{activeConfigs.length !== 1 ? 's' : ''}</Text></View>
                      }
                      <TouchableOpacity onPress={() => setOpen(new Set([3]))}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
                    </View>
                  </View>
                  {activeConfigs.length === 0
                    ? <Text style={[styles.hint, { color: '#EF4444' }]}>⚠ No subjects configured — required.</Text>
                    : activeConfigs.map(cfg => (
                        <Text key={`${cfg.class_id}|${cfg.section_id}|${cfg.subject_id}`} style={[styles.hint, { color: colors['muted-foreground'] as string }]}>
                          • {getSubjectName(cfg.class_id, cfg.subject_id)} ({cfg.components.length} component{cfg.components.length !== 1 ? 's' : ''})
                        </Text>
                      ))
                  }
                </View>

                {/* 4 · Exam Dates */}
                <View style={[styles.reviewSection, { borderColor: borderCol }]}>
                  <View style={styles.reviewSectionHeader}>
                    <Text style={[styles.reviewSectionTitle, { color: colors.foreground as string }]}>4 · Exam Dates</Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <View style={styles.countBadge}><Text style={styles.countBadgeText}>{examDates.length} date{examDates.length !== 1 ? 's' : ''}</Text></View>
                      <TouchableOpacity onPress={() => setOpen(new Set([4]))}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.hint, { color: colors['muted-foreground'] as string }]}>
                    {examDates.length === 0 ? 'No exam dates added — can be added after creation.' : `${examDates.length} date(s) scheduled.`}
                  </Text>
                </View>
              </View>
            )}

          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Time Picker */}
        <TimePickerModal
          visible={showTimePicker}
          initialTime={newDate[activeTimeField] || ''}
          onConfirm={confirmTime}
          onCancel={() => setShowTimePicker(false)}
        />

        {/* Date Picker */}
        <DatePickerModal
          visible={showDatePicker}
          initialDate={dateFieldValues[activeDateField] || ''}
          onConfirm={confirmDate}
          onCancel={() => setShowDatePicker(false)}
        />

        {/* Sticky bottom bar */}
        <View style={[styles.bottomBar, { backgroundColor: cardBg, borderTopColor: borderCol }]}>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: borderCol }]} onPress={() => router.back()}>
            <Text style={[styles.cancelBtnText, { color: colors.foreground as string }]}>Cancel</Text>
          </TouchableOpacity>

          {missingItems.length > 0 && (
            <Text style={styles.issueText}>Fix {missingItems.length} issue{missingItems.length !== 1 ? 's' : ''} in Review section</Text>
          )}

          <TouchableOpacity
            style={[styles.createBtn, { opacity: createMutation.isPending ? 0.6 : 1 }]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            <Ionicons name="save-outline" size={16} color="white" />
            <Text style={styles.createBtnText}>{createMutation.isPending ? 'Creating…' : 'Create Exam'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppLayout>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  backText: { fontSize: 14 },

  accordion: { marginHorizontal: 0, borderTopWidth: 1, borderBottomWidth: 1 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  stepBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  completeTag: { fontSize: 11, color: '#10B981', borderWidth: 1, borderColor: '#10B981', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },

  sectionBody: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },

  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 2 },
  dropdownContainer: { marginBottom: 4 },
  dropdownContainerSm: { marginBottom: 6 },
  twoCol: { flexDirection: 'row' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '500' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  switchLabel: { fontSize: 14 },
  hint: { fontSize: 12, lineHeight: 18 },
  nextRow: { alignItems: 'flex-end', marginTop: 16 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#556ee6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  nextBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Class selector
  classCard: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  className: { fontSize: 14, fontWeight: '600', flex: 1 },
  selectedCount: { fontSize: 11, color: '#556ee6', backgroundColor: '#556ee615', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, fontWeight: '600' },
  sectionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingLeft: 32 },
  sectionChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  sectionChipText: { fontSize: 12, fontWeight: '500' },

  // Subject config
  subjectGroup: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  subjectGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  subjectGroupTitle: { fontSize: 13, fontWeight: '700' },
  subjectCount: { fontSize: 11 },
  subjectRow: { flexDirection: 'row', gap: 10, paddingTop: 10, borderTopWidth: 1, marginTop: 8 },
  subjectName: { fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 6 },

  componentBlock: { marginTop: 4 },
  compHeader: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  compRow: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 6 },
  compLabel: { fontSize: 10, marginBottom: 3, fontWeight: '500' },
  compInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12 },
  miniChips: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  miniChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  miniChipText: { fontSize: 10, fontWeight: '600' },
  inTotalChip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  removeCompBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addCompBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },

  // Time picker button
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 2 },
  timeBtnText: { flex: 1, fontSize: 13 },

  // Exam dates
  dateForm: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 12, marginBottom: 12 },
  addDateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#556ee6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8, alignSelf: 'flex-start' },
  dateTable: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  dateTableHeader: { flexDirection: 'row', borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.03)', padding: 8 },
  dateTableHead: { flex: 1, fontSize: 10, fontWeight: '700' },
  dateTableRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1 },
  dateCell: { flex: 1, fontSize: 10 },

  // Review
  errorBox: { borderRadius: 10, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', padding: 12, marginBottom: 12 },
  errorBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  errorBoxTitle: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  errorItem: { color: '#EF4444', fontSize: 12, marginLeft: 8 },
  reviewSection: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, overflow: 'hidden' },
  reviewSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  reviewSectionTitle: { fontSize: 13, fontWeight: '700' },
  editLink: { color: '#556ee6', fontSize: 12, fontWeight: '600' },
  reviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  reviewField: { width: '48%', marginBottom: 8 },
  reviewLabel: { fontSize: 11, marginBottom: 2 },
  reviewValue: { fontSize: 13, fontWeight: '600' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reviewTag: { backgroundColor: '#556ee615', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  reviewTagText: { color: '#556ee6', fontSize: 12, fontWeight: '600' },
  countBadge: { backgroundColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  countBadgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  optionBadge: { backgroundColor: '#556ee615', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  optionBadgeText: { fontSize: 11, color: '#556ee6', fontWeight: '600' },

  // Bottom bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderTopWidth: 1 },
  cancelBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  issueText: { flex: 1, color: '#F59E0B', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#556ee6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  createBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
});
