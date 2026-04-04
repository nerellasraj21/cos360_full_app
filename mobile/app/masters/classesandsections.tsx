import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
            <TouchableOpacity onPress={onClose}>
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
                activeOpacity={0.7}
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
            <TouchableOpacity onPress={onClose}>
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
                activeOpacity={0.7}
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
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
  themeColors: any;
  activeAcademicYearId: string | null;
}) {
  const [className, setClassName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [sections, setSections] = useState<string[]>(['']);
  const { showError } = useToastContext();

  const reset = () => {
    setClassName('');
    setShortCode('');
    setSections(['']);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = () => {
    if (!className.trim()) { showError('Validation', 'Class name is required'); return; }
    if (!shortCode.trim()) { showError('Validation', 'Short code is required'); return; }
    if (!activeAcademicYearId) { showError('Error', 'No active academic year'); return; }
    const validSections = sections.filter(s => s.trim());
    if (validSections.length === 0) { showError('Validation', 'At least one section is required'); return; }
    onSubmit({
      name: className.trim(),
      short_code: shortCode.trim(),
      is_active: true,
      academic_year_id: activeAcademicYearId,
      sections: validSections.map(s => ({ name: s.trim() })),
    });
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>Add Class & Sections</ThemedText>
            <TouchableOpacity onPress={handleClose}>
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
                value={className}
                onChangeText={setClassName}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Short Code *</ThemedText>
              <TextInput
                style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                placeholder="e.g., C1"
                placeholderTextColor={themeColors['muted-foreground']}
                value={shortCode}
                onChangeText={setShortCode}
              />
            </View>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Sections *</ThemedText>
              {sections.map((s, i) => (
                <View key={i} style={styles.sectionRow}>
                  <TextInput
                    style={[styles.sectionInput, { color: themeColors['card-foreground'], borderColor: themeColors.border, backgroundColor: themeColors.card }]}
                    placeholder={`Section ${i + 1} (e.g., A)`}
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={s}
                    onChangeText={text => setSections(prev => prev.map((v, idx) => idx === i ? text : v))}
                  />
                  {sections.length > 1 && (
                    <TouchableOpacity
                      style={[styles.removeSectionBtn, { backgroundColor: '#EF4444' }]}
                      onPress={() => setSections(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
                onPress={() => setSections(prev => [...prev, ''])}
              >
                <Ionicons name="add" size={16} color={themeColors.primary} />
                <ThemedText style={[styles.addSectionBtnText, { color: themeColors.primary }]}>Add Section</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <View style={[styles.modalFooter, { borderTopColor: themeColors.border }]}>
            <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={handleClose}>
              <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitBtn, { backgroundColor: themeColors.primary }]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              <ThemedText style={styles.submitBtnText}>{isPending ? 'Creating...' : 'Create'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ClassesAndSectionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

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
  const { activeAcademicYearId } = useAcademicYear();
  const { showSuccess, showError } = useToastContext();

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, title: '', message: '', onConfirm: () => {} });

  const { data: classSectionsData, isLoading, error, refetch } = useClassSections();

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

  const renderClassItem = ({ item: cls }: { item: ClassRead }) => {
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
              <ThemedText style={styles.cardName}>{cls.name}</ThemedText>
              {!!cls.short_code && (
                <ThemedText style={[styles.cardMeta, { color: themeColors['muted-foreground'] }]}>
                  Code: {cls.short_code}
                </ThemedText>
              )}
            </View>
            <View style={styles.cardActions}>
              {/* Active badge */}
              <View style={[styles.badge, { backgroundColor: cls.is_active ? '#10B98120' : '#EF444420' }]}>
                <ThemedText style={[styles.badgeText, { color: cls.is_active ? '#10B981' : '#EF4444' }]}>
                  {cls.is_active ? 'Active' : 'Inactive'}
                </ThemedText>
              </View>
              <PermissionGuard permissions={[[PERMISSION_RESOURCES.SECTIONS, 'create']]} requireAll={false} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => handleAddSection(cls)}
                >
                  <Ionicons name="add" size={16} color={themeColors.primary} />
                </TouchableOpacity>
              </PermissionGuard>
              <PermissionGuard permissions={[[PERMISSION_RESOURCES.CLASSES, 'update']]} requireAll={false} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: themeColors.primary + '20' }]}
                  onPress={() => handleEditClass(cls)}
                >
                  <Ionicons name="create-outline" size={16} color={themeColors.primary} />
                </TouchableOpacity>
              </PermissionGuard>
              <PermissionGuard permissions={[[PERMISSION_RESOURCES.CLASSES, 'delete']]} requireAll={false} fallback={null} loadingFallback={null}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: '#EF444420' }]}
                  onPress={() => handleDeleteClass(cls)}
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
          <View style={[styles.metaRow, { marginTop: 4 }]}>
            <Ionicons name="layers-outline" size={13} color={themeColors['muted-foreground']} />
            <ThemedText style={[styles.metaText, { color: themeColors['muted-foreground'] }]}>
              {cls.sections.length} section{cls.sections.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>

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
                      >
                        <Ionicons name="create-outline" size={14} color={themeColors.primary} />
                      </TouchableOpacity>
                    </PermissionGuard>
                    <PermissionGuard permissions={[[PERMISSION_RESOURCES.SECTIONS, 'delete']]} requireAll={false} fallback={null} loadingFallback={null}>
                      <TouchableOpacity
                        style={[styles.iconBtn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleDeleteSection(section)}
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Classes & Sections</ThemedText>
            <ThemedText style={[styles.subtitle, { color: themeColors['muted-foreground'] }]}>
              {filteredData.length} class{filteredData.length !== 1 ? 'es' : ''}
            </ThemedText>
          </View>
          <PermissionGuard permissions={[[PERMISSION_RESOURCES.CLASSES, 'create']]} requireAll={false} fallback={null} loadingFallback={null}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: themeColors.primary }]}
              onPress={() => setCreateModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
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
            <TouchableOpacity onPress={() => setSearchQuery('')}>
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
  addBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
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

  // Buttons
  button: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#9CA3AF' },
  cancelBtnText: { fontWeight: '600', color: '#6B7280' },
  submitBtn: {},
  submitBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
});
