import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Subject, SubjectInput, SubjectUpdate, SubjectCategory, AcademicYear } from '@/src/api';
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/src/api/hooks/masters/subjects';
import { useSubjectCategories, useCreateSubjectCategory } from '@/src/api/hooks/masters/subjectCategories';
import { useAcademicYearsDropdown } from '@/src/api/hooks/masters/academicYears';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';


// Toggleable fields shown on each subject card — mirrors the web app's
// column-visibility filter (Masters > Subjects "Filters" dropdown).
const FILTER_COLUMNS: { key: 'name' | 'category' | 'short_code' | 'is_active'; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'category', label: 'Category' },
  { key: 'short_code', label: 'Short Code' },
  { key: 'is_active', label: 'Active' },
];

export default function SubjectsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(FILTER_COLUMNS.map((c) => c.key))
  );
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    category_id: '',
    academic_year_id: '',
    is_practical: false,
    is_active: true,
  });

  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const { activeAcademicYearId } = useAcademicYear();
  const themeColors = Colors[theme];
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

  // Fetch data using permission-protected hooks
  const { data: subjectsData, isLoading, error, refetch } = useSubjects(
    activeAcademicYearId ? { academic_year_id: activeAcademicYearId } : undefined
  );
  
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useSubjectCategories();
  
  const { data: academicYearsData } = useAcademicYearsDropdown();

  // Mutations using permission-protected hooks
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();
  const createCategoryMutation = useCreateSubjectCategory();

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Subject Created', 'Subject has been created.');
      createMutation.reset();
    }
  }, [createMutation.isSuccess]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Subject Updated', 'Subject has been updated.');
      updateMutation.reset();
    }
  }, [updateMutation.isSuccess]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Subject Deleted', 'Subject has been deleted.');
      deleteMutation.reset();
    }
  }, [deleteMutation.isSuccess]);

  React.useEffect(() => {
    if (createCategoryMutation.isSuccess) {
      setIsCategoryModalVisible(false);
      setNewCategoryName('');
      showSuccess('Category Created', 'Subject category has been created.');
      createCategoryMutation.reset();
    }
  }, [createCategoryMutation.isSuccess]);

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!subjectsData || !Array.isArray(subjectsData)) return [];

    return subjectsData.filter((subject: Subject) => {
      const matchesSearch = subject.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [subjectsData, searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      short_code: '',
      category_id: '',
      academic_year_id: activeAcademicYearId || '',
      is_practical: false,
      is_active: true,
    });
    setEditingSubject(null);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      short_code: subject.short_code || '',
      category_id: subject.category?.id || '',
      academic_year_id: subject.academic_year_id,
      is_practical: subject.is_practical,
      is_active: subject.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (subject: Subject) => {
    confirm({
      title: 'Delete Subject',
      message: `Are you sure you want to delete "${subject.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(subject.id, { onError: (e: any) => showError('Delete Failed', e.message || 'Failed to delete subject') }),
    });
  };

  const handleSubmit = () => {
    if (!formData.name) {
      showError('Error', 'Subject name is required');
      return;
    }

    // Ensure academic year is set
    const submitData = {
      ...formData,
      academic_year_id: activeAcademicYearId || formData.academic_year_id,
    };

    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data: submitData }, { onError: (e: any) => showError('Update Failed', e.message || 'Failed to update subject') });
    } else {
      createMutation.mutate(submitData, { onError: (e: any) => showError('Create Failed', e.message || 'Failed to create subject') });
    }
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      showError('Error', 'Category name is required');
      return;
    }
    createCategoryMutation.mutate({ name: newCategoryName.trim() }, { onError: (e: any) => showError('Create Failed', e.message || 'Failed to create category') });
  };

  const handleColumnToggle = (columnKey: string) => {
    setVisibleColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnKey)) {
        if (newSet.size === 1) return prev; // keep at least one column visible
        newSet.delete(columnKey);
      } else {
        newSet.add(columnKey);
      }
      return newSet;
    });
  };

  const handleToggleSelectAllColumns = () => {
    if (visibleColumns.size === FILTER_COLUMNS.length) {
      setVisibleColumns(new Set([FILTER_COLUMNS[0].key]));
    } else {
      setVisibleColumns(new Set(FILTER_COLUMNS.map((c) => c.key)));
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categoriesData?.find((cat: SubjectCategory) => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getAcademicYearName = (academicYearId: string) => {
    const academicYear = academicYearsData?.find((ay: any) => ay.id === academicYearId);
    return academicYear?.title || 'Unknown Year';
  };

  // ── Export (mirrors the web app's Subjects Export menu: CSV / Excel / JSON) ────
  const EXPORT_HEADERS = ['Name', 'Code', 'Category', 'Practical', 'Active'];

  const buildExportRows = () =>
    filteredSubjects.map((s) => [
      s.name,
      s.short_code || '',
      s.category ? getCategoryName(s.category.id) : '',
      s.is_practical ? 'Yes' : 'No',
      s.is_active ? 'Yes' : 'No',
    ]);

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
      const lines = [EXPORT_HEADERS, ...buildExportRows()].map((row) => row.map(escapeCsv).join(','));
      await shareOrDownload('subjects_data.csv', lines.join('\n'), 'text/csv');
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const rows = [EXPORT_HEADERS, ...buildExportRows()];
      const html = `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
      await shareOrDownload('subjects_data.xls', html, 'application/vnd.ms-excel');
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  const handleDownloadData = async () => {
    try {
      const jsonData = {
        title: 'Subjects',
        columns: EXPORT_HEADERS,
        data: filteredSubjects.map((s) => ({
          name: s.name,
          short_code: s.short_code || '',
          category: s.category ? getCategoryName(s.category.id) : '',
          is_practical: s.is_practical ? 'Yes' : 'No',
          is_active: s.is_active ? 'Yes' : 'No',
        })),
        exportedAt: new Date().toISOString(),
      };
      await shareOrDownload('subjects_data.json', JSON.stringify(jsonData, null, 2), 'application/json');
    } catch {
      showError('Error', 'Failed to export data');
    }
  };

  const renderSubjectItem = useCallback(({ item, index }: { item: Subject; index: number }) => (
    <View style={[styles.subjectCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.subjectHeader}>
        <View style={styles.subjectInfo}>
          <View style={styles.nameRow}>
            <ThemedText style={[styles.serialNo, { color: themeColors['muted-foreground'] }]}>{index + 1}.</ThemedText>
            {visibleColumns.has('name') && (
              <ThemedText
                type="subtitle"
                style={styles.subjectName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.name}
              </ThemedText>
            )}
          </View>
          {visibleColumns.has('is_active') && (
            <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
              <ThemedText style={styles.statusText}>
                {item.is_active ? 'Active' : 'Inactive'}
              </ThemedText>
            </View>
          )}
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECTS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECTS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
              accessibilityLabel="Delete"
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <View style={styles.subjectDetails}>
        {visibleColumns.has('short_code') && item.short_code ? (
          <View style={styles.detailRow}>
            <Ionicons name="code-slash" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>Code: {item.short_code}</ThemedText>
          </View>
        ) : null}
        {visibleColumns.has('category') && (
          <View style={styles.detailRow}>
            <Ionicons name="folder" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>
              Category: {item.category ? getCategoryName(item.category.id) : 'No Category'}
            </ThemedText>
          </View>
        )}
        {item.is_practical ? (
          <View style={styles.detailRow}>
            <Ionicons name="flask" size={16} color="#0891B2" />
            <ThemedText style={[styles.detailText, { color: '#0891B2', fontWeight: '600' }]}>Practical</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  ), [themeColors, categoriesData, academicYearsData, visibleColumns]);

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load subjects data</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.SUBJECTS}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don't have permission to view subjects</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}
                accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <ThemedText type="title" numberOfLines={1} style={styles.headerTitle}>Subjects</ThemedText>
              <ThemedText style={styles.subtitle}>
                {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
              </ThemedText>
            </View>
          </View>
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={[styles.exportButton, { borderColor: themeColors.border }]}
              onPress={() => setShowExportOptions(true)}
              accessibilityLabel="Export"
            >
              <Ionicons name="download-outline" size={16} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportButtonText}>Export</ThemedText>
            </TouchableOpacity>
            <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECTS} actionConstant="create">
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: themeColors.primary }]}
                onPress={() => {
                  resetForm();
                  refetchCategories();
                  setIsModalVisible(true);
                }}
                accessibilityLabel="Add Subject"
              >
                <Ionicons name="add" size={18} color="white" />
                <ThemedText style={styles.addButtonText}>Add Subject</ThemedText>
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        </View>

      {/* Export Options Modal */}
      <Modal
        visible={showExportOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowExportOptions(false)}
      >
        <TouchableOpacity
          style={styles.exportOverlay}
          activeOpacity={1}
          onPress={() => setShowExportOptions(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.exportOptions, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <ThemedText style={[styles.exportOptionTitle, { color: themeColors['muted-foreground'] }]}>Export As</ThemedText>
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => { setShowExportOptions(false); handleExportCSV(); }}
            >
              <Ionicons name="document-text" size={18} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportOptionText}>Export to CSV</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => { setShowExportOptions(false); handleExportExcel(); }}
            >
              <Ionicons name="grid" size={18} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportOptionText}>Export to Excel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportOption}
              onPress={() => { setShowExportOptions(false); handleDownloadData(); }}
            >
              <Ionicons name="download" size={18} color={themeColors['card-foreground']} />
              <ThemedText style={styles.exportOptionText}>Download Data</ThemedText>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Filters — toggle which fields show on each subject card (mirrors web) */}
      <TouchableOpacity style={styles.filtersLabelRow} onPress={() => setShowFilterOptions(true)}>
        <Ionicons name="filter-outline" size={14} color={themeColors['muted-foreground']} />
        <ThemedText style={[styles.filtersLabelText, { color: themeColors['muted-foreground'] }]}>Filters</ThemedText>
      </TouchableOpacity>

      {/* Filter Options Modal */}
      <Modal
        visible={showFilterOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterOptions(false)}
      >
        <TouchableOpacity
          style={styles.exportOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterOptions(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.exportOptions, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          >
            <ThemedText style={[styles.exportOptionTitle, { color: themeColors['muted-foreground'] }]}>Filters</ThemedText>
            <TouchableOpacity
              style={[styles.exportOption, styles.filterSelectAllOption, { borderBottomColor: themeColors.border }]}
              onPress={handleToggleSelectAllColumns}
            >
              <Ionicons
                name={visibleColumns.size === FILTER_COLUMNS.length ? 'checkbox' : 'square-outline'}
                size={18}
                color={themeColors.primary}
              />
              <ThemedText style={[styles.exportOptionText, { fontWeight: '600' }]}>Select All</ThemedText>
            </TouchableOpacity>
            {FILTER_COLUMNS.map((col) => (
              <TouchableOpacity
                key={col.key}
                style={styles.exportOption}
                onPress={() => handleColumnToggle(col.key)}
              >
                <Ionicons
                  name={visibleColumns.has(col.key) ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={themeColors.primary}
                />
                <ThemedText style={styles.exportOptionText}>{col.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search subjects..."
          placeholderTextColor={themeColors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Subjects List */}
      <FlatList
        data={filteredSubjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={themeColors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="book" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Subjects Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Add your first subject to get started'}
            </ThemedText>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editingSubject ? 'Edit Subject' : 'Add New Subject'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Subject Name *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter subject name"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                />

                <View style={styles.labelRow}>
                  <ThemedText style={styles.label}>Category</ThemedText>
                  <TouchableOpacity
                    style={[styles.addButtonSmall, { backgroundColor: themeColors.primary }]}
                    onPress={() => setIsCategoryModalVisible(true)}
              accessibilityLabel="Add"
                  >
                    <Ionicons name="add" size={16} color="white" />
                  </TouchableOpacity>
                </View>
                {categoriesLoading && <ThemedText>Loading categories...</ThemedText>}
                {categoriesError && <ThemedText style={{ color: 'red' }}>Error loading categories</ThemedText>}
                {!categoriesLoading && !categoriesError && (!categoriesData || categoriesData.length === 0) && (
                  <ThemedText style={{ color: 'orange', fontStyle: 'italic' }}>
                    No subject categories found. Click + to create one.
                  </ThemedText>
                )}
                <CustomDropdown
                  data={(categoriesData || []).map((category: SubjectCategory) => ({ label: category.name, value: category.id }))}
                  value={formData.category_id}
                  onChange={(v) => setFormData(prev => ({ ...prev, category_id: v?.toString() ?? '' }))}
                  placeholder="Select Category"
                />

                <ThemedText style={styles.label}>Short Code</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter short code (optional)"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.short_code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, short_code: text }))}
                />
              </View>


              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                >
                  <Ionicons
                    name={formData.is_active ? "checkbox" : "square-outline"}
                    size={24}
                    color={themeColors.primary}
                  />
                </TouchableOpacity>
                <ThemedText style={styles.checkboxLabel}>Active</ThemedText>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingSubject ? 'Update' : 'Add Subject')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Category Modal */}
      <Modal
        visible={isCategoryModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Create Subject Category
              </ThemedText>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}
              accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Category Name *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter category name"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsCategoryModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton, { backgroundColor: themeColors.primary }]}
                onPress={handleCreateCategory}
                disabled={createCategoryMutation.isPending}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ConfirmModal {...modalProps} />
      </ThemedView>
    </ReadOrListPermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  exportOptions: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  exportOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterSelectAllOption: {
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  exportOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  filtersLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  filtersLabelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  subjectCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subjectInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    marginBottom: 8,
  },
  serialNo: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 24,
    flexShrink: 0,
  },
  subjectName: {
    lineHeight: 24,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButtonSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 16,
    marginBottom: 4,
  },
  pickerDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});