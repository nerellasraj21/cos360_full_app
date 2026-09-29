import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    RefreshControl,
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
import { subjectCategoriesApi } from '@/src/api';
import type { SubjectCategory, SubjectCategoryCreate, SubjectCategoryUpdate } from '@/src/api';
import { useTheme } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

export default function SubjectCategoriesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SubjectCategory | null>(null);
  const [formData, setFormData] = useState({ name: '' });

  const router = useRouter();
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();
  const queryClient = useQueryClient();
  // Permission checking will be handled by PermissionGuard components

  // Fetch subject categories data
  const { data: categoriesData, isLoading, error, refetch } = useQuery({
    queryKey: ['subjectCategories'],
    queryFn: () => subjectCategoriesApi.getSubjectCategories(),
    staleTime: 0,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: subjectCategoriesApi.createSubjectCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCategories'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Category Created', 'Subject category created successfully.');
    },
    onError: (error: any) => {
      showError('Create Failed', error.message || 'Failed to create subject category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SubjectCategoryUpdate }) =>
      subjectCategoriesApi.updateSubjectCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCategories'] });
      setIsModalVisible(false);
      resetForm();
      showSuccess('Category Updated', 'Subject category updated successfully.');
    },
    onError: (error: any) => {
      showError('Update Failed', error.message || 'Failed to update subject category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: subjectCategoriesApi.deleteSubjectCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjectCategories'] });
      showSuccess('Category Deleted', 'Subject category deleted successfully.');
    },
    onError: (error: any) => {
      showError('Delete Failed', error.message || 'Failed to delete subject category');
    },
  });

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!categoriesData || !Array.isArray(categoriesData)) return [];

    return categoriesData.filter((category: SubjectCategory) => {
      const matchesSearch =
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [categoriesData, searchQuery]);

  // ── Export (mirrors the web app's Subject Categories Export menu: CSV / Excel / JSON) ────
  const EXPORT_HEADERS = ['Name', 'Description', 'Active'];

  const buildExportRows = () =>
    filteredCategories.map((c) => [
      c.name,
      c.description || '',
      c.is_active ? 'Yes' : 'No',
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
      await shareOrDownload('subject_categories_data.csv', lines.join('\n'), 'text/csv');
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const rows = [EXPORT_HEADERS, ...buildExportRows()];
      const html = `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
      await shareOrDownload('subject_categories_data.xls', html, 'application/vnd.ms-excel');
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  const handleDownloadData = async () => {
    try {
      const jsonData = {
        title: 'Subject Categories',
        columns: EXPORT_HEADERS,
        data: filteredCategories.map((c) => ({
          name: c.name,
          description: c.description || '',
          is_active: c.is_active ? 'Yes' : 'No',
        })),
        exportedAt: new Date().toISOString(),
      };
      await shareOrDownload('subject_categories_data.json', JSON.stringify(jsonData, null, 2), 'application/json');
    } catch {
      showError('Error', 'Failed to export data');
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setEditingCategory(null);
  };

  const handleEdit = (category: SubjectCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setIsModalVisible(true);
  };

  const handleDelete = (category: SubjectCategory) => {
    confirm({
      title: 'Delete Subject Category',
      message: `Are you sure you want to delete "${category.name}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(category.id),
    });
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showError('Error', 'Category name is required');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: { name: formData.name } });
    } else {
      createMutation.mutate({ name: formData.name, is_active: true });
    }
  };

  const renderCategoryItem = useCallback(({ item, index }: { item: SubjectCategory; index: number }) => (
    <View style={[styles.categoryCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryInfo}>
          <ThemedText style={[styles.serialNo, { color: themeColors['muted-foreground'] }]}>{index + 1}</ThemedText>
          <ThemedText type="subtitle" style={styles.categoryName}>
            {item.name}
          </ThemedText>
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECT_CATEGORIES} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
              accessibilityLabel="Edit"
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECT_CATEGORIES} actionConstant="delete">
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
    </View>
  ), [themeColors]);

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Error</ThemedText>
        <ThemedText>Failed to load subject categories data</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.SUBJECT_CATEGORIES}
      fallback={
        <ThemedView style={styles.container}>
          <View style={styles.centerContainer}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don't have permission to view subject categories</ThemedText>
          </View>
        </ThemedView>
      }
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}
              accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title">Subject Categories</ThemedText>
            <ThemedText style={styles.subtitle}>
              {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ies' : 'y'}
            </ThemedText>
          </View>
        </View>

        {/* Actions: Export + Add */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.exportButton, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}
            onPress={() => setShowExportOptions(true)}
            accessibilityLabel="Export"
          >
            <Ionicons name="download-outline" size={16} color={themeColors['card-foreground']} />
            <ThemedText style={[styles.exportButtonText, { color: themeColors['card-foreground'] }]}>Export</ThemedText>
          </TouchableOpacity>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECT_CATEGORIES} actionConstant="create">
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                resetForm();
                setIsModalVisible(true);
              }}
              accessibilityLabel="Add Subject Categories"
            >
              <Ionicons name="add" size={16} color="white" />
              <ThemedText style={styles.addButtonText}>Add Subject Categories</ThemedText>
            </TouchableOpacity>
          </PermissionGuard>
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

      {/* Filters label */}
      <View style={styles.filtersLabelRow}>
        <Ionicons name="filter-outline" size={14} color={themeColors['muted-foreground']} />
        <ThemedText style={[styles.filtersLabelText, { color: themeColors['muted-foreground'] }]}>Filters</ThemedText>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search categories..."
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

      {/* Categories List */}
      <FlatList
        data={filteredCategories}
        renderItem={renderCategoryItem}
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
            <Ionicons name="folder" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Subject Categories Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Add your first subject category to get started'}
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
                {editingCategory ? 'Edit Category' : 'Add Subject Categories'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}
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
                  value={formData.name}
                  onChangeText={(text) => setFormData({ name: text })}
                />
              </View>
            </View>

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
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingCategory ? 'Update' : 'Add Subject Categories')}
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
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
  categoryCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  serialNo: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryName: {
    marginBottom: 4,
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
    paddingBottom: 0,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
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