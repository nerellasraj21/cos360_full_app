import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';
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
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AcademicYear } from '@/src/api';
import { useAcademicYears, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear } from '@/src/api/hooks/masters/academicYears';
import { useTheme } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';

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

  const router = useRouter();
  // const colorScheme = useColorScheme();
  // const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { theme, colors } = useTheme();
  const themeColors = Colors[theme];

  // Fetch academic years data using permission-protected hook
  const { data: academicYearsData, isLoading, error, refetch } = useAcademicYears();

  // Mutations using permission-protected hooks
  const createMutation = useCreateAcademicYear();
  const updateMutation = useUpdateAcademicYear();
  const deleteMutation = useDeleteAcademicYear();

  // Handle mutation success/error states
  React.useEffect(() => {
    if (createMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      createMutation.reset();
    }
  }, [createMutation.isSuccess]);

  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      setIsModalVisible(false);
      resetForm();
      updateMutation.reset();
    }
  }, [updateMutation.isSuccess]);

  React.useEffect(() => {
    if (deleteMutation.isSuccess) {
      deleteMutation.reset();
    }
  }, [deleteMutation.isSuccess]);

  // Filter academic years based on search
  const filteredYears = useMemo(() => {
    if (!academicYearsData || !Array.isArray(academicYearsData)) return [];

    return academicYearsData.filter((year: AcademicYear) => {
      const matchesSearch =
        year.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        year.start_date.includes(searchQuery) ||
        year.end_date.includes(searchQuery);

      return matchesSearch;
    });
  }, [academicYearsData, searchQuery]);

  const resetForm = () => {
    setFormData({
      title: '',
      start_date: '',
      end_date: '',
      is_active: true,
    });
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
          onPress: () => deleteMutation.mutate(year.id),
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
      updateMutation.mutate({ id: editingYear.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderAcademicYearItem = useCallback(({ item }: { item: AcademicYear }) => (
    <View style={[styles.yearCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.yearHeader}>
        <View style={styles.yearInfo}>
          <ThemedText type="subtitle" style={styles.yearTitle}>
            {item.title}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <View style={styles.yearDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
    </View>
  ), [themeColors]);

  if (error) {
    return (
      <AppLayout title="Academic Years">
        <View style={styles.centerContainer}>
          <ThemedText type="title">Error</ThemedText>
          <ThemedText>Failed to load academic years data</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <ThemedText style={styles.subtitle}>
              {filteredYears.length} academic year{filteredYears.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.ACADEMIC_YEARS} actionConstant="create">
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                resetForm();
                setIsModalVisible(true);
              }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <Ionicons name="search" size={20} color={themeColors['muted-foreground']} />
        <TextInput
          style={[styles.searchInput, { color: themeColors['card-foreground'] }]}
          placeholder="Search academic years..."
          placeholderTextColor={themeColors['muted-foreground']}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close" size={20} color={themeColors['muted-foreground']} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Academic Years List */}
      <FlatList
        data={filteredYears}
        renderItem={renderAcademicYearItem}
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
            <Ionicons name="school" size={64} color={themeColors['muted-foreground']} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Academic Years Found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Add your first academic year to get started'}
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
                {editingYear ? 'Edit Academic Year' : 'Add Academic Year'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors['card-foreground']} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Title *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter academic year (e.g., 2024-25)"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.title}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>Start Date *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.start_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, start_date: text }))}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.label}>End Date *</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.end_date}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, end_date: text }))}
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
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                <ThemedText style={styles.submitButtonText}>
                  {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' : (editingYear ? 'Update' : 'Create')}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  yearCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  yearInfo: {
    flex: 1,
  },
  yearTitle: {
    marginBottom: 8,
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
  yearDetails: {
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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