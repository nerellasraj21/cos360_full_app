import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { AppLayout } from '@/components';
import { useTheme, useAcademicYear } from '@/contexts';
import {
  useClassSubjectMappingsByClass,
  useDeleteClassSubjectMapping,
  useBulkCreateClassSubjectMappings,
} from '@/src/api/hooks/masters/classSubjectMappings';
import { useClassList } from '@/src/api/hooks/masters/classesAndSections';
import { useSubjects } from '@/src/api/hooks/masters/subjects';
import { PermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import type { ClassSubjectMapping, ClassSubjectMappingCreate } from '@/src/api/masters';
import { useToastContext } from '@/components/ToastProvider';

export default function ClassSubjectMappingsScreen() {
  const { colors, theme } = useTheme();
  const { showSuccess, showError } = useToastContext();
  const { activeAcademicYearId } = useAcademicYear();

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());

  const cardBg = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const borderCol = theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f1f5f9';
  const inputBg = theme === 'dark' ? '#0f0f23' : '#f8fafc';

  // Data hooks
  const { data: classList, isLoading: classesLoading } = useClassList();
  const { data: mappingsData, isLoading: mappingsLoading, refetch } = useClassSubjectMappingsByClass(selectedClassId);
  const { data: subjectsData, isLoading: subjectsLoading } = useSubjects(
    activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined
  );

  const deleteMutation = useDeleteClassSubjectMapping();
  const bulkCreateMutation = useBulkCreateClassSubjectMappings();

  // Classes list
  const classes = useMemo(() => (classList as any[]) || [], [classList]);
  const selectedClass = useMemo(() => classes.find((c: any) => c.id === selectedClassId), [classes, selectedClassId]);

  // Subjects not yet mapped to selected class
  const mappings: ClassSubjectMapping[] = useMemo(() => mappingsData || [], [mappingsData]);
  const mappedSubjectIds = useMemo(() => new Set(mappings.map((m) => m.subject_id)), [mappings]);
  const unmappedSubjects = useMemo(
    () => ((subjectsData as any[]) || []).filter((s: any) => !mappedSubjectIds.has(s.id)),
    [subjectsData, mappedSubjectIds]
  );

  function handleDeleteMapping(mapping: ClassSubjectMapping) {
    Alert.alert(
      'Remove Mapping',
      `Remove "${mapping.subject_name || 'this subject'}" from the class?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(mapping.id, {
            onSuccess: () => showSuccess('Removed', 'Subject mapping has been removed.'),
            onError: (e: any) => showError('Remove Failed', e.message || 'Failed to remove subject mapping'),
          }),
        },
      ]
    );
  }

  function toggleSubject(id: string) {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBulkAdd() {
    if (!selectedClassId || !activeAcademicYearId || selectedSubjectIds.size === 0) return;

    const mappingsToCreate: ClassSubjectMappingCreate[] = Array.from(selectedSubjectIds).map((subjectId) => ({
      class_id: selectedClassId,
      subject_id: subjectId,
      academic_year_id: activeAcademicYearId,
      is_active: true,
    }));

    bulkCreateMutation.mutate(
      { mappings: mappingsToCreate },
      {
        onSuccess: () => {
          setIsAddModalVisible(false);
          setSelectedSubjectIds(new Set());
          refetch();
          showSuccess('Subjects Added', `${selectedSubjectIds.size} subject(s) mapped to class.`);
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
        <Text style={[styles.subjectName, { color: colors.foreground }]} numberOfLines={1}>
          {item.subject_name || item.subject_id}
        </Text>
        <PermissionGuard resource={PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS} action="delete">
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteMapping(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </PermissionGuard>
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
            <Text style={styles.bannerSub}>Map subjects to classes and sections</Text>
          </View>
        </View>

        {/* Class selector */}
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
            {/* Mapped subjects count */}
            <View style={styles.countRow}>
              <Text style={[styles.countText, { color: colors['muted-foreground'] }]}>
                {mappingsLoading ? 'Loading...' : `${mappings.length} subject${mappings.length !== 1 ? 's' : ''} mapped`}
              </Text>
              <PermissionGuard resource={PERMISSION_RESOURCES.CLASS_SUBJECT_MAPPINGS} action="create">
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => {
                    setSelectedSubjectIds(new Set());
                    setIsAddModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text style={styles.addBtnText}>Add Subjects</Text>
                </TouchableOpacity>
              </PermissionGuard>
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

      {/* Add Subjects Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.addSheet, { backgroundColor: cardBg }]}>
            {/* Header */}
            <View style={styles.addSheetHeader}>
              <View>
                <Text style={[styles.addSheetTitle, { color: colors.foreground }]}>Add Subjects</Text>
                <Text style={[styles.addSheetSub, { color: colors['muted-foreground'] }]}>
                  {selectedClass?.name} · {selectedSubjectIds.size} selected
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAddModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={colors['muted-foreground']} />
              </TouchableOpacity>
            </View>

            {/* Subject list */}
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
              <FlatList
                data={unmappedSubjects}
                keyExtractor={(item: any) => item.id}
                style={{ flex: 1 }}
                renderItem={({ item }: { item: any }) => {
                  const checked = selectedSubjectIds.has(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.subjectCheckRow, { borderBottomColor: borderCol }]}
                      onPress={() => toggleSubject(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        { borderColor: checked ? '#0891B2' : borderCol, backgroundColor: checked ? '#0891B2' : 'transparent' },
                      ]}>
                        {checked && <Ionicons name="checkmark" size={12} color="white" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.subjectCheckName, { color: colors.foreground }]}>{item.name}</Text>
                        {item.short_code && (
                          <Text style={[styles.subjectCheckCode, { color: colors['muted-foreground'] }]}>{item.short_code}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 8 }}
              />
            )}

            {/* Footer */}
            {unmappedSubjects.length > 0 && (
              <View style={[styles.addSheetFooter, { borderTopColor: borderCol }]}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: borderCol }]}
                  onPress={() => setIsAddModalVisible(false)}
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
  selectorRow: { paddingHorizontal: 16, marginBottom: 12 },
  classSelector: {
    flexDirection: 'row', alignItems: 'center',
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
    borderRadius: 12, borderWidth: 1, padding: 12, gap: 12,
  },
  subjectIconBox: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  subjectName: { flex: 1, fontSize: 14, fontWeight: '500' },
  deleteBtn: { padding: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dropdownSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32,
    maxHeight: '70%',
  },
  dropdownTitle: { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1,
  },
  dropdownItemText: { fontSize: 15 },
  dropdownEmpty: { textAlign: 'center', padding: 20 },
  addSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
    flex: 0,
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
});
