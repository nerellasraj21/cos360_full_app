import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { escapeCsv } from '@/src/utils/exportCsv';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import {
  useClassSections,
  useCreateClassSection,
  useCreateSectionForClass,
  useUpdateClass,
  useDeleteClass,
  useUpdateSection,
  useDeleteSection,
} from '@/src/api/hooks/masters/classesAndSections';
import type { ClassRead, SectionRead } from '@/src/api';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useTheme, useAcademicYear } from '@/contexts';

// ─── Edit Class Modal ────────────────────────────────────────────────────────

function EditClassModal({
  visible,
  classData,
  onClose,
  onSubmit,
  isPending,
  themeColors,
}: {
  visible: boolean;
  classData: ClassRead | null;
  onClose: () => void;
  onSubmit: (classId: string, data: { name: string; short_code: string; description: string; is_active: boolean; academic_year_id: string }) => void;
  isPending: boolean;
  themeColors: any;
}) {
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  React.useEffect(() => {
    if (classData) {
      setName(classData.name);
      setShortCode(classData.short_code || '');
      setDescription(classData.description || '');
      setIsActive(classData.is_active ?? true);
    }
  }, [classData]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (!classData) return;
    onSubmit(classData.id, { name: name.trim(), short_code: shortCode.trim(), description: description.trim(), is_active: isActive, academic_year_id: classData.academic_year_id });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>Edit Class</ThemedText>
            <TouchableOpacity onPress={onClose}
              accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Class Name *</ThemedText>
              <TextInput
                style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                placeholder="e.g., Class 1"
                placeholderTextColor={themeColors['muted-foreground']}
                value={name}
                onChangeText={setName}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Class Code</ThemedText>
              <TextInput
                style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                placeholder="e.g., C1"
                placeholderTextColor={themeColors['muted-foreground']}
                value={shortCode}
                onChangeText={setShortCode}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Description</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                placeholder="Optional description..."
                placeholderTextColor={themeColors['muted-foreground']}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.formRowGroup}>
              <ThemedText style={styles.formRowLabel}>Active</ThemedText>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsActive(v => !v)}
                activeOpacity={0.75}
              >
                <Ionicons name={isActive ? 'checkbox' : 'square-outline'} size={24} color={themeColors.primary} />
                <ThemedText style={styles.checkboxLabel}>Class is active</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={onClose}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitBtn, { backgroundColor: themeColors.primary }]}
              onPress={handleSubmit}
              disabled={isPending || !name.trim()}
            >
              <ThemedText style={styles.submitBtnText}>{isPending ? 'Saving...' : 'Update Class'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit / Add Section Modal ─────────────────────────────────────────────────

function SectionModal({
  visible,
  sectionData,
  className,
  onClose,
  onSubmit,
  isPending,
  themeColors,
}: {
  visible: boolean;
  sectionData: SectionRead | null; // null = create mode
  className: string;
  onClose: () => void;
  onSubmit: (name: string, isActive: boolean) => void;
  isPending: boolean;
  themeColors: any;
}) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const { showError } = useToastContext();

  React.useEffect(() => {
    if (sectionData) {
      setName(sectionData.name);
      setIsActive(sectionData.is_active ?? true);
    } else {
      setName('');
      setIsActive(true);
    }
  }, [sectionData, visible]);

  const handleSubmit = () => {
    if (!name.trim()) {
      showError('Validation', 'Section name is required');
      return;
    }
    onSubmit(name.trim(), isActive);
  };

  const isEdit = !!sectionData;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View>
              <ThemedText type="title" style={styles.modalTitle}>
                {isEdit ? 'Edit Section' : 'Add New Section'}
              </ThemedText>
              <ThemedText style={[styles.modalSubtitle, { color: themeColors['muted-foreground'] }]}>
                Class: {className}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={onClose}
              accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Section Name *</ThemedText>
              <TextInput
                style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                placeholder="e.g., A, B, C"
                placeholderTextColor={themeColors['muted-foreground']}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>
            <View style={styles.formRowGroup}>
              <ThemedText style={styles.formRowLabel}>Active</ThemedText>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setIsActive(v => !v)}
                activeOpacity={0.75}
              >
                <Ionicons name={isActive ? 'checkbox' : 'square-outline'} size={24} color={themeColors.primary} />
                <ThemedText style={styles.checkboxLabel}>Section is active</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={onClose}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitBtn, { backgroundColor: themeColors.primary }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              <ThemedText style={styles.submitBtnText}>
                {isPending ? 'Saving...' : (isEdit ? 'Update Section' : 'Add Section')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Create Class + Sections Modal ───────────────────────────────────────────

function CreateClassModal({
  visible,
  onClose,
  onSubmit,
  isPending,
  themeColors,
  activeAcademicYearId,
  academicYearTitle,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  themeColors: any;
  activeAcademicYearId: string | null;
  academicYearTitle: string | null;
}) {
  const [step, setStep] = useState(0); // 0 = Class Details, 1 = Add Sections, 2 = Summary
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sections, setSections] = useState<string[]>(['']);
  const [startLetter, setStartLetter] = useState('A');
  const [endLetter, setEndLetter] = useState('D');
  const { showError, showSuccess } = useToastContext();

  const reset = () => {
    setStep(0);
    setClassName('');
    setClassCode('');
    setIsActive(true);
    setSections(['']);
    setStartLetter('A');
    setEndLetter('D');
  };

  const handleClose = () => { reset(); onClose(); };

  const isClassStepValid = className.trim() && classCode.trim();
  const isSectionsStepValid = sections.length > 0 && sections.every(s => s.trim());

  const handleNext = () => {
    if (!isClassStepValid) return;
    setStep(1);
  };

  const handleBack = () => setStep(0);

  const addSection = () => setSections(prev => [...prev, '']);
  const removeSection = (idx: number) =>
    setSections(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const generateSectionsAlphabetically = () => {
    const start = startLetter.toUpperCase().charCodeAt(0);
    const end = endLetter.toUpperCase().charCodeAt(0);

    if (start > end) {
      showError('Validation', 'Start letter must come before end letter');
      return;
    }
    if (start < 65 || start > 90 || end < 65 || end > 90) {
      showError('Validation', 'Please use letters A-Z only');
      return;
    }

    const newSections: string[] = [];
    for (let i = start; i <= end; i++) newSections.push(String.fromCharCode(i));
    setSections(newSections);
    showSuccess('Sections Generated', `Generated ${newSections.length} sections from ${startLetter} to ${endLetter}`);
  };

  const handleView = () => {
    if (!isSectionsStepValid) return;
    setStep(2);
  };

  const handleSubmit = () => {
    if (!className.trim()) { showError('Validation', 'Class name is required'); return; }
    if (!classCode.trim()) { showError('Validation', 'Class code is required'); return; }
    if (!activeAcademicYearId) { showError('Error', 'No active academic year'); return; }
    const validSections = sections.filter(s => s.trim());
    if (validSections.length === 0) { showError('Validation', 'At least one section is required'); return; }
    onSubmit({
      name: className.trim(),
      short_code: classCode.trim(),
      is_active: isActive,
      academic_year_id: activeAcademicYearId,
      sections: validSections.map(s => ({ name: s.trim() })),
    });
    reset();
  };

  const stepTitle = step === 0 ? 'Enter Class Details' : step === 1 ? 'Add Sections' : 'Summary';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>{stepTitle}</ThemedText>
            <TouchableOpacity onPress={handleClose}
              accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {step === 0 && (
              <>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Class Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                    placeholder="e.g., Class 1"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={className}
                    onChangeText={setClassName}
                  />
                </View>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Class Code *</ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                    placeholder="e.g., C1"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={classCode}
                    onChangeText={setClassCode}
                  />
                </View>
                <View style={styles.formRowGroup}>
                  <ThemedText style={styles.formRowLabel}>Active</ThemedText>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setIsActive(v => !v)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={isActive ? 'checkbox' : 'square-outline'} size={24} color={themeColors.primary} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {step === 1 && (
              <>
                <View style={[styles.quickAddBox, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
                  <ThemedText style={styles.quickAddTitle}>Quick Add Sections Alphabetically</ThemedText>
                  <View style={styles.quickAddRow}>
                    <View style={styles.letterField}>
                      <ThemedText style={[styles.letterLabel, { color: themeColors['muted-foreground'] }]}>From:</ThemedText>
                      <TextInput
                        style={[styles.letterInput, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                        value={startLetter}
                        onChangeText={t => setStartLetter(t.toUpperCase().slice(0, 1))}
                        placeholder="A"
                        placeholderTextColor={themeColors['muted-foreground']}
                        maxLength={1}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.letterField}>
                      <ThemedText style={[styles.letterLabel, { color: themeColors['muted-foreground'] }]}>To:</ThemedText>
                      <TextInput
                        style={[styles.letterInput, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                        value={endLetter}
                        onChangeText={t => setEndLetter(t.toUpperCase().slice(0, 1))}
                        placeholder="D"
                        placeholderTextColor={themeColors['muted-foreground']}
                        maxLength={1}
                        autoCapitalize="characters"
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.generateBtn, { borderColor: themeColors.primary }]}
                      onPress={generateSectionsAlphabetically}
                    >
                      <ThemedText style={[styles.generateBtnText, { color: themeColors.primary }]}>Generate Sections</ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText style={[styles.quickAddHint, { color: themeColors['muted-foreground'] }]}>
                    This will create sections from {startLetter} to {endLetter} (e.g., A, B, C, D)
                  </ThemedText>
                </View>

                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Manual Sections</ThemedText>
                  {sections.map((s, i) => (
                    <View key={i} style={styles.sectionRow}>
                      <TextInput
                        style={[styles.sectionInput, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                        placeholder={`Section ${i + 1}`}
                        placeholderTextColor={themeColors['muted-foreground']}
                        value={s}
                        onChangeText={text => setSections(prev => prev.map((v, idx) => idx === i ? text : v))}
                      />
                      <TouchableOpacity
                        style={[styles.smallIconBtn, { borderColor: themeColors.primary }]}
                        onPress={addSection}
                        accessibilityLabel="Add section"
                      >
                        <Ionicons name="add" size={16} color={themeColors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallIconBtn, { borderColor: '#EF4444', opacity: sections.length === 1 ? 0.4 : 1 }]}
                        onPress={() => removeSection(i)}
                        disabled={sections.length === 1}
                        accessibilityLabel="Remove section"
                      >
                        <Ionicons name="close" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <ThemedText style={[styles.totalSectionsText, { color: themeColors['muted-foreground'] }]}>
                    Total sections: {sections.length}
                  </ThemedText>
                </View>
              </>
            )}

            {step === 2 && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Class Name:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{className}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Class Code:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{classCode}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Year:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{academicYearTitle || '—'}</ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Active:</ThemedText>
                  <ThemedText style={styles.summaryValue}>{isActive ? 'Yes' : 'No'}</ThemedText>
                </View>
                <ThemedText style={[styles.label, { marginTop: 8 }]}>Sections:</ThemedText>
                <View style={[styles.summarySectionsBox, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
                  {sections.filter(s => s.trim()).map((s, i) => (
                    <ThemedText key={i} style={styles.summarySectionItem}>• {s}</ThemedText>
                  ))}
                </View>
                <ThemedText style={[styles.totalSectionsText, { color: themeColors['muted-foreground'] }]}>
                  Total sections: {sections.filter(s => s.trim()).length}
                </ThemedText>
              </View>
            )}
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={handleClose}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            {step > 0 && step < 2 && (
              <TouchableOpacity style={[styles.button, styles.backBtnFooter, { borderColor: themeColors.border }]} onPress={handleBack}>
                <ThemedText style={[styles.cancelBtnText, { color: themeColors['card-foreground'] }]}>Back</ThemedText>
              </TouchableOpacity>
            )}
            {step === 0 && (
              <TouchableOpacity
                style={[styles.button, styles.submitBtn, { backgroundColor: themeColors.primary, opacity: isClassStepValid ? 1 : 0.5 }]}
                onPress={handleNext}
                disabled={!isClassStepValid}
              >
                <ThemedText style={styles.submitBtnText}>Next</ThemedText>
              </TouchableOpacity>
            )}
            {step === 1 && (
              <TouchableOpacity
                style={[styles.button, styles.submitBtn, { backgroundColor: themeColors.primary, opacity: isSectionsStepValid ? 1 : 0.5 }]}
                onPress={handleView}
                disabled={!isSectionsStepValid}
              >
                <ThemedText style={styles.submitBtnText}>View</ThemedText>
              </TouchableOpacity>
            )}
            {step === 2 && (
              <>
                <TouchableOpacity style={[styles.button, styles.backBtnFooter, { borderColor: themeColors.border }]} onPress={() => setStep(0)}>
                  <ThemedText style={[styles.cancelBtnText, { color: themeColors['card-foreground'] }]}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitBtn, { backgroundColor: themeColors.primary }]}
                  onPress={handleSubmit}
                  disabled={isPending}
                >
                  <ThemedText style={styles.submitBtnText}>{isPending ? 'Creating...' : 'Submit'}</ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

// Toggleable card fields (mirrors the web app's column selector)
const ALL_FIELDS = [
  { key: 'short_code', label: 'Class Code' },
  { key: 'sections', label: 'Sections' },
  { key: 'is_active', label: 'Status' },
];

export default function ClassesAndSectionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Columns (visible card fields) + Export
  const [showColumnsOptions, setShowColumnsOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [visibleFields, setVisibleFields] = useState<Set<string>>(
    new Set(ALL_FIELDS.map((f) => f.key))
  );

  // Create class modal
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Edit class modal
  const [editClassModal, setEditClassModal] = useState<{ visible: boolean; classData: ClassRead | null }>({
    visible: false, classData: null,
  });

  // Section modal (edit OR add)
  const [sectionModal, setSectionModal] = useState<{
    visible: boolean;
    section: SectionRead | null;
    classId: string;
    className: string;
  }>({ visible: false, section: null, classId: '', className: '' });

  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { activeAcademicYear, activeAcademicYearId } = useAcademicYear();
  const { showSuccess, showError } = useToastContext();

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  const { data: classSectionsData, isLoading, error, refetch } = useClassSections(
    activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined
  );

  const createMutation = useCreateClassSection();
  const updateClassMutation = useUpdateClass();
  const deleteClassMutation = useDeleteClass();
  const createSectionMutation = useCreateSectionForClass();
  const updateSectionMutation = useUpdateSection();
  const deleteSectionMutation = useDeleteSection();

  // Filter classes by search query
  const filteredData = useMemo((): ClassRead[] => {
    if (!classSectionsData || !Array.isArray(classSectionsData)) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return classSectionsData;
    return classSectionsData.filter((cls: ClassRead) =>
      cls.name.toLowerCase().includes(q) ||
      (cls.short_code || '').toLowerCase().includes(q) ||
      cls.sections.some((s: SectionRead) => s.name.toLowerCase().includes(q))
    );
  }, [classSectionsData, searchQuery]);

  const toggleExpand = (classId: string) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId); else next.add(classId);
      return next;
    });
  };

  // ── Columns (visible card fields) ────────────────────────────────────────────

  const toggleField = (key: string) => {
    setVisibleFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least one
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const selectAllFields = () => setVisibleFields(new Set(ALL_FIELDS.map((f) => f.key)));
  const deselectAllFields = () => setVisibleFields(new Set([ALL_FIELDS[0].key]));

  // ── Export (mirrors the web app's Classes & Sections Export menu: CSV / Excel) ──

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'name', label: 'Class Name' },
      ...ALL_FIELDS.filter((f) => visibleFields.has(f.key)),
    ],
    [visibleFields]
  );

  const getExportValue = (cls: ClassRead, key: string): string => {
    switch (key) {
      case 'name': return cls.name;
      case 'short_code': return cls.short_code || '';
      case 'sections': return cls.sections.map((s) => s.name).join('; ');
      case 'is_active': return cls.is_active ? 'Active' : 'Inactive';
      default: return '';
    }
  };

  // Web: real blob download, identical to the web app. Native: write the file
  // locally and hand it to the OS share sheet so it can be saved/shared.
  const shareOrDownload = async (filename: string, content: string, mimeType: string) => {
    if (Platform.OS === 'web') {
      const w = globalThis as any;
      const blob = new w.Blob([content], { type: `${mimeType};charset=utf-8;` });
      const url = w.URL.createObjectURL(blob);
      const link = w.document.createElement('a');
      link.href = url;
      link.download = filename;
      w.document.body.appendChild(link);
      link.click();
      link.remove();
      w.URL.revokeObjectURL(url);
      return;
    }
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, content);
    await Sharing.shareAsync(fileUri, { mimeType });
  };

  const handleExportCSV = async () => {
    try {
      const headers = EXPORT_COLUMNS.map((c) => c.label);
      const rows = filteredData.map((cls) => EXPORT_COLUMNS.map((c) => getExportValue(cls, c.key)));
      const lines = [headers, ...rows].map((row) => row.map(escapeCsv).join(','));
      await shareOrDownload('classes_sections_data.csv', lines.join('\n'), 'text/csv');
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const headers = EXPORT_COLUMNS.map((c) => c.label);
      const rows = filteredData.map((cls) => EXPORT_COLUMNS.map((c) => getExportValue(cls, c.key)));
      const html = `<table>${[headers, ...rows]
        .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
        .join('')}</table>`;
      await shareOrDownload('classes_sections_data.xls', html, 'application/vnd.ms-excel');
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleEditClass = (cls: ClassRead) =>
    setEditClassModal({ visible: true, classData: cls });

  const handleDeleteClass = (cls: ClassRead) => {
    setDeleteConfirm({
      visible: true,
      title: 'Delete Class',
      message: `Delete "${cls.name}"? This will also delete all associated sections. This action cannot be undone.`,
      onConfirm: () =>
        deleteClassMutation.mutate(cls.id, {
          onError: (e: any) => showError('Delete Failed', e.message || 'Failed to delete class'),
        }),
    });
  };

  const handleAddSection = (cls: ClassRead) =>
    setSectionModal({ visible: true, section: null, classId: cls.id, className: cls.name });

  const handleEditSection = (section: SectionRead, cls: ClassRead) =>
    setSectionModal({ visible: true, section, classId: cls.id, className: cls.name });

  const handleDeleteSection = (section: SectionRead) => {
    setDeleteConfirm({
      visible: true,
      title: 'Delete Section',
      message: `Delete section "${section.name}"? This action cannot be undone.`,
      onConfirm: () =>
        deleteSectionMutation.mutate(section.id, {
          onError: (e: any) => showError('Delete Failed', e.message || 'Failed to delete section'),
        }),
    });
  };

  const handleUpdateClass = (classId: string, data: { name: string; short_code: string; description: string; is_active: boolean; academic_year_id: string }) => {
    updateClassMutation.mutate({ classId, data }, {
      onSuccess: () => setEditClassModal({ visible: false, classData: null }),
    });
  };

  const handleSectionSubmit = (name: string, isActive: boolean) => {
    if (sectionModal.section) {
      // Edit existing section
      updateSectionMutation.mutate(
        { sectionId: sectionModal.section.id, data: { name, is_active: isActive } },
        {
          onSuccess: () => setSectionModal({ visible: false, section: null, classId: '', className: '' }),
          onError: (e: any) => showError('Update Failed', e.message || 'Failed to update section'),
        }
      );
    } else {
      // Add new section to class
      createSectionMutation.mutate(
        { classId: sectionModal.classId, data: { name, is_active: isActive } },
        {
          onSuccess: () => setSectionModal({ visible: false, section: null, classId: '', className: '' }),
          onError: (e: any) => showError('Create Failed', e.message || 'Failed to create section'),
        }
      );
    }
  };

  // ── Render class card ────────────────────────────────────────────────────────

  const renderClassItem = ({ item: cls, index }: { item: ClassRead; index: number }) => {
    const isExpanded = expandedClasses.has(cls.id);
    const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
    const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
    const accentColor = cls.is_active ? themeColors.primary : themeColors['muted-foreground'];

    return (
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
        <View style={{ flex: 1 }}>
          {/* Class header */}
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.cardNameRow}>
                <ThemedText style={[styles.serialNo, { color: themeColors['muted-foreground'] }]}>{index + 1}.</ThemedText>
                <ThemedText style={styles.cardName}>{cls.name}</ThemedText>
              </View>
              {visibleFields.has('short_code') && !!cls.short_code && (
                <ThemedText style={[styles.cardMeta, { color: themeColors['muted-foreground'] }]}>
                  Code: {cls.short_code}
                </ThemedText>
              )}
            </View>
            <View style={styles.cardActions}>
              {/* Active badge */}
              {visibleFields.has('is_active') && (
                <View style={[styles.badge, { backgroundColor: cls.is_active ? '#10B98120' : '#EF444420' }]}>
                  <ThemedText style={[styles.badgeText, { color: cls.is_active ? '#10B981' : '#EF4444' }]}>
                    {cls.is_active ? 'Active' : 'Inactive'}
                  </ThemedText>
                </View>
              )}
              <PermissionGuard permissions={[[PERMISSION_RESOURCES.SECTIONS, 'create']]} requireAll={false} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => handleAddSection(cls)}
              accessibilityLabel="Add"
                >
                  <Ionicons name="add" size={16} color={themeColors.primary} />
                </TouchableOpacity>
              </PermissionGuard>
              <PermissionGuard permissions={[[PERMISSION_RESOURCES.CLASSES, 'update']]} requireAll={false} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => handleEditClass(cls)}
              accessibilityLabel="Edit"
                >
                  <Ionicons name="create-outline" size={16} color={themeColors.primary} />
                </TouchableOpacity>
              </PermissionGuard>
              <PermissionGuard permissions={[[PERMISSION_RESOURCES.CLASSES, 'delete']]} requireAll={false} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: '#EF444420' }]}
                  onPress={() => handleDeleteClass(cls)}
              accessibilityLabel="Delete"
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </PermissionGuard>
              {/* Expand toggle */}
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: themeColors.border }]}
                onPress={() => toggleExpand(cls.id)}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={themeColors['muted-foreground']}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Section count summary */}
          {visibleFields.has('sections') && (
            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Ionicons name="layers-outline" size={13} color={themeColors['muted-foreground']} />
              <ThemedText style={[styles.metaText, { color: themeColors['muted-foreground'] }]}>
                {cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          )}

          {/* Sections list (when expanded) */}
          {isExpanded && (
            <View style={[styles.sectionsContainer, { borderTopColor: borderCol }]}>
              {cls.sections.length === 0 ? (
                <ThemedText style={[styles.noSections, { color: themeColors['muted-foreground'] }]}>
                  No sections — tap + to add one
                </ThemedText>
              ) : (
                cls.sections.map((section: SectionRead) => (
                  <View
                    key={section.id}
                    style={[styles.sectionRow2, { backgroundColor: themeColors.background, borderColor: borderCol }]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.sectionName}>{section.name}</ThemedText>
                    </View>
                    <View style={[styles.badge, { backgroundColor: section.is_active ? '#10B98120' : '#EF444420', marginRight: 8 }]}>
                      <ThemedText style={[styles.badgeText, { color: section.is_active ? '#10B981' : '#EF4444' }]}>
                        {section.is_active ? 'Active' : 'Inactive'}
                      </ThemedText>
                    </View>
                    <PermissionGuard permissions={[[PERMISSION_RESOURCES.SECTIONS, 'update']]} requireAll={false} fallback={null} loadingFallback={null}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: themeColors.primary + '20' }]}
                        onPress={() => handleEditSection(section, cls)}
              accessibilityLabel="Edit"
                      >
                        <Ionicons name="create-outline" size={14} color={themeColors.primary} />
                      </TouchableOpacity>
                    </PermissionGuard>
                    <PermissionGuard permissions={[[PERMISSION_RESOURCES.SECTIONS, 'delete']]} requireAll={false} fallback={null} loadingFallback={null}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleDeleteSection(section)}
              accessibilityLabel="Delete"
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </PermissionGuard>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load classes data</ThemedText>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: themeColors.primary }]} onPress={() => refetch()}>
          <ThemedText style={{ color: 'white', fontWeight: '600' }}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <PermissionGuard
      permissions={[
        [PERMISSION_RESOURCES.CLASSES, 'list'],
        [PERMISSION_RESOURCES.SECTIONS, 'list'],
      ]}
      requireAll={false}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.center}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don't have permission to view classes and sections</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}
              accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>Classes & Sections</ThemedText>
            <ThemedText style={[styles.subtitle, { color: themeColors['muted-foreground'] }]}>
              {filteredData.length} class{filteredData.length !== 1 ? 'es' : ''}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.smallIconBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
              onPress={() => setShowColumnsOptions(true)}
              accessibilityLabel="Columns"
            >
              <Ionicons name="options-outline" size={18} color={themeColors['card-foreground']} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallIconBtn, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
              onPress={() => setShowExportOptions(true)}
              accessibilityLabel="Export"
            >
              <Ionicons name="download-outline" size={18} color={themeColors['card-foreground']} />
            </TouchableOpacity>
            <PermissionGuard permissions={[[PERMISSION_RESOURCES.CLASSES, 'create']]} requireAll={false} fallback={null} loadingFallback={null}>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: themeColors.primary }]}
                onPress={() => setCreateModalVisible(true)}
                accessibilityLabel="Add"
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: themeColors.card }]}>
          <Ionicons name="search" size={18} color={themeColors['muted-foreground']} />
          <TextInput
            style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
            placeholder="Search classes or sections..."
            placeholderTextColor={themeColors['muted-foreground']}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
              <Ionicons name="close-circle" size={18} color={themeColors['muted-foreground']} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filteredData}
          renderItem={renderClassItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={themeColors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="school-outline" size={56} color={themeColors['muted-foreground']} />
              <ThemedText type="subtitle" style={{ marginTop: 16 }}>
                {searchQuery ? 'No results found' : 'No classes yet'}
              </ThemedText>
              <ThemedText style={{ color: themeColors['muted-foreground'], marginTop: 4, textAlign: 'center' }}>
                {searchQuery ? 'Try a different search' : 'Tap + to add the first class'}
              </ThemedText>
            </View>
          }
        />

        {/* Columns Modal */}
        <Modal
          visible={showColumnsOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowColumnsOptions(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowColumnsOptions(false)}
          >
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <ThemedText style={styles.modalTitle}>Columns</ThemedText>
                <TouchableOpacity onPress={() => setShowColumnsOptions(false)}
                  accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={themeColors['muted-foreground']} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={[styles.fieldToggleRow, { borderBottomColor: themeColors.border }]}
                  onPress={() => (visibleFields.size === ALL_FIELDS.length ? deselectAllFields() : selectAllFields())}
                >
                  <Ionicons
                    name={visibleFields.size === ALL_FIELDS.length ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={themeColors.primary}
                  />
                  <ThemedText style={[styles.fieldToggleLabel, { fontWeight: '700' }]}>Select All</ThemedText>
                </TouchableOpacity>
                {ALL_FIELDS.map((field) => (
                  <TouchableOpacity
                    key={field.key}
                    style={styles.fieldToggleRow}
                    onPress={() => toggleField(field.key)}
                  >
                    <Ionicons
                      name={visibleFields.has(field.key) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={themeColors.primary}
                    />
                    <ThemedText style={styles.fieldToggleLabel}>{field.label}</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Export Options Modal */}
        <Modal
          visible={showExportOptions}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExportOptions(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowExportOptions(false)}
          >
            <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <ThemedText style={styles.modalTitle}>Export As</ThemedText>
                <TouchableOpacity onPress={() => setShowExportOptions(false)}
                  accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={themeColors['muted-foreground']} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalBody}>
                <TouchableOpacity
                  style={styles.fieldToggleRow}
                  onPress={() => { setShowExportOptions(false); handleExportCSV(); }}
                >
                  <Ionicons name="document-text-outline" size={20} color={themeColors['card-foreground']} />
                  <ThemedText style={styles.fieldToggleLabel}>Export to CSV</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.fieldToggleRow}
                  onPress={() => { setShowExportOptions(false); handleExportExcel(); }}
                >
                  <Ionicons name="grid-outline" size={20} color={themeColors['card-foreground']} />
                  <ThemedText style={styles.fieldToggleLabel}>Export to Excel</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Modals */}
        <CreateClassModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSubmit={(data) => {
            createMutation.mutate(data, {
              onSuccess: () => setCreateModalVisible(false),
              onError: (e: any) => showError('Create Failed', e.message || 'Failed to create class'),
            });
          }}
          isPending={createMutation.isPending}
          themeColors={themeColors}
          activeAcademicYearId={activeAcademicYearId}
          academicYearTitle={activeAcademicYear?.title ?? null}
        />

        <EditClassModal
          visible={editClassModal.visible}
          classData={editClassModal.classData}
          onClose={() => setEditClassModal({ visible: false, classData: null })}
          onSubmit={handleUpdateClass}
          isPending={updateClassMutation.isPending}
          themeColors={themeColors}
        />

        <SectionModal
          visible={sectionModal.visible}
          sectionData={sectionModal.section}
          className={sectionModal.className}
          onClose={() => setSectionModal({ visible: false, section: null, classId: '', className: '' })}
          onSubmit={handleSectionSubmit}
          isPending={updateSectionMutation.isPending || createSectionMutation.isPending}
          themeColors={themeColors}
        />

        <ConfirmModal
          visible={deleteConfirm.visible}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          onConfirm={() => {
            setDeleteConfirm(prev => ({ ...prev, visible: false }));
            deleteConfirm.onConfirm();
          }}
          onCancel={() => setDeleteConfirm(prev => ({ ...prev, visible: false }))}
        />
      </ThemedView>
    </PermissionGuard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { marginRight: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingBottom: 32 },

  // Card
  card: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    marginBottom: 10, overflow: 'hidden',
  },
  cardAccent: { width: 4, alignSelf: 'stretch' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingBottom: 6 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serialNo: { fontSize: 12, fontWeight: '600' },
  cardName: { fontSize: 15, fontWeight: '700', flex: 1 },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingBottom: 10 },
  metaText: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  iconBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Sections
  sectionsContainer: { borderTopWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  sectionRow2: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
  },
  sectionName: { fontSize: 14, fontWeight: '500' },
  noSections: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1 },
  formGroup: { marginBottom: 16 },
  formRowGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  formRowLabel: { fontSize: 15, fontWeight: '600', minWidth: 80 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  textArea: { minHeight: 80, paddingTop: 10 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkboxLabel: { fontSize: 15 },
  fieldToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  fieldToggleLabel: { fontSize: 15 },

  // Section rows in Create modal
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  removeSectionBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  addSectionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, marginTop: 4,
  },
  addSectionBtnText: { fontSize: 14, fontWeight: '600' },
  smallIconBtn: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  totalSectionsText: { fontSize: 12, marginTop: 4 },

  // Quick add sections (alphabetical) box
  quickAddBox: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 16 },
  quickAddTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  quickAddRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  letterField: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  letterLabel: { fontSize: 13 },
  letterInput: { width: 44, borderWidth: 1, borderRadius: 8, paddingVertical: 8, textAlign: 'center', fontSize: 15 },
  generateBtn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  generateBtnText: { fontSize: 13, fontWeight: '600' },
  quickAddHint: { fontSize: 11, marginTop: 10 },

  // Summary step
  summaryContainer: { gap: 4 },
  summaryRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  summaryLabel: { fontSize: 14, fontWeight: '700' },
  summaryValue: { fontSize: 14 },
  summarySectionsBox: { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 6, gap: 4 },
  summarySectionItem: { fontSize: 14 },

  // Buttons
  button: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#9CA3AF' },
  cancelBtnText: { fontWeight: '600', color: '#6B7280' },
  backBtnFooter: { backgroundColor: 'transparent', borderWidth: 1 },
  submitBtn: {},
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});
