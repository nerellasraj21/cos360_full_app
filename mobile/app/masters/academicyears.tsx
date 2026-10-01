import { Ionicons } from '@expo/vector-icons';

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
  KeyboardAvoidingView,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { escapeCsv } from '@/src/utils/exportCsv';

import { ThemedText } from '@/components/themed-text';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { AcademicYear } from '@/src/api';
import { useAcademicYears, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear } from '@/src/api/hooks/masters/academicYears';
import { useTheme } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';
import { ConfirmModal, useConfirmModal } from '@/components/ConfirmModal';

export default function AcademicYearsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    start_date: '',
    end_date: '',
    is_active: true,
  });

  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { showSuccess, showError } = useToastContext();
  const { confirm, modalProps } = useConfirmModal();

  const { data: academicYearsData, isLoading, error, refetch } = useAcademicYears();
  const createMutation = useCreateAcademicYear();
  const updateMutation = useUpdateAcademicYear();
  const deleteMutation = useDeleteAcademicYear();

  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Created', 'Academic year has been created.');
      createMutation.reset();
    }
  }, [createMutation.isSuccess]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      showSuccess('Updated', 'Academic year has been updated.');
      updateMutation.reset();
    }
  }, [updateMutation.isSuccess]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      showSuccess('Deleted', 'Academic year has been deleted.');
      deleteMutation.reset();
    }
  }, [deleteMutation.isSuccess]);

  const filteredYears = useMemo(() => {
    if (!academicYearsData || !Array.isArray(academicYearsData)) return [];
    return academicYearsData.filter((year: AcademicYear) =>
      year.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      year.start_date.includes(searchQuery) ||
      year.end_date.includes(searchQuery)
    );
  }, [academicYearsData, searchQuery]);

  // ── Export (mirrors the web app's Academic Years Export menu: CSV / Excel / JSON) ────
  const EXPORT_HEADERS = ['Title', 'Start Date', 'End Date', 'Active'];

  const buildExportRows = () =>
    filteredYears.map((y) => [
      y.title,
      y.start_date,
      y.end_date,
      y.is_active ? 'Yes' : 'No',
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
      await shareOrDownload('academic_years_data.csv', lines.join('\n'), 'text/csv');
    } catch {
      showError('Error', 'Failed to export CSV');
    }
  };

  const handleExportExcel = async () => {
    try {
      const rows = [EXPORT_HEADERS, ...buildExportRows()];
      const html = `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</table>`;
      await shareOrDownload('academic_years_data.xls', html, 'application/vnd.ms-excel');
    } catch {
      showError('Error', 'Failed to export Excel');
    }
  };

  const handleDownloadData = async () => {
    try {
      const jsonData = {
        title: 'Academic Years',
        columns: EXPORT_HEADERS,
        data: filteredYears.map((y) => ({
          title: y.title,
          start_date: y.start_date,
          end_date: y.end_date,
          is_active: y.is_active ? 'Yes' : 'No',
        })),
        exportedAt: new Date().toISOString(),
      };
      await shareOrDownload('academic_years_data.json', JSON.stringify(jsonData, null, 2), 'application/json');
    } catch {
      showError('Error', 'Failed to export data');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', start_date: '', end_date: '', is_active: true });
    setEditingYear(null);
  };

  const handleEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setFormData({
      title: year.title,
      start_date: year.start_date,
      end_date: year.end_date,
      is_active: year.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (year: AcademicYear) => {
    confirm({
      title: 'Delete Academic Year',
      message: `Are you sure you want to delete "${year.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(year.id, {
        onError: (e: any) => showError('Delete Failed', e.message || 'Failed to delete academic year'),
      }),
    });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      showError('Error', 'Please fill in all required fields');
      return;
    }
    if (editingYear) {
      updateMutation.mutate({ id: editingYear.id, data: formData }, {
        onError: (e: any) => showError('Update Failed', e.message || 'Failed to update academic year'),
      });
    } else {
      createMutation.mutate(formData, {
        onError: (e: any) => showError('Create Failed', e.message || 'Failed to create academic year'),
      });
    }
  };

  const isDark = theme === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB';
  const rowBg = themeColors.card;
  const altRowBg = isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB';

  const renderItem = useCallback(({ item, index }: { item: AcademicYear; index: number }) => (
    <View style={[
      styles.tableRow,
      { backgroundColor: index % 2 === 0 ? rowBg : altRowBg, borderBottomColor: borderColor },
    ]}>
      {/* S.No */}
      <View style={styles.colSno}>
        <ThemedText style={styles.snoText}>{index + 1}</ThemedText>
      </View>

      {/* Title + Dates */}
      <View style={styles.colMain}>
        <ThemedText style={styles.titleText}>{item.title}</ThemedText>
        <ThemedText style={[styles.dateText, { color: themeColors['muted-foreground'] }]}>
          {item.start_date} → {item.end_date}
        </ThemedText>
      </View>

      {/* Status Badge */}
      <View style={styles.colStatus}>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.is_active ? '#D1FAE5' : '#FEE2E2' },
        ]}>
          <ThemedText style={[
            styles.statusText,
            { color: item.is_active ? '#065F46' : '#991B1B' },
          ]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </ThemedText>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.colActions}>
        <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="update">
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(item)}
              accessibilityLabel="Edit">
            <Ionicons name="create-outline" size={18} color={themeColors.primary} />
          </TouchableOpacity>
        </PermissionGuard>
        <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="delete">
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}
              accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>
    </View>
  ), [themeColors, borderColor, rowBg, altRowBg]);

  if (error) {
    return (
      <AppLayout title="Academic Years">
        <View style={styles.centerContainer}>
          <ThemedText type="title">Error</ThemedText>
          <ThemedText>Failed to load academic years data</ThemedText>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: themeColors.primary }]} onPress={() => refetch()}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard
      resource={PERMISSION_RESOURCES.ACADEMIC_YEARS}
      fallback={
        <AppLayout title="Academic Years">
          <View style={styles.centerContainer}>
            <ThemedText type="title">Access Denied</ThemedText>
            <ThemedText>You don&apos;t have permission to view academic years</ThemedText>
          </View>
        </AppLayout>
      }
    >
      <AppLayout title="Academic Years">
        <View style={styles.container}>

          {/* Page Header */}
          <View style={styles.pageHeader}>
            <View>
              <ThemedText style={styles.pageTitle}>Academic Years</ThemedText>
              <ThemedText style={[styles.pageSubtitle, { color: themeColors['muted-foreground'] }]}>
                {filteredYears.length} record{filteredYears.length !== 1 ? 's' : ''} found
              </ThemedText>
            </View>
            <View style={styles.pageHeaderButtons}>
              <TouchableOpacity
                style={[styles.exportButton, { borderColor, backgroundColor: themeColors.card }]}
                onPress={() => setShowExportOptions(true)}
                accessibilityLabel="Export"
              >
                <Ionicons name="download-outline" size={16} color={themeColors['card-foreground']} />
                <ThemedText style={[styles.exportButtonText, { color: themeColors['card-foreground'] }]}>Export</ThemedText>
              </TouchableOpacity>
              <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="create">
                <TouchableOpacity
                  style={[styles.addButton, { backgroundColor: themeColors.primary }]}
                  onPress={() => { resetForm(); setIsModalVisible(true); }}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <ThemedText style={styles.addButtonText}>Add Academic Year</ThemedText>
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
                style={[styles.exportOptions, { backgroundColor: themeColors.card, borderColor }]}
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
          <View style={[styles.searchBar, { backgroundColor: themeColors.card, borderColor }]}>
            <Ionicons name="search-outline" size={18} color={themeColors['muted-foreground']} />
            <TextInput
              style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
              placeholder="Search..."
              placeholderTextColor={themeColors['muted-foreground']}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}
              accessibilityLabel="Close">
                <Ionicons name="close-circle" size={18} color={themeColors['muted-foreground']} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Table */}
          <View style={[styles.tableContainer, { borderColor, backgroundColor: rowBg }]}>
            {/* Table Header */}
            <View style={[styles.tableHeader, { borderBottomColor: borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F3F4F6' }]}>
              <View style={styles.colSno}>
                <ThemedText style={styles.headerText}>S.No.</ThemedText>
              </View>
              <View style={styles.colMain}>
                <ThemedText style={styles.headerText}>Title / Dates</ThemedText>
              </View>
              <View style={styles.colStatus}>
                <ThemedText style={styles.headerText}>Active</ThemedText>
              </View>
              <View style={styles.colActions}>
                <ThemedText style={styles.headerText}>Actions</ThemedText>
              </View>
            </View>

            {/* Rows */}
            <FlatList
              data={filteredYears}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={themeColors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={themeColors['muted-foreground']} />
                  <ThemedText style={[styles.emptyText, { color: themeColors['muted-foreground'] }]}>
                    {searchQuery ? 'No results found' : 'No academic years yet'}
                  </ThemedText>
                </View>
              }
            />
          </View>

        </View>

        {/* Add/Edit Modal */}
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <ThemedText style={styles.modalTitle}>
                  {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}
              accessibilityLabel="Close">
                  <Ionicons name="close" size={22} color={themeColors['muted-foreground']} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Title <ThemedText style={styles.required}>*</ThemedText></ThemedText>
                  <TextInput
                    style={[styles.input, { color: themeColors['card-foreground'], borderColor, backgroundColor: themeColors.card }]}
                    placeholder="e.g. 2025-26"
                    placeholderTextColor={themeColors['muted-foreground']}
                    value={formData.title}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <ThemedText style={styles.label}>Start Date <ThemedText style={styles.required}>*</ThemedText></ThemedText>
                    <TextInput
                      style={[styles.input, { color: themeColors['card-foreground'], borderColor, backgroundColor: themeColors.card }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={themeColors['muted-foreground']}
                      value={formData.start_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <ThemedText style={styles.label}>End Date <ThemedText style={styles.required}>*</ThemedText></ThemedText>
                    <TextInput
                      style={[styles.input, { color: themeColors['card-foreground'], borderColor, backgroundColor: themeColors.card }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={themeColors['muted-foreground']}
                      value={formData.end_date}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                  activeOpacity={0.75}
                >
                  <ThemedText style={styles.label}>Active</ThemedText>
                  <View style={[
                    styles.toggle,
                    { backgroundColor: formData.is_active ? themeColors.primary : (isDark ? '#374151' : '#D1D5DB') },
                  ]}>
                    <View style={[styles.toggleThumb, { transform: [{ translateX: formData.is_active ? 18 : 2 }] }]} />
                  </View>
                </TouchableOpacity>
              </ScrollView>

              <View style={[styles.modalFooter, { borderTopColor: borderColor }]}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <ThemedText style={{ color: isDark ? '#D1D5DB' : '#374151', fontWeight: '600' }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: themeColors.primary }]}
                  onPress={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <ThemedText style={{ color: 'white', fontWeight: '600' }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingYear ? 'Update' : 'Create')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <ConfirmModal {...modalProps} />
      </AppLayout>
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

  // Page header
  pageHeader: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    rowGap: 10,
    marginBottom: 14,
  },
  pageHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexGrow: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // Export
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
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

  // Filters label
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

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  // Table
  tableContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },

  // Columns
  colSno: {
    width: 36,
  },
  colMain: {
    flex: 1,
    paddingRight: 8,
  },
  colStatus: {
    width: 72,
    alignItems: 'center',
  },
  colActions: {
    flexDirection: 'row',
    gap: 4,
    width: 64,
    justifyContent: 'flex-end',
  },

  snoText: {
    fontSize: 13,
    opacity: 0.5,
    fontWeight: '500',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 4,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
  },

  // Retry
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  formRow: {
    flexDirection: 'row',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
