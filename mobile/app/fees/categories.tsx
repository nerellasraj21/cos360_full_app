import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme, useAcademicYear } from '@/contexts';
import { FeeCategoryResponse } from '@/src/api/fees';
import {
  useFeeCategories,
  useCreateFeeCategory,
  useUpdateFeeCategory,
  useDeleteFeeCategory
} from '@/hooks/use-fee-permissions';
import {
  ReadOrListPermissionGuard,
  CreatePermissionGuard,
  UpdatePermissionGuard,
  DeletePermissionGuard
} from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';


export default function FeeCategoriesScreen() {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<FeeCategoryResponse | null>(null);
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<FeeCategoryResponse | null>(null);
    const [formData, setFormData] = useState({
      category_name: '',
      academic_year_id: '',
      category_status: 'active',
    });

    const { colors } = useTheme();
    const { activeAcademicYearId } = useAcademicYear();
    const queryClient = useQueryClient();
    const { showSuccess, showError } = useToastContext();

  const { data: categories = [], isLoading, error, hasPermission } = useFeeCategories();

  const createMutation = useCreateFeeCategory();
  const updateMutation = useUpdateFeeCategory();
  const deleteMutation = useDeleteFeeCategory();


  const resetForm = () => {
    setFormData({
      category_name: '',
      academic_year_id: activeAcademicYearId || '',
      category_status: 'active',
    });
    setEditingCategory(null);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (category: FeeCategoryResponse) => {
    setEditingCategory(category);
    setFormData({
      category_name: category.category_name,
      academic_year_id: category.academic_year_id,
      category_status: category.category_status,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (category: FeeCategoryResponse) => {
    console.log('handleDelete called for category:', category.id);
    setCategoryToDelete(category);
    setIsDeleteModalVisible(true);
  };

  const handleSubmit = () => {
    if (!formData.category_name.trim()) {
      showError('Error', 'Category name is required');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['feeCategories'] });
          setIsModalVisible(false);
          resetForm();
          showSuccess('Fee category updated successfully');
        },
        onError: () => showError('Error', 'Failed to update fee category'),
      });
    } else {
      createMutation.mutate({
        category_name: formData.category_name,
        academic_year_id: formData.academic_year_id,
        category_status: formData.category_status,
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['feeCategories'] });
          setIsModalVisible(false);
          resetForm();
          showSuccess('Fee category created successfully');
        },
        onError: () => showError('Error', 'Failed to create fee category'),
      });
    }
  };

  const renderCategoryItem = ({ item }: { item: FeeCategoryResponse }) => (
    <ThemedView style={[styles.categoryCard, { backgroundColor: colors.card }]}>
      <View style={styles.categoryInfo}>
        <ThemedText type="subtitle" style={styles.categoryName}>
          {item.category_name}
        </ThemedText>
        <ThemedText style={[styles.categoryDetails, { color: colors['muted-foreground'] }]}>
          Status: {item.category_status.charAt(0).toUpperCase() + item.category_status.slice(1)}
        </ThemedText>
      </View>

      <View style={styles.actionButtons}>
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
        </UpdatePermissionGuard>

        <DeletePermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.destructive }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={16} color="white" />
          </TouchableOpacity>
        </DeletePermissionGuard>
      </View>
    </ThemedView>
  );

  if (!hasPermission) {
    return (
      <AppLayout title="Fee Categories">
        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed" size={48} color={colors['muted-foreground']} />
          <ThemedText style={{ color: colors['muted-foreground'], textAlign: 'center', marginTop: 16 }}>
            You don't have permission to access fee categories
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout title="Fee Categories">
        <View style={styles.centerContainer}>
          <ThemedText>Loading fee categories...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Fee Categories">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading fee categories
          </ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => queryClient.invalidateQueries({ queryKey: ['feeCategories'] })}
          >
            <ThemedText style={{ color: 'white' }}>Retry</ThemedText>
          </TouchableOpacity>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
      <AppLayout title="Fee Categories">
        <View style={styles.container}>
          <View style={styles.header}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.FEE_CATEGORIES}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="add" size={20} color="white" />
                <ThemedText style={styles.addButtonText}>Add Category</ThemedText>
              </TouchableOpacity>
            </CreatePermissionGuard>
          </View>

          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <ThemedView style={styles.emptyContainer}>
                <Ionicons name="folder-outline" size={48} color={colors['muted-foreground']} />
                <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                  No fee categories found
                </ThemedText>
              </ThemedView>
            }
          />

          <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <ThemedView style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">
                    {editingCategory ? 'Edit Fee Category' : 'Add Fee Category'}
                  </ThemedText>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors['muted-foreground']} />
                  </TouchableOpacity>
                </View>

                <View style={styles.form}>
                  <ThemedText style={styles.label}>Category Name *</ThemedText>
                  <TextInput
                    style={[styles.input, {
                      backgroundColor: colors.background,
                      color: colors.foreground,
                      borderColor: colors.border,
                    }]}
                    value={formData.category_name}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, category_name: text }))}
                    placeholder="Enter category name"
                    placeholderTextColor={colors['muted-foreground']}
                  />


                  <ThemedText style={styles.label}>Status</ThemedText>
                  <CustomDropdown
                    data={[
                      { label: 'Active', value: 'active' },
                      { label: 'Inactive', value: 'inactive' },
                    ]}
                    value={formData.category_status}
                    onChange={(value) => setFormData(prev => ({ ...prev, category_status: value as string }))}
                    placeholder="Select status"
                  />

                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: colors.primary }]}
                    onPress={handleSubmit}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <ThemedText style={styles.submitButtonText}>
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' :
                       editingCategory ? 'Update' : 'Create'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
            </View>
          </Modal>

          <Modal
            visible={isDeleteModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setIsDeleteModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <ThemedView style={[styles.confirmationModalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <ThemedText type="subtitle">Delete Fee Category</ThemedText>
                </View>

                <View style={styles.confirmationMessage}>
                  <ThemedText>Are you sure you want to delete "{categoryToDelete?.category_name}"?</ThemedText>
                  <ThemedText style={{ color: colors['muted-foreground'], marginTop: 8 }}>This action cannot be undone.</ThemedText>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setIsDeleteModalVisible(false);
                      setCategoryToDelete(null);
                    }}
                  >
                    <ThemedText style={{ color: colors.foreground }}>Cancel</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: colors.destructive }]}
                    onPress={() => {
                      if (categoryToDelete) {
                        const id = categoryToDelete.id;
                        setIsDeleteModalVisible(false);
                        setCategoryToDelete(null);
                        deleteMutation.mutate(id, {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: ['feeCategories'] });
                            showSuccess('Fee category deleted successfully');
                          },
                          onError: (err: any) => showError('Delete Failed', err?.message || 'Cannot delete this category — it may have associated fee types'),
                        });
                      }
                    }}
                  >
                    <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              </ThemedView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    marginBottom: 4,
  },
  categoryDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  categoryDate: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmationModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  confirmationMessage: {
    marginBottom: 20,
    alignItems: 'center',
  },
  deleteButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});