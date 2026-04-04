import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme, useAcademicYear } from '@/contexts';
import {
  useClassSubjectMappingsByClass,
  useDeleteClassSubjectMapping,
  useBulkCreateClassSubjectMappings,
  useUpdateClassSubjectMapping,
} from '@/src/api/hooks/masters/classSubjectMappings';
import { useClassList } from '@/src/api/hooks/masters/classesAndSections';
import { subjectsApi } from '@/src/api';
import { PermissionGuard } from '@/components/PermissionGuard';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { ClassSubjectMapping, SubjectMappingItem } from '@/src/api/masters';
import { classSectionsApi } from '@/src/api';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

export default function ClassSubjectMappingsScreen() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { activeAcademicYearId } = useAcademicYear();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  // Section selection inside add modal (null = All Sections)
  const [addSectionId, setAddSectionId] = useState<string | null>(null);
  const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);
  // Per-subject settings: subjectId -> { order, exclude_marks, is_active }
  const [subjectSettings, setSubjectSettings] = useState<Record<string, { order: string; excludeMarks: boolean; isActive: boolean }>>({});

  // Edit mapping modal state
  const [editMapping, setEditMapping] = useState<ClassSubjectMapping | null>(null);
  const [editExcludeMarks, setEditExcludeMarks] = useState(false);
  const [editOrder, setEditOrder] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    mapping: ClassSubjectMapping | null;
  }>({ visible: false, mapping: null });

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  // Data hooks
  const { data: classList, isLoading: classesLoading } = useClassList();
  const { data: mappingsData, isLoading: mappingsLoading, refetch } = useClassSubjectMappingsByClass(selectedClassId);
  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: ['subjects', activeAcademicYearId],
    queryFn: () => subjectsApi.getSubjects(
      activeAcademicYearId ? { academic_year_id: activeAcademicYearId, active_only: true, limit: 1000 } : { active_only: true, limit: 1000 }
    ),
  });

  const { data: sectionsData } = useQuery({
    queryKey: ['sections', selectedClassId],
    queryFn: () => classSectionsApi.getSectionsByClass(selectedClassId),
    enabled: !!selectedClassId,
  });

  const deleteMutation = useDeleteClassSubjectMapping();
  const bulkCreateMutation = useBulkCreateClassSubjectMappings();
  const updateMutation = useUpdateClassSubjectMapping();

  // Classes list
  const classes = useMemo(() => (classList as any[]) || [], [classList]);
  const selectedClass = useMemo(() => classes.find((c: any) => c.id === selectedClassId), [classes, selectedClassId]);
  const sections = useMemo(() => (sectionsData as any[]) || [], [sectionsData]);
  const selectedSection = useMemo(() => sections.find((s: any) => s.id === addSectionId), [sections, addSectionId]);

  // Subjects not yet mapped to selected class
  const mappings: ClassSubjectMapping[] = useMemo(() => mappingsData || [], [mappingsData]);
  const mappedSubjectIds = useMemo(() => new Set(mappings.map((m) => m.subject_id)), [mappings]);
  const unmappedSubjects = useMemo(
    () => ((subjectsData as any[]) || []).filter((s: any) => !mappedSubjectIds.has(s.id)),
    [subjectsData, mappedSubjectIds]
  );

  function openEditModal(mapping: ClassSubjectMapping) {
    setEditMapping(mapping);
    setEditExcludeMarks(mapping.exclude_marks ?? false);
    setEditOrder(mapping.order != null ? String(mapping.order) : '');
    setEditIsActive(mapping.is_active ?? true);
  }

  function handleEditSubmit() {
    if (!editMapping) return;
    updateMutation.mutate(
      {
        id: editMapping.id,
        data: {
          exclude_marks: editExcludeMarks,
          order: editOrder.trim() !== '' ? Number(editOrder) : undefined,
          is_active: editIsActive,
        },
      },
      {
        onSuccess: () => setEditMapping(null),
        onError: (e: any) => showError('Update Failed', e.message || 'Failed to update mapping'),
      }
    );
  }

  function handleDeleteMapping(mapping: ClassSubjectMapping) {
    setDeleteConfirm({ visible: true, mapping });
  }

  function toggleSubject(id: string) {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSubjectSettings(s => { const n = { ...s }; delete n[id]; return n; });
      } else {
        next.add(id);
        // Auto-assign next order number
        const nextOrder = next.size;
        setSubjectSettings(s => ({ ...s, [id]: { order: String(nextOrder), excludeMarks: false, isActive: true } }));
      }
      return next;
    });
  }

  function updateSubjectSetting(id: string, field: 'order' | 'excludeMarks' | 'isActive', value: string | boolean) {
    setSubjectSettings(s => ({ ...s, [id]: { ...s[id], [field]: value } }));
  }

  function resetAddModal() {
    setSelectedSubjectIds(new Set());
    setSubjectSettings({});
    setAddSectionId(null);
  }

  function handleBulkAdd() {
    if (!selectedClassId || !activeAcademicYearId || selectedSubjectIds.size === 0) return;

    const subjects: SubjectMappingItem[] = Array.from(selectedSubjectIds).map((subjectId) => {
      const s = subjectSettings[subjectId];
      return {
        subject_id: subjectId,
        exclude_marks: s?.excludeMarks ?? false,
        order: s?.order && s.order.trim() !== '' ? Number(s.order) : undefined,
        is_active: s?.isActive ?? true,
      };
    });

    const count = selectedSubjectIds.size;
    bulkCreateMutation.mutate(
      {
        class_id: selectedClassId,
        section_id: addSectionId ?? undefined,
        academic_year_id: activeAcademicYearId,
        subjects,
      },
      {
        onSuccess: () => {
          setIsAddModalVisible(false);
          resetAddModal();
          refetch();
          showSuccess('Subjects Added', `${count} subject(s) mapped to class.`);
        },
        onError: (e: any) => showError('Add Failed', e.message || 'Failed to add subject mappings'),
      }
    );
  }

  function renderMappingItem({ item }: { item: ClassSubjectMapping }) {
    return (
      <View style={[styles.mappingRow, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <View style={[styles.subjectIconBox, { backgroundColor: '#0891B218' }]}>
          <Ionicons name="book" size={18} color="#0891B2" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={1}>
            {item.subject_name || item.subject_id}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {/* Active badge */}
            <View style={[styles.badge, { backgroundColor: item.is_active ? '#10B98120' : '#EF444420' }]}>
              <Text style={[styles.badgeText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
            {/* Exclude marks badge */}
            {item.exclude_marks && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>Excl. Marks</Text>
              </View>
            )}
            {/* Order badge */}
            {item.order != null && (
              <View style={[styles.badge, { backgroundColor: '#6366F120' }]}>
                <Text style={[styles.badgeText, { color: '#6366F1' }]}>Order: {item.order}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <PermissionGuard resource={PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS} action="update">
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => openEditModal(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="create-outline" size={18} color="#0891B2" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resource={PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS} action="delete">
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDeleteMapping(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>
    );
  }

  return (
    <AppLayout title="Class Subject Mappings">
      <View style={styles.container}>

        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerDecor} />
          <View style={styles.bannerIcon}>
            <Ionicons name="git-branch" size={26} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Class Subject Mappings</Text>
            <Text style={styles.bannerSub}>Map subjects to classes and manage settings</Text>
          </View>
        </View>

        {/* Class selector + Add button row */}
        <View style={styles.selectorRow}>
          <TouchableOpacity
            style={[styles.classSelector, { backgroundColor: inputBg, borderColor: borderCol }]}
            onPress={() => setIsClassDropdownOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="business" size={16} color="#0891B2" style={{ marginRight: 8 }} />
            <Text style={[styles.classSelectorText, { color: selectedClass ? colors.foreground : colors['muted-foreground'] }]}>
              {selectedClass ? selectedClass.name : 'Select a class...'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors['muted-foreground']} />
          </TouchableOpacity>
          <PermissionGuard resource={PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS} action="create">
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                if (!selectedClassId) {
                  setIsClassDropdownOpen(true);
                  showError('Select a Class', 'Please select a class before adding subjects.');
                  return;
                }
                setSelectedSubjectIds(new Set());
                setIsAddModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </PermissionGuard>
        </View>

        {/* Content */}
        {!selectedClassId ? (
          <View style={styles.emptyState}>
            <Ionicons name="git-branch-outline" size={52} color={colors['muted-foreground']} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Select a Class</Text>
            <Text style={[styles.emptyDesc, { color: colors['muted-foreground'] }]}>
              Choose a class above to view and manage its subject mappings.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.countRow}>
              <Text style={[styles.countText, { color: colors['muted-foreground'] }]}>
                {mappingsLoading ? 'Loading...' : `${mappings.length} subject${mappings.length !== 1 ? 's' : ''} mapped`}
              </Text>
            </View>

            {mappingsLoading ? (
              <ActivityIndicator color="#0891B2" style={{ marginTop: 40 }} />
            ) : mappings.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="book-outline" size={44} color={colors['muted-foreground']} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Subjects Mapped</Text>
                <Text style={[styles.emptyDesc, { color: colors['muted-foreground'] }]}>
                  No subjects have been mapped to this class yet. Tap "Add Subjects" to get started.
                </Text>
              </View>
            ) : (
              <FlatList
                data={mappings}
                keyExtractor={(item) => item.id}
                renderItem={renderMappingItem}
                refreshControl={<RefreshControl refreshing={mappingsLoading} onRefresh={refetch} colors={['#0891B2']} />}
                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </View>

      {/* Class Dropdown Modal */}
      <Modal
        visible={isClassDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsClassDropdownOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsClassDropdownOpen(false)}>
          <View style={[styles.dropdownSheet, { backgroundColor: cardBg }]}>
            <Text style={[styles.dropdownTitle, { color: colors.foreground }]}>Select Class</Text>
            {classesLoading ? (
              <ActivityIndicator color="#0891B2" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                {classes.map((cls: any) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: borderCol },
                      selectedClassId === cls.id && { backgroundColor: '#0891B218' },
                    ]}
                    onPress={() => {
                      setSelectedClassId(cls.id);
                      setIsClassDropdownOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.foreground }]}>{cls.name}</Text>
                    {selectedClassId === cls.id && <Ionicons name="checkmark" size={16} color="#0891B2" />}
                  </TouchableOpacity>
                ))}
                {classes.length === 0 && (
                  <Text style={[styles.dropdownEmpty, { color: colors['muted-foreground'] }]}>No classes found</Text>
                )}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Mapping Modal */}
      <Modal
        visible={!!editMapping}
        transparent
        animationType="slide"
        onRequestClose={() => setEditMapping(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editSheet, { backgroundColor: cardBg }]}>
            <View style={styles.editHeader}>
              <View>
                <Text style={[styles.editTitle, { color: colors.foreground }]}>Edit Mapping</Text>
                <Text style={[styles.editSubtitle, { color: colors['muted-foreground'] }]} numberOfLines={1}>
                  {editMapping?.subject_name || 'Subject'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditMapping(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            <View style={styles.editBody}>
              {/* Order field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors['muted-foreground'] }]}>Order</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: inputBg }]}
                  value={editOrder}
                  onChangeText={setEditOrder}
                  placeholder="e.g. 1"
                  placeholderTextColor={colors['muted-foreground']}
                  keyboardType="numeric"
                />
              </View>

              {/* Exclude from Marks toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setEditExcludeMarks(v => !v)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Exclude from Marks</Text>
                  <Text style={[styles.toggleHint, { color: colors['muted-foreground'] }]}>
                    Subject marks won't count toward totals
                  </Text>
                </View>
                <Ionicons
                  name={editExcludeMarks ? 'checkbox' : 'square-outline'}
                  size={26}
                  color={editExcludeMarks ? '#0891B2' : colors['muted-foreground']}
                />
              </TouchableOpacity>

              {/* Active toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setEditIsActive(v => !v)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Active</Text>
                  <Text style={[styles.toggleHint, { color: colors['muted-foreground'] }]}>
                    Inactive mappings are hidden from reports
                  </Text>
                </View>
                <Ionicons
                  name={editIsActive ? 'checkbox' : 'square-outline'}
                  size={26}
                  color={editIsActive ? '#10B981' : colors['muted-foreground']}
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.editFooter, { borderTopColor: borderCol }]}>
              <TouchableOpacity
                style={[styles.footerCancelBtn, { borderColor: borderCol }]}
                onPress={() => setEditMapping(null)}
              >
                <Text style={[styles.footerCancelText, { color: colors['muted-foreground'] }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerSaveBtn, { opacity: updateMutation.isPending ? 0.6 : 1 }]}
                onPress={handleEditSubmit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.footerSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Subjects Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => { setIsAddModalVisible(false); resetAddModal(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.addSheet, { backgroundColor: cardBg }]}>
            {/* Header */}
            <View style={styles.addSheetHeader}>
              <View>
                <Text style={[styles.addSheetTitle, { color: colors.foreground }]}>Add Class-Subject Mappings</Text>
                <Text style={[styles.addSheetSub, { color: colors['muted-foreground'] }]}>
                  {selectedClass?.name} · {selectedSubjectIds.size} selected
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setIsAddModalVisible(false); resetAddModal(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            {/* Section selector */}
            <TouchableOpacity
              style={[styles.sectionSelector, { backgroundColor: inputBg, borderColor: borderCol }]}
              onPress={() => setIsSectionDropdownOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="layers-outline" size={15} color="#0891B2" style={{ marginRight: 6 }} />
              <Text style={[styles.sectionSelectorText, { color: colors.foreground }]}>
                {selectedSection ? selectedSection.name : 'All Sections'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors['muted-foreground']} />
            </TouchableOpacity>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {subjectsLoading ? (
                <ActivityIndicator color="#0891B2" style={{ marginVertical: 30 }} />
              ) : unmappedSubjects.length === 0 ? (
                <View style={styles.addEmptyState}>
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All subjects mapped</Text>
                  <Text style={[styles.emptyDesc, { color: colors['muted-foreground'] }]}>
                    All available subjects are already mapped to this class.
                  </Text>
                </View>
              ) : (
                <>
                  {unmappedSubjects.map((item: any) => {
                    const checked = selectedSubjectIds.has(item.id);
                    const s = subjectSettings[item.id];
                    return (
                      <View key={item.id}>
                        {/* Subject row */}
                        <TouchableOpacity
                          style={[styles.subjectCheckRow, { borderBottomColor: borderCol }]}
                          onPress={() => toggleSubject(item.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.checkbox, { borderColor: checked ? '#0891B2' : borderCol, backgroundColor: checked ? '#0891B2' : 'transparent' }]}>
                            {checked && <Ionicons name="checkmark" size={12} color="white" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.subjectCheckName, { color: colors.foreground }]}>{item.name}</Text>
                            {!!item.short_code && (
                              <Text style={[styles.subjectCheckCode, { color: colors['muted-foreground'] }]}>{item.short_code}</Text>
                            )}
                          </View>
                        </TouchableOpacity>

                        {/* Per-subject settings (only when checked) */}
                        {checked && s && (
                          <View style={[styles.subjectSettings, { backgroundColor: inputBg, borderBottomColor: borderCol }]}>
                            {/* Order */}
                            <View style={styles.settingRow}>
                              <Text style={[styles.settingLabel, { color: colors['muted-foreground'] }]}>Order</Text>
                              <TextInput
                                style={[styles.settingInput, { color: colors.foreground, borderColor: borderCol, backgroundColor: cardBg }]}
                                value={s.order}
                                onChangeText={v => updateSubjectSetting(item.id, 'order', v.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                                placeholder="Auto"
                                placeholderTextColor={colors['muted-foreground']}
                              />
                            </View>
                            {/* Exclude Marks */}
                            <TouchableOpacity style={styles.settingRow} onPress={() => updateSubjectSetting(item.id, 'excludeMarks', !s.excludeMarks)}>
                              <Text style={[styles.settingLabel, { color: colors['muted-foreground'] }]}>Exclude from Marks</Text>
                              <View style={[styles.toggleTrack, { backgroundColor: s.excludeMarks ? '#F59E0B' : borderCol }]}>
                                <View style={[styles.toggleThumb, { left: s.excludeMarks ? 18 : 2 }]} />
                              </View>
                            </TouchableOpacity>
                            {/* Active */}
                            <TouchableOpacity style={styles.settingRow} onPress={() => updateSubjectSetting(item.id, 'isActive', !s.isActive)}>
                              <Text style={[styles.settingLabel, { color: colors['muted-foreground'] }]}>Active</Text>
                              <View style={[styles.toggleTrack, { backgroundColor: s.isActive ? '#10B981' : borderCol }]}>
                                <View style={[styles.toggleThumb, { left: s.isActive ? 18 : 2 }]} />
                              </View>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}
            </ScrollView>

            {unmappedSubjects.length > 0 && (
              <View style={[styles.addSheetFooter, { borderTopColor: borderCol }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: borderCol }]}
                  onPress={() => { setIsAddModalVisible(false); resetAddModal(); }}
                >
                  <Text style={[styles.cancelBtnText, { color: colors['muted-foreground'] }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, { opacity: selectedSubjectIds.size === 0 || bulkCreateMutation.isPending ? 0.5 : 1 }]}
                  onPress={handleBulkAdd}
                  disabled={selectedSubjectIds.size === 0 || bulkCreateMutation.isPending}
                >
                  {bulkCreateMutation.isPending ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmBtnText}>
                      Add {selectedSubjectIds.size > 0 ? `(${selectedSubjectIds.size})` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Section picker inside add modal */}
      <Modal
        visible={isSectionDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSectionDropdownOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsSectionDropdownOpen(false)}>
          <View style={[styles.dropdownSheet, { backgroundColor: cardBg }]}>
            <Text style={[styles.dropdownTitle, { color: colors.foreground }]}>Select Section</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {/* All Sections option */}
              <TouchableOpacity
                style={[styles.dropdownItem, { borderBottomColor: borderCol }]}
                onPress={() => { setAddSectionId(null); setIsSectionDropdownOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, { color: colors.foreground, fontWeight: addSectionId === null ? '700' : '400' }]}>
                  All Sections
                </Text>
                {addSectionId === null && <Ionicons name="checkmark" size={16} color="#0891B2" />}
              </TouchableOpacity>
              {sections.map((sec: any) => (
                <TouchableOpacity
                  key={sec.id}
                  style={[styles.dropdownItem, { borderBottomColor: borderCol }]}
                  onPress={() => { setAddSectionId(sec.id); setIsSectionDropdownOpen(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.foreground, fontWeight: addSectionId === sec.id ? '700' : '400' }]}>
                    {sec.name}
                  </Text>
                  {addSectionId === sec.id && <Ionicons name="checkmark" size={16} color="#0891B2" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        visible={deleteConfirm.visible}
        title="Remove Mapping"
        message={`Remove "${deleteConfirm.mapping?.subject_name || 'this subject'}" from the class?`}
        confirmText="Remove"
        cancelText="Cancel"
        destructive
        onConfirm={() => {
          const mapping = deleteConfirm.mapping;
          setDeleteConfirm({ visible: false, mapping: null });
          if (mapping) {
            deleteMutation.mutate(mapping.id, {
              onSuccess: () => showSuccess('Removed', 'Subject mapping has been removed.'),
              onError: (e: any) => showError('Remove Failed', e.message || 'Failed to remove subject mapping'),
            });
          }
        }}
        onCancel={() => setDeleteConfirm({ visible: false, mapping: null })}
      />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    backgroundColor: '#556ee6',
    borderRadius: 18, padding: 20, margin: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden',
  },
  bannerDecor: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bannerIcon: {
    width: 50, height: 50, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTitle: { color: 'white', fontSize: 17, fontWeight: '700', marginBottom: 2 },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  selectorRow: { paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  classSelector: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, padding: 14, gap: 4,
  },
  classSelectorText: { flex: 1, fontSize: 14, fontWeight: '500' },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  countText: { fontSize: 13, fontWeight: '500' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0891B2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  mappingRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 10,
  },
  subjectIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  subjectName: { fontSize: 14, fontWeight: '600' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  actionBtn: { padding: 6 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  // Modals overlay
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  // Class dropdown
  dropdownSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, maxHeight: '70%',
  },
  dropdownTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  dropdownItemText: { fontSize: 15 },
  dropdownEmpty: { textAlign: 'center', padding: 20 },
  // Edit modal
  editSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 20,
  },
  editHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  editTitle: { fontSize: 17, fontWeight: '700' },
  editSubtitle: { fontSize: 13, marginTop: 2 },
  editBody: { paddingHorizontal: 20, gap: 16, paddingBottom: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  fieldInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 14, fontWeight: '500' },
  toggleHint: { fontSize: 12, marginTop: 2 },
  editFooter: {
    flexDirection: 'row', gap: 10, padding: 20, paddingTop: 16,
    borderTopWidth: 1, marginTop: 8,
  },
  footerCancelBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 13, alignItems: 'center',
  },
  footerCancelText: { fontSize: 14, fontWeight: '600' },
  footerSaveBtn: {
    flex: 2, borderRadius: 12, backgroundColor: '#0891B2',
    paddingVertical: 13, alignItems: 'center',
  },
  footerSaveText: { color: 'white', fontSize: 14, fontWeight: '700' },
  // Add subjects modal
  addSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  addSheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 16,
  },
  addSheetTitle: { fontSize: 17, fontWeight: '700' },
  addSheetSub: { fontSize: 13, marginTop: 2 },
  addEmptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  subjectCheckRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, gap: 14,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  subjectCheckName: { fontSize: 14, fontWeight: '500' },
  subjectCheckCode: { fontSize: 11, marginTop: 1 },
  addSheetFooter: {
    flexDirection: 'row', gap: 10, paddingTop: 16,
    borderTopWidth: 1, marginTop: 8,
  },
  cancelBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  confirmBtn: {
    flex: 2, borderRadius: 12, backgroundColor: '#0891B2',
    paddingVertical: 13, alignItems: 'center',
  },
  confirmBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  // Section selector inside add modal
  sectionSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12,
  },
  sectionSelectorText: { flex: 1, fontSize: 13, fontWeight: '500' },
  // Per-subject settings panel
  subjectSettings: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, gap: 8, marginBottom: 2,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 4,
  },
  settingLabel: { fontSize: 12, fontWeight: '500' },
  settingInput: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    fontSize: 13, width: 70, textAlign: 'center',
  },
  // Toggle switch
  toggleTrack: {
    width: 38, height: 22, borderRadius: 11,
    justifyContent: 'center', position: 'relative',
  },
  toggleThumb: {
    position: 'absolute', width: 18, height: 18,
    borderRadius: 9, backgroundColor: 'white',
    top: 2,
  },
});
