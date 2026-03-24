import { Ionicons } from '@expo/vector-icons';

import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
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
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { AcademicYear } from '@/src/api';
import { useAcademicYears, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear } from '@/src/api/hooks/masters/academicYears';
import { useTheme } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';

export default function AcademicYearsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
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
    Alert.alert(
      'Delete Academic Year',
      `Are you sure you want to delete "${year.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(year.id, {
            onError: (e: any) => showError('Delete Failed', e.message || 'Failed to delete academic year'),
          }),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      Alert.alert('Error', 'Please fill in all required fields');
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
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={18} color={themeColors.primary} />
          </TouchableOpacity>
        </PermissionGuard>
        <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="delete">
          <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
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
            <ThemedText>You don't have permission to view academic years</ThemedText>
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
              <TouchableOpacity onPress={() => setSearchQuery('')}>
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
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
              <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
                <ThemedText style={styles.modalTitle}>
                  {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
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
                  activeOpacity={0.7}
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
          </View>
        </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
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
