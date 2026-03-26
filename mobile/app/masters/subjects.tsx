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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Subject, SubjectInput, SubjectUpdate, SubjectCategory, AcademicYear } from '@/src/api';
import { useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject } from '@/src/api/hooks/masters/subjects';
import { useSubjectCategories, useCreateSubjectCategory } from '@/src/api/hooks/masters/subjectCategories';
import { useAcademicYearsDropdown } from '@/src/api/hooks/masters/academicYears';
import { useTheme, useAcademicYear } from '@/contexts';
import { PermissionGuard, ReadOrListPermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { useToastContext } from '@/components/ToastProvider';


export default function SubjectsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    description: '',
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
      description: '',
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
      description: subject.description || '',
      category_id: subject.category?.id || '',
      academic_year_id: subject.academic_year_id,
      is_practical: subject.is_practical,
      is_active: subject.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (subject: Subject) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subject.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(subject.id, { onError: (e: any) => showError('Delete Failed', e.message || 'Failed to delete subject') }),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.name) {
      Alert.alert('Error', 'Subject name is required');
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
      Alert.alert('Error', 'Category name is required');
      return;
    }
    createCategoryMutation.mutate({ name: newCategoryName.trim() }, { onError: (e: any) => showError('Create Failed', e.message || 'Failed to create category') });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categoriesData?.find((cat: SubjectCategory) => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getAcademicYearName = (academicYearId: string) => {
    const academicYear = academicYearsData?.find((ay: any) => ay.id === academicYearId);
    return academicYear?.title || 'Unknown Year';
  };

  const renderSubjectItem = useCallback(({ item }: { item: Subject }) => (
    <View style={[styles.subjectCard, { backgroundColor: themeColors.card }]}>
      <View style={styles.subjectHeader}>
        <View style={styles.subjectInfo}>
          <ThemedText type="subtitle" style={styles.subjectName}>
            {item.name}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <ThemedText style={styles.statusText}>
              {item.is_active ? 'Active' : 'Inactive'}
            </ThemedText>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECTS} actionConstant="update">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECTS} actionConstant="delete">
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <View style={styles.subjectDetails}>
        {item.short_code ? (
          <View style={styles.detailRow}>
            <Ionicons name="code-slash" size={16} color={themeColors['muted-foreground']} />
            <ThemedText style={styles.detailText}>Code: {item.short_code}</ThemedText>
          </View>
        ) : null}
        <View style={styles.detailRow}>
          <Ionicons name="folder" size={16} color={themeColors['muted-foreground']} />
          <ThemedText style={styles.detailText}>
            Category: {item.category ? getCategoryName(item.category.id) : 'No Category'}
          </ThemedText>
        </View>
        {item.is_practical ? (
          <View style={styles.detailRow}>
            <Ionicons name="flask" size={16} color="#0891B2" />
            <ThemedText style={[styles.detailText, { color: '#0891B2', fontWeight: '600' }]}>Practical</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  ), [themeColors, categoriesData, academicYearsData]);

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors['card-foreground']} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <ThemedText type="title">Subjects</ThemedText>
            <ThemedText style={styles.subtitle}>
              {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
            </ThemedText>
          </View>
          <PermissionGuard resourceConstant={PERMISSION_RESOURCES.SUBJECTS} actionConstant="create">
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                resetForm();
                refetchCategories();
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
          placeholder="Search subjects..."
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
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </ThemedText>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
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

                <ThemedText style={styles.label}>Subject Code</ThemedText>
                <TextInput
                  style={[styles.input, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter subject code (optional)"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.short_code}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, short_code: text }))}
                />

                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.textarea, { color: themeColors['card-foreground'], borderColor: themeColors.border }]}
                  placeholder="Enter subject description (optional)"
                  placeholderTextColor={themeColors['muted-foreground']}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <ThemedText style={styles.label}>Category</ThemedText>
                  <TouchableOpacity
                    style={[styles.addButtonSmall, { backgroundColor: themeColors.primary }]}
                    onPress={() => setIsCategoryModalVisible(true)}
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
                <View style={styles.pickerContainer}>
                  {categoriesData?.map((category: SubjectCategory) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.pickerOption,
                        { borderColor: themeColors.border },
                        formData.category_id === category.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '10' }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, category_id: category.id }))}
                    >
                      <ThemedText style={[
                        styles.pickerText,
                        formData.category_id === category.id && { color: themeColors.primary, fontWeight: '600' }
                      ]}>
                        {category.name}
                      </ThemedText>
                      <ThemedText style={styles.pickerDescription}>
                        {category.description}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
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
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingSubject ? 'Update' : 'Create')}
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
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
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
  subjectName: {
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