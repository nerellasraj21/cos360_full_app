import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppLayout } from '@/components';
import { useToastContext } from '@/components/ToastProvider';
import CustomDropdown from '@/components/ui/dropdown';
import { useTheme } from '@/contexts';
import { useExpenseCategoriesProtected, useCreateExpenseCategoryProtected, useUpdateExpenseCategoryProtected, useDeleteExpenseCategoryProtected } from '@/hooks/use-expense-protected';
import { ReadOrListPermissionGuard, CreatePermissionGuard, UpdatePermissionGuard, DeletePermissionGuard } from '@/components/PermissionGuards';
import { PERMISSION_RESOURCES } from '@/src/types/permissions';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ExpenseCategory } from '@/src/types/expense';

export default function ExpenseCategoriesScreen() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const { colors } = useTheme();
  const { showSuccess, showError } = useToastContext();

  const { data: categoriesResponse, isLoading, error } = useExpenseCategoriesProtected();
  const createMutation = useCreateExpenseCategoryProtected();
  const updateMutation = useUpdateExpenseCategoryProtected();
  const deleteMutation = useDeleteExpenseCategoryProtected();

  const categories = Array.isArray(categoriesResponse)
    ? categoriesResponse
    : categoriesResponse?.items || [];

  // Debug logging
  console.log('Expense Categories - Raw data:', categoriesResponse);
  console.log('Expense Categories - Processed array:', categories);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setEditingCategory(null);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    resetForm();
    setIsModalVisible(true);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      is_active: category.is_active,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (category: ExpenseCategory) => {
    Alert.alert(
      'Delete Expense Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(category.id),
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Category name is required');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const renderCategoryItem = ({ item }: { item: ExpenseCategory }) => (
    <ThemedView style={[styles.categoryCard, { backgroundColor: colors.card }]}>
      <View style={styles.categoryInfo}>
        <ThemedText type="subtitle" style={styles.categoryName}>
          {item.name}
        </ThemedText>
        <ThemedText style={[styles.categoryDetails, { color: colors['muted-foreground'] }]}>
          Status: {item.is_active ? 'Active' : 'Inactive'}
        </ThemedText>
        <ThemedText style={[styles.categoryDate, { color: colors['muted-foreground'] }]}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
      </View>

      <View style={styles.actionButtons}>
        <UpdatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_CATEGORIES}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color="white" />
          </TouchableOpacity>
        </UpdatePermissionGuard>

        <DeletePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_CATEGORIES}>
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

  if (isLoading) {
    return (
      <AppLayout title="Expense Categories">
        <View style={styles.centerContainer}>
          <ThemedText>Loading categories...</ThemedText>
        </View>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Expense Categories">
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: colors.destructive }}>
            Error loading categories
          </ThemedText>
        </View>
      </AppLayout>
    );
  }

  return (
    <ReadOrListPermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_CATEGORIES}>
      <AppLayout title="Expense Categories">
        <View style={styles.container}>
          <View style={styles.header}>
            <CreatePermissionGuard resource={PERMISSION_RESOURCES.EXPENSE_CATEGORIES}>
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
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyContainer}>
              <Ionicons name="folder-outline" size={48} color={colors['muted-foreground']} />
              <ThemedText style={[styles.emptyText, { color: colors['muted-foreground'] }]}>
                No expense categories found
              </ThemedText>
            </ThemedView>
          )}
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
                  {editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
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
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter category name"
                  placeholderTextColor={colors['muted-foreground']}
                />

                <ThemedText style={styles.label}>Description</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.background,
                    color: colors.foreground,
                    borderColor: colors.border,
                  }]}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Enter description (optional)"
                  placeholderTextColor={colors['muted-foreground']}
                  multiline
                  numberOfLines={3}
                />

                <ThemedText style={styles.label}>Active</ThemedText>
                <CustomDropdown
                  data={[
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' },
                  ]}
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(value) => setFormData(prev => ({ ...prev, is_active: value?.toString() === 'true' }))}
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
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {createMutation.isLoading || updateMutation.isLoading ? 'Saving...' :
                     editingCategory ? 'Update' : 'Create'}
                  </ThemedText>
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
});